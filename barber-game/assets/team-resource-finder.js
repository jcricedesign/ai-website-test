(() => {
'use strict';
const base='/barber-game/';
const resources=[
{id:'booking-customer',name:'Chop It Up — Customer Booking',workstream:'Customer Booking',type:'Demo',status:'In development',description:'Customer-facing booking flow, service selection, appointments and account access.',url:base+'customer-v2/',links:[['Desktop booking',base+'web-desktop/'],['Sign in and recovery',base+'customer-v2/#signin']],note:'Service selection and variable-duration availability are current focus.'},
{id:'admin',name:'Barber Admin Dashboard',workstream:'Customer Booking',type:'Demo',status:'In review',description:'Barber scheduling, services, blocked slots, clients and operations.',url:base+'barber-admin-dashboard/',links:[['Developer handoff',base+'barber-admin-dashboard/handoff/']],note:'Administration and booking integration review.'},
{id:'connected',name:'3UP Connected Demo',workstream:'Customer Booking',type:'Demo',status:'In review',description:'Customer, barber and shop owner perspectives synchronized in one demonstration.',url:base+'chop-it-up/demo/',links:[],note:'Connected booking concept for reviews.'},
{id:'dark-theme',name:'Customer Dark Theme',workstream:'Customer Booking',type:'Prototype',status:'In review',description:'Dark visual exploration for the customer homepage and booking action.',url:base+'dark-theme/?splash=1',links:[],note:''},
{id:'onboarding',name:'Barber Onboarding',workstream:'Customer Booking',type:'Prototype',status:'In review',description:'Barber first-run setup for services, hours and ready-to-book state.',url:base+'onboarding/',links:[['First-run experience',base+'barber-first-run/']],note:''},
{id:'map-exploration',name:'Map Exploration',workstream:'Atlas',type:'Demo',status:'In review',description:'Circular neighborhood map, shop browsing and nearby opportunities.',url:base+'map-exploration/',links:[],note:'Mobile map focus and selected shop navigation refined.'},
{id:'directory',name:'Barbershop Directory — Data Acquisition',workstream:'Directory & Data',type:'Project',status:'In development',description:'Washington and California bronze records, corporate-chain imports and verification.',url:'',links:[],note:'Chain ingestion, provenance and quality control ongoing.'},
{id:'figma-library',name:'Figma Pattern Library',workstream:'Figma Design System',type:'Project',status:'In development',description:'Shared UI patterns and designs with team favorites as the initial workflow.',url:'',links:[],note:'Team introduction and feedback next.'},
{id:'tbg-site',name:'TBG Network Website & Brand',workstream:'TBG Network',type:'Project',status:'In development',description:'Brand presentation and portfolio site work for TBG Network.',url:'',links:[],note:'Showcase and responsive refinement.'},
{id:'owner',name:'Shop Owner Mode',workstream:'Customer Booking',type:'Prototype',status:'In review',description:'Mobile-first operating concept for booth rent and shop management.',url:base+'owner-mode/',links:[],note:''},
{id:'admin-handoff',name:'Barber Admin — Developer Handoff',workstream:'Customer Booking',type:'Document',status:'In review',description:'Feature inventory, implementation gaps and CTO engineering notes.',url:base+'barber-admin-dashboard/handoff/',links:[],note:''},
{id:'video-review',name:'Morgan’s Footage Review',workstream:'TBG Network',type:'Document',status:'In review',description:'Stakeholder source-footage review for promotional video work.',url:base+'video-reviews/',links:[],note:''}
];
const key='tbg-resource-finder-local-v1';
const allowed=['Live','In development','In review','On hold','Archived'];
let edits={};try { const parsed=JSON.parse(localStorage.getItem(key)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))edits=parsed; } catch(_){}
const root=document.getElementById('team-resource-finder');if(!root)return;
const q=document.getElementById('finder-query'), w=document.getElementById('finder-workstream'), t=document.getElementById('finder-type'), st=document.getElementById('finder-status'), results=document.getElementById('finder-results'),count=document.getElementById('finder-count'),exportButton=document.getElementById('finder-export');
const workstreams=[...new Set(resources.map(r=>r.workstream))];
workstreams.forEach(v=>w.add(new Option(v,v)));
const types=[...new Set(resources.map(r=>r.type))];types.forEach(v=>t.add(new Option(v,v)));
allowed.forEach(v=>st.add(new Option(v,v)));
const effective=r=>({...r,...(edits[r.id]||{})});
const dateLabel=r=>r.updatedAt?new Date(r.updatedAt+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not recorded';
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n}
function link(label,url){const a=el('a','',label);a.href=url;return a}
function redraw(){
 const query=q.value.trim().toLowerCase();const list=resources.map(effective).filter(r=>(!query||[r.name,r.workstream,r.type,r.description,r.note].join(' ').toLowerCase().includes(query))&&(!w.value||r.workstream===w.value)&&(!t.value||r.type===t.value)&&(!st.value||r.status===st.value));
 list.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')||a.name.localeCompare(b.name));
 results.replaceChildren();count.textContent=list.length+' of '+resources.length+' resources';
 if(!list.length){results.append(el('p','finder-empty','No matching resources. Try clearing a filter.'));return}
 list.forEach(r=>{
 const card=el('article','finder-card');const top=el('div','finder-card-top');const main=el('div');
 main.append(el('h3','finder-title',r.name),el('p','finder-description',r.description));
 const meta=el('div','finder-meta');meta.append(el('span','finder-type',r.type),el('span','',r.workstream));
 const status=el('span','finder-status',r.status);status.dataset.status=r.status;meta.append(status,el('span','', 'Updated: '+dateLabel(r)));main.append(meta);
 const actions=el('div','finder-actions');if(r.url){actions.append(link('Open ↗',r.url));}
 const button=el('button','finder-toggle','Details +');button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','finder-detail-'+r.id);actions.append(button);top.append(main,actions);card.append(top);
 const detail=el('div','finder-detail');detail.id='finder-detail-'+r.id;detail.hidden=true;
 if(r.note){detail.append(el('p','finder-local','What changed / current focus: '+r.note));}
 if(r.links.length){const links=el('div','finder-links');r.links.forEach(([label,url])=>links.append(link(label+' ↗',url)));detail.append(links);}
 const stateWrap=el('div');const stateLabel=el('label','','Status (personal draft)');stateLabel.htmlFor='finder-status-'+r.id;const select=el('select');select.id=stateLabel.htmlFor;allowed.forEach(v=>select.add(new Option(v,v)));select.value=r.status;stateWrap.append(stateLabel,select);
 const noteWrap=el('div');const noteLabel=el('label','','What changed? (personal draft)');noteLabel.htmlFor='finder-note-'+r.id;const note=el('textarea');note.id=noteLabel.htmlFor;note.value=r.note||'';note.maxLength=500;noteWrap.append(noteLabel,note);
 const save=el('button','finder-save','Save on this device');save.type='button';
 const local=el('p','finder-local','Edits are saved only in this browser, not shared with teammates. Use Export changes to hand off updates for publishing.');
 save.addEventListener('click',()=>{edits[r.id]={status:select.value,note:note.value.trim(),updatedAt:new Date().toISOString().slice(0,10)};try{localStorage.setItem(key,JSON.stringify(edits));}catch(_){alert('Browser storage is unavailable; changes could not be saved.')}redraw();});
 detail.append(stateWrap,noteWrap,save,local);
 button.addEventListener('click',()=>{detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));button.textContent=detail.hidden?'Details +':'Details −';});
 card.append(detail);results.append(card);
 });
}
[q,w,t,st].forEach(x=>x.addEventListener(x===q?'input':'change',redraw));
exportButton.addEventListener('click',()=>{
 const changes=resources.filter(r=>edits[r.id]).map(r=>({id:r.id,name:r.name,...edits[r.id]}));
 const blob=new Blob([JSON.stringify({board:'BarberGame project finder',exportedAt:new Date().toISOString(),changes},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='barbergame-board-changes.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
redraw();
})();
