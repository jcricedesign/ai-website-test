(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const poses=[
    {x:'-54%',y:'-49%',r:'-6deg',s:'.90'},
    {x:'-52%',y:'-50%',r:'-2deg',s:'.92'},
    {x:'-49%',y:'-50%',r:'2.5deg',s:'.93'},
    {x:'-46%',y:'-49%',r:'6deg',s:'.91'}
  ];

  const photosIn=g=>[...g.children].filter(el=>el.classList?.contains('object')&&el.dataset.kind==='image');

  function layout(g){
    if(!g?.isConnected||!g.classList.contains('photo-collection'))return;
    photosIn(g).forEach((o,i)=>{
      const p=poses[Math.min(i,3)];
      // Critical: the base object rule positions photos with --x/--y. Clear those
      // inherited coordinates once the photo becomes a child of a collection.
      o.style.setProperty('--x','0px');
      o.style.setProperty('--y','0px');
      o.style.setProperty('position','absolute','important');
      o.style.setProperty('left','50%','important');
      o.style.setProperty('top','50%','important');
      o.style.setProperty('margin','0','important');
      o.style.setProperty('z-index',String(i+1),'important');
      o.style.setProperty('transform',`translate(${p.x},${p.y}) rotate(${p.r}) scale(${p.s})`,'important');
      o.style.setProperty('transform-origin','center','important');
      o.style.setProperty('pointer-events','none','important');
    });
  }

  function layoutAll(){stage.querySelectorAll(':scope > .joined.photo-collection').forEach(layout)}

  // The original merge completes after 280ms. Re-apply only visual stack geometry
  // after that state transition; do not alter merge, count, split, or gesture logic.
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>stage.addEventListener(type,()=>{
    setTimeout(layoutAll,310);
    setTimeout(layoutAll,390);
  },true));
  window.addEventListener('pageshow',()=>setTimeout(layoutAll,450));
  setTimeout(layoutAll,450);
})();
