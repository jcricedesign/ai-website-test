#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, urlencode
from urllib.request import urlopen
import json, os, subprocess, threading, time
HOST=os.environ.get("PORTFOLIO_REMOTE_HOST","0.0.0.0"); PORT=int(os.environ.get("PORTFOLIO_REMOTE_PORT","8765")); BASE=Path(__file__).resolve().parent; INDEX=BASE/"index.html"
DISPLAY_REFRESH=Path("/home/john/bin/display-refresh"); DISPLAY_RESTART=Path("/home/john/bin/display-restart"); CEC_CLIENT=Path("/usr/bin/cec-client"); WTYPE=Path("/usr/bin/wtype"); WAYLAND_ENV={"XDG_RUNTIME_DIR":"/run/user/1000","WAYLAND_DISPLAY":"wayland-0"}
_feedback_lock=threading.Lock(); _feedback={"seq":0,"label":"","detail":"","duration":0,"ts":0.0}
_audio_lock=threading.Lock(); _audio={"seq":0,"playing":False,"title":"","stop_seq":0,"ts":0.0}
_activity_lock=threading.Lock(); _activity={"seq":0,"active":False,"label":"","ts":0.0}
_display_lock=threading.Lock(); _display={"seq":0,"command":"","payload":{},"ts":0.0}
_weather_lock=threading.Lock(); _weather_cache={"ts":0.0,"data":None}; WEATHER_CACHE_SECONDS=300
WEATHER_CODES={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",56:"Freezing drizzle",57:"Heavy freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Light showers",81:"Showers",82:"Heavy showers",85:"Light snow showers",86:"Heavy snow showers",95:"Thunderstorms",96:"Thunderstorms with hail",99:"Severe thunderstorms with hail"}
def set_feedback(label,detail="",duration=2100):
 global _feedback
 with _feedback_lock: _feedback={"seq":_feedback["seq"]+1,"label":label,"detail":detail,"duration":int(duration),"ts":time.time()}; return dict(_feedback)
def get_feedback():
 with _feedback_lock:return dict(_feedback)
def set_audio(playing,title=""):
 global _audio
 with _audio_lock: _audio={**_audio,"seq":_audio["seq"]+1,"playing":bool(playing),"title":str(title)[:120] if playing else "","ts":time.time()}; return dict(_audio)
def request_audio_stop():
 global _audio
 with _audio_lock: _audio={**_audio,"stop_seq":_audio["stop_seq"]+1,"ts":time.time()}; return dict(_audio)
def get_audio():
 with _audio_lock:return dict(_audio)
def set_activity(active,label=""):
 global _activity
 with _activity_lock:_activity={"seq":_activity["seq"]+1,"active":bool(active),"label":str(label)[:120] if active else "","ts":time.time()};return dict(_activity)
def get_activity():
 with _activity_lock:return dict(_activity)
def set_display_command(command,payload=None):
 global _display
 with _display_lock:_display={"seq":_display["seq"]+1,"command":str(command)[:80],"payload":payload or {},"ts":time.time()};return dict(_display)
def get_display_command():
 with _display_lock:return dict(_display)
def fetch_weather():
 now=time.time()
 with _weather_lock:
  if _weather_cache["data"] is not None and now-_weather_cache["ts"]<WEATHER_CACHE_SECONDS:return dict(_weather_cache["data"])
 params={"latitude":47.6062,"longitude":-122.3321,"current":"temperature_2m,apparent_temperature,weather_code","daily":"temperature_2m_max,temperature_2m_min","temperature_unit":"fahrenheit","timezone":"America/Los_Angeles","forecast_days":1}
 url="https://api.open-meteo.com/v1/forecast?"+urlencode(params)
 with urlopen(url,timeout=6) as r:raw=json.loads(r.read().decode())
 current=raw.get("current",{});daily=raw.get("daily",{})
 code=int(current.get("weather_code",-1));high=(daily.get("temperature_2m_max") or [None])[0];low=(daily.get("temperature_2m_min") or [None])[0]
 data={"city":"Seattle","temperature":round(float(current["temperature_2m"])),"apparent_temperature":round(float(current["apparent_temperature"])),"condition":WEATHER_CODES.get(code,"Current conditions"),"weather_code":code,"high":round(float(high)) if high is not None else None,"low":round(float(low)) if low is not None else None,"observed_at":current.get("time",""),"source":"Open-Meteo"}
 with _weather_lock:_weather_cache.update(ts=now,data=data)
 return dict(data)
def run_command(argv,*,input_text=None,timeout=15,extra_env=None):
 env=os.environ.copy(); env.update(extra_env or {}); r=subprocess.run([str(x) for x in argv],input=input_text,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout,check=False,env=env)
 if r.returncode!=0:raise RuntimeError(r.stdout.strip() or f"Command failed: {argv[0]}")
 return r.stdout.strip()
def wake_tv(): return "CEC not installed" if not CEC_CLIENT.exists() else run_command([CEC_CLIENT,"-s","-d","1"],input_text="on 0\nas\n",timeout=10)
def refresh_display():
 if not DISPLAY_REFRESH.exists():raise RuntimeError(f"Missing {DISPLAY_REFRESH}")
 return run_command([DISPLAY_REFRESH])
def restart_display():
 if not DISPLAY_RESTART.exists():raise RuntimeError(f"Missing {DISPLAY_RESTART}")
 return run_command([DISPLAY_RESTART])
def send_key(key):
 if not WTYPE.exists():raise RuntimeError("Presentation controls need wtype installed on the Pi")
 return run_command([WTYPE,"-k",key],timeout=5,extra_env=WAYLAND_ENV)
def keyed_action(label,key,detail=""): set_feedback(label,detail); result=send_key(key); return {"ok":True,"message":label,"input":result}
def display_action(label,command,detail="",payload=None): set_feedback(label,detail); item=set_display_command(command,payload); return {"ok":True,"message":label,"display":item}
def action_wake():
 try:cec_note=wake_tv()
 except Exception as exc:cec_note=f"CEC warning: {exc}"
 refresh_note=refresh_display(); set_feedback("Display","Ready"); return {"ok":True,"message":"Display ready","cec":cec_note,"display":refresh_note}
ACTIONS={"/api/wake":action_wake,"/api/refresh":lambda:{"ok":True,"message":"Display refreshed","display":refresh_display()},"/api/restart":lambda:{"ok":True,"message":"Display restarted","display":restart_display()},"/api/next":lambda:keyed_action("Next","Right","Advancing"),"/api/back":lambda:keyed_action("Back","Left"),"/api/top":lambda:keyed_action("Top","Home"),"/api/bottom":lambda:keyed_action("Bottom","End"),"/api/home":lambda:keyed_action("Home","F8"),"/api/screensaver":lambda:keyed_action("Screensaver","F9","Resting"),"/api/weather":lambda:display_action("Weather","show-temporary-canvas","Opening",{"kind":"weather"}),"/api/theme":lambda:keyed_action("Theme","t","Changing"),"/api/work":lambda:keyed_action("Work","w","Opening"),"/api/career":lambda:keyed_action("Career","c","Opening"),"/api/barber-game":lambda:keyed_action("Barber Game","b","Opening"),"/api/playground":lambda:keyed_action("Playground","p","Opening"),"/api/about":lambda:keyed_action("About","a","Opening")}
class Handler(BaseHTTPRequestHandler):
 server_version="PortfolioRemote/1.0"
 def log_message(self,fmt,*args):print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {self.client_address[0]} {fmt % args}")
 def send_json(self,status,payload,*,cors=False):
  body=json.dumps(payload).encode(); self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(body))); self.send_header("Cache-Control","no-store");
  if cors:self.send_header("Access-Control-Allow-Origin","*")
  self.end_headers(); self.wfile.write(body)
 def do_OPTIONS(self):self.send_response(204); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Methods","GET, POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers","Content-Type"); self.end_headers()
 def do_GET(self):
  path=urlparse(self.path).path
  if path=="/health":self.send_json(200,{"ok":True,"service":"portfolio-remote","presentation":WTYPE.exists()});return
  if path=="/api/feedback":self.send_json(200,{"ok":True,**get_feedback()},cors=True);return
  if path=="/api/audio":self.send_json(200,{"ok":True,**get_audio()},cors=True);return
  if path=="/api/activity":self.send_json(200,{"ok":True,**get_activity()},cors=True);return
  if path=="/api/display":self.send_json(200,{"ok":True,**get_display_command()},cors=True);return
  if path=="/api/weather-data":
   try:self.send_json(200,{"ok":True,**fetch_weather()},cors=True)
   except Exception as exc:self.send_json(502,{"ok":False,"message":str(exc)},cors=True)
   return
  if path not in ("/","/index.html"):self.send_error(404);return
  try:body=INDEX.read_bytes()
  except FileNotFoundError:self.send_error(500,"index.html missing");return
  self.send_response(200);self.send_header("Content-Type","text/html; charset=utf-8");self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(body)
 def do_POST(self):
  path=urlparse(self.path).path
  if path in ("/api/feedback","/api/audio","/api/activity"):
   try:
    length=int(self.headers.get("Content-Length","0"));payload=json.loads(self.rfile.read(length) or b"{}")
    if path=="/api/feedback":item=set_feedback(str(payload.get("label",""))[:80],str(payload.get("detail",""))[:160],int(payload.get("duration",2100)))
    elif path=="/api/audio":item=set_audio(bool(payload.get("playing",False)),str(payload.get("title","")))
    else:item=set_activity(bool(payload.get("active",False)),str(payload.get("label","")))
    self.send_json(200,{"ok":True,**item},cors=True)
   except Exception as exc:self.send_json(400,{"ok":False,"message":str(exc)},cors=True)
   return
  if path=="/api/audio/stop":self.send_json(200,{"ok":True,**request_audio_stop()},cors=True);return
  action=ACTIONS.get(path)
  if not action:self.send_error(404);return
  try:self.send_json(200,action())
  except Exception as exc:self.send_json(500,{"ok":False,"message":str(exc)})
if __name__=="__main__":print(f"Portfolio remote listening on http://{HOST}:{PORT}");ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
