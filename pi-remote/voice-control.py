#!/usr/bin/env python3
import json
import subprocess
import time
import urllib.request
from vosk import Model, KaldiRecognizer

MODEL_PATH = "/home/john/vosk-model"
AUDIO_DEVICE = "plughw:2,0"
SAMPLE_RATE = 16000
REMOTE_BASE = "http://127.0.0.1:8765"
WAKE_WORD = "atlas"
COMMANDS = ["next", "back", "top", "bottom", "home", "screensaver", "cancel"]
PHRASES = [WAKE_WORD, *COMMANDS, "start screensaver", "[unk]"]
LISTEN_SECONDS = 5.0
COOLDOWN_SECONDS = 0.7


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


def normalized_command(text):
    text = text.strip().lower()
    if text == "start screensaver":
        return "screensaver"
    return text if text in COMMANDS else None


def execute(command, last_action):
    if command == "cancel":
        feedback("Atlas", "Cancelled")
        print("CANCEL", flush=True)
        return time.monotonic(), True
    if time.monotonic() - last_action < COOLDOWN_SECONDS:
        return last_action, False
    try:
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

    print("Atlas ready: next, back, top, bottom, home, screensaver, cancel")
    armed_until = 0.0
    last_action = 0.0
    last_partial = ""
    last_partial_sent = 0.0

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
                        armed_until = time.monotonic() + LISTEN_SECONDS
                        feedback("Atlas", "Listening…", int(LISTEN_SECONDS * 1000))
                        print("WAKE: atlas", flush=True)
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

            elif time.monotonic() < armed_until:
                partial = json.loads(recognizer.PartialResult()).get("partial", "").strip().lower()
                now = time.monotonic()
                if partial and partial != last_partial and now - last_partial_sent > 0.35:
                    last_partial = partial
                    last_partial_sent = now
                    feedback("Atlas", partial, 1200)
                    print(f"PARTIAL: {partial}", flush=True)

    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        audio.terminate()
        try:
            audio.wait(timeout=2)
        except subprocess.TimeoutExpired:
            audio.kill()


if __name__ == "__main__":
    main()
