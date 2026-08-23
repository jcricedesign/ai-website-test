(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const style=document.createElement('style');
  style.textContent=`
    #verbVocabulary{position:fixed;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity 140ms ease}
    #verbVocabulary.visible{opacity:1}
    .verb-edge{position:absolute;display:flex;align-items:center;justify-content:center;font:700 12px/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(0,0,0,.66);opacity:.56;transition:opacity 120ms ease,filter 120ms ease}
    .verb-edge::before{content:"";position:absolute;background:var(--verb-color);opacity:.62;border-radius:999px;box-shadow:0 0 24px color-mix(in srgb,var(--verb-color) 38%,transparent);transition:opacity 100ms ease,box-shadow 100ms ease,width 100ms ease,height 100ms ease}
    .verb-edge span{position:relative;background:rgba(244,241,234,.86);padding:7px 10px;border-radius:999px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .verb-top{--verb-color:#e5483f;top:10px;left:50%;transform:translateX(-50%);padding-top:12px}.verb-top::before{top:0;width:var(--edge-span,96px);height:5px}
    .verb-right{--verb-color:#356fd4;right:10px;top:50%;transform:translateY(-50%);padding-right:12px}.verb-right::before{right:0;width:5px;height:var(--edge-span,96px)}
    .verb-bottom{--verb-color:#e3ae24;bottom:10px;left:50%;transform:translateX(-50%);padding-bottom:12px}.verb-bottom::before{bottom:0;width:var(--edge-span,96px);height:5px}
    .verb-left{--verb-color:#2e9967;left:10px;top:50%;transform:translateY(-50%);padding-left:12px}.verb-left::before{left:0;width:5px;height:var(--edge-span,96px)}
    .verb-edge.intent{opacity:1;filter:saturate(1.12)}
    .verb-edge.intent::before{opacity:.92;box-shadow:0 0 38px color-mix(in srgb,var(--verb-color) 58%,transparent)}
    .verb-edge.commit::before{opacity:1;box-shadow:0 0 54px color-mix(in srgb,var(--verb-color) 72%,transparent)}
    body.transform-mode #verbVocabulary{opacity:0!important}
  `;
  document.head.appendChild(style);

  const vocabulary=document.createElement('div');
  vocabulary.id='verbVocabulary';
  vocabulary.setAttribute('aria-hidden','true');
  vocabulary.innerHTML=`
    <div class="verb-edge verb-top" data-edge="top"><span>Present</span></div>
    <div class="verb-edge verb-right" data-edge="right"><span>Share</span></div>
    <div class="verb-edge verb-bottom" data-edge="bottom"><span>Archive</span></div>
    <div class="verb-edge verb-left" data-edge="left"><span>Related</span></div>`;
  document.body.appendChild(vocabulary);

  const edgeEls=Object.fromEntries([...vocabulary.querySelectorAll('.verb-edge')].map(el=>[el.dataset.edge,el]));
  const activePointers=new Set(),pointerObjects=new Map();
  const INTENT=170,COMMIT=72;
  function isWorkspaceObject(target){return target.closest?.('.object,.joined')||null}
  function clearIntent(){Object.values(edgeEls).forEach(el=>{el.classList.remove('intent','commit');el.style.removeProperty('--edge-span')})}
  function objectEdge(el){
    const sr=stage.getBoundingClientRect(),r=el.getBoundingClientRect();
    const d={left:r.left-sr.left,right:sr.right-r.right,top:r.top-sr.top,bottom:sr.bottom-r.bottom};
    const edge=Object.keys(d).reduce((a,b)=>d[a]<d[b]?a:b);
    return{edge,distance:d[edge],sr,r};
  }
  function show(e){
    if(document.body.classList.contains('transform-mode'))return;
    const obj=isWorkspaceObject(e.target);if(!obj)return;
    activePointers.add(e.pointerId);pointerObjects.set(e.pointerId,obj);
    vocabulary.classList.add('visible');clearIntent();
  }
  function move(e){
    const obj=pointerObjects.get(e.pointerId);if(!obj)return;
    clearIntent();const hit=objectEdge(obj);
    if(hit.distance>=INTENT)return;
    const edge=edgeEls[hit.edge];if(!edge)return;
    const force=Math.max(0,Math.min(1,(INTENT-hit.distance)/INTENT));
    const axisSize=(hit.edge==='left'||hit.edge==='right')?hit.sr.height:hit.sr.width;
    const span=Math.min(axisSize*.88,96+force*axisSize*.62);
    edge.style.setProperty('--edge-span',span+'px');
    edge.classList.add('intent');
    if(hit.distance<COMMIT)edge.classList.add('commit');
  }
  function hide(e){
    activePointers.delete(e.pointerId);pointerObjects.delete(e.pointerId);clearIntent();
    if(!activePointers.size)vocabulary.classList.remove('visible');
  }
  stage.addEventListener('pointerdown',show,true);
  stage.addEventListener('pointermove',move,true);
  stage.addEventListener('pointerup',hide,true);
  stage.addEventListener('pointercancel',hide,true);
  stage.addEventListener('lostpointercapture',hide,true);
})();
