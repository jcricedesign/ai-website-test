(() => {
  'use strict';
  if(window.__ATLAS_MEDIA_LAYER__)return;window.__ATLAS_MEDIA_LAYER__=true;
  const API='http://127.0.0.1:8765',DISPLAY_URL=`${API}/api/display`;
  let seq=-1,baseVolume=.65,ducked=false;
  function ensure(){
    let root=document.getElementById('atlas-media-layer');if(root)return root;
    const s=document.createElement('style');s.textContent=`#atlas-media-layer{position:fixed;inset:0;z-index:2147483200;background:#000;display:none;align-items:center;justify-content:center}#atlas-media-layer.active{display:flex}#atlas-media-layer video{width:100%;height:100%;object-fit:contain;background:#000}#atlas-media-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font:600 clamp(20px,2vw,34px)/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;background:#000}#atlas-media-loading.hidden{display:none}`;document.head.appendChild(s);
    root=document.createElement('div');root.id='atlas-media-layer';root.innerHTML='<video id="atlas-media-video" playsinline></video><div id="atlas-media-loading">Loading video…</div>';document.body.appendChild(root);
    const v=root.querySelector('video'),loading=root.querySelector('#atlas-media-loading');
    v.addEventListener('playing',()=>loading.classList.add('hidden'));
    v.addEventListener('waiting',()=>loading.classList.remove('hidden'));
    v.addEventListener('ended',()=>stop(false));
    v.addEventListener('error',()=>{loading.textContent='Unable to play video';setTimeout(()=>stop(false),1600)});
    return root;
  }
  function video(){return ensure().querySelector('video')}
  async function play(payload={}){
    const root=ensure(),v=video(),url=payload.url;if(!url)return;
    root.classList.add('active');root.querySelector('#atlas-media-loading').textContent=payload.label||'Loading video…';root.querySelector('#atlas-media-loading').classList.remove('hidden');
    baseVolume=Math.max(0,Math.min(1,Number(payload.volume??.65)));ducked=false;v.volume=baseVolume;v.src=url;v.currentTime=0;
    try{await v.play()}catch(e){console.error('Atlas media play failed',e);root.querySelector('#atlas-media-loading').textContent='Unable to start video'}
  }
  function stop(clear=true){const root=ensure(),v=video();try{v.pause()}catch(_){}if(clear){v.removeAttribute('src');v.load()}root.classList.remove('active');ducked=false}
  function duck(){const v=video();if(!ensure().classList.contains('active'))return;ducked=true;v.volume=Math.max(.08,baseVolume*.28)}
  function restore(){const v=video();if(!ensure().classList.contains('active'))return;ducked=false;v.volume=baseVolume}
  async function poll(){
    try{const r=await fetch(`${DISPLAY_URL}?t=${Date.now()}`,{cache:'no-store'}),d=await r.json();if(d.ok){if(seq<0){seq=d.seq}else if(d.seq>seq){seq=d.seq;const c=d.command,p=d.payload||{};if(c==='play-browser-media')play(p);else if(c==='stop-browser-media')stop();else if(c==='duck-browser-media')duck();else if(c==='restore-browser-media')restore()}}}catch(_){}finally{setTimeout(poll,120)}
  }
  ensure();poll();
})();
