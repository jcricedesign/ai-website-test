(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;
  const style=document.createElement('style');
  style.textContent=`
    .object[data-kind="image"].presented{--scale:.58!important;transition:transform 180ms cubic-bezier(.2,.8,.2,1),box-shadow 160ms ease,filter 150ms ease}
    .object[data-kind="image"].presented{box-shadow:0 10px 24px rgba(0,0,0,.18)!important}
  `;
  document.head.appendChild(style);
  let layingOut=false;
  function setPos(el,x,y){el.dataset.x=String(x);el.dataset.y=String(y);el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px')}
  function presented(){return [...stage.querySelectorAll(':scope > .object[data-kind="image"][data-docked="top"]')]}
  function layout(){if(layingOut)return;layingOut=true;requestAnimationFrame(()=>{const items=presented(),r=stage.getBoundingClientRect();const n=items.length;if(!n){layingOut=false;return}const usable=Math.max(240,r.width-80),gap=Math.min(170,usable/Math.max(1,n));const total=gap*(n-1),start=r.width/2-total/2;items.forEach((o,i)=>{if(!o.classList.contains('presented'))o.classList.add('presented');setPos(o,start+i*gap,72)});layingOut=false})}
  function sync(){[...stage.querySelectorAll(':scope > .object[data-kind="image"]')].forEach(o=>{if(o.dataset.docked!=='top'&&o.classList.contains('presented'))o.classList.remove('presented')});layout()}
  stage.addEventListener('pointerdown',e=>{const o=e.target.closest?.('.object[data-kind="image"]');if(o&&o.parentElement===stage&&o.dataset.docked==='top')o.classList.remove('presented')},true);
  const observer=new MutationObserver(sync);
  observer.observe(stage,{subtree:true,attributes:true,attributeFilter:['data-docked'],childList:true});
  window.addEventListener('resize',layout);
  sync();
})();
