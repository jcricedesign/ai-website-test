(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const poses=[
    {x:'-53%',y:'-50%',r:'-6deg',s:'.90'},
    {x:'-51%',y:'-50%',r:'-2deg',s:'.92'},
    {x:'-49%',y:'-50%',r:'2deg',s:'.92'},
    {x:'-47%',y:'-50%',r:'6deg',s:'.90'}
  ];

  function photosIn(g){
    return [...g.children].filter(el=>el.classList?.contains('object')&&el.dataset.kind==='image');
  }

  function layout(g){
    if(!g?.isConnected||!g.classList.contains('photo-collection'))return;
    const photos=photosIn(g);
    photos.forEach((o,i)=>{
      const p=poses[Math.min(i,poses.length-1)];
      o.style.setProperty('position','absolute','important');
      o.style.setProperty('left','50%','important');
      o.style.setProperty('top','50%','important');
      o.style.setProperty('margin','0','important');
      o.style.setProperty('z-index',String(i+1),'important');
      o.style.setProperty('transform',`translate(${p.x},${p.y}) rotate(${p.r}) scale(${p.s})`,'important');
      o.style.setProperty('transform-origin','center','important');
    });
  }

  function layoutAll(){
    stage.querySelectorAll(':scope > .joined.photo-collection').forEach(layout);
  }

  // Run only after existing snap/merge handlers have completed. No observer,
  // no state changes: this layer is purely visual geometry.
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
    stage.addEventListener(type,()=>{
      setTimeout(layoutAll,340);
      setTimeout(layoutAll,520);
    },true);
  });

  setTimeout(layoutAll,500);
})();
