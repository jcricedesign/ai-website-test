if(sessionStorage.getItem('tbg-auth')!=='1') location.replace('/barber-game/');
window.OOBE=[];
window.registerSteps=(items)=>OOBE.push(...items);
window.addEventListener('DOMContentLoaded',()=>{
  const nav=document.getElementById('states');
  const screen=document.getElementById('screen');
  const caption=document.getElementById('caption');
  OOBE.forEach((s,i)=>{
    const b=document.createElement('button');
    b.className='state'+(i===0?' active':'');
    b.dataset.id=s.id;
    b.textContent=s.label;
    b.onclick=()=>show(s.id);
    nav.appendChild(b);
  });
  function show(id){
    const s=OOBE.find(x=>x.id===id)||OOBE[0];
    screen.innerHTML=s.html;
    [...nav.children].forEach(b=>b.classList.toggle('active',b.dataset.id===id));
    caption.textContent=s.caption;
  }
  show(OOBE[0].id);
});