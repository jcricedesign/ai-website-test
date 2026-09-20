if(sessionStorage.getItem('tbg-auth')!=='1') location.replace('/barber-game/');
window.OOBE=[];
window.registerSteps=(items)=>OOBE.push(...items);

window.addEventListener('DOMContentLoaded',()=>{
  const nav=document.getElementById('states');
  const screen=document.getElementById('screen');
  const caption=document.getElementById('caption');
  const state={
    phone:'425-555-1212',
    code:'45678',
    firstName:'John',
    lastName:'Rice',
    email:'john.rice@gmail.com',
    username:'overweightunicorn',
    workType:'Home',
    address:'17624 15th Ave SE #101A, Bothell, WA 98012',
    license:'4019',
    licenseType:'Barber',
    services:[
      {name:'Haircut',price:'22',duration:'30m'},
      {name:'Senior Haircut',price:'22',duration:'30m'},
      {name:'Haircut + Beard',price:'44',duration:'45m'}
    ],
    hours:'Mon–Wed · 9am–5pm',
    photo:null
  };
  let current=0;

  OOBE.forEach((s,i)=>{
    const b=document.createElement('button');
    b.className='state'+(i===0?' active':'');
    b.dataset.id=s.id;
    b.textContent=s.label;
    b.onclick=()=>show(i);
    nav.appendChild(b);
  });

  function profileHTML(){
    const name=((state.firstName||'')+' '+(state.lastName||'')).trim()||'Your name';
    const services=state.services.map(s=>'<div class="profile-service"><span>'+s.name+' · '+s.duration+'</span><strong>$'+s.price+'</strong></div>').join('');
    const photo=state.photo
      ? '<img class="profile-photo" src="'+state.photo+'" alt="Profile photo">'
      : '<div class="profile-photo fallback">'+(state.firstName||'B').slice(0,1)+(state.lastName||'G').slice(0,1)+'</div>';
    return '<div class="profile-preview">'+
      '<div class="profile-top">'+photo+'<div><div class="profile-kicker">@'+(state.username||'barber')+'</div><h2>'+name+'</h2><div class="profile-meta">'+(state.license?'Licensed '+state.licenseType+' · #'+state.license:'Barber profile')+'</div></div></div>'+
      '<div class="profile-section"><span class="profile-label">Working location</span><strong>'+state.workType+'</strong><p>'+state.address+'</p></div>'+
      '<div class="profile-section"><span class="profile-label">Availability</span><strong>'+state.hours+'</strong></div>'+
      '<div class="profile-section"><span class="profile-label">Services</span>'+services+'</div>'+
      '<div class="profile-section"><span class="profile-label">Contact</span><p>'+state.email+'<br>'+state.phone+'</p></div>'+
      '<button class="action" data-restart>Start over</button>'+
    '</div>';
  }

  function show(index){
    current=Math.max(0,Math.min(index,OOBE.length-1));
    const s=OOBE[current];
    screen.innerHTML=s.id==='profile' ? profileHTML() : s.html;
    [...nav.children].forEach((b,i)=>b.classList.toggle('active',i===current));
    caption.textContent=s.caption||'';
    hydrate();
    screen.scrollTop=0;
    const phone=document.querySelector('.phone');
    if(phone) phone.scrollTop=0;
  }

  function hydrate(){
    screen.querySelectorAll('[data-key]').forEach(el=>{
      const key=el.dataset.key;
      if(el.type==='file') return;
      if(state[key]!=null) el.value=state[key];
      const save=()=>{state[key]=el.value};
      el.addEventListener('input',save);
      el.addEventListener('change',save);
    });

    screen.querySelectorAll('[data-work]').forEach(btn=>{
      btn.classList.toggle('on',btn.dataset.work===state.workType);
      btn.onclick=()=>{
        state.workType=btn.dataset.work;
        screen.querySelectorAll('[data-work]').forEach(x=>x.classList.toggle('on',x===btn));
      };
    });

    const photo=screen.querySelector('[data-photo]');
    if(photo){
      photo.addEventListener('change',e=>{
        const file=e.target.files&&e.target.files[0];
        if(!file) return;
        const reader=new FileReader();
        reader.onload=()=>{state.photo=reader.result; const preview=screen.querySelector('.photo'); if(preview) preview.style.backgroundImage='url('+reader.result+')'};
        reader.readAsDataURL(file);
      });
    }

    screen.querySelectorAll('[data-next]').forEach(btn=>btn.onclick=()=>show(current+1));
    screen.querySelectorAll('[data-prev]').forEach(btn=>btn.onclick=()=>show(current-1));
    screen.querySelectorAll('[data-restart]').forEach(btn=>btn.onclick=()=>show(0));
  }

  show(0);
});