export const PRACTICAR_CSS = `
.practicar-page{
  --pp-green:#00B37E;
  --pp-green-700:#008F63;
  --pp-amber:#FFB800;
  --pp-bg-2:#F1F4F1;
  --pp-surface:#FFFFFF;
  --pp-border-1:rgba(13,20,18,.06);
  --pp-border-2:rgba(13,20,18,.10);
  --pp-border-3:rgba(13,20,18,.16);
  --pp-fg-1:#0D1412;
  --pp-fg-3:#6B7672;
  --pp-fg-4:#98A19D;
  --pp-shadow-card:0 1px 2px rgba(13,20,18,.04), 0 2px 6px rgba(13,20,18,.04);
  --pp-font-display:'Sora','Inter',ui-sans-serif,system-ui,sans-serif;
}

[data-theme="dark"] .practicar-page,
[data-theme="dark"] .webapp-root .practicar-page{
  --pp-bg-2:#1B2421;
  --pp-surface:#161E1B;
  --pp-border-1:rgba(232,236,234,.08);
  --pp-border-2:rgba(232,236,234,.14);
  --pp-border-3:rgba(232,236,234,.22);
  --pp-fg-1:#E8ECEA;
  --pp-fg-3:#B6BDB9;
  --pp-fg-4:#8E938F;
  --pp-shadow-card:0 1px 2px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.3);
}
[data-theme="dark"] .practicar-page .pp-qc input,
[data-theme="dark"] .practicar-page .pp-free-input input{
  background:var(--pp-bg-2);color:var(--pp-fg-1);border-color:var(--pp-border-2);
}

/* ───── QUICK START STRIP ───── */
.practicar-page .pp-quick{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px;margin-bottom:24px}
@media (max-width:880px){.practicar-page .pp-quick{grid-template-columns:1fr;gap:10px}}

.practicar-page .pp-qc{position:relative;background:var(--pp-surface);border:1px solid var(--pp-border-1);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px;min-height:140px;transition:transform .18s,box-shadow .18s,border-color .18s;cursor:pointer;text-align:left;font-family:inherit;color:inherit;width:100%}
.practicar-page .pp-qc:hover{border-color:var(--pp-border-3);transform:translateY(-1px);box-shadow:var(--pp-shadow-card)}
.practicar-page .pp-qc .pp-qe{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--pp-fg-3);font-weight:700;display:flex;align-items:center;gap:8px}
.practicar-page .pp-qc h3{font-family:var(--pp-font-display);font-weight:700;font-size:18px;letter-spacing:-0.015em;margin:0;color:var(--pp-fg-1);line-height:1.2}
.practicar-page .pp-qc p{margin:0;font-size:13px;color:var(--pp-fg-3);line-height:1.4}

/* featured (recomendado) */
.practicar-page .pp-qc.featured{background:linear-gradient(160deg,#062B25 0%,#054A3A 50%,#00845C 100%);color:#fff;border-color:transparent;overflow:hidden}
.practicar-page .pp-qc.featured::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.08),transparent 70%);pointer-events:none}
.practicar-page .pp-qc.featured .pp-qe{color:#7CE7BD}
.practicar-page .pp-qc.featured h3{color:#fff;font-size:22px}
.practicar-page .pp-qc.featured p{color:rgba(255,255,255,.7)}
.practicar-page .pp-qc.featured .pp-meta-row{display:flex;align-items:center;gap:14px;font-size:12px;color:rgba(255,255,255,.65);margin-top:4px;flex-wrap:wrap}
.practicar-page .pp-qc.featured .pp-meta-row b{color:#fff;font-weight:600}
.practicar-page .pp-qc.featured .pp-dot-sep{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.4)}
.practicar-page .pp-live-dot{width:8px;height:8px;border-radius:50%;background:#7CE7BD;box-shadow:0 0 0 3px rgba(124,231,189,.25);animation:pp-pulse 1.8s ease-out infinite}
@keyframes pp-pulse{0%{box-shadow:0 0 0 0 rgba(124,231,189,.45)}80%{box-shadow:0 0 0 10px rgba(124,231,189,0)}100%{box-shadow:0 0 0 0 rgba(124,231,189,0)}}

/* surprise (sorprendeme) */
.practicar-page .pp-qc.surprise{background:linear-gradient(140deg,#FFFDF4,#FFF4D8);border-color:rgba(255,184,0,.3)}
.practicar-page .pp-qc.surprise .pp-qe{color:#8A6A00}
.practicar-page .pp-qc.surprise .pp-die{font-family:var(--pp-font-display);font-weight:800;font-size:30px;color:#8A6A00;letter-spacing:-0.02em;line-height:1}

/* free (tema libre) */
.practicar-page .pp-qc.free .pp-qe{color:#3B82F6}
.practicar-page .pp-qc.free .pp-free-input{display:flex;align-items:center;gap:8px;background:var(--pp-bg-2);border-radius:10px;padding:8px 12px;margin-top:auto}
.practicar-page .pp-qc.free input{background:transparent;border:0;outline:0;font-size:13.5px;color:var(--pp-fg-1);flex:1;font-family:inherit;min-width:0}
.practicar-page .pp-qc.free input::placeholder{color:var(--pp-fg-4)}
.practicar-page .pp-qc.free .pp-send{width:30px;height:30px;border-radius:8px;background:var(--pp-fg-1);color:#fff;display:grid;place-items:center;flex-shrink:0;border:0;cursor:pointer}
.practicar-page .pp-qc.free .pp-send:hover{background:#000}

/* ───── PAGE ───── */
.practicar-page{padding:8px 32px 190px;color:var(--pp-fg-1);font-size:14px;line-height:1.5}
.practicar-page *{box-sizing:border-box}
.practicar-page .pp-greet{padding:6px 0 22px;max-width:880px}
.practicar-page .pp-eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--pp-green);font-weight:700}
.practicar-page h1.pp-title{font-family:var(--pp-font-display);font-weight:700;letter-spacing:-0.02em;font-size:40px;line-height:1.05;margin:8px 0 8px;color:var(--pp-fg-1)}
.practicar-page .pp-title em{font-style:normal;color:var(--pp-green-700);background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.18) 64% 96%,transparent 96%);padding:0 2px}
.practicar-page .pp-sub{color:var(--pp-fg-3);font-size:15px;max-width:640px;margin:0}
.practicar-page .pp-sub b{color:var(--pp-fg-1);font-weight:600}
@media (max-width:720px){
  .practicar-page{padding:8px 16px 200px}
  .practicar-page h1.pp-title{font-size:28px}
}

/* ───── COPILOTO ───── */
.practicar-page .pp-copilot{background:linear-gradient(150deg,#F4F9F7,#EAF6F1);border:1px solid rgba(0,179,126,.28);border-radius:16px;padding:16px 18px;margin-bottom:18px}
[data-theme="dark"] .practicar-page .pp-copilot{background:linear-gradient(150deg,#0F1A17,#11201B)}
.practicar-page .pp-cp-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}
.practicar-page .pp-cp-head .pp-av{width:30px;height:30px;border-radius:9px;background:var(--pp-green);color:#fff;display:grid;place-items:center;flex-shrink:0}
.practicar-page .pp-copilot h3{font-family:var(--pp-font-display);font-weight:700;font-size:15px;margin:0;line-height:1.3}
.practicar-page .pp-cp-sub{font-size:12.5px;color:var(--pp-fg-3);margin:3px 0 0;max-width:620px;line-height:1.45}
.practicar-page .pp-cp-input{display:flex;align-items:center;gap:8px;background:var(--pp-surface);border:1px solid var(--pp-border-2);border-radius:11px;padding:8px 10px 8px 12px}
.practicar-page .pp-cp-input input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:13.5px;color:var(--pp-fg-1);min-width:0}
.practicar-page .pp-cp-input button{height:32px;padding:0 14px;border-radius:9px;background:var(--pp-fg-1);color:#fff;font-weight:700;font-size:12.5px;border:0;cursor:pointer;flex-shrink:0}
.practicar-page .pp-cp-moods{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.practicar-page .pp-cp-moods button{height:32px;padding:0 12px;border-radius:99px;background:var(--pp-surface);border:1px solid var(--pp-border-2);font-size:12px;font-weight:600;color:var(--pp-fg-3);cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.practicar-page .pp-cp-moods button svg{width:13px;height:13px}
.practicar-page .pp-cp-moods button:hover{border-color:var(--pp-green);color:var(--pp-green-700)}
.practicar-page .pp-cp-out{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.practicar-page .pp-cp-line{font-size:12.5px;color:var(--pp-fg-3);line-height:1.5}
.practicar-page .pp-cp-line b{color:var(--pp-fg-1)}
.practicar-page .pp-cp-picks{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}
.practicar-page .pp-cp-pick{display:flex;flex-direction:column;align-items:flex-start;gap:6px;background:var(--pp-surface);border:1px solid var(--pp-border-1);border-radius:12px;padding:11px 13px;cursor:pointer;text-align:left;width:100%;font-family:inherit}
.practicar-page .pp-cp-pick:hover{border-color:var(--pp-green)}
.practicar-page .pp-cp-pick .pp-n{width:22px;height:22px;border-radius:7px;background:var(--pp-bg-2);color:var(--pp-fg-3);display:grid;place-items:center;font-family:var(--pp-font-display);font-weight:800;font-size:11px;flex-shrink:0}
.practicar-page .pp-cp-pick .pp-t{font-weight:700;font-size:13.5px;display:block;color:var(--pp-fg-1)}
.practicar-page .pp-cp-pick .pp-w{font-size:12px;color:var(--pp-fg-3);margin-top:2px;display:block;line-height:1.4}
.practicar-page .pp-cp-pick .pp-go2{font-size:12px;font-weight:700;color:var(--pp-green-700);align-self:flex-end;margin-top:auto}
.practicar-page .pp-cp-typing{display:inline-flex;gap:3px;align-items:center}
.practicar-page .pp-cp-typing i{width:5px;height:5px;border-radius:50%;background:var(--pp-green);animation:pp-cpb 1s infinite}
.practicar-page .pp-cp-typing i:nth-child(2){animation-delay:.15s}
.practicar-page .pp-cp-typing i:nth-child(3){animation-delay:.3s}
@keyframes pp-cpb{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}

/* ───── CONTROLES ───── */
.practicar-page .pp-controls{background:var(--pp-surface);border:1px solid var(--pp-border-1);border-radius:14px;padding:12px 14px;margin-bottom:14px;box-shadow:var(--pp-shadow-card)}
.practicar-page .pp-ctrl-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.practicar-page .pp-search{display:flex;align-items:center;gap:8px;border:1px solid var(--pp-border-2);background:var(--pp-surface);height:34px;padding:0 12px;border-radius:10px;color:var(--pp-fg-3);flex:1 1 240px;min-width:180px}
.practicar-page .pp-search input{border:0;outline:0;background:transparent;font-size:16px;color:var(--pp-fg-1);flex:1;min-width:0;font-family:inherit}
.practicar-page .pp-ctrl-lbl{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--pp-fg-4);margin-right:2px}
.practicar-page .pp-quick-f{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}
.practicar-page .pp-qf{height:30px;padding:0 11px;border-radius:99px;border:1px dashed var(--pp-border-3);background:transparent;font-size:12px;font-weight:600;color:var(--pp-fg-3);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit}
.practicar-page .pp-qf:hover{background:var(--pp-bg-2)}
.practicar-page .pp-qf.on{background:#E6F7F0;border-style:solid;border-color:var(--pp-green);color:var(--pp-green-700)}
[data-theme="dark"] .practicar-page .pp-qf.on{background:rgba(0,179,126,.16)}
.practicar-page .pp-qf svg{width:13px;height:13px}
.practicar-page .pp-chips{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;overflow-y:hidden;padding-bottom:4px;scrollbar-width:none;margin-top:10px;align-items:center}
.practicar-page .pp-chips::-webkit-scrollbar{display:none}
.practicar-page .pp-chips.expanded{flex-wrap:wrap;overflow:visible}
.practicar-page .pp-fc{height:34px;padding:0 12px;border-radius:99px;background:transparent;border:1px solid var(--pp-border-2);font-size:12.5px;font-weight:500;color:var(--pp-fg-3);display:inline-flex;align-items:center;gap:7px;cursor:pointer;flex-shrink:0;font-family:inherit}
.practicar-page .pp-fc:hover{background:var(--pp-bg-2)}
.practicar-page .pp-fc.active{background:var(--pp-fg-1);color:#fff;border-color:var(--pp-fg-1)}
.practicar-page .pp-fc .pp-n{font-family:var(--pp-font-display);font-weight:700;color:var(--pp-fg-3);font-size:11px;background:var(--pp-bg-2);padding:1px 6px;border-radius:99px;margin-left:2px}
.practicar-page .pp-fc.active .pp-n{background:rgba(255,255,255,.18);color:#fff}
.practicar-page .pp-fc svg{width:13px;height:13px;flex-shrink:0}
.practicar-page .pp-fc.more{border-style:dashed;font-weight:700}

/* ───── SECTION HEAD ───── */
.practicar-page .pp-section-head{display:flex;align-items:baseline;justify-content:space-between;margin:24px 0 12px;gap:12px;flex-wrap:wrap}
.practicar-page .pp-section-head h2{font-family:var(--pp-font-display);font-weight:700;font-size:16px;letter-spacing:.04em;text-transform:uppercase;margin:0;color:var(--pp-fg-3)}
.practicar-page .pp-section-head .pp-mut{font-size:12px;color:var(--pp-fg-4);font-weight:500}
.practicar-page .pp-section-head .pp-mut a{color:var(--pp-green-700);font-weight:600}

/* ───── GRILLA DE TÓPICOS ───── */
.practicar-page .pp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media (max-width:1280px){.practicar-page .pp-grid{grid-template-columns:repeat(3,1fr)}}
@media (max-width:980px){.practicar-page .pp-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.practicar-page .pp-grid{grid-template-columns:1fr}}

.practicar-page .pp-tc{position:relative;background:var(--pp-surface);border:1px solid var(--pp-border-1);border-radius:14px;padding:0;display:flex;flex-direction:column;height:216px;cursor:pointer;transition:transform .18s,box-shadow .18s,border-color .18s;text-align:left;overflow:hidden;font-family:inherit;color:inherit}
.practicar-page .pp-tc:hover{border-color:var(--pp-border-3);transform:translateY(-1px);box-shadow:var(--pp-shadow-card)}
/* Media: foto de Pexels si el tópico tiene; si no, degradé por categoría */
.practicar-page .pp-tc-media{position:relative;height:78px;flex-shrink:0;overflow:hidden;background-size:cover;background-position:center}
.practicar-page .pp-tc-media .pp-glyph{position:absolute;right:-14px;bottom:-22px;width:104px;height:104px;opacity:.22;transform:rotate(-8deg)}
.practicar-page .pp-tc-media .pp-glyph svg{width:100%;height:100%;stroke-width:1.4}
.practicar-page .pp-tc-media .pp-fade{position:absolute;left:0;right:0;bottom:0;height:44px;background:linear-gradient(180deg,transparent,var(--pp-surface));pointer-events:none;z-index:1}
.practicar-page .pp-tc-head{position:absolute;top:10px;right:12px;z-index:2}
.practicar-page .pp-tc .pp-ico{position:absolute;left:14px;top:60px;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;box-shadow:0 4px 12px rgba(13,20,18,.14);border:2px solid var(--pp-surface);z-index:3;background:var(--pp-surface)}
.practicar-page .pp-tc .pp-ico svg{width:20px;height:20px;stroke-width:2.2}
.practicar-page .pp-tc-body{display:flex;flex-direction:column;gap:8px;padding:12px 16px 14px;flex:1;min-height:0}
.practicar-page .pp-tc-body .pp-top-sp{height:18px}
.practicar-page .pp-tc .pp-rank{font-family:var(--pp-font-display);font-weight:700;font-size:11px;background:#E6F7F0;color:var(--pp-green-700);padding:3px 9px;border-radius:99px;white-space:nowrap;font-variant-numeric:tabular-nums}
.practicar-page .pp-tc .pp-rank.cold{background:var(--pp-bg-2);color:var(--pp-fg-4)}
.practicar-page .pp-tc .pp-cat{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;line-height:1}
.practicar-page .pp-tc h4{font-family:var(--pp-font-display);font-weight:700;font-size:16px;letter-spacing:-0.01em;line-height:1.2;margin:0;color:var(--pp-fg-1);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.practicar-page .pp-tc .pp-tc-meta{margin-top:auto;display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--pp-fg-3);font-weight:500;flex-wrap:wrap}
.practicar-page .pp-tc .pp-tc-meta b{color:var(--pp-fg-1);font-weight:600}
.practicar-page .pp-tc .pp-tc-meta .pp-dot{width:2.5px;height:2.5px;border-radius:50%;background:var(--pp-fg-4)}

/* card elegida */
.practicar-page .pp-tc.active{background:linear-gradient(160deg,#00B37E 0%,#008F63 60%,#054A3A 100%);border-color:transparent;color:#fff;box-shadow:0 12px 28px rgba(0,143,99,.28)}
.practicar-page .pp-tc.active .pp-ico{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.18);color:#fff}
.practicar-page .pp-tc.active .pp-tc-media .pp-fade{background:linear-gradient(180deg,transparent,#00B37E)}
.practicar-page .pp-tc.active h4{color:#fff}
.practicar-page .pp-tc.active .pp-cat{color:rgba(255,255,255,.7)}
.practicar-page .pp-tc.active .pp-rank{background:rgba(255,255,255,.18);color:#fff}
.practicar-page .pp-tc.active .pp-tc-meta,.practicar-page .pp-tc.active .pp-tc-meta b{color:rgba(255,255,255,.85)}

.practicar-page .pp-empty{grid-column:1/-1;text-align:center;padding:38px 20px;color:var(--pp-fg-3);font-size:13.5px;border:1px dashed var(--pp-border-2);border-radius:14px}
.practicar-page .pp-empty b{display:block;font-family:var(--pp-font-display);font-size:15px;color:var(--pp-fg-1);margin-bottom:4px}

/* ───── BARRA DE SELECCIÓN ───── */
.practicar-page .pp-selbar{position:fixed;bottom:18px;left:calc(var(--sidebar-w, 240px) + 32px);right:32px;background:var(--pp-fg-1);color:#fff;border-radius:16px;padding:12px 16px 12px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;row-gap:10px;box-shadow:0 6px 20px rgba(13,20,18,.18);z-index:50}
[data-theme="dark"] .practicar-page .pp-selbar{background:#1B2421;border:1px solid rgba(232,236,234,.10)}
.practicar-page .pp-selbar .pp-sel-ic{width:36px;height:36px;border-radius:9px;background:rgba(255,255,255,.10);color:#fff;display:grid;place-items:center;flex-shrink:0}
.practicar-page .pp-selbar .pp-sel-text{min-width:200px;max-width:360px;flex:1 1 auto}
.practicar-page .pp-selbar .pp-l{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700}
.practicar-page .pp-selbar .pp-t{font-family:var(--pp-font-display);font-weight:600;font-size:15px;margin-top:2px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.practicar-page .pp-selbar .pp-t b{font-weight:700}
.practicar-page .pp-selbar .pp-sel-prev{font-size:11.5px;color:rgba(255,255,255,.55);margin-top:3px;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.practicar-page .pp-selbar .pp-sel-meta{display:flex;align-items:center;gap:14px;font-size:12px;color:rgba(255,255,255,.65);flex-shrink:0;white-space:nowrap}
.practicar-page .pp-selbar .pp-sel-meta b{color:#fff;font-weight:600}
.practicar-page .pp-selbar .pp-opts{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.practicar-page .pp-selbar .pp-opt{height:28px;padding:0 10px;border-radius:99px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.7);font-size:11.5px;font-weight:600;border:0;cursor:pointer;font-family:inherit}
.practicar-page .pp-selbar .pp-opt.on{background:#7CE7BD;color:#04231D}
.practicar-page .pp-selbar .pp-optlbl{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);font-weight:700;margin-left:6px}
.practicar-page .pp-selbar .pp-sel-actions{margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0}
.practicar-page .pp-selbar .pp-go{height:38px;padding:0 18px;border-radius:10px;background:var(--pp-green);color:#fff;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;font-family:inherit}
.practicar-page .pp-selbar .pp-go:hover{background:var(--pp-green-700)}
@keyframes pp-selpulse{0%{box-shadow:0 0 0 0 rgba(0,179,126,.45)}100%{box-shadow:0 0 0 14px rgba(0,179,126,0)}}
.practicar-page .pp-selbar.pulse{animation:pp-selpulse .5s ease-out}
/* La barra se adapta a su propio ancho, no al del viewport */
@media (max-width:1150px){.practicar-page .pp-selbar .pp-optlbl{display:none}}
@media (max-width:1000px){.practicar-page .pp-selbar .pp-sel-prev{display:none}}
@media (max-width:900px){.practicar-page .pp-selbar .pp-opts{display:none}}
@media (max-width:760px){.practicar-page .pp-selbar .pp-sel-meta{display:none}}
@media (max-width:880px){
  /* En mobile el sidebar colapsa y la MobileBar ocupa el pie */
  .practicar-page .pp-selbar{left:12px;right:12px;bottom:calc(70px + env(safe-area-inset-bottom, 0px));padding:10px 12px}
  .practicar-page .pp-selbar .pp-sel-text{min-width:120px}
}
`
