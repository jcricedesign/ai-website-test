# Barber Admin Dashboard — Developer Handoff
**TBG Network LLC / Chop It Up Barbershops**  
**Approved by:** Mervis (shop owner) · **Date:** 2026-11-07  
**Checkpoint:** `checkpoint/barber-admin-dashboard-v0.3-mervis-approved-2026-11-07`  
**Live demo:** https://www.johnrice.com/barber-game/barber-admin-dashboard/  
**Source:** https://github.com/jcricedesign/ai-website-test/blob/checkpoint/barber-admin-dashboard-v0.3-mervis-approved-2026-11-07/barber-game/barber-admin-dashboard/index.html

## Executive summary
A mobile-first, one-scroll-page redesign of the legacy Chop It Up barber administration panel. The approved design uses a fixed four-item bottom navigation, large touch targets, and slide-up modal sheets for editing. **This is a self-contained UI prototype, not production software.** The prototype is stored as standalone HTML/CSS/JavaScript, deployed via GitHub Pages. No live client, barber, booking, shop, or financial services are connected.

## Feature inventory / engineering truth

| Feature | UI implemented | Data and behavior | Production integration required |
| --- | --- | --- | --- |
| Today dashboard & KPI tiles | Yes | Static 8-booking / 6-slot / $285 sample values; booking count updated from in-memory list | Real-time booking counts, open-slot calculation, revenue aggregation |
| Today's appointments | Yes | Eight fictional records; summary and full list show client name, fictional email/phone, View Details, and one Cancel action. Cancellation requires written reason and changes demo-only status in browser memory. New Appointment includes date and 15-minute time controls | Appointment API, cancellation reason validation/storage, notifications, permissions, real booking checks and customer visibility |
| Future appointments | Yes (post-checkpoint) | Compact preview and View All bottom sheet; fictional upcoming bookings grouped by date through Dec 31 of the current year; New Appointment routes future-dated sample entries into this list (in-memory) | Future booking query API with date range, pagination, real times and permissions | 
| Past appointments | Yes | Six fictional records; Completed/Cancelled filters, load more, detail sheet | Paginated historical bookings API, dates/time zones, auditing |
| Customer detail sheets | Yes | Shows name, fictional `example.com` email, `555` phone and available sample appointment history | Real customer identity/contact fields, secure access controls, data retention |
| Block / unblock clients | Yes | Compact Manage Blocked Clients entry opens an on-demand bottom sheet (list hidden from the main scroll); search by name/email/phone, preview and confirmation; View Details/Unblock; browser `localStorage` only | Customer lookup, block scope rules, permissions, enforcement, audit log and undo policy |
| Weekly availability | Yes | Touch-friendly 15-minute up/down time steppers for start/end, AM/PM display, open/closed toggle; edits are in-memory | Availability API, holiday/time-off exceptions, overlap checking |
| Block time | Interactive demo | Choose a specific date and start/end using 15-minute arrow controls, save a visible time block, remove it later; browser `localStorage` persistence; demo overlap validation | Availability API persistence, real booking conflicts, access permissions, calendar and search availability propagation |
| Services and pricing | Yes | Choose from a preset service dropdown (with Other / Custom fallback); optional freeform service details; editable duration/price with 52px arrow controls; in-memory only | Backend service catalog, IDs, ownership and service CRUD, descriptions, validation, booking dependency handling |
| Barber profile | Partial | Editable display name and biography in memory; photo upload locally | Profile API, identity, photo storage, cropping and moderation |
| Shop information | Removed from barber demo | Entire Shop Information section and its navigation link removed at owner request | Shop identity, hours, special hours, and photos belong in the separate owner/admin experience |
| Earnings/expenses | Read-only | Static sample financial totals | Billing ledger, reconciliation, reporting and authorization |
| Barber messaging inbox + multi-recipient compose | Yes (new, post-checkpoint) | Unread/past/sent folders, read state; compose to all barbers, multiple shops, or named barbers from a fictional location roster; locally saved sent messages only | Real recipient directory, selection permissions, group fan-out, delivery/read APIs, notifications, privacy controls and moderation | 
| Navigation and sheets | Yes | Browser client-side interactions; responsive mobile layout | Accessibility and device testing; route/state integration |
| Authentication | Demo gate only | Dashboard checks `sessionStorage` key `tbg-auth`; login page contains client-side credentials | Replace with real server-side authentication and authorization **before exposing real data** |

## What is connected right now
- GitHub repository: `jcricedesign/ai-website-test`; static GitHub Pages publication.
- Existing Barbergame demo index links to the dashboard in its Barber demos section.
- Official Chop It Up logo is referenced from existing website assets.
- Client-side JS provides real click behavior: bottom sheets, appointment filters, selection, edits, search, counters and confirmations.
- Browser-local `localStorage` stores resized barber photo previews, blocked-client selections, date-specific time blocks and **demo inbox state** (including read/unread and locally composed messages) **only on that device/browser**. Most other edits reset on refresh.

## What is *not* connected
- **No API calls or database** (no server persistence for bookings, clients, services, availability, financials).
- **No messaging service**: inbox samples and the barber/shop recipient directory are fictional; composing a message saves a local sample sent record but sends nothing. No real broadcast, per-location fan-out, role enforcement, outbound delivery, shared message state, push or email notifications.
- **No live appointment creation or status mutation**, notifications, reminders, payments, calendar syncing, or booking enforcement.
- **No server-side barber image storage**; the barber photo is resized into `localStorage`. Shop photo management belongs to the separate owner/admin experience.
- **No verified customer information**: names/transactions are illustrative; contact details are fictional examples.
- **No production-grade authorization**. The static site's client-side login/session gate is not a security boundary. The repository is public; do not put real customer information or secrets in it.
- **No automated production acceptance test suite** was established for this prototype.

## Suggested implementation sequence for Judd
1. **Agree on data contracts and access scopes.** Identify appointment, customer, shop, barber, availability, service and blocked-customer models; define barber versus shop-owner permissions. Decide whether blocking affects a barber only or an entire shop.
2. **Replace demo login with proper auth.** Use authenticated backend endpoints, deny unauthorized reads and writes, audit sensitive operations; do not trust browser state.
3. **Connect operational workflows.** Appointments (today/history/status), client identity/search, service/pricing, schedule/time blocks. Derive KPI counts from the same underlying records to avoid mismatches.
4. **Connect barber photos and financial data.** Use secure uploads/object storage for barber portraits, with owner/admin-only shop photo management elsewhere; add verified ledger summaries and validation/error/loading/empty states.
5. **Quality gates.** Test with real mobile devices, screen reader and keyboard focus, large text, DST/time zones, touch targets, blocking/unblocking edge cases and conflict handling.

## Open decisions (intentional, not defects)
- Client blocking rules, justified reasons, owner visibility, reversibility, and per-barber vs per-shop scope. Mervis noted possible overuse; defer policy design.
- Which data fields identify a client sufficiently, who may view contact details, and whether customer photo is appropriate.
- Booking permissions and financial visibility for barbers vs shop owners.
- Source of truth for shop hours versus individual barber hours.

## After approved checkpoint
- **2026-11-07 future appointments:** Added a compact Future Appointments card between Today and Past, plus a full scrollable, date-grouped bottom sheet covering appointments after today through December 31 of the current year. Fictional November/December 2026 records are seeded. Creating a demo appointment for a later date adds it to the in-memory future list. No live calendar/API integration or durable appointment storage.
- **2026-11-07 blocked-client visibility refinement:** Removed the always-visible Blocked Clients card from the scrolling page. Manage Blocked Clients opens the list and its View Details, Unblock, and Block Another Client actions in a bottom sheet. The list remains available without distracting from appointments.
- **2026-11-07 cancellation and client-details refinement:** Removed the appointment status selector (Confirmed/Completed/Cancelled). Appointment rows now mirror Blocked Clients by displaying client name, fictional email, phone and View Details. A single Cancel action opens a confirmation sheet that **requires a written cancellation reason**; cancellations affect only the in-memory demo and do not block the customer. Backend implementation must retain the reason with audit information and handle notification policy.
- **2026-11-07 appointment and availability refinement:** New Appointment and Block Time use the same 15-minute up/down arrow time controls as Weekly Hours. Blocks are date-specific, visible in Availability, removable, and persisted only in the browser. The demo checks for overlapping blocks and existing sample bookings on today's date, and prevents creating new sample appointments over a blocked slot. This is not integrated with actual booking search or backend availability.
- **2026-11-07 time controls refinement:** Weekly day-hours editor now uses 15-minute up/down arrow steppers for Start/End instead of native typed time fields. Closing a day disables the steppers; the UI displays readable AM/PM time. Edits remain in-memory.
- **2026-11-07 role boundary correction:** First removed shop-photo display/editing, then removed the **entire Shop Information section** and its More-menu link following Mervis's clarification. Shop name, hours, exceptions, and photos belong to a separate owner/admin experience. Barber profile photo editing remains. The approved v0.3 checkpoint remains unchanged.
- **2026-11-07 service editor refinement:** Mervis requested standardized services selected from a dropdown with optional custom descriptions. The live demo now offers predefined service types, an Other / Custom fallback, and an editable service-details field. The preset catalog is illustrative; engineering should map entries to the canonical backend service taxonomy.
- **2026-11-07 inbox and compose additions:** Mervis identified that each barber needs an inbox and all barbers should be able to compose to all barbers, selected shops or individually selected barbers. Messages is placed at the bottom of the one-page dashboard. Composer provides multi-select recipient lists and a demo-only sent record; no message delivery, real directory, or access enforcement. This change is **after** the preserved v0.3 approval branch; the branch remains frozen. Integration and verification are still required before declaring messaging production-ready.

## Review notes
- Owner validated the new mobile layout through live feedback on November 7, 2026.
- Specific revisions: larger touch controls, barber photo editing, past appointments, all-bookings bottom sheet, client blocking/unblocking and customer detail/contact preview.
- All functionality shown is illustrative, appropriate for design review and implementation planning—not live business operations.

**CTO handoff goal:** preserve the approved UX pattern, wire it to the existing Barbergame backend via real APIs, and close the security/data gaps before production.
