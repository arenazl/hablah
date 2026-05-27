export const MAPA_CSS = `
[data-theme="dark"] .mapa-page,
[data-theme="dark"] .webapp-root .mapa-page {
  --mp-bg-1:#050807;
  --mp-bg-2:#0A0F0D;
  --mp-bg-3:#111815;
  --mp-surface:#0A100E;
  --mp-border-1:rgba(232,236,234,.07);
  --mp-border-2:rgba(232,236,234,.12);
  --mp-border-3:rgba(232,236,234,.22);
  --mp-fg-1:#E8ECEA;
  --mp-fg-2:#B6BDB9;
  --mp-fg-3:#8E938F;
  --mp-fg-4:#5A625F;
}
.mapa-page{
  --mp-green:#00B37E;
  --mp-green-700:#008F63;
  --mp-amber:#FFB800;
  --mp-bg-1:#FAFBFA;
  --mp-bg-2:#F1F4F1;
  --mp-bg-3:#EAEDE8;
  --mp-surface:#FFFFFF;
  --mp-border-1:rgba(13,20,18,.06);
  --mp-border-2:rgba(13,20,18,.10);
  --mp-border-3:rgba(13,20,18,.16);
  --mp-fg-1:#0D1412;
  --mp-fg-2:#3A4441;
  --mp-fg-3:#6B7672;
  --mp-fg-4:#98A19D;
  --mp-r-card:14px;
  --mp-font-sans:'Inter',ui-sans-serif,system-ui,sans-serif;
  --mp-font-display:'Sora',var(--mp-font-sans);
  --mp-ease:cubic-bezier(.2,.8,.2,1);

  padding: 8px 32px 56px;
  max-width:1440px;
  background:var(--mp-bg-1);
  color:var(--mp-fg-1);
  font-family:var(--mp-font-sans);
  font-size:14px;
  line-height:1.5;
}
.mapa-page *{box-sizing:border-box}
.mapa-page button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit}
.mapa-page a{color:inherit;text-decoration:none}

@keyframes mp-pulse-amber{0%{box-shadow:0 0 0 0 rgba(255,184,0,.4)}80%{box-shadow:0 0 0 10px rgba(255,184,0,0)}100%{box-shadow:0 0 0 0 rgba(255,184,0,0)}}
@keyframes mp-ringp{0%{transform:scale(.95);opacity:1}100%{transform:scale(1.5);opacity:0}}

.mapa-page .mp-greet{padding:6px 0 18px}
.mapa-page .mp-eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mp-green);font-weight:700}
.mapa-page h1.mp-title{font-family:var(--mp-font-display);font-weight:700;letter-spacing:-0.02em;font-size:34px;line-height:1.05;margin:6px 0 6px;color:var(--mp-fg-1);max-width:820px}
.mapa-page .mp-title em{font-style:normal;color:var(--mp-green-700);background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.18) 64% 96%,transparent 96%);padding:0 2px}
.mapa-page .mp-sub{color:var(--mp-fg-2);font-size:14.5px;max-width:760px;margin:0}
.mapa-page .mp-sub b{color:var(--mp-fg-1);font-weight:600}

/* STATS STRIP */
.mapa-page .mp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.mapa-page .mp-mst{background:var(--mp-surface);border:1px solid var(--mp-border-1);border-radius:14px;padding:14px 16px;position:relative;overflow:hidden}
.mapa-page .mp-mst .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--mp-fg-3);font-weight:700}
.mapa-page .mp-mst .v{font-family:var(--mp-font-display);font-weight:800;font-size:30px;letter-spacing:-0.025em;color:var(--mp-fg-1);margin-top:4px;line-height:1;font-feature-settings:"tnum"}
.mapa-page .mp-mst .v small{font-family:var(--mp-font-display);font-weight:600;font-size:13px;color:var(--mp-green-700);margin-left:5px;letter-spacing:0}
.mapa-page .mp-mst .v small.cold{color:var(--mp-fg-4)}
.mapa-page .mp-mst .h{font-size:11.5px;color:var(--mp-fg-3);margin-top:6px}
.mapa-page .mp-mst.green{background:linear-gradient(160deg,#062B25,#054A3A);color:#fff;border-color:transparent}
.mapa-page .mp-mst.green .k{color:#7CE7BD}
.mapa-page .mp-mst.green .v{color:#fff}
.mapa-page .mp-mst.green .v small{color:#5EE0B0}
.mapa-page .mp-mst.green .h{color:rgba(255,255,255,.55)}
.mapa-page .mp-mst.green::after{content:"";position:absolute;right:-40px;bottom:-40px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(0,179,126,.25),transparent 70%)}

/* RESCUE STRIP */
.mapa-page .mp-rescue-strip{background:linear-gradient(180deg,#FFFDF4,#FFF4D8);border:1px solid #F4E1A4;border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap}
.mapa-page .mp-rescue-strip .ri{width:38px;height:38px;border-radius:11px;background:var(--mp-amber);color:#3A2A00;display:grid;place-items:center;flex-shrink:0;animation:mp-pulse-amber 2s ease-out infinite}
.mapa-page .mp-rescue-strip .rt{flex:1;min-width:240px}
.mapa-page .mp-rescue-strip .rt .eye{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#8A6A00;margin-bottom:2px}
.mapa-page .mp-rescue-strip .rt h4{font-family:var(--mp-font-display);font-weight:700;font-size:16px;margin:0;color:#3A2A00;letter-spacing:-0.01em}
.mapa-page .mp-rescue-strip .rt p{margin:2px 0 0;font-size:12.5px;color:#6A4F00}
.mapa-page .mp-rescue-strip .rt b{font-weight:600}
.mapa-page .mp-btn-dark{background:#0D1412;color:#fff;border:0;height:34px;padding:0 14px;border-radius:8px;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.mapa-page .mp-btn-dark:hover{background:#000}
.mapa-page .mp-btn-primary{background:var(--mp-green);color:#fff;border:0;height:30px;padding:0 12px;border-radius:8px;font-weight:600;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.mapa-page .mp-btn-primary:hover{background:var(--mp-green-700)}

/* SECTION HEADS */
.mapa-page .mp-sh{display:flex;align-items:baseline;justify-content:space-between;margin:8px 0 14px}
.mapa-page .mp-sh h2{font-family:var(--mp-font-display);font-weight:700;font-size:22px;letter-spacing:-0.02em;margin:0}
.mapa-page .mp-sh .meta{font-size:12.5px;color:var(--mp-fg-3)}

/* MAP GRID */
.mapa-page .mp-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px}
@media (max-width:1180px){.mapa-page .mp-grid{grid-template-columns:1fr}.mapa-page .mp-stats{grid-template-columns:repeat(2,1fr)}}

/* ROUTES */
.mapa-page .mp-routes{display:flex;flex-direction:column;gap:14px}
.mapa-page .mp-route{background:var(--mp-surface);border:1px solid var(--mp-border-1);border-radius:16px;padding:18px 20px;position:relative}
.mapa-page .mp-route.active{border-color:rgba(0,179,126,.35);box-shadow:0 0 0 4px rgba(0,179,126,.06)}
.mapa-page .mp-route.locked{opacity:.7;background:repeating-linear-gradient(135deg,#FAFBFA,#FAFBFA 6px,#F1F4F1 6px,#F1F4F1 12px)}
.mapa-page .mp-route.locked .node{filter:grayscale(.4)}

.mapa-page .mp-route-head{display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap}
.mapa-page .mp-route-ico{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.mapa-page .mp-route-ico svg{width:22px;height:22px;stroke-width:2.2}
.mapa-page .mp-route-head .rinfo{flex:1;min-width:160px}
.mapa-page .mp-route-head .rcat{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;line-height:1}
.mapa-page .mp-route-head h3{font-family:var(--mp-font-display);font-weight:700;font-size:18px;letter-spacing:-0.01em;margin:4px 0 0;color:var(--mp-fg-1)}
.mapa-page .mp-route-head .rprog{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
.mapa-page .mp-route-head .rprog .p-num{font-family:var(--mp-font-display);font-weight:700;font-size:14px;letter-spacing:.02em;color:var(--mp-fg-2);font-feature-settings:"tnum"}
.mapa-page .mp-route-head .rprog .p-num b{font-size:20px;color:var(--mp-fg-1);letter-spacing:-0.01em}
.mapa-page .mp-route-head .rprog .p-bar{width:120px;height:5px;border-radius:99px;background:var(--mp-bg-2);overflow:hidden}
.mapa-page .mp-route-head .rprog .p-bar i{display:block;height:100%;background:var(--mp-green);border-radius:99px}

/* TRACK */
.mapa-page .mp-track{position:relative;display:grid;gap:0;align-items:start;padding:6px 0 0}
.mapa-page .mp-track-line{position:absolute;top:18px;left:5%;right:5%;height:2px;background:repeating-linear-gradient(90deg,var(--mp-border-3) 0 6px,transparent 6px 12px);z-index:0}
.mapa-page .mp-track-line .progress{position:absolute;left:0;top:0;bottom:0;background:var(--mp-green);border-radius:99px;height:2px}
.mapa-page .node{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:0 4px;cursor:pointer}
.mapa-page .node .dot{width:38px;height:38px;border-radius:50%;background:#fff;border:2px solid var(--mp-border-3);display:grid;place-items:center;color:var(--mp-fg-4);transition:all .18s var(--mp-ease)}
.mapa-page .node .dot svg{width:16px;height:16px;stroke-width:2.4}
.mapa-page .node.done .dot{background:var(--mp-green);border-color:var(--mp-green);color:#fff}
.mapa-page .node.current .dot{background:#fff;border-color:var(--mp-green);color:var(--mp-green);box-shadow:0 0 0 4px rgba(0,179,126,.18);position:relative}
.mapa-page .node.current .dot::before{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid rgba(0,179,126,.5);animation:mp-ringp 2s var(--mp-ease) infinite}
.mapa-page .node.locked .dot{background:var(--mp-bg-2);border-color:var(--mp-border-2);color:var(--mp-fg-4)}
.mapa-page .node.rescue .dot{background:#FFF7DD;border-color:var(--mp-amber);color:#8A6A00;box-shadow:0 0 0 4px rgba(255,184,0,.18)}
.mapa-page .node .nlabel{font-size:11.5px;font-weight:600;color:var(--mp-fg-2);line-height:1.3;max-width:120px}
.mapa-page .node.locked .nlabel{color:var(--mp-fg-4);font-weight:500}
.mapa-page .node.current .nlabel{color:var(--mp-fg-1)}
.mapa-page .node .nsub{font-size:10.5px;color:var(--mp-fg-4);font-weight:500;margin-top:-2px}
.mapa-page .node.current .nsub{color:var(--mp-green-700);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.mapa-page .node.rescue .nsub{color:#8A6A00;font-weight:700;text-transform:uppercase;letter-spacing:.06em}

.mapa-page .mp-route-foot{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding-top:14px;border-top:1px dashed var(--mp-border-2);gap:10px;flex-wrap:wrap}
.mapa-page .mp-route-foot .meta{display:flex;gap:14px;font-size:12px;color:var(--mp-fg-3);flex-wrap:wrap}
.mapa-page .mp-route-foot .meta b{color:var(--mp-fg-2);font-weight:600}

/* category colors */
.mapa-page .cat-tec{background:#EEF2FF;color:#4338CA}
.mapa-page .cat-arte{background:#F3E8FF;color:#7C3AED}
.mapa-page .cat-life{background:#FCE7F3;color:#BE185D}
.mapa-page .cat-dep{background:#FFEDD5;color:#C2410C}
.mapa-page .cat-cien{background:#CFFAFE;color:#0E7490}
.mapa-page .cat-via{background:#DBEAFE;color:#1D4ED8}
.mapa-page .cat-gas{background:#FFE4E6;color:#BE123C}
.mapa-page .cat-gen{background:var(--mp-bg-2);color:var(--mp-fg-2)}
.mapa-page .rcat.tec{color:#4338CA}
.mapa-page .rcat.arte{color:#7C3AED}
.mapa-page .rcat.life{color:#BE185D}
.mapa-page .rcat.dep{color:#C2410C}
.mapa-page .rcat.cien{color:#0E7490}
.mapa-page .rcat.via{color:#1D4ED8}
.mapa-page .rcat.gas{color:#BE123C}
.mapa-page .rcat.gen{color:var(--mp-fg-3)}

/* Cards generic */
.mapa-page .mp-card{background:var(--mp-surface);border:1px solid var(--mp-border-1);border-radius:var(--mp-r-card);padding:18px}
.mapa-page .mp-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.mapa-page .mp-card-head h3{font-family:var(--mp-font-display);font-weight:700;font-size:15px;letter-spacing:-0.01em;margin:0}
.mapa-page .mp-card-head .h-meta{font-size:12px;color:var(--mp-fg-3)}

/* RIGHT */
.mapa-page .mp-rc{display:flex;flex-direction:column;gap:18px;position:sticky;top:80px;align-self:start}
.mapa-page .mp-legend-card .row{display:flex;align-items:center;gap:10px;font-size:13px;padding:8px 0;border-bottom:1px dashed var(--mp-border-1)}
.mapa-page .mp-legend-card .row:last-child{border-bottom:0}
.mapa-page .mp-legend-card .leg-dot{width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid var(--mp-border-3);display:grid;place-items:center;flex-shrink:0}
.mapa-page .mp-legend-card .leg-dot.done{background:var(--mp-green);border-color:var(--mp-green);color:#fff}
.mapa-page .mp-legend-card .leg-dot.current{border-color:var(--mp-green);color:var(--mp-green);box-shadow:0 0 0 3px rgba(0,179,126,.18)}
.mapa-page .mp-legend-card .leg-dot.rescue{background:#FFF7DD;border-color:var(--mp-amber);color:#8A6A00}
.mapa-page .mp-legend-card .leg-dot.locked{background:var(--mp-bg-2);color:var(--mp-fg-4)}
.mapa-page .mp-legend-card .row svg{width:11px;height:11px}
.mapa-page .mp-legend-card .row .label{font-weight:600;color:var(--mp-fg-1);font-size:13px}
.mapa-page .mp-legend-card .row .desc{font-size:11.5px;color:var(--mp-fg-3)}

/* Achievements */
.mapa-page .mp-ach-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px}
.mapa-page .ach{aspect-ratio:1;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;text-align:center;background:var(--mp-bg-2);border:1px solid var(--mp-border-1);position:relative}
.mapa-page .ach .ai{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--mp-bg-3);color:var(--mp-fg-3)}
.mapa-page .ach .ai svg{width:18px;height:18px}
.mapa-page .ach .at{font-family:var(--mp-font-display);font-weight:700;font-size:10.5px;line-height:1.2;color:var(--mp-fg-2);max-width:90%}
.mapa-page .ach.unlocked{background:linear-gradient(160deg,#E6F7F0,#C9EEDC);border-color:rgba(0,179,126,.2)}
.mapa-page .ach.unlocked .ai{background:var(--mp-green);color:#fff}
.mapa-page .ach.unlocked .at{color:#06321F}
.mapa-page .ach.amber{background:linear-gradient(160deg,#FFF7DD,#FFE9A6);border-color:rgba(255,184,0,.3)}
.mapa-page .ach.amber .ai{background:var(--mp-amber);color:#3A2A00}
.mapa-page .ach.amber .at{color:#3A2A00}
.mapa-page .ach.locked{opacity:.6}
.mapa-page .ach.locked .ai{background:var(--mp-bg-3);color:var(--mp-fg-4)}
[data-theme="dark"] .mapa-page .ach.unlocked{background:linear-gradient(160deg,#062B25,#0A4A37);border-color:rgba(0,179,126,.28)}
[data-theme="dark"] .mapa-page .ach.unlocked .at{color:#7CE7BD}
[data-theme="dark"] .mapa-page .ach.amber{background:linear-gradient(160deg,#2A1F00,#3D2C00);border-color:rgba(255,184,0,.32)}
[data-theme="dark"] .mapa-page .ach.amber .at{color:#FFD86B}

/* Next routes grid */
.mapa-page .mp-next-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media (max-width:900px){.mapa-page .mp-next-grid{grid-template-columns:1fr}}
.mapa-page .mp-next-rt{background:var(--mp-bg-2);border:1px dashed var(--mp-border-3);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
.mapa-page .mp-next-rt .nri{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#fff;color:var(--mp-fg-3);flex-shrink:0;border:1px solid var(--mp-border-2)}
.mapa-page .mp-next-rt .body{flex:1;min-width:0}
.mapa-page .mp-next-rt .eye{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--mp-fg-3)}
.mapa-page .mp-next-rt h4{font-family:var(--mp-font-display);font-weight:700;font-size:14px;margin:2px 0 0;letter-spacing:-0.005em}
.mapa-page .mp-next-rt .gauge-mini{height:4px;border-radius:99px;background:var(--mp-bg-3);overflow:hidden;margin-top:8px}
.mapa-page .mp-next-rt .gauge-mini i{display:block;height:100%;background:var(--mp-green);border-radius:99px}

/* ───── MOBILE ───── */
@media (max-width: 880px){
  .mapa-page{padding:8px 16px 96px}
  .mapa-page h1.mp-title{font-size:22px}
  .mapa-page .mp-sub{font-size:13px}
  .mapa-page .mp-stats{grid-template-columns:repeat(2,1fr);gap:10px}
  .mapa-page .mp-mst{padding:12px 14px}
  .mapa-page .mp-mst .v{font-size:24px}
  .mapa-page .mp-mst .h{font-size:10.5px}
  .mapa-page .mp-rescue-strip{padding:12px 14px}
  .mapa-page .mp-rescue-strip .rt h4{font-size:14px}
  .mapa-page .mp-rescue-strip .rt p{font-size:11.5px}
  .mapa-page .mp-grid{grid-template-columns:1fr;gap:14px}
  .mapa-page .mp-rc{position:static;top:auto}
  .mapa-page .mp-route{padding:14px 14px}
  .mapa-page .mp-route-head h3{font-size:15px}
  .mapa-page .mp-route-head .rprog .p-bar{width:80px}
  .mapa-page .mp-track{overflow-x:auto;padding-bottom:6px}
  .mapa-page .mp-track .node{min-width:84px}
  .mapa-page .mp-track-line{left:50px;right:30px}
  .mapa-page .mp-route-foot .meta{font-size:11px;gap:8px}
  .mapa-page .mp-next-grid{grid-template-columns:1fr;gap:8px}
  .mapa-page .mp-sh h2{font-size:18px}
  .mapa-page .mp-ach-grid{grid-template-columns:repeat(3,1fr);gap:8px}
  .mapa-page .ach{padding:8px}
  .mapa-page .ach .at{font-size:9.5px}
}
`
