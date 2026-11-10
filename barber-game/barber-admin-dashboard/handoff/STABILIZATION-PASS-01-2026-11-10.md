# Stabilization Pass 01 — Weekly Availability

Date: 2026-11-10
Area: Barber Admin > Availability > Weekly hours
Scope: prototype only; separate from the production BarberGame booking backend.

## Preservation and implementation
- Frozen starting point: `checkpoint/barbergame-ux-stabilization-2026-11-10` (do not edit).
- Implementation change: `f55a211fae44c6079fa21505a4cbe6f84edf180d` on `main`.
- Regression suite: `handoff/weekly-hours-regression.test.cjs`.
- Command from repository root: `node barber-game/barber-admin-dashboard/handoff/weekly-hours-regression.test.cjs`.
- Test suite validated against current source with simulated DOM and browser-storage objects. Seven tests passed.

## Feature behaviors inspected
- A day begins Closed with no saved hours or previously saved intervals, depending on browser storage.
- Open exposes the 5-minute mobile time picker and a suggested initial 2:00–4:00 PM range. This suggestion is **not saved** until Add time.
- Add time saves immediately to `localStorage`, updates the saved list, and suggests another non-overlapping period.
- Separate ranges may be entered out of order; persistence sorts them.
- Removing a range affects that range only unless the user confirms cancellation of demo bookings that fall outside the resulting schedule.
- Close day with booked time requires confirmation.
- Done closes the sheet; it does **not** add an unsubmitted suggested period.

## Source-level regression results
| Case | Result |
| --- | --- |
| Add 2–4 and 6–8, maintain both ranges | PASS |
| Add ranges out of order, sort chronologically and persist | PASS |
| Reject overlapping ranges | PASS |
| Reject non-five-minute starts and ends | PASS |
| Remove one range without clearing other ranges | PASS |
| Decline cancellation — no schedule or booking change | PASS |
| Confirm cancellation — hours and cancellation record saved | PASS |
| Simulated cancellation-storage error — previous hours restored, booking confirmed | PASS |

### Resolved defect S01-01 (P0)
**Prior behavior:** weekly-hours changes wrote demo cancellation records *before* the hours storage write had succeeded. In a storage failure, the saved cancellation record could disagree with the schedule.

**Fix:** save the new working hours before cancellation records; if the cancellation storage write fails, restore previous hours and do not mark appointments cancelled. The restoration path is tested. This is a demo-specific safeguard, not a real transactional guarantee.

## Open findings and follow-on tickets

### S01-02 (P0) Server-authoritative booking and schedule mutations
The prototype uses JavaScript seed appointments and browser `localStorage`. It cannot protect against simultaneous bookings, cross-device edits, or competing workers. Developer must enforce atomic booking + availability checks in the backend using stable IDs, time zone, and immutable audit records. Never treat the prototype's client-side save function as production logic.

### S01-03 (P1) Distinguish unsaved suggestion from persisted shift
The picker auto-fills suggested times after Open/Add time. Visual design should explicitly identify them as **Next suggested hours (not yet added)** and keep saved intervals above. Ensure Done/Cancel cannot be mistaken for Add. Decide whether user needs an unsaved-input warning when dismissing a sheet with a newly selected time.

### S01-04 (P1) Storage and reopening states
Manual mobile verification still needed: Closed with no saved hours; Open with no hours; first Add; second Add; delete final period; close with bookings; reload in the same browser; reopen in another browser (expected **not** to synchronize in demo). Define what a “day marked Open with zero hours” means and keep list and picker consistent.

### S01-05 (P1) Validation and error recovery
Current validation communicates many failures through a temporary toast. Make error messages persistent and adjacent to Start/End, expose them through `role="alert"` / `aria-describedby`, retain user selections, and focus the invalid field. Test equal start/end, end before start, duplicate periods, adjacent boundaries, overlaps, and overnight ranges (overnight currently unsupported).

### S01-06 (P1) Accessibility of time picker
`renderDayTimePicker` rebuilds its option buttons after each choice; verify focus continuity, scroll position, and selected state with keyboard and VoiceOver. A selected value is given `aria-pressed`; check whether individual options should instead be a radio group, that labels are announced, and that the panel opens with focus inside it. Confirm 44px targets, contrast, large text, and Escape behavior.

### S01-07 (P1) Modal focus management
Sheet has `role="dialog"`, `aria-modal`, and a title. Existing tab handling lives in a global key listener; manually verify focus trap includes only *visible/enabled* controls and restores focus to the invoking Edit button. Test page at 320/375/393 px, mobile browser bars, software keyboard, 200% text size, and 200% zoom.

### S01-08 (P1) Existing appointment policy
For a time-period deletion impacting bookings, the demo uses `window.confirm` and changes appointment status. Production flow needs itemized affected appointments, server reconciliation, policy for notification/rescheduling/refunds, permission checks, and explicitly approved transaction. Declining must make no changes.

### S01-09 (P2) Layout hierarchy
Comp reference: Closed centered, Open/Closed controls, saved ranges as compact rows with Delete, next suggested time picker below, + Add time, Done. Keep buttons and sheet footer stable without obscuring scrolling content.

## Manual acceptance scenarios (not yet browser-verified)
1. iPhone Safari + Chrome responsive emulation: open a Closed Monday; select Open; confirm suggested range is **not yet in saved list**; Add time; verify range appears in list and Monday overview.
2. Add 6–8 PM; verify two rows remain and persist after refresh; remove 2–4 PM; ensure only 6–8 remains and no unrelated row changes.
3. Enter 2–4, then attempt 3–5; verify overlap error remains visible, no data loss, and previous list unchanged.
4. Test afternoon AM/PM rollover, 12:00 AM/noon, 5-minute increment ends, date rollover at midnight, and DST boundary behavior (specification needed).
5. Attempt deleting hours containing a booked appointment; decline confirmation and verify no change; then approve and verify appropriate demo cancellations and list/availability refresh.
6. Repeat with VoiceOver, hardware keyboard, 200% zoom, and 320px width. Check focus through all time-picker columns and both modal actions.
7. Simulate blocked/unavailable `localStorage` and verify error messaging, successful rollback, and no false success toast.

## Definition of Done for this workstream
- All regression tests pass in CI (or developer workstation).
- Manual scenarios verified on iPhone Safari and desktop browser (not merely syntax validation).
- No appointments are silently cancelled, bookings cannot cross breaks, and no saved periods are lost.
- All modal, picker, error, and confirmation states are keyboard/screen-reader accessible.
- Developer records one screenshot for each key state and resolves/openly documents outstanding constraints.

## Status
**Pass 01 complete at source level; browser and production acceptance pending.** No claim that the live endpoint has been tested. No new production API or financial workflow has been implemented.
