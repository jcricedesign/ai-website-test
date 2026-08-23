(()=>{
  const stage=document.getElementById('stage');
  let timer=null;
  let pending=null;
  let selected=null;
  let controlFrame=null;
  const HOLD_MS=480;
  const MOVE_TOLERANCE=12;

  // Keep this mode visually self-contained so rapid Safari caching cannot
  // leave the controls unstyled while we iterate.
  const style=document.createElement('style');
  style.textContent=`
    body.transform-mode #stage>.object:not(.transform-selected),
    body.transform-mode #stage>.joined{opacity:.22!important;filter:saturate(.65)!important}
    body.transform-mode #add{opacity:.2!important;pointer-events:none!important}
    .object.transform-selected{--scale:1.34!important;box-shadow:0 26px 60px rgba(0,0,0,.26)!important;filter:brightness(1.08)!important}
    #transformPanel{position:fixed!important;z-index:5000!important;display:flex!important;align-items:center!important;gap:14px!important;opacity:0;pointer-events:none;transform:translateY(8px) scale(.96);transition:opacity 150ms ease,transform 150ms ease}
    #transformPanel.visible{opacity:1!important;pointer-events:auto!important;transform:translateY(0) scale(1)!important}
    #transformPanel button{appearance:none;-webkit-appearance:none;min-width:76px;height:76px;border:0;border-radius:24px;background:#161616;color:#fff;font:500 36px/1 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.2);touch-action:none;padding:0}
    #transformPanel button.pressed{transform:scale(.94)}
    #transformPanel .done{min-width:104px;padding:0 22px;font-size:18px;font-weight:700}
  `;
  document.head.appendChild(style);

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
  function setAngle(o,a){a=((a%360)+360)%360;o.dataset.angle=String(a);o.style.setProperty('--angle',a+'deg')}
  function clearPending(){if(timer){clearTimeout(timer);timer=null}pending=null}

  function makeControlFrame(o){
    const r=o.getBoundingClientRect();
    // Use a rotation-invariant radius around the object's center. The controls
    // remain attached to this frame rather than chasing the changing bounds of
    // an asymmetric shape as it rotates.
    return{
      cx:r.left+r.width/2,
      cy:r.top+r.height/2,
      radius:Math.hypot(r.width,r.height)*.5*1.34
    };
  }

  function enter(o){
    clearPending();
    if(selected&&selected!==o)exit();
    controlFrame=makeControlFrame(o);
    selected=o;
    document.body.classList.add('transform-mode');
    o.classList.remove('edge-near','magnetic');
    o.classList.add('transform-selected');
    o.style.zIndex='4000';
    panel.classList.add('visible');
    requestAnimationFrame(positionPanel);
  }

  function exit(){
    if(!selected)return;
    selected.classList.remove('transform-selected','rotation-snap');
    selected.style.zIndex='';
    selected=null;
    controlFrame=null;
    panel.classList.remove('visible');
    document.body.classList.remove('transform-mode');
  }

  function positionPanel(){
    if(!selected||!controlFrame)return;
    const pw=panel.getBoundingClientRect().width||286;
    const ph=panel.getBoundingClientRect().height||76;
    const gap=34;
    let left=controlFrame.cx-pw/2;
    let top=controlFrame.cy+controlFrame.radius+gap;
    left=Math.max(20,Math.min(window.innerWidth-pw-20,left));
    if(top+ph>window.innerHeight-24){
      top=controlFrame.cy-controlFrame.radius-ph-gap;
    }
    panel.style.left=left+'px';
    panel.style.top=Math.max(20,top)+'px';
  }

  function rotate(delta){
    if(!selected)return;
    setAngle(selected,angleOf(selected)+delta);
    selected.classList.add('rotation-snap');
    setTimeout(()=>{if(selected)selected.classList.remove('rotation-snap')},120);
    // Deliberately do not reposition the controls here. They are attached to
    // the stable object frame established when transform mode began.
  }

  requestAnimationFrame(()=>{
    const first=stage.querySelector(':scope > .object[data-id="1"]');
    if(first)first.dataset.shape='arrow';
  });

  stage.addEventListener('pointerdown',e=>{
    if(selected)return;
    const o=standaloneObject(e.target);
    if(!o)return;
    pending={id:e.pointerId,o,x:e.clientX,y:e.clientY};
    timer=setTimeout(()=>{
      if(pending&&pending.id===e.pointerId)enter(o);
    },HOLD_MS);
  },true);

  stage.addEventListener('pointermove',e=>{
    if(!pending||pending.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>MOVE_TOLERANCE)clearPending();
  },true);

  function finish(e){
    if(pending&&pending.id===e.pointerId)clearPending();
  }
  stage.addEventListener('pointerup',finish,true);
  stage.addEventListener('pointercancel',finish,true);

  panel.addEventListener('pointerdown',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    b.classList.add('pressed');
  });
  panel.addEventListener('pointerup',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    b.classList.remove('pressed');
    const action=b.dataset.action;
    if(action==='left')rotate(-45);
    else if(action==='right')rotate(45);
    else if(action==='done')exit();
  });
  panel.addEventListener('pointercancel',e=>{
    const b=e.target.closest('button');
    if(b)b.classList.remove('pressed');
  });

  window.addEventListener('resize',()=>{
    if(selected){controlFrame=makeControlFrame(selected);positionPanel()}
  });
})();