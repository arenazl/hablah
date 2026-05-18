export const HISTORIAL_CSS = `
.hist-page{
  --hi-green:#00B37E;
  --hi-green-700:#008F63;
  --hi-amber:#FFB800;
  --hi-bg-1:#FAFBFA;
  --hi-bg-2:#F1F4F1;
  --hi-bg-3:#EAEDE8;
  --hi-surface:#FFFFFF;
  --hi-border-1:rgba(13,20,18,.06);
  --hi-border-2:rgba(13,20,18,.10);
  --hi-fg-1:#0D1412;
  --hi-fg-2:#3A4441;
  --hi-fg-3:#6B7672;
  --hi-fg-4:#98A19D;
  --hi-font-display:'Sora','Inter',ui-sans-serif,system-ui,sans-serif;

  padding: 8px 32px 96px;
  max-width:1440px;
  background:var(--hi-bg-1);
  color:var(--hi-fg-1);
  font-family:'Inter',ui-sans-serif,system-ui,sans-serif;
  font-size:14px;
  line-height:1.5;
}
.hist-page *{box-sizing:border-box}
.hist-page button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit}

.hist-page .hi-greet{padding:6px 0 18px}
.hist-page .hi-eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--hi-green);font-weight:700}
.hist-page h1.hi-title{font-family:var(--hi-font-display);font-weight:700;letter-spacing:-0.02em;font-size:30px;line-height:1.05;margin:6px 0 6px}

.hist-page .hi-summary{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:12px;margin-bottom:20px}
@media (max-width:880px){.hist-page .hi-summary{grid-template-columns:repeat(2,1fr)}}
.hist-page .hi-ss{background:var(--hi-surface);border:1px solid var(--hi-border-1);border-radius:14px;padding:14px 16px}
.hist-page .hi-ss .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--hi-fg-3);font-weight:700}
.hist-page .hi-ss .v{font-family:var(--hi-font-display);font-weight:800;font-size:28px;letter-spacing:-0.025em;color:var(--hi-fg-1);margin-top:4px;line-height:1}
.hist-page .hi-ss .v small{font-family:var(--hi-font-display);font-weight:600;font-size:13px;color:var(--hi-green-700);margin-left:5px}
.hist-page .hi-ss .h{font-size:11.5px;color:var(--hi-fg-3);margin-top:6px}
.hist-page .hi-chart{display:flex;align-items:flex-end;gap:5px;height:48px;margin-top:8px}
.hist-page .hi-chart i{flex:1;background:var(--hi-bg-2);border-radius:3px;min-height:4px}
.hist-page .hi-chart i.on{background:linear-gradient(180deg,#5EE0B0,var(--hi-green))}
.hist-page .hi-chart i.today{background:var(--hi-green-700)}

.hist-page .hi-week-hd{display:flex;align-items:baseline;justify-content:space-between;margin:28px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--hi-border-1)}
.hist-page .hi-week-hd h3{font-family:var(--hi-font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--hi-fg-3);margin:0}
.hist-page .hi-week-hd .meta{font-size:12px;color:var(--hi-fg-3)}
.hist-page .hi-week-hd .meta b{color:var(--hi-fg-1);font-weight:700}

.hist-page .hi-sess-list{display:flex;flex-direction:column}
.hist-page .hi-row{display:grid;grid-template-columns:54px 1fr 130px 100px 28px;gap:14px;align-items:center;padding:12px 8px;border-bottom:1px solid var(--hi-border-1);cursor:pointer;border-radius:10px;text-decoration:none;color:inherit;transition:background .15s}
.hist-page .hi-row:hover{background:var(--hi-bg-2)}
.hist-page .hi-row:last-child{border-bottom:0}
@media (max-width:880px){
  .hist-page{padding:8px 16px 96px}
  .hist-page .hi-row{grid-template-columns:44px 1fr 70px 22px;gap:10px;padding:12px 6px}
  .hist-page .hi-row .hi-dur{display:none}
}

.hist-page .hi-rdate{font-family:var(--hi-font-display);font-weight:600;font-size:11px;color:var(--hi-fg-3);text-align:center;line-height:1.2;text-transform:uppercase;letter-spacing:.04em}
.hist-page .hi-rdate b{display:block;font-size:18px;color:var(--hi-fg-1);font-weight:700;letter-spacing:-0.01em;margin-bottom:1px}
.hist-page .hi-rdate .time{display:block;font-size:10.5px;color:var(--hi-fg-4);font-weight:500;margin-top:2px;text-transform:none}

.hist-page .hi-rbody .topicrow{display:flex;align-items:center;gap:10px;margin-bottom:5px;flex-wrap:wrap}
.hist-page .hi-rbody .topic{font-weight:600;font-size:14px;color:var(--hi-fg-1);font-family:var(--hi-font-display)}
.hist-page .hi-rbody .cat-chip{font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;padding:2px 7px;border-radius:99px}
.hist-page .cat-chip.arte{background:#F3E8FF;color:#7C3AED}
.hist-page .cat-chip.tec{background:#EEF2FF;color:#4338CA}
.hist-page .cat-chip.life{background:#FCE7F3;color:#BE185D}
.hist-page .cat-chip.dep{background:#FFEDD5;color:#C2410C}
.hist-page .cat-chip.cien{background:#CFFAFE;color:#0E7490}
.hist-page .cat-chip.via{background:#DBEAFE;color:#1D4ED8}
.hist-page .cat-chip.gas{background:#FFE4E6;color:#BE123C}
.hist-page .cat-chip.gen{background:var(--hi-bg-2);color:var(--hi-fg-3)}

.hist-page .hi-rbody .tutor-chip{font-size:10px;letter-spacing:.04em;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--hi-bg-2);color:var(--hi-fg-3)}
.hist-page .hi-rbody .tutor-chip.sincerist{background:#FFF7DD;color:#7A5800}
.hist-page .hi-rbody .tutor-chip.coach{background:#E6F7F0;color:var(--hi-green-700)}
.hist-page .hi-rbody .meta{font-size:12px;color:var(--hi-fg-3);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.hist-page .hi-rbody .meta .ok{color:var(--hi-green-700);font-weight:600}
.hist-page .hi-rbody .meta .err{color:#B53337;font-weight:600}
.hist-page .hi-rbody .meta .dot{width:2.5px;height:2.5px;border-radius:50%;background:var(--hi-fg-4)}

.hist-page .hi-fluency{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.hist-page .hi-fluency .num{font-family:var(--hi-font-display);font-weight:700;font-size:17px;color:var(--hi-fg-1);letter-spacing:-0.01em}
.hist-page .hi-fluency .meter{width:60px;height:4px;border-radius:99px;background:var(--hi-bg-2);overflow:hidden}
.hist-page .hi-fluency .meter i{display:block;height:100%;background:var(--hi-green);border-radius:99px}
.hist-page .hi-fluency .none{font-size:13px;color:var(--hi-fg-4)}

.hist-page .hi-dur{text-align:right;font-family:var(--hi-font-display);font-weight:700;font-size:14px;color:var(--hi-fg-1)}
.hist-page .hi-dur small{display:block;font-family:'Inter';font-weight:500;font-size:10.5px;color:var(--hi-fg-3);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}

.hist-page .hi-go{color:var(--hi-fg-4);text-align:right}

.hist-page .hi-empty{padding:40px;text-align:center;color:var(--hi-fg-3);background:var(--hi-surface);border:1px dashed var(--hi-border-2);border-radius:14px}
.hist-page .hi-empty a{color:var(--hi-green-700);font-weight:600}

/* Layout 2-col */
.hist-page .hi-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px}
@media (max-width:1180px){.hist-page .hi-grid{grid-template-columns:1fr}}

/* Filter bar */
.hist-page .hi-filterbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;background:var(--hi-surface);border:1px solid var(--hi-border-1);border-radius:14px;padding:12px 14px}
.hist-page .hi-fb-group{display:flex;align-items:center;gap:6px;padding-right:14px;border-right:1px solid var(--hi-border-2)}
.hist-page .hi-fb-group:last-of-type{border-right:0;padding-right:0}
.hist-page .hi-fb-group .lbl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--hi-fg-3);font-weight:700;margin-right:4px}
.hist-page .hi-seg{display:inline-flex;background:var(--hi-bg-2);border-radius:8px;padding:2px;gap:0}
.hist-page .hi-seg button{padding:4px 10px;font-size:12px;font-weight:600;border-radius:6px;color:var(--hi-fg-3);background:transparent;border:0;cursor:pointer}
.hist-page .hi-seg button.on{background:var(--hi-surface);color:var(--hi-fg-1);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.hist-page .hi-pillbtn{height:28px;padding:0 10px;border:1px solid var(--hi-border-2);background:transparent;border-radius:99px;font-size:12px;color:var(--hi-fg-2);font-weight:500;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.hist-page .hi-pillbtn:hover{background:var(--hi-bg-2)}
.hist-page .hi-pillbtn.active{background:var(--hi-fg-1);color:#fff;border-color:var(--hi-fg-1)}
.hist-page .hi-pillbtn .x{margin-left:4px;color:rgba(255,255,255,.55);font-size:14px;line-height:1}
.hist-page .hi-pillbtn.toggle{border-style:dashed}
.hist-page .hi-pillbtn.toggle.on{background:#FFF7DD;border-color:rgba(255,184,0,.4);border-style:solid;color:#7A5800}

/* Right rail */
.hist-page .hi-rc{display:flex;flex-direction:column;gap:18px;position:sticky;top:80px;align-self:start}
@media (max-width:1180px){.hist-page .hi-rc{position:static}}
.hist-page .hi-card{background:var(--hi-surface);border:1px solid var(--hi-border-1);border-radius:14px;padding:16px}
.hist-page .hi-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.hist-page .hi-card-head h3{font-family:var(--hi-font-display);font-weight:700;font-size:14px;margin:0;letter-spacing:-0.005em}
.hist-page .hi-card-head .h-meta{font-size:12px;color:var(--hi-fg-3)}
.hist-page .hi-stat-line{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px dashed var(--hi-border-1)}
.hist-page .hi-stat-line:last-child{border-bottom:0}
.hist-page .hi-stat-line .l{font-size:12.5px;color:var(--hi-fg-3)}
.hist-page .hi-stat-line .v{font-family:var(--hi-font-display);font-weight:700;font-size:15px;color:var(--hi-fg-1)}
.hist-page .hi-stat-line .v small{font-family:var(--hi-font-display);font-weight:600;font-size:11px;color:var(--hi-green-700);margin-left:3px}

/* Status icons */
.hist-page .hi-status{display:flex;justify-content:center;color:var(--hi-green-700)}
.hist-page .hi-status.rescue{color:var(--hi-amber)}
.hist-page .hi-status.cold{color:var(--hi-fg-4)}
.hist-page .hi-status svg{width:18px;height:18px}

/* En cola (active session row) */
.hist-page .hi-row.live{background:linear-gradient(90deg,rgba(0,179,126,.06),transparent);border-bottom-color:transparent}
.hist-page .hi-row.live .hi-go{color:var(--hi-green-700)}
.hist-page .hi-live-dot{width:7px;height:7px;border-radius:50%;background:var(--hi-green);box-shadow:0 0 0 3px rgba(0,179,126,.2);animation:hi-pulse 1.8s ease-out infinite;display:inline-block;margin-right:4px;vertical-align:middle}
@keyframes hi-pulse{0%{box-shadow:0 0 0 0 rgba(0,179,126,.45)}80%{box-shadow:0 0 0 8px rgba(0,179,126,0)}100%{box-shadow:0 0 0 0 rgba(0,179,126,0)}}

/* Mas corregido */
.hist-page .hi-corr-list{display:flex;flex-direction:column;gap:6px;margin-top:4px}
.hist-page .hi-corr-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--hi-border-1);border-radius:10px}
.hist-page .hi-corr-item .ci{width:24px;height:24px;border-radius:7px;background:#FFF7DD;color:#8A6A00;display:grid;place-items:center;font-family:var(--hi-font-display);font-weight:800;font-size:10.5px;flex-shrink:0}
.hist-page .hi-corr-item.gram .ci{background:#FDECED;color:#9A2D31}
.hist-page .hi-corr-item .ct{flex:1;font-size:12px;color:var(--hi-fg-1);font-weight:500;line-height:1.3}
.hist-page .hi-corr-item .ct small{display:block;color:var(--hi-fg-3);font-size:10.5px;margin-top:1px;font-weight:500}
.hist-page .hi-corr-item .cn{font-family:var(--hi-font-display);font-weight:700;font-size:11px;color:var(--hi-fg-3);background:var(--hi-bg-2);padding:2px 7px;border-radius:99px;flex-shrink:0}
`
