#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import subprocess
import threading
import time

HOST = os.environ.get("PORTFOLIO_REMOTE_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORTFOLIO_REMOTE_PORT", "8765"))
BASE = Path(__file__).resolve().parent
INDEX = BASE / "index.html"
DISPLAY_REFRESH = Path("/home/john/bin/display-refresh")
DISPLAY_RESTART = Path("/home/john/bin/display-restart")
CEC_CLIENT = Path("/usr/bin/cec-client")
WTYPE = Path("/usr/bin/wtype")
WAYLAND_ENV = {"XDG_RUNTIME_DIR": "/run/user/1000", "WAYLAND_DISPLAY": "wayland-0"}

_feedback_lock = threading.Lock()
_feedback = {"seq": 0, "label": "", "detail": "", "duration": 0, "ts": 0.0}


def set_feedback(label, detail="", duration=2100):
    global _feedback
    with _feedback_lock:
        _feedback = {
            "seq": _feedback["seq"] + 1,
            "label": label,
            "detail": detail,
            "duration": int(duration),
            "ts": time.time(),
        }
        return dict(_feedback)


def get_feedback():
    with _feedback_lock:
        return dict(_feedback)


def run_command(argv, *, input_text=None, timeout=15, extra_env=None):
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    result = subprocess.run(
        [str(x) for x in argv],
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stdout.strip() or f"Command failed: {argv[0]}")
    return result.stdout.strip()


def wake_tv():
    if not CEC_CLIENT.exists():
        return "CEC not installed"
    return run_command([CEC_CLIENT, "-s", "-d", "1"], input_text="on 0\nas\n", timeout=10)


def refresh_display():
    if not DISPLAY_REFRESH.exists():
        raise RuntimeError(f"Missing {DISPLAY_REFRESH}")
    return run_command([DISPLAY_REFRESH])


def restart_display():
    if not DISPLAY_RESTART.exists():
        raise RuntimeError(f"Missing {DISPLAY_RESTART}")
    return run_command([DISPLAY_RESTART])


def send_key(key):
    if not WTYPE.exists():
        raise RuntimeError("Presentation controls need wtype installed on the Pi")
    return run_command([WTYPE, "-k", key], timeout=5, extra_env=WAYLAND_ENV)


def keyed_action(label, key, detail=""):
    set_feedback(label, detail)
    result = send_key(key)
    return {"ok": True, "message": label, "input": result}


def action_wake():
    cec_note = ""
    try:
        cec_note = wake_tv()
    except Exception as exc:
        cec_note = f"CEC warning: {exc}"
    refresh_note = refresh_display()
    set_feedback("Display", "Ready")
    return {"ok": True, "message": "Display ready", "cec": cec_note, "display": refresh_note}


ACTIONS = {
    "/api/wake": action_wake,
    "/api/refresh": lambda: {"ok": True, "message": "Display refreshed", "display": refresh_display()},
    "/api/restart": lambda: {"ok": True, "message": "Display restarted", "display": restart_display()},
    "/api/next": lambda: keyed_action("Next", "Right", "Advancing"),
    "/api/back": lambda: keyed_action("Back", "Left"),
    "/api/top": lambda: keyed_action("Top", "Home"),
    "/api/bottom": lambda: keyed_action("Bottom", "End"),
    "/api/home": lambda: keyed_action("Home", "F8"),
    "/api/screensaver": lambda: keyed_action("Screensaver", "F12", "Resting"),
}


class Handler(BaseHTTPRequestHandler):
    server_version = "PortfolioRemote/0.7"

    def log_message(self, fmt, *args):
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.client_address[0]} {fmt % args}")

    def send_json(self, status, payload, *, cors=False):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cors:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json(200, {"ok": True, "service": "portfolio-remote", "presentation": WTYPE.exists()})
            return
        if path == "/api/feedback":
            self.send_json(200, {"ok": True, **get_feedback()}, cors=True)
            return
        if path not in ("/", "/index.html"):
            self.send_error(404)
            return
        try:
            body = INDEX.read_bytes()
        except FileNotFoundError:
            self.send_error(500, "index.html missing")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/feedback":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length) or b"{}")
                item = set_feedback(
                    str(payload.get("label", ""))[:80],
                    str(payload.get("detail", ""))[:160],
                    int(payload.get("duration", 2100)),
                )
                self.send_json(200, {"ok": True, **item}, cors=True)
            except Exception as exc:
                self.send_json(400, {"ok": False, "message": str(exc)}, cors=True)
            return

        action = ACTIONS.get(path)
        if not action:
            self.send_error(404)
            return
        try:
            payload = action()
            self.send_json(200, payload)
        except Exception as exc:
            self.send_json(500, {"ok": False, "message": str(exc)})


if __name__ == "__main__":
    print(f"Portfolio remote listening on http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
