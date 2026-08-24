#!/usr/bin/env python3
import json
import os
import subprocess
import threading
import time
import urllib.request
from vosk import Model, KaldiRecognizer

MODEL_PATH = "/home/john/vosk-model"
AUDIO_DEVICE = "plughw:2,0"
SAMPLE_RATE = 16000
REMOTE_BASE = "http://127.0.0.1:8765"
WAKE_WORD = "atlas"
DEMO_URL = os.environ.get(
    "PORTFOLIO_DEMO_URL",
    "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov",
)
ANTHEM_URL = os.environ.get(
    "PORTFOLIO_ANTHEM_URL",
    "https://pub-8150ade24f1a45dfa4e16936ba894a95.r2.dev/Heavy-Intro.mp3",
)
DISPLAY_ENV = {
    "DISPLAY": ":0",
    "XDG_RUNTIME_DIR": "/run/user/1000",
    "WAYLAND_DISPLAY": "wayland-0",
}
COMMANDS = [
    "next", "back", "top", "bottom", "home", "screensaver", "cancel",
    "work", "career", "barber-game", "playground", "about", "demo", "exit",
    "anthem", "stop"
]
PHRASES = [
    WAKE_WORD,
    "next", "back", "top", "bottom", "home", "cancel",
    "screensaver", "screen saver", "start screensaver", "start screen saver", "sleep", "rest",
    "work", "selected work",
    "career",
    "barber game", "the barber game",
    "playground",
    "about", "about me",
    "demo", "play demo", "start demo",
    "exit", "stop demo", "close demo",
    "anthem", "play anthem", "start anthem",
    "stop", "stop anthem", "stop music",
    "[unk]",
]
LISTEN_SECONDS = 5.0
COOLDOWN_SECONDS = 0.7
WAKE_DEBOUNCE_SECONDS = 1.0
DEMO_START_VOLUME = 65
DEMO_DUCK_STEPS = 5
_demo_process = None
_demo_lock = threading.Lock()
_duck_restore_timer = None
_anthem_process = None
_anthem_lock = threading.Lock()


def post_json(path, payload=None):
    body = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(
        f"{REMOTE_BASE}{path}",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Content-Length": str(len(body))},
    )
    with urllib.request.urlopen(req, timeout=3) as response:
        result = json.loads(response.read().decode("utf-8"))
    if not result.get("ok"):
        raise RuntimeError(result.get("message", "Request failed"))
    return result


def send_action(command):
    return post_json(f"/api/{command}")


def feedback(label, detail="", duration=2100):
    try:
        post_json("/api/feedback", {"label": label, "detail": detail, "duration": duration})
    except Exception as exc:
        print(f"FEEDBACK ERROR: {exc}", flush=True)


def finish_feedback():
    feedback("Demo", "Closed", 450)


def demo_running():
    with _demo_lock:
        proc = _demo_process
    return bool(proc and proc.poll() is None)


def anthem_running():
    with _anthem_lock:
        proc = _anthem_process
    return bool(proc and proc.poll() is None)


def send_player_key(key, presses=1):
    if not demo_running():
        return
    env = os.environ.copy()
    env.update(DISPLAY_ENV)
    for _ in range(presses):
        subprocess.run(
            ["/usr/bin/wtype", "-k", key],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            env=env,
        )
        time.sleep(0.035)


def restore_demo_audio():
    global _duck_restore_timer
    _duck_restore_timer = None
    if not demo_running():
        return
    send_player_key("0", DEMO_DUCK_STEPS)
    print("DEMO AUDIO: restored", flush=True)


def duck_demo_audio():
    global _duck_restore_timer
    if not demo_running():
        return
    if _duck_restore_timer:
        _duck_restore_timer.cancel()
    send_player_key("9", DEMO_DUCK_STEPS)
    print("DEMO AUDIO: ducked", flush=True)
    _duck_restore_timer = threading.Timer(LISTEN_SECONDS + 0.5, restore_demo_audio)
    _duck_restore_timer.daemon = True
    _duck_restore_timer.start()


def normalized_command(text):
    text = " ".join(text.strip().lower().split())
    aliases = {
        "screen saver": "screensaver",
        "start screensaver": "screensaver",
        "start screen saver": "screensaver",
        "sleep": "screensaver",
        "rest": "screensaver",
        "selected work": "work",
        "barber game": "barber-game",
        "the barber game": "barber-game",
        "about me": "about",
        "play demo": "demo",
        "start demo": "demo",
        "stop demo": "exit",
        "close demo": "exit",
        "play anthem": "anthem",
        "start anthem": "anthem",
        "stop anthem": "stop",
        "stop music": "stop",
    }
    if text in aliases:
        return aliases[text]
    return text if text in COMMANDS else None


def watch_demo(proc):
    global _demo_process, _duck_restore_timer
    proc.wait()
    with _demo_lock:
        if _demo_process is proc:
            _demo_process = None
    if _duck_restore_timer:
        _duck_restore_timer.cancel()
        _duck_restore_timer = None
    finish_feedback()
    print(f"DEMO END: {proc.returncode}", flush=True)


def stop_demo():
    global _demo_process
    with _demo_lock:
        proc = _demo_process
    if not proc or proc.poll() is not None:
        with _demo_lock:
            if _demo_process is proc:
                _demo_process = None
        return False
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=2)
    return True


def start_demo():
    global _demo_process
    stop_demo()
    stop_anthem()
    env = os.environ.copy()
    env.update(DISPLAY_ENV)
    feedback("Demo", "Starting…", 1200)
    proc = subprocess.Popen(
        [
            "/usr/bin/ffplay",
            "-hide_banner",
            "-loglevel", "warning",
            "-fs",
            "-autoexit",
            "-volume", str(DEMO_START_VOLUME),
            DEMO_URL,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    with _demo_lock:
        _demo_process = proc
    threading.Thread(target=watch_demo, args=(proc,), daemon=True).start()
    print(f"DEMO START: {proc.pid} {DEMO_URL} volume={DEMO_START_VOLUME}", flush=True)


def watch_anthem(proc):
    global _anthem_process
    proc.wait()
    with _anthem_lock:
        if _anthem_process is proc:
            _anthem_process = None
    feedback("Anthem", "Finished", 700)
    print(f"ANTHEM END: {proc.returncode}", flush=True)


def stop_anthem():
    global _anthem_process
    with _anthem_lock:
        proc = _anthem_process
    if not proc or proc.poll() is not None:
        with _anthem_lock:
            if _anthem_process is proc:
                _anthem_process = None
        return False
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=2)
    return True


def start_anthem():
    global _anthem_process
    stop_anthem()
    env = os.environ.copy()
    env.update(DISPLAY_ENV)
    feedback("Anthem", "Playing", 1400)
    proc = subprocess.Popen(
        [
            "/usr/bin/ffplay",
            "-hide_banner",
            "-loglevel", "warning",
            "-nodisp",
            "-autoexit",
            ANTHEM_URL,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    with _anthem_lock:
        _anthem_process = proc
    threading.Thread(target=watch_anthem, args=(proc,), daemon=True).start()
    print(f"ANTHEM START: {proc.pid} {ANTHEM_URL}", flush=True)


def execute(command, last_action):
    if command == "cancel":
        feedback("Atlas", "Cancelled")
        print("CANCEL", flush=True)
        return time.monotonic(), True
    if time.monotonic() - last_action < COOLDOWN_SECONDS:
        return last_action, False
    try:
        if command == "demo":
            start_demo()
        elif command == "exit":
            stopped = stop_demo()
            if not stopped:
                feedback("Demo", "Nothing playing", 1000)
            print("DEMO EXIT" if stopped else "DEMO EXIT: none", flush=True)
        elif command == "anthem":
            start_anthem()
        elif command == "stop":
            stopped = stop_anthem()
            feedback("Anthem", "Stopped" if stopped else "Nothing playing", 800)
            print("ANTHEM STOP" if stopped else "ANTHEM STOP: none", flush=True)
        else:
            send_action(command)
            print(f"ACTION: {command}", flush=True)
        return time.monotonic(), True
    except Exception as exc:
        feedback("Atlas", "Try again")
        print(f"ERROR {command}: {exc}", flush=True)
        return last_action, False


def main():
    print("Loading voice model...")
    model = Model(MODEL_PATH)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE, json.dumps(PHRASES))

    audio = subprocess.Popen([
        "arecord", "-q", "-D", AUDIO_DEVICE, "-f", "S16_LE",
        "-r", str(SAMPLE_RATE), "-c", "1", "-t", "raw"
    ], stdout=subprocess.PIPE)

    print("Atlas ready: navigation + presentation + demo + anthem commands")
    armed_until = 0.0
    last_action = 0.0
    last_wake = 0.0
    last_partial = ""
    last_partial_sent = 0.0

    def arm_atlas(reason="atlas"):
        nonlocal armed_until, last_wake, last_partial
        now = time.monotonic()
        if now - last_wake < WAKE_DEBOUNCE_SECONDS:
            return
        last_wake = now
        armed_until = now + LISTEN_SECONDS
        last_partial = ""
        if demo_running():
            duck_demo_audio()
        feedback("Atlas", "Listening…", int(LISTEN_SECONDS * 1000))
        print(f"WAKE: {reason}", flush=True)

    try:
        while True:
            data = audio.stdout.read(4000)
            if not data:
                break

            if recognizer.AcceptWaveform(data):
                text = json.loads(recognizer.Result()).get("text", "").strip().lower()
                last_partial = ""
                if not text or text == "[unk]":
                    continue

                words = text.split()

                if words and words[0] == WAKE_WORD:
                    remainder = " ".join(words[1:])
                    if not remainder:
                        arm_atlas("atlas final")
                        continue
                    command = normalized_command(remainder)
                    if command:
                        last_action, done = execute(command, last_action)
                        if done:
                            armed_until = 0.0
                        continue

                if time.monotonic() < armed_until:
                    command = normalized_command(text)
                    if command:
                        last_action, done = execute(command, last_action)
                        if done:
                            armed_until = 0.0
                    else:
                        feedback("Atlas", "Try again", 1600)
                        armed_until = time.monotonic() + 3.0
                        print(f"MISHEARD: {text}", flush=True)
                else:
                    print(f"DORMANT: {text}", flush=True)

            else:
                partial = json.loads(recognizer.PartialResult()).get("partial", "").strip().lower()
                now = time.monotonic()

                if now >= armed_until and partial == WAKE_WORD:
                    arm_atlas("atlas partial")
                    continue

                if now < armed_until and partial and partial != last_partial and now - last_partial_sent > 0.35:
                    last_partial = partial
                    last_partial_sent = now
                    if partial != WAKE_WORD:
                        feedback("Atlas", partial, 1200)
                        print(f"PARTIAL: {partial}", flush=True)

    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        stop_anthem()
        stop_demo()
        audio.terminate()
        try:
            audio.wait(timeout=2)
        except subprocess.TimeoutExpired:
            audio.kill()


if __name__ == "__main__":
    main()
