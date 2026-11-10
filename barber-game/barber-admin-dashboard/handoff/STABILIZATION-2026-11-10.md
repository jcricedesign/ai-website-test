# BarberGame / Chop It Up — Feature Inventory and Stabilization Handoff
**Checkpoint:** 2026-11-10  
**Status:** design/development prototype, **not production acceptance**  
**Snapshot:** `checkpoint/barbergame-ux-stabilization-2026-11-10` in `jcricedesign/ai-website-test`. Separate public site snapshot: `checkpoint/search-ui-2026-11-10` in `barbergame/site` (development).

## Systems and boundaries
1. **Barber Admin Dashboard**: `barber-game/barber-admin-dashboard/index.html`, demo URL `https://johnrice.com/barber-game/barber-admin-dashboard/`.
2. **Customer Booking Prototype**: `barber-game/customer-v2/index.html`, demo URL `https://johnrice.com/barber-game/customer-v2/`. This is separate from the live site.
3. **Example Earnings Statement**: `barber-game/barber-admin-dashboard/income-statement/index.html`.
4. **Public Next.js site**: `barbergame/site`, development branch. Search placeholder changed to “Search by name or location”; barber-name search in the backing API is **not confirmed**.

All code was inspected statically. GitHub checkpoint creation succeeded. No complete end-to-end mobile, API, deployment, accessibility, or transaction testing was performed for this handoff.

## Shipped in prototype (implementation vs. live system)
### Barber dashboard
- Today’s, future, and past appointments; day-context availability in new-appointment picker; cancellation status; simplified list rows (no email or phone; cancellation reason hidden).
- Client details with sample contact and history; block/unblock action with confirmation; dedicated Blocked clients module below Blocked time slots.
- Weekly working hours per day, with open/closed control; multiple non-overlapping time ranges; 5-minute time selector; Add time and individual Delete; block slots separately. Saved ranges rendered in day overview.
- Service catalog and editor (preset/custom, duration, price, description); in-sheet service picker; optional inquiry-only mode showing “Inquire” in place of price/duration and preventing booking through demo flow.
- Barber profile editor (read-only username and ID, required-field markers, contact, optional social/bio/experience), profile photo prototype.
- Earnings/expenses illustrative overview, year-specific sample statement links 2021–2026, print/save-as-PDF; 2021–2025 historical totals explicitly unavailable.
- Re-Up Voucher card, seven-day sample benefit, Yes/Cancel demo claim and local claimed status.
- Messages and other pre-existing prototype modules remain present.

### Customer prototype
- Shop discovery/list with nearby-location presentation, barber cards, ranks, avatars, time offers, shop expansion.
- “View more / View less” moved into shop header in place of “First Available” on the working-today roster. This toggles roster expansion, **not all appointment times**.
- Customer profile, service, barber, time, and confirmation screens exist. They use prototype/simulated data and should not be treated as a production booking transaction.
- Separate Next.js public-site search placeholder “Search by name or location” is only wording; API behavior and indexing across barbers need backend work.

## Highest-priority stabilization issues (evidence / risk)
**P0 — before real users or transaction coupling**
1. **Data ownership/transaction truth**: Admin pages contain sample bookings and future appointments in front-end code; various preferences are stored in `localStorage`. Specify server-side entities and transactions before connecting customers, barber schedules, blocks, claims, and cancellations.
2. **Booking consistency**: availability must be calculated by one authoritative service shared by customer/owner/barber. Validate conflicts, booking creation, modification, cancellation, blocked times, split hours, time zones, and concurrent requests on the server; UI is never authoritative.
3. **Cancellation/blocked hours safety**: current demo confirmation may mark sample bookings cancelled when weekly hours change. Production requires enumerating affected booking IDs/dates, user confirmation, notifications, compensation/refunds as appropriate, audit trail, and rollback strategy. Never silently cancel.
4. **Voucher claim**: demo claim is local browser flag, not an issued entitlement. Production requires identity, eligibility, owner approval, redemption idempotency, covered dates, expiry, audit, and accounting entries.
5. **Authentication/privacy**: demo uses client sessionStorage gating, not production authentication or authorization. Protect personally identifying contact information and any booking or financial actions server-side.
6. **Financial statements**: illustrative 2026 total and no verified prior-year ledger. Do not present documents as proof of income. Historical-year exports must not invent figures.
7. **Search promise mismatch**: public site input says name/location, but backing search API is shop-focused. Establish indexed barber-name -> associated shop and city/address matching, no-results behavior, privacy/public visibility, and ranking.

**P1 — interaction logic and states**
8. Weekly hours: test initial Closed -> Open, default suggestion, Add time, multiple ranges entered out of order, Remove, closing day, reopen persistence, overflow past midnight, zero ranges marked Open, overlapping or touching boundaries, and existing booked slots. The current source stores ranges per day, sorts before save, and uses 5-minute validation.
9. Weekly hours: distinguish **preview/suggested time** from **saved time**; ensure Add time feedback, disabled controls and Delete labels clearly convey state. A closed day must not offer an enabled time picker.
10. Appointment list consistency: today/future/past should use consistent metadata, action labels, status presentation; test empty/cancelled/completed/partially booked states, and date-sensitive totals.
11. Service inquiry-only: verify toggling on/off preserves previous price/duration privately, hides them publicly, suppresses customer booking CTAs, and has a working call/contact route. Define whether admin can manually book an inquiry service.
12. Blocked clients: block/unblock from client details and dedicated module; identity disambiguation for duplicate names; define effect on existing vs future bookings and notification expectations.
13. Customer shop roster: collapsed and expanded counts; distinguish “View more barbers” from “More time slots”; ensure trigger only shown if more rows exist, and expanded state is announced.
14. Date picker: on Today, do not show a previous-day circle; future dates show both controls; prevent navigation to the past. Screenshot behavior needs implementation verification in the exact deployed version.
15. Search: name/location placeholder, barber/shop/city/ZIP searches, zero-results recoverability, failed-network messaging, and search-result labeling.
16. Reports: View/Download PDF tested on iOS Safari and Chrome; loading/unavailable/error states, demo watermark and redaction.

**P2 — fit, finish and visual polish**
17. Consistent mobile sheet header, scrolling, footer/button placement, safe area, and keyboard/visual viewport management; native popovers previously escaped the mobile sheet.
18. Consistent capitalization, typography, button hierarchy, destructive red reserved for Block/Cancel/Delete, restrained color usage.
19. Prevent clipping of long names, email, city and service strings at 320–393 px widths, 200% zoom, and large text sizes.
20. Clarify the relationship of the source repository, johnrice.com prototype paths, thebarbergame.com public site, and API deployments; test exactly the intended target.

## Accessibility acceptance criteria
- Modal bottom sheets: semantic dialog title, `aria-modal`, focus enters the sheet, keyboard focus stays inside visible controls, Escape/Cancel works safely, focus returns to opener; hidden/disabled controls excluded from tab order.
- Touch targets >= 44 CSS pixels where practical, adequate separation, visible focus ring, correct pressed/expanded state.
- Time picker: hour/minute/AM-PM controls have accessible labels, selected value announced, keyboard operation, dismissal and confirmation; five-minute increments; no accidental background focus. Avoid relying on color alone.
- Form labels and required/optional indicators; accessible validation errors tied to fields, not toast-only; preserve entries on validation failure.
- Announce appointment and working-hours updates using polite live region, not the entire refreshed page; status includes visible text.
- Contrast and text reflow WCAG 2.2 AA; large text/zoom; reduced-motion preference; screen-reader checks on VoiceOver + Safari and TalkBack + Chrome.
- Inactive dates and destructive actions have clear disabled states and confirmation wording.

## Developer implementation contract
**Suggested entities**
- Barber, Shop, Service (inquiryOnly, optional price/duration), AvailabilityPeriod (weekday, startLocalTime, endLocalTime, timezone), TimeBlock (dated range), Customer, Appointment (ID, status, timestamps, immutable audit events), ClientBlock (customerId, barber/shop scope, reason/access policy), Voucher (eligible barber/shop, validity, claim state), EarningsLedgerEntry, YearlyStatement.
- Use stable IDs, not display names, for customers, barbers and services. Explicitly model time zone and daylight-saving changes.
- Enforce one authoritative availability/booking check at API transaction time, not only in the UI.
- Claims and cancellations: idempotency and audit; user-visible receipts and failure states.
- Prevent double booking under concurrent attempts; ensure booking creation and slot invalidation are atomic.
- Privacy controls, authorization per shop/barber/customer, logs without sensitive data, real message and notification workflows.
- Track demo fixture data separately from production records and never merge silently.

## Acceptance test matrix (must be demonstrated, not inferred from syntax checks)
1. New closed day -> Open -> add 2–4 -> add 6–8 -> reload -> both present and correctly ordered.
2. Delete unbooked 2–4 -> only 6–8 remains -> reload; cancel a deletion confirmation with booked appointments -> no data changes.
3. Enter overlapping ranges -> error without losing inputs; 5-minute picker offers no 1-minute values; time selection works with touch and keyboard.
4. Customer creates appointment exactly at boundaries -> cannot cross a break or blocked time; parallel clients cannot reserve same slot.
5. Block a client from past detail -> confirm -> status/list update -> search/access restricted per policy -> unblock; duplicate names work.
6. Inquiry-only service shows Inquire, not price or duration, across all customer surfaces; online booking disabled; call route works.
7. Voucher claim Yes once -> idempotent and consistent across sessions/devices in production; Cancel leaves status untouched.
8. Reports per year contain accurate verified or explicitly unavailable records; mobile PDF flow and printable page audited.
9. Customer roster View more/less changes the right content and states; Today date picker has no previous circle.
10. All major sheets and forms verified at 320/375/393 px, keyboard, VoiceOver, TalkBack, 200% zoom, and error/network states.

## Recommended sequence
**Gate 1 (prototype UX stabilization):** Fix P1/P2 in current prototype, make screenshots for states, complete manual mobile test pass.  
**Gate 2 (behavior and accessibility):** Formalize state machines, error/empty/loading states; run accessibility acceptance matrix.  
**Gate 3 (production implementation handoff):** APIs, schemas, permissions, server transactions, ledger and notifications.  
**Gate 4 (integration):** Parallel customer/barber/owner tests, observability, staged rollout and rollback.  

**Definition of stabilized prototype:** each critical flow passes the acceptance tests in a real browser, states are documented, known limitations explicitly labeled, and no unsupported claim of “live” booking, income, or redemption is made.
