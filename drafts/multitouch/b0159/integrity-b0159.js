(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const photosIn=g=>[...g.children].filter(el=>el.classList?.contains('object')&&el.dataset.kind==='image');
  const setPos=(el,x,y)=>{
    el.dataset.x=String(x);el.dataset.y=String(y);
    el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px');
  };

  function updateStatus(){
    const n=stage.querySelectorAll(':scope > .object,:scope > .joined').length;
    const status=document.getElementById('status');
    if(status)status.textContent=`${n} ${n===1?'object':'objects'}`;
  }

  function normalize(g){
    if(!g?.isConnected||!g.classList?.contains('photo-collection'))return;
    const photos=photosIn(g);

    // A collection is only meaningful with 2+ members. If peeling leaves one,
    // return that photo to the workspace and remove the empty wrapper.
    if(photos.length<2){
      const lone=photos[0];
      if(lone){
        const x=Number(g.dataset.x)||stage.clientWidth/2;
        const y=Number(g.dataset.y)||stage.clientHeight/2;
        stage.appendChild(lone);
        lone.style.zIndex='999';
        setPos(lone,x,y);
      }
      g.remove();
      updateStatus();
      return;
    }

    // The DOM is the source of truth. Never increment/decrement a stored count.
    // Re-derive it from the actual photo children after every structural change.
    g.dataset.count=String(photos.length);
    let badge=g.querySelector(':scope > .collection-count');
    if(!badge){
      badge=document.createElement('div');
      badge.className='collection-count';
      g.appendChild(badge);
    }
    badge.textContent=String(photos.length);
    updateStatus();
  }

  function normalizeAll(){
    stage.querySelectorAll(':scope > .joined.photo-collection').forEach(normalize);
  }

  // Observe structural changes inside stacks. This catches peel operations,
  // merges, and rapid multi-touch sequences after the existing handlers settle.
  const observer=new MutationObserver(records=>{
    const touched=new Set();
    for(const r of records){
      const g=r.target.closest?.('.joined.photo-collection');
      if(g)touched.add(g);
      r.addedNodes.forEach(n=>{
        if(n.nodeType===1&&n.classList?.contains('photo-collection'))touched.add(n);
      });
    }
    queueMicrotask(()=>{touched.forEach(normalize);normalizeAll()});
  });
  observer.observe(stage,{childList:true,subtree:true});

  // Pointer completion is another useful synchronization boundary, especially
  // when several existing gesture handlers fire during the same release.
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
    stage.addEventListener(type,()=>setTimeout(normalizeAll,0),true);
  });

  normalizeAll();
})();