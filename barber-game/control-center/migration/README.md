# BarberGame original corpus → Cloudflare D1 (staging)

Source of truth: Designworks `~/designworks/projects/barber-directory/data/barbergame-original.sqlite3`, 351 shops as checked by owner. Target: **new D1 database in TBG Network LLC**, not existing `barbergame-shop-intake`.

The original 20-column schema is reproduced in `schema.sql`. Current values of `status` are retained: a row being copied does **not** certify that it should become visible to customers.

## Preflight — run on Designworks

Read-only (do not paste raw personal or confidential records into chat):

```bash
DB="$HOME/designworks/projects/barber-directory/data/barbergame-original.sqlite3"
sqlite3 -readonly "$DB" "SELECT COUNT(*) FROM shops;"
sqlite3 -readonly "$DB" "SELECT status, COUNT(*) FROM shops GROUP BY status;"
sqlite3 -readonly "$DB" "SELECT COUNT(*) FROM shops WHERE latitude IS NULL OR longitude IS NULL OR (latitude=0 AND longitude=0);"
sqlite3 -readonly "$DB" "SELECT COUNT(*) FROM shops WHERE trim(name)='' OR trim(street)='' OR trim(city)='';"
sqlite3 -readonly "$DB" "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='shops';"
```

## Export

The accompanying `export_from_designworks.py` does a **read-only preview** by default. Explicit `--write` outputs a private SQL file for import. It never touches D1, Cloudflare, or the public website. It validates column layout, number of rows, and IDs. It reports duplicate-looking businesses and missing coordinates without excluding them. The first pass preserves all 351 source records unchanged; reconciliation and enrichment follow after migration. Use `--expected 351` for first migration.

```bash
python3 export_from_designworks.py --db "$DB" --expected 351
python3 export_from_designworks.py --db "$DB" --expected 351 --write --output "$HOME/barbergame-private/d1-directory-shops.sql"
```

Keep the generated SQL out of GitHub. Back up the source SQLite using the existing backup routine; no need to relocate originals.

Before **any** Cloudflare import, review the preflight findings and the final customer-visible publication rule. The source has `status` values such as `entered`; migrating the rows should not automatically expose all 351 until the owner approves that decision.

## Cutover acceptance

A separate, owner-approved step must implement API compatibility for existing customer search, map, city and shop detail screens; test with the D1 staging data; and use the owner's existing manual Cloudflare deployment workflow. Retire the old serving system only when new production navigation and rollback work.

No production data writes or deletions were performed when this package was prepared.
