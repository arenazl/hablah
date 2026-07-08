"""
Genera el HTML de revisión pedagógica: banda → nivel → lista de tópicos → OK / X.
El usuario marca cada tópico. Guardar descarga JSON con las decisiones.

Uso:  python generar_html_revision.py
Salida: docs/revision_topicos.html
"""
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

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "revision_topicos.html"))
EVAL_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "evaluaciones_lote"))

BANDS = [
    {"slug": "mini",   "name": "Mini",   "age": "4–7 años",   "color": "#7c3aed", "levels": ["A0","A1"]},
    {"slug": "junior", "name": "Junior",  "age": "8–12 años",  "color": "#2563eb", "levels": ["A0","A1","A2","B1"]},
    {"slug": "teen",  "name": "Teen",   "age": "13–17 años", "color": "#0891b2", "levels": ["A1","A2","B1","B2"]},
    {"slug": "adult",  "name": "Adulto",  "age": "18+ años",   "color": "#059669", "levels": ["A0","A1","A2","B1","B2","C1","C2"]},
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
        cur.execute("""
            SELECT t.id, t.title, t.segmento, t.category, t.keywords,
                   tbl.band_id, tbl.level_code
            FROM topic_band_level tbl
            JOIN topics t ON t.id = tbl.topic_id
            ORDER BY tbl.band_id, tbl.level_code, t.title
        """)
        rows = cur.fetchall()
    conn.close()

    ID_TO_SLUG = {v:k for k,v in SLUG_TO_ID.items()}
    data = {b["slug"]:{lv:[] for lv in b["levels"]} for b in BANDS}

    for r in rows:
        slug = ID_TO_SLUG.get(r["band_id"])
        lv = r["level_code"]
        if not slug or lv not in data.get(slug,{}):
            continue
        kws = []
        try:
            raw = json.loads(r["keywords"] or "[]")
            kws = raw[:3] if isinstance(raw, list) else []
        except Exception:
            pass
        data[slug][lv].append({
            "id": r["id"],
            "title": r["title"],
            "cat": (r["category"] or "").replace("-"," "),
            "kws": kws,
        })
    return data


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
            scores[k] = round(float(d.get("score_global",0)),1)
        except Exception:
            pass
    return scores


def main():
    data = load_data()
    scores = load_scores()
    data_js = json.dumps({"bands": BANDS, "data": data, "scores": scores}, ensure_ascii=False)

    html = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisión de Tópicos — Habláh</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body{background:#0a0c12;font-family:system-ui,sans-serif}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#374151;border-radius:3px}
  .ok-card{border-color:#22c55e!important;background:#052e16!important}
  .x-card{border-color:#ef4444!important;background:#2d0808!important}
</style>
</head>
<body class="text-slate-200 h-screen flex flex-col overflow-hidden">

<!-- HEADER -->
<header class="flex items-center gap-4 px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
  <div class="flex-1">
    <h1 class="text-base font-bold text-white leading-none">Revisión de Tópicos</h1>
    <p id="progress-line" class="text-xs text-slate-500 mt-0.5">Seleccioná una banda para empezar</p>
  </div>
  <div class="flex gap-2 items-center">
    <span id="ok-cnt" class="text-xs text-green-500 font-semibold"></span>
    <span id="x-cnt"  class="text-xs text-red-500  font-semibold"></span>
    <button onclick="markAllOk()"  class="text-xs px-3 py-1.5 rounded-lg border border-green-800 text-green-400 hover:bg-green-900/30 transition">Todo OK</button>
    <button onclick="markAllX()"   class="text-xs px-3 py-1.5 rounded-lg border border-red-800   text-red-400   hover:bg-red-900/30   transition">Todo X</button>
    <button onclick="clearView()"  class="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white     transition">Limpiar</button>
    <button onclick="saveCalif()"  class="text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">Guardar calificación</button>
    <button onclick="saveRawJSON()" class="text-sm px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition">Exportar JSON</button>
  </div>
</header>

<!-- BODY -->
<div class="flex flex-1 min-h-0">

  <!-- Bandas -->
  <nav class="w-40 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col overflow-y-auto">
    <div class="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Banda</div>
    <div id="band-nav" class="flex flex-col gap-0.5 px-2 pb-3"></div>
  </nav>

  <!-- Niveles -->
  <nav class="w-28 shrink-0 border-r border-slate-800 bg-slate-900/20 flex flex-col overflow-y-auto">
    <div class="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nivel</div>
    <div id="level-nav" class="flex flex-col gap-0.5 px-2 pb-3"></div>
  </nav>

  <!-- Tópicos -->
  <main class="flex-1 overflow-y-auto p-5">
    <div id="topic-header" class="mb-4 hidden">
      <h2 id="combo-title" class="text-lg font-bold text-white"></h2>
      <p id="combo-sub"   class="text-xs text-slate-500 mt-0.5"></p>
    </div>
    <div id="topic-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"></div>
    <div id="empty-msg" class="text-slate-600 text-sm mt-16 text-center">← Elegí banda y nivel</div>
  </main>
</div>

<script>
const RAW = """ + data_js + r""";
const bands = RAW.bands;
const allData = RAW.data;
const scores = RAW.scores || {};

let activeBand = null;
let activeLevel = null;
// decisions: { "mini/A0/135": "ok" | "x" | null }
let decisions = {};

function key(band,level,id){ return `${band}/${level}/${id}`; }

// ── Boot ─────────────────────────────────────────────────────────────────
function init(){
  renderBandNav();
  updateCounts();
}

// ── Band nav ─────────────────────────────────────────────────────────────
function renderBandNav(){
  const el=document.getElementById('band-nav');
  el.innerHTML='';
  bands.forEach(b=>{
    const totalTopics = Object.values(allData[b.slug]||{}).flat().length;
    const doneTopics = Object.values(allData[b.slug]||{}).flat()
      .filter(t=>Object.values(allData[b.slug]).some(arr=>arr.find(x=>x.id===t.id && decisions[key(b.slug,Object.keys(allData[b.slug]).find(lv=>allData[b.slug][lv].find(x=>x.id===t.id)),t.id)])));

    const active = b.slug===activeBand;
    const btn=document.createElement('button');
    btn.className=`w-full text-left px-2.5 py-2.5 rounded-lg text-sm transition ${active?'text-white font-semibold':'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`;
    btn.style.cssText=active?`background:${b.color}18;border-left:3px solid ${b.color}`:'border-left:3px solid transparent';
    btn.innerHTML=`<div class="font-semibold">${b.name}</div><div class="text-xs opacity-50">${b.age} · ${totalTopics} tópicos</div>`;
    btn.onclick=()=>{activeBand=b.slug;activeLevel=b.levels[0];renderBandNav();renderLevelNav();renderTopics();};
    el.appendChild(btn);
  });
}

// ── Level nav ────────────────────────────────────────────────────────────
function renderLevelNav(){
  const el=document.getElementById('level-nav');
  el.innerHTML='';
  const bm=bands.find(b=>b.slug===activeBand);
  if(!bm)return;
  bm.levels.forEach(lv=>{
    const arr=allData[activeBand]?.[lv]||[];
    const decided=arr.filter(t=>decisions[key(activeBand,lv,t.id)]).length;
    const active=lv===activeLevel;
    const btn=document.createElement('button');
    btn.className=`w-full text-left px-2.5 py-2 rounded-lg transition ${active?'text-white font-bold':'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`;
    btn.style.cssText=active?`background:${bm.color}18;border-left:3px solid ${bm.color}`:'border-left:3px solid transparent';
    btn.innerHTML=`<div class="text-sm font-semibold">${lv}</div><div class="text-xs opacity-50">${decided}/${arr.length}</div>`;
    btn.onclick=()=>{activeLevel=lv;renderLevelNav();renderTopics();};
    el.appendChild(btn);
  });
}

// ── Topic grid ───────────────────────────────────────────────────────────
function renderTopics(){
  const grid=document.getElementById('topic-grid');
  const emptyMsg=document.getElementById('empty-msg');
  const header=document.getElementById('topic-header');
  grid.innerHTML='';
  if(!activeBand||!activeLevel){emptyMsg.classList.remove('hidden');header.classList.add('hidden');return;}
  emptyMsg.classList.add('hidden');
  header.classList.remove('hidden');

  const bm=bands.find(b=>b.slug===activeBand);
  document.getElementById('combo-title').textContent=`${bm.name} · ${activeLevel}`;
  const arr=allData[activeBand]?.[activeLevel]||[];
  document.getElementById('combo-sub').textContent=`${arr.length} tópicos · ${arr.filter(t=>decisions[key(activeBand,activeLevel,t.id)]).length} revisados`;

  arr.forEach(t=>{
    const k=key(activeBand,activeLevel,t.id);
    const dec=decisions[k]||null;
    const sc=scores[k];
    grid.appendChild(makeCard(t,k,dec,sc,bm.color));
  });

  updateProgressLine(arr, bm);
  updateCounts();
}

function makeCard(t,k,dec,sc,color){
  const card=document.createElement('div');
  card.id=`card-${k.replace(/\//g,'-')}`;
  card.className=`rounded-xl border-2 p-4 transition cursor-pointer select-none ${dec==='ok'?'ok-card':dec==='x'?'x-card':'border-slate-700 bg-slate-800/60 hover:border-slate-500'}`;

  let scoreBadge='';
  if(sc!=null){
    const cls=sc>=8?'text-green-400':sc>=6.5?'text-amber-400':'text-red-400';
    scoreBadge=`<span class="${cls} text-xs font-bold tabular-nums ml-auto">${sc}</span>`;
  }

  const kwHtml=t.kws.map(kw=>`<span class="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">${escHtml(kw)}</span>`).join('');

  card.innerHTML=`
    <div class="flex items-start gap-1 mb-2">
      <span class="text-xs font-semibold text-slate-500 shrink-0">#${t.id}</span>
      ${scoreBadge}
    </div>
    <div class="text-sm font-semibold text-white leading-snug mb-1">${escHtml(t.title)}</div>
    <div class="text-[11px] text-slate-500 mb-3">${escHtml(t.cat)}</div>
    <div class="flex flex-wrap gap-1 mb-3">${kwHtml}</div>
    <div class="flex gap-2 mt-auto">
      <button onclick="decide('${k}','ok')" class="flex-1 py-1.5 rounded-lg text-sm font-bold transition
        ${dec==='ok'?'bg-green-600 text-white':'bg-slate-700 text-slate-400 hover:bg-green-900/60 hover:text-green-300'}">✓ OK</button>
      <button onclick="decide('${k}','x')"  class="flex-1 py-1.5 rounded-lg text-sm font-bold transition
        ${dec==='x'?'bg-red-700 text-white':'bg-slate-700 text-slate-400 hover:bg-red-900/60 hover:text-red-300'}">✕ Fuera</button>
    </div>`;
  return card;
}

// ── Decisions ─────────────────────────────────────────────────────────────
function decide(k,val){
  decisions[k]= decisions[k]===val ? null : val;  // toggle
  renderTopics();
  renderLevelNav();
}

function markAllOk(){
  if(!activeBand||!activeLevel)return;
  (allData[activeBand]?.[activeLevel]||[]).forEach(t=>decisions[key(activeBand,activeLevel,t.id)]='ok');
  renderTopics();renderLevelNav();
}
function markAllX(){
  if(!activeBand||!activeLevel)return;
  (allData[activeBand]?.[activeLevel]||[]).forEach(t=>decisions[key(activeBand,activeLevel,t.id)]='x');
  renderTopics();renderLevelNav();
}
function clearView(){
  if(!activeBand||!activeLevel)return;
  (allData[activeBand]?.[activeLevel]||[]).forEach(t=>delete decisions[key(activeBand,activeLevel,t.id)]);
  renderTopics();renderLevelNav();
}

function updateProgressLine(arr, bm){
  const done=arr.filter(t=>decisions[key(activeBand,activeLevel,t.id)]).length;
  const total=arr.length;
  document.getElementById('progress-line').textContent=`${bm.name} / ${activeLevel} — ${done} de ${total} revisados`;
}

function updateCounts(){
  const vals=Object.values(decisions);
  const ok=vals.filter(v=>v==='ok').length;
  const x=vals.filter(v=>v==='x').length;
  document.getElementById('ok-cnt').textContent=ok?`${ok} aprobados`:'';
  document.getElementById('x-cnt').textContent=x?`${x} rechazados`:'';
}

// ── Save ─────────────────────────────────────────────────────────────────
function saveRawJSON(){
  const blob=new Blob([JSON.stringify(RAW,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='topicos_raw.json';
  a.click();
}

function saveCalif(){
  // Agrupar por banda/nivel/topico → solo los "ok"
  const approved = {}, rejected = {};
  Object.entries(decisions).forEach(([k,v])=>{
    const [band,level,id]=k.split('/');
    if(v==='ok'){
      approved[band]=approved[band]||{};
      approved[band][level]=approved[band][level]||[];
      approved[band][level].push(+id);
    } else if(v==='x'){
      rejected[band]=rejected[band]||{};
      rejected[band][level]=rejected[band][level]||[];
      rejected[band][level].push(+id);
    }
  });
  const payload={
    generado: new Date().toISOString().slice(0,10),
    total_revisados: Object.keys(decisions).length,
    total_aprobados: Object.values(decisions).filter(v=>v==='ok').length,
    total_rechazados: Object.values(decisions).filter(v=>v==='x').length,
    aprobados: approved,
    rechazados: rejected,
    decisions_raw: decisions
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='calificacion_topicos.json';
  a.click();
}

function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

init();
</script>
</body>
</html>"""

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"HTML generado: {OUT}")


if __name__ == "__main__":
    main()
