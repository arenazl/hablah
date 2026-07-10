export const HOY_CSS = `
[data-theme="dark"] .hoy-page,
[data-theme="dark"] .webapp-root .hoy-page {
  --hp-bg-1:#050807;
  --hp-bg-2:#0A0F0D;
  --hp-surface:#0A100E;
  --hp-border-1:rgba(232,236,234,.07);
  --hp-border-2:rgba(232,236,234,.12);
  --hp-fg-1:#E8ECEA;
  --hp-fg-2:#B6BDB9;
  --hp-fg-3:#8E938F;
  --hp-fg-4:#5A625F;
  --hp-shadow-card:0 1px 2px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.4);
}
/* Hero verde más oscuro/profundo en dark */
[data-theme="dark"] .hoy-page .hp-hero,
[data-theme="dark"] .webapp-root .hoy-page .hp-hero {
  background: radial-gradient(120% 140% at 0% 0%, #035C3F 0%, #044A33 38%, #062B22 78%, #031813 100%);
  box-shadow: 0 8px 28px rgba(0,0,0,.5);
}
.hoy-page{
  --hp-green:#00B37E;
  --hp-green-600:#00A172;
  --hp-green-700:#008F63;
  --hp-green-900:#054A3A;
  --hp-amber:#FFB800;
  --hp-danger:#E5484D;
  --hp-bg-1:#FAFBFA;
  --hp-bg-2:#F1F4F1;
  --hp-surface:#FFFFFF;
  --hp-border-1:rgba(13,20,18,.06);
  --hp-border-2:rgba(13,20,18,.10);
  --hp-fg-1:#0D1412;
  --hp-fg-2:#3A4441;
  --hp-fg-3:#6B7672;
  --hp-fg-4:#98A19D;
  --hp-r-card:14px;
  --hp-r-pill:999px;
  --hp-shadow-card:0 1px 2px rgba(13,20,18,.04), 0 2px 6px rgba(13,20,18,.04);
  --hp-shadow-float:0 6px 20px rgba(13,20,18,.10), 0 2px 6px rgba(13,20,18,.06);
  --hp-font-sans:'Inter',ui-sans-serif,system-ui,sans-serif;
  --hp-font-display:'Sora',var(--hp-font-sans);

  padding: 8px 32px 56px;
  max-width:1440px;
  background:var(--hp-bg-1);
  color:var(--hp-fg-1);
  font-family:var(--hp-font-sans);
  font-size:14px;
  line-height:1.5;
}
.hoy-page *{box-sizing:border-box}
.hoy-page button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit}
.hoy-page a{color:inherit;text-decoration:none}

.hoy-page .hp-greet{padding:6px 0 18px}
.hoy-page .hp-eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--hp-green);font-weight:700}
.hoy-page h1.hp-title{font-family:var(--hp-font-display);font-weight:700;letter-spacing:-0.02em;font-size:34px;line-height:1.05;margin:6px 0 6px;color:var(--hp-fg-1);max-width:820px}
.hoy-page .hp-title em{font-style:normal;color:var(--hp-green-700);background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.18) 64% 96%,transparent 96%);padding:0 2px}
.hoy-page .hp-sub{color:var(--hp-fg-2);font-size:14.5px;max-width:760px;margin:0}
.hoy-page .hp-sub b{color:var(--hp-fg-1);font-weight:600}

/* MEMORIA — "tu profe se acuerda" (F4-04). Linea liviana, solo cuando hay
   historia real (sale de report.next_session_tip de la ultima clase
   analizada). Si ademas hay rescue activo, el rescue ya cubre esto y esta
   linea no se muestra (una sola voz, no compiten). */
.hoy-page .hp-memory{display:flex;align-items:flex-start;gap:9px;margin-top:12px;padding:11px 14px;border-radius:12px;background:var(--hp-bg-2);border:1px solid var(--hp-border-1);font-size:13px;line-height:1.45;color:var(--hp-fg-2);max-width:760px}
.hoy-page .hp-memory svg{flex-shrink:0;margin-top:2px;color:var(--hp-green-700)}
.hoy-page .hp-memory b{color:var(--hp-fg-1);font-weight:700}

.hoy-page .hp-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px}
@media (max-width:1200px){ .hoy-page .hp-grid{grid-template-columns:1fr} }
.hoy-page .hp-col-l{display:flex;flex-direction:column;gap:20px;min-width:0}

/* HERO */
.hoy-page .hp-hero{position:relative;border-radius:20px;overflow:hidden;color:#fff;background:radial-gradient(120% 140% at 0% 0%, #00B37E 0%, #008F63 38%, #054A3A 78%, #042722 100%);box-shadow:var(--hp-shadow-float);min-height:340px;display:grid;grid-template-columns:minmax(0,1fr) 340px}
.hoy-page .hp-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(900px 360px at 110% 100%, rgba(255,184,0,.18), transparent 60%),radial-gradient(700px 280px at 0% 0%, rgba(255,255,255,.10), transparent 60%);pointer-events:none}
.hoy-page .hp-hero-l{position:relative;padding:26px 28px 24px;display:flex;flex-direction:column;gap:14px}
.hoy-page .hp-hero-chips{display:flex;flex-wrap:wrap;gap:6px}
.hoy-page .hp-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:var(--hp-r-pill);font-size:11.5px;font-weight:600;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);color:#fff;backdrop-filter:blur(4px)}
.hoy-page .hp-chip.solid{background:rgba(255,255,255,.96);color:var(--hp-green-900);border-color:transparent}
.hoy-page .hp-chip.amber{background:rgba(255,184,0,.18);border-color:rgba(255,184,0,.4);color:#FFE9A6}
.hoy-page .hp-feedback{display:inline-flex;align-items:center;gap:4px;margin-left:4px}
.hoy-page .hp-fb{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#fff;cursor:pointer;transition:transform .15s ease,background .2s ease,border-color .2s ease,box-shadow .25s ease;padding:0}
.hoy-page .hp-fb:hover{transform:translateY(-1px) scale(1.05)}
.hoy-page .hp-fb-like:hover{background:rgba(34,214,122,.22);border-color:rgba(34,214,122,.55);color:#fff;box-shadow:0 0 14px rgba(34,214,122,.35)}
.hoy-page .hp-fb-dislike:hover{background:rgba(229,72,77,.22);border-color:rgba(229,72,77,.55);color:#fff;box-shadow:0 0 14px rgba(229,72,77,.35)}
.hoy-page .hp-fb:active{transform:translateY(0) scale(.94)}
.hoy-page .hp-chip svg{width:13px;height:13px}
.hoy-page .hp-hero h2{font-family:var(--hp-font-display);font-weight:700;letter-spacing:-0.025em;font-size:46px;line-height:1.02;margin:6px 0 4px}
.hoy-page .hp-hero h2 small{display:block;font-weight:500;font-size:18px;color:rgba(255,255,255,.7);letter-spacing:-0.01em;margin-top:8px;max-width:480px;line-height:1.4}
.hoy-page .hp-hero-meta{display:flex;align-items:center;gap:18px;color:rgba(255,255,255,.75);font-size:12.5px;margin-top:auto;flex-wrap:wrap}
.hoy-page .hp-hero-meta .hp-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.4)}
.hoy-page .hp-hero-meta b{color:#fff;font-weight:600}
.hoy-page .hp-hero-meta .hp-row{display:flex;align-items:center;gap:8px}
.hoy-page .hp-hero-cta{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}
.hoy-page .hp-btn{display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 22px;border-radius:12px;font-weight:600;font-size:15px;transition:transform .15s, filter .15s, background .15s;border:0}
.hoy-page .hp-btn:active{transform:scale(.97);filter:brightness(.96)}
.hoy-page .hp-btn-primary{background:#fff;color:var(--hp-green-900)}
.hoy-page .hp-btn-primary:hover{background:#F2FBF7}
.hoy-page .hp-btn-ghost{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);color:#fff}
.hoy-page .hp-btn-ghost:hover{background:rgba(255,255,255,.16)}
.hoy-page .hp-btn-secondary{background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.32);color:#fff;font-weight:700}
.hoy-page .hp-btn-secondary:hover{background:rgba(255,255,255,.24);border-color:rgba(255,255,255,.5);transform:translateY(-1px)}
.hoy-page .hp-btn-secondary:active{transform:translateY(0) scale(.98)}
.hoy-page .hp-btn-lg{height:56px;padding:0 28px;font-size:16px;border-radius:14px}
.hoy-page .hp-mic-dot{width:10px;height:10px;border-radius:50%;background:var(--hp-green);box-shadow:0 0 0 4px rgba(0,179,126,.25);animation:hp-pulse 1.8s ease-out infinite}
@keyframes hp-pulse{0%{box-shadow:0 0 0 0 rgba(0,179,126,.45)}80%{box-shadow:0 0 0 10px rgba(0,179,126,0)}100%{box-shadow:0 0 0 0 rgba(0,179,126,0)}}

.hoy-page .hp-hero-r{position:relative;padding:24px 22px 22px;border-left:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(0,0,0,.0),rgba(0,0,0,.18));display:flex;flex-direction:column;gap:10px}
.hoy-page .hp-hero-r .hp-label{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.6);font-weight:700;margin-bottom:2px}
.hoy-page .hp-prompt{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:11px 13px;display:flex;gap:10px;align-items:flex-start;backdrop-filter:blur(4px)}
.hoy-page .hp-prompt .hp-pgl{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;flex-shrink:0;font-size:11px;font-weight:700;color:#fff}
.hoy-page .hp-prompt.vocab .hp-pgl{background:rgba(255,184,0,.22);color:#FFE9A6}
.hoy-page .hp-prompt.gram .hp-pgl{background:rgba(94,224,176,.22);color:#7CE7BD}
.hoy-page .hp-prompt.restr .hp-pgl{background:rgba(229,72,77,.22);color:#FFB4B6}
.hoy-page .hp-prompt .hp-pt{font-size:12.5px;color:rgba(255,255,255,.94);line-height:1.4}
.hoy-page .hp-prompt .hp-pt b{color:#fff;font-weight:600;background:rgba(255,255,255,.10);padding:1px 6px;border-radius:6px;font-family:var(--hp-font-display);font-size:11.5px;letter-spacing:.01em}
.hoy-page .hp-prompt .hp-pt .hp-small{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.55);font-weight:600;margin-bottom:3px}

/* CARDS */
.hoy-page .hp-card{background:var(--hp-surface);border:1px solid var(--hp-border-1);border-radius:var(--hp-r-card);padding:18px}
.hoy-page .hp-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.hoy-page .hp-card-head h3{font-family:var(--hp-font-display);font-weight:700;font-size:15px;letter-spacing:-0.01em;margin:0}
.hoy-page .hp-card-head .hp-h-meta{font-size:12px;color:var(--hp-fg-3)}
.hoy-page .hp-link{font-size:12.5px;color:var(--hp-green-700);font-weight:600;display:inline-flex;align-items:center;gap:4px;background:none;border:0;padding:0}
.hoy-page .hp-link:hover{color:var(--hp-green-900)}

/* RESCUE */
.hoy-page .hp-rescue{background:linear-gradient(180deg,#FFFDF4,#FFF9E2);border:1px solid #F4E1A4}
.hoy-page .hp-rescue-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:10px}
.hoy-page .hp-rescue-eye{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8A6A00;font-weight:700}
.hoy-page .hp-rescue-eye .hp-pulse{width:8px;height:8px;border-radius:50%;background:var(--hp-amber);box-shadow:0 0 0 4px rgba(255,184,0,.18)}
.hoy-page .hp-rescue h3{font-family:var(--hp-font-display);font-weight:700;font-size:22px;letter-spacing:-0.015em;margin:6px 0 4px;color:#3A2A00;line-height:1.15}
.hoy-page .hp-rescue p{margin:0;color:#6A4F00;font-size:13.5px;max-width:520px}
.hoy-page .hp-rescue-body{display:grid;grid-template-columns:1.1fr 1fr;gap:18px;margin-top:14px;align-items:stretch}
@media (max-width:900px){.hoy-page .hp-rescue-body{grid-template-columns:1fr}}
.hoy-page .hp-rescue-examples{display:flex;flex-direction:column;gap:8px}
.hoy-page .hp-ex{background:#fff;border:1px solid #F1E6BB;border-radius:10px;padding:10px 12px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;font-size:13px}
.hoy-page .hp-ex .hp-bad{color:#9A3030;text-decoration:line-through;text-decoration-color:rgba(229,72,77,.5);font-weight:500}
.hoy-page .hp-ex .hp-good{color:var(--hp-green-700);font-weight:600}
.hoy-page .hp-ex .hp-arr{color:var(--hp-fg-4);font-weight:700}
.hoy-page .hp-ex .hp-ctx{grid-column:1/-1;font-size:11px;color:var(--hp-fg-3);font-style:italic;padding-top:2px;border-top:1px dashed #EEE0B0;margin-top:4px}
.hoy-page .hp-rescue-aside{display:flex;flex-direction:column;justify-content:space-between;background:#fff;border:1px solid #F1E6BB;border-radius:10px;padding:14px;gap:12px}
.hoy-page .hp-freq{display:flex;align-items:flex-end;gap:6px;height:60px}
.hoy-page .hp-freq i{flex:1;background:var(--hp-amber);border-radius:4px;opacity:.85}
.hoy-page .hp-freq-x{display:flex;justify-content:space-between;font-size:10px;color:var(--hp-fg-4);margin-top:6px;letter-spacing:.04em}
.hoy-page .hp-rescue-cta{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
.hoy-page .hp-btn-amber{background:#0D1412;color:#fff;height:38px;padding:0 14px;border-radius:10px;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:8px;border:0}
.hoy-page .hp-btn-amber:hover{background:#000}
.hoy-page .hp-btn-ghost-dark{background:transparent;color:#6A4F00;height:38px;padding:0 8px;font-weight:600;font-size:13px;border:0}

/* SESSIONS */
.hoy-page .hp-sessions{display:flex;flex-direction:column}
.hoy-page .hp-sess{display:grid;grid-template-columns:48px 1fr 130px 110px 24px;align-items:center;gap:14px;padding:14px 4px;border-bottom:1px solid var(--hp-border-1)}
.hoy-page .hp-sess:last-child{border-bottom:0}
.hoy-page .hp-sess-date{font-family:var(--hp-font-display);font-weight:600;font-size:12px;color:var(--hp-fg-3);text-align:center;line-height:1.2}
.hoy-page .hp-sess-date b{display:block;font-size:18px;color:var(--hp-fg-1);font-weight:700;letter-spacing:-0.01em}
.hoy-page .hp-sess-body .hp-topic{font-weight:600;font-size:14px;color:var(--hp-fg-1);margin-bottom:3px}
.hoy-page .hp-sess-body .hp-topic .hp-tutor{display:inline-block;font-size:10.5px;color:var(--hp-fg-3);font-weight:500;background:var(--hp-bg-2);padding:2px 7px;border-radius:99px;margin-left:6px;vertical-align:middle}
.hoy-page .hp-sess-body .hp-topic .hp-tutor.sincerist{background:#FFF1CF;color:#7A5800}
.hoy-page .hp-sess-body .hp-meta{font-size:12px;color:var(--hp-fg-3);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.hoy-page .hp-sess-body .hp-meta .hp-ok{color:var(--hp-green-700);font-weight:600}
.hoy-page .hp-sess-body .hp-meta .hp-err{color:#B53337;font-weight:600}
.hoy-page .hp-fluency{display:flex;flex-direction:column;gap:4px;align-items:flex-end}
.hoy-page .hp-fluency .hp-fl-label{font-size:10.5px;color:var(--hp-fg-3);font-weight:500;text-transform:uppercase;letter-spacing:.08em}
.hoy-page .hp-fluency .hp-fl-num{font-family:var(--hp-font-display);font-size:15px;font-weight:700;color:var(--hp-fg-1)}
.hoy-page .hp-fluency .hp-fl-num .hp-delta{font-size:11px;color:var(--hp-green-700);font-weight:600;margin-left:4px}
.hoy-page .hp-fluency .hp-fl-num .hp-delta.down{color:#B53337}
.hoy-page .hp-dur{font-family:var(--hp-font-display);font-weight:600;font-size:13px;color:var(--hp-fg-1);text-align:right}
.hoy-page .hp-dur small{display:block;font-family:var(--hp-font-sans);font-weight:500;font-size:11px;color:var(--hp-fg-3);text-transform:uppercase;letter-spacing:.08em}
.hoy-page .hp-sess-go{color:var(--hp-fg-4)}
.hoy-page .hp-sess.active{background:linear-gradient(90deg,rgba(0,179,126,.06),transparent);border-radius:10px;border-bottom:0;padding-left:10px;padding-right:10px;margin:0 -10px}
.hoy-page .hp-sess.active .hp-sess-go{color:var(--hp-green-700)}
.hoy-page .hp-live-dot{width:7px;height:7px;border-radius:50%;background:var(--hp-green);box-shadow:0 0 0 3px rgba(0,179,126,.2);animation:hp-pulse 1.8s ease-out infinite}

/* RIGHT COLUMN */
.hoy-page .hp-rc{display:flex;flex-direction:column;gap:20px}

.hoy-page .hp-streak-card .hp-big{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
.hoy-page .hp-streak-card .hp-big .hp-n{font-family:var(--hp-font-display);font-weight:800;font-size:46px;letter-spacing:-0.03em;line-height:1;color:var(--hp-fg-1)}
.hoy-page .hp-streak-card .hp-big .hp-u{font-family:var(--hp-font-display);font-weight:600;color:var(--hp-fg-3);font-size:14px}
.hoy-page .hp-streak-card .hp-sub-text{color:var(--hp-fg-3);font-size:12.5px;margin-bottom:14px}
.hoy-page .hp-streak-card .hp-sub-text b{color:var(--hp-amber);font-weight:700;background:#FFF7DD;padding:1px 6px;border-radius:6px}
.hoy-page .hp-heatmap{display:grid;grid-template-columns:repeat(14,1fr);gap:5px}
.hoy-page .hp-heatmap i{aspect-ratio:1;border-radius:4px;background:var(--hp-bg-2);position:relative}
.hoy-page .hp-heatmap i.lvl1{background:#CFEFE1}
.hoy-page .hp-heatmap i.lvl2{background:#7CE7BD}
.hoy-page .hp-heatmap i.lvl3{background:#1FC18E}
.hoy-page .hp-heatmap i.lvl4{background:var(--hp-green-700)}
.hoy-page .hp-heatmap i.today{outline:2px solid var(--hp-fg-1);outline-offset:1.5px}
.hoy-page .hp-heatmap i.miss{background:#fff;border:1px solid var(--hp-border-2)}
.hoy-page .hp-heat-legend{display:flex;justify-content:space-between;font-size:10.5px;color:var(--hp-fg-4);margin-top:10px;letter-spacing:.04em;align-items:center}
.hoy-page .hp-heat-legend .hp-scale{display:flex;align-items:center;gap:5px}
.hoy-page .hp-heat-legend .hp-scale i{width:11px;height:11px;border-radius:3px}

.hoy-page .hp-level-card .hp-lhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.hoy-page .hp-level-card .hp-ladder{display:flex;align-items:center;gap:6px;font-family:var(--hp-font-display);font-weight:700;font-size:12.5px;letter-spacing:.02em;color:var(--hp-fg-3)}
.hoy-page .hp-level-card .hp-ladder b{background:#E6F7F0;padding:3px 9px;border-radius:99px;color:var(--hp-green-700)}
.hoy-page .hp-level-card .hp-ladder .hp-next{color:var(--hp-fg-4)}
.hoy-page .hp-arrow{color:var(--hp-fg-4)}
.hoy-page .hp-gauge{position:relative;height:10px;background:var(--hp-bg-2);border-radius:99px;overflow:hidden}
.hoy-page .hp-gauge i{display:block;height:100%;background:linear-gradient(90deg,var(--hp-green),#5EE0B0);border-radius:99px}
.hoy-page .hp-lstats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
.hoy-page .hp-lstats .hp-li{display:flex;flex-direction:column}
.hoy-page .hp-lstats .hp-li .hp-v{font-family:var(--hp-font-display);font-weight:700;font-size:18px;color:var(--hp-fg-1);letter-spacing:-0.01em}
.hoy-page .hp-lstats .hp-li .hp-v.green{color:var(--hp-green-700)}
.hoy-page .hp-lstats .hp-li .hp-k{font-size:11px;color:var(--hp-fg-3);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-top:2px}

.hoy-page .hp-tags{display:flex;flex-wrap:wrap;gap:6px}
.hoy-page .hp-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:var(--hp-r-pill);font-size:12px;font-weight:500;background:var(--hp-bg-2);color:var(--hp-fg-2);border:1px solid var(--hp-border-1)}
.hoy-page .hp-tag.hot{background:#E6F7F0;color:var(--hp-green-700);border-color:rgba(0,179,126,.2)}
.hoy-page .hp-tag.hot::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--hp-green)}
.hoy-page .hp-tag.cat{background:transparent;border-color:var(--hp-border-2);color:var(--hp-fg-3);text-transform:uppercase;letter-spacing:.1em;font-size:10.5px;font-weight:700;padding:5px 10px}
.hoy-page .hp-tag-add{background:transparent;border:1px dashed var(--hp-border-2);color:var(--hp-fg-3);cursor:pointer}
.hoy-page .hp-tag-add:hover{color:var(--hp-fg-1);border-color:var(--hp-fg-3)}

.hoy-page .hp-tutor-card{background:linear-gradient(180deg,#0D1412,#1B2624);color:#fff;border:0}
.hoy-page .hp-tutor-card .hp-card-head h3{color:#fff}
.hoy-page .hp-tutor-card .hp-card-head .hp-link{color:#7CE7BD}
.hoy-page .hp-tutor-row{display:flex;align-items:center;gap:14px}
.hoy-page .hp-tutor-av{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#FFB800,#FF6A3D);display:grid;place-items:center;color:#1B0E00;font-family:var(--hp-font-display);font-weight:800;font-size:22px;flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.hoy-page .hp-tutor-row .hp-tinf{min-width:0}
.hoy-page .hp-tutor-row .hp-tname{font-family:var(--hp-font-display);font-weight:700;font-size:16px;color:#fff;letter-spacing:-0.01em}
.hoy-page .hp-tutor-row .hp-tdesc{font-size:12px;color:#9DA8A4;margin-top:2px}
.hoy-page .hp-tutor-meters{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.hoy-page .hp-meter{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px}
.hoy-page .hp-meter .hp-mlabel{font-size:10.5px;color:#7A8480;text-transform:uppercase;letter-spacing:.1em;font-weight:600}
.hoy-page .hp-meter .hp-mval{font-family:var(--hp-font-display);font-weight:700;font-size:13px;color:#fff;margin-top:6px;letter-spacing:.01em}
.hoy-page .hp-meter .hp-bar{height:4px;border-radius:99px;background:rgba(255,255,255,.08);margin-top:8px;overflow:hidden}
.hoy-page .hp-meter .hp-bar i{display:block;height:100%;border-radius:99px}
.hoy-page .hp-tutor-tags{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.hoy-page .hp-tutor-tag{font-size:11px;background:rgba(255,255,255,.08);color:#B7BFBB;padding:4px 9px;border-radius:99px}
.hoy-page .hp-tutor-tag.amber{background:rgba(255,184,0,.16);color:#FFE9A6}

/* ───── MOBILE ───── */
@media (max-width: 880px){
  .hoy-page{padding:4px 14px 100px}

  /* Greeting compacto, sin redundancia */
  .hoy-page .hp-greet{padding:2px 0 14px}
  .hoy-page .hp-eyebrow{font-size:10px}
  .hoy-page h1.hp-title{font-size:22px;line-height:1.15;margin:4px 0 4px;font-weight:700}
  .hoy-page .hp-sub{display:none}  /* en mobile, redundante con el hero abajo */

  .hoy-page .hp-grid{grid-template-columns:1fr;gap:14px}

  /* HERO mobile - editorial, no postal */
  .hoy-page .hp-hero{
    display:flex;flex-direction:column;grid-template-columns:none;
    min-height:auto;height:auto;position:relative;
    border-radius:24px;
    background:linear-gradient(165deg,#00B37E 0%,#008F63 45%,#054A3A 100%);
  }
  .hoy-page .hp-hero::before{
    background:
      radial-gradient(600px 280px at 110% -10%, rgba(255,184,0,.16), transparent 55%),
      radial-gradient(500px 240px at -10% 110%, rgba(255,255,255,.08), transparent 55%);
  }
  .hoy-page .hp-hero-l{position:relative;z-index:2;padding:22px 20px 18px;gap:10px;width:100%}
  .hoy-page .hp-hero-chips{gap:5px}
  .hoy-page .hp-chip{font-size:11px;padding:4px 9px}
  .hoy-page .hp-hero h2{
    font-size:30px;line-height:1.05;margin:8px 0 2px;
    word-wrap:break-word;overflow-wrap:break-word;
    letter-spacing:-0.028em;font-weight:800;
  }
  .hoy-page .hp-hero h2 small{display:none}  /* redundante con foco abajo */
  .hoy-page .hp-hero-meta{
    font-size:11px;gap:10px;color:rgba(255,255,255,.85);
    padding:10px 12px;background:rgba(0,0,0,.18);border-radius:12px;
    margin-top:4px;flex-wrap:wrap;
  }
  .hoy-page .hp-hero-r{
    position:relative;z-index:2;border-left:0;
    border-top:1px solid rgba(255,255,255,.10);
    padding:16px 20px 20px;width:100%;
    background:linear-gradient(180deg,rgba(0,0,0,.0),rgba(0,0,0,.25));
  }
  .hoy-page .hp-hero-r .hp-label{font-size:10px;margin-bottom:8px}
  .hoy-page .hp-hero .waveform,.hoy-page .hp-hero svg.waveform{display:none !important}

  /* CTAs - primary alto + ghost compacto */
  .hoy-page .hp-hero-cta{flex-direction:column;width:100%;gap:8px;margin-top:8px}
  .hoy-page .hp-hero-cta .hp-btn{width:100%;justify-content:center}
  .hoy-page .hp-btn-primary{
    height:54px;font-size:16px;font-weight:700;
    background:#fff;color:#054A3A;
    box-shadow:0 8px 24px rgba(0,0,0,.18);
    letter-spacing:-0.01em;
  }
  .hoy-page .hp-btn-primary:active{transform:scale(.98)}
  .hoy-page .hp-btn-ghost{
    height:40px;font-size:13px;font-weight:500;
    background:transparent;border:0;
    color:rgba(255,255,255,.7);text-decoration:underline;
    text-underline-offset:3px;
  }
  .hoy-page .hp-btn-ghost:hover,
  .hoy-page .hp-btn-ghost:active{background:transparent;color:#fff}

  /* Cards de desafios mas legibles sobre el verde */
  .hoy-page .hp-prompt{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.16)}
  .hoy-page .hp-prompt .hp-pt{font-size:13px}
  .hoy-page .hp-prompt .hp-pt b{background:rgba(255,255,255,.18)}

  .hoy-page .hp-rescue h3{font-size:18px}
  .hoy-page .hp-rescue-body{grid-template-columns:1fr;gap:10px}

  /* Sessions row compacto */
  .hoy-page .hp-sess{grid-template-columns:42px 1fr 70px;gap:8px;padding:12px 4px}
  .hoy-page .hp-sess .hp-dur,
  .hoy-page .hp-sess .hp-sess-go{display:none}
  .hoy-page .hp-sess-body .hp-meta{flex-wrap:wrap;gap:6px;font-size:11px}
  .hoy-page .hp-fluency{align-items:flex-end}
  .hoy-page .hp-fluency .hp-fl-num{font-size:13px}

  .hoy-page .hp-card{padding:14px;border-radius:16px}
  .hoy-page .hp-streak-card .hp-big .hp-n{font-size:38px}
  .hoy-page .hp-heatmap{grid-template-columns:repeat(14,1fr);gap:3px}
  .hoy-page .hp-tutor-meters{grid-template-columns:1fr}
}
`
