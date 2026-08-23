(()=>{
  const stage=document.getElementById('stage');
  const photo='https://images.musement.com/cover/0002/59/seattle-skyline-xl-jpg_header-158699.jpeg?fit=crop&h=630&q=60&w=1200';

  requestAnimationFrame(()=>{
    const objects=[...stage.querySelectorAll(':scope > .object')];
    if(!objects.length)return;
    const primary=objects[0];
    objects.slice(1).forEach(o=>o.remove());

    primary.dataset.shape='photo';
    primary.dataset.kind='image';
    primary.textContent='';
    primary.style.backgroundImage=`url("${photo}")`;
    primary.style.backgroundColor='#777';
    primary.style.backgroundSize='cover';
    primary.style.backgroundPosition='center';
    primary.style.width='240px';
    primary.style.height='160px';
    primary.style.setProperty('--size','160px');
    primary.style.borderRadius='16px';
    primary.style.overflow='hidden';

    const r=stage.getBoundingClientRect();
    primary.dataset.x=String(r.width/2);
    primary.dataset.y=String(r.height/2);
    primary.style.setProperty('--x',r.width/2+'px');
    primary.style.setProperty('--y',r.height/2+'px');

    const status=document.getElementById('status');
    if(status)status.textContent='1 image object';
  });
})();
