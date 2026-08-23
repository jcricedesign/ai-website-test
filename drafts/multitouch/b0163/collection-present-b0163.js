(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const style=document.createElement('style');
  style.textContent=`
    .joined.photo-collection.collection-presented{
      filter:drop-shadow(0 10px 18px rgba(0,0,0,.18));
    }
    .joined.photo-collection.collection-presented .collection-count{
      transform:scale(.9);
    }
  `;
  document.head.appendChild(style);

  const compact=[
    {left:'50%',top:'50%',tx:'-54%',ty:'-49%',r:'-6deg',s:'.90'},
    {left:'50%',top:'50%',tx:'-52%',ty:'-50%',r:'-2deg',s:'.92'},
    {left:'50%',top:'50%',tx:'-49%',ty:'-50%',r:'2.5deg',s:'.93'},
    {left:'50%',top:'50%',tx:'-46%',ty:'-49%',r:'6deg',s:'.91'}
  ];
  const open=[
    {left:'24%',top:'51%',tx:'-50%',ty:'-50%',r:'-4deg',s:'.48'},
    {left:'41%',top:'48%',tx:'-50%',ty:'-50%',r:'-1.5deg',s:'.50'},
    {left:'59%',top:'48%',tx:'-50%',ty:'-50%',r:'1.5deg',s:'.50'},
    {left:'76%',top:'51%',tx:'-50%',ty:'-50%',r:'4deg',s:'.48'}
  ];

  const photosIn=g=>[...g.children].filter(el=>el.classList?.contains('object')&&el.dataset.kind==='image');

  function applyPose(g,poses){
    photosIn(g).forEach((o,i)=>{
      const p=poses[Math.min(i,poses.length-1)];
      o.style.setProperty('--x','0px');
      o.style.setProperty('--y','0px');
      o.style.setProperty('position','absolute','important');
      o.style.setProperty('left',p.left,'important');
      o.style.setProperty('top',p.top,'important');
      o.style.setProperty('margin','0','important');
      o.style.setProperty('z-index',String(i+1),'important');
      o.style.setProperty('transform',`translate(${p.tx},${p.ty}) rotate(${p.r}) scale(${p.s})`,'important');
      o.style.setProperty('transform-origin','center','important');
      o.style.setProperty('pointer-events','none','important');
    });
  }

  function syncCollection(g){
    if(!g?.isConnected||!g.classList.contains('photo-collection'))return;
    const atPresent=g.dataset.docked==='top';
    g.classList.toggle('collection-presented',atPresent);
    applyPose(g,atPresent?open:compact);
  }

  function syncAll(){stage.querySelectorAll(':scope > .joined.photo-collection').forEach(syncCollection)}

  // Existing physics own the actual docking and undocking. This layer only
  // changes the collection's visual posture after that state has settled.
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>{
    stage.addEventListener(type,()=>{
      setTimeout(syncAll,420);
      setTimeout(syncAll,560);
    },true);
  });

  // Pulling a presented collection starts with pointerdown; after the base
  // handler clears data-docked, restore the compact workspace stack promptly.
  stage.addEventListener('pointerdown',e=>{
    const g=e.target.closest?.('.joined.photo-collection');
    if(!g)return;
    setTimeout(()=>syncCollection(g),0);
    setTimeout(()=>syncCollection(g),60);
  },true);

  window.addEventListener('pageshow',()=>setTimeout(syncAll,600));
  setTimeout(syncAll,600);
})();
