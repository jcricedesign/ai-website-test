# Interlinked Defender — v1.0

**Status:** frozen Level 1 release checkpoint.

This build preserves the Level 1 design and focuses on making the arcade loop robust on `lab-pi` + TCL.

## Level 1
- Full-sector tactical scanner above the playfield
- Defender-style centered camera with directional turn lead
- Arrow keys / gamepad stick or D-pad to move
- Space / gamepad A to fire
- Double-tap Left or Right and hold to boost; 2-second cooldown
- ~60 second patrol
- `MOTHERSHIP ATTEMPTING LANDING`
- Destroy the descending mushroom mothership before touchdown

## v1.0 baseline
- `PRESS SPACE / A TO BEGIN` start state so Chromium audio is unlocked by an intentional player gesture
- Space / A restarts cleanly after win or game over
- Short mothership touchdown impact state before game over
- Player hit invulnerability/flicker retained at 1.25 seconds
- Existing controller dead-zone retained
- Master volume added above music / SFX / voice controls
- Mothership scanner contact now pulses during the landing attempt
- Boost gets dedicated audio feedback and its existing glyph thrust trail
- Fixed 1280×720 internal renderer retained for Raspberry Pi performance
- Existing hard caps on particles and enemy projectiles retained
- Frame delta remains clamped to prevent large simulation jumps

## Audio
Voice files are hosted in the public R2 `sounds/` path:
- `begin-the-swarm.mp3`
- `mothership-descending.mp3`
- `game-over.mp3`

Reserved for later mechanics:
- `new-life.mp3`
- `save-the-humans.mp3`
- `the-humans-are-dying.mp3`

## Scope rule
Do **not** design Level 2 yet. Play Level 1 and let the next ideas emerge from the system.

## media-pi / Micro input edition
This separate copy adds keyboard-mode aliases to the frozen v1.0 baseline.
D-pad: C/D/E/F = up/down/left/right. A: G = start/fire/restart. Plus: O = tuning panel.
These follow previously recorded Micro mappings; verify on the connected controller.
Arrows, Space, Tab and standard gamepad controls remain supported. Double-tap left/right and hold boosts.
Run: python3 -m http.server 8080 --bind 0.0.0.0
Open http://localhost:8080/?v=10micro in Chromium on the Pi. Click the game before pressing A.
Voice clips need internet access.
