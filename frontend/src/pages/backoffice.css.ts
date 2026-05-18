export const BACKOFFICE_CSS = `
[data-theme="dark"] .bo-root,
[data-theme="dark"].bo-root {
  --primary-tint: rgba(0,179,126,.18); --primary-soft: rgba(0,179,126,.28);
  --bg-1: #0B1210; --bg-2: #131B18; --bg-3: #1B2421;
  --surface: #161E1B;
  --border-1: rgba(232,236,234,.08); --border-2: rgba(232,236,234,.14);
  --fg-1: #E8ECEA; --fg-2: #B6BDB9; --fg-3: #8E938F; --fg-4: #5A625F;
  --accent-tint: rgba(255,184,0,.18);
}

.bo-root {
  --primary: #00B37E; --primary-dark: #008F63;
  --primary-tint: #E6F7F1; --primary-soft: #C5EDDF;
  --accent: #FFB800; --accent-tint: #FFF4D6;
  --danger: #E5484D; --info: #3B82F6; --violet: #7C3AED;
  --bg-1: #FAFBFA; --bg-2: #F2F4F1; --bg-3: #EAEDE8;
  --surface: #FFFFFF;
  --border-1: rgba(13,20,18,.08); --border-2: rgba(13,20,18,.14);
  --fg-1: #0D1412; --fg-2: #2D3431; --fg-3: #5A625F; --fg-4: #8E938F;
  --ink-1: #0E1614; --ink-2: #19211E; --ink-3: #243029;
  --t-xs: 11px; --t-sm: 13px; --t-base: 14px; --t-md: 15px;
  --t-lg: 18px; --t-xl: 22px; --t-2xl: 28px;
  --r-md: 10px; --r-lg: 12px; --r-xl: 16px; --r-pill: 999px;
  --shadow-card: 0 1px 2px rgba(13,20,18,.04), 0 2px 6px rgba(13,20,18,.04);
  --shadow-float: 0 6px 20px rgba(13,20,18,.10), 0 2px 6px rgba(13,20,18,.06);
  --ease: cubic-bezier(.2,.8,.2,1);
  --sidebar-w: 240px;

  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  background: var(--bg-1); color: var(--fg-1);
  font-size: var(--t-base); line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'cv11','ss01','tnum';
  min-height: 100vh;
}
.bo-root * { box-sizing: border-box; }
.bo-root button { font-family: inherit; cursor: pointer; }
.bo-root a { color: inherit; text-decoration: none; }
.bo-root .tnum { font-variant-numeric: tabular-nums; }
.bo-root .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

.bo-root .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font-weight: 600; font-size: var(--t-base); border-radius: var(--r-lg);
  padding: 9px 14px; border: 1px solid transparent; line-height: 1;
  transition: all .15s var(--ease); white-space: nowrap;
}
.bo-root .btn-primary { background: var(--primary); color: white; }
.bo-root .btn-primary:hover { background: var(--primary-dark); }
.bo-root .btn-secondary { background: var(--surface); color: var(--fg-1); border-color: var(--border-2); }
.bo-root .btn-secondary:hover { background: var(--bg-2); }
.bo-root .btn-ghost { background: transparent; color: var(--fg-2); }
.bo-root .btn-ghost:hover { background: var(--bg-2); }
.bo-root .btn-dark { background: var(--ink-1); color: white; }
.bo-root .btn-sm { padding: 6px 11px; font-size: var(--t-sm); }
.bo-root .btn-block { display: flex; width: 100%; }

.bo-root .pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 999px;
  font-size: var(--t-xs); font-weight: 700; letter-spacing: .02em;
  background: var(--bg-2); color: var(--fg-2);
}
.bo-root .pill-primary { background: var(--primary-tint); color: var(--primary-dark); }
.bo-root .pill-accent  { background: var(--accent-tint);  color: #8A5A00; }
.bo-root .pill-danger  { background: #FCE8E9; color: #B42127; }
.bo-root .pill-info    { background: #E6EFFF; color: #1E4FB0; }
.bo-root .pill-violet  { background: #F1E8FF; color: #5B21B6; }
.bo-root .pill-dark    { background: var(--ink-1); color: white; }
.bo-root .pill-outline { background: transparent; border: 1px solid var(--border-2); color: var(--fg-2); }

.bo-root .eyebrow {
  font-size: var(--t-xs); font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--fg-3);
}
.bo-root .input {
  width: 100%; height: 38px; padding: 0 12px;
  border: 1px solid var(--border-2); border-radius: var(--r-md);
  background: var(--surface); font: inherit; font-size: 13px;
  color: var(--fg-1);
}
.bo-root .input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-tint); }

.bo-root .shell { display: flex; min-height: 100vh; }

.bo-root .sidebar {
  width: var(--sidebar-w); background: var(--ink-1); color: rgba(232,236,234,.8);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; flex-shrink: 0;
}
.bo-root .sidebar .brand { padding: 20px 18px 6px; display: flex; align-items: center; gap: 10px; }
.bo-root .sidebar .brand-mark {
  width: 30px; height: 30px; border-radius: 8px; background: var(--primary);
  color: white; display: grid; place-items: center;
  font-weight: 900; font-style: italic; font-size: 18px;
}
.bo-root .sidebar .brand-name { color: white; font-weight: 800; font-size: 16px; letter-spacing: -.01em; }
.bo-root .sidebar .brand-sub { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: rgba(232,236,234,.45); margin-top: 2px; }
.bo-root .sidebar .brand-mark-img { width: 32px; height: 32px; border-radius: 8px; display: block; flex-shrink: 0; }
.bo-root .sidebar-section {
  padding: 18px 18px 6px; font-size: 10.5px; letter-spacing: .14em;
  text-transform: uppercase; color: rgba(232,236,234,.45);
}
.bo-root .sidebar-nav { padding: 0 12px; display: flex; flex-direction: column; gap: 1px; }
.bo-root .nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 12px; border-radius: 8px;
  font-size: var(--t-base); font-weight: 500;
  color: rgba(232,236,234,.7); cursor: pointer; user-select: none;
  transition: background .15s var(--ease), color .15s var(--ease);
}
.bo-root .nav-item:hover { background: rgba(255,255,255,.05); color: white; }
.bo-root .nav-item.active { background: rgba(0,179,126,.16); color: var(--primary); }
.bo-root .nav-item svg { flex-shrink: 0; }
.bo-root .nav-item .badge {
  margin-left: auto; background: rgba(0,179,126,.2); color: var(--primary);
  font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
}
.bo-root .nav-item.live .badge { background: var(--danger); color: white; }
.bo-root .sidebar-foot { margin-top: auto; padding: 12px; }
.bo-root .user-card {
  display: flex; align-items: center; gap: 10px; padding: 10px;
  border-radius: 12px; background: rgba(255,255,255,.04);
}
.bo-root .user-card .av {
  width: 34px; height: 34px; border-radius: 50%; background: var(--accent);
  color: #5A3D00; font-weight: 800; display: grid; place-items: center;
  font-size: 13px;
}
.bo-root .user-card .name { color: white; font-size: 13px; font-weight: 600; }
.bo-root .user-card .meta { color: rgba(232,236,234,.55); font-size: 11px; }

.bo-root .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bo-root .pagehead {
  background: var(--surface);
  border-bottom: 1px solid var(--border-1);
  padding: 22px 32px 18px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  flex-wrap: wrap;
}
.bo-root .pagehead .brick { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
.bo-root .pagehead .brick .eyebrow { margin-bottom: 4px; }
.bo-root .pagehead h1 { font-size: 24px; font-weight: 700; letter-spacing: -.015em; margin: 0; line-height: 1.15; }
.bo-root .pagehead .sub { font-size: 13px; color: var(--fg-3); margin-top: 6px; max-width: 720px; line-height: 1.5; }
.bo-root .pagehead .actions { display: flex; gap: 8px; flex-wrap: wrap; }
.bo-root .menu-toggle { display: none; }
.bo-root .view { padding: 26px 32px 40px; flex: 1; }
.bo-root .card { background: var(--surface); border-radius: var(--r-xl); border: 1px solid var(--border-1); }
.bo-root .card-elev { box-shadow: var(--shadow-card); border: none; }
.bo-root .card-pad { padding: 20px; }

.bo-root .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
.bo-root .kpi { padding: 18px; display: flex; flex-direction: column; gap: 4px; }
.bo-root .kpi .l { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--fg-3); }
.bo-root .kpi .row { display: flex; align-items: center; justify-content: space-between; }
.bo-root .kpi .v { font-size: 28px; font-weight: 800; letter-spacing: -.015em; }
.bo-root .kpi .delta { font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 999px; }
.bo-root .delta.up { background: var(--primary-tint); color: var(--primary-dark); }
.bo-root .delta.down { background: #FCE8E9; color: #B42127; }
.bo-root .kpi .help { font-size: 11px; color: var(--fg-3); }

.bo-root .dash-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.bo-root .chart-card { padding: 20px; }
.bo-root .chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
.bo-root .chart-head h3 { font-size: 14px; font-weight: 700; margin: 0; }
.bo-root .chart-head .s { font-size: 12px; color: var(--fg-3); }
.bo-root .chart-head .legend { display: flex; gap: 10px; font-size: 11px; color: var(--fg-3); }
.bo-root .chart-head .legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; }
.bo-root .bars { display: flex; align-items: flex-end; gap: 5px; height: 180px; }
.bo-root .bars .col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.bo-root .bars .pair { width: 100%; display: flex; align-items: flex-end; gap: 1px; height: 160px; }
.bo-root .bars .pair i { flex: 1; border-radius: 2px 2px 0 0; }
.bo-root .bars .pair .prev { background: var(--bg-3); }
.bo-root .bars .pair .now  { background: var(--primary); }
.bo-root .bars .lab { font-size: 10px; color: var(--fg-4); }

.bo-root .templ-dist .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; }
.bo-root .templ-dist .row .v { color: var(--fg-3); font-variant-numeric: tabular-nums; }
.bo-root .templ-dist .bar { height: 6px; background: var(--bg-3); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
.bo-root .templ-dist .bar > div { height: 100%; border-radius: 3px; }

.bo-root .dash-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.bo-root .err-list { padding: 0; margin: 0; list-style: none; }
.bo-root .err-list li { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--border-1); font-size: 13px; }
.bo-root .err-list li:last-child { border-bottom: 0; }
.bo-root .err-list li .rank { width: 18px; font-size: 11px; font-weight: 800; color: var(--fg-4); }
.bo-root .err-list li .name { flex: 1; }
.bo-root .err-list li .count { font-weight: 700; font-variant-numeric: tabular-nums; }

.bo-root .alert-list { padding: 0; margin: 0; list-style: none; }
.bo-root .alert-list li { display: flex; align-items: center; gap: 11px; padding: 10px 0; border-bottom: 1px solid var(--border-1); }
.bo-root .alert-list li:last-child { border-bottom: 0; }
.bo-root .alert-list .ico { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: grid; place-items: center; }
.bo-root .alert-list .body { flex: 1; min-width: 0; }
.bo-root .alert-list .body .t { font-size: 13px; font-weight: 600; }
.bo-root .alert-list .body .s { font-size: 12px; color: var(--fg-3); }

.bo-root .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.bo-root .toolbar .search { position: relative; flex: 1; max-width: 320px; }
.bo-root .toolbar .search input { padding-left: 36px; }
.bo-root .toolbar .search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-3); }
.bo-root .toolbar .right { margin-left: auto; font-size: 13px; color: var(--fg-3); }

.bo-root .table { overflow: hidden; }
.bo-root .t-head, .bo-root .t-row {
  display: grid;
  grid-template-columns: 2.2fr 1.4fr 0.9fr 1fr 1fr 48px;
  gap: 14px; align-items: center; padding: 12px 18px;
}
.bo-root .t-head { background: var(--bg-2); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-3); }
.bo-root .t-row { border-top: 1px solid var(--border-1); cursor: pointer; }
.bo-root .t-row:hover { background: var(--bg-2); }
.bo-root .t-name { display: flex; align-items: center; gap: 12px; }
.bo-root .t-icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; color: white; flex-shrink: 0; }
.bo-root .t-name .n { font-weight: 600; font-size: 14px; }
.bo-root .t-name .meta { font-size: 11px; color: var(--fg-4); display: flex; align-items: center; gap: 6px; margin-top: 1px; }

.bo-root .rigor-bars { display: flex; gap: 2px; }
.bo-root .rigor-bars i { width: 14px; height: 6px; border-radius: 2px; background: var(--bg-3); }
.bo-root .rigor-bars i.on { background: var(--ink-1); }

.bo-root .icon-btn-soft { background: transparent; border: 0; padding: 6px; color: var(--fg-3); border-radius: 6px; }
.bo-root .icon-btn-soft:hover { background: var(--bg-2); color: var(--fg-1); }

.bo-root .editor-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
.bo-root .editor-section { padding: 22px; }
.bo-root .editor-section h3 { font-size: 14px; font-weight: 700; margin: 0 0 12px; }

.bo-root .slider-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.bo-root .slider-row .title { font-weight: 600; font-size: 15px; }
.bo-root .slider-row .sub { font-size: 12px; color: var(--fg-3); }
.bo-root .slider-row .val { display: flex; align-items: baseline; gap: 5px; }
.bo-root .slider-row .val .n { font-size: 26px; font-weight: 800; }
.bo-root .slider-row .val .m { font-size: 12px; color: var(--fg-3); }
.bo-root .slider-track { position: relative; height: 6px; background: var(--bg-3); border-radius: 999px; margin: 14px 0 6px; }
.bo-root .slider-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--primary); border-radius: 999px; }
.bo-root .slider-fill.dark { background: var(--ink-1); }
.bo-root .slider-thumb {
  position: absolute; top: 50%; width: 18px; height: 18px;
  border-radius: 50%; background: white; border: 2px solid var(--primary);
  transform: translate(-50%, -50%); box-shadow: var(--shadow-card); cursor: grab;
}
.bo-root .slider-thumb.dark { border-color: var(--ink-1); }
.bo-root .slider-ticks { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--fg-3); margin-top: 8px; }

.bo-root .tone-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.bo-root .tone-opt {
  padding: 10px 13px; border-radius: 10px; font-size: 13px; font-weight: 500;
  border: 1.5px solid var(--border-2); background: white; color: var(--fg-2);
  display: flex; align-items: center; gap: 7px; cursor: pointer;
  transition: all .15s var(--ease);
}
.bo-root .tone-opt:hover { border-color: var(--fg-3); }
.bo-root .tone-opt.on { background: var(--ink-1); color: white; border-color: var(--ink-1); }
.bo-root .tone-opt.on::before { content: '\\2713'; font-weight: 800; }

.bo-root .toggle-row {
  display: flex; align-items: center; gap: 14px; padding: 12px 0;
  border-top: 1px dashed var(--border-1);
}
.bo-root .toggle-row .body { flex: 1; }
.bo-root .toggle-row .body .t { font-weight: 600; font-size: 14px; }
.bo-root .toggle-row .body .s { font-size: 12px; color: var(--fg-3); }
.bo-root .switch {
  width: 42px; height: 24px; background: var(--primary); border-radius: 999px;
  position: relative; cursor: pointer; flex-shrink: 0;
}
.bo-root .switch::after {
  content: ''; position: absolute; top: 3px; left: 21px; width: 18px; height: 18px;
  background: white; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.2);
  transition: left .15s var(--ease);
}
.bo-root .switch.off { background: var(--bg-3); }
.bo-root .switch.off::after { left: 3px; }

.bo-root .prompt-box {
  margin: 0; padding: 14px; background: var(--ink-1); color: rgba(232,236,234,.85);
  border-radius: 10px; font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px; line-height: 1.6;
  white-space: pre-wrap; overflow: auto; max-height: 360px;
}
.bo-root .prompt-box .key { color: #FFB800; }
.bo-root .prompt-box .var { color: #74C7E8; }
.bo-root .prompt-box .crit { color: #F87171; }
.bo-root .prompt-box .com { color: #94A3B8; }

.bo-root .topics-layout { display: grid; grid-template-columns: 220px 1fr; gap: 24px; }
.bo-root .cat-sidebar { padding: 4px 0; }
.bo-root .cat-item {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.bo-root .cat-item:hover { background: var(--bg-2); }
.bo-root .cat-item.active { background: var(--bg-2); font-weight: 600; }
.bo-root .cat-item .dot { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }
.bo-root .cat-item .count { color: var(--fg-3); font-size: 12px; }

.bo-root .level-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.bo-root .level-chips .pill { cursor: pointer; }

.bo-root .topic-row { padding: 14px 16px; display: flex; align-items: center; gap: 14px; margin-bottom: 8px; cursor: pointer; }
.bo-root .topic-row:hover { background: var(--bg-2); }
.bo-root .topic-row .body { flex: 1; min-width: 0; }
.bo-root .topic-row .body .t { font-size: 14px; font-weight: 600; line-height: 1.25; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bo-root .topic-row .body .m {
  margin-top: 4px; display: flex; align-items: center; gap: 10px;
  font-size: 12px; color: var(--fg-3); flex-wrap: wrap;
}
.bo-root .topic-row .body .m .sep { width: 3px; height: 3px; border-radius: 50%; background: var(--border-2); }
.bo-root .topic-row .levels { display: flex; gap: 4px; flex-shrink: 0; }
.bo-root .topic-row .levels .lv { font-size: 10px; font-weight: 800; padding: 3px 7px; border-radius: 999px; background: var(--bg-2); color: var(--fg-2); }
.bo-root .topic-row .levels .lv.cur { background: var(--primary-tint); color: var(--primary-dark); }

.bo-root .topic-editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.bo-root .seed-card { padding: 22px; }
.bo-root .seed-item { padding: 12px 14px; background: var(--bg-2); border-radius: 10px; margin-bottom: 8px; }
.bo-root .seed-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.bo-root .seed-head .lvl-tag { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: var(--ink-1); color: white; }
.bo-root .seed-head .lvl-tag.cur { background: var(--primary); }
.bo-root .seed-text { font-size: 13px; color: var(--fg-2); line-height: 1.5; }

.bo-root .kw-grid { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0; }
.bo-root .kw {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 999px;
  background: var(--bg-2); font-size: 12px; font-weight: 500;
  border: 1px solid var(--border-1);
}
.bo-root .kw .col { width: 6px; height: 6px; border-radius: 50%; }
.bo-root .kw .x { color: var(--fg-4); cursor: pointer; margin-left: 2px; }
.bo-root .kw-legend { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: var(--fg-3); }
.bo-root .kw-legend span { display: inline-flex; align-items: center; gap: 4px; }
.bo-root .kw-legend i { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

.bo-root .struct-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--border-1); font-size: 13px; }
.bo-root .struct-row:last-child { border-bottom: 0; }
.bo-root .struct-row .name { flex: 1; }
.bo-root .struct-row .bar { width: 80px; height: 5px; border-radius: 3px; background: var(--bg-3); }
.bo-root .struct-row .bar > div { height: 100%; border-radius: 3px; background: var(--primary); }
.bo-root .struct-row .v { font-size: 12px; color: var(--fg-3); width: 36px; text-align: right; }

.bo-root .gamif-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 22px; }
.bo-root .gamif-card { padding: 20px; margin-bottom: 12px; }
.bo-root .gamif-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.bo-root .gamif-head .ico { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; }
.bo-root .gamif-head h4 { font-size: 14px; font-weight: 600; margin: 0; }
.bo-root .gamif-head .s { font-size: 12px; color: var(--fg-3); }
.bo-root .template-quote { background: var(--bg-2); border-radius: 10px; padding: 12px; font-size: 13px; color: var(--fg-2); margin: 10px 0; }
.bo-root .template-quote .l { font-size: 11px; font-weight: 700; color: var(--fg-3); letter-spacing: .06em; }
.bo-root .template-quote .q { font-style: italic; margin-top: 4px; }

.bo-root .gamif-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 6px; }
.bo-root .gamif-stats .b { padding: 10px; background: var(--bg-2); border-radius: 10px; }
.bo-root .gamif-stats .b .k { font-size: 11px; font-weight: 600; color: var(--fg-3); }
.bo-root .gamif-stats .b .v { font-size: 14px; font-weight: 700; color: var(--primary-dark); margin-top: 2px; }

.bo-root .insistent-card {
  background: #FFF7E5; border: 1px solid rgba(255,184,0,.4); border-radius: var(--r-xl);
  padding: 20px;
}
.bo-root .insistent-card .row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-top: 1px dashed rgba(255,184,0,.6);
  font-size: 13px;
}
.bo-root .insistent-card .row:first-of-type { border-top: 0; }
.bo-root .insistent-card .row .body .t { font-weight: 500; }
.bo-root .insistent-card .row .body .s { font-size: 11px; color: #8A5A00; }
.bo-root .stepper { display: flex; align-items: center; gap: 6px; }
.bo-root .stepper button { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--border-2); background: white; font-size: 14px; font-weight: 700; color: var(--fg-2); }
.bo-root .stepper .n { font-size: 16px; font-weight: 800; width: 24px; text-align: center; font-variant-numeric: tabular-nums; }

.bo-root .new-rule {
  padding: 16px; border-radius: 12px; border: 1px dashed var(--border-2);
  background: transparent; display: flex; align-items: center; gap: 10px; justify-content: center;
  color: var(--fg-3); font-weight: 500; font-size: 14px; cursor: pointer;
}
.bo-root .new-rule:hover { background: var(--bg-2); }

.bo-root .inspector-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 20px; }
.bo-root .layer-card { padding: 18px; margin-bottom: 12px; border-left: 3px solid var(--primary); }
.bo-root .layer-card.l1 { border-left-color: var(--info); }
.bo-root .layer-card.l2 { border-left-color: var(--ink-1); }
.bo-root .layer-card.l3 { border-left-color: var(--primary); }
.bo-root .layer-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.bo-root .layer-head .n { width: 24px; height: 24px; border-radius: 999px; color: white; display: grid; place-items: center; font-weight: 800; font-size: 12px; }
.bo-root .layer-card.l1 .n { background: var(--info); }
.bo-root .layer-card.l2 .n { background: var(--ink-1); }
.bo-root .layer-card.l3 .n { background: var(--primary); }
.bo-root .layer-head .t { font-weight: 700; font-size: 14px; flex: 1; }
.bo-root .layer-head .src { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--fg-3); }
.bo-root .kv-box { background: var(--bg-2); border-radius: 8px; padding: 10px; }
.bo-root .kv-row { display: flex; padding: 3px 0; font-size: 12px; border-bottom: 1px dashed var(--border-1); }
.bo-root .kv-row:last-child { border-bottom: 0; }
.bo-root .kv-row .k { width: 130px; color: var(--fg-3); flex-shrink: 0; }
.bo-root .kv-row .v { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; }
.bo-root .arrow-down { text-align: center; color: var(--fg-3); font-size: 12px; padding: 4px; }
.bo-root .transcript-box { padding: 14px; max-height: 320px; overflow-y: auto; }
.bo-root .ts-line { padding: 6px 0; border-bottom: 1px dashed var(--border-1); font-size: 12px; }
.bo-root .ts-line:last-child { border-bottom: 0; }
.bo-root .ts-line .who { font-size: 10px; font-weight: 800; min-width: 40px; display: inline-block; }
.bo-root .ts-line .who.ai { color: var(--primary-dark); }
.bo-root .ts-line .who.user { color: var(--ink-1); }
.bo-root .ts-line .txt { color: var(--fg-2); line-height: 1.45; }
.bo-root .ts-tag { display: inline-block; margin-left: 44px; margin-top: 3px; padding: 2px 8px; border-radius: 6px; font-size: 11px; }
.bo-root .ts-tag.err { background: #FCE8E9; color: #B42127; }
.bo-root .ts-tag.ok  { background: var(--primary-tint); color: var(--primary-dark); }

.bo-root .users-table .uhead, .bo-root .users-table .urow {
  display: grid;
  grid-template-columns: 2fr 0.7fr 1.4fr 1fr 1fr 1fr 36px;
  gap: 12px; align-items: center; padding: 12px 18px;
}
.bo-root .users-table .uhead {
  background: var(--bg-2); font-size: 11px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; color: var(--fg-3);
}
.bo-root .users-table .urow { border-top: 1px solid var(--border-1); font-size: 13px; cursor: pointer; }
.bo-root .users-table .urow:hover { background: var(--bg-2); }
.bo-root .uname { display: flex; align-items: center; gap: 10px; }
.bo-root .uname .av { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; color: white; font-weight: 700; font-size: 13px; display: grid; place-items: center; }
.bo-root .uname .n { font-weight: 600; }
.bo-root .uname .e { font-size: 11px; color: var(--fg-4); }

.bo-root .pagination {
  display: flex; align-items: center; gap: 8px; padding: 14px 18px;
  border-top: 1px solid var(--border-1); font-size: 12px; color: var(--fg-3);
}
.bo-root .pagination .pg-info { flex: 1; }
.bo-root .pagination button {
  background: white; border: 1px solid var(--border-2); border-radius: 8px;
  padding: 5px 10px; font-size: 12px; color: var(--fg-2); font-weight: 600;
}
.bo-root .pagination button:hover:not(:disabled) { background: var(--bg-2); }
.bo-root .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.bo-root .pagination .pg-current { padding: 0 8px; color: var(--fg-1); font-weight: 700; font-variant-numeric: tabular-nums; }

@media (max-width: 1100px) {
  .bo-root .editor-grid, .bo-root .topic-editor-grid, .bo-root .inspector-grid, .bo-root .gamif-grid, .bo-root .dash-grid, .bo-root .dash-bottom { grid-template-columns: 1fr; }
  .bo-root .kpi-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 880px) {
  .bo-root { --sidebar-w: 0; }
  .bo-root .sidebar {
    position: fixed; top: 0; left: 0; height: 100vh; z-index: 80;
    transform: translateX(-100%); transition: transform .25s var(--ease);
    width: 260px;
  }
  .bo-root .sidebar.open { transform: translateX(0); box-shadow: 0 20px 60px rgba(0,0,0,.3); }
  .bo-root .scrim { position: fixed; inset: 0; background: rgba(13,20,18,.5); z-index: 70; display: none; }
  .bo-root .scrim.show { display: block; }
  .bo-root .pagehead { padding: 16px 18px; gap: 12px; }
  .bo-root .pagehead h1 { font-size: 20px; }
  .bo-root .menu-toggle {
    display: grid; place-items: center;
    width: 38px; height: 38px; border-radius: 8px;
    background: transparent; border: 1px solid var(--border-2);
    margin-right: 6px;
  }
  .bo-root .view { padding: 18px; }
  .bo-root .toolbar .search { max-width: none; min-width: 100%; }
  .bo-root .users-table .uhead, .bo-root .users-table .urow { grid-template-columns: 1.6fr 60px 1fr 36px; }
  .bo-root .users-table .col-prog, .bo-root .users-table .col-temp, .bo-root .users-table .col-last { display: none; }
  .bo-root .t-head, .bo-root .t-row { grid-template-columns: 1.6fr 0.7fr 1fr 36px; gap: 8px; padding: 12px 14px; }
  .bo-root .t-head .col-tone, .bo-root .t-head .col-rigor, .bo-root .t-row .col-tone, .bo-root .t-row .col-rigor { display: none; }
  .bo-root .topics-layout { grid-template-columns: 1fr; gap: 12px; }
  .bo-root .cat-sidebar { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
  .bo-root .cat-item { white-space: nowrap; }
}
@media (max-width: 480px) {
  .bo-root .kpi-row { grid-template-columns: 1fr; }
  .bo-root .gamif-stats { grid-template-columns: repeat(2, 1fr); }
}
`
