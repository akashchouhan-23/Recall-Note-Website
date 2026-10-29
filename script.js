const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9),now=()=>Date.now();
const COL=['#e9e576','#f0a8a8','#6cb4e0','#a8dcb0'],FC=[['#dff0ff','#9a9af7'],['#ffd9d9','#c4774f'],['#fffce6','#e8e37a']];
let S={notes:[],folders:[]},view='home',rng='all',tag=null,q='',cur=null,cf=null,nc=0,dt='';
let history=[],historyIndex=-1,historyTimer=null,restoringHistory=false;

/* storage: IndexedDB */
const db=()=>new Promise((res,rej)=>{const r=indexedDB.open('recall',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function load(){try{const d=await db();return await new Promise(r=>{const g=d.transaction('kv').objectStore('kv').get('state');g.onsuccess=()=>r(g.result);g.onerror=()=>r(null)})}catch(e){return null}}
async function save(){try{const d=await db();d.transaction('kv','readwrite').objectStore('kv').put(JSON.parse(JSON.stringify(S)),'state');$('st').textContent=wc()+' · saved '+tstr(now()).split(',')[0]}catch(e){}}
let tm;const persist=()=>{clearTimeout(tm);tm=setTimeout(save,300)};

/* helpers */
const get=()=>S.notes.find(n=>n.id===cur);
const wc=()=>{const n=get();return n?(n.content.trim()?n.content.trim().split(/\s+/).length:0)+' words':''};
const dstr=t=>new Date(t).toLocaleDateString(),tstr=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+', '+new Date(t).toLocaleDateString([],{weekday:'long'});
function mk(title,fid){const n={id:uid(),title,summary:'',content:'',tags:[],folderId:fid===undefined?cf:fid,pinned:false,deleted:false,archived:false,color:COL[nc],createdAt:now(),updatedAt:now()};S.notes.push(n);persist();return n}
const touch=n=>{n.updatedAt=now();persist()};
const rank=n=>{const t=q.toLowerCase();let s=0;if(n.title.toLowerCase().includes(t))s+=10;s+=n.content.toLowerCase().split(t).length-1;if(n.tags.some(x=>x.toLowerCase().includes(t)))s+=5;return s};
const inR=t=>{if(rng==='all')return true;const d=new Date(),s=+new Date(d.getFullYear(),d.getMonth(),d.getDate());return rng==='day'?t>=s:rng==='week'?t>=s-6*864e5:t>=+new Date(d.getFullYear(),d.getMonth(),1)};
function pool(){let p=S.notes;
 if(view==='trash')p=p.filter(n=>n.deleted);
 else{p=p.filter(n=>!n.deleted&&(view==='archive')===!!n.archived);
  if(view==='pinned')p=p.filter(n=>n.pinned);
  if(view==='cal'&&dt)p=p.filter(n=>[n.updatedAt,n.createdAt].some(t=>new Date(t).toLocaleDateString('en-CA')===dt))}
 if(tag)p=p.filter(n=>n.tags.includes(tag));
 if(q)return p.map(n=>[n,rank(n)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 if(view==='home'&&!tag)p=p.filter(n=>(n.folderId||null)===cf);
 return p.filter(n=>inR(n.updatedAt)).sort((a,b)=>b.pinned-a.pinned||b.updatedAt-a.updatedAt)}

/* render */
const card=n=>`<div class="nc" style="background:${n.color||COL[0]}" data-n="${n.id}"><div class="fh"><small>${dstr(n.updatedAt)}</small><div class="card-menu-wrap">${view==='trash'?`<button class="perm-delete" data-perm-delete="${n.id}" title="Delete permanently" aria-label="Delete permanently">🗑</button>`:`<button class="card-menu-btn" data-menu-toggle="${n.id}" title="More options" aria-label="More options">⋯</button><div class="card-menu" data-menu="${n.id}"><button data-card-action="export" data-id="${n.id}">⬇️ Export as Markdown</button><button data-card-action="pin" data-id="${n.id}">${n.pinned?'📌 Unpin note':'📌 Pin note'}</button><button data-card-action="archive" data-id="${n.id}">${n.archived?'📂 Move to notes':'🗄️ Send to archive'}</button><button class="danger" data-card-action="trash" data-id="${n.id}">🗑️ Move to Trash</button></div>`}</div></div><div class="ctt"><b>${n.pinned?'📌 ':''}${esc(n.title||'Untitled')}</b><span class="ic">✎</span></div><p>${esc(n.summary||n.content.replace(/[#*>\[\]`-]/g,' ').slice(0,200)||'Empty note')}</p>${n.tags.length?`<div class="tg">${n.tags.map(t=>'#'+esc(t)).join(' ')}</div>`:''}<div class="ft">⏱ ${tstr(n.updatedAt)}</div></div>`;
function render(){
 const T={home:'My Notes',pinned:'Pinned',cal:'Calendar',archive:'Archive',trash:'Trash'};
 $('ttl').textContent=T[view];
 $('nav').innerHTML=[['home','🏠','All notes'],['pinned','📌','Pinned'],['cal','🗓','Calendar'],['archive','🗄','Archive'],['trash','🗑','Trash']].map(([v,i,l])=>`<a data-v="${v}" class="${view===v?'on':''}">${i} ${l}</a>`).join('');
 $('dots').innerHTML=COL.map((c,i)=>`<i data-c="${i}" class="${nc===i?'on':''}" style="background:${c}"></i>`).join('');
 const sf=view==='home'&&!q&&!tag;$('fsec').hidden=!sf;
 if(sf){const path=[];for(let f=cf;f;){const x=S.folders.find(y=>y.id===f);if(!x)break;path.unshift(x);f=x.parentId}
  $('bc').innerHTML='<a data-f="">Home</a>'+path.map(x=>` / <a data-f="${x.id}">${esc(x.name)}</a>`).join('');
  $('fg').innerHTML=S.folders.filter(f=>f.parentId===cf).map((f,i)=>{const c=FC[i%3];return `<div class="fc" style="background:${c[0]}" data-f="${f.id}"><div class="fh"><span class="fi" style="background:${c[1]}"></span><span class="mn" data-df="${f.id}" title="Delete folder">✕</span></div><div><b>${esc(f.name)}</b><br><small>${dstr(f.createdAt||now())}</small></div></div>`}).join('')+'<div class="dz" id="nfc">📁<span>New folder</span></div>'}
 $('rt').innerHTML=[['day','Today'],['week','This Week'],['month','This Month'],['all','All']].map(([r,l])=>`<a data-r="${r}" class="${rng===r?'on':''}">${l}</a>`).join('')+(view==='cal'?`<input type="date" id="dt" value="${dt}">`:'');
 const tags=[...new Set(S.notes.filter(n=>!n.deleted).flatMap(n=>n.tags))].sort();
 $('chips').innerHTML=tags.map(t=>`<span class="chip ${tag===t?'on':''}" data-tag="${esc(t)}">#${esc(t)}</span>`).join('');
 const p=pool();
 $('ng').innerHTML=p.map(card).join('')+(view==='home'&&!q?'<div class="dz nz" id="nnc">✎<span>New Note</span></div>':(p.length?'':'<div class="empty">Nothing here yet</div>'));
 $('cnt').textContent=S.notes.filter(n=>!n.deleted).length+' notes'}

/* editor */
const opts=(pid,p)=>S.folders.filter(f=>f.parentId===pid).map(f=>`<option value="${f.id}">${esc(p+f.name)}</option>`+opts(f.id,p+f.name+' / ')).join('');
function open(id){cur=id;const n=get();if(!n)return;
 $('ed').hidden=false;$('ti').value=n.title;$('summary').value=n.summary||'';$('tg').value=n.tags.join(', ');$('tx').value=n.content;
 history=[JSON.stringify({title:n.title,summary:n.summary||'',content:n.content})];historyIndex=0;updateHistoryButtons();
 $('fo').innerHTML='<option value="">Root</option>'+opts(null,'');$('fo').value=n.folderId||'';
 $('ecol').innerHTML=COL.map((c,i)=>`<i data-ec="${i}" class="${n.color===c?'on':''}" style="background:${c}"></i>`).join('');
 $('bp').textContent=n.pinned?'Unpin':'Pin';$('ba').textContent=n.archived?'Unarchive':'Archive';$('bd').textContent=n.deleted?'Restore':'Trash';$('bf').hidden=!n.deleted;
 prev();backlinks();$('st').textContent=wc()}
function close(){$('ed').hidden=true;cur=null;render()}
function renderMarkdown(src){
 // Small local Markdown renderer: no CDN needed, so preview works offline.
 const inline=s=>esc(s)
  .replace(/`([^`]+)`/g,'<code>$1</code>')
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/\*(.+?)\*/g,'<em>$1</em>')
  .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
 const lines=String(src).split(/\r?\n/);let out=[],list=null,code=false,codeLines=[];
 const endList=()=>{if(list){out.push('</'+list+'>');list=null}};
 for(const line of lines){
  if(/^```/.test(line)){if(code){out.push('<pre><code>'+esc(codeLines.join('\n'))+'</code></pre>');codeLines=[];code=false}else{endList();code=true}continue}
  if(code){codeLines.push(line);continue}
  let m;
  if((m=line.match(/^\s*[-*+]\s+(.+)/))){if(list!=='ul'){endList();out.push('<ul>');list='ul'}out.push('<li>'+inline(m[1])+'</li>');continue}
  if((m=line.match(/^\s*\d+\.\s+(.+)/))){if(list!=='ol'){endList();out.push('<ol>');list='ol'}out.push('<li>'+inline(m[1])+'</li>');continue}
  endList();
  if(!line.trim()){out.push('');continue}
  if((m=line.match(/^(#{1,6})\s+(.+)/))){const h=m[1].length;out.push('<h'+h+'>'+inline(m[2])+'</h'+h+'>');continue}
  if(/^>\s?/.test(line)){out.push('<blockquote>'+inline(line.replace(/^>\s?/,''))+'</blockquote>');continue}
  out.push('<p>'+inline(line)+'</p>');
 }
 endList();if(code)out.push('<pre><code>'+esc(codeLines.join('\n'))+'</code></pre>');return out.join('\n');
}
function prev(){const n=get();if(!n)return;
 const c=n.content.replace(/\[\[(.+?)\]\]/g,(m,t)=>`<a data-t="${esc(t)}">${esc(t)}</a>`);
 $('pv').innerHTML=renderMarkdown(c)}
function backlinks(){const n=get();if(!n)return;const t='[['+n.title.toLowerCase()+']]';
 const b=S.notes.filter(m=>!m.deleted&&m.id!==n.id&&m.content.toLowerCase().includes(t));
 $('bl').innerHTML=b.length?'Linked from: '+b.map(m=>`<a data-n="${m.id}">${esc(m.title)}</a>`).join(''):'No backlinks yet. Link a note with [[title]]'}
$('ti').oninput=()=>{const n=get();n.title=$('ti').value;touch(n);backlinks();recordHistory()};
$('summary').oninput=()=>{const n=get();n.summary=$('summary').value;touch(n);recordHistory()};
$('tg').oninput=()=>{const n=get();n.tags=$('tg').value.split(',').map(s=>s.trim()).filter(Boolean);touch(n)};
$('tx').oninput=()=>{const n=get();n.content=$('tx').value;touch(n);prev();$('st').textContent=wc();recordHistory()};
function recordHistory(){if(restoringHistory)return;clearTimeout(historyTimer);historyTimer=setTimeout(()=>{const n=get();if(!n)return;const snap=JSON.stringify({title:n.title,summary:n.summary||'',content:n.content});if(history[historyIndex]===snap)return;history=history.slice(0,historyIndex+1);history.push(snap);if(history.length>100)history.shift();historyIndex=history.length-1;updateHistoryButtons()},250)}
function updateHistoryButtons(){$('undoBtn').disabled=historyIndex<=0;$('redoBtn').disabled=historyIndex<0||historyIndex>=history.length-1}
function applyHistory(index){if(index<0||index>=history.length)return;historyIndex=index;const n=get();if(!n)return;const snap=JSON.parse(history[index]);restoringHistory=true;n.title=snap.title;n.summary=snap.summary;n.content=snap.content;$('ti').value=n.title;$('summary').value=n.summary;$('tx').value=n.content;touch(n);prev();backlinks();$('st').textContent=wc();restoringHistory=false;updateHistoryButtons()}
$('undoBtn').onclick=()=>{clearTimeout(historyTimer);applyHistory(historyIndex-1)};
$('redoBtn').onclick=()=>{clearTimeout(historyTimer);applyHistory(historyIndex+1)};
$('saveBtn').onclick=async()=>{const n=get();if(!n)return;n.title=$('ti').value.trim()||'Untitled';n.summary=$('summary').value.trim();n.content=$('tx').value;n.tags=$('tg').value.split(',').map(s=>s.trim()).filter(Boolean);n.folderId=$('fo').value||null;n.updatedAt=now();await save();render();$('st').textContent='Saved successfully ✓'};
$('fo').onchange=()=>{const n=get();n.folderId=$('fo').value||null;touch(n)};
$('bp').onclick=()=>{const n=get();n.pinned=!n.pinned;touch(n);open(cur)};
$('ba').onclick=()=>{const n=get();n.archived=!n.archived;touch(n);close()};
$('bd').onclick=()=>{const n=get();n.deleted=!n.deleted;touch(n);close()};
$('bf').onclick=()=>{S.notes=S.notes.filter(n=>n.id!==cur);persist();close()};
$('cl').onclick=close;
function add(){const n=mk('Untitled',view==='home'?cf:null);if(view!=='home'&&view!=='cal'){view='home'}q='';$('q').value='';open(n.id);$('ti').select()}
$('nn').onclick=add;
$('q').oninput=()=>{q=$('q').value.trim();render()};
function startNF(){const c=$('nfc');c.innerHTML='<input id="nfi" placeholder="Folder name">';const i=$('nfi');i.focus();
 i.onkeydown=e=>{if(e.key==='Enter'&&i.value.trim()){S.folders.push({id:uid(),name:i.value.trim(),parentId:cf,createdAt:now()});persist();render()}if(e.key==='Escape')render()};i.onblur=()=>render()}
function delF(id){const f=S.folders.find(x=>x.id===id);S.folders.forEach(x=>{if(x.parentId===id)x.parentId=f.parentId});S.notes.forEach(n=>{if(n.folderId===id)n.folderId=f.parentId});S.folders=S.folders.filter(x=>x.id!==id);if(cf===id)cf=f.parentId;persist();render()}

/* import / export */
function dl(text,name){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text]));a.download=name;a.click()}catch(e){}}
function panel(title,text,name){$('bh').textContent=title;$('bt').value=text;$('bk').hidden=false;if(name)dl(text,name)}
$('ex').onclick=()=>panel('Export (JSON backup)',JSON.stringify(S,null,2),'recall-backup.json');
$('bm').onclick=()=>{const n=get();panel('Export note (Markdown)','# '+n.title+'\n\n'+n.content,(n.title||'note')+'.md')};
$('im').onclick=()=>{$('bh').textContent='Import';$('bt').value='';$('bk').hidden=false};
$('bc2').onclick=()=>$('bk').hidden=true;
$('bi').onclick=()=>{const t=$('bt').value.trim();if(!t)return;
 try{const d=JSON.parse(t),ns=Array.isArray(d)?d:d.notes||[];
  ns.forEach(n=>{const i=S.notes.findIndex(x=>x.id===n.id);const c={id:n.id||uid(),title:n.title||'Untitled',summary:n.summary||'',content:n.content||'',tags:n.tags||[],folderId:n.folderId||null,pinned:!!n.pinned,deleted:!!n.deleted,archived:!!n.archived,color:n.color||COL[0],createdAt:n.createdAt||now(),updatedAt:n.updatedAt||now()};i>=0?S.notes[i]=c:S.notes.push(c)});
  (d.folders||[]).forEach(f=>{if(!S.folders.some(x=>x.id===f.id))S.folders.push(f)})
 }catch(e){const l=t.split('\n');const n=mk(l[0].replace(/^#+\s*/,'').slice(0,80)||'Imported',null);n.content=l.slice(1).join('\n').trim()}
 persist();$('bk').hidden=true;render()};

/* events */
document.addEventListener('click',e=>{const g=s=>e.target.closest(s);let x;
 if(e.target.id==='nfi')return;
 if(x=g('[data-menu-toggle]')){e.stopPropagation();const id=x.dataset.menuToggle;document.querySelectorAll('.card-menu.open').forEach(m=>{if(m.dataset.menu!==id)m.classList.remove('open')});const menu=document.querySelector(`[data-menu=\"${id}\"]`);if(menu)menu.classList.toggle('open');return}
 if(x=g('[data-card-action]')){e.stopPropagation();const id=x.dataset.id,n=S.notes.find(n=>n.id===id);if(!n)return;const action=x.dataset.cardAction;if(action==='export'){dl('# '+(n.title||'Untitled')+'\n\n'+(n.summary?'> '+n.summary+'\n\n':'')+(n.content||''),(n.title||'note').replace(/[\\/:*?\"<>|]/g,'-')+'.md')}else if(action==='pin'){n.pinned=!n.pinned;touch(n);render()}else if(action==='archive'){n.archived=!n.archived;n.deleted=false;touch(n);render()}else if(action==='trash'){n.deleted=true;touch(n);if(cur===id){$('ed').hidden=true;cur=null}render()}return}
 if(!g('.card-menu-wrap'))document.querySelectorAll('.card-menu.open').forEach(m=>m.classList.remove('open'));
 if(x=g('[data-df]')){delF(x.dataset.df);return}
 if(x=g('[data-perm-delete]')){e.stopPropagation();const id=x.dataset.permDelete;const n=S.notes.find(n=>n.id===id);if(n&&confirm('Delete this note permanently? This cannot be undone.')){S.notes=S.notes.filter(n=>n.id!==id);if(cur===id){$('ed').hidden=true;cur=null}persist();render()}return}
 if(x=g('[data-f]')){cf=x.dataset.f||null;view='home';q='';$('q').value='';render();return}
 if(x=g('[data-n]')){open(x.dataset.n);return}
 if(x=g('[data-v]')){view=x.dataset.v;tag=null;q='';$('q').value='';render();return}
 if(x=g('[data-r]')){rng=x.dataset.r;render();return}
 if(x=g('[data-tag]')){tag=tag===x.dataset.tag?null:x.dataset.tag;render();return}
 if(x=g('[data-c]')){nc=+x.dataset.c;render();return}
 if(x=g('[data-ec]')){const n=get();n.color=COL[+x.dataset.ec];touch(n);open(cur);return}
 if(x=g('[data-t]')){const t=x.dataset.t.toLowerCase();let n=S.notes.find(m=>!m.deleted&&m.title.toLowerCase()===t)||mk(x.dataset.t,null);open(n.id);return}
 if(g('#nfc')){startNF();return}
 if(g('#nnc'))add()});
document.addEventListener('change',e=>{if(e.target.id==='dt'){dt=e.target.value;render()}});
document.addEventListener('keydown',e=>{
 if(e.altKey&&e.code==='KeyN'){e.preventDefault();add()}
 if(e.altKey&&e.code==='KeyF'){e.preventDefault();$('q').focus()}
 if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save()}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!$('ed').hidden){e.preventDefault();applyHistory(historyIndex-1)}
 if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))&&!$('ed').hidden){e.preventDefault();applyHistory(historyIndex+1)}
 if(e.key==='Escape'&&!$('ed').hidden)close()});
$('th').onclick=()=>{const r=document.documentElement,d=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);r.dataset.theme=d?'light':'dark';try{localStorage.setItem('theme',r.dataset.theme)}catch(e){}};
try{const t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}

/* start */
(async()=>{
 const d=await load();
 if(d&&d.notes){S=d;S.folders=S.folders||[]}
 else{const t=now();
  S.folders=[{id:'f1',name:'Study',parentId:null,createdAt:t},{id:'f2',name:'Personal',parentId:null,createdAt:t}];
  S.notes=[
   {id:'n1',title:'Welcome to Recall',summary:'A quick guide to using your offline notes.',content:'# Welcome\n\nThis app works **offline**. Notes are saved in your browser.\n\n- Write in *Markdown*\n- Add tags above\n- Link notes like this: [[Ideas]]\n\n```js\nconsole.log("hello");\n```',tags:['start'],folderId:null,pinned:true,deleted:false,archived:false,color:COL[0],createdAt:t,updatedAt:t},
   {id:'n2',title:'Ideas',summary:'Things to build next.',content:'Things to build next. See [[Welcome to Recall]].',tags:['js'],folderId:'f1',pinned:false,deleted:false,archived:false,color:COL[1],createdAt:t,updatedAt:t},
   {id:'n3',title:'Mid test exam',summary:'Revise DOM, events and arrays.',content:'Revise DOM, events and arrays before the test.',tags:['study'],folderId:null,pinned:false,deleted:false,archived:false,color:COL[2],createdAt:t,updatedAt:t}];
  save()}
 render()})();


/* PWA install + offline cache */
let installPrompt=null;
const installBtn=$('installBtn');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(installBtn)installBtn.hidden=false});
if(installBtn)installBtn.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installBtn.hidden=true});
window.addEventListener('appinstalled',()=>{if(installBtn)installBtn.hidden=true});
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline worker registration failed:',err)));
}
