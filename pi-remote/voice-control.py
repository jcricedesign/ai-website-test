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
COMMANDS = ["next", "back", "top", "bottom", "home", "[unk]"]
COOLDOWN_SECONDS = 0.7


def send_action(command):
    req = urllib.request.Request(
        f"{REMOTE_BASE}/api/{command}",
        method="POST",
        headers={"Content-Length": "0"},
    )
    with urllib.request.urlopen(req, timeout=3) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("ok"):
        raise RuntimeError(payload.get("message", "Action failed"))


def main():
    print("Loading voice model...")
    model = Model(MODEL_PATH)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE, json.dumps(COMMANDS))

    audio = subprocess.Popen(
        [
            "arecord", "-q",
            "-D", AUDIO_DEVICE,
            "-f", "S16_LE",
            "-r", str(SAMPLE_RATE),
            "-c", "1",
            "-t", "raw",
        ],
        stdout=subprocess.PIPE,
    )

    print("Voice control ready: next, back, top, bottom, home")
    last_action = 0.0

    try:
        while True:
            data = audio.stdout.read(4000)
            if not data:
                break
            if not recognizer.AcceptWaveform(data):
                continue

            result = json.loads(recognizer.Result())
            text = result.get("text", "").strip()

            # Only exact, single-word commands are allowed to control the display.
            if text not in COMMANDS or text == "[unk]":
                if text:
                    print(f"IGNORED: {text}", flush=True)
                continue

            now = time.monotonic()
            if now - last_action < COOLDOWN_SECONDS:
                continue

            try:
                send_action(text)
                last_action = now
                print(f"ACTION: {text}", flush=True)
            except Exception as exc:
                print(f"ERROR {text}: {exc}", flush=True)

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
