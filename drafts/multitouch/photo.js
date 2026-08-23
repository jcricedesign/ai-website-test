(()=>{
  const stage=document.getElementById('stage');
  const photo='https://images.musement.com/cover/0002/59/seattle-skyline-xl-jpg_header-158699.jpeg?fit=crop&h=630&q=60&w=1200';

  const style=document.createElement('style');
  style.textContent=`
    .object[data-kind="image"]{
      width:264px!important;
      height:202px!important;
      padding:10px 10px 28px!important;
      border-radius:7px!important;
      background:#f8f6ef!important;
      box-shadow:0 7px 20px rgba(0,0,0,.13),0 1px 2px rgba(0,0,0,.12)!important;
      overflow:hidden!important;
    }
    .object[data-kind="image"] .photo-print{
      position:relative;
      width:100%;height:100%;
      overflow:hidden;
      border-radius:2px;
      background:#777 center/cover no-repeat;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);
      pointer-events:none;
    }
    .object[data-kind="image"] .photo-print::after{
      content:"";
      position:absolute;inset:0;
      background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.7) 43%,rgba(255,255,255,.18) 51%,transparent 68%);
      transform:translateX(-150%);
      opacity:0;
      pointer-events:none;
    }
    .object[data-kind="image"].active{
      box-shadow:0 24px 48px rgba(0,0,0,.25),0 5px 12px rgba(0,0,0,.13)!important;
      filter:brightness(1.025);
    }
    .object[data-kind="image"].active .photo-print::after{animation:photoGlint 190ms ease-out 1}
    @keyframes photoGlint{
      0%{transform:translateX(-150%);opacity:0}
      20%{opacity:.8}
      100%{transform:translateX(150%);opacity:0}
    }
  `;
  document.head.appendChild(style);

  requestAnimationFrame(()=>{
    const objects=[...stage.querySelectorAll(':scope > .object')];
    if(!objects.length)return;
    const primary=objects[0];
    objects.slice(1).forEach(o=>o.remove());

    primary.dataset.shape='photo';
    primary.dataset.kind='image';
    primary.textContent='';
    primary.style.backgroundImage='none';
    primary.style.setProperty('--size','202px');

    const print=document.createElement('div');
    print.className='photo-print';
    print.style.backgroundImage=`url("${photo}")`;
    primary.appendChild(print);

    const r=stage.getBoundingClientRect();
    primary.dataset.x=String(r.width/2);
    primary.dataset.y=String(r.height/2);
    primary.style.setProperty('--x',r.width/2+'px');
    primary.style.setProperty('--y',r.height/2+'px');

    const status=document.getElementById('status');
    if(status)status.textContent='1 image object';
  });
})();
