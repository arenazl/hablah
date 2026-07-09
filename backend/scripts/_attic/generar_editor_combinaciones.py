"""
Genera el editor visual de combinaciones (HTML standalone).
Drag & drop entre bandas/niveles · eliminar · duplicar.
Guardar → descarga JSON → aplicar_combinaciones.py sincroniza la BD.

Uso:  python generar_editor_combinaciones.py
Salida: docs/editor_combinaciones.html
"""
from __future__ import annotations
import json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "editor_combinaciones.html"))
EVAL_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "evaluaciones_lote"))

BANDS = [
    {"slug": "mini",   "name": "Mini",   "age": "4–7",  "color": "#7c3aed", "bg": "#3b0764", "levels": ["A0","A1"]},
    {"slug": "junior", "name": "Junior",  "age": "8–12", "color": "#2563eb", "bg": "#1e3a5f", "levels": ["A0","A1","A2","B1"]},
    {"slug": "teen",  "name": "Teen",   "age": "13–17","color": "#0891b2", "bg": "#0c3a4a", "levels": ["A1","A2","B1","B2"]},
    {"slug": "adult",  "name": "Adulto",  "age": "18+",  "color": "#059669", "bg": "#064e3b", "levels": ["A0","A1","A2","B1","B2","C1","C2"]},
]
SLUG_TO_ID = {"mini":1,"junior":2,"teen":3,"adult":4}


def db():
    return pymysql.connect(
        host=os.environ["DB_HOST"], port=int(os.environ.get("DB_PORT",3306)),
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"], ssl={"ca":None}, cursorclass=DictCursor, charset="utf8mb4")


def load_data():
    conn = db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, title, segmento, audience FROM topics WHERE is_active=1 ORDER BY audience,segmento,title")
        topics = {str(r["id"]): {"id":r["id"],"title":r["title"],"seg":r["segmento"] or r["audience"] or "?"} for r in cur.fetchall()}
        cur.execute("SELECT topic_id, band_id, level_code FROM topic_band_level ORDER BY band_id,level_code,topic_id")
        rows = cur.fetchall()
    conn.close()

    ID_TO_SLUG = {v:k for k,v in SLUG_TO_ID.items()}
    assignments = {b["slug"]:{lv:[] for lv in b["levels"]} for b in BANDS}
    for r in rows:
        slug = ID_TO_SLUG.get(r["band_id"])
        lv = r["level_code"]
        tid = str(r["topic_id"])
        if slug and lv in assignments.get(slug,{}):
            assignments[slug][lv].append(tid)
    return topics, assignments


def load_scores():
    scores = {}
    if not os.path.exists(EVAL_DIR):
        return scores
    for fn in os.listdir(EVAL_DIR):
        if fn.startswith("_") or not fn.endswith("_eval.json"):
            continue
        try:
            d = json.load(open(os.path.join(EVAL_DIR,fn),encoding="utf-8"))
            k = f"{d.get('band','')}/{d.get('nivel','')}/{d.get('topic_id','')}"
            scores[k] = d.get("score_global")
        except Exception:
            pass
    return scores


def main():
    topics, assignments = load_data()
    scores = load_scores()

    data_js = json.dumps({"topics": topics, "assignments": assignments, "bands": BANDS, "scores": scores}, ensure_ascii=False)

    html = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Editor Combinaciones — Habláh</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body{background:#0a0c12;font-family:system-ui,sans-serif}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
  .drag-over{outline:2px dashed #7c3aed!important;background:rgba(124,58,237,.1)!important}
  .dragging{opacity:.3;scale:.97}
  [draggable]{cursor:grab}[draggable]:active{cursor:grabbing}
  .score-hi{color:#22c55e}.score-ok{color:#f59e0b}.score-lo{color:#ef4444}
  #dup-modal{display:none}#dup-modal.open{display:flex}
  .topic-card:hover .actions{opacity:1}
  .actions{opacity:0;transition:opacity .15s}
</style>
</head>
<body class="text-slate-200 h-screen flex flex-col overflow-hidden">

<!-- HEADER -->
<header class="flex items-center gap-4 px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
  <div class="flex-1">
    <h1 class="text-base font-bold text-white leading-none">Editor de Combinaciones</h1>
    <p class="text-xs text-slate-500 mt-0.5">Arrastrá · Eliminá · Duplicá · Guardá JSON</p>
  </div>
  <span id="chg" class="text-xs text-amber-400 font-medium hidden">● cambios sin guardar</span>
  <span id="total" class="text-xs text-slate-500"></span>
  <button onclick="resetAll()" class="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition">Revertir</button>
  <button onclick="saveJSON()" class="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">Guardar JSON</button>
</header>

<!-- MAIN: 4 columnas -->
<div class="flex flex-1 min-h-0">

  <!-- 1: Bandas -->
  <nav class="w-44 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-y-auto">
    <div class="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Banda</div>
    <div id="band-nav" class="flex flex-col gap-0.5 px-2 pb-3"></div>
  </nav>

  <!-- 2: Niveles -->
  <nav class="w-28 shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col overflow-y-auto">
    <div class="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nivel</div>
    <div id="level-nav" class="flex flex-col gap-0.5 px-2 pb-3"></div>
  </nav>

  <!-- 3: Tópicos asignados (drop zone) -->
  <section class="flex-1 flex flex-col min-w-0 border-r border-slate-800">
    <div class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 shrink-0">
      <div class="flex-1">
        <span id="combo-title" class="text-sm font-semibold text-slate-300">— elegí banda y nivel —</span>
      </div>
      <span id="assigned-cnt" class="text-xs text-slate-500"></span>
    </div>
    <div id="assigned-zone" class="flex-1 overflow-y-auto p-3"
         ondragover="ev(event,'over',this)" ondrop="ev(event,'drop','assigned')" ondragleave="ev(event,'leave',this)">
      <div id="assigned-list" class="flex flex-col gap-1.5 min-h-12"></div>
      <div id="assigned-empty" class="hidden text-xs text-slate-600 text-center mt-8">Arrastrá tópicos acá<br>desde el banco →</div>
    </div>
  </section>

  <!-- 4: Banco (drop zone para devolver) -->
  <aside class="w-64 shrink-0 flex flex-col">
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800 shrink-0">
      <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex-1">Banco</span>
      <input id="search" type="text" placeholder="Buscar…" oninput="renderBank()"
             class="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-300 w-24 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"/>
      <span id="bank-cnt" class="text-xs text-slate-600"></span>
    </div>
    <div id="bank-zone" class="flex-1 overflow-y-auto p-2"
         ondragover="ev(event,'over',this)" ondrop="ev(event,'drop','bank')" ondragleave="ev(event,'leave',this)">
      <div id="bank-list" class="flex flex-col gap-1"></div>
    </div>
  </aside>
</div>

<!-- MODAL DUPLICAR -->
<div id="dup-modal" class="fixed inset-0 bg-black/60 z-50 items-center justify-center">
  <div class="bg-slate-900 border border-slate-700 rounded-xl p-5 w-80 shadow-2xl">
    <h3 class="text-sm font-semibold text-white mb-3">Duplicar a…</h3>
    <div id="dup-targets" class="flex flex-col gap-1 max-h-64 overflow-y-auto"></div>
    <button onclick="closeDup()" class="mt-4 text-xs text-slate-500 hover:text-white w-full text-center">Cancelar</button>
  </div>
</div>

<script>
const RAW = """ + data_js + r""";
let state = deepCopy(RAW.assignments);
const orig = JSON.stringify(state);
const topics = RAW.topics;
const bands = RAW.bands;
const scores = RAW.scores || {};

let activeBand = "mini";
let activeLevel = "A0";
let dragTid = null, dragFrom = null; // dragFrom = {band,level} or null (banco)
let dupTid = null;

// ── deep copy ────────────────────────────────────────────────────────────
function deepCopy(o){return JSON.parse(JSON.stringify(o))}

// ── init ─────────────────────────────────────────────────────────────────
function init(){
  renderBandNav();
  renderLevelNav();
  renderAssigned();
  renderBank();
  refreshTotal();
}

// ── Band nav ─────────────────────────────────────────────────────────────
function renderBandNav(){
  const el=document.getElementById('band-nav');
  el.innerHTML='';
  bands.forEach(b=>{
    const cnt=Object.values(state[b.slug]||{}).flat().length;
    const active=b.slug===activeBand;
    const btn=document.createElement('button');
    btn.className=`w-full text-left px-2.5 py-2 rounded-lg text-sm transition ${active?'text-white font-semibold':'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`;
    btn.style.cssText=active?`background:${b.color}18;border-left:3px solid ${b.color}`:'border-left:3px solid transparent';
    btn.innerHTML=`<div class="font-semibold text-sm">${b.name}</div><div class="text-xs opacity-50">${b.age} · ${cnt}</div>`;
    btn.onclick=()=>{activeBand=b.slug;activeLevel=b.levels[0];renderBandNav();renderLevelNav();renderAssigned();};
    el.appendChild(btn);
  });
}

// ── Level nav ────────────────────────────────────────────────────────────
function renderLevelNav(){
  const el=document.getElementById('level-nav');
  el.innerHTML='';
  const bm=bands.find(b=>b.slug===activeBand);
  if(!bm)return;
  (bm.levels||[]).forEach(lv=>{
    const cnt=(state[activeBand]?.[lv]||[]).length;
    const active=lv===activeLevel;
    const btn=document.createElement('button');
    btn.className=`w-full text-left px-2.5 py-2 rounded-lg transition ${active?'text-white font-bold':'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`;
    btn.style.cssText=active?`background:${bm.color}18;border-left:3px solid ${bm.color}`:'border-left:3px solid transparent';
    btn.innerHTML=`<div class="text-sm font-semibold">${lv}</div><div class="text-xs opacity-50">${cnt}</div>`;
    btn.onclick=()=>{activeLevel=lv;renderLevelNav();renderAssigned();};
    el.appendChild(btn);
  });
}

// ── Assigned list ────────────────────────────────────────────────────────
function renderAssigned(){
  const list=document.getElementById('assigned-list');
  const empty=document.getElementById('assigned-empty');
  const cntEl=document.getElementById('assigned-cnt');
  const title=document.getElementById('combo-title');
  list.innerHTML='';
  if(!activeBand||!activeLevel){title.textContent='— elegí banda y nivel —';cntEl.textContent='';return;}
  const bm=bands.find(b=>b.slug===activeBand);
  title.textContent=`${bm.name} · ${activeLevel}`;
  const tids=state[activeBand]?.[activeLevel]||[];
  cntEl.textContent=`${tids.length} tópicos`;
  empty.classList.toggle('hidden',tids.length>0);
  tids.forEach(tid=>{list.appendChild(makeCard(tid,activeBand,activeLevel,true));});
  refreshTotal();markChanged();
}

// ── Bank ─────────────────────────────────────────────────────────────────
function renderBank(){
  const q=(document.getElementById('search').value||'').toLowerCase();
  const el=document.getElementById('bank-list');
  el.innerHTML='';
  let shown=0;
  Object.values(topics).forEach(t=>{
    if(q&&!t.title.toLowerCase().includes(q))return;
    el.appendChild(makeCard(String(t.id),null,null,false));
    shown++;
  });
  document.getElementById('bank-cnt').textContent=shown;
}

// ── Topic card ────────────────────────────────────────────────────────────
function makeCard(tid,band,level,assigned){
  const t=topics[tid];
  if(!t){const d=document.createElement('div');return d;}
  const seg=t.seg||'?';
  // score badge
  const sk=`${band}/${level}/${tid}`;
  const sc=scores[sk];
  let scoreBadge='';
  if(sc!=null){
    const cls=sc>=8?'score-hi':sc>=6.5?'score-ok':'score-lo';
    scoreBadge=`<span class="${cls} text-[10px] font-bold tabular-nums">${sc.toFixed(1)}</span>`;
  }

  const card=document.createElement('div');
  card.className='topic-card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/40 hover:border-slate-600/60 text-xs select-none transition';
  card.setAttribute('draggable','true');
  card.dataset.tid=tid;

  const dragHandle=`<span class="text-slate-600 text-[10px] shrink-0">⠿</span>`;
  const titleEl=`<span class="flex-1 text-slate-200 leading-tight">${escHtml(t.title)}</span>`;
  const segTag=`<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">${seg}</span>`;

  let actionsHtml='';
  if(assigned){
    actionsHtml=`
      <div class="actions flex gap-0.5 shrink-0">
        <button title="Duplicar" onclick="openDup('${tid}')" class="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition">
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h5a2 2 0 002-2v-1h1v1a3 3 0 01-3 3H4a3 3 0 01-3-3V4a3 3 0 013-3h5a3 3 0 013 3v1h-1V4a2 2 0 00-2-2H4z"/><path d="M8 5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V7a2 2 0 00-2-2H8zm0 1h4a1 1 0 011 1v4a1 1 0 01-1 1H8a1 1 0 01-1-1V7a1 1 0 011-1z"/></svg>
        </button>
        <button title="Eliminar de este combo" onclick="removeTopic('${band}','${level}','${tid}')" class="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition">
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 010-2h3.5a1 1 0 011-1h2a1 1 0 011 1H14.5zm-11 1v9a1 1 0 001 1h6a1 1 0 001-1V4H3.5z"/></svg>
        </button>
      </div>`;
  }

  card.innerHTML=`${dragHandle}${titleEl}${segTag}${scoreBadge}${actionsHtml}`;

  card.ondragstart=e=>{
    dragTid=tid;
    dragFrom=assigned?{band,level}:null;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed='move';
  };
  card.ondragend=()=>card.classList.remove('dragging');
  return card;
}

// ── Drag events ───────────────────────────────────────────────────────────
function ev(e,type,target){
  if(type==='over'){e.preventDefault();target.classList.add('drag-over');}
  else if(type==='leave'){target.classList.remove('drag-over');}
  else if(type==='drop'){
    e.preventDefault();
    if(typeof target==='string'){
      const zone=target==='assigned'?document.getElementById('assigned-zone'):document.getElementById('bank-zone');
      zone.classList.remove('drag-over');
    } else {target.classList.remove('drag-over');}
    handleDrop(target);
  }
}

function handleDrop(target){
  if(!dragTid)return;
  if(target==='assigned'){
    if(!activeBand||!activeLevel)return;
    if(dragFrom){removeFromState(dragFrom.band,dragFrom.level,dragTid);}
    addToState(activeBand,activeLevel,dragTid);
  } else if(target==='bank'){
    if(dragFrom){removeFromState(dragFrom.band,dragFrom.level,dragTid);}
  }
  dragTid=null;dragFrom=null;
  renderBandNav();renderLevelNav();renderAssigned();renderBank();
}

function addToState(band,level,tid){
  if(!state[band])return;
  if(!state[band][level])state[band][level]=[];
  if(!state[band][level].includes(tid))state[band][level].push(tid);
}
function removeFromState(band,level,tid){
  if(state[band]?.[level])state[band][level]=state[band][level].filter(id=>id!==tid);
}
function removeTopic(band,level,tid){
  removeFromState(band,level,tid);
  renderBandNav();renderLevelNav();renderAssigned();
}

// ── Duplicar ──────────────────────────────────────────────────────────────
function openDup(tid){
  dupTid=tid;
  const targets=document.getElementById('dup-targets');
  targets.innerHTML='';
  bands.forEach(b=>{
    const header=document.createElement('div');
    header.className='text-[10px] text-slate-600 uppercase tracking-widest mt-2 mb-0.5 px-1';
    header.textContent=b.name;
    targets.appendChild(header);
    b.levels.forEach(lv=>{
      const btn=document.createElement('button');
      btn.className='w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-slate-800 text-slate-300 transition';
      const already=(state[b.slug]?.[lv]||[]).includes(dupTid);
      btn.innerHTML=`${lv} ${already?'<span class="text-[10px] text-slate-600">(ya asignado)</span>':''}`;
      btn.onclick=()=>doDup(b.slug,lv);
      targets.appendChild(btn);
    });
  });
  document.getElementById('dup-modal').classList.add('open');
}
function doDup(band,level){
  if(dupTid)addToState(band,level,dupTid);
  closeDup();
  renderBandNav();renderLevelNav();renderAssigned();
}
function closeDup(){document.getElementById('dup-modal').classList.remove('open');dupTid=null;}

// ── Helpers ───────────────────────────────────────────────────────────────
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function refreshTotal(){
  let n=0;
  Object.values(state).forEach(lvs=>Object.values(lvs).forEach(arr=>n+=arr.length));
  document.getElementById('total').textContent=`${n} combinaciones`;
}

function markChanged(){
  const changed=JSON.stringify(state)!==orig;
  document.getElementById('chg').classList.toggle('hidden',!changed);
}

function resetAll(){
  if(!confirm('¿Revertir todos los cambios?'))return;
  state=deepCopy(RAW.assignments);
  renderBandNav();renderLevelNav();renderAssigned();renderBank();
}

// ── Guardar JSON ──────────────────────────────────────────────────────────
function saveJSON(){
  const payload={generado:new Date().toISOString().slice(0,10),assignments:state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='combinaciones_editadas.json';
  a.click();
  document.getElementById('chg').classList.add('hidden');
}

init();
</script>
</body>
</html>"""

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Editor generado: {OUT}")


if __name__ == "__main__":
    main()
