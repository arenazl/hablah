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
`
