export const WEBAPP_CSS = `
.webapp-root {
  --primary: #00B37E; --primary-dark: #008F63;
  --primary-tint: #E6F7F1; --primary-soft: #C5EDDF;
  --accent: #FFB800; --accent-tint: #FFF4D6;
  --danger: #E5484D; --info: #3B82F6;
  --bg-1: #FAFBFA; --bg-2: #F2F4F1; --bg-3: #EAEDE8;
  --surface: #FFFFFF;
  --border-1: rgba(13,20,18,.08); --border-2: rgba(13,20,18,.14);
  --fg-1: #0D1412; --fg-2: #2D3431; --fg-3: #5A625F; --fg-4: #8E938F;
  --ink-1: #0E1614; --ink-2: #19211E; --ink-3: #243029;
  --ink-fg: #E8ECEA;
}

[data-theme="dark"] .webapp-root,
[data-theme="dark"].webapp-root {
  --primary-tint: rgba(0,179,126,.18); --primary-soft: rgba(0,179,126,.28);
  --bg-1: #0B1210; --bg-2: #131B18; --bg-3: #1B2421;
  --surface: #161E1B;
  --border-1: rgba(232,236,234,.08); --border-2: rgba(232,236,234,.14);
  --fg-1: #E8ECEA; --fg-2: #B6BDB9; --fg-3: #8E938F; --fg-4: #5A625F;
  --accent-tint: rgba(255,184,0,.18);
  --shadow-card: 0 1px 2px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.3);
  --shadow-float: 0 6px 20px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.4);
}

.webapp-root {
  --t-xs: 11px; --t-sm: 13px; --t-base: 15px; --t-md: 16px;
  --t-lg: 20px; --t-xl: 25px; --t-2xl: 31px; --t-3xl: 39px; --t-4xl: 49px;
  --r-md: 10px; --r-lg: 12px; --r-xl: 16px; --r-2xl: 20px; --r-pill: 999px;
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
.webapp-root * { box-sizing: border-box; }
.webapp-root button { font-family: inherit; cursor: pointer; }
.webapp-root a { color: inherit; text-decoration: none; }
.webapp-root .tnum { font-variant-numeric: tabular-nums; }

.webapp-root .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-weight: 600; font-size: var(--t-base); border-radius: var(--r-lg);
  padding: 12px 18px; border: 1px solid transparent; line-height: 1;
  transition: all .15s var(--ease); white-space: nowrap;
}
.webapp-root .btn-primary { background: var(--primary); color: white; }
.webapp-root .btn-primary:hover { background: var(--primary-dark); }
.webapp-root .btn-secondary { background: var(--bg-2); color: var(--fg-1); }
.webapp-root .btn-secondary:hover { background: var(--bg-3); }
.webapp-root .btn-ghost { background: transparent; color: var(--fg-2); }
.webapp-root .btn-ghost:hover { background: var(--bg-2); }
.webapp-root .btn-dark { background: var(--ink-1); color: white; }
.webapp-root .btn-sm { padding: 7px 12px; font-size: var(--t-sm); }
.webapp-root .btn-lg { padding: 16px 22px; font-size: var(--t-md); }

.webapp-root .pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  font-size: var(--t-xs); font-weight: 700; letter-spacing: .02em;
  background: var(--bg-2); color: var(--fg-2);
}
.webapp-root .pill-primary { background: var(--primary-tint); color: var(--primary-dark); }
.webapp-root .pill-accent  { background: var(--accent-tint);  color: #8A5A00; }
.webapp-root .pill-dark    { background: var(--ink-1); color: white; }

.webapp-root .eyebrow {
  font-size: var(--t-xs); font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--fg-3);
}

.webapp-root .shell { display: flex; min-height: 100vh; }

.webapp-root .sidebar {
  width: var(--sidebar-w);
  background: var(--ink-1); color: rgba(232,236,234,.8);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; flex-shrink: 0;
}
.webapp-root .sidebar .brand { padding: 20px 18px 22px; display: flex; align-items: center; gap: 10px; }
.webapp-root .sidebar .brand-mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--primary); color: white;
  display: grid; place-items: center;
  font-weight: 900; font-style: italic; font-size: 19px;
}
.webapp-root .sidebar .brand-name { color: white; font-weight: 800; font-size: 17px; letter-spacing: -.01em; }
.webapp-root .sidebar .brand-mark-img { width: 32px; height: 32px; border-radius: 8px; display: block; flex-shrink: 0; }
.webapp-root .sidebar-nav { padding: 0 12px; display: flex; flex-direction: column; gap: 2px; }
.webapp-root .nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 10px;
  font-size: var(--t-base); font-weight: 500;
  color: rgba(232,236,234,.7); cursor: pointer; user-select: none;
  transition: background .15s var(--ease), color .15s var(--ease);
}
.webapp-root .nav-item:hover { background: rgba(255,255,255,.05); color: white; }
.webapp-root .nav-item.active { background: rgba(0,179,126,.16); color: var(--primary); }
.webapp-root .nav-item svg { flex-shrink: 0; }
.webapp-root .nav-item .badge {
  margin-left: auto; background: var(--accent); color: #5A3D00;
  font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 999px;
}

.webapp-root .sidebar-section { padding: 18px 18px 6px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: rgba(232,236,234,.4); }
.webapp-root .sidebar-foot { margin-top: auto; padding: 12px; }
.webapp-root .user-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 12px;
  background: rgba(255,255,255,.04);
}
.webapp-root .user-card .av {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--ink-3); color: white; font-weight: 700;
  display: grid; place-items: center; font-size: 14px;
}
.webapp-root .user-card .name { color: white; font-size: 13px; font-weight: 600; }
.webapp-root .user-card .meta { color: rgba(232,236,234,.55); font-size: 11px; }

.webapp-root .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.webapp-root .topbar {
  background: rgba(250,251,250,.92);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-1);
  position: sticky; top: 0; z-index: 30;
  padding-top: env(safe-area-inset-top, 0px);
}
.webapp-root .topbar-inner { height: 64px; display: flex; align-items: center; gap: 16px; padding: 0 32px; }
.webapp-root .topbar h1 { font-size: 18px; font-weight: 700; letter-spacing: -.01em; margin: 0; }
.webapp-root .topbar .search { flex: 1; max-width: 360px; position: relative; }
.webapp-root .topbar .search input {
  width: 100%; height: 38px; padding: 0 14px 0 36px;
  border-radius: 999px; border: 1px solid var(--border-2);
  background: var(--surface); font: inherit; font-size: 13px; color: var(--fg-1);
}
.webapp-root .topbar .search input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-tint); }
.webapp-root .topbar .search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-3); }
.webapp-root .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.webapp-root .streak-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--accent-tint); color: #8A5A00;
  font-weight: 700; font-size: 13px;
}
.webapp-root .icon-btn {
  width: 38px; height: 38px; border-radius: 10px;
  display: grid; place-items: center; background: transparent;
  border: 0; color: var(--fg-2); position: relative;
}
.webapp-root .icon-btn:hover { background: var(--bg-2); }
.webapp-root .icon-btn .dot {
  position: absolute; top: 9px; right: 9px;
  width: 7px; height: 7px; border-radius: 50%; background: var(--danger);
  border: 2px solid var(--bg-1);
}
.webapp-root .topbar .av-btn {
  width: 38px; height: 38px; border-radius: 50%;
  background: var(--ink-2); color: white; font-weight: 700;
  display: grid; place-items: center; font-size: 14px; border: 0;
}

.webapp-root .mobile-bar { display: none; }

.webapp-root .view { padding: 32px; }
.webapp-root .view-head { margin-bottom: 24px; }
.webapp-root .view-head h2 { font-size: 28px; font-weight: 800; letter-spacing: -.02em; margin: 0; line-height: 1.1; }
.webapp-root .view-head .sub { font-size: 14px; color: var(--fg-3); margin-top: 4px; }

.webapp-root .card { background: var(--surface); border-radius: var(--r-xl); border: 1px solid var(--border-1); }
.webapp-root .card-pad { padding: 22px; }

.webapp-root .today-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; }
.webapp-root .mission-card {
  background: var(--ink-1); color: white;
  border-radius: 20px; padding: 32px;
  position: relative; overflow: hidden; min-height: 280px;
  display: flex; flex-direction: column;
}
.webapp-root .mission-card::before {
  content: ''; position: absolute; top: -100px; right: -120px;
  width: 380px; height: 380px; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,179,126,.4) 0%, transparent 70%);
}
.webapp-root .mission-card-content { position: relative; flex: 1; display: flex; flex-direction: column; }
.webapp-root .mission-meta { display: flex; gap: 8px; margin-bottom: 18px; align-items: center; }
.webapp-root .mission-card h3 { font-size: 32px; line-height: 1.1; letter-spacing: -.025em; font-weight: 800; margin: 0 0 12px; max-width: 540px; }
.webapp-root .mission-card p { font-size: 15px; color: rgba(232,236,234,.75); margin: 0 0 24px; max-width: 460px; line-height: 1.5; }
.webapp-root .mission-card p strong { color: var(--primary); font-weight: 700; }
.webapp-root .mission-card .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; }

.webapp-root .streak-panel { display: grid; grid-template-rows: auto 1fr auto; gap: 14px; }
.webapp-root .week-card { padding: 20px; }
.webapp-root .week-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 14px; }
.webapp-root .day { text-align: center; }
.webapp-root .day .l { font-size: 10px; font-weight: 700; color: var(--fg-3); margin-bottom: 6px; }
.webapp-root .day .b { height: 32px; border-radius: 8px; background: var(--bg-2); display: grid; place-items: center; }
.webapp-root .day.on .b { background: var(--primary); color: white; }
.webapp-root .day.today .b { border: 2px solid var(--ink-1); }
.webapp-root .week-summary { font-size: 13px; color: var(--fg-2); }
.webapp-root .week-summary b { color: var(--fg-1); }

.webapp-root .qp-row { margin-top: 28px; }
.webapp-root .qp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.webapp-root .qp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.webapp-root .qp-card {
  background: white; border-radius: var(--r-lg);
  border: 1px solid var(--border-1);
  padding: 16px; transition: all .15s var(--ease); cursor: pointer;
}
.webapp-root .qp-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); border-color: var(--primary-tint); }
.webapp-root .qp-card .ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; margin-bottom: 10px; }
.webapp-root .qp-card h4 { font-size: 14px; font-weight: 600; margin: 0; }
.webapp-root .qp-card .s { font-size: 12px; color: var(--fg-3); margin-top: 2px; }

.webapp-root .recent { margin-top: 28px; }
.webapp-root .recent-list { display: flex; flex-direction: column; gap: 8px; }
.webapp-root .recent-row {
  display: grid;
  grid-template-columns: 64px 1fr auto auto;
  gap: 16px; align-items: center;
  padding: 14px 18px;
  background: white; border: 1px solid var(--border-1); border-radius: var(--r-lg);
}
.webapp-root .recent-row .when { font-size: 12px; color: var(--fg-3); }
.webapp-root .recent-row .when .day-l { font-weight: 700; color: var(--fg-1); font-size: 14px; }
.webapp-root .recent-row .title { font-size: 14px; font-weight: 600; }
.webapp-root .recent-row .topic { font-size: 12px; color: var(--fg-3); margin-top: 2px; }
.webapp-root .recent-row .score { font-weight: 800; font-size: 18px; color: var(--primary-dark); font-variant-numeric: tabular-nums; min-width: 50px; text-align: right; }

.webapp-root .convo-view {
  height: calc(100vh - 64px);
  background: #000; color: white;
  display: grid;
  grid-template-columns: 1fr 380px;
  overflow: hidden;
}
.webapp-root .convo-stage { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 16px 24px; overflow: hidden; }
.webapp-root .convo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.webapp-root .convo-header h2 { font-size: 22px; font-weight: 700; letter-spacing: -.01em; margin: 0; }
.webapp-root .convo-header .meta { display: flex; gap: 14px; align-items: center; margin-top: 6px; font-size: 12px; color: rgba(232,236,234,.6); }
.webapp-root .convo-header .meta .live::before {
  content: ''; display: inline-block; width: 7px; height: 7px;
  border-radius: 50%; background: var(--primary); margin-right: 6px;
}
.webapp-root .convo-header .end { background: rgba(229,72,77,.15); color: #FF6B70; border: 1px solid rgba(229,72,77,.3); }

.webapp-root .convo-orb-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 12px; min-height: 0; overflow: hidden; }
.webapp-root .convo-orb-wrap {
  width: min(360px, 50vw, 42dvh);
  height: min(360px, 50vw, 42dvh);
  position: relative;
  flex-shrink: 0;
}

/* ============== REPORT OVERLAY (split-screen al cerrar charla) ============== */
.webapp-root .report-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: #000; color: white;
  display: grid; grid-template-columns: 1fr 1fr;
  overflow: hidden;
}
.webapp-root .report-pane-left {
  overflow-y: auto;
  padding: 40px 32px 40px 48px;
  background: var(--bg-1, #FAFBFA);
  color: var(--fg-1, #0D1412);
}
.webapp-root .report-pane-right {
  position: relative; background: #000;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 32px;
}
@media (max-width: 880px) {
  .webapp-root .report-overlay {
    /* En mobile: stack vertical, derecha arriba (orb), izquierda abajo (reporte scrolleable) */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .webapp-root .report-pane-right {
    order: -1;  /* el orb arriba */
    padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 20px;
    min-height: 38dvh; max-height: 45dvh;
  }
  .webapp-root .report-pane-left {
    padding: 22px 18px calc(100px + env(safe-area-inset-bottom, 0px));
  }
}
@media (max-width: 880px) {
  .webapp-root .convo-orb-area {
    padding: 4px; min-height: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .webapp-root .convo-orb-wrap {
    width: min(72vw, 240px, 28dvh);
    height: min(72vw, 240px, 28dvh);
    flex-shrink: 0;
  }
  /* Practicar pre-charla: 3 cards en columna */
  .webapp-root .practicar-page .pp-quick { grid-template-columns: 1fr; gap: 10px; }
  .webapp-root .practicar-page .pp-qc { min-height: 100px; padding: 16px; }
  /* Garantizar que ningun bloque rompa el ancho de la viewport */
  .webapp-root, .webapp-root * { max-width: 100%; }
  .webapp-root img, .webapp-root svg, .webapp-root canvas { max-width: 100%; height: auto; }
}
@media (max-width: 880px) and (max-height: 700px) {
  /* Pantallas mas chicas (iphone SE / Android compacto): orb aun mas chico */
  .webapp-root .convo-orb-wrap { width: min(60vw, 200px, 24dvh); height: min(60vw, 200px, 24dvh); }
}
.webapp-root .convo-orb {
  width: 280px; height: 280px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--primary) 0%, var(--primary-dark) 60%, #003E2B 100%);
  box-shadow: 0 30px 100px rgba(0,179,126,.4);
  position: relative;
}
.webapp-root .convo-orb::before, .webapp-root .convo-orb::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
.webapp-root .convo-orb::before { inset: -28px; border: 1px solid rgba(0,179,126,.3); }
.webapp-root .convo-orb::after  { inset: -64px; border: 1px solid rgba(0,179,126,.13); }

.webapp-root .convo-turn { margin-top: 14px; text-align: center; max-height: 30dvh; overflow-y: auto; padding: 0 8px; }
.webapp-root .convo-turn .l { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(232,236,234,.55); margin-bottom: 8px; }
.webapp-root .convo-turn .q { font-size: 17px; max-width: 580px; line-height: 1.4; color: rgba(232,236,234,.9); font-style: italic; }
.webapp-root .convo-turn .q b { color: white; font-style: normal; font-weight: 600; }

.webapp-root .challenge-float {
  background: linear-gradient(135deg, rgba(255,184,0,.15) 0%, rgba(255,184,0,.04) 100%);
  border: 1px solid rgba(255,184,0,.3);
  border-radius: 14px; padding: 14px 16px;
  display: flex; gap: 12px; align-items: center;
  max-width: 460px; margin: 24px auto 0;
}
.webapp-root .challenge-float .ico { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,184,0,.18); color: var(--accent); display: grid; place-items: center; flex-shrink: 0; }
.webapp-root .challenge-float .lbl { font-size: 10px; font-weight: 700; letter-spacing: .1em; color: var(--accent); text-transform: uppercase; }
.webapp-root .challenge-float .text { color: white; font-size: 14px; }
.webapp-root .challenge-float .text strong { color: var(--accent); }

.webapp-root .mic-row {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 24px; background: var(--ink-2);
  border-radius: 16px; margin-top: 22px;
}
.webapp-root .mic-wave { flex: 1; display: flex; align-items: center; justify-content: center; gap: 2px; height: 36px; min-width: 0; }
.webapp-root .mic-wave i { display: block; width: 3px; min-width: 3px; flex-shrink: 0; background: var(--primary); border-radius: 2px; opacity: .9; }
.webapp-root .mic-controls { display: flex; gap: 8px; }
.webapp-root .mic-btn { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; border: 0; color: white; }
.webapp-root .mic-btn.pause { background: rgba(255,255,255,.08); }
.webapp-root .mic-btn.stop  { background: var(--danger); }

.webapp-root .convo-side { background: var(--ink-2); border-left: 1px solid rgba(255,255,255,.06); display: flex; flex-direction: column; overflow: hidden; }
.webapp-root .side-tabs { display: flex; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,.06); }
.webapp-root .side-tab { padding: 14px 12px; font-size: 13px; font-weight: 600; color: rgba(232,236,234,.55); cursor: pointer; position: relative; }
.webapp-root .side-tab.active { color: white; }
.webapp-root .side-tab.active::after {
  content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px;
  height: 2px; background: var(--primary); border-radius: 1px;
}
.webapp-root .side-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.webapp-root .line { padding: 10px 12px; border-radius: 12px; font-size: 13px; line-height: 1.45; max-width: 92%; }
.webapp-root .line.ai { background: rgba(255,255,255,.06); align-self: flex-start; border-top-left-radius: 4px; }
.webapp-root .line.you { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); align-self: flex-end; border-top-right-radius: 4px; }
.webapp-root .line .err { margin-top: 6px; padding: 4px 8px; background: rgba(229,72,77,.18); border-radius: 6px; font-size: 11px; color: #FFB3B5; display: inline-block; }
.webapp-root .line .ok { margin-top: 6px; padding: 4px 8px; background: rgba(0,179,126,.16); border-radius: 6px; font-size: 11px; color: var(--primary); display: inline-block; }
.webapp-root .side-stats { padding: 16px 18px; border-top: 1px solid rgba(255,255,255,.06); }
.webapp-root .side-stat-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: rgba(232,236,234,.7); }
.webapp-root .side-stat-row b { color: white; font-variant-numeric: tabular-nums; }

.webapp-root .map-tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
.webapp-root .map-tab { padding: 8px 14px; border-radius: 999px; background: var(--bg-2); font-size: 13px; font-weight: 600; color: var(--fg-2); border: 1px solid transparent; cursor: pointer; }
.webapp-root .map-tab.active { background: var(--ink-1); color: white; }

.webapp-root .map-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; }
.webapp-root .map-trail { position: relative; padding-left: 32px; }
.webapp-root .map-trail::before {
  content: ''; position: absolute; left: 26px; top: 30px; bottom: 30px;
  width: 2px; background: var(--bg-3);
}
.webapp-root .stage {
  display: grid; grid-template-columns: 56px 1fr; gap: 14px;
  align-items: center; margin-left: -32px; margin-bottom: 12px;
}
.webapp-root .stage .ball {
  width: 52px; height: 52px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--bg-2); border: 2px solid var(--border-1);
  color: var(--fg-3); font-weight: 800; position: relative; z-index: 1;
}
.webapp-root .stage.done .ball { background: var(--primary); border-color: var(--primary); color: white; }
.webapp-root .stage.current .ball { background: white; border: 2.5px dashed var(--primary); color: var(--primary); }
.webapp-root .stage.locked-soon .ball { background: var(--bg-2); border-color: var(--border-1); color: var(--fg-3); }
.webapp-root .stage .body { background: white; border: 1px solid var(--border-1); border-radius: var(--r-lg); padding: 14px 16px; }
.webapp-root .stage.current .body { background: var(--primary-tint); border-color: var(--primary); }
.webapp-root .stage .body .l { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--fg-3); }
.webapp-root .stage.done .body .l, .webapp-root .stage.current .body .l { color: var(--primary-dark); }
.webapp-root .stage .body h4 { font-size: 16px; font-weight: 600; margin: 2px 0 0; line-height: 1.3; }
.webapp-root .stage .body .meta { font-size: 12px; color: var(--fg-3); margin-top: 6px; }

.webapp-root .topic-panel { display: flex; flex-direction: column; gap: 16px; }
.webapp-root .topic-progress { padding: 20px; background: white; border-radius: var(--r-xl); border: 1px solid var(--border-1); }
.webapp-root .topic-progress .row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.webapp-root .topic-progress h3 { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -.01em; }
.webapp-root .topic-progress .pct { font-size: 24px; font-weight: 800; color: var(--primary-dark); font-variant-numeric: tabular-nums; }
.webapp-root .topic-progress .bar { height: 8px; background: var(--bg-3); border-radius: 4px; margin: 14px 0 6px; overflow: hidden; }
.webapp-root .topic-progress .bar > div { height: 100%; background: var(--primary); border-radius: 4px; }

.webapp-root .weak-points { padding: 20px; background: #FFF7E5; border: 1px solid rgba(255,184,0,.35); border-radius: var(--r-xl); }
.webapp-root .weak-points h4 { font-size: 14px; font-weight: 700; margin: 0 0 10px; color: #5A3D00; display: flex; align-items: center; gap: 8px; }
.webapp-root .weak-points ul { list-style: none; padding: 0; margin: 0; }
.webapp-root .weak-points li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-top: 1px dashed rgba(255,184,0,.4);
  font-size: 13px; color: #5A3D00;
}
.webapp-root .weak-points li:first-child { border-top: 0; }
.webapp-root .weak-points li .count { background: rgba(255,184,0,.25); padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }

.webapp-root .history-controls { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.webapp-root .history-controls .search { flex: 1; max-width: 360px; position: relative; }
.webapp-root .history-controls input {
  width: 100%; height: 38px; padding: 0 14px 0 36px;
  border-radius: 10px; border: 1px solid var(--border-2);
  background: var(--surface); font: inherit; font-size: 13px;
}
.webapp-root .history-controls input:focus { outline: none; border-color: var(--primary); }
.webapp-root .history-controls .search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-3); }

.webapp-root .history-grid { display: flex; flex-direction: column; gap: 10px; }
.webapp-root .history-row {
  display: grid;
  grid-template-columns: 80px 1.4fr 1fr 1fr 1fr 36px;
  gap: 16px; align-items: center;
  background: white; border: 1px solid var(--border-1); border-radius: var(--r-lg);
  padding: 16px 18px;
}
.webapp-root .history-row .when { font-size: 12px; color: var(--fg-3); }
.webapp-root .history-row .when b { font-weight: 700; color: var(--fg-1); font-size: 14px; display: block; }
.webapp-root .history-row .h-title { font-size: 14px; font-weight: 600; line-height: 1.25; }
.webapp-root .history-row .h-topic { font-size: 12px; color: var(--fg-3); margin-top: 2px; display: flex; gap: 6px; align-items: center; }
.webapp-root .history-row .metric { display: flex; flex-direction: column; }
.webapp-root .history-row .metric .l { font-size: 11px; color: var(--fg-3); }
.webapp-root .history-row .metric .v { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.webapp-root .history-row .metric .v.up { color: var(--primary-dark); }
.webapp-root .history-row .metric .v.down { color: var(--danger); }

.webapp-root .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.webapp-root .profile-card { background: white; border-radius: var(--r-xl); border: 1px solid var(--border-1); padding: 24px; }
.webapp-root .profile-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 16px; letter-spacing: -.01em; }
.webapp-root .profile-header {
  background: white; border-radius: var(--r-xl); border: 1px solid var(--border-1);
  padding: 24px; display: flex; align-items: center; gap: 18px;
  grid-column: 1 / -1;
}
.webapp-root .profile-header .av {
  width: 72px; height: 72px; border-radius: 50%;
  background: var(--ink-1); color: white;
  display: grid; place-items: center; font-weight: 800; font-size: 28px;
}
.webapp-root .profile-header h2 { font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -.015em; }
.webapp-root .profile-header .meta { color: var(--fg-3); font-size: 14px; margin-top: 4px; }

.webapp-root .tutor-active {
  display: flex; gap: 14px; align-items: center;
  padding: 14px; background: var(--bg-2); border-radius: var(--r-lg);
  margin-bottom: 12px;
}
.webapp-root .tutor-active .av { width: 44px; height: 44px; border-radius: 12px; background: var(--ink-1); color: white; display: grid; place-items: center; font-weight: 800; }
.webapp-root .tutor-active .body { flex: 1; }
.webapp-root .tutor-active .body .n { font-size: 15px; font-weight: 600; }
.webapp-root .tutor-active .body .d { font-size: 12px; color: var(--fg-3); }

.webapp-root .tutor-list { display: flex; flex-direction: column; gap: 8px; }
.webapp-root .tutor-opt {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: var(--r-lg);
  border: 1px solid var(--border-1); cursor: pointer;
}
.webapp-root .tutor-opt:hover { background: var(--bg-2); }
.webapp-root .tutor-opt .dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--border-2); flex-shrink: 0; }
.webapp-root .tutor-opt.selected .dot { border-color: var(--primary); background: var(--primary); box-shadow: inset 0 0 0 3px white; }
.webapp-root .tutor-opt .ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; color: white; }
.webapp-root .tutor-opt .body { flex: 1; }
.webapp-root .tutor-opt .body .n { font-size: 14px; font-weight: 600; }
.webapp-root .tutor-opt .body .d { font-size: 12px; color: var(--fg-3); }

.webapp-root .interest-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.webapp-root .interest-chips .chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 999px;
  background: var(--primary-tint); color: var(--primary-dark);
  font-size: 13px; font-weight: 600;
}
.webapp-root .interest-chips .chip .x { width: 14px; height: 14px; border-radius: 50%; background: rgba(0,143,99,.2); display: grid; place-items: center; font-size: 10px; cursor: pointer; }
.webapp-root .interest-chips .add { background: transparent; border: 1px dashed var(--border-2); color: var(--fg-3); }

.webapp-root .settings-list { display: flex; flex-direction: column; }
.webapp-root .settings-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 0; border-top: 1px solid var(--border-1);
}
.webapp-root .settings-row:first-child { border-top: 0; padding-top: 4px; }
.webapp-root .settings-row .ico { width: 36px; height: 36px; border-radius: 10px; background: var(--bg-2); color: var(--fg-2); display: grid; place-items: center; }
.webapp-root .settings-row .body { flex: 1; }
.webapp-root .settings-row .l { font-size: 14px; font-weight: 500; }
.webapp-root .settings-row .s { font-size: 12px; color: var(--fg-3); }
.webapp-root .settings-row .v { font-size: 13px; color: var(--fg-3); }
.webapp-root .switch { width: 44px; height: 26px; background: var(--primary); border-radius: 999px; position: relative; cursor: pointer; }
.webapp-root .switch::after {
  content: ''; position: absolute; top: 3px; left: 21px; width: 20px; height: 20px;
  background: white; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.webapp-root .switch.off { background: var(--bg-3); }
.webapp-root .switch.off::after { left: 3px; }

.webapp-root .hamburger-btn { display: none; background: none; border: 0; padding: 8px; color: var(--fg-1); cursor: pointer; border-radius: 8px; }
.webapp-root .hamburger-btn:hover { background: var(--bg-2); }
.webapp-root .drawer-backdrop { display: none; }

@media (max-width: 880px) {
  .webapp-root { --sidebar-w: 0; }
  .webapp-root .hamburger-btn { display: inline-flex; align-items: center; justify-content: center; }
  .webapp-root .sidebar {
    display: flex; position: fixed; top: 0; left: 0; bottom: 0;
    width: 280px; max-width: 80vw; z-index: 200;
    transform: translateX(-100%);
    transition: transform .22s cubic-bezier(.2,.8,.2,1);
    box-shadow: 0 0 40px rgba(0,0,0,.3);
  }
  .webapp-root .sidebar.mobile-open { transform: translateX(0); }
  .webapp-root .drawer-backdrop {
    display: block; position: fixed; inset: 0; z-index: 150;
    background: rgba(0,0,0,.5); backdrop-filter: blur(2px);
    animation: drawerFade .18s ease-out;
  }
  @keyframes drawerFade { from { opacity: 0 } to { opacity: 1 } }
  .webapp-root .shell { display: block; min-height: 100vh; }
  .webapp-root .topbar-inner { padding: 0 16px; gap: 10px; }
  .webapp-root .topbar h1 { font-size: 16px; }
  .webapp-root .topbar .search { max-width: none; }
  .webapp-root .topbar-right .streak-badge .l { display: none; }
  .webapp-root .view { padding: 18px 16px 96px; }
  .webapp-root .view-head h2 { font-size: 22px; }
  .webapp-root .today-grid { grid-template-columns: 1fr; }
  .webapp-root .mission-card { padding: 22px; min-height: auto; }
  .webapp-root .mission-card h3 { font-size: 22px; }
  .webapp-root .mission-card p { font-size: 13.5px; }
  .webapp-root .qp-grid { grid-template-columns: repeat(2, 1fr); }
  .webapp-root .recent-row { grid-template-columns: 56px 1fr auto; gap: 12px; padding: 12px 14px; }
  .webapp-root .recent-row .topic { display: none; }
  .webapp-root .recent-row .when .day-l { font-size: 13px; }
  .webapp-root .convo-view {
    grid-template-columns: 1fr;
    height: calc(100dvh - 64px - 64px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
  .webapp-root .convo-stage { padding: 14px 16px; gap: 8px; }
  /* Espacio arriba para que el header NO se solape con los pickers absolutos (ped + bg) */
  .webapp-root .convo-header { margin-bottom: 12px; padding-top: 48px; }
  .webapp-root .convo-header h2 { font-size: 17px; line-height: 1.2; }
  .webapp-root .convo-header .meta { flex-wrap: wrap; gap: 6px !important; }
  .webapp-root .convo-orb { width: 200px; height: 200px; }
  .webapp-root .convo-side { display: none; }
  .webapp-root .convo-turn { padding: 0 8px; }
  .webapp-root .convo-turn .q { font-size: 14px; line-height: 1.45; }
  .webapp-root .map-grid { grid-template-columns: 1fr; }
  .webapp-root .stage .ball { width: 44px; height: 44px; }
  .webapp-root .history-row { grid-template-columns: 64px 1fr auto; gap: 10px; }
  .webapp-root .history-row .metric:nth-of-type(2),
  .webapp-root .history-row .metric:nth-of-type(3),
  .webapp-root .history-row > button { display: none; }
  .webapp-root .history-row .h-topic span:nth-child(n+3) { display: none; }
  .webapp-root .profile-grid { grid-template-columns: 1fr; }
  .webapp-root .mobile-bar {
    display: flex;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(255,255,255,.95);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--border-1);
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
    z-index: 50; justify-content: space-around;
  }
  .webapp-root .mobile-bar .mb-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
    font-size: 10px; font-weight: 600; color: var(--fg-3); padding: 6px;
  }
  .webapp-root .mobile-bar .mb-item.active { color: var(--primary); }
  .webapp-root .mobile-bar .mb-item.cta {
    background: linear-gradient(160deg, #00B37E 0%, #008F63 100%); color: white; border-radius: 999px;
    width: 58px; height: 58px; flex: 0 0 58px; margin-top: -22px;
    box-shadow: 0 8px 20px rgba(0,179,126,.45), 0 0 0 4px var(--bg-1);
    justify-content: center; gap: 0;
  }
  .webapp-root .mobile-bar .mb-item.cta:active { transform: scale(.94); }
  .webapp-root .mobile-bar .mb-item.cta span { display: none; }
  .webapp-root .mb-more-wrap { flex: 1; position: relative; display: flex; justify-content: center; }
  .webapp-root .mb-more-wrap .mb-item { width: 100%; }
  .webapp-root .more-backdrop {
    position: fixed; inset: 0; z-index: 49; background: rgba(0,0,0,.35);
    animation: drawerFade .15s ease-out;
  }
  .webapp-root .more-sheet {
    position: fixed; right: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    background: var(--surface); border: 1px solid var(--border-1); border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0,0,0,.18); padding: 6px; z-index: 51;
    min-width: 200px; animation: sheetUp .18s cubic-bezier(.2,.8,.2,1);
  }
  @keyframes sheetUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
  .webapp-root .more-item {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 10px; background: transparent; border: 0;
    font-size: 14px; font-weight: 500; color: var(--fg-1); cursor: pointer; text-align: left;
  }
  .webapp-root .more-item:hover, .webapp-root .more-item:active { background: var(--bg-2); }
  .webapp-root .more-item.danger { color: var(--danger); }
  .webapp-root .more-item svg { flex-shrink: 0; }
  .webapp-root .more-sep { height: 1px; background: var(--border-1); margin: 4px 8px; }
}

/* Settings btn (siempre visible en topbar) */
.webapp-root .settings-btn {
  background: none; border: 0; padding: 8px; color: var(--fg-2); cursor: pointer;
  border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s, transform .15s;
}
.webapp-root .settings-btn:hover { background: var(--bg-2); color: var(--fg-1); }
.webapp-root .settings-btn:active { transform: rotate(20deg); }

/* Level card (5 escalones) */
.webapp-root .level-card .level-steps {
  display: flex; flex-direction: column; gap: 8px;
}
.webapp-root .level-step {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px;
  background: var(--bg-1); border: 1.5px solid var(--border-1); border-radius: 12px;
  cursor: pointer; transition: all .18s var(--ease); text-align: left; font-family: inherit;
}
.webapp-root .level-step:hover:not(:disabled) { border-color: var(--border-2); background: var(--bg-2); }
.webapp-root .level-step:disabled { opacity: .5; cursor: wait; }
.webapp-root .level-step.active { background: var(--primary-tint); border-color: var(--primary); }
.webapp-root .level-step .ls-cefr {
  font-family: 'Inter'; font-weight: 800; font-size: 14px;
  color: var(--fg-3); background: var(--bg-2); padding: 5px 10px; border-radius: 8px;
  letter-spacing: .04em; min-width: 38px; text-align: center; flex-shrink: 0;
}
.webapp-root .level-step.active .ls-cefr { background: white; }
.webapp-root .level-step .ls-body { flex: 1; min-width: 0; }
.webapp-root .level-step .ls-name { font-size: 14px; font-weight: 700; color: var(--fg-1); }
.webapp-root .level-step .ls-desc { font-size: 12px; color: var(--fg-3); margin-top: 2px; }
@media (max-width: 480px) {
  .webapp-root .qp-grid { grid-template-columns: 1fr; }
  .webapp-root .week-days { gap: 4px; }
}
`
