#!/usr/bin/env python3
import json, os, subprocess, threading, time, urllib.request
from vosk import Model, KaldiRecognizer

MODEL_PATH="/home/john/vosk-model"; AUDIO_DEVICE="plughw:2,0"; SAMPLE_RATE=16000; REMOTE_BASE="http://127.0.0.1:8765"; WAKE_WORD="atlas"
ANTHEM_URL=os.environ.get("PORTFOLIO_ANTHEM_URL","https://pub-8150ade24f1a45dfa4e16936ba894a95.r2.dev/Heavy-Intro.mp3")
R2_BASE=os.environ.get("PORTFOLIO_R2_BASE","https://pub-8150ade24f1a45dfa4e16936ba894a95.r2.dev").rstrip("/")
TRAILER_URLS=[f"{R2_BASE}/trailers/atlas-boston-dynamics.mp4",f"{R2_BASE}/trailers/IBM-selectric-doc.mp4",f"{R2_BASE}/trailers/Spot-Launch-YouTube.mp4"]
DISPLAY_ENV={"DISPLAY":":0","XDG_RUNTIME_DIR":"/run/user/1000","WAYLAND_DISPLAY":"wayland-0"}
PIPER_BIN=os.environ.get("ATLAS_PIPER_BIN","/home/john/piper-venv/bin/piper");PIPER_MODEL=os.environ.get("ATLAS_PIPER_MODEL","/home/john/atlas-voices/en_US-lessac-medium.onnx");ATLAS_SPEECH_VOLUME=int(os.environ.get("ATLAS_SPEECH_VOLUME","55"));ATLAS_PITCH=float(os.environ.get("ATLAS_PITCH","0.90"))
COMMANDS=["next","back","top","bottom","home","screensaver","cancel","done","work","career","barber-game","playground","about","demo","trailers","exit","anthem","stop","stop-playing","weather","tell-weather"]
PHRASES=[WAKE_WORD,"next","back","top","bottom","home","cancel","done","i'm done","im done","screensaver","screen saver","start screensaver","start screen saver","sleep","rest","work","selected work","career","barber game","the barber game","playground","about","about me","demo","play demo","start demo","trailers","play trailers","start trailers","exit","stop demo","close demo","stop trailers","close trailers","stop playing","stop playback","cancel playback","anthem","play anthem","start anthem","stop","stop anthem","stop music","weather","show weather","show the weather","tell me the weather","tell weather","what's the weather","whats the weather","[unk]"]
LISTEN_SECONDS=5.;COOLDOWN_SECONDS=.7;WAKE_DEBOUNCE_SECONDS=1.;DEMO_START_VOLUME=65;DEMO_DUCK_STEPS=5

_demo_process=None;_demo_lock=threading.Lock();_duck_restore_timer=None
_anthem_process=None;_anthem_lock=threading.Lock();_last_audio_stop_seq=0
_foreground_mode=None;_foreground_stop=threading.Event();_foreground_lock=threading.Lock()
_canvas_active=False;_browser_demo_active=False

def request_json(path,method="GET",payload=None):
 data=None;headers={}
 if payload is not None:data=json.dumps(payload).encode();headers={"Content-Type":"application/json","Content-Length":str(len(data))}
 req=urllib.request.Request(f"{REMOTE_BASE}{path}",data=data,method=method,headers=headers)
 with urllib.request.urlopen(req,timeout=3) as r:return json.loads(r.read().decode())
def post_json(path,payload=None):
 result=request_json(path,"POST",payload or {})
 if not result.get("ok"):raise RuntimeError(result.get("message","Request failed"))
 return result
def send_action(command):return post_json(f"/api/{command}")
def feedback(label,detail="",duration=2100):
 try:post_json("/api/feedback",{"label":label,"detail":detail,"duration":duration})
 except Exception as exc:print(f"FEEDBACK ERROR: {exc}",flush=True)
def audio_state(playing,title=""):
 try:post_json("/api/audio",{"playing":playing,"title":title})
 except Exception as exc:print(f"AUDIO STATE ERROR: {exc}",flush=True)
def activity_state(active,label=""):
 try:post_json("/api/activity",{"active":active,"label":label})
 except Exception as exc:print(f"ACTIVITY STATE ERROR: {exc}",flush=True)

def native_media_running():
 with _demo_lock:proc=_demo_process
 return bool(proc and proc.poll() is None)
def anthem_running():
 with _anthem_lock:proc=_anthem_process
 return bool(proc and proc.poll() is None)
def foreground_mode():
 with _foreground_lock:return _foreground_mode
def set_foreground_mode(mode):
 global _foreground_mode
 with _foreground_lock:_foreground_mode=mode

def display_keys(*keys):
 env=os.environ.copy();env.update(DISPLAY_ENV)
 for key in keys:subprocess.run(["/usr/bin/wtype","-k",key],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False,env=env);time.sleep(.08)

def stop_browser_demo(feedback_label=None):
 global _browser_demo_active
 if not _browser_demo_active:return False
 send_action("media-stop");_browser_demo_active=False;set_foreground_mode(None)
 if feedback_label:feedback("Demo",feedback_label,650)
 print("BROWSER DEMO STOP",flush=True);return True

def show_weather():
 global _canvas_active
 stop_browser_demo();stop_foreground();_foreground_stop.clear();stop_anthem();_canvas_active=True;send_action("weather");print("CANVAS START: weather",flush=True)
def dismiss_canvas(label="Closed"):
 global _canvas_active
 if not _canvas_active:return False
 _canvas_active=False;display_keys("Escape");feedback("Weather",label,650);print(f"CANVAS END: {label}",flush=True);return True

def weather_sentence(data):
 city=data.get("city","Seattle");temp=data.get("temperature");condition=str(data.get("condition","current conditions")).lower();high=data.get("high");low=data.get("low")
 sentence=f"It's {temp} degrees and {condition} in {city}." if temp is not None else f"The weather in {city} is {condition}."
 if high is not None:sentence+=f" Today's high is {high} degrees."
 if low is not None:sentence+=f" The low is {low}."
 return sentence

def send_player_key(key,presses=1):
 if not native_media_running():return
 env=os.environ.copy();env.update(DISPLAY_ENV)
 for _ in range(presses):subprocess.run(["/usr/bin/wtype","-k",key],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False,env=env);time.sleep(.035)
def duck_native_for_speech():
 if not native_media_running():return False
 send_player_key("9",DEMO_DUCK_STEPS);print("NATIVE MEDIA: ducked for Atlas speech",flush=True);return True
def restore_native_after_speech(was_ducked):
 if was_ducked and native_media_running():send_player_key("0",DEMO_DUCK_STEPS);print("NATIVE MEDIA: restored after Atlas speech",flush=True)

def speak(text):
 if not os.path.exists(PIPER_BIN):raise RuntimeError(f"Piper not found: {PIPER_BIN}")
 if not os.path.exists(PIPER_MODEL):raise RuntimeError(f"Atlas voice model not found: {PIPER_MODEL}")
 wav=f"/tmp/atlas-speech-{os.getpid()}.wav";native_ducked=False;browser_ducked=False
 try:
  synth=subprocess.run([PIPER_BIN,"--model",PIPER_MODEL,"--output_file",wav],input=text,text=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=False)
  if synth.returncode!=0:raise RuntimeError(synth.stderr.strip() or "Piper synthesis failed")
  if _browser_demo_active:send_action("media-duck");browser_ducked=True;time.sleep(.12)
  else:native_ducked=duck_native_for_speech()
  pitch=max(.5,min(1.5,ATLAS_PITCH));audio_filter=f"asetrate=22050*{pitch},aresample=22050,atempo=1/{pitch}"
  play=subprocess.run(["/usr/bin/ffplay","-nodisp","-autoexit","-loglevel","quiet","-volume",str(ATLAS_SPEECH_VOLUME),"-af",audio_filter,wav],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False)
  if play.returncode!=0:raise RuntimeError("Atlas speech playback failed")
  return "piper"
 finally:
  if browser_ducked:
   try:send_action("media-restore")
   except Exception:pass
  restore_native_after_speech(native_ducked)
  try:os.remove(wav)
  except FileNotFoundError:pass

def tell_weather():
 data=request_json("/api/weather-data")
 if not data.get("ok"):raise RuntimeError(data.get("message","Weather unavailable"))
 temp=data.get("temperature");condition=data.get("condition","Current conditions");city=data.get("city","Seattle");sentence=weather_sentence(data)
 feedback("Atlas",f"{temp}° · {condition} in {city}",7000);engine=speak(sentence);print(f"ATLAS SPOKE ({engine}, pitch={ATLAS_PITCH}, volume={ATLAS_SPEECH_VOLUME}): {sentence}",flush=True)

def restore_demo_audio():
 global _duck_restore_timer;_duck_restore_timer=None
 if native_media_running():send_player_key("0",DEMO_DUCK_STEPS);print("FOREGROUND AUDIO: restored",flush=True)
def duck_demo_audio():
 global _duck_restore_timer
 if not native_media_running():return
 if _duck_restore_timer:_duck_restore_timer.cancel()
 send_player_key("9",DEMO_DUCK_STEPS);print("FOREGROUND AUDIO: ducked",flush=True);_duck_restore_timer=threading.Timer(LISTEN_SECONDS+.5,restore_demo_audio);_duck_restore_timer.daemon=True;_duck_restore_timer.start()

def normalized_command(text):
 text=" ".join(text.strip().lower().split());aliases={"screen saver":"screensaver","start screensaver":"screensaver","start screen saver":"screensaver","sleep":"screensaver","rest":"screensaver","selected work":"work","barber game":"barber-game","the barber game":"barber-game","about me":"about","play demo":"demo","start demo":"demo","play trailers":"trailers","start trailers":"trailers","stop demo":"exit","close demo":"exit","stop trailers":"stop-playing","close trailers":"exit","stop playing":"stop-playing","stop playback":"stop-playing","cancel playback":"stop-playing","play anthem":"anthem","start anthem":"anthem","stop anthem":"stop","stop music":"stop","show weather":"weather","show the weather":"weather","tell me the weather":"tell-weather","tell weather":"tell-weather","what's the weather":"tell-weather","whats the weather":"tell-weather","i'm done":"done","im done":"done"}
 return aliases.get(text,text if text in COMMANDS else None)

def run_foreground(url):
 global _demo_process
 env=os.environ.copy();env.update(DISPLAY_ENV)
 proc=subprocess.Popen(["/usr/bin/ffplay","-hide_banner","-loglevel","warning","-fs","-autoexit","-volume",str(DEMO_START_VOLUME),url],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=env)
 with _demo_lock:_demo_process=proc
 print(f"FOREGROUND START: {proc.pid} {url} volume={DEMO_START_VOLUME}",flush=True);return proc
def clear_foreground_process(proc=None):
 global _demo_process,_duck_restore_timer
 with _demo_lock:
  if proc is None or _demo_process is proc:_demo_process=None
 if _duck_restore_timer:_duck_restore_timer.cancel();_duck_restore_timer=None
def stop_foreground():
 _foreground_stop.set();activity_state(False)
 with _demo_lock:proc=_demo_process
 if proc and proc.poll() is None:
  proc.terminate()
  try:proc.wait(timeout=2)
  except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=2)
  clear_foreground_process(proc);return True
 clear_foreground_process(proc);return bool(foreground_mode()=="trailers")

def start_demo():
 global _browser_demo_active
 dismiss_canvas();stop_foreground();_foreground_stop.clear();stop_anthem();_browser_demo_active=True;set_foreground_mode("demo");send_action("demo-browser");print("BROWSER DEMO START",flush=True)

def play_trailers_worker():
 try:
  total=len(TRAILER_URLS)
  for index,url in enumerate(TRAILER_URLS,1):
   if _foreground_stop.is_set():break
   activity_state(True,f"Loading trailer {index} of {total}…");proc=run_foreground(url);proc.wait();clear_foreground_process(proc)
   if _foreground_stop.is_set():break
   if proc.returncode not in (0,None):print(f"TRAILER ERROR: {proc.returncode} {url}",flush=True)
  if not _foreground_stop.is_set():activity_state(False);feedback("Trailers","Ended",700)
 finally:activity_state(False);clear_foreground_process();set_foreground_mode(None);print("TRAILERS END",flush=True)
def start_trailers():
 stop_browser_demo();dismiss_canvas();stop_foreground();_foreground_stop.clear();stop_anthem();set_foreground_mode("trailers");activity_state(True,f"Loading trailer 1 of {len(TRAILER_URLS)}…");threading.Thread(target=play_trailers_worker,daemon=True).start();print(f"TRAILERS START: {len(TRAILER_URLS)} independent items",flush=True)

def watch_anthem(proc):
 global _anthem_process;proc.wait();was_current=False
 with _anthem_lock:
  if _anthem_process is proc:_anthem_process=None;was_current=True
 if was_current:audio_state(False);feedback("Anthem","Finished",700)
 print(f"ANTHEM END: {proc.returncode}",flush=True)
def stop_anthem():
 global _anthem_process
 with _anthem_lock:proc=_anthem_process
 if not proc or proc.poll() is not None:
  with _anthem_lock:
   if _anthem_process is proc:_anthem_process=None
  audio_state(False);return False
 proc.terminate()
 try:proc.wait(timeout=2)
 except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=2)
 audio_state(False);return True
def start_anthem():
 global _anthem_process
 stop_browser_demo();dismiss_canvas();stop_anthem();env=os.environ.copy();env.update(DISPLAY_ENV);feedback("Anthem","Playing",1400)
 proc=subprocess.Popen(["/usr/bin/ffplay","-hide_banner","-loglevel","warning","-nodisp","-autoexit",ANTHEM_URL],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=env)
 with _anthem_lock:_anthem_process=proc
 audio_state(True,"Anthem");threading.Thread(target=watch_anthem,args=(proc,),daemon=True).start();print(f"ANTHEM START: {proc.pid} {ANTHEM_URL}",flush=True)
def audio_stop_watcher():
 global _last_audio_stop_seq
 while True:
  try:
   state=request_json("/api/audio");seq=int(state.get("stop_seq",0))
   if seq>_last_audio_stop_seq:
    _last_audio_stop_seq=seq
    if anthem_running():stop_anthem();feedback("Anthem","Stopped",800);print("ANTHEM STOP: UI",flush=True)
  except Exception:pass
  time.sleep(.25)

def stop_current_activity(label="Stopped"):
 if dismiss_canvas(label):return True
 if stop_browser_demo(label):return True
 mode=foreground_mode();fg=stop_foreground();audio=stop_anthem() if not fg else False
 if fg:feedback("Trailers" if mode=="trailers" else "Demo",label,650)
 elif audio:feedback("Anthem",label,650)
 else:feedback("Atlas","Nothing playing",800)
 return fg or audio

def execute(command,last_action):
 if time.monotonic()-last_action<COOLDOWN_SECONDS:return last_action,False
 try:
  if command=="demo":start_demo()
  elif command=="trailers":start_trailers()
  elif command=="weather":show_weather()
  elif command=="tell-weather":tell_weather()
  elif command=="done":stop_current_activity("Done")
  elif command in ("exit","stop-playing"):stop_current_activity("Stopped" if command=="stop-playing" else "Closed")
  elif command=="cancel":stop_current_activity("Cancelled")
  elif command=="anthem":start_anthem()
  elif command=="stop":
   stopped=stop_anthem();feedback("Anthem","Stopped" if stopped else "Nothing playing",800);print("ANTHEM STOP" if stopped else "ANTHEM STOP: none",flush=True)
  else:send_action(command);print(f"ACTION: {command}",flush=True)
  return time.monotonic(),True
 except Exception as exc:activity_state(False);feedback("Atlas","Try again");print(f"ERROR {command}: {exc}",flush=True);return last_action,False

def main():
 global _last_audio_stop_seq
 print("Loading voice model...");model=Model(MODEL_PATH);recognizer=KaldiRecognizer(model,SAMPLE_RATE,json.dumps(PHRASES));audio=subprocess.Popen(["arecord","-q","-D",AUDIO_DEVICE,"-f","S16_LE","-r",str(SAMPLE_RATE),"-c","1","-t","raw"],stdout=subprocess.PIPE)
 try:_last_audio_stop_seq=int(request_json("/api/audio").get("stop_seq",0))
 except Exception:_last_audio_stop_seq=0
 audio_state(False);activity_state(False);threading.Thread(target=audio_stop_watcher,daemon=True).start();print("Atlas ready: browser demo + trailers + audio + temporary canvas + Piper voice")
 armed_until=last_action=last_wake=0.;last_partial="";last_partial_sent=0.
 def arm_atlas(reason="atlas"):
  nonlocal armed_until,last_wake,last_partial
  now=time.monotonic()
  if now-last_wake<WAKE_DEBOUNCE_SECONDS:return
  last_wake=now;armed_until=now+LISTEN_SECONDS;last_partial=""
  if native_media_running():duck_demo_audio()
  feedback("Atlas","Listening…",int(LISTEN_SECONDS*1000));print(f"WAKE: {reason}",flush=True)
 try:
  while True:
   data=audio.stdout.read(4000)
   if not data:break
   if recognizer.AcceptWaveform(data):
    text=json.loads(recognizer.Result()).get("text","").strip().lower();last_partial=""
    if not text or text=="[unk]":continue
    words=text.split()
    if words and words[0]==WAKE_WORD:
     remainder=" ".join(words[1:])
     if not remainder:arm_atlas("atlas final");continue
     command=normalized_command(remainder)
     if command:
      last_action,done=execute(command,last_action)
      if done:armed_until=0.
      continue
    if time.monotonic()<armed_until:
     command=normalized_command(text)
     if command:
      last_action,done=execute(command,last_action)
      if done:armed_until=0.
     else:feedback("Atlas","Try again",1600);armed_until=time.monotonic()+3.;print(f"MISHEARD: {text}",flush=True)
    else:print(f"DORMANT: {text}",flush=True)
   else:
    partial=json.loads(recognizer.PartialResult()).get("partial","").strip().lower();now=time.monotonic()
    if now>=armed_until and partial==WAKE_WORD:arm_atlas("atlas partial");continue
    if now<armed_until and partial and partial!=last_partial and now-last_partial_sent>.35:
     last_partial=partial;last_partial_sent=now
     if partial!=WAKE_WORD:feedback("Atlas",partial,1200);print(f"PARTIAL: {partial}",flush=True)
 except KeyboardInterrupt:print("\nStopped.")
 finally:activity_state(False);stop_anthem();stop_browser_demo();stop_foreground();audio.terminate()
if __name__=="__main__":main()
