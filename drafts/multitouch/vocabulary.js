(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const style=document.createElement('style');
  style.textContent=`
    #verbVocabulary{position:fixed;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity 140ms ease}
    #verbVocabulary.visible{opacity:1}
    .verb-edge{position:absolute;display:flex;align-items:center;justify-content:center;font:700 12px/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(0,0,0,.66);transition:opacity 120ms ease,transform 120ms ease}
    .verb-edge::before{content:"";position:absolute;background:var(--verb-color);opacity:.72;border-radius:999px;box-shadow:0 0 24px color-mix(in srgb,var(--verb-color) 38%,transparent)}
    .verb-edge span{position:relative;background:rgba(244,241,234,.86);padding:7px 10px;border-radius:999px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .verb-top{--verb-color:#e5483f;top:10px;left:50%;transform:translateX(-50%);padding-top:12px}.verb-top::before{top:0;width:96px;height:5px}
    .verb-right{--verb-color:#356fd4;right:10px;top:50%;transform:translateY(-50%);padding-right:12px}.verb-right::before{right:0;width:5px;height:96px}
    .verb-bottom{--verb-color:#e3ae24;bottom:10px;left:50%;transform:translateX(-50%);padding-bottom:12px}.verb-bottom::before{bottom:0;width:96px;height:5px}
    .verb-left{--verb-color:#2e9967;left:10px;top:50%;transform:translateY(-50%);padding-left:12px}.verb-left::before{left:0;width:5px;height:96px}
    body.transform-mode #verbVocabulary{opacity:0!important}
  `;
  document.head.appendChild(style);

  const vocabulary=document.createElement('div');
  vocabulary.id='verbVocabulary';
  vocabulary.setAttribute('aria-hidden','true');
  vocabulary.innerHTML=`
    <div class="verb-edge verb-top"><span>Present</span></div>
    <div class="verb-edge verb-right"><span>Share</span></div>
    <div class="verb-edge verb-bottom"><span>Archive</span></div>
    <div class="verb-edge verb-left"><span>Related</span></div>`;
  document.body.appendChild(vocabulary);

  const activePointers=new Set();
  function isWorkspaceObject(target){return !!target.closest?.('.object,.joined')}
  function show(e){
    if(document.body.classList.contains('transform-mode'))return;
    if(!isWorkspaceObject(e.target))return;
    activePointers.add(e.pointerId);
    vocabulary.classList.add('visible');
  }
  function hide(e){
    activePointers.delete(e.pointerId);
    if(!activePointers.size)vocabulary.classList.remove('visible');
  }
  stage.addEventListener('pointerdown',show,true);
  stage.addEventListener('pointerup',hide,true);
  stage.addEventListener('pointercancel',hide,true);
  stage.addEventListener('lostpointercapture',hide,true);
})();
