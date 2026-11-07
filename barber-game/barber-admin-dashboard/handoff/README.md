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
| Today's appointments | Yes | Eight fictional records; summary opens full list; status edits remain in browser memory | Appointment list API, status transitions, permissions, validation |
| Past appointments | Yes | Six fictional records; Completed/Cancelled filters, load more, detail sheet | Paginated historical bookings API, dates/time zones, auditing |
| Customer detail sheets | Yes | Shows name, fictional `example.com` email, `555` phone and available sample appointment history | Real customer identity/contact fields, secure access controls, data retention |
| Block / unblock clients | Yes | Search name/email/phone; preview and confirmation; blocked list/details; persists using browser `localStorage` | Customer lookup, block scope rules, permissions, enforcement, audit log and undo policy |
| Weekly availability | Yes | Editable sample day/time values in memory | Availability API, holiday/time-off exceptions, overlap checking |
| Block time | UI only | Date/time modal and demo success message; does **not** change calendar availability | Persisted time blocks, conflicts, calendar refresh |
| Services and pricing | Yes | Add/edit sample service name, duration and price in memory; 52px up/down arrow controls | Service CRUD endpoints, validation, booking dependency handling |
| Barber profile | Partial | Editable display name and biography in memory; photo upload locally | Profile API, identity, photo storage, cropping and moderation |
| Shop profile | Partial | Shop details displayed; shop photo upload/removal locally | Shop/location/hours API, role-aware editing |
| Earnings/expenses | Read-only | Static sample financial totals | Billing ledger, reconciliation, reporting and authorization |
| Navigation and sheets | Yes | Browser client-side interactions; responsive mobile layout | Accessibility and device testing; route/state integration |
| Authentication | Demo gate only | Dashboard checks `sessionStorage` key `tbg-auth`; login page contains client-side credentials | Replace with real server-side authentication and authorization **before exposing real data** |

## What is connected right now
- GitHub repository: `jcricedesign/ai-website-test`; static GitHub Pages publication.
- Existing Barbergame demo index links to the dashboard in its Barber demos section.
- Official Chop It Up logo is referenced from existing website assets.
- Client-side JS provides real click behavior: bottom sheets, appointment filters, selection, edits, search, counters and confirmations.
- Browser-local `localStorage` stores resized barber/shop photo previews and blocked-client selections **only on that device/browser**. Most other edits reset on refresh.

## What is *not* connected
- **No API calls or database** (no server persistence for bookings, clients, services, availability, financials).
- **No live appointment creation or status mutation**, notifications, reminders, payments, calendar syncing, or booking enforcement.
- **No server-side image storage**; photos are resized into `localStorage`.
- **No verified customer information**: names/transactions are illustrative; contact details are fictional examples.
- **No production-grade authorization**. The static site's client-side login/session gate is not a security boundary. The repository is public; do not put real customer information or secrets in it.
- **No automated production acceptance test suite** was established for this prototype.

## Suggested implementation sequence for Judd
1. **Agree on data contracts and access scopes.** Identify appointment, customer, shop, barber, availability, service and blocked-customer models; define barber versus shop-owner permissions. Decide whether blocking affects a barber only or an entire shop.
2. **Replace demo login with proper auth.** Use authenticated backend endpoints, deny unauthorized reads and writes, audit sensitive operations; do not trust browser state.
3. **Connect operational workflows.** Appointments (today/history/status), client identity/search, service/pricing, schedule/time blocks. Derive KPI counts from the same underlying records to avoid mismatches.
4. **Connect photos and financial data.** Use secure uploads/object storage, role-based shop editing, verified ledger summaries; handle validation/errors/loading/empty states.
5. **Quality gates.** Test with real mobile devices, screen reader and keyboard focus, large text, DST/time zones, touch targets, blocking/unblocking edge cases and conflict handling.

## Open decisions (intentional, not defects)
- Client blocking rules, justified reasons, owner visibility, reversibility, and per-barber vs per-shop scope. Mervis noted possible overuse; defer policy design.
- Which data fields identify a client sufficiently, who may view contact details, and whether customer photo is appropriate.
- Booking permissions and financial visibility for barbers vs shop owners.
- Source of truth for shop hours versus individual barber hours.

## Review notes
- Owner validated the new mobile layout through live feedback on November 7, 2026.
- Specific revisions: larger touch controls, barber/shop photo editing, past appointments, all-bookings bottom sheet, client blocking/unblocking and customer detail/contact preview.
- All functionality shown is illustrative, appropriate for design review and implementation planning—not live business operations.

**CTO handoff goal:** preserve the approved UX pattern, wire it to the existing Barbergame backend via real APIs, and close the security/data gaps before production.
