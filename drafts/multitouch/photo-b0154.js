(()=>{
  const stage=document.getElementById('stage');
  const add=document.getElementById('add');
  const photos=[
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=82'
  ];
  const style=document.createElement('style');
  style.textContent=`
    .object[data-kind="image"]{width:264px!important;height:202px!important;padding:10px 10px 28px!important;border-radius:7px!important;background:#f8f6ef!important;box-shadow:0 7px 20px rgba(0,0,0,.13),0 1px 2px rgba(0,0,0,.12)!important;overflow:hidden!important}
    .object[data-kind="image"] .photo-print{position:relative;width:100%;height:100%;overflow:hidden;border-radius:2px;background:#777 center/cover no-repeat;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);pointer-events:none}
    .object[data-kind="image"] .photo-print::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.7) 43%,rgba(255,255,255,.18) 51%,transparent 68%);transform:translateX(-150%);opacity:0;pointer-events:none}
    .object[data-kind="image"].active{box-shadow:0 24px 48px rgba(0,0,0,.25),0 5px 12px rgba(0,0,0,.13)!important;filter:brightness(1.025)}
    .object[data-kind="image"].active .photo-print::after{animation:photoGlint 190ms ease-out 1}
    @keyframes photoGlint{0%{transform:translateX(-150%);opacity:0}20%{opacity:.8}100%{transform:translateX(150%);opacity:0}}
  `;
  document.head.appendChild(style);
  requestAnimationFrame(()=>{
    let objects=[...stage.querySelectorAll(':scope > .object')];
    while(objects.length<4&&add){add.click();objects=[...stage.querySelectorAll(':scope > .object')]}
    objects=objects.slice(0,4);
    if(!objects.length)return;
    const r=stage.getBoundingClientRect();
    const positions=[[r.width*.34,r.height*.38],[r.width*.64,r.height*.36],[r.width*.38,r.height*.65],[r.width*.67,r.height*.64]];
    objects.forEach((o,i)=>{
      o.dataset.shape='photo';o.dataset.kind='image';o.textContent='';o.style.backgroundImage='none';o.style.setProperty('--size','202px');
      const print=document.createElement('div');print.className='photo-print';print.style.backgroundImage=`url("${photos[i]}")`;o.appendChild(print);
      const [x,y]=positions[i];o.dataset.x=String(x);o.dataset.y=String(y);o.style.setProperty('--x',x+'px');o.style.setProperty('--y',y+'px');
    });
    if(add)add.remove();
    const status=document.getElementById('status');if(status)status.textContent='4 image objects';
  });
})();
