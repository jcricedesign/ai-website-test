// Local, signed-in prototype data. The existing barber app stays the source for its visual shell.
(() => {
  const KEY = 'barbergame-barber-profile-demo-v1';
  const PHOTO = '/barber-game/assets/barber-profile-large.png';
  const defaults = {
    profile: {name:'Jaudon Miller',username:'jaudonmiller',title:'New Guy',shop:'Kirkland Shop',email:'',phone:'425-555-1212',bio:'Clean cuts, good conversation, and a chair you can count on.',instagram:'',facebook:'',twitter:'',nickname:'Jaudon',barberId:'0'},
    photo:'',
    hours: [['Monday',true,'09:00','17:00'],['Tuesday',true,'09:00','17:00'],['Wednesday',true,'09:00','17:00'],['Thursday',true,'09:00','17:00'],['Friday',true,'09:00','17:00'],['Saturday',false,'09:00','17:00'],['Sunday',false,'09:00','17:00']],
    daysOff: [], blockedSlots: [], blockedClients: [],
    services: [{name:'Haircut Only (no beard)',minutes:30,price:35,description:'Haircut'},{name:'Haircut & Beard',minutes:45,price:50,description:''},{name:'Kids 9 & under',minutes:30,price:25,description:''},{name:'Braids',minutes:60,price:80,description:''}],
    appointments: [{name:'Roger',service:'Haircut Only (no beard)',time:'9:00 AM',status:'Complete'},{name:'Philip',service:'Haircut & Beard',time:'1:00 PM',status:'Confirmed'},{name:'Mark',service:'Haircut Only (no beard)',time:'2:00 PM',status:'New'},{name:'George',service:'Braids',time:'3:00 PM',status:'Confirmed'}],
    vouchers: [], expenses: []
  };
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaults); } catch { data = structuredClone(defaults); }
  for (const key of Object.keys(defaults)) if (data[key] == null) data[key] = structuredClone(defaults[key]);
  data.profile = {...defaults.profile, ...data.profile};
  let panel = '', origin = 'business', appointmentFilter = 'Upcoming', message = '';
  const overlay = document.querySelector('.manage-overlay');
  const content = document.getElementById('manage-content');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const heading = (name, desc) => `<p class="manage-kicker">${origin === 'settings' ? 'Profile & account' : 'My business'}</p><h2>${name}</h2><p class="manage-intro">${desc}</p>`;
  const note = 'Prototype preview · changes are saved only in this browser and do not affect live bookings or payments.';

  function persist(text = 'Saved in this browser.') {
    try { localStorage.setItem(KEY, JSON.stringify(data)); message = text; }
    catch { message = 'Browser storage is full. Try a smaller profile photo.'; }
    render();
    renderDay();
  }
  function renderDay() {
    const list = document.getElementById('managed-day-appointments');
    if (!list) return;
    list.innerHTML = data.appointments.map(item => {
      const status = item.status || 'Confirmed';
      const style = status === 'Complete' ? 'complete' : status === 'New' ? 'new' : '';
      return `<article class="appt-slot ${style}"><div class="appt-main"><div class="appt-name">${esc(item.name)}</div><div class="appt-service">${esc(item.service)}</div></div><div class="appt-right"><div class="appt-status">${esc(status)}</div><div class="appt-time">${esc(item.time)}</div></div></article>`;
    }).join('') || '<p class="day-label">No appointments today.</p>';

    const price = item => Number(data.services.find(service => service.name === item.service)?.price) || 0;
    const earned = data.appointments.filter(item => item.status === 'Complete').reduce((sum, item) => sum + price(item), 0);
    const projected = data.appointments.filter(item => item.status !== 'Cancelled').reduce((sum, item) => sum + price(item), 0);
    const view = list.closest('[data-app-view="myday"]');
    view.querySelector('.earnings-total').textContent = `$${projected}`;
    view.querySelector('.goal-footer span').textContent = `$${earned} so far`;
    view.querySelector('.goal-footer strong').textContent = earned >= 75 ? 'Booth rent covered' : `$${Math.max(0, 75 - earned)} to booth rent`;
    view.querySelector('.goal-fill').style.width = `${Math.min(100, projected / 300 * 100)}%`;
  }
  function open(which, fromSettings = false) {
    panel = which;
    origin = fromSettings ? 'settings' : 'business';
    message = '';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    render();
    overlay.querySelector('.manage-scroll').scrollTop = 0;
  }
  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    panel = '';
    if (origin === 'settings') document.querySelector('.settings-close')?.focus();
    else document.querySelector('[data-manage="hours"]')?.focus();
  }
  document.querySelectorAll('[data-manage]').forEach(button => button.addEventListener('click', () => open(button.dataset.manage, !!button.closest('.settings-overlay'))));
  document.querySelector('.manage-back').addEventListener('click', close);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('open')) close(); });

  function render() {
    let html = '';
    if (panel === 'profile') {
      const p = data.profile, parts = p.name.split(' '), first = parts.shift() || '', last = parts.join(' ');
      html = heading('Update Barber Profile','Manage what clients see and how the shop reaches you.') +
        `<div class="manage-card"><div class="manage-row"><div><strong>Status · ${esc(p.title)}</strong><small>Set by the shop</small></div><span>${esc(p.shop)}</span></div><img class="manage-photo" src="${esc(data.photo || PHOTO)}" alt="Barber profile"><label class="manage-field">Profile photo<input id="manage-photo" type="file" accept="image/*"></label></div>
        <form id="manage-profile-form" class="manage-card">
          <div class="manage-fields-two"><label class="manage-field">First name<input name="first" required value="${esc(first)}"></label><label class="manage-field">Last name<input name="last" required value="${esc(last)}"></label></div>
          <label class="manage-field">Nickname<input name="nickname" value="${esc(p.nickname)}"></label>
          <div class="manage-fields-two"><label class="manage-field">Username<input name="username" required value="${esc(p.username)}"></label><label class="manage-field">Barber ID<input value="${esc(p.barberId)}" disabled></label></div>
          <label class="manage-field">Email<input name="email" type="email" placeholder="Add email" value="${esc(p.email)}"></label><label class="manage-field">Phone<input name="phone" type="tel" value="${esc(p.phone)}"></label>
          <label class="manage-field">Description<textarea name="bio" maxlength="300">${esc(p.bio)}</textarea></label>
          <label class="manage-field">Instagram<input name="instagram" placeholder="@handle" value="${esc(p.instagram)}"></label><label class="manage-field">Facebook<input name="facebook" placeholder="Profile URL" value="${esc(p.facebook)}"></label><label class="manage-field">Twitter / X<input name="twitter" placeholder="@handle" value="${esc(p.twitter)}"></label>
          <button class="manage-action" type="submit">Save profile</button>
        </form><p class="manage-note">Shop assignment, status, and barber ID are managed by Chop It Up. ${note}</p>`;
    }
    if (panel === 'hours') {
      html = heading('My Hours','Set your working week and upcoming days off.') +
        `<div class="manage-card"><h3>Regular hours</h3>${data.hours.map((day,i) => `<div class="manage-day"><label><input type="checkbox" data-hour-active="${i}" ${day[1]?'checked':''}>${day[0]}</label><div class="manage-day-times"><input type="time" aria-label="${day[0]} start" data-hour-start="${i}" value="${esc(day[2])}" ${day[1]?'':'disabled'}><span>to</span><input type="time" aria-label="${day[0]} end" data-hour-end="${i}" value="${esc(day[3])}" ${day[1]?'':'disabled'}></div></div>`).join('')}</div><button class="manage-action" data-manage-action="save-hours">Save hours</button>
        <div class="manage-card"><h3>Upcoming days off</h3>${data.daysOff.length ? data.daysOff.map((day,i) => `<div class="manage-row"><strong>${esc(day)}</strong><button class="manage-minor" data-manage-action="remove-day" data-index="${i}">Remove</button></div>`).join('') : '<p>No days off added.</p>'}<form id="manage-day-form"><label class="manage-field">Add a day off<input name="date" type="date" required></label><button class="manage-minor" type="submit">Add day off</button></form></div>
        <div class="manage-card"><h3>Block a time</h3>${data.blockedSlots.map((slot,i)=>`<div class="manage-row"><strong>${esc(slot.date)} · ${esc(slot.start)}–${esc(slot.end)}</strong><button class="manage-minor" data-manage-action="remove-block" data-index="${i}">Remove</button></div>`).join('')||'<p>No blocked times in this preview.</p>'}<form id="manage-block-form"><label class="manage-field">Date<input name="date" type="date" required></label><div class="manage-fields-two"><label class="manage-field">Start<input name="start" type="time" required></label><label class="manage-field">End<input name="end" type="time" required></label></div><button class="manage-minor" type="submit">Block time preview</button></form></div>
        <div class="manage-card"><h3>Shop hours · Kirkland</h3><div class="manage-row"><strong>Mon–Sat</strong><span>10:00 AM – 6:00 PM</span></div><div class="manage-row"><strong>Sunday</strong><span>10:00 AM – 5:00 PM</span></div><p>Shop hours are set by Chop It Up.</p></div><p class="manage-note">Blocking time here does not remove real booking slots. ${note}</p>`;
    }
    if (panel === 'services') {
      html = heading('My Services','Choose the services clients can book with you.') +
        data.services.map((service,i) => `<div class="manage-card"><div class="manage-row"><strong>Service ${i+1}</strong><button class="manage-minor" data-manage-action="remove-service" data-index="${i}" ${data.services.length===1?'disabled':''}>Remove</button></div><label class="manage-field">Name<input data-service-name="${i}" value="${esc(service.name)}"></label><div class="manage-fields-two"><label class="manage-field">Time<select data-service-time="${i}">${[15,30,45,60,90,120].map(n => `<option value="${n}" ${service.minutes===n?'selected':''}>${n} min</option>`).join('')}</select></label><label class="manage-field">Rate ($)<input data-service-price="${i}" type="number" min="0" step="1" value="${esc(service.price)}"></label></div><label class="manage-field">Description<input data-service-description="${i}" value="${esc(service.description||'')}"></label></div>`).join('') +
        `<button class="manage-action" data-manage-action="add-service">+ Add service</button><button class="manage-action" data-manage-action="save-services">Save services</button><p class="manage-note">Prices and service data are illustrative. ${note}</p>`;
    }
    if (panel === 'appointments') {
      const shown = data.appointments.map((item,index) => ({...item,index})).filter(item => appointmentFilter === 'Upcoming' ? ['New','Confirmed'].includes(item.status) : appointmentFilter === 'Past' ? item.status === 'Complete' : item.status === 'Cancelled');
      html = heading('My Appointments','Review the sample schedule and its status.') +
        `<div class="manage-filters">${['Upcoming','Past','Cancelled'].map(f => `<button class="manage-filter ${appointmentFilter===f?'active':''}" data-appointment-filter="${f}" aria-pressed="${appointmentFilter===f}">${f}</button>`).join('')}</div><div class="manage-card">${shown.length ? shown.map(item => `<div class="manage-row"><div><strong>${esc(item.name)} · ${esc(item.time)}</strong><small>${esc(item.service)} · ${esc(item.status)}${data.blockedClients.includes(item.name)?' · Future bookings blocked':''}</small></div>${appointmentFilter==='Upcoming'?`<button class="manage-minor" data-manage-action="complete-appointment" data-index="${item.index}">Complete</button>`:''}</div>`).join('') : '<p>No appointments in this group.</p>'}</div><div class="manage-card"><h3>Client booking controls</h3><p>Mark a sample client as blocked for future bookings in this local preview.</p>${data.appointments.map((item,i)=>`<div class="manage-row"><strong>${esc(item.name)}</strong><button class="manage-minor" data-manage-action="toggle-client-block" data-index="${i}">${data.blockedClients.includes(item.name)?'Unblock':'Block client'}</button></div>`).join('')}</div><button class="manage-action" data-manage-action="view-day">View My Day</button><p class="manage-note">Blocking a client here does not change real account access. ${note}</p>`;
    }
    if (panel === 'reup') {
      html = heading('Work Re-Up / Voucher','Keep track of booth rent and your time-off voucher.') +
        `<div class="manage-card"><h3>Booth rent</h3><div class="manage-row"><strong>Next re-up</strong><span>$150 · Friday</span></div><div class="manage-row"><strong>Paid through</strong><span>Sep 26 · sample</span></div></div><div class="manage-card"><h3>Vouchers</h3><div class="manage-row"><div><strong>Free 1-week voucher</strong><small>Vacation or recovery week</small></div><span>1 available</span></div>${data.vouchers.map((day,i)=>`<div class="manage-row"><strong>Planned for ${esc(day)}</strong><button class="manage-minor" data-manage-action="remove-voucher" data-index="${i}">Remove</button></div>`).join('')}<form id="manage-voucher-form"><label class="manage-field">Plan a voucher week<input type="date" name="date" required></label><button class="manage-minor" type="submit">Add preview</button></form></div><p class="manage-note">No voucher is redeemed and no booth rent is paid here. ${note}</p>`;
    }
    if (panel === 'earnings') {
      const earned = data.appointments.filter(item=>item.status==='Complete').reduce((sum,item)=>sum+(Number(data.services.find(service=>service.name===item.service)?.price)||0),0);
      const spent = data.expenses.reduce((sum,item)=>sum+Number(item.amount),0);
      html = heading('Earnings / Expenses','A sample personal business snapshot.') +
        `<div class="manage-card"><div class="manage-row"><strong>Completed services</strong><span>$${earned.toFixed(2)}</span></div><div class="manage-row"><strong>Expenses logged</strong><span>$${spent.toFixed(2)}</span></div><div class="manage-row"><strong>Difference</strong><span>$${(earned-spent).toFixed(2)}</span></div></div><form id="manage-expense-form" class="manage-card"><h3>Add an expense</h3><label class="manage-field">Description<input name="description" required placeholder="Supplies, tools, etc."></label><label class="manage-field">Amount ($)<input name="amount" type="number" min="0.01" step="0.01" required></label><button class="manage-action" type="submit">Add expense</button></form>${data.expenses.map((expense,i)=>`<div class="manage-card manage-row"><div><strong>${esc(expense.description)}</strong><small>$${Number(expense.amount).toFixed(2)}</small></div><button class="manage-minor" data-manage-action="remove-expense" data-index="${i}">Remove</button></div>`).join('')}<p class="manage-note">Tax reports, actual earnings, rent, and expenses need a connected system. ${note}</p>`;
    }
    content.innerHTML = html + (message ? `<p class="manage-status" role="status">${esc(message)}</p>` : '');
  }

  overlay.addEventListener('click', event => {
    const filter = event.target.closest('[data-appointment-filter]');
    if (filter) { appointmentFilter = filter.dataset.appointmentFilter; message=''; render(); return; }
    const button = event.target.closest('[data-manage-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    switch (button.dataset.manageAction) {
      case 'save-hours':
        if (data.hours.some(day=>day[1] && day[2]>=day[3])) { message='An end time must be after its start time.'; render(); return; }
        persist('Hours saved locally.'); break;
      case 'add-service': data.services.push({name:'New service',minutes:30,price:35,description:''}); persist('Service added. Edit its details below.'); break;
      case 'remove-service': if (data.services.length>1) { data.services.splice(index,1); persist('Service removed locally.'); } break;
      case 'save-services':
        if (data.services.some(service=>!service.name.trim() || !Number.isFinite(Number(service.price)) || Number(service.price)<0)) { message='Each service needs a name and valid price.'; render(); return; }
        persist('Services saved locally.'); break;
      case 'complete-appointment': data.appointments[index].status='Complete'; persist('Appointment marked complete in this preview.'); break;
      case 'view-day': close(); if (origin==='settings') document.querySelector('.settings-close')?.click(); setView('myday'); break;
      case 'remove-day': data.daysOff.splice(index,1); persist('Day off removed locally.'); break;
      case 'remove-block': data.blockedSlots.splice(index,1); persist('Blocked time removed locally.'); break;
      case 'toggle-client-block': {
        const name=data.appointments[index].name, current=data.blockedClients.indexOf(name);
        if (current<0) data.blockedClients.push(name); else data.blockedClients.splice(current,1);
        persist(current<0?'Client blocked in this preview only.':'Client unblocked in this preview.'); break;
      }
      case 'remove-voucher': data.vouchers.splice(index,1); persist('Voucher plan removed locally.'); break;
      case 'remove-expense': data.expenses.splice(index,1); persist('Expense removed locally.'); break;
    }
  });
  overlay.addEventListener('change', event => {
    const el = event.target; let index;
    if (el.id==='manage-photo') {
      const file = el.files?.[0]; if (!file) return;
      if (file.size>1000000) { message='Choose a photo under 1 MB.'; render(); return; }
      const reader = new FileReader(); reader.onload=()=>{data.photo=String(reader.result);persist('Photo saved locally.');document.querySelector('.barber-app-profile').src=data.photo;}; reader.readAsDataURL(file); return;
    }
    if (el.matches('[data-hour-active]')) { index=Number(el.dataset.hourActive); data.hours[index][1]=el.checked; render(); }
    else if (el.matches('[data-hour-start]')) data.hours[Number(el.dataset.hourStart)][2]=el.value;
    else if (el.matches('[data-hour-end]')) data.hours[Number(el.dataset.hourEnd)][3]=el.value;
    else if (el.matches('[data-service-time]')) data.services[Number(el.dataset.serviceTime)].minutes=Number(el.value);
  });
  overlay.addEventListener('input', event => {
    const el=event.target;
    if (el.matches('[data-service-name]')) data.services[Number(el.dataset.serviceName)].name=el.value;
    else if (el.matches('[data-service-price]')) data.services[Number(el.dataset.servicePrice)].price=Number(el.value);
    else if (el.matches('[data-service-description]')) data.services[Number(el.dataset.serviceDescription)].description=el.value;
  });
  overlay.addEventListener('submit', event => {
    const form=event.target; if (!['manage-profile-form','manage-day-form','manage-block-form','manage-voucher-form','manage-expense-form'].includes(form.id)) return;
    event.preventDefault(); const values=new FormData(form);
    if (form.id==='manage-profile-form') {
      for (const key of ['username','email','phone','bio','nickname','instagram','facebook','twitter']) data.profile[key]=String(values.get(key)||'').trim();
      data.profile.name=[values.get('first'),values.get('last')].map(value=>String(value||'').trim()).filter(Boolean).join(' ');
      persist('Public profile saved locally.');
    } else if (form.id==='manage-day-form') { data.daysOff.push(String(values.get('date'))); persist('Day off added locally.'); }
    else if (form.id==='manage-block-form') {
      const slot={date:String(values.get('date')),start:String(values.get('start')),end:String(values.get('end'))};
      if (slot.start>=slot.end) { message='End time must be after start time.'; render(); return; }
      data.blockedSlots.push(slot); persist('Time blocked in this preview only.');
    }
    else if (form.id==='manage-voucher-form') { data.vouchers.push(String(values.get('date'))); persist('Voucher week planned in this preview only.'); }
    else { data.expenses.push({description:String(values.get('description')).trim(),amount:Number(values.get('amount'))}); persist('Expense added locally.'); }
  });
  if (data.photo) document.querySelector('.barber-app-profile').src=data.photo;
  renderDay();
})();
