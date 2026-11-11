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


---

## Production completion checkpoint — November 11, 2026

**Status:** Owner-deployed to production; primary directory migration complete. Previous planning sections above are preserved for decision history and may describe steps that have since been completed.

### What actually shipped

- The sole approved corpus is the **351 shop** Designworks SQLite `~/designworks/projects/barber-directory/data/barbergame-original.sqlite3`.
- Owner made a private export at `~/barbergame-private/d1-directory-shops.sql` and the import-ready copy at `~/barbergame-private/d1-directory-import.sql`. The source SQLite and SQL export are preserved on Designworks, outside the public repository.
- TBG Networks LLC Cloudflare D1: `barbergame-directory` (ID `8427bee6-6d91-4bc3-aac9-3b2a8f644aec`) with the `shops` table. Import executed **351** statements and wrote **351** shop rows. Remote aggregate: **7 confirmed, 344 entered**, and **88 distinct raw city strings**.
- Cloudflare Worker `barbergame-customer` in account `707cdd30dab4f1606629739fce05a265`, bound to `DIRECTORY_DB` for the new directory and `SHOP_INTAKE_DB` for existing separate submissions. The latter was not overwritten.
- The existing customer website source at `~/designworks/projects/barbergame-map-home-v01` uses `cloudflare.config.ts`, `src/lib/directory/public-json.ts` (the name is historical; its reader now queries D1), `src/app/sitemap.ts`, and `src/app/api/shop-intake/route.ts`. Public URLs preserve `designworks-{id}` identifiers.
- Git snapshots: `5d8cd52` (D1 binding) and `7c25777` (D1 customer reader, sitemap, intake duplicate check). The release was made from the clean worktree `~/designworks/projects/barbergame-d1-release` at branch `release/cloudflare-d1-directory`, preserving unrelated unfinished Map Home edits in the original worktree.
- Owner initiated `npm run deploy:vinext` to production. Cloudflare reported success for Worker `barbergame-customer` serving `thebarbergame.com` and `www.thebarbergame.com`. **Version ID:** `ea48fe7c-302d-41cc-84d2-6e737991df17`.

### Verified after cutover

1. Production `/shops`, `/city/seattle`, `/sitemap.xml`, and `/add-barbershop` each returned HTTP 200.
2. The production sitemap contained **351 unique `designworks-{id}`** shop URLs.
3. The owner visually confirmed live shop detail pages for **5 Shades of Fades, Seattle** (`designworks-34`) and **Chop It Up Barbershop, Bothell** (`designworks-1`), with business details and maps.
4. Local production preview had previously passed directory search, shop profiles, and location/map behavior against an isolated local D1 copy of all 351 rows.

### Decisions

- Do not silently mix the old larger directory with the owned corpus.
- All 351 rows are kept for the first release; **9 missing/invalid coordinates** and potential duplicate(s) are subsequent enrichment work, not blockers.
- Keep `entered` separate from `confirmed` and retain source IDs and provenance.
- Shop submissions remain in `barbergame-shop-intake`. Seven total / five pending is a previously verified snapshot, **not a newly checked post-deployment count**.
- Prefer manual deployment and an auditable rollback trail, not auto-publication.
- Old `api.thebarbergame.com` / Railway services may still have other consumers. **Do not retire or delete** until dependencies have been audited, even though the primary customer directory no longer relies on the old packaged JSON.

### Remaining follow-up

- Recheck the seven existing shop submissions and perform one production beta submission test (the /add-barbershop HTTP 200 alone does not establish POST success).
- Audit all other dependencies before retiring the legacy directory API.
- Configure recurring D1 backups and test restoration; consider city normalization, coordinates and duplicate review later.
- Temporary test-only worktree, D1 `barbergame-intake-preview`, and separate Turnstile widget were created during investigation. They are not part of production and can be removed after confirming no use.

The production deployment does not automatically publish new submissions or synchronize updates from Designworks. Future edits should be made through an explicit versioned update pathway.


---

## Minimal stabilization and recovery — November 11, 2026

**Goal:** Protect the deployed directory with the safeguards already in place, without new backup infrastructure.

### Current layers
1. **Baseline copy:** `~/designworks/projects/barber-directory/data/barbergame-original.sqlite3` and private `~/barbergame-private/d1-directory-shops.sql` / `d1-directory-import.sql`. These protect the initial 351-shop snapshot, but do **not** automatically include future edits to D1.
2. **Cloudflare D1 built-in Time Travel:** Cloudflare documents automatic point-in-time history with no activation required for databases reporting `version: production`. Recovery window is **7 days on Workers Free** or **30 days on Workers Paid**; confirm account plan and actual database version before relying on it. This is the current default backup approach; do not build a parallel cron system just for this.
3. **Website:** Source is retained in Git with commits `5d8cd52`, `7c25777`; Cloudflare Worker deploy version `ea48fe7c-302d-41cc-84d2-6e737991df17`. A Worker code rollback does not restore overwritten D1 records.

### Read-only verification on the Designworks Mac mini

```bash
export CLOUDFLARE_ACCOUNT_ID=707cdd30dab4f1606629739fce05a265
npx wrangler d1 info barbergame-directory
npx wrangler d1 time-travel info barbergame-directory
npx wrangler d1 execute barbergame-directory --remote --command="SELECT COUNT(*) AS shops FROM shops;"
```

Expect `version: production`, a current Time Travel bookmark and 351 shops **until edits begin**. If a read-only check fails, investigate before using any restore operation; do not infer recovery is enabled merely from the existence of the database.

### Recovery procedure (requires owner authorization; do not execute as a routine check)

- First diagnose whether the failure is website code, a D1 write, or external service. For code problems, roll back the Worker version with Cloudflare deployments; leave D1 data unchanged.
- For accidental database writes, stop new directory edits and record **both the current Time Travel bookmark and the intended recovery timestamp**, plus a list of changes that would be lost. Recover only after explicit owner approval.
- D1 `time-travel restore` **overwrites the target database in place**. Do **not** test it on `barbergame-directory` or `barbergame-shop-intake`. First exercise the recovery procedure on a disposable test D1 database, using test-only rows, and verify the restore changes the row count as expected.
- After an authorized production recovery, recheck the shop count, representative shop IDs, customer search, sitemap, and any approved changes made since the selected timestamp. Restore of earlier data can remove later approved edits.
- If the mistake is outside the Time Travel retention window, the original private 351-shop SQL export can rebuild the **initial snapshot**, but later approved edits require newer snapshots or an audit trail. Revisit offsite/long-retention exports when the admin editor launches and real record changes begin accumulating.

**Status:** Recovery instructions recorded; production D1 version and bookmark still need a read-only check; disposable restore rehearsal not yet performed. No new backup automations created or production restore executed.

Sources: https://developers.cloudflare.com/d1/reference/time-travel/ and https://developers.cloudflare.com/workers/wrangler/commands/d1/
