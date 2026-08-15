/* habláh backoffice — router por hash + render de cada vista. Depende de backoffice.data.js */
/* ───────────── estado + router ───────────── */
let S={cat:'Todas',seg:'Todos',q:''};
const ICO={overview:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',probador:'<path d="M12 3v18M4 8l8-5 8 5M4 16l8 5 8-5"/>',auditoria:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',catalogo:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>',operacion:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
capas:'<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',prompt:'<path d="M4 6h16M4 12h16M4 18h10"/>',mapa:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a4 4 0 0 1 4 4v6"/>',vivo:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>',memoria:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
topicos:'<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>',edades:'<path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18"/>',personalidades:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',voz:'<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M19 12a7 7 0 0 0-3-5.7"/>',
metricas:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 4-6"/>',alumnos:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M17 11a3 3 0 1 0 0-6"/>',usuarios:'<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 21a5 5 0 0 1 10 0M11 21a5 5 0 0 1 10 0"/>'};
const NAV=[
{sec:'overview',label:'Overview',href:'overview'},
{sec:'probador',label:'Probador de clases',href:'probador/capas',group:'Orquestación y pruebas',sub:[['capas','Capas del composer','capas','6'],['prompt','Prompt compilado','prompt'],['mapa','Mapa de nodos','mapa'],['vivo','Clase en vivo','vivo'],['memoria','Memoria del alumno','memoria']]},
{sec:'auditoria',label:'Auditoría de sesiones',href:'auditoria',group:'Orquestación y pruebas',count:'3'},
{sec:'catalogo',label:'Catálogo',href:'catalogo/topicos',group:'Catálogo del motor',sub:[['topicos','Tópicos','topicos','15'],['edades','Edades y niveles','edades','19'],['personalidades','Personalidades','personalidades','4'],['voz','Voz','voz','3']]},
{sec:'operacion',label:'Operación',href:'operacion/metricas',group:'Operación',sub:[['metricas','Métricas','metricas'],['alumnos','Alumnos','alumnos','312'],['usuarios','Usuarios','usuarios','9']]}];
function ico(k){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[k]||ICO.overview}</svg>`}
let NAVOPEN=null;
function renderNav(sec,tab){
  const groups=[];
  NAV.forEach(n=>{
    if(!n.group){groups.push({solo:n});return}
    let g=groups.find(x=>x.name===n.group);
    if(!g){g={name:n.group,items:[]};groups.push(g)}
    g.items.push(n);
  });
  document.getElementById('nav').innerHTML=groups.map(g=>{
    if(g.solo){const n=g.solo;return `<a href="#/${n.href}" class="item ${sec===n.sec?'on':''}">${ico(n.sec)}${n.label}</a>`}
    const hasActive=g.items.some(i=>i.sec===sec);
    const open=NAVOPEN===g.name||(NAVOPEN===null&&hasActive)||hasActive;
    const total=g.items.reduce((a,i)=>a+(i.sub?i.sub.length:1),0);
    return `<div class="grp ${open?'open':''}">
      <button class="grp-h" onclick="toggleGroup('${g.name}')">${g.name}<span class="cnt">${total}</span><svg class="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="grp-b">${g.items.map(n=>{
        if(!n.sub)return `<a href="#/${n.href}" class="item ${sec===n.sec?'on':''}">${ico(n.sec)}${n.label}${n.count?`<span class="n">${n.count}</span>`:''}</a>`;
        return n.sub.map(s=>`<a href="#/${n.sec}/${s[0]}" class="item ${sec===n.sec&&(tab||n.sub[0][0])===s[0]?'on':''}">${ico(s[2])}${s[1]}${s[3]?`<span class="n">${s[3]}</span>`:''}</a>`).join('');
      }).join('')}</div></div>`;
  }).join('')+`<div class="divider"></div>
  <div class="side-alert"><div class="t">${ico('edades')}Cruces<b>1 incompleto</b></div><p>junior × B1 no tiene accion_de_cierre: 388 clases compusieron con fallback.</p><a href="#/catalogo/cruce/junior/B1">Ver el faltante →</a></div>`;
}
function toggleGroup(name){NAVOPEN=NAVOPEN===name?'__none':name;const r=route();renderNav(r[0],r[1])}
function setTheme(t){document.documentElement.setAttribute('data-theme',t);document.querySelectorAll('.theme-tog button').forEach(b=>b.classList.remove('on'));(t==='light'?document.querySelector('.theme-tog button:first-child'):document.querySelector('.theme-tog button:last-child')).classList.add('on')}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function go(h){location.hash=h}
function route(){return (location.hash||'#/overview').replace(/^#\//,'').split('/')}
const CTA={overview:'Exportar reporte',probador:'Abrir en pantalla completa',auditoria:'Exportar CSV',catalogo:'Nuevo tópico',operacion:'Invitar usuario'};
const SUBOF={topico:'topicos',cruce:'edades',persona:'personalidades',voz:'voz',alumno:'alumnos',usuario:'usuarios'};
function render(){
  const r=route(),sec=r[0];
  renderNav(sec,SUBOF[r[1]]||r[1]);
  const cta=document.getElementById('ctaBtn');cta.textContent=CTA[sec]||'Nuevo';
  cta.onclick=()=>sec==='probador'?window.open('Probador_Funcional.html','_blank'):toast();
  const V=document.getElementById('view');
  if(sec==='overview')return viewOverview();
  if(sec==='probador'){
    const sub=r[1]||'capas';
    const VIEW={capas:'fmt',prompt:'raw',mapa:'flow',vivo:'vivo',memoria:'memoria'}[sub]||'fmt';
    const LBL={capas:'Capas del composer',prompt:'Prompt compilado',mapa:'Mapa de nodos',vivo:'Clase en vivo',memoria:'Memoria del alumno'}[sub];
    crumb([['Probador de clases','probador/capas'],[LBL,null]]);
    V.innerHTML=`<iframe class="frame" src="Probador_Funcional.html?embed=1&view=${VIEW}" title="Probador de clases"></iframe>`;return}
  if(sec==='auditoria'){return r[1]?viewSession(r[1]):viewAuditoria()}
  if(sec==='operacion'){
    if(r[1]==='alumno')return viewStudent(r[2]);
    if(r[1]==='usuario')return viewUser(r[2]);
    return viewOperacion(r[1]||'metricas');
  }
  if(r[1]==='topico')return viewTopic(r[2]);
  if(r[1]==='cruce')return viewCruce(r[2],r[3]);
  if(r[1]==='persona')return viewPersona(r[2]);
  if(r[1]==='voz'&&r[2])return viewVoice(r[2]);
  return viewCatalogo(r[1]||'topicos');
}
function crumb(parts){
  document.getElementById('crumbs').innerHTML=parts.map((p,i)=>
    i===parts.length-1?`${esc(p[0])}`:`<a href="#/${p[1]}">${esc(p[0])}</a> <span>›</span> `).join('');
}
function toast(){const t=document.createElement('div');t.textContent='Acción de demo — el backoffice real la ejecuta contra la API.';t.style.cssText='position:fixed;bottom:20px;right:20px;background:var(--fg-1);color:#fff;border-radius:12px;padding:11px 16px;font-size:12.5px;z-index:90';document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}

/* ───────────── catálogo ───────────── */
function tabs(items,active,base){
  return `<div class="tabs">${items.map(i=>`<button class="${i[0]===active?'on':''}" onclick="go('${base}/${i[0]}')">${i[1]}${i[2]?`<span class="n">${i[2]}</span>`:''}</button>`).join('')}</div>`;
}
function viewCatalogo(tab){
  crumb([['Catálogo','catalogo/topicos'],[{topicos:'Tópicos',edades:'Edades y niveles',personalidades:'Personalidades',voz:'Voz'}[tab]||'Tópicos',null]]);
  const T='';
  const V=document.getElementById('view');
  if(tab==='edades'){
    const total=BANDS.length*LEVELS.length,def=Object.keys(MATRIX).length,campos=Object.values(MATRIX).reduce((a,b)=>a+b,0);
    V.innerHTML=T+`
    <section class="hero-stat"><h1>${def} cruces definidos · <em>${campos} campos de forma</em>.</h1>
    <p>Cada celda de <b>age_level_matrix</b> es la instrucción más específica del motor: cómo abre, cómo cierra cada turno, qué produce el alumno y con qué cadencia. Si falta un campo, el prompt cae al fallback del template y la clase pierde forma.</p></section>
    <div class="kpi-row">
      <div class="kpi"><div class="k">Cruces definidos</div><div class="v">${def}<small>de ${total}</small></div><div class="h">${total-def} combinaciones no ofrecidas</div></div>
      <div class="kpi"><div class="k">Campos cargados</div><div class="v">${campos}<small>/ ${def*8}</small></div><div class="h">falta 1 campo en junior × B1</div></div>
      <div class="kpi"><div class="k">Cruce más usado</div><div class="v" style="font-size:21px">adult × B2</div><div class="h">2.841 clases · 7d</div></div>
      <div class="kpi"><div class="k">Reglas gateadas</div><div class="v">5<small>+5</small></div><div class="h">Bloque A mini/A0-A1 · Bloque B A2+</div></div>
    </div>
    <div class="mwrap"><div class="matrix"><div></div>${BANDS.map(b=>`<div class="h">${b.l}</div>`).join('')}
    ${LEVELS.map(l=>`<div class="rl">${l.l}</div>`+BANDS.map(b=>{
      const n=MATRIX[b.k+'|'+l.k];
      if(!n)return `<div class="cell off">—</div>`;
      const uso=(CRUCE_USO.find(c=>c.band===b.k&&c.lvl===l.k)||{}).n;
      return `<div class="cell ${n<8?'warn':''}" onclick="go('catalogo/cruce/${b.k}/${l.k}')"><b>${n}/8</b>${uso?uso.toLocaleString('es-AR')+' clases':'sin uso aún'}</div>`;
    }).join('')).join('')}</div></div>
    <p style="font-size:11.5px;color:var(--fg-4);margin-bottom:20px">8/8 = celda completa · rojo = falta un campo · gris = combinación no ofrecida (el nivel excede el techo del segmento).</p>
    <div class="card"><div class="card-head"><h3>Reglas universales · cuánto pesan</h3><span class="owner reglas">conversation_rules</span></div>
      <p style="font-size:12.5px;color:var(--fg-3);margin:0 0 12px">Se gatean por esta misma matriz: de la tabla entran solo las que aplican al combo. Bloque A para mini/A0-A1, Bloque B para A2+.</p>
      ${REGLAS_USO.map(r=>`<div class="kwrow"><span class="kn">${r.n}. ${r.t}</span><span class="kt ${r.bloque==='A'?'vocab':'estr'}">Bloque ${r.bloque}</span><span style="font-size:11px;color:var(--fg-4);width:110px;text-align:right">${r.gate}</span><span class="kb"><i style="width:${Math.round(r.disparos/4820*100)}%"></i></span><span style="font-family:var(--font-display);font-weight:700;font-size:12px;width:48px;text-align:right">${r.disparos.toLocaleString('es-AR')}</span></div>`).join('')}
    </div>`;return}
  if(tab==='personalidades'){
    V.innerHTML=T+`
    <section class="hero-stat"><h1>4 profes · <em>uno por segmento de edad</em>.</h1>
    <p>La EDAD define <b>quién habla</b>: identidad, foco de gamificación, estilo y si hay roleplay. Es el dato que menos cambia y el que más se nota: mismo tópico con otro profe es otra clase.</p></section>
    <div class="atable">${PERSONAS.map(p=>`<div class="prow" onclick="go('catalogo/persona/${p.id}')">
      <div class="id"><span class="av" style="background:${p.col}">${p.n[0]}</span><div><h4>${p.n} · ${p.seg}</h4><small>${esc(p.ident)}</small></div></div>
      <div class="mini"><div class="bar"><i style="width:${p.share}%"></i></div><span style="font-weight:600">${p.share}%</span></div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:13px">${p.min.toLocaleString('es-AR')} min</div>
      <span class="atag ${p.anclas.startsWith('NO')?'draft':'violet'}">${p.anclas.startsWith('NO')?'sin roleplay':'roleplay'}</span></div>`).join('')}</div>
    <div class="insight" style="margin-top:14px"><b>Insight</b> · los dos segmentos con roleplay (mini y junior) concentran el 39% de los minutos pero disparan el 61% de las observaciones de vocabulario: la escena hace producir más léxico.</div>`;return}
  if(tab==='voz'){
    V.innerHTML=T+`
    <section class="hero-stat"><h1>3 voces activas · <em>Gemini Live</em>.</h1>
    <p>La voz no cambia el prompt, cambia la percepción: mismo cruce con voz grave se lee como más exigente. Se asigna por segmento y se puede pisar por sesión en el Probador.</p></section>`+
    VOICES.map(v=>`<div class="pcard" onclick="go('catalogo/voz/${v.id}')"><span class="av" style="background:${v.col}">${v.n[0]}</span><div class="body"><div class="t">${v.n}</div><div class="s">${esc(v.d)} · segmentos: ${v.seg}</div></div><span class="chip">activa</span></div>`).join('');return}
  const hot=TOPICS.filter(t=>t.hot).length,vac=TOPICS.filter(t=>coverage(t)<t.levels.length).length;
  const nivCub=TOPICS.reduce((a,t)=>a+coverage(t),0),nivTot=TOPICS.reduce((a,t)=>a+t.levels.length,0);
  V.innerHTML=T+`
  <section class="hero-stat"><h1>${TOPICS.length} tópicos · <em>${hot} calientes</em> esta semana.</h1>
  <p>Cada tópico tiene metadatos por nivel: seed prompts, keywords y estructuras. El motor los inyecta como <b>contenido</b> — la forma la pone el cruce.</p></section>
  <div class="kpi-row">
    <div class="kpi"><div class="k">Tópicos totales</div><div class="v">${TOPICS.length}<small>+9</small></div><div class="h">${vac} con niveles sin seeds</div></div>
    <div class="kpi"><div class="k">Niveles cubiertos</div><div class="v">${nivCub}<small>/ ${nivTot}</small></div><div class="h">faltan ${nivTot-nivCub} seeds por escribir</div></div>
    <div class="kpi"><div class="k">Clases servidas</div><div class="v">${TOPICS.reduce((a,t)=>a+t.usos,0).toLocaleString('es-AR')}</div><div class="h">top: ${esc(TOPICS.slice().sort((a,b)=>b.usos-a.usos)[0].t)}</div></div>
    <div class="kpi"><div class="k">Cobertura Kids</div><div class="v">${Math.round(TOPICS.filter(t=>t.seg==='Kids').length/TOPICS.length*100)}%</div><div class="h">pero Kids es el 38% de los minutos — el catálogo va atrás de la demanda</div></div>
  </div>
  <div class="layout">
    <div class="cats"><div class="catlbl">Categorías</div>${CATS.map(c=>`<button class="${S.cat===c?'on':''}" onclick="S.cat='${c}';render()">${c}<span class="n">${c==='Todas'?TOPICS.length:TOPICS.filter(t=>t.cat===c).length}</span></button>`).join('')}</div>
    <div>
      <div class="seg-chips">${SEGS.map(s=>`<button class="${S.seg===s?'on':''}" onclick="S.seg='${s}';render()">${s}</button>`).join('')}</div>
      <div class="toolbar"><div class="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="q" placeholder="Buscar tópico" value="${esc(S.q)}" oninput="S.q=this.value;renderRows()"></div><span class="count" id="count"></span></div>
      <div id="rows"></div>
    </div></div>`;
  renderRows();
  const inp=document.getElementById('q');if(inp&&S.q){inp.focus();inp.setSelectionRange(S.q.length,S.q.length)}
}
function renderRows(){
  const rows=TOPICS.filter(t=>(S.cat==='Todas'||t.cat===S.cat)&&(S.seg==='Todos'||t.seg===S.seg)&&t.t.toLowerCase().includes(S.q.toLowerCase()));
  document.getElementById('count').textContent=rows.length+(rows.length===1?' tópico':' tópicos');
  document.getElementById('rows').innerHTML=rows.map(t=>`
    <div class="trow" onclick="go('catalogo/topico/${t.id}')">
      <div class="body"><div class="t">${esc(t.t)}${t.hot?'<span class="hot">Hot</span>':''}</div>
      <div class="m">${t.seg}<span class="sep"></span>${t.seeds} seed prompt${t.seeds>1?'s':''}<span class="sep"></span>${t.kw} keywords<span class="sep"></span>${t.usos.toLocaleString('es-AR')} usos</div></div>
      <div class="levels">${t.levels.map(l=>`<span class="lv ${t.seg==='Kids'?'kids':''}">${l}</span>`).join('')}</div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--fg-4);flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>
    </div>`).join('')||'<div style="color:var(--fg-3);font-size:13px;padding:20px">Sin resultados para este filtro.</div>';
}
function viewTopic(id){
  const t=TOPICS.find(x=>x.id==id);if(!t)return go('catalogo/topicos');
  if(!S.lvl||!t.levels.includes(S.lvl))S.lvl=t.levels.find(l=>seedsFor(t,l).length)||t.levels[0];
  crumb([['Catálogo','catalogo/topicos'],['Tópicos','catalogo/topicos'],[t.t,null]]);
  const seeds=seedsFor(t,S.lvl),cov=coverage(t);
  const cf=CRUCE_FIELDS[t.seg==='Kids'?'mini|A0':'adult|B2']||{};
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('catalogo/topicos')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a tópicos</button>
  <section class="hero-stat"><div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-4)">${t.cat} · ${t.seg}</div>
    <h1>${esc(t.t)}${t.hot?' <span class="hot" style="vertical-align:middle">Hot</span>':''}</h1>
    <p><b>${t.usos.toLocaleString('es-AR')}</b> clases servidas · <b>${cov}/${t.levels.length}</b> niveles con seeds · <b>${t.keywords.length}</b> keywords · aporta léxico y anclas, nunca forma.</p></section>
  <div class="dgrid">
    <div>
      <div class="card"><div class="card-head"><h3>Seed prompts por nivel</h3><span class="owner topico">topics.seed_prompt</span></div>
        <p style="font-size:12.5px;color:var(--fg-3);margin:0 0 12px">Directrices que le dicen al motor cómo arrancar o girar la charla. Se eligen al azar en el arranque.</p>
        <div class="lvchips">${t.levels.map(l=>`<button class="${S.lvl===l?'on':''} ${seedsFor(t,l).length?'':'empty'}" onclick="S.lvl='${l}';viewTopic(${t.id})">${l}${seedsFor(t,l).length?'':' · vacío'}</button>`).join('')}</div>
        ${seeds.length?seeds.map((s,i)=>{const p=s.split('|');return `<div class="seed-item"><span class="sn">${i+1}</span><span>${p[0]}<span class="sc">contexto: ${p[1]||'—'}</span></span></div>`}).join(''):`<div class="insight"><b>Nivel sin seeds</b> · el motor arranca solo con el cruce y el tópico aporta apenas el título. Escribir uno mueve la calidad de la primera línea.</div>`}
        <button class="btn btn-soft btn-sm" style="margin-top:6px" onclick="toast()">Sumar seed en ${S.lvl}</button>
      </div>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>Keywords y estructuras</h3><span class="h-meta">aparición en clases reales</span></div>
        ${t.keywords.map((k,i)=>`<div class="kwrow"><span class="kn">${esc(k)}</span><span class="kt ${i%3===2?'estr':'vocab'}">${i%3===2?'estructura':'vocab'}</span><span class="kb"><i style="width:${90-i*13}%"></i></span><span style="font-family:var(--font-display);font-weight:700;font-size:12px;width:34px;text-align:right">${90-i*13}%</span></div>`).join('')}
        <div class="insight" style="margin-top:12px"><b>Ojo</b> · forzar las semillas degrada la clase (medido). El coach las teje si aparecen naturalmente; <b>{first_vocab}</b> es la única que entra al comando de arranque.</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="preview-card">
        <div class="pt"><span class="live-dot"></span>Así entra al prompt</div>
        <div class="pv-item"><span class="ic" style="background:var(--o-topico);color:#fff">T</span><span class="tx"><b>tópico</b>${esc(t.t)}</span></div>
        <div class="pv-item"><span class="ic" style="background:var(--o-topico);color:#fff">S</span><span class="tx"><b>semillas</b>${t.keywords.slice(0,4).map(k=>`<code>${esc(k)}</code>`).join(' ')}</span></div>
        <div class="pv-item"><span class="ic" style="background:var(--o-cruce);color:#fff">A</span><span class="tx"><b>arranque (del cruce)</b>${esc(cf.comando_de_arranque||'').replace('{first_vocab}','<code>'+esc(t.keywords[0])+'</code>').replace('{topic}','<code>'+esc(t.t)+'</code>')}</span></div>
        <div class="foot">El tópico aporta contenido; quién habla lo define la EDAD y cómo habla el cruce. Cambiar de tópico no cambia la forma de la clase.</div>
      </div>
      <div class="card"><div class="card-head"><h3>Fragmento compilado</h3><span class="h-meta">vista LLM</span></div>
        <pre class="sp-box"><span class="c">&lt;topic_data owner=topics&gt;</span>
  <span class="k">Topic:</span>            <span class="v">"${esc(t.t)}"</span>
  <span class="k">Words_Available:</span>  <span class="v">[${t.keywords.map(k=>'"'+esc(k)+'"').join(', ')}]</span>
  <span class="k">Level_Seed:</span>       <span class="v">"${esc((seeds[0]||'—').split('|')[0].replace(/<[^>]+>/g,'')).slice(0,58)}…"</span>
  <span class="k">Narrative_Anchors:</span> <span class="${t.seg==='Kids'?'v':'r'}">${t.seg==='Kids'?'"roleplay del segmento"':'"NO ROLEPLAY — suprimido por código"'}</span>
<span class="c">&lt;/topic_data&gt;</span></pre>
      </div>
      <div class="card"><div class="card-head"><h3>Sesiones con este tópico</h3></div>
        ${SESSIONS.filter(s=>s.topico===t.t).map(s=>`<div class="trow" style="box-shadow:none;margin-bottom:6px" onclick="go('auditoria/${s.id}')"><div class="body"><div class="t" style="font-size:13px">#${s.id} · ${s.alumno}</div><div class="m">${s.fecha}<span class="sep"></span>${s.min} min<span class="sep"></span>${s.cad}</div></div></div>`).join('')||'<div style="color:var(--fg-3);font-size:12.5px">Todavía sin clases — probá este tópico en el Probador.</div>'}
        <a class="btn btn-soft btn-sm" href="#/probador" style="margin-top:8px">Probar en el Probador</a>
      </div>
    </div>
  </div>`;
}
function viewCruce(band,lvl){
  const b=BANDS.find(x=>x.k===band),l=LEVELS.find(x=>x.k===lvl);
  const f=CRUCE_FIELDS[band+'|'+lvl]||CRUCE_FIELDS['adult|B2'];
  crumb([['Catálogo','catalogo/topicos'],['Edades y niveles','catalogo/edades'],[`${b?b.l:band} × ${lvl}`,null]]);
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('catalogo/edades')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a la matriz</button>
  <div class="card"><div class="card-head"><h3>${b?b.l:band} × ${l?l.l:lvl}</h3><span class="owner cruce">age_level_matrix</span></div>
    ${Object.entries(f).map(([k,v])=>`<div class="kv"><span class="k">${k}</span><span style="line-height:1.55">${esc(v)}</span></div>`).join('')}
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-sm btn-dark" onclick="toast()">Editar celda</button><a class="btn btn-soft btn-sm" href="#/probador">Probar este cruce</a></div>
  </div>`;
}
function viewPersona(id){
  const p=PERSONAS.find(x=>x.id===id);if(!p)return go('catalogo/personalidades');
  crumb([['Catálogo','catalogo/topicos'],['Personalidades','catalogo/personalidades'],[p.n,null]]);
  const roleplay=!p.anclas.startsWith('NO');
  const PARAMS=roleplay?[['Energía / festejo',86,'muy alta'],['Velocidad de habla',30,'lenta'],['Tolerancia al error',92,'total'],['Densidad de léxico nuevo',35,'3 palabras/clase']]:[['Energía / festejo',34,'sobria'],['Velocidad de habla',72,'natural'],['Tolerancia al error',60,'recasteo silencioso'],['Densidad de léxico nuevo',70,'sin techo']];
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('catalogo/personalidades')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a personalidades</button>
  <section class="hero-stat"><div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-4)">student_types · ${p.seg}</div>
    <h1>${p.n}</h1>
    <p><b>${p.share}%</b> de las clases · <b>${p.min.toLocaleString('es-AR')}</b> minutos · ${roleplay?'con roleplay':'sin roleplay'} · aplica a <b>todos los niveles</b> del segmento.</p></section>
  <div class="dgrid">
    <div>
      <div class="card"><div class="card-head"><h3>Identidad y tono</h3><span class="owner edad">EDAD</span></div>
        <div class="kv"><span class="k">tutor_mascot</span><span>${esc(p.n)}</span></div>
        <div class="kv"><span class="k">tutor_identity</span><span>${esc(p.ident)}</span></div>
        <div class="kv"><span class="k">session_focus</span><span>${esc(p.focus)}</span></div>
        <div class="kv"><span class="k">estilo_de_sesion</span><span>${esc(p.estilo)}</span></div>
        <div class="kv"><span class="k">anclas_narrativas</span><span>${esc(p.anclas)}</span></div>
        <div class="tone-grid">${['Friendly','Academic','Disruptive','Corporate'].map((x,i)=>`<button class="tone-opt ${(roleplay?i===0:i===2)?'on':''}" onclick="toast()">${x}<div style="font-size:11px;opacity:.7;margin-top:2px">${['cálido, paciente','formal, técnico','directo, exigente','mentor, estratégico'][i]}</div></button>`).join('')}</div>
      </div>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>Comportamiento</h3><span class="h-meta">parámetros que regulan la entrega</span></div>
        ${PARAMS.map(([l,v,d])=>`<div class="slider-row"><span class="slabel">${l}</span><span class="sbar"><i style="width:${v}%"></i></span><span class="sval" style="min-width:110px;font-size:12px">${d}</span></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="preview-card">
        <div class="pt"><span class="live-dot"></span>Vista previa en vivo</div>
        ${roleplay?`<div class="pv-item"><span class="ic" style="background:#FFB800;color:#3A2A00">E</span><span class="tx"><b>escena</b>Somos exploradores de una <code>caja mágica</code>.</span></div>
        <div class="pv-item"><span class="ic" style="background:#7CE7BD;color:#04231D">V</span><span class="tx"><b>vocabulario</b>Repetí conmigo: el carro se dice <code>car</code>.</span></div>
        <div class="pv-item"><span class="ic" style="background:#818CF8;color:#fff">F</span><span class="tx"><b>festejo</b>¡Excelente! Ganaste una palabra-trofeo.</span></div>`:`<div class="pv-item"><span class="ic" style="background:#7CE7BD;color:#04231D">A</span><span class="tx"><b>apertura</b>Honestly? I doom-scroll before bed. You worse than me?</span></div>
        <div class="pv-item"><span class="ic" style="background:#FFE9A6;color:#3A2A00">R</span><span class="tx"><b>recasteo</b>Alumno: "I go yesterday" → "Ah, you <code>went</code> yesterday — and then?"</span></div>
        <div class="pv-item"><span class="ic" style="background:#F87171;color:#fff">X</span><span class="tx"><b>suprimido</b>Sin escena ni personajes: <code>NO ROLEPLAY</code>.</span></div>`}
        <div class="foot">Así suena este profe con el tópico y nivel más usados del segmento. La forma exacta de cada turno la fija el cruce.</div>
      </div>
      <div class="card"><div class="card-head"><h3>Fragmento compilado</h3><span class="h-meta">vista LLM</span></div>
        <pre class="sp-box"><span class="c">&lt;teacher_persona owner=student_types[${p.id}]&gt;</span>
  <span class="k">Name:</span>       <span class="v">"${esc(p.n)}"</span>
  <span class="k">Identity:</span>   <span class="v">"${esc(p.ident)}"</span>
  <span class="k">Focus:</span>      <span class="v">"${esc(p.focus)}"</span>
  <span class="k">Style:</span>      <span class="v">"${esc(p.estilo)}"</span>
  <span class="k">Anchors:</span>    <span class="${roleplay?'v':'r'}">"${esc(p.anclas)}"</span>
<span class="c">&lt;/teacher_persona&gt;</span></pre>
      </div>
      <div class="card"><div class="card-head"><h3>Cruces de este segmento</h3></div>
        ${LEVELS.filter(l=>MATRIX[p.id+'|'+l.k]).map(l=>`<div class="trow" style="box-shadow:none;margin-bottom:6px" onclick="go('catalogo/cruce/${p.id}/${l.k}')"><div class="body"><div class="t" style="font-size:13px">${p.id} × ${l.k}</div><div class="m">${MATRIX[p.id+'|'+l.k]}/8 campos<span class="sep"></span>${((CRUCE_USO.find(c=>c.band===p.id&&c.lvl===l.k)||{}).n||0).toLocaleString('es-AR')} clases</div></div></div>`).join('')}
      </div>
    </div>
  </div>`;
}
function viewVoice(id){
  const v=VOICES.find(x=>x.id===id);if(!v)return go('catalogo/voz');
  crumb([['Catálogo','catalogo/topicos'],['Voz','catalogo/voz'],[v.n,null]]);
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('catalogo/voz')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a voces</button>
  <div class="card"><div class="card-head"><h3>${v.n}</h3><span class="chip">Gemini Live</span></div>
    <div class="kv"><span class="k">voice_id</span><span>${v.id}</span></div>
    <div class="kv"><span class="k">carácter</span><span>${esc(v.d)}</span></div>
    <div class="kv"><span class="k">segmentos</span><span>${v.seg}</span></div>
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-sm btn-dark" onclick="toast()">Escuchar muestra</button></div>
  </div>`;
}

/* ───────────── auditoría ───────────── */
function viewAuditoria(){
  crumb([['Auditoría de sesiones',null]]);
  document.getElementById('view').innerHTML=`
  <p style="font-size:13px;color:var(--fg-3);margin:0 0 16px;max-width:660px">Cada clase real que pasó por el motor: transcript, cadencia usada y las observaciones que evolucionaron la memoria del alumno.</p>
  <div class="tbl"><div class="hd"><span>Sesión</span><span>Alumno</span><span>Cruce</span><span>Cuándo</span></div>
  ${SESSIONS.map(s=>`<div class="rw" onclick="go('auditoria/${s.id}')"><span class="who"><i style="background:var(--o-cruce)">#</i>${s.id} · ${esc(s.topico)}</span><span>${s.alumno}</span><span>${s.seg} × ${s.lvl}</span><span>${s.fecha} · ${s.min} min</span></div>`).join('')}</div>`;
}
function viewSession(id){
  const s=SESSIONS.find(x=>x.id==id);if(!s)return go('auditoria');
  crumb([['Auditoría de sesiones','auditoria'],['#'+s.id,null]]);
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('auditoria')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a sesiones</button>
  <div class="dgrid">
    <div class="card"><div class="card-head"><h3>Transcript · #${s.id}</h3><span class="chip">${s.min} min</span></div>
      ${s.ts.map(l=>`<div class="ts-line"><b class="${l.w==='ai'?'ai':'user'}">${l.w==='ai'?'Profe':'Vos'}</b><span>${esc(l.t)}</span></div>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card"><div class="card-head"><h3>Contexto</h3></div>
        <div class="kv"><span class="k">alumno</span><span>${s.alumno}</span></div>
        <div class="kv"><span class="k">cruce</span><span>${s.seg} × ${s.lvl}</span></div>
        <div class="kv"><span class="k">tópico</span><span>${esc(s.topico)}</span></div>
        <div class="kv"><span class="k">cadencia</span><span>${s.cad}</span></div>
        <div class="kv"><span class="k">fecha</span><span>${s.fecha}</span></div>
      </div>
      <div class="card"><div class="card-head"><h3>Observaciones → memoria</h3></div>
        ${s.obs.map(o=>`<div style="font-size:12.5px;color:var(--fg-2);border-left:3px solid var(--o-reglas);padding:6px 10px;background:var(--bg-2);border-radius:0 8px 8px 0;margin-bottom:6px">${esc(o)}</div>`).join('')}
        <a class="btn btn-soft btn-sm" href="#/operacion/alumno/${(STUDENTS.find(x=>x.n===s.alumno)||{}).id||1}">Ver memoria del alumno</a>
      </div>
    </div>
  </div>`;
}

/* ───────────── operación ───────────── */
function viewOperacion(tab){
  crumb([['Operación','operacion/metricas'],[{metricas:'Métricas',alumnos:'Alumnos',usuarios:'Usuarios'}[tab]||'Métricas',null]]);
  const T='';
  const V=document.getElementById('view');
  if(tab==='metricas'){
    const maxC=Math.max(...CRUCE_USO.map(c=>c.n));
    V.innerHTML=T+`
    <section class="hero-stat"><h1>1.038 clases · <em>8.720 minutos</em> hablados.</h1>
    <p>Acá se ve dónde está la demanda real: qué cruces se usan, cuánto habla cada segmento y qué estructuras siguen fallando pese al recasteo.</p></section>
    <div class="dgrid">
      <div class="card"><div class="card-head"><h3>Cruces más usados</h3><span class="h-meta">edad × nivel · 7d</span></div>
        ${CRUCE_USO.map(c=>`<div class="heat-row" onclick="go('catalogo/cruce/${c.band}/${c.lvl}')"><div class="htn">${c.band} × ${c.lvl}</div><div class="hbar"><i style="width:${Math.round(c.n/maxC*100)}%"></i></div><div class="hn">${c.n.toLocaleString('es-AR')}</div></div>`).join('')}
      </div>
      <div class="card"><div class="card-head"><h3>Minutos por segmento</h3><span class="h-meta">7d</span></div>
        ${SEG_MIN.map(s=>`<div class="heat-row" style="cursor:default"><div class="htn">${s.s}</div><div class="hbar"><i style="width:${s.pct}%"></i></div><div class="hn">${s.min.toLocaleString('es-AR')}</div></div>`).join('')}
        <div class="insight" style="margin-top:14px"><b>Insight</b> · Kids concentra el 38% de los minutos pero solo el 12% de los tópicos publicados: el catálogo va atrás de la demanda.</div>
      </div>
    </div>
    <div class="dgrid" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>Errores que más disparan insistencia</h3><span class="h-meta">esta semana</span></div>
        ${ERRORES.map((e,i)=>`<div class="rli"><span class="rn">#${i+1}</span><div class="rt">${e.t}<small>${e.ej}</small></div><span class="rc">${e.n}</span></div>`).join('')}
        <div class="insight"><b>Insight</b> · el 61% de los disparos vienen de tres estructuras. Reforzarlas en el cruce (produccion_esperada) mueve la aguja más que sumar tópicos.</div>
      </div>
      <div class="card"><div class="card-head"><h3>Evolución de clases</h3><span class="h-meta">últimas 8 semanas</span></div>
        <div class="spark" style="height:120px;gap:6px">${[42,55,48,63,58,74,86,92].map((h,i)=>`<i class="on" style="height:${h}%;opacity:${.45+i*.07}"></i>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--fg-4);margin-top:8px"><span>S-8</span><span>S-4</span><span>hoy</span></div>
        <div class="kv" style="margin-top:12px"><span class="k">clases / semana</span><span>1.038 <small style="color:var(--green-700);font-weight:700">+11%</small></span></div>
        <div class="kv"><span class="k">duración media</span><span>8,4 min</span></div>
        <div class="kv"><span class="k">retención 30d</span><span>64% <small style="color:var(--green-700);font-weight:700">+3pp</small></span></div>
      </div>
    </div>`;return}
  if(tab==='alumnos'){
    V.innerHTML=T+`<div class="tbl"><div class="hd"><span>Alumno</span><span>Segmento</span><span>Nivel</span><span>Última clase</span></div>
    ${STUDENTS.map(s=>`<div class="rw" onclick="go('operacion/alumno/${s.id}')"><span class="who"><i style="background:${s.col}">${s.n[0]}</i>${s.n}</span><span>${s.seg}</span><span>${s.lvl}</span><span>${s.last}</span></div>`).join('')}</div>`;return}
  if(tab==='usuarios'){
    V.innerHTML=T+`<div class="tbl"><div class="hd"><span>Usuario</span><span>Rol</span><span>Acceso</span><span>Último ingreso</span></div>
    ${USERS.map(u=>`<div class="rw" onclick="go('operacion/usuario/${u.id}')"><span class="who"><i style="background:${u.col}">${u.n[0]}</i>${u.n}</span><span>${u.rol}</span><span>${u.acc}</span><span>${u.last}</span></div>`).join('')}</div>`;return}
  const maxUso=Math.max(...TOPICS.map(t=>t.usos));
  V.innerHTML=`
  <section class="greet">
    <div class="eyebrow">Buen día, Ana</div>
    <h1>148 clases hoy · 2.940 minutos hablados.</h1>
    <p>El cruce <b>adult × B2</b> sigue siendo el más usado. Hay 1 celda de la matriz incompleta y 9 tópicos Kids nuevos sin estrenar.</p>
  </section>
  <div class="kpi-row">
    <div class="kpi dark"><div class="k">Clases · 7d</div><div class="v">1.038<small>+11%</small></div>
      <div class="spark">${[35,50,42,60,55,75,85].map(h=>`<i class="on" style="height:${h}%"></i>`).join('')}</div></div>
    <div class="kpi"><div class="k">Minutos hablados</div><div class="v">8.720<small>+8%</small></div><div class="h">~8,4 min por clase</div></div>
    <div class="kpi"><div class="k">Alumnos activos</div><div class="v">201<small>+5%</small></div><div class="h">de 312 con perfil</div></div>
    <div class="kpi"><div class="k">Cruces incompletos</div><div class="v">1<small class="down">junior × B1</small></div><div class="h">compone con fallback</div></div>
  </div>
  <div class="dgrid">
    <div>
      <div class="card"><div class="card-head"><h3>Tópicos más usados</h3><a class="link" href="#/operacion/metricas">Ver métricas →</a></div>
        ${TOPICS.slice().sort((a,b)=>b.usos-a.usos).slice(0,7).map(t=>`<div class="heat-row" onclick="go('catalogo/topico/${t.id}')"><div class="htn">${esc(t.t)}</div><div class="hbar"><i style="width:${Math.max(3,Math.round(t.usos/maxUso*100))}%"></i></div><div class="hn">${t.usos.toLocaleString('es-AR')}</div></div>`).join('')}
      </div>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>Personalidades en producción</h3><a class="link" href="#/catalogo/personalidades">Ver catálogo →</a></div>
        ${PERSONAS.map(p=>`<div class="prow" onclick="go('catalogo/persona/${p.id}')"><div class="id"><span class="av" style="background:${p.col}">${p.n[0]}</span><div><h4>${p.n}</h4><small>${esc(p.estilo)}</small></div></div><div class="mini"><div class="bar"><i style="width:${p.share}%"></i></div><span style="font-weight:600">${p.share}%</span></div><div style="font-family:var(--font-display);font-weight:700;font-size:13px">${p.min} min</div><span class="atag live"><span class="live-dot" style="width:6px;height:6px"></span>Activa</span></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card"><div class="card-head"><h3>Qué hay que atender</h3></div>
        <div class="pcard" style="box-shadow:none;margin-bottom:8px" onclick="go('catalogo/cruce/junior/B1')"><span class="av" style="background:#E5484D">!</span><div class="body"><div class="t" style="font-size:13px">junior × B1 sin accion_de_cierre</div><div class="s">Compone con fallback del template.</div></div></div>
        <div class="pcard" style="box-shadow:none;margin-bottom:8px" onclick="go('catalogo/topicos')"><span class="av" style="background:#FFB800">9</span><div class="body"><div class="t" style="font-size:13px">9 tópicos Kids sin uso</div><div class="s">Cargados esta semana.</div></div></div>
        <div class="pcard" style="box-shadow:none;margin-bottom:0" onclick="go('auditoria')"><span class="av" style="background:#00B37E">3</span><div class="body"><div class="t" style="font-size:13px">3 sesiones para auditar</div><div class="s">Transcript y observaciones listos.</div></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Errores más frecuentes</h3><span class="h-meta">7d</span></div>
        ${ERRORES.slice(0,4).map((e,i)=>`<div class="rli"><span class="rn">#${i+1}</span><div class="rt">${e.t}<small>${e.ej}</small></div><span class="rc">${e.n}</span></div>`).join('')}
      </div>
      <div class="card"><div class="card-head"><h3>Actividad reciente</h3><span class="h-meta">24h</span></div>
        ${ACTIVITY.map(a=>`<div class="act-item"><div class="act-ic" style="background:${a.c}22;color:${a.c}">${a.i}</div><div class="act-body">${a.txt}<div class="meta">${a.meta}</div></div><span class="act-time">${a.t}</span></div>`).join('')}
      </div>
    </div>
  </div>`;
}
function viewOverview(){
  crumb([['Overview',null]]);
  const V=document.getElementById('view');
  const maxUso=Math.max(...TOPICS.map(t=>t.usos)),maxC=Math.max(...CRUCE_USO.map(c=>c.n));
  const def=Object.keys(MATRIX).length,campos=Object.values(MATRIX).reduce((a,b)=>a+b,0);
  const nivCub=TOPICS.reduce((a,t)=>a+coverage(t),0),nivTot=TOPICS.reduce((a,t)=>a+t.levels.length,0);
  V.innerHTML=`
  <section class="greet">
    <div class="eyebrow">Buen día, Ana</div>
    <h1>148 clases hoy · 2.940 minutos hablados.</h1>
    <p>Estado técnico de la plataforma: qué compone el motor, qué tan cargado está el catálogo y dónde se rompe la cadena.</p>
  </section>
  <div class="kpi-row">
    <div class="kpi dark"><div class="k">Clases · 7d</div><div class="v">1.038<small>+11%</small></div>
      <div class="spark">${[35,50,42,60,55,75,85].map(h=>`<i class="on" style="height:${h}%"></i>`).join('')}</div></div>
    <div class="kpi"><div class="k">Cruces definidos</div><div class="v">${def}</div><div class="h">${campos}/${def*8} campos · 1 celda incompleta (junior × B1)</div></div>
    <div class="kpi"><div class="k">Catálogo de tópicos</div><div class="v">${TOPICS.length}</div><div class="h">${nivCub}/${nivTot} niveles con seed · faltan ${nivTot-nivCub} por escribir</div></div>
    <div class="kpi"><div class="k">Alumnos activos</div><div class="v">201<small>+5%</small></div><div class="h">de 312 con perfil y memoria</div></div>
  </div>
  <div class="dgrid">
    <div>
      <div class="card"><div class="card-head"><h3>Las 6 capas del composer · estado</h3><a class="link" href="#/probador">Abrir Probador →</a></div>
        <p style="font-size:12.5px;color:var(--fg-3);margin:0 0 12px">Cada capa aporta un pedazo del prompt. Si una queda vacía, el motor compone con fallback y la clase pierde forma.</p>
        ${[['runtime','Contexto + Alumno','runtime','ok · se calcula por sesión','#'],['edad','El profe','student_types','4/4 segmentos cargados','catalogo/personalidades'],['topico','El tópico','topics',`${TOPICS.length} tópicos · ${nivTot-nivCub} niveles sin seed`,'catalogo/topicos'],['nivel','El nivel','levels','7/7 niveles con gramática objetivo','catalogo/edades'],['cruce','El cruce','age_level_matrix',`${def} celdas · 1 con campo faltante`,'catalogo/edades'],['reglas','Reglas universales','conversation_rules','10 reglas · gateadas en 2 bloques','catalogo/edades']].map(([o,t,src,st,href])=>
          `<div class="kwrow" style="cursor:pointer" onclick="go('${href}')"><span class="kn">${t} <span style="font-family:ui-monospace,monospace;font-size:10.5px;color:var(--fg-4)">${src}</span></span><span class="owner ${o}">${o==='runtime'?'runtime':o.toUpperCase()}</span><span style="font-size:11.5px;color:var(--fg-3);width:210px;text-align:right">${st}</span></div>`).join('')}
      </div>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>Tópicos más usados</h3><a class="link" href="#/operacion/metricas">Ver métricas →</a></div>
        ${TOPICS.slice().sort((a,b)=>b.usos-a.usos).slice(0,6).map(t=>`<div class="heat-row" onclick="go('catalogo/topico/${t.id}')"><div class="htn">${esc(t.t)}</div><div class="hbar"><i style="width:${Math.max(3,Math.round(t.usos/maxUso*100))}%"></i></div><div class="hn">${t.usos.toLocaleString('es-AR')}</div></div>`).join('')}
      </div>
      <div class="card" style="margin-top:14px"><div class="card-head"><h3>Cruces más usados</h3><a class="link" href="#/catalogo/edades">Ver matriz →</a></div>
        ${CRUCE_USO.slice(0,5).map(c=>`<div class="heat-row" onclick="go('catalogo/cruce/${c.band}/${c.lvl}')"><div class="htn">${c.band} × ${c.lvl}</div><div class="hbar"><i style="width:${Math.round(c.n/maxC*100)}%"></i></div><div class="hn">${c.n.toLocaleString('es-AR')}</div></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card"><div class="card-head"><h3>Qué hay que atender</h3></div>
        <div class="pcard" style="box-shadow:none;margin-bottom:8px" onclick="go('catalogo/cruce/junior/B1')"><span class="av" style="background:#E5484D">!</span><div class="body"><div class="t" style="font-size:13px">junior × B1 sin accion_de_cierre</div><div class="s">388 clases compusieron con fallback.</div></div></div>
        <div class="pcard" style="box-shadow:none;margin-bottom:8px" onclick="go('catalogo/topicos')"><span class="av" style="background:#FFB800">${nivTot-nivCub}</span><div class="body"><div class="t" style="font-size:13px">niveles sin seed prompt</div><div class="s">El tópico entra solo con el título.</div></div></div>
        <div class="pcard" style="box-shadow:none;margin-bottom:0" onclick="go('auditoria')"><span class="av" style="background:#00B37E">3</span><div class="body"><div class="t" style="font-size:13px">3 sesiones para auditar</div><div class="s">Transcript y observaciones listos.</div></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Errores más frecuentes</h3><span class="h-meta">7d</span></div>
        ${ERRORES.slice(0,4).map((e,i)=>`<div class="rli"><span class="rn">#${i+1}</span><div class="rt">${e.t}<small>${e.ej}</small></div><span class="rc">${e.n}</span></div>`).join('')}
      </div>
      <div class="card"><div class="card-head"><h3>Profes en producción</h3><a class="link" href="#/catalogo/personalidades">Ver →</a></div>
        ${PERSONAS.map(p=>`<div class="heat-row" onclick="go('catalogo/persona/${p.id}')"><div class="htn">${p.n} · ${p.seg.split(' ')[0]}</div><div class="hbar"><i style="width:${p.share*3}%"></i></div><div class="hn">${p.share}%</div></div>`).join('')}
      </div>
      <div class="card"><div class="card-head"><h3>Actividad reciente</h3><span class="h-meta">24h</span></div>
        ${ACTIVITY.map(a=>`<div class="act-item"><div class="act-ic" style="background:${a.c}22;color:${a.c}">${a.i}</div><div class="act-body">${a.txt}<div class="meta">${a.meta}</div></div><span class="act-time">${a.t}</span></div>`).join('')}
      </div>
    </div>
  </div>`;
}
function viewStudent(id){
  const s=STUDENTS.find(x=>x.id==id);if(!s)return go('operacion/alumnos');
  crumb([['Operación','operacion/resumen'],['Alumnos','operacion/alumnos'],[s.n,null]]);
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('operacion/alumnos')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a alumnos</button>
  <div class="dgrid">
    <div class="card"><div class="card-head"><h3>${s.n}</h3><span class="chip">${s.seg} · ${s.lvl}</span></div>
      <div class="kv"><span class="k">clases</span><span>${s.clases}</span></div>
      <div class="kv"><span class="k">última clase</span><span>${s.last}</span></div>
      <div class="kv"><span class="k">nivel fijo</span><span>${s.lvl}</span></div>
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--fg-4);font-weight:700;margin:16px 0 8px">Memoria (SRS)</div>
      <div class="mem-chips">${s.mem.map(m=>`<span class="mem-chip"><b>${m.k}:</b> ${esc(m.v)} <span class="n">${m.n}</span></span>`).join('')||'<span style="font-size:12.5px;color:var(--fg-3)">Sin memoria todavía.</span>'}</div>
      <div style="display:flex;gap:8px;margin-top:14px"><a class="btn btn-sm btn-dark" href="#/probador">Probar clase con ${s.n}</a><button class="btn btn-soft btn-sm" onclick="toast()">Borrar memoria</button></div>
    </div>
    <div class="card"><div class="card-head"><h3>Sesiones</h3></div>
      ${SESSIONS.filter(x=>x.alumno===s.n).map(x=>`<div class="trow" style="box-shadow:none;margin-bottom:6px" onclick="go('auditoria/${x.id}')"><div class="body"><div class="t" style="font-size:13px">#${x.id} · ${esc(x.topico)}</div><div class="m">${x.fecha}<span class="sep"></span>${x.min} min<span class="sep"></span>${x.cad}</div></div></div>`).join('')||'<div style="color:var(--fg-3);font-size:12.5px">Sin sesiones registradas.</div>'}
    </div>
  </div>`;
}
function viewUser(id){
  const u=USERS.find(x=>x.id==id);if(!u)return go('operacion/usuarios');
  crumb([['Operación','operacion/resumen'],['Usuarios','operacion/usuarios'],[u.n,null]]);
  document.getElementById('view').innerHTML=`
  <button class="backlink" onclick="go('operacion/usuarios')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>Volver a usuarios</button>
  <div class="card"><div class="card-head"><h3>${u.n}</h3><span class="chip">${u.rol}</span></div>
    <div class="kv"><span class="k">email</span><span>${u.mail}</span></div>
    <div class="kv"><span class="k">rol</span><span>${u.rol}</span></div>
    <div class="kv"><span class="k">acceso</span><span>${u.acc}</span></div>
    <div class="kv"><span class="k">último ingreso</span><span>${u.last}</span></div>
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-sm btn-dark" onclick="toast()">Cambiar permisos</button><button class="btn btn-soft btn-sm" onclick="toast()">Desactivar</button></div>
  </div>`;
}
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'smooth'})});
render();