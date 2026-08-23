(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const style=document.createElement('style');
  style.textContent=`
    .joined.photo-collection.collection-presented .collection-count{
      right:10px!important;
      top:42px!important;
      transform:scale(.88)!important;
      transition:right 160ms ease,top 160ms ease,transform 160ms ease;
    }
  `;
  document.head.appendChild(style);

  function sync(){
    stage.querySelectorAll(':scope > .joined.photo-collection').forEach(g=>{
      const badge=g.querySelector(':scope > .collection-count');
      if(!badge)return;
      if(g.dataset.docked==='top'){
        badge.style.setProperty('right','10px','important');
        badge.style.setProperty('top','42px','important');
        badge.style.setProperty('transform','scale(.88)','important');
      }else{
        badge.style.removeProperty('right');
        badge.style.removeProperty('top');
        badge.style.removeProperty('transform');
      }
    });
  }

  ['pointerup','pointercancel','lostpointercapture','pointerdown'].forEach(type=>stage.addEventListener(type,()=>{
    setTimeout(sync,80);
    setTimeout(sync,500);
  },true));
  window.addEventListener('pageshow',()=>setTimeout(sync,650));
  setTimeout(sync,650);
})();
