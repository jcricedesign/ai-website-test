(()=>{
  const stage=document.getElementById('stage');
  const active=new Map();
  let rotating=null;

  function standaloneObject(target){
    const o=target.closest?.('.object');
    return o&&o.parentElement===stage?o:null;
  }

  function angleOf(o){return Number(o.dataset.angle||0)}
  function setAngle(o,a){o.dataset.angle=String(a);o.style.setProperty('--angle',a+'deg')}

  function snappedAngle(raw){
    const step=45;
    const nearest=Math.round(raw/step)*step;
    return Math.abs(raw-nearest)<=7?nearest:raw;
  }

  function beginRotation(o,anchorId,controlId,controlY){
    rotating={o,anchorId,controlId,startY:controlY,startAngle:angleOf(o),lastSnap:null};
    o.classList.add('rotating');
  }

  function endRotation(){
    if(!rotating)return;
    rotating.o.classList.remove('rotating','rotation-snap');
    rotating=null;
  }

  requestAnimationFrame(()=>{
    const first=stage.querySelector(':scope > .object[data-id="1"]');
    if(first)first.dataset.shape='arrow';
  });

  stage.addEventListener('pointerdown',e=>{
    const o=standaloneObject(e.target);
    if(!o)return;

    const existing=[...active.entries()].find(([,v])=>v.object===o);
    active.set(e.pointerId,{object:o,x:e.clientX,y:e.clientY});

    if(existing&&!rotating){
      e.preventDefault();
      e.stopPropagation();
      try{o.setPointerCapture(e.pointerId)}catch{}
      beginRotation(o,existing[0],e.pointerId,e.clientY);
    }
  },true);

  stage.addEventListener('pointermove',e=>{
    const p=active.get(e.pointerId);
    if(p){p.x=e.clientX;p.y=e.clientY}
    if(!rotating)return;

    if(e.pointerId===rotating.anchorId){
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if(e.pointerId!==rotating.controlId)return;
    e.preventDefault();
    e.stopPropagation();

    const deltaY=e.clientY-rotating.startY;
    const raw=rotating.startAngle+deltaY*.72;
    const angle=snappedAngle(raw);
    setAngle(rotating.o,angle);

    const isSnap=Math.abs(angle-raw)>.01;
    const snapKey=isSnap?angle:null;
    rotating.o.classList.toggle('rotation-snap',isSnap);
    if(snapKey!==rotating.lastSnap)rotating.lastSnap=snapKey;
  },true);

  function finishPointer(e){
    if(!active.has(e.pointerId))return;

    if(rotating&&e.pointerId===rotating.controlId){
      e.preventDefault();
      e.stopPropagation();
      active.delete(e.pointerId);
      endRotation();
      return;
    }

    if(rotating&&e.pointerId===rotating.anchorId){
      endRotation();
    }
    active.delete(e.pointerId);
  }

  stage.addEventListener('pointerup',finishPointer,true);
  stage.addEventListener('pointercancel',finishPointer,true);
})();