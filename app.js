const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

const rooms = {
  access: {type:'Umbral', title:'Arquitectura del Encuentro', cls:'room-access'},
  breakfast: {type:'Mesa', title:'El Desayuno', cls:'room-breakfast'},
  mirror: {type:'Habitación', title:'El Espejo', cls:'room-mirror'},
  bridge: {type:'Puente', title:'El Traductor', cls:'room-bridge'},
  lab: {type:'Taller', title:'El Laboratorio', cls:'room-lab'},
  garden: {type:'Jardín', title:'El Jardín', cls:'room-garden'}
};

const questions = [
  '¿Qué momento de esta semana me hizo sentir más cerca tuyo?',
  '¿Qué parte de nuestra relación querés cuidar especialmente este mes?',
  '¿Qué descubriste de mí que hace un tiempo no sabías?',
  '¿Qué gesto pequeño mío te hizo bien últimamente?',
  '¿Qué espacio nuevo te gustaría construir conmigo?',
  '¿Qué necesita nuestro vínculo esta semana: calma, juego, conversación o silencio?'
];

const experiences = [
  {title:'Respirar juntos', time:'8 min', energy:'baja', intimacy:'calma', text:'Siéntense espalda con espalda. No hablen. Sólo respiren y registren cómo cambia el cuerpo del otro a través del contacto.'},
  {title:'Mesa de dos tazas', time:'20 min', energy:'baja', intimacy:'conversación', text:'Preparen un desayuno o merienda. Cada uno responde: “Hoy necesito que me mires como…” y el otro sólo pregunta para entender.'},
  {title:'Redescubrir las manos', time:'10 min', energy:'media', intimacy:'contacto', text:'Durante diez minutos sólo pueden tocarse con las manos. No avanzar, no corregir, no demostrar. Sólo explorar.'},
  {title:'Elegir una prenda', time:'15 min', energy:'media', intimacy:'juego', text:'Cada uno elige una prenda para sí o para el otro y cuenta qué sensación quiere activar al usarla.'},
  {title:'Mapa de gratitud corporal', time:'18 min', energy:'media', intimacy:'cuerpo', text:'Cada uno nombra tres partes del propio cuerpo que agradece hoy y una parte del cuerpo del otro que mira con ternura.'},
  {title:'Bailar una canción', time:'5 min', energy:'alta', intimacy:'juego', text:'Elijan una canción. Bailen sin coreografía. Al terminar digan: “me gustó verte cuando…”'},
  {title:'Masaje sin deuda', time:'15 min', energy:'baja', intimacy:'cuidado', text:'Uno recibe un masaje de hombros o espalda. La regla: quien recibe no tiene obligación de devolverlo.'},
  {title:'Puerta abierta', time:'25 min', energy:'media', intimacy:'diálogo', text:'Cada uno completa: “Una parte de mí que todavía estoy aprendiendo a mostrarte es…” Luego escuchan sin solucionar.'}
];

function field(id, label, type='textarea', placeholder='Escribir sin apuro…'){
  if(type==='range') return `<div class="field"><label>${label}</label><div class="range-row"><input id="${id}" type="range" min="0" max="10" value="5"><output class="value" for="${id}">5</output></div></div>`;
  return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" placeholder="${placeholder}"></textarea></div>`;
}

function saveButton(key, ids){
  return `<button class="btn" data-save="${key}" data-ids="${ids.join(',')}">Guardar descubrimiento</button>`;
}

function render(route){
  const meta = rooms[route] || rooms.access;
  const el = $('#room');
  el.className = `room ${meta.cls}`;
  $('#roomType').textContent = meta.type;
  $('#roomTitle').textContent = meta.title;
  $$('.dock-item').forEach(b => b.classList.toggle('active', b.dataset.route===route));
  location.hash = route;
  if(route==='access') el.innerHTML = access();
  if(route==='breakfast') el.innerHTML = breakfast();
  if(route==='mirror') el.innerHTML = mirror();
  if(route==='bridge') el.innerHTML = bridge();
  if(route==='lab') el.innerHTML = lab();
  if(route==='garden') el.innerHTML = garden();
  bindRoom(route);
}

function access(){return `
  <section class="hero">
    <div>
      <div class="portal" aria-hidden="true"></div>
      <span class="pill">Un laboratorio para seguir descubriéndonos</span>
      <h2 class="title-xl">Una casa íntima para dos.</h2>
      <p class="lead">No mide el amor. No exige rendimiento. Propone espacios para escuchar el cuerpo, traducir el deseo y seguir construyendo encuentro.</p>
    </div>
    <div class="card">
      <p><strong>Modo de uso:</strong> entrar, elegir una habitación y responder de a poco. Lo importante no es completar todo: es que cada espacio produzca una conversación.</p>
      <button class="btn" data-go="breakfast">Entrar a la casa</button>
    </div>
  </section>`}

function breakfast(){ const q = questions[new Date().getDate() % questions.length]; return `
  <section>
    <div class="card">
      <span class="pill">Ritual de ustedes</span>
      <h2 class="prompt">${q}</h2>
      <p>Una pregunta, dos tazas, sin celulares. No se debate: se escucha, se pregunta y se descubre.</p>
    </div>
    ${field('breakfast_claudio','Claudio responde')}
    ${field('breakfast_noe','Noe responde')}
    ${saveButton('desayuno',['breakfast_claudio','breakfast_noe'])}
  </section>`}

function mirror(){return `
  <section>
    <div class="card"><h2>Antes del deseo, el cuerpo.</h2><p>Este espacio pregunta cómo llega cada uno hoy. No interpreta: acompaña.</p></div>
    <div class="grid two">${field('energia','Energía','range')}${field('dolor','Dolor físico','range')}${field('contacto','Necesidad de contacto','range')}${field('silencio','Necesidad de silencio','range')}</div>
    ${field('cuerpo_vivo','La parte de mi cuerpo que hoy siento más viva es…')}
    ${field('cuerpo_paciencia','La parte que hoy necesita más paciencia es…')}
    ${field('tocar','Hoy me gustaría que tocaras…', 'textarea', 'No necesariamente de modo sexual…')}
    ${field('no_tocar','Hoy prefiero que no…')}
    ${saveButton('espejo',['cuerpo_vivo','cuerpo_paciencia','tocar','no_tocar'])}
  </section>`}

function bridge(){return `
  <section>
    <div class="card"><h2>Traducirse sin corregirse.</h2><p>Primero interpreto. Después escucho. El objetivo no es acertar: es aprender el idioma del otro.</p></div>
    ${field('silencio_creo','Cuando estoy callado/a, creo que vos pensás que significa…')}
    ${field('silencio_real','En realidad significa…')}
    ${field('caricia_creo','Cuando rechazo una caricia, creo que vos sentís…')}
    ${field('caricia_real','En realidad ocurre que…')}
    ${field('busco_creo','Cuando te busco, creo que vos interpretás…')}
    ${field('busco_real','En realidad intento decirte…')}
    ${saveButton('traductor',['silencio_creo','silencio_real','caricia_creo','caricia_real','busco_creo','busco_real'])}
  </section>`}

function lab(){ const e = experiences[Math.floor(Math.random()*experiences.length)]; return `
  <section>
    <div class="card experience-card">
      <div>
        <span class="pill">Carta de experiencia</span>
        <h2 class="prompt">${e.title}</h2>
        <div class="tag-row"><span class="tag">${e.time}</span><span class="tag">energía ${e.energy}</span><span class="tag">${e.intimacy}</span></div>
        <p>${e.text}</p>
      </div>
      <button class="btn secondary" id="newExperience">Sacar otra carta</button>
    </div>
    ${field('lab_descubri','Después de la experiencia descubrí…')}
    ${field('lab_repetir','Me gustaría repetir o modificar…')}
    ${saveButton('laboratorio',['lab_descubri','lab_repetir'])}
  </section>`}

function garden(){ const seeds = store.get('seeds', []); return `
  <section>
    <div class="card"><h2>Lo que se descubre, crece.</h2><p>El jardín no muestra rendimiento. Guarda hallazgos, gestos, frases y cambios de estación.</p><p><strong>${seeds.length}</strong> descubrimientos guardados.</p></div>
    <div class="garden-list">${seeds.length ? seeds.map(seed => `<article class="seed"><time>${seed.date} · ${seed.room}</time><p>${seed.text}</p></article>`).join('') : `<div class="seed"><time>Primer brote</time><p>Todavía no hay descubrimientos guardados. Entren a una habitación y planten el primero.</p></div>`}</div>
    <button class="btn secondary" id="clearGarden">Vaciar jardín de prueba</button>
  </section>`}

function bindRoom(route){
  $$('input[type="range"]').forEach(r => { const out = r.nextElementSibling; r.addEventListener('input', () => out.textContent = r.value); });
  $$('[data-go]').forEach(b => b.onclick = () => render(b.dataset.go));
  $$('[data-save]').forEach(b => b.onclick = () => {
    const ids = b.dataset.ids.split(',');
    const text = ids.map(id => { const v = $('#'+id)?.value?.trim(); return v ? v : null; }).filter(Boolean).join(' · ');
    if(!text){ alert('Escriban algo para guardar este descubrimiento.'); return; }
    const seeds = store.get('seeds', []);
    seeds.unshift({date:new Date().toLocaleDateString('es-AR'), room:rooms[route].title, text});
    store.set('seeds', seeds.slice(0,80));
    alert('Guardado en El Jardín.');
  });
  const newExp = $('#newExperience'); if(newExp) newExp.onclick = () => render('lab');
  const clear = $('#clearGarden'); if(clear) clear.onclick = () => { if(confirm('¿Vaciar los datos de prueba del jardín?')){ store.set('seeds',[]); render('garden'); } };
}

function initMap(){
  const labels = {access:['Umbral','Entrar sin apuro'], breakfast:['El Desayuno','La mesa cotidiana de conversación'], mirror:['El Espejo','Escuchar el cuerpo de hoy'], bridge:['El Traductor','Aprender el idioma del otro'], lab:['El Laboratorio','Probar experiencias sin presión'], garden:['El Jardín','Guardar descubrimientos']};
  $('#mapLinks').innerHTML = Object.entries(labels).map(([key,[name,desc]]) => `<button data-go="${key}"><strong>${name}</strong><small>${desc}</small></button>`).join('');
  $('#menuBtn').onclick = () => { $('#mapPanel').classList.add('open'); $('#mapPanel').setAttribute('aria-hidden','false'); };
  $('#closeMap').onclick = closeMap;
  $('#mapPanel').addEventListener('click', e => { if(e.target.id==='mapPanel') closeMap(); });
  $('#mapLinks').addEventListener('click', e => { const btn = e.target.closest('button[data-go]'); if(btn){ closeMap(); render(btn.dataset.go); }});
}
function closeMap(){ $('#mapPanel').classList.remove('open'); $('#mapPanel').setAttribute('aria-hidden','true'); }

$$('.dock-item').forEach(b => b.onclick = () => render(b.dataset.route));
$('#backBtn').onclick = () => history.back();
window.addEventListener('hashchange', () => render(location.hash.replace('#','') || 'access'));
initMap(); render(location.hash.replace('#','') || 'access');
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
