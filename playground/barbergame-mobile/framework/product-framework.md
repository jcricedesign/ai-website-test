# BarberGame Mobile — Product Framework

Status: Working framework
Date: September 2026

This document captures the reasoning that should survive individual screens, prototypes, collaborators, and implementation choices. It is intentionally small. The interface should feel simpler than the system described here.

## Product intent

BarberGame helps a barber get business done quickly while strengthening the relationships, reputation, and career behind that business. The working experience should feel fast, clear, physical, forgiving, and calm.

The complexity belongs behind the interface.

## Primary product principles

### 1. Relationships Over Transactions
We exist to create and strengthen trusted relationships between clients and barbers.

### 2. Great Work Deserves Recognition
The system should make quality, consistency, professionalism, and mastery visible without turning the profession into arbitrary gamification.

### 3. Preserve & Strengthen Barber Culture
BarberGame should strengthen the profession and respect the different identities, cultures, and communities within barbering.

## Supporting principles

1. Relationships Over Transactions
2. Preserve Barber Culture
3. Make Excellence Visible
4. Reward Consistency
5. Time Is Sacred
6. Help Barbers Build Careers
7. Help Clients Find the Right Barber
8. Respect Different Shop Cultures
9. Measure What Matters
10. Build for the Next Decade

These are evaluation criteria, not a feature checklist.

## Interaction doctrine

### Stay shallow
Success should normally be reachable in three actions or fewer. Avoid deep trees and unnecessary navigation.

### One-handed operation
Core working-day interactions should be comfortable with either hand, tolerate imperfect input, and avoid precision gestures.

### Ruthless hierarchy
Every operational state should make the hierarchy obvious:
1. Really important
2. Kind of important
3. Nowhere near as important right now

Hierarchy is contextual. The same information may change priority as time and circumstances change.

### Support memory; do not manufacture relationships
The light CRM exists to remind the barber what mattered to this client: preferences, useful context, history, and continuity. It should never prompt fake familiarity or forced interaction.

### Verify, then disappear
Verification should support the real-world relationship and then get out of the way. A phone bump is meaningful because it can mark the moment the barber and client are together and the phones can be put away.

### Protect the appointment
Appointment Mode is protected space. Once an appointment begins, non-actionable business information, metrics, prompts, and distractions should recede.

### Interrupt only when actionable
Cancellations, lateness, conflicts, arrivals, and meaningful schedule changes can deserve attention. Passive information should not interrupt active work.

### You can't break it
Interactions should feel physically confident: immediate response, forgiving input, preserved state, graceful recovery, reversible actions where possible, and predictable resolution of partial gestures.

### Motion has meaning
Motion communicates cause, continuity, state, consequence, and hierarchy. It is not decoration. Objects should feel like the same object changing state rather than unrelated screens replacing one another.

## Attention model

Attention is a budget. BarberGame must earn the right to spend it.

### Spotlight — Act now
Rare, consequential, and worthy of immediate focus. Spotlight can interrupt when necessary.

### Daylight — Operate now
The normal working condition: what is happening, what is next, what is available, and the context needed to operate.

### Starlight — Remember for later
Worth preserving and potentially important, but not deserving attention now. The system remembers so the barber does not have to.

Attention state is contextual, not intrinsic. An item can move from Starlight → Daylight → Spotlight as time, importance, consequence, and actionability change.

## Current IA hypothesis

The current four destinations are Home, My Day, Business, and Stats, but they should not be assumed to be equal silos.

Working hypothesis:

- **My Day operates the present.**
- **Business configures the future.**
- **Stats interprets the past.**
- **Home / attention surfaces what matters.**

My Day may be the temporal spine of the barber experience. Information and actions from elsewhere in the product can enter that spine when time, importance, consequence, and actionability make them relevant.

A useful prioritization lens is:

**Time × Importance × Consequence × Actionability**

This is a reasoning model, not necessarily a literal score.

## My Day working hypothesis

My Day is not merely a schedule. It may be an attention system organized by time.

The working-day cycle:

Before work → Between appointments → Preparing → Client arrives → Appointment begins → Appointment Mode → Appointment ends → Between appointments → Day ends

Reality must be modeled as first-class behavior, not edge cases: early arrival, late client, cancellation, no-show, walk-in, newly claimed slot, barber running behind, break, unexpected opening, and schedule change.

The interface should have gravity toward **Now**. As work completes, the day's attention advances.

## Trust and evidence

Trust signals are evidence, not principles. Preserve distinctions between:

- Verified facts
- Calculated signals
- Human endorsements
- Aspirational/future signals

Potential evidence includes identity, license, experience, completed work, repeat-client behavior, reliability, referrals, verified reviews, specialties, professional development, and community contribution.

A useful capability progression is:

**Offered → Verified → Recognized**

The Trust Engine hypothesis connects:

**Need → Capability → Match → Real interaction → Evidence → Reputation → Better future match**

## Decision vocabulary

### Decision status
- **Established** — strong enough to guide implementation
- **Testing** — active hypothesis being explored
- **Question** — unresolved architectural/product question
- **Future** — intentionally retained but outside current scope

### Evidence / provenance
- **Research** — observed or extracted from barber/client research
- **Principle** — established product doctrine
- **Existing product** — already designed or implemented
- **Hypothesis** — current product/design proposition
- **Backlog** — exploratory idea
- **Aspirational** — long-horizon possibility

An idea does not become architecture merely because we have thought of it.

## Working standard

The barber should not experience this framework. They should experience its result:

**I know what matters. I can act immediately. The app keeps up with me. I get my business done.**
