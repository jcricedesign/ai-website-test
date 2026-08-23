(()=>{
  const stage=document.getElementById('stage');
  let timer=null;
  let pending=null;
  let selected=null;
  const HOLD_MS=480;
  const MOVE_TOLERANCE=12;

  const panel=document.createElement('div');
  panel.id='transformPanel';
  panel.innerHTML=`
    <button type="button" data-action="left" aria-label="Rotate left">↺</button>
    <button type="button" data-action="right" aria-label="Rotate right">↻</button>
    <button type="button" data-action="done" class="done" aria-label="Done">Done</button>`;
  document.body.appendChild(panel);

  function standaloneObject(target){
    const o=target.closest?.('.object');
    return o&&o.parentElement===stage?o:null;
  }

  function angleOf(o){return Number(o.dataset.angle||0)}
  function setAngle(o,a){
    a=((a%360)+360)%360;
    o.dataset.angle=String(a);
    o.style.setProperty('--angle',a+'deg');
  }

  function clearPending(){
    if(timer){clearTimeout(timer);timer=null}
    pending=null;
  }

  function enter(o){
    clearPending();
    if(selected&&selected!==o)exit();
    selected=o;
    document.body.classList.add('transform-mode');
    o.classList.remove('active','edge-near','magnetic');
    o.classList.add('transform-selected');
    o.style.zIndex='1002';
    positionPanel();
    panel.classList.add('visible');
  }

  function exit(){
    if(!selected)return;
    selected.classList.remove('transform-selected','rotation-snap');
    selected.style.zIndex='';
    selected=null;
    panel.classList.remove('visible');
    document.body.classList.remove('transform-mode');
  }

  function positionPanel(){
    if(!selected)return;
    const r=selected.getBoundingClientRect();
    const pw=panel.offsetWidth||260;
    const ph=panel.offsetHeight||72;
    let left=r.left+r.width/2-pw/2;
    let top=r.bottom+26;
    left=Math.max(18,Math.min(window.innerWidth-pw-18,left));
    if(top+ph>window.innerHeight-18)top=r.top-ph-26;
    panel.style.left=left+'px';
    panel.style.top=Math.max(18,top)+'px';
  }

  function rotate(delta){
    if(!selected)return;
    setAngle(selected,angleOf(selected)+delta);
    selected.classList.add('rotation-snap');
    setTimeout(()=>selected&&selected.classList.remove('rotation-snap'),120);
    positionPanel();
  }

  // Keep object 1 asymmetric so rotation is visibly obvious.
  requestAnimationFrame(()=>{
    const first=stage.querySelector(':scope > .object[data-id="1"]');
    if(first)first.dataset.shape='arrow';
  });

  stage.addEventListener('pointerdown',e=>{
    if(selected){
      if(e.target===selected||selected.contains(e.target)){
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    const o=standaloneObject(e.target);
    if(!o)return;
    pending={id:e.pointerId,o,x:e.clientX,y:e.clientY};
    timer=setTimeout(()=>{
      if(pending&&pending.id===e.pointerId)enter(o);
    },HOLD_MS);
  },true);

  stage.addEventListener('pointermove',e=>{
    if(selected&&e.target===selected){
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if(!pending||pending.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>MOVE_TOLERANCE)clearPending();
  },true);

  function finish(e){
    if(pending&&pending.id===e.pointerId)clearPending();
    if(selected&&e.target===selected){
      e.preventDefault();
      e.stopPropagation();
    }
  }
  stage.addEventListener('pointerup',finish,true);
  stage.addEventListener('pointercancel',finish,true);

  panel.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
  panel.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    const action=b.dataset.action;
    if(action==='left')rotate(-45);
    if(action==='right')rotate(45);
    if(action==='done')exit();
  });

  window.addEventListener('resize',positionPanel);
})();