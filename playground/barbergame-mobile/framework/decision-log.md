# BarberGame Mobile — Decision Log

Use this log for consequential product and interaction decisions. Keep entries short enough to scan.

## 2026-09-09 — My Day is the first intentional vertical slice
**Decision:** Begin the system-driven mobile work with My Day rather than attempting to systemize the whole application at once.
**Why:** My Day is the workhorse and concentrates the hardest problems: time, appointments, clients, availability, interruptions, live work, one-handed operation, hierarchy, motion, and Appointment Mode.
**Status:** Established

## 2026-09-09 — Test My Day as the temporal spine
**Decision:** Test the hypothesis that My Day is the center of gravity rather than treating Home, My Day, Business, and Stats as four equal silos.
**Why:** Business configures future time, My Day operates present time, Stats interprets completed time, and Home/attention can surface what matters across them.
**Status:** Testing

## 2026-09-09 — Protect Appointment Mode
**Decision:** Suppress non-actionable business information and unnecessary prompts while an appointment is active, while preserving quiet awareness of the immediate operational horizon.
**Why:** The current client owns the barber's focus, but the next client, arrival state, cancellation, or schedule consequence may become relevant without deserving a full interruption.
**Status:** Established

## 2026-09-09 — Use attention as a finite budget
**Decision:** Use Spotlight / Daylight / Starlight internally to reason about when information deserves attention.
**Why:** Important information is not always important now. The model helps prevent useful intelligence from becoming interruption.
**Status:** Testing

## 2026-09-09 — Motion must communicate meaning
**Decision:** Motion should explain state change, continuity, consequence, hierarchy, and recovery rather than decorate transitions.
**Why:** The desired native feeling is fast, physical, forgiving, and confident — “you can't break it.”
**Status:** Established

## 2026-09-09 — Light CRM is a memory aid
**Decision:** Client context should help a barber remember useful service and human details without scripting familiarity. Surface very little at a time.
**Why:** BarberGame should strengthen real relationships rather than simulate them. First-round responses consistently favored compact service/history context.
**Status:** Established

## 2026-09-09 — Preserve the rapid prototype
**Decision:** Keep the existing rapid prototype intact while intentional system work develops alongside it.
**Why:** The rapid prototype remains useful for exploration and comparison; system work should not erase discovery history.
**Status:** Established

## 2026-09-10 — Core working actions must be one-hand simple
**Decision:** Core My Day operational actions cannot depend on scrolling, swiping, typing, precision gestures, or reaching peripheral navigation.
**Why:** Founder, barber, and engineering responses independently converged on large targets, few choices, central actions, and avoiding text entry while cutting hair.
**Status:** Established

## 2026-09-10 — Available Time is the durable object
**Decision:** Treat cancellation as a schedule-changing event; after acknowledgement, model the resulting block as Available Time regardless of why it opened.
**Why:** The useful decision is what to do with the time now, not why it became free.
**Status:** Testing

## 2026-09-10 — Establish reality before intervention
**Decision:** When a schedule disruption occurs, first help the barber understand what is actually happening, then consequence, then decision, then action.
**Why:** A late client may be parking outside or may be far away. Intervention should follow situational certainty rather than the nominal schedule state.
**Status:** Testing

## 2026-09-10 — Appointment completion includes transaction closure
**Decision:** Treat payment/transaction resolution as part of operational appointment completion. Optional notes, reviews, or barber feedback may be deferred.
**Why:** First-round responses strongly prioritize closing the business event before asking for secondary work.
**Status:** Established

## 2026-09-10 — End of day closes work
**Decision:** End of Day should summarize meaningful outcomes, orient toward the next shift/day, and explicitly allow the barber to finish rather than creating more work.
**Why:** Responses converged on earnings, tomorrow/next-shift awareness, acknowledgement, and no nagging after work.
**Status:** Established
