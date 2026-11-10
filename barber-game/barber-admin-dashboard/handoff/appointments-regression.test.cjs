#!/usr/bin/env node
// Run: node barber-game/barber-admin-dashboard/handoff/appointments-regression.test.cjs
// Prototype-only source tests; do not establish production API concurrency guarantees.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(a,b){const start=html.indexOf(a),end=html.indexOf(b,start);assert.ok(start>=0&&end>start,'Missing '+a);return html.slice(start,end)}
function test(name,fn){try{fn();process.stdout.write('PASS '+name+'\n')}catch(e){process.stderr.write('FAIL '+name+': '+e.message+'\n');process.exitCode=1}}
const fitCode=extract('function appointmentRecordsOn(date){','function renderBookingServiceChoices(){');
const today='2026-11-10',future='2026-11-18';
function setupFit(){
 const dayPeriods=[{start:840,end:960},{start:1080,end:1200}];
 const booked=[],blocked=[],services=[{name:'Haircut',duration:30},{name:'Color',duration:60}];
 const env={localDateISO:()=>today,days:[],services,bookings:[],futureBookings:booked,timeBlocks:blocked,
 dayHoursOn:()=>dayPeriods,parseClock:value=>{const h=String(value||'').match(/^(\d{2}):(\d{2})$/);if(h)return +h[1]*60+(+h[2]);const v=String(value||'').match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);return v?(+v[1]%12+(v[3]==='PM'?12:0))*60+(+v[2]):null},
 slotClock:min=>String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0'),
 SLOT_MINUTES:15,toast:()=>{},$:()=>null,render:()=>{},getDailySlots:null};
 const f=new Function('env',`with(env){${fitCode};return {fit:appointmentFit,booked:slotBooked,blocked:slotBlocked}}`)(env);
 return {f,dayPeriods,booked,blocked};
}
test('service fits entirely in a working period',()=>{const t=setupFit();assert.equal(t.f.fit(future,840,60),true)});
test('service cannot cross a split-hours break',()=>{const t=setupFit();assert.equal(t.f.fit(future,930,60),false)});
test('service cannot extend beyond closing time',()=>{const t=setupFit();assert.equal(t.f.fit(future,1170,60),false)});
test('existing appointment conflicts prevent booking',()=>{const t=setupFit();t.booked.push({name:'Customer',date:future,time:'3:00 PM',service:'Haircut',status:'Confirmed'});assert.equal(t.f.fit(future,885,30),false);assert.equal(t.f.fit(future,930,30),true)});
test('cancelled appointment releases slot',()=>{const t=setupFit();t.booked.push({name:'Customer',date:future,time:'3:00 PM',service:'Haircut',status:'Cancelled'});assert.equal(t.f.fit(future,900,30),true)});
test('blocked periods prevent booking',()=>{const t=setupFit();t.blocked.push({date:future,start:'15:15',end:'15:45'});assert.equal(t.f.fit(future,900,60),false)});
test('past dates and invalid durations are rejected',()=>{const t=setupFit();assert.equal(t.f.fit('2026-11-09',840,30),false);assert.equal(t.f.fit(future,840,0),false)});

const saved=extract('function loadDemoAppointments(){',"try{const ids=new Set(JSON.parse(localStorage.getItem('tbg-demo-schedule-cancellations-v1')");
function setupPersistence(failKey=null){
 const db={},bookings=[],futureBookings=[],notifications=[];
 const env={demoAppointmentsKey:'tbg-demo-manual-appointments-v1',demoManualCancellationsKey:'tbg-demo-manual-appointment-cancellations-v1',futureBookings,bookings,
 localDateISO:()=>today,scheduleBookingKey:b=>[b.date||today,b.name,b.time,b.service].join('|'),
 toast:m=>notifications.push(m),
 localStorage:{getItem:key=>db[key]||null,setItem:(key,value)=>{if(key===failKey)throw Error('quota');db[key]=value}}};
 const f=new Function('env',`with(env){${saved};return {create:saveNewDemoAppointment,cancel:saveManualCancellation,load:loadDemoAppointments,manualCancellationReasons}}`)(env);
 return {f,db,bookings,futureBookings,notifications,env};
}
const sample=()=>({name:'Client',date:future,time:'2:00 PM',service:'Haircut',status:'Confirmed'});
test('new booking persists before showing in UI',()=>{const t=setupPersistence();assert.equal(t.f.create(sample()),true);assert.equal(t.futureBookings.length,1);assert.equal(JSON.parse(t.db[t.env.demoAppointmentsKey]).length,1)});
test('new booking storage failure does not create phantom appointment',()=>{const t=setupPersistence('tbg-demo-manual-appointments-v1');assert.equal(t.f.create(sample()),false);assert.equal(t.futureBookings.length,0)});
test('saved booking survives demo browser reload',()=>{const t=setupPersistence();t.f.create(sample());t.futureBookings.length=0;t.f.load();assert.equal(t.futureBookings.length,1)});
test('manual cancellation persists before changing status',()=>{const t=setupPersistence();t.f.create(sample());const b=t.futureBookings[0];assert.equal(t.f.cancel(b,'Requested by client'),true);assert.equal(b.status,'Cancelled');assert.equal(Object.keys(JSON.parse(t.db[t.env.demoManualCancellationsKey])).length,1)});
test('failed cancellation persistence leaves booking confirmed',()=>{const t=setupPersistence('tbg-demo-manual-appointment-cancellations-v1');const b=sample();assert.equal(t.f.cancel(b,'Client request'),false);assert.equal(b.status,'Confirmed')});
if(!process.exitCode)process.stdout.write('All appointment source-level checks passed.\n');
