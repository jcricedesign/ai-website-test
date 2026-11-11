# Designworks → TBG Network LLC Cloudflare: canonical directory cutover

**Date:** 2026-11-10
**Owner decision:** Only the Designworks `barbergame-original.sqlite3` dataset (351 shops at owner's read-only count) is approved as the canonical directory. Beta site has no external users. Manual Cloudflare deployment is preferred.

## Non-negotiable constraints
- Preserve the original Designworks SQLite database and backup. It remains the recovery copy until cutover verified.
- Do not import any rows from the old public API or attempt to combine the other corpus with the 351.
- Do not replace, modify, or mix with existing Cloudflare D1 `barbergame-shop-intake`; that database holds the separate "Add a Barbershop" submissions.
- Do not delete or disable a serving legacy API/database before customer search and shop pages demonstrably work with the new owned database, and rollback is possible.
- Production deployment remains owner-approved and manual. No deployment is authorized by creation of this document.
- No private customer/barber credentials, administrative sessions, or PII should be committed to GitHub or a public dashboard.

## Target architecture
1. **Permanent storage:** New D1 database in **TBG Network LLC Cloudflare account**, suggested name `barbergame-directory`, binding `DIRECTORY_DB`. Keep this separate from `SHOP_INTAKE_DB`.
2. **Data and provenance:** canonical table with stable shop IDs, business name, street/city/state/ZIP, latitude/longitude, contact, hours, description, verification status, source URL and timestamps. Preserve schema/values from source; map to public API contract only after source schema inspection.
3. **API:** A Cloudflare Worker or an extension of the existing customer Worker provides the same public contract the website uses: `/directory/shops`, `/directory/cities`, `/directory/shops/:shopId`; preserve response field names `shops`, `total`, `shop`, `barbers`, `photos`, `nearby` where required. The user may choose a separate `api.thebarbergame.com` route once safe.
4. **Client:** The customer website's shop list, city browsing, location-radius search and shop details must all point at the Cloudflare-owned API. Avoid changing search UX while migrating.
5. **Control Center:** Read-only counts and status from the authoritative D1, later protected by Cloudflare Access. Publish approval is a separate future feature.

## Verified facts (with provenance)
- Owner directly ran `SELECT COUNT(*) FROM shops` against `~/designworks/projects/barber-directory/data/barbergame-original.sqlite3` and obtained **351**.
- Current customer source in `barbergame/site` refers to `NEXT_PUBLIC_API_URL` and directory API methods; current Worker deployment and bindings still require inspection.
- TBG Cloudflare account contains customer Worker, customer preview Worker, Pages deployment and D1 `barbergame-shop-intake`.
- Intake D1 has **7** shop submissions (**5 pending** at last review). No automatic publication.
- Current website/old API returned different records; the old API is an operational dependency to retire only after successful cutover.

## Phase 1 — Source inspection and backup (next)
In Designworks Terminal, *read-only*:
```bash
DB="$HOME/designworks/projects/barber-directory/data/barbergame-original.sqlite3"
sqlite3 -readonly "$DB" "SELECT COUNT(*) AS shops FROM shops;"
sqlite3 -readonly "$DB" "PRAGMA table_info(shops);"
sqlite3 -readonly "$DB" "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name;"
```
Save a dated SQLite backup outside the repository. Do not upload the raw database publicly; inspect sensitive columns first.
Record source shop IDs, types, unique/index constraints, and whether the 351 include any unapproved/closed entries. **Database authority does not imply all 351 are publication-ready**; owner can approve migration snapshot after review.

## Phase 2 — Stage migration, verify
- Create a dedicated D1 database under the **correct TBG account** (not John Rice's personal account).
- Define a D1-compatible schema and deterministic migration file after inspecting actual column types and constraints. Copy source identifiers and provenance, avoid new fabricated fields.
- Import into *new empty database*, not shop-intake.
- Verify SQL row count = approved export; check duplicates, null names, malformed coordinates, city totals, sample IDs and complete record fields.
- Cloudflare documentation: `npx wrangler d1 create barbergame-directory` then `npx wrangler d1 execute barbergame-directory --remote --file=./import.sql`. Confirm account/profile first; never run until reviewed. No automated scripts are currently authorized to mutate the live site.

## Phase 3 — API compatibility and acceptance
- Implement and test all existing public request shapes before deployment. At minimum `/directory/shops` with pagination/total, `/directory/cities`, exact-ID shop profile, sort/filter parameters, and latitude/longitude/radius search.
- Test city, zip, nearest, no results, map mode, absent coordinates, bad queries, broken links and mobile.
- Existing separate submission feature and D1 `SHOP_INTAKE_DB` must remain functional.

## Phase 4 — Manual Cloudflare cutover
- Owner reviews versioned Cloudflare Worker bundle and D1 import report.
- Capture the current live Worker deployment for rollback.
- Owner manually uploads and deploys to Cloudflare (preferred workflow).
- Smoke test `thebarbergame.com`: Locate Me, Seattle/Renton/Tacoma searches, browsing shop cards, shop profiles, mobile, and intake submissions. Confirm exact approved D1 count.
- Only then remove the old backend routing and stale references. **Deletion of unrelated third-party accounts/backends requires separate verification of ownership and explicit approval.**
- Retain a short-lived private backup for rollback before any permanent deletion; deletion is not yet performed.

## Acceptance gate
`351 source -> approved export -> 351 staged D1 -> 351 served by new API -> production search verified -> manual signoff -> old backend retired`.

The exact final count may differ from 351 only if owner explicitly excludes particular records during source review; no silent merge.

## Owner-approved migration simplification — first pass
- **Transfer all 351 source records unchanged** to a dedicated TBG Network LLC Cloudflare D1 staging database. No pre-migration deletion, duplicate consolidation, or coordinates enrichment required.
- Keep original names, addresses, IDs, statuses and other existing fields. The Arlington Great Clips potential duplicate and nine missing coordinates are flagged for the later enrichment pass, not blockers.
- Only errors preventing a lossless transfer (schema mismatch, duplicate primary keys, missing source, or import count mismatch) stop the data migration.
- After confirming D1 has 351 records, focus on connecting and testing the public website. Owner controls manual Cloudflare production deployment.
- Continue to distinguish `entered` from `confirmed` without making verification a first-pass migration dependency.
