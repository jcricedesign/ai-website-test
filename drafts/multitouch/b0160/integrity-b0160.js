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
    if(status)status.textContent=`${n} ${n===1?'object':'objects'} · 0 touches`;
  }

  function normalize(g){
    if(!g?.isConnected||!g.classList?.contains('photo-collection'))return;
    const photos=photosIn(g);

    if(photos.length===0){g.remove();return}

    if(photos.length===1){
      const lone=photos[0];
      const x=Number(g.dataset.x)||stage.clientWidth/2;
      const y=Number(g.dataset.y)||stage.clientHeight/2;
      stage.appendChild(lone);
      lone.style.zIndex='999';
      setPos(lone,x,y);
      g.remove();
      return;
    }

    g.dataset.count=String(photos.length);
    let badge=g.querySelector(':scope > .collection-count');
    if(!badge){badge=document.createElement('div');badge.className='collection-count';g.appendChild(badge)}
    badge.textContent=String(photos.length);
  }

  function audit(){
    stage.querySelectorAll(':scope > .joined.photo-collection').forEach(normalize);
    updateStatus();
  }

  let timer1=0,timer2=0;
  function scheduleAudit(){
    clearTimeout(timer1);clearTimeout(timer2);
    // Let the original 280ms unite animation and all pointer handlers finish first.
    timer1=setTimeout(audit,360);
    // One quiet second-pass catches rapid multi-touch releases without observing DOM mutations.
    timer2=setTimeout(audit,700);
  }

  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>stage.addEventListener(type,scheduleAudit,true));
  window.addEventListener('pageshow',()=>setTimeout(audit,500));
})();