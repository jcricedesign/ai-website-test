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
    username:'',
    shop:'',
    license:'',
    licenseType:'',
    insurance:'',
    insuranceExpiration:'',
    businessLicense:'',
    businessLicenseExpiration:'',
    businessLicenseReminder:'30 days before',
    services:[
      {base:'Haircut Only (no beard)',name:'Haircut Only (no beard)',price:'22',duration:'30'}
    ],
    hours:[
      {day:'Monday',active:true,start:'09:00',end:'17:00'},
      {day:'Tuesday',active:true,start:'09:00',end:'17:00'},
      {day:'Wednesday',active:true,start:'09:00',end:'17:00'},
      {day:'Thursday',active:true,start:'09:00',end:'17:00'},
      {day:'Friday',active:true,start:'09:00',end:'17:00'},
      {day:'Saturday',active:false,start:'09:00',end:'17:00'},
      {day:'Sunday',active:false,start:'09:00',end:'17:00'}
    ],
    photo:null
  };
  let current=0;
  const hiddenSteps=new Set(OOBE.map((s,i)=>s.hidden?i:null).filter(i=>i!==null));

  const eyeOpen='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  const eyeClosed='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3 3.7M6.3 6.3C3.6 8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M9.9 9.9A3 3 0 0 0 14.1 14.1"/></svg>';

  OOBE.forEach((s,i)=>{
    const row=document.createElement('div');
    row.className='state'+(i===0?' active':'')+(hiddenSteps.has(i)?' hidden-step':'');
    row.dataset.id=s.id;

    const eye=document.createElement('button');
    eye.className='state-eye';
    eye.type='button';
    eye.setAttribute('aria-label',(hiddenSteps.has(i)?'Show ':'Hide ')+s.label+' in flow');
    eye.innerHTML=hiddenSteps.has(i)?eyeClosed:eyeOpen;
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

  function formatTime(value){
    const [h,m]=value.split(':').map(Number);
    const suffix=h>=12?'pm':'am';
    const hour=((h+11)%12)+1;
    return hour+(m?':'+String(m).padStart(2,'0'):'')+suffix;
  }

  function profileHTML(){
    const name=((state.firstName||'')+' '+(state.lastName||'')).trim()||'Your name';
    const services=state.services.map(s=>'<div class="profile-service"><span>'+s.name+' · '+s.duration+' min</span><strong>'+String.fromCharCode(36)+s.price+'</strong></div>').join('');
    const photo=state.photo
      ? '<img class="profile-photo" src="'+state.photo+'" alt="Profile photo">'
      : '<div class="profile-photo fallback">'+(state.firstName||'B').slice(0,1)+(state.lastName||'G').slice(0,1)+'</div>';
    return '<div class="profile-preview">'+
      '<div class="profile-top">'+photo+'<div><div class="profile-kicker">@'+(state.username||'barber')+'</div><h2>'+name+'</h2><div class="profile-meta">'+(state.license?'Licensed '+state.licenseType+' · #'+state.license:'Barber profile')+'</div></div></div>'+
      '<div class="profile-section"><span class="profile-label">Shop</span><strong>'+(state.shop||'Not selected')+'</strong></div>'+
      '<div class="profile-section"><span class="profile-label">Availability</span><strong>'+state.hours.filter(d=>d.active).map(d=>d.day.slice(0,3)+' '+formatTime(d.start)+'–'+formatTime(d.end)).join('<br>')+'</strong></div>'+
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
    const heroAudio=screen.querySelector('.hero-audio');
    if(heroAudio){
      heroAudio.volume=.55;
      const tryPlay=()=>heroAudio.play().catch(()=>{});
      tryPlay();
      const unlock=()=>{
        tryPlay();
        window.removeEventListener('pointerdown',unlock);
        window.removeEventListener('keydown',unlock);
      };
      window.addEventListener('pointerdown',unlock,{once:true});
      window.addEventListener('keydown',unlock,{once:true});
    }
    const licenseTitle=screen.querySelector('[data-license-title]');
    const licenseNumber=screen.querySelector('[data-license-number]');
    if(licenseTitle) licenseTitle.textContent='Licensed '+(state.licenseType||'barber');
    if(licenseNumber) licenseNumber.textContent='#'+(state.license||'');

    const usernameDisplay=screen.querySelector('[data-username-display]');
    const usernameUrl=screen.querySelector('[data-username-url]');
    if(usernameDisplay) usernameDisplay.textContent='@'+(state.username||'barber');
    if(usernameUrl) usernameUrl.textContent='barbergame.com/'+(state.username||'barber');

    screen.querySelectorAll('[data-key]').forEach(el=>{
      const key=el.dataset.key;
      if(el.type==='file') return;
      if(state[key]!=null) el.value=state[key];
      const save=()=>{state[key]=el.value; validateCurrent(false)};
      el.addEventListener('input',save);
      el.addEventListener('change',save);
      el.addEventListener('blur',()=>{el.dataset.touched='1';validateCurrent(false)});
    });

    screen.querySelectorAll('[data-shop]').forEach(btn=>{
      btn.classList.toggle('on',btn.dataset.shop===state.shop);
      btn.onclick=()=>{
        state.shop=btn.dataset.shop;
        screen.querySelectorAll('[data-shop]').forEach(x=>x.classList.toggle('on',x===btn));
        validateCurrent(false);
      };
    });

    function renderServices(){
      const editor=screen.querySelector('[data-service-editor]');
      if(!editor) return;
      editor.innerHTML=state.services.map((s,i)=>'<div class="service-card" data-service-index="'+i+'">'+
        '<div class="service-card-head"><div><strong>'+s.name+'</strong><span>Based on: '+s.base+'</span></div><div class="service-card-actions"><button type="button" class="service-duplicate" data-duplicate="'+i+'">Duplicate</button><button type="button" class="service-delete" data-delete="'+i+'"'+(state.services.length===1?' disabled':'')+'>Delete</button></div></div>'+
        '<div class="service-grid">'+
          '<label>Service name<input data-service-name="'+i+'" value="'+s.name.replace(/"/g,'&quot;')+'"></label>'+
          '<label>Time<select data-service-duration="'+i+'"><option value="15"'+(s.duration==='15'?' selected':'')+'>15 min</option><option value="30"'+(s.duration==='30'?' selected':'')+'>30 min</option><option value="45"'+(s.duration==='45'?' selected':'')+'>45 min</option><option value="60"'+(s.duration==='60'?' selected':'')+'>60 min</option></select></label>'+
          '<label>Price<div class="price-field"><span>$</span><input inputmode="decimal" data-service-price="'+i+'" value="'+s.price+'"></div></label>'+
        '</div>'+
      '</div>').join('');

      editor.querySelectorAll('[data-service-name]').forEach(el=>el.addEventListener('input',()=>{state.services[+el.dataset.serviceName].name=el.value;validateCurrent(false)}));
      editor.querySelectorAll('[data-service-duration]').forEach(el=>el.addEventListener('change',()=>{state.services[+el.dataset.serviceDuration].duration=el.value;validateCurrent(false)}));
      editor.querySelectorAll('[data-service-price]').forEach(el=>el.addEventListener('input',()=>{state.services[+el.dataset.servicePrice].price=el.value;validateCurrent(false)}));
      editor.querySelectorAll('[data-duplicate]').forEach(btn=>btn.onclick=()=>{
        const source=state.services[+btn.dataset.duplicate];
        state.services.splice(+btn.dataset.duplicate+1,0,{...source,name:source.name+' copy'});
        renderServices();validateCurrent(false);
      });
      editor.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>{
        if(state.services.length<=1) return;
        state.services.splice(+btn.dataset.delete,1);
        renderServices();validateCurrent(false);
      });
    }
    renderServices();
    const addService=screen.querySelector('[data-add-service]');
    if(addService) addService.onclick=()=>{
      state.services.push({base:'Haircut Only (no beard)',name:'Haircut Only (no beard)',price:'22',duration:'30'});
      renderServices();validateCurrent(false);
    };

    function renderHours(){
      const editor=screen.querySelector('[data-hours-editor]');
      if(!editor) return;
      const times=[];
      for(let h=6;h<=21;h++) for(const m of [0,30]) times.push(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'));
      const options=value=>times.map(t=>'<option value="'+t+'"'+(t===value?' selected':'')+'>'+formatTime(t)+'</option>').join('');
      editor.innerHTML=state.hours.map((d,i)=>'<div class="hours-row'+(d.active?' active':'')+'" data-hours-row="'+i+'">'+
        '<button type="button" class="day-toggle" data-day-toggle="'+i+'" aria-pressed="'+d.active+'"><span>'+(d.active?'✓':'')+'</span></button>'+
        '<div class="day-name">'+d.day+'</div>'+
        '<div class="time-pair">'+
          '<select data-start="'+i+'"'+(d.active?'':' disabled')+'>'+options(d.start)+'</select>'+
          '<span>to</span>'+
          '<select data-end="'+i+'"'+(d.active?'':' disabled')+'>'+options(d.end)+'</select>'+
        '</div>'+
      '</div>').join('');

      editor.querySelectorAll('[data-day-toggle]').forEach(btn=>btn.onclick=()=>{
        const i=+btn.dataset.dayToggle;
        state.hours[i].active=!state.hours[i].active;
        renderHours(); validateCurrent(false);
      });
      editor.querySelectorAll('[data-start]').forEach(el=>el.onchange=()=>{
        state.hours[+el.dataset.start].start=el.value;validateCurrent(false);
      });
      editor.querySelectorAll('[data-end]').forEach(el=>el.onchange=()=>{
        state.hours[+el.dataset.end].end=el.value;validateCurrent(false);
      });
    }
    renderHours();
    const copyHours=screen.querySelector('[data-copy-hours]');
    if(copyHours) copyHours.onclick=()=>{
      const source=state.hours[0];
      state.hours.slice(1,5).forEach(d=>{d.active=true;d.start=source.start;d.end=source.end});
      renderHours(); validateCurrent(false);
    };

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
      if(screen.querySelector('[data-shop]') && !state.shop) valid=false;
      if(screen.querySelector('[data-service-editor]')){
        if(!state.services.length) valid=false;
        state.services.forEach(s=>{
          if(!String(s.name||'').trim() || !String(s.duration||'').trim() || !String(s.price||'').trim()) valid=false;
        });
      }
      if(screen.querySelector('[data-hours-editor]')){
        const active=state.hours.filter(d=>d.active);
        if(!active.length) valid=false;
        active.forEach(d=>{ if(!d.start||!d.end||d.start>=d.end) valid=false; });
      }
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

    screen.querySelectorAll('input,select').forEach(el=>{
      el.addEventListener('keydown',e=>{
        if(e.key!=='Enter') return;
        const next=screen.querySelector('[data-next]');
        if(!next) return;
        e.preventDefault();
        if(next.hasAttribute('data-gated-next') && !validateCurrent(true)) return;
        next.click();
      });
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