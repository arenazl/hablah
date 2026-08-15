/* habláh — Practicar: elección de tópico interactiva.
 * Filtros + búsqueda + orden sobre la grilla ya renderizada, selección que
 * alimenta la barra inferior (duración, ritmo y preview de arranque) y
 * persistencia de la última elección en localStorage. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const grid = $('.grid-topics');
if (!grid) return;

const CAT = {'Todos':null,'Tecnología':'tec','Arte':'arte','Lifestyle':'life','Deportes':'dep','Ciencia':'cien','Viajes':'via','Gastronomía':'gas','Arquitectura':'arq'};
const SORTS = [
  {k:'pref', l:'Tu preferencia', f:(a,b)=>a.rank-b.rank},
  {k:'menos', l:'Menos practicados', f:(a,b)=>a.charlas-b.charlas||a.rank-b.rank},
  {k:'frios', l:'Nunca tocados primero', f:(a,b)=>(b.cold-a.cold)||a.rank-b.rank},
  {k:'mas', l:'Más practicados', f:(a,b)=>b.charlas-a.charlas||a.rank-b.rank},
  {k:'az', l:'A–Z', f:(a,b)=>a.title.localeCompare(b.title,'es')}
];
const QF = [
  {k:'rescate', l:'Con misión de rescate', i:'<path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z"/>', t:c=>c.rescate},
  {k:'nuevos', l:'Recién sumados', i:'<path d="M12 3v18M3 12h18"/>', t:c=>c.cold},
  {k:'hot', l:'Los que más charlo', i:'<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-4 4-8 4-8z"/>', t:c=>c.charlas>=4},
  {k:'dormidos', l:'Dormidos hace rato', i:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', t:c=>c.charlas>0 && c.charlas<=2}
];
const MOODS = [
  {l:'Tengo 5 minutos', k:'corto',   i:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'},
  {l:'Que me desafíe',  k:'duro',    i:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'},
  {l:'Algo liviano',    k:'liviano', i:'<path d="M18 10h-1.3A5 5 0 1 0 7 8.6"/><path d="M2 14h14a4 4 0 1 1 0 8H8"/>'},
  {l:'Mis errores',     k:'errores', i:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'},
  {l:'Salir de la rutina', k:'nuevo', i:'<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3"/>'},
  {l:'Hablar de laburo', k:'laburo', i:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'}
];
const OPENERS = [
  t => `El profe abre: “Okay — ${t.toLowerCase()}. Convenceme de que importa.”`,
  t => `El profe abre: “${t}. ¿Qué te enganchó de esto?”`,
  t => `El profe abre: “Confesión: no entiendo ${t.toLowerCase()}. Explicámelo vos.”`
];

const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cards = $$('.tc', grid).map((el, i) => {
  const rankTxt = ($('.rank', el)?.textContent || '').replace(/[^\d]/g, '');
  const metaTxt = ($('.tc-meta', el)?.textContent || '').toLowerCase();
  const charlas = parseInt((metaTxt.match(/(\d+)\s*charla/) || [])[1] || 0);
  return {
    el, i,
    rank: parseInt(rankTxt || 99),
    title: ($('h4', el)?.textContent || '').trim(),
    cat: ($('.cat', el)?.textContent || '').trim(),
    catKey: [...el.classList].find(c => Object.values(CAT).includes(c)) || '',
    charlas,
    cold: /nunca|recién/.test(metaTxt) ? 1 : 0,
    rescate: metaTxt.includes('rescate'),
    iconHTML: $('.ico', el)?.innerHTML || ''
  };
});

const state = {
  cat: null, q: '', sort: 0, qf: null,
  sel: cards.find(c => c.el.classList.contains('active')) || cards[0],
  min: 7, cad: 'Sobremesa'
};

/* ---------- grilla: filtrar, ordenar, contar ---------- */
const empty = document.createElement('div');
empty.className = 'empty-state';
empty.innerHTML = '<b>Ningún tópico coincide</b>Probá con otra categoría, limpiá la búsqueda o tirá un tema libre desde arriba.';

function apply() {
  const q = norm(state.q.trim());
  let visibles = 0;
  const orden = [...cards].sort(SORTS[state.sort].f);
  orden.forEach(c => {
    const qfOk = !state.qf || QF.find(x => x.k === state.qf).t(c);
    const ok = qfOk && (!state.cat || c.catKey === state.cat) && (!q || norm(c.title + ' ' + c.cat).includes(q));
    c.el.hidden = !ok;
    if (ok) visibles++;
    grid.appendChild(c.el);
  });
  empty.hidden = visibles > 0;
  if (!empty.isConnected) grid.appendChild(empty);
  else grid.appendChild(empty);
  $('#resCount').textContent = visibles === cards.length ? `${cards.length} tópicos` : `${visibles} de ${cards.length}`;
  const sh = $('#sortNote'); if (sh) sh.textContent = SORTS[state.sort].l.toLowerCase();
  $$('.fc[data-k]').forEach(b => b.classList.toggle('active', (b.dataset.k || null) === state.cat));
}

/* ---------- selección ---------- */
function select(card, {scroll = false} = {}) {
  if (!card) return;
  state.sel = card;
  cards.forEach(c => {
    c.el.classList.toggle('active', c === card);
    const badge = $('.rank', c.el);
    if (badge) badge.textContent = '#' + c.rank + (c === card ? ' · elegido' : '');
    const m = $('.tc-media', c.el);
    if (m) m.style.background = c === card ? 'linear-gradient(150deg,#00B37E,#046B4C)' : skinFor(c);
  });
  $('#selTitle').innerHTML = card.title.includes('·')
    ? card.title.split('·')[0].trim() + ' · <b>' + card.title.split('·').slice(1).join('·').trim() + '</b>'
    : '<b>' + card.title + '</b>';
  $('.selbar .sel-ic').innerHTML = card.iconHTML || $('.selbar .sel-ic').innerHTML;
  $('#selTag').textContent = card.rescate ? 'misión de rescate' : (card.cold ? 'primera vez' : card.cat.toLowerCase());
  $('#selTag').style.color = card.rescate ? '#FFE9A6' : (card.cold ? '#7CE7BD' : 'rgba(255,255,255,.65)');
  $('#selPrev').textContent = OPENERS[card.title.length % OPENERS.length](card.title);
  const bar = $('.selbar');
  bar.classList.remove('pulse'); void bar.offsetWidth; bar.classList.add('pulse');
  try { localStorage.setItem('hablah.practicar.sel', card.title) } catch {}
  if (scroll && !card.el.hidden) card.el.focus({preventScroll: true});
}

function selectFree(text) {
  const t = text.trim();
  if (!t) return;
  cards.forEach(c => {
    c.el.classList.remove('active');
    const badge = $('.rank', c.el);
    if (badge) badge.textContent = '#' + c.rank;
  });
  state.sel = null;
  $('#selTitle').innerHTML = 'Tema libre · <b>' + t + '</b>';
  $('#selTag').textContent = 'sin guion';
  $('#selTag').style.color = '#7EB2FF';
  $('#selPrev').textContent = `El profe abre: “Dale, contame de ${t.toLowerCase()}.”`;
  const bar = $('.selbar');
  bar.classList.remove('pulse'); void bar.offsetWidth; bar.classList.add('pulse');
}

/* ---------- listeners ---------- */
const CAT_META = {
  'Todos':        {k:null,  c:'#0D1412', i:'<path d="M4 6h16M4 12h16M4 18h10"/>'},
  'Tecnología':   {k:'tec', c:'#4338CA', i:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'},
  'Arte':         {k:'arte',c:'#7C3AED', i:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'},
  'Lifestyle':    {k:'life',c:'#BE185D', i:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'},
  'Deportes':     {k:'dep', c:'#C2410C', i:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M3 12h18"/>'},
  'Ciencia':      {k:'cien',c:'#0E7490', i:'<path d="M9 2v6l-5 9a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V2"/><path d="M9 2h6M7 15h10"/>'},
  'Viajes':       {k:'via', c:'#1D4ED8', i:'<path d="M17.8 19.2 16 11l5-5a2 2 0 0 0-2.8-2.8l-5 5-8.2-1.8L3 7.8l6 3-3 3-3-.6-1 1.4 4.6 2.4L9 21.6l1.4-1L9.8 17l3-3 3 6z"/>'},
  'Gastronomía':  {k:'gas', c:'#BE123C', i:'<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/>'},
  'Arquitectura': {k:'arq', c:'#334155', i:'<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6"/>'}
};
function renderChips() {
  const box = $('#chipsScroll');
  const svg = d => `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  box.innerHTML = `<span class="fico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg></span>`
    + Object.entries(CAT_META).map(([label, m]) => {
        const n = m.k ? cards.filter(c => c.catKey === m.k).length : cards.length;
        if (m.k && !n) return '';
        const on = (m.k || null) === state.cat;
        return `<button class="fc ${on ? 'active' : ''}" data-k="${m.k || ''}" style="${on ? '' : 'color:' + m.c}">${svg(m.i)}${label}<span class="n">${n}</span></button>`;
      }).join('')
    + `<button class="fc more" id="chipsMore">todas <svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>`;
  $$('.fc[data-k]', box).forEach(b => b.addEventListener('click', () => {
    state.cat = b.dataset.k || null;
    renderChips(); apply();
  }));
  $('#chipsMore').addEventListener('click', () => box.classList.toggle('expanded'));
}
renderChips();

const search = $('#tsearch');
search.addEventListener('input', () => { state.q = search.value; apply() });
search.addEventListener('keydown', e => { if (e.key === 'Escape') { search.value = ''; state.q = ''; apply(); search.blur() } });
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== search && !/input|textarea/i.test(document.activeElement.tagName)) {
    e.preventDefault(); search.focus();
  }
});

$('#sortSel').value = state.sort;

cards.forEach(c => c.el.addEventListener('click', () => select(c)));

/* recomendado del día */
$('.qc.featured')?.addEventListener('click', () => {
  const rec = cards.find(c => c.title.includes('UK Garage')) || cards[0];
  select(rec, {scroll: true});
  rec.el.scrollIntoView ? null : null;
});

/* sorprendeme: rueda entre los menos tocados y frena en uno */
const surprise = $('.qc.surprise');
surprise?.addEventListener('click', () => {
  const pool = cards.filter(c => c.charlas <= 2 && !c.el.hidden);
  const lote = (pool.length ? pool : cards.filter(c => !c.el.hidden));
  if (!lote.length) return;
  surprise.classList.add('rolling');
  let n = 0;
  const spin = setInterval(() => {
    cards.forEach(c => c.el.classList.remove('roll'));
    const c = lote[Math.floor(Math.random() * lote.length)];
    c.el.classList.add('roll');
    if (++n > 9) {
      clearInterval(spin);
      surprise.classList.remove('rolling');
      setTimeout(() => { cards.forEach(x => x.el.classList.remove('roll')); select(c) }, 220);
    }
  }, 90);
});

/* tema libre */
const freeInput = $('.qc.free input');
freeInput?.addEventListener('keydown', e => { if (e.key === 'Enter') selectFree(freeInput.value) });
$('.qc.free .send')?.addEventListener('click', () => selectFree(freeInput.value));

/* duración y ritmo */
$$('.selbar .opt').forEach(b => b.addEventListener('click', () => {
  const grupo = b.dataset.min ? '[data-min]' : '[data-cad]';
  $$('.selbar .opt' + grupo).forEach(x => x.classList.toggle('on', x === b));
  if (b.dataset.min) { state.min = +b.dataset.min; $('#selMin').textContent = state.min }
  else state.cad = b.dataset.cad;
}));

/* ---------- fondos por categoría: cada card con su clima visual ---------- */
const SKIN = {
  tec:  {a:'#EEF2FF', b:'#C7D2FE', c:'#4338CA'},
  arte: {a:'#F5ECFF', b:'#DDC7FE', c:'#7C3AED'},
  life: {a:'#FDE9F3', b:'#F9C9E0', c:'#BE185D'},
  dep:  {a:'#FFF0DC', b:'#FFD5A8', c:'#C2410C'},
  cien: {a:'#DFFAFE', b:'#A8ECF6', c:'#0E7490'},
  via:  {a:'#E3EDFF', b:'#B9D0FB', c:'#1D4ED8'},
  gas:  {a:'#FFE8EA', b:'#FBC3C9', c:'#BE123C'},
  arq:  {a:'#ECEFF2', b:'#CBD3DA', c:'#334155'}
};
function skinFor(c) {
  const s = SKIN[c.catKey] || SKIN.arq;
  const ang = 120 + (c.i % 5) * 24;
  const px = 20 + (c.i * 37) % 60, py = 10 + (c.i * 53) % 70;
  return `linear-gradient(${ang}deg,${s.a},${s.b}),`
       + `radial-gradient(circle at ${px}% ${py}%, ${s.c}22, transparent 62%)`;
}
function dressCards() {
  cards.forEach(c => {
    const el = c.el;
    if ($('.tc-media', el)) return;
    const head = $('.tc-head', el), ico = $('.ico', el);
    const media = document.createElement('div');
    media.className = 'tc-media';
    media.style.background = skinFor(c);
    const glyph = document.createElement('div');
    glyph.className = 'glyph';
    glyph.style.color = (SKIN[c.catKey] || SKIN.arq).c;
    glyph.innerHTML = ico ? ico.innerHTML : '';
    media.appendChild(glyph);
    media.appendChild(Object.assign(document.createElement('div'), {className: 'fade'}));
    const body = document.createElement('div');
    body.className = 'tc-body';
    [...el.children].forEach(ch => { if (ch !== head) body.appendChild(ch) });
    el.textContent = '';
    if (head) media.appendChild(head);
    el.appendChild(media);
    if (ico) el.appendChild(ico);
    body.insertBefore(Object.assign(document.createElement('div'), {className: 'top-sp'}), body.firstChild);
    el.appendChild(body);
  });
}
dressCards();

$('#sortSel').innerHTML = SORTS.map((s, i) => `<option value="${i}">${s.l}</option>`).join('');
$('#sortSel').addEventListener('change', e => { state.sort = +e.target.value; apply() });
$('#viewSel').addEventListener('change', e => {
  if (e.target.value === 'cat') { toastMini('El catálogo completo (94 tópicos) abre en su propia pantalla.'); e.target.value = '20' }
});

/* atajos rápidos */
const quickF = $('#quickF');
QF.forEach(f => {
  const b = document.createElement('button');
  b.className = 'qf'; b.dataset.k = f.k;
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">${f.i}</svg>${f.l} <span style="opacity:.55">${cards.filter(f.t).length}</span>`;
  b.addEventListener('click', () => {
    state.qf = state.qf === f.k ? null : f.k;
    $$('.qf').forEach(x => x.classList.toggle('on', x.dataset.k === state.qf));
    apply();
  });
  quickF.appendChild(b);
});

function toastMini(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:150px;right:24px;background:var(--fg-1);color:#fff;border-radius:12px;padding:11px 15px;font-size:12.5px;z-index:90;box-shadow:var(--shadow-float)';
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

/* ---------- copiloto: propone 3 tópicos con motivo ---------- */
const MOOD_RULES = {
  corto:   {score: c => (c.charlas >= 3 ? 2 : 0) + (c.cold ? -1 : 1), why: c => `ya lo tocaste ${c.charlas} ${c.charlas === 1 ? 'vez' : 'veces'}: arranca rápido y no necesita contexto`, min: 5},
  duro:    {score: c => (c.rescate ? 3 : 0) + (c.cat === 'Ciencia' || c.cat === 'Tecnología' ? 2 : 0), why: c => c.rescate ? 'tiene misión de rescate abierta: te va a exigir el pasado simple' : `${c.cat.toLowerCase()} te obliga a explicar, no solo opinar`, min: 12},
  liviano: {score: c => (c.cat === 'Lifestyle' || c.cat === 'Gastronomía' || c.cat === 'Deportes' ? 3 : 0) + (c.charlas > 0 ? 1 : 0), why: () => 'tema cotidiano: se charla solo, sin vocabulario técnico', min: 7},
  errores: {score: c => (c.rescate ? 4 : 0) + (c.charlas >= 2 ? 1 : 0), why: c => c.rescate ? 'el motor tiene marcado tu pasado simple acá' : 'lo charlaste lo suficiente para que el profe pueda corregirte fino', min: 7},
  nuevo:   {score: c => (c.cold ? 4 : 0) + (c.charlas === 0 ? 1 : 0), why: () => 'nunca lo tocaste: vocabulario nuevo garantizado', min: 7},
  laburo:  {score: c => (c.cat === 'Tecnología' || c.cat === 'Arquitectura' ? 3 : 0) + (c.charlas >= 2 ? 1 : 0), why: c => `${c.cat.toLowerCase()} es el léxico que usás en el trabajo`, min: 12}
};
function moodFromText(t) {
  const s = norm(t);
  if (/5|cinco|poco tiempo|apurad|corto|r.pido/.test(s)) return 'corto';
  if (/desaf|dificil|exig|profund|pensar|duro/.test(s)) return 'duro';
  if (/liviano|facil|relax|tranqui|cansad/.test(s)) return 'liviano';
  if (/error|corrig|pasado|gramat|fallo/.test(s)) return 'errores';
  if (/nuevo|distinto|rutina|aburr|cambiar/.test(s)) return 'nuevo';
  if (/labur|trabaj|oficina|reuni|entrevist/.test(s)) return 'laburo';
  return 'liviano';
}
const cpOut = $('#cpOut');
function recomendar(moodKey, textoUsuario) {
  const rule = MOOD_RULES[moodKey] || MOOD_RULES.liviano;
  cpOut.classList.add('show');
  cpOut.innerHTML = `<div class="cp-line">Pensando <span class="cp-typing"><i></i><i></i><i></i></span></div>`;
  setTimeout(() => {
    const picks = [...cards].map(c => ({c, s: rule.score(c) + (c.rank <= 5 ? 1 : 0)}))
      .sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.c);
    cpOut.innerHTML = `<div class="cp-line">${textoUsuario ? `Leí “${textoUsuario.trim()}”. ` : ''}Para eso te propongo <b>${rule.min} minutos</b> y estos tres:</div>`
      + `<div class="cp-picks">` + picks.map((c, i) => `<button class="cp-pick" data-i="${cards.indexOf(c)}">
          <span class="n">${i + 1}</span>
          <span class="b"><span class="t">${c.title}</span><span class="w">${rule.why(c)}</span></span>
          <span class="go2">elegir →</span></button>`).join('') + `</div>`
      + `<div class="cp-line" style="color:var(--fg-4)">Si ninguno te cierra, tirá un tema libre arriba y el profe lo arma igual.</div>`;
    $$('.cp-pick', cpOut).forEach(b => b.addEventListener('click', () => {
      const c = cards[+b.dataset.i];
      select(c);
      const opt = $$('.selbar .opt[data-min]').find(o => +o.dataset.min === rule.min);
      if (opt) opt.click();
      c.el.scrollIntoView ? window.scrollTo({top: c.el.getBoundingClientRect().top + scrollY - 120, behavior: 'smooth'}) : null;
    }));
    const bar = document.querySelector('.selbar');
    const barTop = bar ? bar.getBoundingClientRect().top : innerHeight;
    const r = cpOut.getBoundingClientRect();
    if (r.bottom > barTop - 16) window.scrollBy({top: r.bottom - barTop + 28});
  }, 620);
}
const moods = $('#cpMoods');
MOODS.forEach(m => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m.i}</svg>${m.l}`;
  b.addEventListener('click', () => recomendar(m.k, ''));
  moods.appendChild(b);
});
$('#cpGo').addEventListener('click', () => {
  const v = $('#cpInput').value;
  recomendar(moodFromText(v), v);
});
$('#cpInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#cpGo').click() });

/* estado inicial */
apply();
let last = null;
try { last = localStorage.getItem('hablah.practicar.sel') } catch {}
select(cards.find(c => c.title === last) || state.sel);
})();
