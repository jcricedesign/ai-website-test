# BarberGame Admin — Stabilization Pass 03: Appointments

**Date:** 2026-11-10  
**Scope:** Admin prototype: appointment creation, booked/blocked availability, future appointment detail, cancellation persistence, states.  
**Approved baseline:** `checkpoint/weekly-hours-ux-approved-2026-11-10` (unchanged).

## Changes implemented

1. **Booking persists between reloads in same browser.** New demo appointments are written to `localStorage` before being added to the in-memory appointment list. On page load, saved demo appointments are restored to today's or future list as appropriate.
2. **Manual cancellation persists between reloads.** Cancellation reason and identity key are persisted before updating appointment status; storage failure preserves previous status. The existing weekly-hours-triggered cancellation pathway is retained separately.
3. **Future appointment cancellation.** Future appointment detail now has Cancel appointment (when not already cancelled) and a dedicated reason-required confirmation form. No actual customer notification is sent.
4. **Availability guard.** A past date, invalid duration, booked interval, blocked interval, split-hours break or closing-boundary crossing cannot be selected in the client-side prototype. Missing/closed-day rendering now disables Add appointment and clears stale selected/booking context.
5. **State clarity.** Future cancelled rows show Cancelled; scheduled counts exclude cancelled bookings. A future booking cancelled by the barber no longer looks confirmed.
6. **Invalid services.** Appointment submission refuses missing services and inquiry-only services. (The inquiry-only selection was already visibly disabled in the prototype.)
7. **Persistence failure.** The creation flow refuses to claim success if saving a new demo booking fails.

## Regression evidence
A repeatable source-level suite is checked into `handoff/appointments-regression.test.cjs`:

`node barber-game/barber-admin-dashboard/handoff/appointments-regression.test.cjs`

12 checks pass:
- Available appointment fits a working range
- Cannot cross lunch/break between split periods
- Cannot cross period's closing boundary
- Existing booking blocks conflicting start
- Cancelled booking frees start
- Blocked period prevents booking
- Past dates and invalid duration are rejected
- New booking persists before visible mutation
- Booking persistence failure leaves no phantom appointment
- Saved booking restored on browser reload
- Manual cancellation reason/status persisted
- Cancellation write failure preserves confirmed status

**Test boundary:** These are actual prototype functions tested with mocked browser state; they are not an iPhone device test or transactional backend test.

## Unresolved / developer implementation requirements

**P0 Production**
- Introduce server-owned appointments, stable IDs for barber/customer/service, shop timezone, immutable status events, concurrency-safe slot reservation, idempotency, and authentication/authorization. Demo localStorage is not cross-device and never production-safe.
- Use atomic transaction for schedule edit + impacted booking reconciliation, not separate localStorage keys.
- Notification and reschedule policy for cancellation, including customer communications and possible payment/refund reconciliation.
- Current demo identification for cancellation uses name/date/time/service composite; collisions are possible (two records sharing all values). Replace with durable unique appointment ID on backend.
- Durations are looked up from the *current* service catalog, rather than snapshotted on each appointment. An edited duration could reinterpret previous bookings; store duration and price snapshot at booking time.
- No delivery, payment, calendar sync, or customer account record is created by this prototype.

**P1 UX and accessibility**
- Conduct actual iPhone Safari, Android Chrome, keyboard, VoiceOver and TalkBack testing of New appointment, available/blocked/booked time cells, and cancellation sheets.
- New appointment: distinguish empty date, closed day, fully booked day, blocked slots, network error, and attempted submission conflict. Announce field errors in-place, not toast only.
- Cancellation: show customer, date/time, service, required reason, warning about notifications and consequences; ensure deliberate confirmation and success feedback.
- Future appointments: distinguish active and cancelled, and avoid labelling all history as upcoming when dates have passed.
- Time and date input must be handled in the shop's timezone, including DST boundaries.
- Consider blocked-client restrictions with stable customer ID rather than name matching; define policy for admin-created appointments.
- Check 320–393px sheets, fixed footer vs scroller, focus return after rerender, and touch target size.

## Owner acceptance test suggestions
1. **New appointment**: Open New appointment, choose a date with working hours, select service, pick available slot, provide name, press Add appointment. Confirm it appears in the schedule and remains after refresh.
2. **Booked conflict**: Try to book the same time again. The occupied time should be disabled.
3. **Split-hours break**: Use Monday with two working periods; try a service that would cross the gap. It must be unavailable.
4. **Blocked time**: Block a slot, then open New appointment for that date. It should no longer be selectable.
5. **Cancellation**: Cancel an appointment with reason; refresh. It should remain Cancelled and be excluded from active counts.
6. **Future cancellation**: Open future appointment details, select Cancel appointment, enter reason, confirm, refresh. Cancelled status must remain visible.

## Status
Source-level stabilization pass complete; owner/manual browser acceptance pending. The approved Weekly Hours checkpoint has not been changed. No live backend appointment creation or cancellation has been introduced.
