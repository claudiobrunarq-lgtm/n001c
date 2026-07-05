/* Arquitectura del Encuentro v0.4
   Prioridades: presencia en tiempo real, alertas in-app, propuestas según interacción,
   multimedia paralela por WhatsApp. */
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const view = $('#view');
const routes = ['home','bedroom','mirror','bridge','lab','garden'];
const otherOf = name => name === 'Claudio' ? 'Noe' : 'Claudio';
const now = () => Date.now();
const fmt = ts => new Date(ts||Date.now()).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const wa = text => `https://wa.me/?text=${encodeURIComponent(text)}`;

const LS = {
  house: localStorage.getItem('ae.house') || 'claudio-noe',
  name: localStorage.getItem('ae.name') || '',
  route: localStorage.getItem('ae.route') || 'home',
};

let state = { feed: {}, presence: {}, mirror: {}, bridge: {}, discoveries: {}, suggestion: null };
let lastSeenFeed = new Set();
let db = null, houseRef = null, connected = false, unsub = [];

function firebaseReady(){
  return window.AE_FIREBASE && !window.AE_FIREBASE.demoMode && window.firebase && window.AE_FIREBASE.config?.apiKey && !window.AE_FIREBASE.config.apiKey.includes('PEGAR');
}

function initFirebase(){
  if(!firebaseReady()) return false;
  try{
    if(!firebase.apps.length) firebase.initializeApp(window.AE_FIREBASE.config);
    db = firebase.database();
    houseRef = db.ref(`houses/${LS.house}`);
    connected = true;
    return true;
  }catch(e){ console.warn(e); connected = false; return false; }
}

function localGet(){ return JSON.parse(localStorage.getItem('ae.localState') || '{}'); }
function localSet(obj){ localStorage.setItem('ae.localState', JSON.stringify(obj)); }

function write(path, value){
  if(connected) return houseRef.child(path).set(value);
  const s = localGet();
  const parts = path.split('/'); let cur = s;
  while(parts.length>1){ const p=parts.shift(); cur[p]=cur[p]||{}; cur=cur[p]; }
  cur[parts[0]]=value; localSet(s); state = {...state, ...s}; render();
}
function push(path, value){
  if(connected) return houseRef.child(path).push(value);
  const s = localGet(); const key = 'local_'+Date.now()+Math.random().toString(36).slice(2,6);
  s[path]=s[path]||{}; s[path][key]=value; localSet(s); state={...state,...s}; render();
}
function update(path, value){
  if(connected) return houseRef.child(path).update(value);
  const s = localGet(); s[path]={...(s[path]||{}),...value}; localSet(s); state={...state,...s}; render();
}

function listen(){
  if(connected){
    houseRef.on('value', snap => {
      const incoming = snap.val() || {};
      const old = state.feed || {};
      state = {...state, ...incoming};
      detectNewFeed(old, state.feed || {});
      render();
    });
    if(LS.name){
      const p = houseRef.child(`presence/${LS.name}`);
      p.onDisconnect().update({online:false,last:firebase.database.ServerValue.TIMESTAMP});
      setInterval(()=> p.update({online:true,last:firebase.database.ServerValue.TIMESTAMP, route:LS.route}), 12000);
      p.update({online:true,last:firebase.database.ServerValue.TIMESTAMP, route:LS.route});
    }
  }else{
    state = {...state, ...localGet()};
  }
}

function detectNewFeed(oldFeed, newFeed){
  const entries = Object.entries(newFeed||{});
  entries.forEach(([id,item])=>{
    if(!oldFeed[id] && item?.who && item.who !== LS.name){
      alertHouse(`${item.who} dejó algo en ${roomName(item.room)}.`);
    }
  });
}

function alertHouse(msg){
  if(navigator.vibrate) navigator.vibrate([60,30,60]);
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),3600);
  document.title = '✦ '+msg;
  setTimeout(()=>document.title='Arquitectura del Encuentro',5000);
  if('Notification' in window && Notification.permission === 'granted') new Notification('La Casa', {body:msg, icon:'./icon-192.png'});
}

function roomName(r){ return ({home:'La Casa',bedroom:'La Habitación',mirror:'El Espejo',bridge:'El Puente',lab:'El Laboratorio',garden:'El Jardín'})[r]||r; }
function setRoute(route){ LS.route=route; localStorage.setItem('ae.route',route); $$('.dock-item').forEach(b=>b.classList.toggle('active',b.dataset.route===route)); if(connected && LS.name) update(`presence/${LS.name}`,{route,online:true,last:now()}); render(); }

document.addEventListener('click', e=>{
  const d=e.target.closest('[data-route]'); if(d) setRoute(d.dataset.route);
  const action=e.target.closest('[data-action]'); if(action) actions[action.dataset.action]?.(action);
});
document.addEventListener('input', e=>{
  const r=e.target.closest('input[type=range][data-live]');
  if(r && LS.name){
    write(`live/${LS.name}/${r.dataset.live}`, {value:+r.value, at:now()});
    const out = $(`[data-out="${r.dataset.live}"]`); if(out) out.textContent=r.value;
  }
});

const actions = {
  enter(){
    const name=$('#name').value, house=($('#house').value||'claudio-noe').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');
    if(!name) return alertHouse('Elegí quién entra a La Casa.');
    localStorage.setItem('ae.name',name); localStorage.setItem('ae.house',house); location.reload();
  },
  notify(){ if('Notification' in window) Notification.requestPermission().then(p=>alertHouse(p==='granted'?'Alertas activadas en este dispositivo.':'Las alertas quedaron desactivadas.')); },
  saveBedroom(){ saveText('bedroom',$('#bedroomText').value,'desayuno'); $('#bedroomText').value=''; },
  saveMirror(){
    const payload = {energia:+$('#energia').value, contacto:+$('#contacto').value, pudor:+$('#pudor').value, deseo:+$('#deseo').value, silencio:+$('#silencio').value, cuerpo:$('#cuerpo').value, at:now()};
    write(`mirror/${LS.name}`, payload);
    push('feed',{who:LS.name,room:'mirror',type:'estado',text:`Energía ${payload.energia}/10 · Contacto ${payload.contacto}/10 · Deseo ${payload.deseo}/10`, at:now()});
    alertHouse('Tu estado quedó en El Espejo.');
  },
  saveBridge(){ saveText('bridge',$('#bridgeText').value,'traducción'); $('#bridgeText').value=''; },
  saveGarden(){ saveText('garden',$('#gardenText').value,'descubrimiento'); $('#gardenText').value=''; },
  newSuggestion(){ const s = makeSuggestion(); write('suggestion', s); push('feed',{who:'La Casa',room:'lab',type:'propuesta',text:s.title, at:now()}); },
  acceptSuggestion(){ const s=state.suggestion; if(!s) return; push('feed',{who:LS.name,room:'lab',type:'acepta',text:`Acepto la experiencia: ${s.title}`,at:now()}); },
  whatsappAudio(){ window.open(wa(`Pedido desde La Casa: ¿me dejás un audio breve? Una frase, una respiración, o algo que quieras que escuche hoy.`),'_blank'); },
  whatsappPhoto(){ window.open(wa(`Pedido desde La Casa: ¿me dejás una foto/pista cómplice para habitar este momento? No hace falta explicar demasiado.`),'_blank'); },
  whatsappInvite(){ window.open(wa(`Entré a La Casa. Te dejo la puerta entreabierta. ¿Entrás conmigo un rato? ${location.href}`),'_blank'); },
  copyLink(){ navigator.clipboard?.writeText(location.href); alertHouse('Link copiado.'); },
};
function saveText(room,text,type){
  if(!LS.name) return alertHouse('Primero elegí quién sos en La Casa.');
  text=(text||'').trim(); if(!text) return alertHouse('Escribí algo antes de dejarlo en la casa.');
  push('feed',{who:LS.name,room,type,text,at:now()});
}

function makeSuggestion(){
  const m = state.mirror || {}; const me = m[LS.name] || {}; const other = m[otherOf(LS.name)] || {};
  const avg = k => Math.round((((me[k]||5)+(other[k]||5))/2)*10)/10;
  const energia=avg('energia'), contacto=avg('contacto'), deseo=avg('deseo'), pudor=avg('pudor'), silencio=avg('silencio');
  let title, body, why;
  if(silencio>=7 || energia<=4){ title='Habitación en voz baja'; body='Diez minutos en la cama sin resolver nada. Sólo una mano apoyada y una pregunta: ¿qué necesitó tu cuerpo hoy?'; why='La Casa leyó cansancio o necesidad de silencio.'; }
  else if(contacto>=7 && pudor<=5){ title='Piel con permiso'; body='Una persona guía durante 6 minutos dónde quiere recibir contacto. La otra sólo escucha con las manos. Sin avanzar, sin obligación.'; why='Hay apertura al contacto y bajo pudor.'; }
  else if(deseo>=7){ title='La puerta entreabierta'; body='Uno envía por WhatsApp una pista visual o de audio. El otro responde sólo con una palabra: más, pausa o cerca.'; why='Hay deseo disponible; la propuesta cuida el juego sin presionar.'; }
  else { title='Mapa de cercanía'; body='Cada uno escribe una cosa mínima que hoy lo haría sentirse más cerca. Después eligen sólo una y la hacen simple.'; why='La Casa propone una acción pequeña para volver a encontrarse.'; }
  return {title,body,why,energia,contacto,deseo,pudor,silencio,at:now()};
}

function render(){
  if(!LS.name) return renderEntry();
  const map={home:Home,bedroom:Bedroom,mirror:Mirror,bridge:Bridge,lab:Lab,garden:Garden};
  view.innerHTML = map[LS.route]();
  $$('.dock-item').forEach(b=>b.classList.toggle('active',b.dataset.route===LS.route));
}

function Shell(kicker,title,content,extra=''){
 return `<section class="space"><div class="hero"><div class="kicker">${kicker}</div><h1>${title}</h1>${content}</div>${extra}</section>`;
}
function presenceHtml(){
 const p=state.presence||{}; return `<div class="status">
  ${['Claudio','Noe'].map(n=>`<span class="pill"><i class="pulse-dot ${p[n]?.online?'online':''}"></i>${n}${p[n]?.route?` · ${roomName(p[n].route)}`:''}</span>`).join('')}
  <span class="pill">${connected?'Tiempo real activo':'Modo local / configurar Firebase'}</span>
 </div>`;
}
function feedHtml(room=null,limit=8){
 const items=Object.entries(state.feed||{}).map(([id,v])=>({id,...v})).sort((a,b)=>(b.at||0)-(a.at||0)).filter(x=>!room||x.room===room).slice(0,limit);
 if(!items.length) return `<p class="soft">Todavía no hay rastros en este espacio.</p>`;
 return items.map(x=>`<div class="feed-item"><div class="row between"><span><b class="who">${x.who}</b> <span class="room-tag">${roomName(x.room)}</span></span><span class="time">${fmt(x.at)}</span></div><p>${escapeHtml(x.text)}</p></div>`).join('');
}
function Home(){
 return Shell('Umbral compartido','La Casa',`<p>Entrar a esta casa es habitar al otro y habitarse a uno mismo. Este espacio existe para activar intimidad, bajar algunos filtros y encontrarse sin apuro.</p>${presenceHtml()}<div class="row"><button class="btn" data-action="whatsappInvite">Invitar a entrar</button><button class="btn alt" data-action="notify">Activar alertas</button></div>`,
 `<div class="card"><div class="kicker">Rastros recientes</div>${feedHtml(null,5)}</div><div class="card"><div class="kicker">Código de casa</div><p><b>${LS.house}</b></p><p class="soft">Ambos deben entrar con el mismo código para compartir la misma casa.</p></div>`);
}
function Bedroom(){
 return Shell('La Habitación','Desayuno en la cama',`<p>Este espacio no es una mesa: es la habitación donde empieza el día. Una pregunta, una pista, una invitación suave.</p>${presenceHtml()}`,
 `<div class="card"><div class="label">Pregunta para hoy</div><p><b>¿Qué gesto pequeño podría hacer hoy para que te sientas más habitado/a por mí?</b></p><textarea id="bedroomText" placeholder="Dejá tu respuesta para que el otro la vea..."></textarea><div class="row"><button class="btn" data-action="saveBedroom">Dejar en la cama</button><button class="btn alt whatsapp" data-action="whatsappAudio">Pedir audio</button></div></div><div class="card"><div class="kicker">Lo que quedó en la habitación</div>${feedHtml('bedroom')}</div>`);
}
function Slider(id,label,val=5){return `<div class="slider-card"><div class="row between"><b>${label}</b><span data-out="${id}">${val}</span></div><input id="${id}" data-live="${id}" type="range" min="0" max="10" value="${val}"></div>`}
function Mirror(){
 const m=state.mirror?.[LS.name]||{};
 return Shell('El Espejo','Estado del cuerpo',`<p>Barras de intensidad para que el otro vea cómo llegás hoy, sin tener que adivinar.</p>${presenceHtml()}`,
 `<div class="card grid">${Slider('energia','Energía',m.energia||5)}${Slider('contacto','Necesidad de contacto',m.contacto||5)}${Slider('pudor','Pudor / reserva',m.pudor||5)}${Slider('deseo','Deseo disponible',m.deseo||5)}${Slider('silencio','Necesidad de silencio',m.silencio||5)}<div><div class="label">Mi cuerpo hoy pide...</div><textarea id="cuerpo" placeholder="descanso, calor, juego, paciencia, piel, aire..."></textarea></div><button class="btn" data-action="saveMirror">Compartir estado</button></div><div class="card"><div class="kicker">Estados compartidos</div>${mirrorCompare()}</div>`);
}
function mirrorCompare(){ return ['Claudio','Noe'].map(n=>{const x=state.mirror?.[n]; return `<div class="feed-item"><b>${n}</b>${x?`<p>Energía ${x.energia}/10 · Contacto ${x.contacto}/10 · Deseo ${x.deseo}/10 · Pudor ${x.pudor}/10</p><p class="soft">${escapeHtml(x.cuerpo||'')}</p>`:`<p class="soft">Aún no compartió estado.</p>`}</div>`}).join(''); }
function Bridge(){
 return Shell('El Puente','Traductor',`<p>Un espacio para decir qué significa un gesto, un silencio o una distancia. Las respuestas se encuentran cuando ambos dejan algo.</p>${presenceHtml()}`,
 `<div class="card"><div class="label">Cuando hoy me acerco o me alejo, probablemente significa...</div><textarea id="bridgeText" placeholder="Escribí una traducción posible..."></textarea><button class="btn" data-action="saveBridge">Cruzar el puente</button></div><div class="card"><div class="kicker">Traducciones</div>${feedHtml('bridge')}</div>`);
}
function Lab(){
 const s=state.suggestion || makeSuggestion();
 return Shell('El Laboratorio','Experiencia compartida',`<p>La Casa lee los estados e interacciones y propone una única actividad para los dos.</p>${presenceHtml()}`,
 `<div class="card suggestion"><div class="kicker">Propuesta de La Casa</div><h2>${s.title}</h2><p>${s.body}</p><p class="soft">${s.why}</p><div class="row"><button class="btn" data-action="acceptSuggestion">Aceptar</button><button class="btn alt" data-action="newSuggestion">Otra propuesta</button></div></div><div class="card"><div class="kicker">Multimedia en paralelo</div><p class="soft">Las fotos y audios se comparten en el grupo de WhatsApp Claudio + Noe. La app propone el pedido y WhatsApp guarda el material.</p><div class="row"><button class="btn alt whatsapp" data-action="whatsappPhoto">Pedir foto/pista</button><button class="btn alt whatsapp" data-action="whatsappAudio">Pedir audio</button></div></div><div class="card"><div class="kicker">Actividad del laboratorio</div>${feedHtml('lab')}</div>`);
}
function Garden(){
 return Shell('El Jardín','Descubrimientos',`<p>No registra rendimiento. Guarda aquello que valió la pena descubrir.</p>${presenceHtml()}`,
 `<div class="card"><div class="label">Hoy descubrí...</div><textarea id="gardenText" placeholder="Algo pequeño, concreto, nuevo..."></textarea><button class="btn" data-action="saveGarden">Plantar descubrimiento</button></div><div class="card"><div class="kicker">Jardín compartido</div>${feedHtml('garden',20)}</div>`);
}
function renderEntry(){
 view.innerHTML = `<section class="space"><div class="hero"><div class="kicker">Arquitectura del Encuentro</div><h1>Entrar a La Casa</h1><p>No es entrar a una app. Es abrir un espacio compartido donde Claudio y Noe puedan encontrarse.</p><div class="label">Quién entra</div><select id="name"><option value="">Elegir...</option><option>Claudio</option><option>Noe</option></select><div class="label">Código de casa</div><input id="house" class="input" value="${LS.house}" placeholder="claudio-noe"><p class="soft">Usen exactamente el mismo código en ambos teléfonos.</p><button class="btn" data-action="enter">Entrar</button></div></section>`;
}
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
initFirebase(); listen(); render();
