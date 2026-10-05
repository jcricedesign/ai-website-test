(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');

  // Spoken opening cue hosted in John's public R2 bucket.
  // Keep audio separate from game state so it can be replaced/tuned independently.
  const AUDIO_BASE = 'https://pub-8150ade24f1a45dfa4e16936ba894a95.r2.dev/sounds/';
  const voices = {
    opening: new Audio(AUDIO_BASE + 'begin-the-swarm.mp3'),
    mothership: new Audio(AUDIO_BASE + 'mothership-descending.mp3'),
    gameOver: new Audio(AUDIO_BASE + 'game-over.mp3')
  };
  Object.values(voices).forEach(a => { a.preload = 'auto'; });
  const openingVoice = voices.opening;
  let voicePlayed = false;
  let voicePending = false;
  let mothershipVoicePlayed = false;
  let gameOverVoicePlayed = false;

  // Lightweight procedural 8-bit audio: no samples, no music file, minimal Pi overhead.
  let audioCtx = null;
  let musicTimer = null;
  let musicStep = 0;
  let audioUnlocked = false;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    audioUnlocked = true;
    if (config.musicEnabled && started && !gameOver && !won) startMusic();
    return audioCtx;
  }

  function synth(freq, duration, type='square', volume=0.05, when=0, slideTo=null) {
    if (!config.sfxEnabled && type !== 'music') return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type === 'music' ? 'square' : type;
    osc.frequency.setValueAtTime(Math.max(25, freq), t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(25, slideTo), t + duration);
    const master = (config.masterVolume / 100) * (type === 'music' ? config.musicVolume / 100 : config.sfxVolume / 100);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * master), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function sfxShoot() { if (config.sfxEnabled) synth(720, 0.055, 'square', 0.045, 0, 1100); }
  function sfxEnemyHit(kill=false) {
    if (!config.sfxEnabled) return;
    synth(kill ? 220 : 360, kill ? 0.13 : 0.055, 'square', kill ? 0.065 : 0.04, 0, kill ? 70 : 240);
    if (kill) synth(110, 0.11, 'sawtooth', 0.035, 0.025, 55);
  }
  function sfxPlayerHit() {
    if (!config.sfxEnabled) return;
    synth(180, 0.22, 'sawtooth', 0.075, 0, 55);
    synth(90, 0.18, 'square', 0.04, 0.03, 45);
  }
  function sfxMotherHit() { if (config.sfxEnabled) synth(150, 0.075, 'square', 0.045, 0, 95); }
  function sfxMotherDestroyed() {
    if (!config.sfxEnabled) return;
    [180,140,105,75,52].forEach((f,i) => synth(f, 0.28, i%2?'square':'sawtooth', 0.07, i*0.045, Math.max(35,f*0.48)));
  }
  function sfxAlert() {
    if (!config.sfxEnabled) return;
    synth(440, 0.13, 'square', 0.05);
    synth(660, 0.13, 'square', 0.05, 0.16);
    synth(440, 0.13, 'square', 0.05, 0.32);
  }

  function sfxBoost() {
    if (!config.sfxEnabled) return;
    synth(180, 0.08, 'square', 0.05, 0, 360);
    synth(360, 0.12, 'square', 0.04, 0.045, 780);
  }

  const bassPattern = [55,55,65.41,55,73.42,65.41,55,49];
  const leadPattern = [440,0,523.25,0,659.25,587.33,523.25,0,440,0,392,440,523.25,0,392,0];
  function musicTick() {
    if (!audioCtx || !config.musicEnabled || paused || gameOver || won) return;
    const frantic = encounter ? 0.72 : 1;
    const stepDur = 0.115 * frantic;
    const bass = bassPattern[musicStep % bassPattern.length];
    const lead = leadPattern[musicStep % leadPattern.length];
    synth(bass, stepDur * 0.72, 'music', 0.028);
    if (lead) synth(lead, stepDur * 0.42, 'music', encounter ? 0.022 : 0.016);
    if (musicStep % 4 === 2) synth(1200, 0.018, 'music', 0.008);
    musicStep++;
  }
  function startMusic() {
    if (musicTimer || !audioUnlocked || !config.musicEnabled) return;
    musicTimer = setInterval(musicTick, 82);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function setVoiceVolumes() {
    const v = clamp((config.masterVolume / 100) * (config.voiceVolume / 100), 0, 1);
    Object.values(voices).forEach(a => a.volume = v);
  }
  function playVoice(name) {
    const a = voices[name];
    if (!a || !config.openingVoice) return;
    setVoiceVolumes();
    for (const [key, other] of Object.entries(voices)) {
      if (key !== name) { try { other.pause(); } catch (_) {} }
    }
    try { a.currentTime = 0; const p = a.play(); if (p?.catch) p.catch(() => {}); } catch (_) {}
  }

  // Fixed internal resolution is the known-good Raspberry Pi performance baseline.
  const LOGICAL_W = 1280;
  const LOGICAL_H = 720;
  const WORLD_W = 4200;
  const PLAY_TOP = 150;
  const SCANNER = { left: 28, right: LOGICAL_W - 28, top: 56, bottom: 132 };
  let scanlinePatternDark = null;
  let scanlinePatternLight = null;
  let frameColorCache = new Map();

  const DEFAULTS = {
    shipSpeed: 300,
    bulletSpeed: 680,
    enemyCount: 8,
    enemySpeed: 90,
    patrolSeconds: 60,
    landingSeconds: 40,
    mothershipHealth: 40,
    colorize: 70,
    scanlines: true,
    invert: false,
    glyphStyle: 'ascii',
    glyphDensity: 2,
    openingVoice: true,
    voiceDelay: 3,
    masterVolume: 85,
    musicEnabled: true,
    musicVolume: 34,
    sfxEnabled: true,
    sfxVolume: 55,
    voiceVolume: 90
  };
  const config = { ...DEFAULTS };

  const palettes = {
    player: [172, 255, 218],
    enemy: [255, 191, 102],
    enemy2: [255, 126, 105],
    mother: [218, 146, 255],
    shot: [240, 248, 244],
    terrain: [104, 133, 116],
    warning: [255, 86, 86],
    ui: [220, 230, 224]
  };

  const glyphSets = {
    ascii: {
      player: [ ['=>'], [' /\\ ', '==[##]>', ' \\/ '], ['   /\\   ', '<=[####]=>', '   \\/   '] ],
      drifter: [ ['<o>'], [' .o. ', '<###>', ' `-` '], [' .-o-. ', '<[###]>', ' `---` '] ],
      shooter: [ ['{+}'], [' [*] ', '<|#|>', ' / \\ '], [' .[*]. ', '<[|#|]>', ' /_|_\\ '] ],
      mother: [ ['(###)'], [' .-====-. ', '<[######]>', '   ||||   '], ['     .-========-.     ', "  .-' ######## '-.  ", ' / ###  ######  ### \\', '<####################>', '      ||||||||      ', '       ||||||       '] ],
      shot: '-', enemyShot: '.', terrain: '_/\\^', debris: '*+x.%#'
    },
    block: {
      player: [ ['▶▓'], [' ▄ ', '◀██▶', ' ▀ '], [' ▄█▄ ', '◀███▶', ' ▀█▀ '] ],
      drifter: [ ['◀▒▶'], [' ▒ ', '◀▓▶', ' ░ '], [' ▒▒ ', '◀▓▓▶', ' ░░ '] ],
      shooter: [ ['■◆■'], [' ▄ ', '█◆█', ' ▀ '], [' ▄█▄ ', '█◆◆█', ' ▀█▀ '] ],
      mother: [ ['▄███▄'], [' ▄███▄ ', '███████', '  ███  '], ['   ▄███████▄   ', ' ▄███████████▄ ', '███████████████', '    █████    ', '     ███     '] ],
      shot: '━', enemyShot: '•', terrain: '░▒▓▀▄', debris: '▓▒░■◆'
    },
    tech: {
      player: [ ['=>]'], [' /\\ ', '=[##]>', ' \\/ '], [' /==\\ ', '<[####]=>', ' \\==/ '] ],
      drifter: [ ['<:>'], [' <:> ', '<[#]>', ' <_> '], [' <:::> ', '<[###]>', ' <___> '] ],
      shooter: [ ['[!]'], [' [!] ', '<|#|>', ' /|\\ '], [' <[!]> ', '[|###|]', ' /_|_\\ '] ],
      mother: [ ['[###]'], [' <====> ', '[######]', '  ||||  '], ['   <==========>   ', ' <[############]> ', '[######||######]', '      ||||||      ', '       ||||       '] ],
      shot: '─', enemyShot: ':', terrain: '_-^~=\\/', debris: '+x%:#'
    },
    noisy: {
      player: [ ['>@#'], [' /%\\ ', '>@##>', ' \\%/ '], [' ?/%\\? ', '<@####@>', ' ?\\%/? '] ],
      drifter: [ ['%?%'], [' ?%? ', '<%@%>', ' .!. '], [' ?%%%? ', '<%@@@%>', ' .!!!. '] ],
      shooter: [ ['&!&'], [' &!& ', '<#@#>', ' /!\\ '], [' %&!&% ', '<#@@@#>', ' /!!!\\ '] ],
      mother: [ ['<%@%>'], [' .%@%. ', '<#&&&#>', '  !|!  '], ['    .%%@@%%.    ', ' .%@&&&&&&@%. ', '<#&&@@##@@&&#>', '    !!||||!!    ', '      !||!      '] ],
      shot: '=', enemyShot: '*', terrain: '_~^%/\\', debris: '@%!?x#'
    }
  };

  const keys = new Set();
  const GAMEPAD_DEADZONE = 0.28;
  const CAMERA_TURN_SHIFT = 150;
  const CAMERA_TURN_SETTLE = 3.2;
  const BOOST_DOUBLE_TAP_MS = 360;
  const BOOST_DURATION = 2.0;
  const BOOST_COOLDOWN = 2.0;
  const BOOST_MULTIPLIER = 1.9;
  let last = performance.now();
  let elapsed = 0;
  let paused = false;
  let started = false;
  let gameOver = false;
  let won = false;
  let touchdown = false;
  let touchdownRemaining = 0;
  let warningFlash = 0;
  let encounter = false;
  let landingRemaining = config.landingSeconds;
  let score = 0;
  let shake = 0;
  let cameraX = 0;
  let boostRemaining = 0;
  let boostCooldown = 0;
  let boostDir = 0;
  let lastTapDir = 0;
  let lastTapAt = -Infinity;
  let lastControllerHorizontalIntent = 0;
  let lastControllerA = false;
  let player;
  let bullets = [];
  let enemies = [];
  let enemyBullets = [];
  let particles = [];
  let mother = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sx(worldX) { return worldX - cameraX; }

  function makeScanlinePattern(light = false) {
    const tile = document.createElement('canvas');
    tile.width = 4;
    tile.height = 4;
    const t = tile.getContext('2d');
    t.clearRect(0, 0, 4, 4);
    t.fillStyle = light ? 'rgba(0,0,0,0.028)' : 'rgba(255,255,255,0.038)';
    t.fillRect(0, 0, 4, 1);
    return ctx.createPattern(tile, 'repeat');
  }

  function resize() {
    if (canvas.width !== LOGICAL_W) canvas.width = LOGICAL_W;
    if (canvas.height !== LOGICAL_H) canvas.height = LOGICAL_H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    scanlinePatternDark = makeScanlinePattern(false);
    scanlinePatternLight = makeScanlinePattern(true);
  }
  window.addEventListener('resize', resize);
  resize();

  function W() { return LOGICAL_W; }
  function H() { return LOGICAL_H; }

  function terrainYWorld(worldX) {
    const base = H() * 0.84;
    return base + Math.sin(worldX * 0.008) * 18 + Math.sin(worldX * 0.021) * 8;
  }

  function reset(autoStart = false) {
    elapsed = 0;
    paused = false;
    started = !!autoStart;
    gameOver = false;
    won = false;
    touchdown = false;
    touchdownRemaining = 0;
    warningFlash = 0;
    encounter = false;
    landingRemaining = config.landingSeconds;
    score = 0;
    shake = 0;
    player = { worldX: WORLD_W * 0.22, y: H() * 0.48, w: 58, h: 38, hp: 3, fireCooldown: 0, invuln: 0, facing: 1, cameraLead: 0 };
    cameraX = clamp(player.worldX - W() * 0.5, 0, WORLD_W - W());
    boostRemaining = 0;
    boostCooldown = 0;
    boostDir = 0;
    lastTapDir = 0;
    lastTapAt = -Infinity;
    lastControllerHorizontalIntent = 0;
    lastControllerA = false;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    mother = null;
    voicePlayed = false;
    voicePending = false;
    mothershipVoicePlayed = false;
    gameOverVoicePlayed = false;
    for (const a of Object.values(voices)) { try { a.pause(); a.currentTime = 0; } catch (_) {} }
    setVoiceVolumes();
    overlay.classList.add('hidden');
    populateEnemies();
  }

  function startGame() {
    if (started && !gameOver && !won) return;
    ensureAudio();
    if (gameOver || won) {
      reset(true);
    } else {
      started = true;
      elapsed = 0;
      if (config.musicEnabled) startMusic();
    }
  }

  function spawnEnemy(type = Math.random() < 0.62 ? 'drifter' : 'shooter', worldX = null) {
    const x = worldX ?? (80 + Math.random() * (WORLD_W - 160));
    const y = PLAY_TOP + 50 + Math.random() * Math.max(120, H() * 0.48);
    const dir = Math.random() < 0.5 ? -1 : 1;
    enemies.push({
      type, worldX: x, y, w: 48, h: 34,
      vx: dir * (config.enemySpeed * (0.55 + Math.random() * 0.55)),
      phase: Math.random() * Math.PI * 2,
      fire: 0.6 + Math.random() * 2.0,
      hp: type === 'shooter' ? 2 : 1
    });
  }

  function populateEnemies() {
    enemies.length = 0;
    // Spread contacts across the whole sector so the scanner gives the player places to travel toward.
    const count = Math.max(1, Math.round(config.enemyCount));
    for (let i = 0; i < count; i++) {
      const band = (i + 0.5) / count;
      const jitter = (Math.random() - 0.5) * (WORLD_W / count) * 0.75;
      spawnEnemy(undefined, clamp(band * WORLD_W + jitter, 100, WORLD_W - 100));
    }
  }

  function syncEnemyCount() {
    const target = Math.max(1, Math.round(config.enemyCount));
    while (enemies.length < target) spawnEnemy();
    if (enemies.length > target) enemies.length = target;
  }

  function spawnMother() {
    encounter = true;
    landingRemaining = config.landingSeconds;
    const startY = PLAY_TOP + 22;
    // Put the threat somewhere the player may have to travel to, not simply in the current viewport.
    const targetWorldX = player.worldX < WORLD_W * 0.5 ? WORLD_W * 0.78 : WORLD_W * 0.22;
    mother = {
      worldX: targetWorldX,
      y: startY,
      startY,
      targetY: terrainYWorld(targetWorldX) - 54,
      w: 210,
      h: 122,
      hp: config.mothershipHealth,
      maxHp: config.mothershipHealth,
      fire: 1.4
    };
    warningFlash = 3.0;
    if (!mothershipVoicePlayed) {
      mothershipVoicePlayed = true;
      playVoice('mothership');
      sfxAlert();
    }
  }

  function color(name, alpha = 1) {
    const key = `${name}|${alpha}|${config.colorize}|${config.invert ? 1 : 0}`;
    const cached = frameColorCache.get(key);
    if (cached) return cached;
    const rgb = palettes[name];
    const base = config.invert ? [12, 14, 13] : [238, 244, 240];
    const t = config.colorize / 100;
    const r = Math.round(base[0] + (rgb[0] - base[0]) * t);
    const g = Math.round(base[1] + (rgb[1] - base[1]) * t);
    const b = Math.round(base[2] + (rgb[2] - base[2]) * t);
    const value = `rgba(${r},${g},${b},${alpha})`;
    frameColorCache.set(key, value);
    return value;
  }

  function entityX(e) { return e.worldX ?? e.x ?? 0; }
  function collide(a, b) {
    return Math.abs(entityX(a) - entityX(b)) < (a.w + b.w) * 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) * 0.5;
  }

  function firePlayer() {
    if (player.fireCooldown > 0) return;
    const glyph = glyphSets[config.glyphStyle].shot;
    const dir = player.facing || 1;
    bullets.push({ worldX: player.worldX + dir * 28, y: player.y, vx: config.bulletSpeed * dir, w: 16, h: 8, glyph });
    sfxShoot();
    player.fireCooldown = 0.14;
  }

  function fireEnemy(e) {
    if (enemyBullets.length >= 80) return;
    const ex = entityX(e);
    const dx = player.worldX - ex;
    const dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 180;
    enemyBullets.push({ worldX: ex - 10, y: e.y, vx: dx / len * speed, vy: dy / len * speed, w: 8, h: 8 });
  }

  function burst(worldX, y, count = 14, charset = glyphSets[config.glyphStyle].debris) {
    const available = Math.max(0, 140 - particles.length);
    count = Math.min(count, available);
    for (let i = 0; i < count; i++) {
      particles.push({
        worldX, y,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 220,
        life: 0.5 + Math.random() * 0.9,
        ch: charset[Math.floor(Math.random() * charset.length)] || '*',
        tone: 'shot'
      });
    }
  }

  function playOpeningVoice() {
    if (!config.openingVoice || voicePlayed) return;
    voicePlayed = true;
    voicePending = false;
    try {
      setVoiceVolumes();
      openingVoice.currentTime = 0;
      const result = openingVoice.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          // Chromium may block unmuted autoplay until a keyboard/pointer gesture.
          voicePlayed = false;
          voicePending = true;
        });
      }
    } catch (_) {
      voicePlayed = false;
      voicePending = true;
    }
  }

  function retryPendingVoiceFromGesture() {
    if (!voicePending || !config.openingVoice || elapsed < config.voiceDelay) return;
    playOpeningVoice();
  }

  function registerHorizontalTap(dir) {
    if (!dir || gameOver || won || paused) return;
    const now = performance.now();
    const isDoubleTap = dir === lastTapDir && (now - lastTapAt) <= BOOST_DOUBLE_TAP_MS;
    if (isDoubleTap && boostCooldown <= 0 && boostRemaining <= 0) {
      boostDir = dir;
      boostRemaining = BOOST_DURATION;
      lastTapDir = 0;
      lastTapAt = -Infinity;
      sfxBoost();
      return;
    }
    lastTapDir = dir;
    lastTapAt = now;
  }

  function endBoost() {
    if (boostRemaining > 0) boostCooldown = BOOST_COOLDOWN;
    boostRemaining = 0;
    boostDir = 0;
  }

  function pollGamepadStart() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let aPressed = false;
    for (const pad of pads) {
      if (pad && pad.buttons?.[0]?.pressed) { aPressed = true; break; }
    }
    if (aPressed && !lastControllerA && (!started || gameOver || won)) startGame();
    lastControllerA = aPressed;
  }

  function update(dt) {
    pollGamepadStart();
    if (paused || gameOver || won) return;
    if (!started) return;

    if (touchdown) {
      touchdownRemaining -= dt;
      shake = Math.max(shake, 4);
      if (touchdownRemaining <= 0) {
        touchdown = false;
        gameOver = true;
        stopMusic();
        if (!gameOverVoicePlayed) { gameOverVoicePlayed = true; playVoice('gameOver'); }
      }
      return;
    }

    elapsed += dt;
    warningFlash = Math.max(0, warningFlash - dt);
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.invuln = Math.max(0, player.invuln - dt);

    if (config.openingVoice && !voicePlayed && elapsed >= config.voiceDelay) playOpeningVoice();

    let dx = 0;
    let dy = 0;
    if (keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('ArrowRight')) dx += 1;
    if (keys.has('ArrowUp')) dy -= 1;
    if (keys.has('ArrowDown')) dy += 1;

    let controllerFire = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const axisX = Math.abs(pad.axes?.[0] || 0) >= GAMEPAD_DEADZONE ? pad.axes[0] : 0;
      const axisY = Math.abs(pad.axes?.[1] || 0) >= GAMEPAD_DEADZONE ? pad.axes[1] : 0;
      const dpadLeft = !!pad.buttons?.[14]?.pressed;
      const dpadRight = !!pad.buttons?.[15]?.pressed;
      const dpadUp = !!pad.buttons?.[12]?.pressed;
      const dpadDown = !!pad.buttons?.[13]?.pressed;
      if (dpadLeft) dx -= 1;
      if (dpadRight) dx += 1;
      if (dpadUp) dy -= 1;
      if (dpadDown) dy += 1;
      dx += axisX;
      dy += axisY;
      controllerFire = controllerFire || !!pad.buttons?.[0]?.pressed;
    }

    lastControllerA = controllerFire;

    dx = clamp(dx, -1, 1);
    dy = clamp(dy, -1, 1);

    // Controller double-tap detection uses the horizontal direction edge, so
    // right → release → right-and-hold behaves like the keyboard gesture.
    const controllerIntent = Math.abs(dx) > 0.45 && !keys.has('ArrowLeft') && !keys.has('ArrowRight') ? Math.sign(dx) : 0;
    if (controllerIntent && controllerIntent !== lastControllerHorizontalIntent) registerHorizontalTap(controllerIntent);
    lastControllerHorizontalIntent = controllerIntent;

    // Defender-style horizontal camera: the ship normally stays centered.
    // A direction reversal briefly opens extra view in the new direction, then eases home.
    const horizontalIntent = Math.abs(dx) > 0.08 ? Math.sign(dx) : 0;
    if (horizontalIntent && horizontalIntent !== player.facing) {
      player.facing = horizontalIntent;
      player.cameraLead = player.facing * CAMERA_TURN_SHIFT;
    }

    boostCooldown = Math.max(0, boostCooldown - dt);
    let speedMultiplier = 1;
    if (boostRemaining > 0) {
      if (horizontalIntent === boostDir) {
        speedMultiplier = BOOST_MULTIPLIER;
        boostRemaining = Math.max(0, boostRemaining - dt);
        if (boostRemaining <= 0) { boostCooldown = BOOST_COOLDOWN; boostDir = 0; }
      } else {
        endBoost();
      }
    }

    player.worldX = clamp(player.worldX + dx * config.shipSpeed * speedMultiplier * dt, 36, WORLD_W - 36);
    player.y += dy * config.shipSpeed * 0.72 * dt;
    player.y = clamp(player.y, PLAY_TOP + 38, terrainYWorld(player.worldX) - 42);

    // Exponential ease keeps the turn shift quick but lets the ship settle smoothly to center.
    player.cameraLead *= Math.exp(-CAMERA_TURN_SETTLE * dt);
    if (Math.abs(player.cameraLead) < 0.35) player.cameraLead = 0;
    const desiredCameraX = player.worldX - W() * 0.5 + player.cameraLead;
    const cameraEase = 1 - Math.exp(-10 * dt);
    cameraX += (clamp(desiredCameraX, 0, WORLD_W - W()) - cameraX) * cameraEase;

    if (started && (keys.has(' ') || controllerFire)) firePlayer();

    if (!encounter && elapsed >= config.patrolSeconds) spawnMother();
    if (encounter && mother) {
      landingRemaining -= dt;
      const progress = 1 - Math.max(0, landingRemaining) / config.landingSeconds;
      mother.y = mother.startY + (mother.targetY - mother.startY) * progress;
      mother.fire -= dt;
      if (mother.fire <= 0) {
        fireEnemy(mother);
        mother.fire = 1.0 + Math.random() * 1.1;
      }
      if (landingRemaining <= 0) {
        landingRemaining = 0;
        mother.y = mother.targetY;
        touchdown = true;
        touchdownRemaining = 0.9;
        warningFlash = 0;
        burst(mother.worldX, mother.y + 20, 70);
        shake = 18;
        sfxPlayerHit();
      }
    }

    for (const e of enemies) {
      e.worldX += e.vx * dt;
      e.y += Math.sin(elapsed * 2 + e.phase) * 18 * dt;
      if (e.worldX < 40) { e.worldX = 40; e.vx = Math.abs(e.vx); }
      if (e.worldX > WORLD_W - 40) { e.worldX = WORLD_W - 40; e.vx = -Math.abs(e.vx); }
      e.y = clamp(e.y, PLAY_TOP + 35, terrainYWorld(e.worldX) - 54);
      e.fire -= dt;
      if (e.type === 'shooter' && e.fire <= 0 && Math.abs(e.worldX - player.worldX) < W() * 0.9) {
        fireEnemy(e);
        e.fire = 1.4 + Math.random() * 1.8;
      }
    }

    for (const b of bullets) b.worldX += b.vx * dt;
    for (const b of enemyBullets) { b.worldX += b.vx * dt; b.y += b.vy * dt; }

    for (const b of bullets) {
      if (b.dead) continue;
      for (const e of enemies) {
        if (e.dead) continue;
        if (collide(b, e)) {
          b.dead = true;
          e.hp -= 1;
          burst(e.worldX, e.y, 8);
          if (e.hp <= 0) { e.dead = true; score += e.type === 'shooter' ? 150 : 100; sfxEnemyHit(true); }
          else sfxEnemyHit(false);
          break;
        }
      }
      if (!b.dead && mother && collide(b, mother)) {
        b.dead = true;
        mother.hp -= 1;
        burst(b.worldX, b.y, 4);
        shake = Math.min(12, shake + 1.6);
        sfxMotherHit();
        if (mother.hp <= 0) {
          score += 2000;
          burst(mother.worldX, mother.y, 90);
          sfxMotherDestroyed();
          mother = null;
          won = true;
          stopMusic();
        }
      }
    }

    if (player.invuln <= 0) {
      for (const b of enemyBullets) {
        if (!b.dead && collide(player, b)) {
          b.dead = true;
          player.hp -= 1;
          player.invuln = 1.25;
          burst(player.worldX, player.y, 18);
          shake = 10;
          sfxPlayerHit();
          if (player.hp <= 0) {
            gameOver = true;
            stopMusic();
            if (!gameOverVoicePlayed) { gameOverVoicePlayed = true; playVoice('gameOver'); }
          }
          break;
        }
      }
    }

    bullets = bullets.filter(b => !b.dead && b.worldX > -100 && b.worldX < WORLD_W + 100);
    enemyBullets = enemyBullets.filter(b => !b.dead && b.worldX > -100 && b.worldX < WORLD_W + 100 && b.y > PLAY_TOP - 60 && b.y < H() + 50);
    enemies = enemies.filter(e => !e.dead);

    for (const p of particles) {
      p.worldX += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
    shake *= Math.pow(0.06, dt);
  }

  let lastFont = '';
  let lastFill = '';
  let lastAlign = '';
  function drawText(text, x, y, size, fill, align = 'left', alpha = 1) {
    const font = `${size}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    if (font !== lastFont) { ctx.font = font; lastFont = font; }
    if (fill !== lastFill) { ctx.fillStyle = fill; lastFill = fill; }
    if (align !== lastAlign) { ctx.textAlign = align; lastAlign = align; }
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillText(text, x, y);
    if (alpha !== 1) ctx.globalAlpha = 1;
  }

  function spriteLines(kind) {
    const set = glyphSets[config.glyphStyle];
    const variants = set[kind];
    if (!Array.isArray(variants)) return [String(variants ?? '')];
    const density = clamp(Math.round(config.glyphDensity), 1, 3) - 1;
    return variants[density] || variants[variants.length - 1];
  }

  function drawGlyphSprite(kind, x, y, size, fill, alpha = 1, flipX = false) {
    const lines = spriteLines(kind);
    const lineGap = size * 0.72;
    const top = y - ((lines.length - 1) * lineGap) / 2;
    if (flipX) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      for (let i = 0; i < lines.length; i++) drawText(lines[i], 0, top + i * lineGap, size, fill, 'center', alpha);
      ctx.restore();
    } else {
      for (let i = 0; i < lines.length; i++) drawText(lines[i], x, top + i * lineGap, size, fill, 'center', alpha);
    }
  }

  function drawTerrain() {
    const set = glyphSets[config.glyphStyle].terrain;
    const step = config.glyphDensity === 3 ? 20 : config.glyphDensity === 2 ? 28 : 38;
    const rows = config.glyphDensity === 3 ? 3 : config.glyphDensity === 2 ? 2 : 1;
    const startWorld = Math.floor(cameraX / step) * step - step;
    const endWorld = cameraX + W() + step;

    for (let wx = startWorld; wx < endWorld; wx += step) {
      const x = sx(wx);
      const y = terrainYWorld(wx);
      const idx = Math.abs(Math.floor(wx / step));
      const ridge = (Math.sin(wx * 0.014) + 1) * 0.5;
      const localRows = Math.max(1, rows + (ridge > 0.72 ? 1 : 0) - (ridge < 0.22 ? 1 : 0));
      for (let row = 0; row < localRows; row++) {
        const ch = set[(idx + row * 2 + (idx % 3)) % set.length] || '_';
        const a = row === 0 ? 0.9 : Math.max(0.18, 0.48 - row * 0.1);
        const jitterY = row === 0 ? 0 : ((idx + row) % 2 ? 2 : -2);
        drawText(ch, x, y + row * 13 + jitterY, row === 0 ? 19 : 17, color('terrain', a), 'center');
      }
    }
  }

  function drawMother(m) {
    const hpRatio = m.hp / m.maxHp;
    const flicker = hpRatio < 0.55 && Math.floor(performance.now() / 90) % 2 === 0;
    const alpha = flicker ? 0.55 : 1;
    drawGlyphSprite('mother', sx(m.worldX), m.y, config.glyphDensity === 3 ? 20 : 23, color('mother'), alpha);

    if (hpRatio < 0.72) {
      const scars = Math.ceil((1 - hpRatio) * 9);
      const debris = glyphSets[config.glyphStyle].debris;
      for (let i = 0; i < scars; i++) {
        const ox = ((i * 37) % 130) - 65;
        const oy = ((i * 23) % 76) - 38;
        const ch = debris[(i * 3) % debris.length] || 'x';
        drawText(ch, sx(m.worldX) + ox, m.y + oy, 18, color('warning', 0.8), 'center');
      }
    }
  }

  function scannerX(worldX) {
    return SCANNER.left + (worldX / WORLD_W) * (SCANNER.right - SCANNER.left);
  }

  function drawScanner() {
    const width = SCANNER.right - SCANNER.left;
    const height = SCANNER.bottom - SCANNER.top;
    const line = color('terrain', 0.5);
    const muted = color('ui', 0.30);

    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.strokeRect(SCANNER.left, SCANNER.top, width, height);

    // Ground / landing baseline.
    ctx.strokeStyle = line;
    ctx.beginPath();
    ctx.moveTo(SCANNER.left, SCANNER.bottom - 10);
    ctx.lineTo(SCANNER.right, SCANNER.bottom - 10);
    ctx.stroke();

    // Current visible world window.
    const viewX = scannerX(cameraX);
    const viewW = (W() / WORLD_W) * width;
    ctx.strokeStyle = color('player', 0.42);
    ctx.strokeRect(viewX, SCANNER.top + 4, viewW, height - 8);

    // Enemy contacts are deliberately abstract: location and concentration, not miniature sprites.
    for (const e of enemies) {
      const x = scannerX(e.worldX);
      const y = SCANNER.top + 22 + ((e.y - PLAY_TOP) / Math.max(1, (H() * 0.72 - PLAY_TOP))) * (height - 40);
      ctx.fillStyle = color(e.type === 'shooter' ? 'enemy2' : 'warning', 0.88);
      ctx.beginPath();
      ctx.arc(x, clamp(y, SCANNER.top + 14, SCANNER.bottom - 18), e.type === 'shooter' ? 3.2 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player marker.
    const px = scannerX(player.worldX);
    const py = SCANNER.top + height * 0.5;
    ctx.fillStyle = color('player');
    ctx.beginPath();
    const dir = player.facing || 1;
    ctx.moveTo(px + dir * 7, py);
    ctx.lineTo(px - dir * 5, py - 5);
    ctx.lineTo(px - dir * 5, py + 5);
    ctx.closePath();
    ctx.fill();

    // Mothership marker also communicates descent state.
    if (mother) {
      const mx = scannerX(mother.worldX);
      const progress = 1 - clamp(landingRemaining / Math.max(0.001, config.landingSeconds), 0, 1);
      const my = SCANNER.top + 14 + progress * (height - 28);
      const pulse = 1 + 0.22 * (0.5 + 0.5 * Math.sin(performance.now() * 0.012));
      ctx.fillStyle = color('mother');
      ctx.beginPath();
      ctx.ellipse(mx, my, 12 * pulse, 4 * pulse, 0, 0, Math.PI * 2);
      ctx.ellipse(mx, my + 5, 7 * pulse, 3 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      if (encounter) {
        ctx.strokeStyle = color('warning', 0.55 + 0.25 * Math.sin(performance.now() * 0.018));
        ctx.beginPath();
        ctx.arc(mx, my, 18 + 4 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawText('SECTOR SCAN', SCANNER.left + 8, SCANNER.top + 11, 10, color('ui', 0.55));
  }

  function draw() {
    frameColorCache.clear();
    const bg = config.invert ? '#edf1ee' : '#050708';
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    lastFill = bg;
    ctx.fillRect(0, 0, W(), H());

    drawText(`SCORE ${String(score).padStart(6,'0')}`, 24, 26, 16, color('ui'));
    drawText(`LIVES ${player.hp}`, 210, 26, 16, color('ui'));
    drawText('SECTOR 01', W() - 24, 26, 16, color('ui'), 'right');
    if (boostRemaining > 0) {
      drawText(`BOOST ${boostRemaining.toFixed(1)}s`, W() - 24, 46, 11, color('player', 0.9), 'right');
    } else if (boostCooldown > 0) {
      drawText(`BOOST ${boostCooldown.toFixed(1)}s`, W() - 24, 46, 10, color('ui', 0.42), 'right');
    }

    if (!encounter) {
      drawText('PATROL', W() / 2, 26, 14, color('terrain'), 'center');
    } else if (mother) {
      drawText(`LANDING IN ${Math.max(0, Math.ceil(landingRemaining)).toString().padStart(2,'0')}`, W() / 2, 26, 16, color('warning'), 'center');
    }

    drawScanner();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, PLAY_TOP - 4, W(), H() - PLAY_TOP + 4);
    ctx.clip();
    if (shake > 0.1) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawTerrain();

    const gs = glyphSets[config.glyphStyle];
    const blink = player.invuln > 0 && Math.floor(performance.now() / 80) % 2 === 0;
    if (!blink) drawGlyphSprite('player', sx(player.worldX), player.y, 20, color('player'), 1, player.facing < 0);
    if (boostRemaining > 0) {
      const px = sx(player.worldX);
      const dir = player.facing || 1;
      const tailX = px - dir * 54;
      drawText(dir > 0 ? '==>' : '<==', tailX, player.y - 7, 16, color('player', 0.82), 'center');
      drawText(dir > 0 ? '-->' : '<--', tailX - dir * 26, player.y + 9, 13, color('player', 0.5), 'center');
    }

    for (const e of enemies) {
      const ex = sx(e.worldX);
      if (ex < -100 || ex > W() + 100) continue;
      drawGlyphSprite(e.type === 'drifter' ? 'drifter' : 'shooter', ex, e.y, e.type === 'drifter' ? 19 : 20, color(e.type === 'drifter' ? 'enemy' : 'enemy2'));
    }
    for (const b of bullets) {
      const bx = sx(b.worldX);
      if (bx > -40 && bx < W() + 40) drawText(b.glyph, bx, b.y, 22, color('shot'), 'center');
    }
    for (const b of enemyBullets) {
      const bx = sx(b.worldX);
      if (bx > -40 && bx < W() + 40) drawText(gs.enemyShot, bx, b.y, 20, color('enemy2'), 'center');
    }
    for (const p of particles) {
      const px = sx(p.worldX);
      if (px > -80 && px < W() + 80) drawText(p.ch, px, p.y, 18, color(p.tone || 'shot', Math.min(1, p.life)), 'center');
    }
    if (mother) {
      const mx = sx(mother.worldX);
      if (mx > -180 && mx < W() + 180) drawMother(mother);
    }

    ctx.restore();

    if (mother) {
      const ratio = mother.hp / mother.maxHp;
      ctx.strokeStyle = color('mother');
      ctx.strokeRect(W()/2 - 120, 140, 240, 7);
      ctx.fillStyle = color('mother');
      ctx.fillRect(W()/2 - 118, 142, 236 * Math.max(0, ratio), 3);
    }

    if (warningFlash > 0) {
      const a = 0.55 + Math.sin(performance.now() * 0.02) * 0.25;
      drawText('MOTHERSHIP ATTEMPTING LANDING', W() / 2, H() * 0.34, 38, color('warning'), 'center', a);
      drawText('INTERCEPT BEFORE TOUCHDOWN', W() / 2, H() * 0.385, 16, color('warning', 0.85), 'center', a);
    }

    if (!started) {
      drawText('INTERLINKED DEFENDER', W()/2, H()/2 - 34, 36, color('player'), 'center');
      drawText('SECTOR 01', W()/2, H()/2 + 6, 16, color('ui', 0.75), 'center');
      drawText('PRESS SPACE / A TO BEGIN', W()/2, H()/2 + 48, 18, color('ui'), 'center');
    } else if (touchdown) {
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.035);
      drawText('MOTHERSHIP TOUCHDOWN', W()/2, H()/2 - 8, 42, color('warning'), 'center', pulse);
      drawText('SECTOR LOST', W()/2, H()/2 + 38, 16, color('warning', 0.85), 'center');
    } else if (won) {
      drawText('SECTOR SECURED', W()/2, H()/2 - 8, Math.max(28, Math.min(46, W()/28)), color('player'), 'center');
      drawText('PRESS SPACE / A TO RESTART', W()/2, H()/2 + 36, 16, color('ui'), 'center');
    } else if (gameOver) {
      drawText(mother ? 'MOTHERSHIP LANDED' : 'SHIP DESTROYED', W()/2, H()/2 - 8, Math.max(28, Math.min(46, W()/28)), color('warning'), 'center');
      drawText('PRESS SPACE / A TO RESTART', W()/2, H()/2 + 36, 16, color('ui'), 'center');
    }

    if (config.scanlines) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = config.invert ? scanlinePatternLight : scanlinePatternDark;
      ctx.fillRect(0, 0, W(), H());
      lastFill = '';
    }
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function togglePanel(force) {
    const next = typeof force === 'boolean' ? force : overlay.classList.contains('hidden');
    paused = next;
    overlay.classList.toggle('hidden', !next);
    if (paused) stopMusic(); else if (config.musicEnabled) startMusic();
  }

  function handleKey(e, down) {
    const rawKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // 8BitDo Micro keyboard-mode aliases; preserve native keyboard/gamepad input.
    const microKeys = { c: 'ArrowUp', d: 'ArrowDown', e: 'ArrowLeft', f: 'ArrowRight', g: ' ', o: 'Tab' };
    const key = microKeys[rawKey] || rawKey;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(key)) e.preventDefault();

    if (down) {
      ensureAudio(); retryPendingVoiceFromGesture();
      if (!e.repeat && key === ' ') {
        if (!started || gameOver || won) {
          startGame();
          keys.delete(' ');
          return;
        }
      }
      if (!e.repeat && key === 'ArrowLeft') registerHorizontalTap(-1);
      if (!e.repeat && key === 'ArrowRight') registerHorizontalTap(1);
    }

    if (key === 'Tab') { e.preventDefault(); if (down && !e.repeat) { keys.clear(); togglePanel(); } return; }
    if (down && key === 'r') { reset(false); return; }
    if (!overlay.classList.contains('hidden')) return;
    if (down) keys.add(key); else keys.delete(key);
  }
  window.addEventListener('keydown', e => handleKey(e, true));
  window.addEventListener('keyup', e => handleKey(e, false));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pointerdown', () => { ensureAudio(); retryPendingVoiceFromGesture(); }, { passive: true });

  const bindings = [
    ['shipSpeed', 'shipSpeedOut', v => `${v}`],
    ['bulletSpeed', 'bulletSpeedOut', v => `${v}`],
    ['enemyCount', 'enemyCountOut', v => `${v}`],
    ['enemySpeed', 'enemySpeedOut', v => `${v}`],
    ['patrolSeconds', 'patrolSecondsOut', v => `${v}s`],
    ['landingSeconds', 'landingSecondsOut', v => `${v}s`],
    ['mothershipHealth', 'mothershipHealthOut', v => `${v}`],
    ['colorize', 'colorizeOut', v => `${v}%`],
    ['glyphDensity', 'glyphDensityOut', v => ['','LOW','MED','HIGH'][v] || v],
    ['voiceDelay', 'voiceDelayOut', v => `${Number(v).toFixed(1)}s`],
    ['masterVolume', 'masterVolumeOut', v => `${v}%`],
    ['musicVolume', 'musicVolumeOut', v => `${v}%`],
    ['sfxVolume', 'sfxVolumeOut', v => `${v}%`],
    ['voiceVolume', 'voiceVolumeOut', v => `${v}%`]
  ];

  function syncControls() {
    for (const [id, outId, fmt] of bindings) {
      const el = document.getElementById(id);
      const out = document.getElementById(outId);
      el.value = config[id];
      out.textContent = fmt(config[id]);
    }
    document.getElementById('scanlines').checked = config.scanlines;
    document.getElementById('invert').checked = config.invert;
    document.getElementById('glyphStyle').value = config.glyphStyle;
    document.getElementById('openingVoice').checked = config.openingVoice;
    document.getElementById('musicEnabled').checked = config.musicEnabled;
    document.getElementById('sfxEnabled').checked = config.sfxEnabled;
    setVoiceVolumes();
  }

  for (const [id, outId, fmt] of bindings) {
    const el = document.getElementById(id);
    const out = document.getElementById(outId);
    el.addEventListener('input', () => {
      config[id] = Number(el.value);
      out.textContent = fmt(config[id]);
      if (id === 'masterVolume') setVoiceVolumes();
      if (id === 'enemyCount') syncEnemyCount();
      if (id === 'enemySpeed') {
        for (const e of enemies) e.vx = Math.sign(e.vx || 1) * config.enemySpeed * 0.8;
      }
      if (id === 'landingSeconds' && !encounter) landingRemaining = config.landingSeconds;
      if (id === 'mothershipHealth' && mother) {
        const ratio = mother.hp / mother.maxHp;
        mother.maxHp = config.mothershipHealth;
        mother.hp = Math.max(1, Math.round(mother.maxHp * ratio));
      }
    });
  }
  document.getElementById('scanlines').addEventListener('change', e => config.scanlines = e.target.checked);
  document.getElementById('invert').addEventListener('change', e => config.invert = e.target.checked);
  document.getElementById('glyphStyle').addEventListener('change', e => config.glyphStyle = e.target.value);
  document.getElementById('openingVoice').addEventListener('change', e => {
    config.openingVoice = e.target.checked;
    if (!config.openingVoice) { for (const a of Object.values(voices)) { try { a.pause(); } catch (_) {} } voicePending = false; }
  });
  document.getElementById('musicEnabled').addEventListener('change', e => {
    config.musicEnabled = e.target.checked;
    ensureAudio();
    if (config.musicEnabled && !paused && !gameOver && !won) startMusic(); else stopMusic();
  });
  document.getElementById('sfxEnabled').addEventListener('change', e => config.sfxEnabled = e.target.checked);
  document.getElementById('voiceVolume').addEventListener('input', setVoiceVolumes);
  document.getElementById('closePanel').addEventListener('click', () => togglePanel(false));
  document.getElementById('restartLevel').addEventListener('click', () => reset(false));
  document.getElementById('resetDefaults').addEventListener('click', () => {
    Object.assign(config, DEFAULTS);
    syncControls();
    reset(false);
  });

  syncControls();
  reset(false);
  requestAnimationFrame(frame);
})();
