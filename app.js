import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const cfg = window.AE_FIREBASE || { demoMode: true };
let db = null;
let state = { person:'Claudio', house:'claudio-noe', room:'umbral', online:false, data:{entries:{}, presence:{}, garden:{}} };
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const questions = [
  '¿Qué gesto pequeño podría hacernos sentir más cerca hoy?',
  '¿Qué parte de esta semana te gustaría que el otro entienda mejor?',
  '¿Qué recuerdo nuestro merece volver a la mesa esta mañana?',
  '¿Qué necesitás recibir hoy sin tener que explicarlo demasiado?',
  '¿Qué te gustaría cuidar de nosotros durante este día?'
];
const proposals = [
  {key:'cansancio', title:'Presencia sin demanda', body:'Diez minutos juntos, sin hablar de obligaciones. Una mano sobre la otra. Nada tiene que avanzar.'},
  {key:'contacto', title:'Mapa de manos', body:'Durante ocho minutos, recorrer manos, brazos y hombros. Sin objetivo. Sólo detectar dónde aparece calma.'},
  {key:'puente', title:'Traducción breve', body:'Cada uno completa: “Cuando hago ___, a veces quiero decir ___”. Después sólo preguntan para entender.'},
  {key:'juego', title:'Pedido cómplice', body:'Uno envía por WhatsApp un audio de menos de 30 segundos: “Hoy me gustaría que recuerdes…”'},
  {key:'desayuno', title:'Una taza, una frase', body:'En el próximo desayuno, cada uno responde: “Hoy entro a La Casa con…”'}
];
function safeKey(v){ return String(v||'casa').trim().toLowerCase().replace(/[^a-z0-9-_]/gi,'-').slice(0,50) || 'casa'; }
function now(){ return new Date().toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}); }
function initFirebase(){
  if(cfg.demoMode){ $('#modeBadge').textContent='Modo demo/local: activá Firebase para tiempo real.'; return; }
  try{ const app = initializeApp(cfg.firebaseConfig); db = getDatabase(app); $('#modeBadge').textContent='Firebase listo: La Casa puede compartirse.'; }
  catch(e){ console.error(e); $('#modeBadge').textContent='No se pudo iniciar Firebase. Revisar firebase-config.js'; }
}
function path(p){ return `houses/${safeKey(state.house)}/${p}`; }
function enter(){
  state.person = $('#personSelect').value; state.house = $('#houseCode').value || 'claudio-noe';
  $('#gate').classList.remove('active'); $('#home').classList.add('active');
  $('#breakfastQuestion').textContent = questions[new Date().getDate() % questions.length];
  setRoom('umbral'); bindRealtime(); writePresence();
}
function bindRealtime(){
  if(db){
    onValue(ref(db,path('entries')), snap => { state.data.entries=snap.val()||{}; renderFeed(); renderProposal(); alertOther(); });
    onValue(ref(db,path('presence')), snap => { state.data.presence=snap.val()||{}; renderPresence(); });
    onValue(ref(db,path('garden')), snap => { state.data.garden=snap.val()||{}; renderGarden(); });
  } else {
    const raw = localStorage.getItem('ae-demo-'+safeKey(state.house));
    state.data = raw ? JSON.parse(raw) : {entries:{},presence:{},garden:{}};
    renderFeed(); renderGarden(); renderProposal(); renderPresence();
  }
}
function persistLocal(){ localStorage.setItem('ae-demo-'+safeKey(state.house), JSON.stringify(state.data)); renderFeed(); renderGarden(); renderProposal(); }
function writePresence(){
  const info = {person:state.person, room:state.room, at:Date.now()};
  if(db){ const r=ref(db,path(`presence/${state.person}`)); set(r,info); onDisconnect(r).remove(); }
  else { state.data.presence[state.person]=info; persistLocal(); }
}
function save(space){
  const values = {}; $$(`#space-${space} input[type=range]`).forEach(i=>values[i.dataset.field]=Number(i.value));
  const textEl = $(`#${space}Text`); const text = textEl ? textEl.value.trim() : '';
  const prompt = space==='puente' ? $('#bridgePrompt').value : space==='cama' ? $('#breakfastQuestion').textContent : '';
  const entry = {person:state.person, space, text, prompt, values, at:Date.now(), atLabel:now()};
  if(db) push(ref(db,path('entries')), entry);
  else { const k='k'+Date.now(); state.data.entries[k]=entry; persistLocal(); }
  if(space==='jardin'){
    const g = {person:state.person, text, at:Date.now(), atLabel:now()};
    if(db) push(ref(db,path('garden')), g); else { state.data.garden['g'+Date.now()]=g; persistLocal(); }
  }
  if(textEl) textEl.value='';
  toast('La Casa recibió tu intervención.');
}
function renderFeed(){
  const entries = Object.values(state.data.entries||{}).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,8);
  $('#sharedFeed').innerHTML = entries.length ? entries.map(e=>`<div class="item"><small>${e.atLabel||''} · ${e.person} · ${label(e.space)}</small><div>${escapeHtml(e.prompt?'<em>'+e.prompt+'</em><br>':'')}${escapeHtml(e.text||'Interacción registrada')}</div>${bars(e.values)}</div>`).join('') : '<div class="item">La Casa todavía está en silencio.</div>';
}
function renderGarden(){
  const items = Object.values(state.data.garden||{}).sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,6);
  $('#gardenList').innerHTML = items.map(g=>`<div class="item"><small>${g.atLabel} · ${g.person}</small><div>${escapeHtml(g.text)}</div></div>`).join('');
}
function renderPresence(){
  const p = Object.values(state.data.presence||{}).filter(x=>Date.now()-(x.at||0)<120000);
  const other = p.find(x=>x.person!==state.person);
  $('#presenceText').textContent = other ? `${other.person} está en ${label(other.room)}` : 'La Casa está disponible';
}
function renderProposal(){
  const entries=Object.values(state.data.entries||{}); let avg={energia:5,apertura:5,contacto:5,cuidado:5,conversar:5}; let n={};
  entries.slice(-12).forEach(e=>{ Object.entries(e.values||{}).forEach(([k,v])=>{avg[k]=(avg[k]||0)+v; n[k]=(n[k]||0)+1;}); });
  Object.keys(avg).forEach(k=>{ if(n[k]) avg[k]=Math.round(avg[k]/(n[k]+1)); });
  let p = proposals[4];
  if(avg.energia<=4 || avg.cuidado>=7) p=proposals[0];
  else if(avg.contacto>=7) p=proposals[1];
  else if(entries.some(e=>e.space==='puente')) p=proposals[2];
  else if(avg.apertura>=7) p=proposals[3];
  $('#proposal').innerHTML=`<strong>${p.title}</strong><p>${p.body}</p><small>Propuesta generada a partir de las últimas interacciones compartidas.</small>`;
}
function alertOther(){
  const entries=Object.values(state.data.entries||{}).sort((a,b)=>(b.at||0)-(a.at||0)); const last=entries[0];
  if(last && last.person!==state.person && Date.now()-last.at<15000) toast(`${last.person} dejó algo nuevo en ${label(last.space)}.`);
}
function setRoom(room){ state.room=room; $$('.space').forEach(s=>s.classList.remove('active')); $(`#space-${room}`).classList.add('active'); $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.target===room)); $('#roomTitle').textContent=label(room); writePresence(); }
function label(s){ return ({umbral:'El Umbral',cama:'La Cama',espejo:'El Espejo',puente:'El Puente',laboratorio:'Laboratorio',jardin:'El Jardín'})[s]||s; }
function bars(values={}){ return Object.entries(values).map(([k,v])=>`<small>${k}: ${v}/10</small>`).join(' · '); }
function toast(msg){ const n=document.createElement('div'); n.className='note'; n.textContent=msg; $('#notifications').appendChild(n); setTimeout(()=>n.remove(),5000); }
function escapeHtml(str){ return String(str||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function whatsapp(text){ window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank'); }
function bindUI(){
  $('#enterBtn').addEventListener('click',enter);
  $$('.nav button').forEach(b=>b.addEventListener('click',()=>setRoom(b.dataset.target)));
  $$('.save').forEach(b=>b.addEventListener('click',()=>save(b.dataset.space)));
  $$('input[type=range]').forEach(r=>r.addEventListener('input',()=>{ r.parentElement.querySelector('b').textContent=r.value; }));
  $('#askAudio').addEventListener('click',()=>whatsapp(`${state.person} desde La Casa: ¿me dejás un audio breve para seguir habitándonos hoy?`));
  $('#askPhoto').addEventListener('click',()=>whatsapp(`${state.person} desde La Casa: ¿me mandás una foto-pista de algo que te gustaría compartir conmigo hoy?`));
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
initFirebase(); bindUI();
