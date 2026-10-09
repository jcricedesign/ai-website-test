(()=>{
'use strict';
const base='https://pub-8150ade24f1a45dfa4e16936ba894a95.r2.dev/pins/';
const localOriginals=new Set(["i (2).gif", "40246dc701683ca6a9362fa1fdeffa84.jpg", "09762ee5e1cc8bb20aee23f9951dd50c.jpg", "7921a3bbf57eaba1730fb72251e0142c.jpg", "9667edf9a47717dad7db2b27810ae91b.jpg", "014611f89eacf4cedffbfc39c889c3c5.jpg", "9100e826544a1052f14cf23c40caa8fe.jpg", "17192dbbbed8d55ee9ab348131e0e0ee.jpg"]);
const $=id=>document.getElementById(id),wall=$('wall'),dialog=$('lightbox');
const taxonomy=PIN_CATEGORIES.categories;
const tags=p=>PIN_CATEGORIES.tags[p.id]||['other'];
const primary=p=>tags(p)[0];
const rank=p=>taxonomy.findIndex(c=>c.id===primary(p));
const labels=new Map(taxonomy.map(c=>[c.id,c.label]));
let ordered=[...PIN_IMAGES],visible=[],current=0,returnFocus=null;
for(const c of taxonomy){const option=document.createElement('option');option.value=c.id;option.textContent=`${c.label} (${PIN_IMAGES.filter(p=>tags(p).includes(c.id)).length})`;$('category').append(option);}
function render(){const filter=$('filter').value,category=$('category').value;
visible=ordered.filter(p=>(category==='all'||tags(p).includes(category))&&(filter==='all'||(filter==='portrait'?p.h>p.w*1.05:filter==='landscape'?p.w>p.h*1.05:Math.abs(p.w/p.h-1)<=.05)));
if(category==='all')visible.sort((a,b)=>rank(a)-rank(b));
wall.replaceChildren();const fragment=document.createDocumentFragment();
const groups=category==='all'?taxonomy:[taxonomy.find(c=>c.id===category)];
for(const c of groups){const members=visible.filter(p=>category!=='all'||primary(p)===c.id);if(!members.length)continue;
const section=document.createElement('section');section.className='category-group';section.setAttribute('aria-label',c.label);
const heading=document.createElement('h2');heading.className='category-heading';heading.textContent=c.label;const count=document.createElement('small');count.textContent=members.length+' images';heading.append(count);
const grid=document.createElement('div');grid.className='wall';
for(const p of members){const i=visible.indexOf(p),b=document.createElement('button');b.className='pin';b.setAttribute('aria-label',`Open ${c.label.toLowerCase()} reference ${p.id}, ${p.w} by ${p.h} pixels`);const img=document.createElement('img');img.src=p.thumb;img.width=p.w;img.height=p.h;img.alt=`${c.label} reference ${p.id}`;img.loading='lazy';img.decoding='async';const label=document.createElement('span');label.textContent=`${p.w} × ${p.h}`;b.append(img,label);b.addEventListener('click',()=>open(i,b));grid.append(b);}
section.append(heading,grid);fragment.append(section);}
wall.append(fragment);if(!visible.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No images match these filters. Try another category or choose All images.';wall.append(empty);}
$('count').textContent=`${visible.length} images${category==='all'&&filter==='all'?'':` · ${PIN_IMAGES.length} total`}`;}
function show(index){current=(index+visible.length)%visible.length;const p=visible[current],url=(localOriginals.has(p.name)?"originals/":base)+encodeURIComponent(p.name);$('load-error').hidden=true;$('full').alt=`Collected visual reference ${p.id}`;$('full').src=url;$('original').href=url;$('filename').textContent=p.name;$('categories').textContent=tags(p).map(t=>labels.get(t)).join(' · ');$('dimensions').textContent=`${p.w} × ${p.h} pixels`;$('position').textContent=`${current+1} / ${visible.length}`;}
function open(i,trigger){returnFocus=trigger;show(i);dialog.showModal();document.body.style.overflow='hidden';$('close').focus();}
$('full').addEventListener('error',()=>{$('load-error').hidden=false});$('full').addEventListener('load',()=>{$('load-error').hidden=true});
$('close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{document.body.style.overflow='';$('full').removeAttribute('src');returnFocus?.focus({preventScroll:true});});
$('prev').onclick=()=>show(current-1);$('next').onclick=()=>show(current+1);dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(current+(e.key==='ArrowLeft'?-1:1));}});
let start=null;$('stage').addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});$('stage').addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));start=null},{passive:true});
$('size').oninput=e=>document.documentElement.style.setProperty('--tile',e.target.value+'px');$('filter').onchange=render;$('category').onchange=render;$('shuffle').onclick=()=>{for(let i=ordered.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ordered[i],ordered[j]]=[ordered[j],ordered[i]];}render();};render();
})();
