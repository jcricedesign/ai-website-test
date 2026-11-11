#!/usr/bin/env python3
"""Read-only inspection and explicit SQL export of Designworks's canonical shops.

Never connects to Cloudflare; never writes source SQLite.
Requires only Python standard library. Generated SQL contains real shop data
and must be kept in a private folder, never committed to a public repo.
"""
import argparse
import collections
import json
import pathlib
import sqlite3
import sys

COLUMNS = (
    "id name street city postcode state phone website hours description highlights "
    "collected_by source source_url latitude longitude created_at updated_at status chain_name"
).split()


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not (-1e308 < value < 1e308):
            raise ValueError("Non-finite floating-point value in source")
        return repr(value)
    if not isinstance(value, str):
        raise ValueError(f"Unsupported SQLite source type: {type(value).__name__}")
    return "'" + value.replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=pathlib.Path, required=True)
    parser.add_argument("--expected", type=int, default=351)
    parser.add_argument("--write", action="store_true", help="Explicitly export private SQL file")
    parser.add_argument("--output", type=pathlib.Path, help="Destination for private SQL export")
    args = parser.parse_args()

    if args.write and args.output is None:
        parser.error("--write requires --output")
    if args.output and not args.write:
        parser.error("--output requires --write")
    if not args.db.is_file():
        parser.error("Source SQLite file not found: " + str(args.db))

    uri = args.db.resolve().as_uri() + "?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    try:
        columns = [row["name"] for row in con.execute("PRAGMA table_info(shops)")]
        if columns != COLUMNS:
            raise RuntimeError(f"Unexpected source columns: {columns!r}; refusing export")
        rows = con.execute("SELECT " + ",".join(COLUMNS) + " FROM shops ORDER BY id").fetchall()
        total = len(rows)
        if total != args.expected:
            raise RuntimeError(
                f"Source count {total} differs from expected {args.expected}; inspect before export"
            )
        statuses = dict(collections.Counter(str(r["status"]) for r in rows))
        cities = len({str(r["city"]).casefold().strip() for r in rows})
        missing = sum(not str(r["name"] or "").strip() or
                      not str(r["street"] or "").strip() or
                      not str(r["city"] or "").strip() for r in rows)
        missing_coordinates = sum(
            r["latitude"] is None or r["longitude"] is None or
            (r["latitude"] == 0 and r["longitude"] == 0) or
            (r["latitude"] is not None and not -90 <= r["latitude"] <= 90) or
            (r["longitude"] is not None and not -180 <= r["longitude"] <= 180)
            for r in rows
        )
        groups = collections.Counter(
            tuple(" ".join(str(r[k] or "").casefold().split()) for k in ("name", "street", "city"))
            for r in rows
        )
        duplicate_groups = sum(count > 1 for count in groups.values())
        duplicate_ids = total - len({r["id"] for r in rows})
        report = {
            "source_rows": total,
            "unique_cities": cities,
            "status_counts": statuses,
            "incomplete_name_or_address": missing,
            "missing_or_invalid_coordinates": missing_coordinates,
            "identical_normalized_name_street_city_groups": duplicate_groups,
            "duplicate_ids": duplicate_ids,
            "note": "Inspection only. No rows approved for publication by this report."
        }
        print(json.dumps(report, indent=2, sort_keys=True))
        if not args.write:
            print("Read-only preview complete. No export file written.")
            return
        if missing or duplicate_ids or duplicate_groups:
            raise RuntimeError("Potential source quality issues exist; export blocked pending review")
        destination = args.output.expanduser().resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            raise FileExistsError(f"Refusing to overwrite existing export: {destination}")
        # Private export: mode 0600.
        with destination.open("x", encoding="utf-8") as out:
            destination.chmod(0o600)
            out.write("-- Private shop corpus export. Do not commit to GitHub.\n")
            out.write("BEGIN TRANSACTION;\n")
            for row in rows:
                values = ",".join(sql_literal(row[column]) for column in COLUMNS)
                out.write("INSERT INTO shops (" + ",".join(COLUMNS) + ") VALUES (" + values + ");\n")
            out.write("COMMIT;\n")
        print(f"Private SQL export created: {destination} ({total} rows).")
    finally:
        con.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, sqlite3.Error, RuntimeError, ValueError) as error:
        print("ERROR:", error, file=sys.stderr)
        sys.exit(1)
