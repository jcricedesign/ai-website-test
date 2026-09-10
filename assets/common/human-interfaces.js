(()=>{
const essays=[
{path:'/playground/future-hardware-prediction/',title:'Future Hardware Prediction',thesis:'What if we stopped taking the phone out?'},
{path:'/playground/abacus/',title:'Abacus',thesis:"The interface you don't have to look at."},
{path:'/playground/material-interface/',title:'The Material Interface',thesis:'What if computation could be felt rather than seen?'},
{path:'/playground/syntax/',title:'Syntax',thesis:'What if you could think with a computer the way you build with your hands?'},
{path:'/playground/oracle/',title:'Oracle',thesis:'What if history could answer back?'},
{path:'/playground/salon/',title:'Salon',thesis:"Don't give me an answer. Give me the right room."},
{path:'/playground/substance/',title:'Substance',thesis:'What if information had material properties?'},
{path:'/playground/quicksilver/',title:'Quicksilver',thesis:'Touch is input. Behavior is output.'}
];
const normalize=p=>p.endsWith('/')?p:p+'/';
const path=normalize(location.pathname);
const i=essays.findIndex(x=>x.path===path);
if(i<0)return;
const main=document.querySelector('main');
if(!main||main.querySelector('.hi-reading-nav'))return;
const prev=essays[i-1];
const next=essays[i+1];
const nav=document.createElement('nav');
nav.className='hi-reading-nav';
nav.setAttribute('aria-label','Human Interfaces reading sequence');
const meta=document.createElement('div');
meta.className='hi-reading-meta';
meta.innerHTML=`<span>${String(i+1).padStart(2,'0')} of ${String(essays.length).padStart(2,'0')}</span><a href="/playground/human-interfaces/">All Human Interfaces</a>`;
nav.appendChild(meta);
const grid=document.createElement('div');
grid.className='hi-reading-grid'+(!next?' is-final':'');
if(prev){
 const a=document.createElement('a');a.className='hi-reading-card';a.href=prev.path;
 a.innerHTML=`<span class="hi-reading-label">Previous</span><span class="hi-reading-title">${prev.title}</span><span class="hi-reading-thesis">${prev.thesis}</span>`;
 grid.appendChild(a);
}else{
 const spacer=document.createElement('div');spacer.setAttribute('aria-hidden','true');grid.appendChild(spacer);
}
if(next){
 const a=document.createElement('a');a.className='hi-reading-card is-next';a.href=next.path;
 a.innerHTML=`<span class="hi-reading-label">Next</span><span class="hi-reading-title">${next.title}</span><span class="hi-reading-thesis">${next.thesis}</span>`;
 grid.appendChild(a);
}else{
 const a=document.createElement('a');a.className='hi-reading-card is-next';a.href='/playground/human-interfaces/';
 a.innerHTML='<span class="hi-reading-label">End of sequence</span><span class="hi-reading-title">Human Interfaces</span><span class="hi-reading-thesis">Eight experiments in making computation more human.</span>';
 grid.appendChild(a);
}
nav.appendChild(grid);
const footer=main.querySelector(':scope > footer');
if(footer)main.insertBefore(nav,footer);else main.appendChild(nav);
})();
