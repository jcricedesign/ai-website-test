#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json
import os
import subprocess
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


def action_wake():
    cec_note = ""
    try:
        cec_note = wake_tv()
    except Exception as exc:
        cec_note = f"CEC warning: {exc}"
    refresh_note = refresh_display()
    return {"ok": True, "message": "Display ready", "cec": cec_note, "display": refresh_note}


ACTIONS = {
    "/api/wake": action_wake,
    "/api/refresh": lambda: {"ok": True, "message": "Display refreshed", "display": refresh_display()},
    "/api/restart": lambda: {"ok": True, "message": "Display restarted", "display": restart_display()},
    "/api/next": lambda: {"ok": True, "message": "Next", "input": send_key("Right")},
    "/api/back": lambda: {"ok": True, "message": "Back", "input": send_key("Left")},
    "/api/top": lambda: {"ok": True, "message": "Top", "input": send_key("Home")},
    "/api/bottom": lambda: {"ok": True, "message": "Bottom", "input": send_key("End")},
}


class Handler(BaseHTTPRequestHandler):
    server_version = "PortfolioRemote/0.3"

    def log_message(self, fmt, *args):
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.client_address[0]} {fmt % args}")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"ok": True, "service": "portfolio-remote", "presentation": WTYPE.exists()})
            return
        if self.path not in ("/", "/index.html"):
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
        action = ACTIONS.get(self.path)
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
