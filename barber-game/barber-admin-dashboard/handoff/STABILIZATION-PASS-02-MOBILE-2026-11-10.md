# BarberGame Admin — Stabilization Pass 02: Mobile Weekly Hours

**Date:** 2026-11-10  
**Screen:** Barber Admin Dashboard > Availability > Weekly hours  
**Repository:** `jcricedesign/ai-website-test`  
**Checkpoint preserved:** `checkpoint/barbergame-ux-stabilization-2026-11-10`

## Source-level improvements implemented

1. **Picker focus preservation.** Selecting an hour, five-minute increment, or AM/PM no longer rebuilds the entire picker. This avoids discarding focused buttons and scroll position on every choice. Option buttons use radiogroup / radio semantics, `aria-checked`, roving tab indices, and keyboard arrows/Home/End.
2. **Sheet initial focus.** Opening the bottom sheet places focus on its titled heading (`tabindex="-1"`), instead of an invisible hidden form input.
3. **Visible focus trap.** Tab navigation excludes disabled inputs, hidden fields, controls inside hidden/inert parents, and zero-rectangle elements. Escape first dismisses the open time selector, then closes the parent sheet. Closing a selector restores focus to its triggering Start/End control.
4. **Inline validation.** Invalid or overlapping hours now display an on-screen `role="alert"` message associated with the Start/End buttons via `aria-describedby` and `aria-invalid`. Values are retained on failure. Previous toast-only error behavior was insufficient.
5. **Saved vs. suggested distinction.** The time editor explicitly says suggested times are not saved until **Add time**. Saved periods remain in the list above.
6. **Delete-last-period behavior.** Removing the last saved range no longer collapses the editor immediately. It stays Open in the current sheet so another period can be added; with zero saved ranges, the weekly overview remains Closed. Closing the sheet without adding a range does not persist an empty Open day.
7. **Picker semantics.** Nested in-sheet time chooser has a labeled dialog and touch-sized options.

Source commits: `c478c5f`, `276cc90`, `3896501`, `8ec4362`, and `2eaa88d` (restore focus to the current Edit button after the saved list re-renders). Week-availability data-integrity fix from Pass 01: `f55a211`.

## Regression evidence
- Repeatable source-level suite: `handoff/weekly-hours-regression.test.cjs`.
- **8/8 passed** after these changes and the final focus-restoration patch:
  1. Add two separate periods, preserve and order saved ranges.
  2. Reject overlaps.
  3. Reject non-five-minute entries.
  4. Remove one period without removing another.
  5. Delete the last period and keep the current editing state Open.
  6. Reject cancellation when barber declines and preserve previous state.
  7. Save approved cancellations together with new hours.
  8. Restore previous hours if cancellation storage fails.

These tests execute extracted production-prototype JavaScript against mock state, not a live backend.

## Browser acceptance automation provided
- `handoff/mobile-weekly-hours-smoke.py` is a **Chromium mobile-emulation** script designed to run against a locally served copy of the actual prototype. It seeds an isolated demo browser profile, dismisses first-time sample-message acknowledgment, then checks:
  - Closed -> Open and visibility of controls.
  - Suggested 2–4 PM not in saved list until Add time.
  - Add 2–4 and 6–8; saved list contains both.
  - Remove first period; second preserved.
  - Time picker keyboard arrow selection maintains focus; Escape returns focus.
  - Done, focus returns to the current weekday Edit button, weekly overview, reload and persistence.
  - Optional screenshots of key states.
- Run (in separate terminals, from repo root):

```bash
python3 -m http.server 8128
python3 -m pip install playwright
python3 -m playwright install chromium
python3 barber-game/barber-admin-dashboard/handoff/mobile-weekly-hours-smoke.py --screenshots /tmp/barbergame-weekly-qa
```

**Execution status:** Browser script is prepared but **not yet executed against the full app** in this conversation. This environment cannot resolve the deployed johnrice.com host and does not have the full private repository materialized as a local website. No assertion of iOS Safari, mobile Chrome, VoiceOver, or live site acceptance is made.

## Open acceptance issues

### Priority P1: physical-device and browser verification
- Test iPhone Safari; Android Chrome; 320, 375, 393 and 430 CSS px; rotated landscape; desktop 200% zoom. Confirm sheet footer is not obstructed and screen readers can reach every control.
- Confirm selected option state and focus behavior across all three picker columns with VoiceOver + Safari and TalkBack + Chrome. Confirm that the close button and Escape return focus reliably.
- Verify Tab and Shift+Tab trapping with a hardware keyboard and that hidden form fields are never focused.
- Verify active error state is read aloud and disappears when a corrected time is chosen; assess persistent errors if saving schedule records fails.
- Confirm opening a day with already saved periods never overwrites them and the user's suggested range is clearly distinct.
- Confirm opening/closing a day with zero intervals is explicit, and deleting all periods does not produce an unintended persisted Open state.
- Verify cancellation prompt readability for multiple affected appointments. Current `window.confirm` is a demo approximation; production requires a purpose-designed transactional confirmation.

### Priority P0: production behavior still not implemented
- Backend authorization, atomic server-side booking checks, multi-user and multi-device consistency, audit events, notifications, and production cancellation workflow.
- Client-side `localStorage` is **not** a durable source of truth.

## Exit criteria
This screen is **source-stabilized, browser-acceptance pending**, not ready for production. Close this workstream only after the browser smoke suite and physical mobile accessibility tests pass and any defects are resolved.

## Final checkpoint for this pass
- Current dashboard state: post-stabilization commit `2eaa88deaed58d8b21a9b677e19c30e608d6b104`.
- Regression script after patch: **8/8 passing** against current dashboard code.
- Browser smoke script prepared, **execution still pending** on a locally served full repository copy.
- The earlier frozen checkpoint branch remains unchanged.

## UX acceptance update — November 10, 2026

The product owner tested the deployed Weekly hours experience and reported that the simplified **Done-only** flow is behaving correctly. Supplied screenshots show two saved non-overlapping ranges listed individually (Monday 8:00 AM–2:00 PM and 6:00 PM–10:00 PM), a suggested next range, and both ranges in the weekly overview.

- **UX status:** Accepted for this prototype interaction.
- **Accepted behavior:** No "+ Add time" action; **Done** saves a valid range, with validity-gating for overlapping/invalid ranges. Reopen the day to append a second range. Each saved range has an independent Delete action.
- **Implementation checkpoint:** `checkpoint/weekly-hours-ux-approved-2026-11-10` in `jcricedesign/ai-website-test` (created from main after the fix).
- **Main implementation commit:** `24b257015b478a7dadff8927cdfbaa48dfed8428`.
- **Remaining gates:** Formal physical-device screen-reader/accessibility acceptance, production API integration, concurrency/cancellation transaction tests. These were **not** approved by this UX sign-off.

Next stabilization area: Appointments, booking availability and cancellations.
