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
    firstName:'',
    lastName:'',
    email:'',
    password:'',
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
  const hiddenSteps=new Set();

  const eyeOpen='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  const eyeClosed='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3 3.7M6.3 6.3C3.6 8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M9.9 9.9A3 3 0 0 0 14.1 14.1"/></svg>';

  OOBE.forEach((s,i)=>{
    const row=document.createElement('div');
    row.className='state'+(i===0?' active':'');
    row.dataset.id=s.id;

    const eye=document.createElement('button');
    eye.className='state-eye';
    eye.type='button';
    eye.setAttribute('aria-label','Hide '+s.label+' from flow');
    eye.innerHTML=eyeOpen;
    eye.onclick=e=>{
      e.stopPropagation();
      if(hiddenSteps.has(i)) hiddenSteps.delete(i); else hiddenSteps.add(i);
      row.classList.toggle('hidden-step',hiddenSteps.has(i));
      eye.innerHTML=hiddenSteps.has(i)?eyeClosed:eyeOpen;
      eye.setAttribute('aria-label',(hiddenSteps.has(i)?'Show ':'Hide ')+s.label+' in flow');
    };

    const select=document.createElement('button');
    select.className='state-select';
    select.type='button';
    select.innerHTML='<span class="state-num">'+(i+1)+'</span><span class="state-label">'+s.label+'</span>';
    select.onclick=()=>show(i);

    row.append(eye,select);
    nav.appendChild(row);
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
    [...nav.children].forEach((row,i)=>{
      row.classList.toggle('active',i===current);
      row.classList.toggle('complete',i<current);
    });
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
      const save=()=>{state[key]=el.value; validateCurrent(false)};
      el.addEventListener('input',save);
      el.addEventListener('change',save);
      el.addEventListener('blur',()=>{el.dataset.touched='1';validateCurrent(false)});
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

    function fieldMessage(el,message){
      const field=el.closest('.field');
      if(!field) return;
      const msg=field.querySelector('.field-message');
      field.classList.toggle('invalid',!!message);
      if(msg) msg.textContent=message||msg.dataset.default||'';
    }
    function validateCurrent(force){
      const required=[...screen.querySelectorAll('[data-required]')];
      let valid=true;
      required.forEach(el=>{
        let message='';
        const value=(el.value||'').trim();
        if(!value) message='Required';
        else if(el.dataset.validate==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message='Enter a valid email address';
        else if(el.dataset.validate==='password' && value.length<8) message='Use at least 8 characters';
        if(message) valid=false;
        if(force || el.dataset.touched==='1' || value) fieldMessage(el,message);
        else fieldMessage(el,'');
      });
      const gated=screen.querySelector('[data-gated-next]');
      if(gated){
        gated.disabled=!valid;
        gated.classList.toggle('ready',valid);
      }
      return valid;
    }

    screen.querySelectorAll('[data-send-code]').forEach(btn=>btn.onclick=()=>{
      btn.textContent='Code sent';
      const code=screen.querySelector('[data-key="code"]');
      if(code) code.focus();
    });
    const nextVisible=direction=>{
      let i=current+direction;
      while(i>=0 && i<OOBE.length && hiddenSteps.has(i)) i+=direction;
      if(i>=0 && i<OOBE.length) show(i);
    };
    screen.querySelectorAll('[data-next]').forEach(btn=>btn.onclick=()=>{
      if(btn.hasAttribute('data-gated-next') && !validateCurrent(true)) return;
      nextVisible(1);
    });
    screen.querySelectorAll('[data-prev]').forEach(btn=>btn.onclick=()=>nextVisible(-1));
    screen.querySelectorAll('[data-restart]').forEach(btn=>btn.onclick=()=>show(0));
    validateCurrent(false);
  }

  function fitPhone(){
    const stage=document.querySelector('.stage');
    const phone=document.querySelector('.phone');
    if(!stage||!phone) return;
    phone.style.transform='translate(-50%,-50%) scale(1)';
    const box=stage.getBoundingClientRect();
    const caption=document.getElementById('caption');
    const captionH=caption?caption.getBoundingClientRect().height:0;
    const maxH=Math.max(420,window.innerHeight-box.top-captionH-54);
    const maxW=Math.max(280,stage.clientWidth-12);
    const scale=Math.min(1,maxH/866,maxW/414);
    phone.style.transform='translate(-50%,-50%) scale('+scale+')';
    stage.style.height=maxH+'px';
  }
  window.addEventListener('resize',fitPhone);
  show(0);
  requestAnimationFrame(fitPhone);
});