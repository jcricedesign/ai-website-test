(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const style=document.createElement('style');
  style.textContent=`
    .joined.photo-collection{
      width:286px;height:224px;display:block!important;
      border-radius:10px;filter:drop-shadow(0 12px 20px rgba(0,0,0,.16));
      transition:filter 150ms ease,opacity 160ms ease;
    }
    .joined.photo-collection .object[data-kind="image"]{
      position:absolute!important;left:50%!important;top:50%!important;
      margin:0!important;pointer-events:none!important;
      transform-origin:center!important;
      transition:transform 220ms cubic-bezier(.2,.9,.25,1),left 220ms cubic-bezier(.2,.9,.25,1),top 220ms cubic-bezier(.2,.9,.25,1)!important;
      box-shadow:0 5px 16px rgba(0,0,0,.12)!important;
    }
    .joined.photo-collection[data-count="2"] .object:nth-of-type(1){transform:translate(-52%,-50%) rotate(-3.5deg) scale(.92)!important}
    .joined.photo-collection[data-count="2"] .object:nth-of-type(2){transform:translate(-48%,-50%) rotate(3.5deg) scale(.92)!important}
    .joined.photo-collection[data-count="3"] .object:nth-of-type(1){transform:translate(-53%,-49%) rotate(-5deg) scale(.88)!important}
    .joined.photo-collection[data-count="3"] .object:nth-of-type(2){transform:translate(-50%,-52%) rotate(.5deg) scale(.9)!important}
    .joined.photo-collection[data-count="3"] .object:nth-of-type(3){transform:translate(-47%,-48%) rotate(5deg) scale(.88)!important}
    .joined.photo-collection.collage{width:282px;height:220px;background:#f8f6ef;border-radius:8px;box-shadow:0 9px 24px rgba(0,0,0,.16)}
    .joined.photo-collection.collage .object[data-kind="image"]{width:132px!important;height:101px!important;padding:4px!important;border-radius:3px!important;background:#f8f6ef!important;box-shadow:none!important;overflow:hidden!important}
    .joined.photo-collection.collage .object[data-kind="image"] .photo-print{border-radius:1px}
    .joined.photo-collection.collage .object:nth-of-type(1){left:25%!important;top:25%!important;transform:translate(-50%,-50%) rotate(-1.4deg) scale(1)!important}
    .joined.photo-collection.collage .object:nth-of-type(2){left:75%!important;top:25%!important;transform:translate(-50%,-50%) rotate(1.1deg) scale(1)!important}
    .joined.photo-collection.collage .object:nth-of-type(3){left:25%!important;top:75%!important;transform:translate(-50%,-50%) rotate(.9deg) scale(1)!important}
    .joined.photo-collection.collage .object:nth-of-type(4){left:75%!important;top:75%!important;transform:translate(-50%,-50%) rotate(-1deg) scale(1)!important}
    .collection-count{position:absolute;right:-8px;top:-8px;z-index:20;min-width:34px;height:34px;padding:0 9px;border-radius:18px;background:#171717;color:white;display:grid;place-items:center;font:700 15px/1 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.2);pointer-events:none}
    .joined.photo-collection.collection-ready{filter:brightness(1.06) drop-shadow(0 16px 24px rgba(0,0,0,.2))}
  `;
  document.head.appendChild(style);

  const setPos=(el,x,y)=>{el.dataset.x=String(x);el.dataset.y=String(y);el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px')};
  const center=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
  const directPhotos=()=>[...stage.querySelectorAll(':scope > .object[data-kind="image"]')];
  const collections=()=>[...stage.querySelectorAll(':scope > .joined.photo-collection')];

  function updateCollection(g){
    if(!g?.isConnected)return;
    const photos=[...g.children].filter(el=>el.classList?.contains('object')&&el.dataset.kind==='image');
    if(photos.length<2)return;
    g.classList.add('photo-collection');
    g.dataset.kind='image-collection';
    g.dataset.count=String(photos.length);
    g.classList.toggle('collage',photos.length>=4);
    let badge=g.querySelector(':scope > .collection-count');
    if(!badge){badge=document.createElement('div');badge.className='collection-count';g.appendChild(badge)}
    badge.textContent=String(photos.length);
    const status=document.getElementById('status');
    if(status){const loose=directPhotos().length,total=loose+collections().length;status.textContent=`${total} ${total===1?'object':'objects'} · 0 touches`}
  }

  function qualifyJoined(g){
    if(!g?.classList?.contains('joined'))return;
    const photos=[...g.children].filter(el=>el.classList?.contains('object'));
    if(photos.length>=2&&photos.every(o=>o.dataset.kind==='image'))updateCollection(g);
  }

  function nearestCollection(o,max=225){
    const a=center(o);let best=null,bestD=max;
    for(const g of collections()){
      if(g.dataset.docked)continue;
      const b=center(g),d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<bestD){best=g;bestD=d}
    }
    return best;
  }

  function mergeIntoCollection(o,g){
    if(!o?.isConnected||!g?.isConnected||o.parentElement!==stage)return;
    const count=+g.dataset.count||g.querySelectorAll(':scope > .object[data-kind="image"]').length;
    if(count>=4)return;
    o.classList.remove('active','edge-near','docked','magnetic','uniting','presented');
    delete o.dataset.docked;delete o.dataset.edge;
    g.classList.add('collection-ready');
    const gp=center(g);
    setPos(o,gp.x,gp.y);
    g.appendChild(o);
    updateCollection(g);
    requestAnimationFrame(()=>g.classList.remove('collection-ready'));
  }

  // Existing sandbox makes the first pair. Promote that joined pair into a
  // compact photo collection as soon as it appears.
  const observer=new MutationObserver(records=>{
    for(const rec of records){
      rec.addedNodes.forEach(n=>{if(n.nodeType===1){qualifyJoined(n);n.querySelectorAll?.('.joined').forEach(qualifyJoined)}})
    }
  });
  observer.observe(stage,{childList:true,subtree:true});
  stage.querySelectorAll(':scope > .joined').forEach(qualifyJoined);

  // A third/fourth photo can be added by releasing it close to an existing
  // same-type collection. This keeps the established drag physics untouched.
  stage.addEventListener('pointermove',e=>{
    const o=e.target.closest?.('.object[data-kind="image"]');
    if(!o||o.parentElement!==stage)return;
    collections().forEach(g=>g.classList.remove('collection-ready'));
    const g=nearestCollection(o,210);if(g&&(+g.dataset.count||2)<4)g.classList.add('collection-ready');
  },true);

  stage.addEventListener('pointerup',e=>{
    const o=e.target.closest?.('.object[data-kind="image"]');
    collections().forEach(g=>g.classList.remove('collection-ready'));
    if(!o||o.parentElement!==stage)return;
    const g=nearestCollection(o,205);
    if(g)setTimeout(()=>mergeIntoCollection(o,g),0);
  },true);

  // For collections larger than two, a two-finger pull peels the most recent
  // photo back out into the workspace. Two-photo collections retain the
  // original sandbox split gesture unchanged.
  const touches=new Map();
  let peel=null;
  stage.addEventListener('pointerdown',e=>{
    const g=e.target.closest?.('.joined.photo-collection');
    if(!g||(+g.dataset.count||2)<=2)return;
    touches.set(e.pointerId,{g,x:e.clientX,y:e.clientY});
    const same=[...touches.entries()].filter(([,p])=>p.g===g);
    if(same.length===2){
      e.preventDefault();e.stopPropagation();
      const [a,b]=same.map(([,p])=>p);
      peel={g,ids:same.map(([id])=>id),base:Math.hypot(b.x-a.x,b.y-a.y),done:false};
    }
  },true);
  stage.addEventListener('pointermove',e=>{
    const p=touches.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
    if(!peel||peel.done||!peel.ids.includes(e.pointerId))return;
    const pts=peel.ids.map(id=>touches.get(id)).filter(Boolean);if(pts.length<2)return;
    const d=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);
    if(d-peel.base<48)return;
    peel.done=true;
    const g=peel.g,photos=[...g.children].filter(el=>el.classList?.contains('object')&&el.dataset.kind==='image');
    const o=photos.at(-1);if(!o)return;
    stage.appendChild(o);o.style.zIndex='999';setPos(o,pts[1].x,pts[1].y);updateCollection(g);
  },true);
  const finish=e=>{touches.delete(e.pointerId);if(peel&&peel.ids.includes(e.pointerId))peel=null};
  stage.addEventListener('pointerup',finish,true);stage.addEventListener('pointercancel',finish,true);
})();