import { useEffect } from 'react'
import { NavLink, Routes, Route, useLocation, Link } from 'react-router-dom'

const WEBAPP_CSS = `
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
  background: rgba(250,251,250,.86);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-1);
  position: sticky; top: 0; z-index: 30;
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
  background: var(--ink-1); color: white;
  display: grid;
  grid-template-columns: 1fr 380px;
  overflow: hidden;
}
.webapp-root .convo-stage { display: flex; flex-direction: column; min-width: 0; padding: 24px 32px; }
.webapp-root .convo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.webapp-root .convo-header h2 { font-size: 22px; font-weight: 700; letter-spacing: -.01em; margin: 0; }
.webapp-root .convo-header .meta { display: flex; gap: 14px; align-items: center; margin-top: 6px; font-size: 12px; color: rgba(232,236,234,.6); }
.webapp-root .convo-header .meta .live::before {
  content: ''; display: inline-block; width: 7px; height: 7px;
  border-radius: 50%; background: var(--primary); margin-right: 6px;
}
.webapp-root .convo-header .end { background: rgba(229,72,77,.15); color: #FF6B70; border: 1px solid rgba(229,72,77,.3); }

.webapp-root .convo-orb-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 20px; }
.webapp-root .convo-orb {
  width: 280px; height: 280px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--primary) 0%, var(--primary-dark) 60%, #003E2B 100%);
  box-shadow: 0 30px 100px rgba(0,179,126,.4);
  position: relative;
}
.webapp-root .convo-orb::before, .webapp-root .convo-orb::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
.webapp-root .convo-orb::before { inset: -28px; border: 1px solid rgba(0,179,126,.3); }
.webapp-root .convo-orb::after  { inset: -64px; border: 1px solid rgba(0,179,126,.13); }

.webapp-root .convo-turn { margin-top: 32px; text-align: center; }
.webapp-root .convo-turn .l { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(232,236,234,.55); margin-bottom: 14px; }
.webapp-root .convo-turn .q { font-size: 19px; max-width: 580px; line-height: 1.45; color: rgba(232,236,234,.85); font-style: italic; }
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
.webapp-root .mic-wave { flex: 1; display: flex; align-items: center; gap: 4px; height: 36px; }
.webapp-root .mic-wave i { display: block; width: 3px; background: var(--primary); border-radius: 2px; opacity: .9; }
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

@media (max-width: 880px) {
  .webapp-root { --sidebar-w: 0; }
  .webapp-root .sidebar { display: none; }
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
  .webapp-root .convo-view { grid-template-columns: 1fr; height: calc(100vh - 64px - 64px); }
  .webapp-root .convo-stage { padding: 16px; }
  .webapp-root .convo-orb { width: 200px; height: 200px; }
  .webapp-root .convo-side { display: none; }
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
    background: var(--primary); color: white; border-radius: 999px;
    width: 48px; height: 48px; flex: 0 0 48px; margin-top: -16px;
    box-shadow: 0 6px 16px rgba(0,179,126,.4); justify-content: center;
  }
  .webapp-root .mobile-bar .mb-item.cta span { display: none; }
}
@media (max-width: 480px) {
  .webapp-root .qp-grid { grid-template-columns: 1fr; }
  .webapp-root .week-days { gap: 4px; }
}
`

function ensureFont() {
  if (document.getElementById('hablah-google-fonts')) return
  const link = document.createElement('link')
  link.id = 'hablah-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap'
  document.head.appendChild(link)
}

const VIEW_TITLES: Record<string, string> = {
  '/app': 'Hoy',
  '/app/practicar': 'Practicar',
  '/app/mapa': 'Mapa de progreso',
  '/app/historial': 'Historial',
  '/app/perfil': 'Perfil',
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
function MicIcon({ size = 20, fill = 'none', stroke = 'currentColor' }: { size?: number; fill?: string; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4" />
    </svg>
  )
}
function MapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </svg>
  )
}
function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function UserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function WebApp() {
  useEffect(() => {
    ensureFont()
  }, [])

  return (
    <div className="webapp-root">
      <style>{WEBAPP_CSS}</style>
      <div className="shell">
        <Sidebar />
        <main className="main">
          <TopBar />
          <Routes>
            <Route path="/" element={<HoyView />} />
            <Route path="/practicar" element={<PracticarView />} />
            <Route path="/mapa" element={<MapaView />} />
            <Route path="/historial" element={<HistorialView />} />
            <Route path="/perfil" element={<PerfilView />} />
          </Routes>
        </main>
      </div>
      <MobileBar />
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">h</div>
        <div className="brand-name">habláh</div>
      </div>

      <nav className="sidebar-nav">
        <SidebarLink to="/app" icon={<HomeIcon />} label="Hoy" exact />
        <SidebarLink to="/app/practicar" icon={<MicIcon />} label="Practicar" badge="DAILY" />
        <SidebarLink to="/app/mapa" icon={<MapIcon />} label="Mapa de progreso" />
        <SidebarLink to="/app/historial" icon={<ClockIcon />} label="Historial" />
        <SidebarLink to="/app/perfil" icon={<UserIcon />} label="Perfil" />
      </nav>

      <div className="sidebar-section">Tu progreso</div>
      <div style={{ padding: '0 18px' }}>
        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Nivel</span>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>B2</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,.1)', borderRadius: 3 }}>
            <div style={{ width: '62%', height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,236,234,.5)', marginTop: 6 }}>62% hasta C1</div>
        </div>
      </div>

      <div className="sidebar-foot">
        <div className="user-card">
          <div className="av">L</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">Lautaro M.</div>
            <div className="meta">Plan Pro</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </aside>
  )
}

function SidebarLink({
  to,
  icon,
  label,
  badge,
  exact,
}: {
  to: string
  icon: React.ReactNode
  label: string
  badge?: string
  exact?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      {icon}
      {label}
      {badge && <span className="badge">{badge}</span>}
    </NavLink>
  )
}

function TopBar() {
  const loc = useLocation()
  const title = VIEW_TITLES[loc.pathname] ?? 'Hoy'
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <h1>{title}</h1>
        <div className="search" style={{ marginLeft: 24 }}>
          <SearchIcon />
          <input placeholder="Buscar tópico, sesión o palabra…" />
        </div>
        <div className="topbar-right">
          <div className="streak-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB800">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17h2.4a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1-3-2-4-2-2-1.5-4 .5-6-3.5 0-7 3-7 7 0 1 .5 2.5 1 3.1z" />
            </svg>
            <span>
              <span className="tnum">12</span>
              <span className="l"> días</span>
            </span>
          </div>
          <button className="icon-btn" aria-label="Notificaciones">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="dot"></span>
          </button>
          <button className="av-btn" aria-label="Perfil">L</button>
        </div>
      </div>
    </header>
  )
}

function MobileBar() {
  return (
    <nav className="mobile-bar">
      <NavLink to="/app" end className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}>
        <HomeIcon />
        <span>Hoy</span>
      </NavLink>
      <NavLink to="/app/mapa" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}>
        <MapIcon />
        <span>Mapa</span>
      </NavLink>
      <NavLink to="/app/practicar" className="mb-item cta" aria-label="Practicar">
        <MicIcon size={24} />
        <span>Practicar</span>
      </NavLink>
      <NavLink to="/app/historial" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}>
        <ClockIcon />
        <span>Historial</span>
      </NavLink>
      <NavLink to="/app/perfil" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}>
        <UserIcon />
        <span>Perfil</span>
      </NavLink>
    </nav>
  )
}

function HoyView() {
  return (
    <div className="view">
      <div className="view-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="eyebrow" style={{ color: 'var(--primary-dark)' }}>Buen día, Lautaro</span>
        </div>
        <h2>Hoy te toca una charla de 7 minutos.</h2>
        <div className="sub">
          Tu tutor activo es <strong style={{ color: 'var(--fg-1)' }}>The Sincerist</strong>. Foco del día:{' '}
          <strong style={{ color: 'var(--fg-1)' }}>verbos irregulares en pasado simple</strong>.
        </div>
      </div>

      <div className="today-grid">
        <div className="mission-card">
          <div className="mission-card-content">
            <div className="mission-meta">
              <span className="pill pill-dark" style={{ background: 'rgba(255,255,255,.1)' }}>Misión del día</span>
              <span className="pill pill-dark" style={{ background: 'rgba(255,255,255,.1)' }}>UK Garage · B2</span>
              <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockIcon size={13} />
                7 min sugeridos
              </span>
            </div>
            <h3>Producción de UK Garage en los 90.</h3>
            <p>
              Vas a contar la historia del género. La IA va a forzar contextos narrativos en pasado —{' '}
              <strong>foco en verbos irregulares</strong>. Sin interrupciones; feedback al cierre.
            </p>
            <div className="actions">
              <Link to="/app/practicar" className="btn btn-primary btn-lg">
                <MicIcon size={18} fill="white" stroke="white" />
                Empezar charla
              </Link>
              <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,.85)' }}>Cambiar tópico</button>
            </div>
          </div>
        </div>

        <div className="streak-panel">
          <div className="card week-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Tu semana</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }} className="tnum">13 al 19 may</div>
            </div>
            <div className="week-days">
              {(['L', 'M', 'M'] as const).map((d, i) => (
                <div key={`on-${i}`} className="day on">
                  <div className="l">{d}</div>
                  <div className="b">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              ))}
              <div className="day today">
                <div className="l">J</div>
                <div className="b" style={{ background: 'var(--ink-1)', color: 'white', fontWeight: 800, fontSize: 12 }}>·</div>
              </div>
              {(['V', 'S', 'D'] as const).map((d) => (
                <div key={d} className="day">
                  <div className="l">{d}</div>
                  <div className="b"></div>
                </div>
              ))}
            </div>
            <div className="week-summary">
              <b>3 charlas seguidas</b> esta semana · tu fluidez subió <b style={{ color: 'var(--primary-dark)' }}>+8%</b>.
            </div>
          </div>

          <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, var(--accent-tint) 0%, #FFEDB3 100%)', border: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#FFB800">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17h2.4a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1-3-2-4-2-2-1.5-4 .5-6-3.5 0-7 3-7 7 0 1 .5 2.5 1 3.1z" />
              </svg>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#7A4F00' }} className="tnum">12 días seguidos</div>
                <div style={{ fontSize: 12, color: '#8A5A00' }}>Tu mejor racha. No la rompas hoy.</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, border: '1px dashed var(--border-2)', background: 'transparent' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FCE8E9', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#B42127' }}>Punto débil detectado</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2, lineHeight: 1.4 }}>
                  Tropezás con verbos irregulares 3 sesiones seguidas. Probable misión de rescate mañana.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="qp-row">
        <div className="qp-head">
          <div className="eyebrow">También podés practicar</div>
          <button className="btn btn-ghost btn-sm">Ver todo →</button>
        </div>
        <div className="qp-grid">
          <QpCard icoBg="var(--accent-tint)" title="2 min Arcade" sub="Charla express · velocidad alta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFB800">
              <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
            </svg>
          </QpCard>
          <QpCard icoBg="#FCE8E9" title="Repaso de errores" sub="3 puntos débiles activos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="#E5484D" />
            </svg>
          </QpCard>
          <QpCard icoBg="#E6EFFF" title="Solo escuchar" sub="Acentos UK · podcast 4 min">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6m0 0a3 3 0 0 1-3 3h-1v-7h4zm-18 0a3 3 0 0 0 3 3h1v-7H3z" />
            </svg>
          </QpCard>
          <QpCard icoBg="var(--primary-tint)" title="Tema libre" sub="Vos elegís de qué hablar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            </svg>
          </QpCard>
        </div>
      </div>

      <div className="recent">
        <div className="qp-head">
          <div className="eyebrow">Últimas sesiones</div>
          <Link to="/app/historial" className="btn btn-ghost btn-sm">Ver historial →</Link>
        </div>
        <div className="recent-list">
          <RecentRow dayLabel="Ayer" time="16:42" title="UK Garage · Producción musical" topic="The Sincerist · 6 min 12 s · 14 palabras nuevas" pillText="+10% fluidez" pillClass="pill-primary" score={87} />
          <RecentRow dayLabel="Mar" time="09:18" title="Arquitectura de software · microservicios" topic="The Sincerist · 8 min 04 s · sin errores fonéticos" pillText="+4%" pillClass="pill-primary" score={82} />
          <RecentRow dayLabel="Lun" time="20:50" title="Viajes · aeropuertos en horarios pico" topic="The Coach · 5 min 33 s · 9 palabras nuevas" pillText="2 a pulir" pillClass="pill-accent" score={76} />
        </div>
      </div>
    </div>
  )
}

function QpCard({ icoBg, title, sub, children }: { icoBg: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <Link to="/app/practicar" className="qp-card">
      <div className="ico" style={{ background: icoBg }}>{children}</div>
      <h4>{title}</h4>
      <div className="s">{sub}</div>
    </Link>
  )
}

function RecentRow({
  dayLabel, time, title, topic, pillText, pillClass, score,
}: { dayLabel: string; time: string; title: string; topic: string; pillText: string; pillClass: string; score: number }) {
  return (
    <div className="recent-row">
      <div className="when"><span className="day-l">{dayLabel}</span> {time}</div>
      <div>
        <div className="title">{title}</div>
        <div className="topic">{topic}</div>
      </div>
      <div><span className={`pill ${pillClass}`}>{pillText}</span></div>
      <div className="score">{score}</div>
    </div>
  )
}

function PracticarView() {
  return (
    <div className="convo-view">
      <div className="convo-stage">
        <div className="convo-header">
          <div>
            <h2>UK Garage · Historia y producción</h2>
            <div className="meta">
              <span className="live">The Sincerist</span>
              <span>B2 · es ← en</span>
              <span className="tnum">03:42</span>
            </div>
          </div>
          <Link to="/app" className="btn btn-sm end">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Terminar
          </Link>
        </div>

        <div className="convo-orb-area">
          <div className="convo-orb"></div>
          <div className="convo-turn">
            <div className="l">Tu turno</div>
            <div className="q">"And then producers in South London <b>started to mix</b> two-step rhythms with…"</div>
          </div>

          <div className="challenge-float">
            <div className="ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFB800">
                <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
              </svg>
            </div>
            <div>
              <div className="lbl">Reto · vocabulario</div>
              <div className="text">Incorporá <strong>"nevertheless"</strong> en tu próxima idea.</div>
            </div>
          </div>
        </div>

        <div className="mic-row">
          <div className="mic-wave" style={{ flex: '0 0 auto' }}>
            {[40, 70, 50, 90, 60, 100, 80, 50, 30, 70, 95, 60, 40, 80, 55, 90, 65, 45].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(232,236,234,.6)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E5484D' }}></span>
            <span className="tnum">GRABANDO · 0:24</span>
          </div>
          <div className="mic-controls">
            <button className="mic-btn pause" aria-label="Pausa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
            <button className="mic-btn stop" aria-label="Cortar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <aside className="convo-side">
        <div className="side-tabs">
          <div className="side-tab active">Transcripción</div>
          <div className="side-tab">Métricas en vivo</div>
        </div>
        <div className="side-body">
          <div className="line ai">Hi Lautaro. Let's dive in — what do you think made UK Garage stand out in the late '90s?</div>
          <div className="line you">I think it was the rhythm. Producers mixed two-step with R&amp;B vocals.</div>
          <div className="line ai">Tell me how it actually emerged. Walk me through who started it.</div>
          <div className="line you">
            Producers in South London started to mixing the rhythms…
            <span className="err">⚠️ pasado simple · "started to mixing"</span>
          </div>
          <div className="line ai">Keep going — paint the picture.</div>
          <div className="line you">
            And then they sampled vocals from US house, and the sound was very different.
            <span className="ok">✓ keyword: sampled</span>
          </div>
        </div>
        <div className="side-stats">
          <div className="side-stat-row"><span>Palabras dichas</span><b>184</b></div>
          <div className="side-stat-row"><span>WPM</span><b>146</b></div>
          <div className="side-stat-row"><span>Keywords usadas</span><b>9 / 17</b></div>
          <div className="side-stat-row"><span>Errores detectados</span><b style={{ color: '#FF8E91' }}>2</b></div>
        </div>
      </aside>
    </div>
  )
}

function MapaView() {
  return (
    <div className="view">
      <div className="view-head">
        <h2>Mapa de progreso</h2>
        <div className="sub">Tu camino dentro de cada tópico activo. Las etapas se desbloquean con charlas exitosas.</div>
      </div>

      <div className="map-tabs">
        <div className="map-tab active">Música electrónica · UK Garage</div>
        <div className="map-tab">Arquitectura de software</div>
        <div className="map-tab">Viajes</div>
        <div className="map-tab">+ Agregar</div>
      </div>

      <div className="map-grid">
        <div className="map-trail">
          <Stage kind="done" title="Producción musical · Introducción" label="Completa" meta="3 charlas · promedio 84/100" />
          <Stage kind="done" title="Géneros británicos · House" label="Completa" meta="2 charlas · vocabulario consolidado" />
          <Stage kind="current" title="UK Garage · Historia y producción" label="Acá estás" meta="3 charlas para completar · 1 hecha" />
          <Stage kind="locked-soon" title="Dubstep · Origen y producción" label="Próxima · etapa 4" meta="Se desbloquea al terminar UK Garage" ballText="4" />
          <Stage kind="locked" title="Crítica musical · Reseñas" label="Etapa 5" />
          <Stage kind="locked" title="Industria · Sellos discográficos" label="Etapa 6" />
        </div>

        <div className="topic-panel">
          <div className="topic-progress">
            <div className="row">
              <h3>Tu progreso en este tópico</h3>
              <span className="pct">38%</span>
            </div>
            <div className="bar"><div style={{ width: '38%' }} /></div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>2 de 6 etapas completas · 6 charlas totales · 47 min hablados</div>
          </div>

          <div className="weak-points">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A3D00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
              </svg>
              Puntos débiles en este tópico
            </h4>
            <ul>
              <li><span>Verbos irregulares · pasado simple</span><span className="count">3×</span></li>
              <li><span>Pronunciación /ʒ/ (garage)</span><span className="count">2×</span></li>
              <li><span>Voz pasiva con "was sampled"</span><span className="count">2×</span></li>
            </ul>
          </div>

          <div className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-tint)', display: 'grid', placeItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Próximo hito</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>2 charlas para completar este tópico</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.4 }}>
              Al terminar UK Garage vas a desbloquear <b>Dubstep · Origen y producción</b> y ganar el badge <b>Music Connoisseur</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stage({
  kind, title, label, meta, ballText,
}: { kind: 'done' | 'current' | 'locked-soon' | 'locked'; title: string; label: string; meta?: string; ballText?: string }) {
  const className = `stage${kind === 'locked' ? '' : ` ${kind}`}`
  let ball: React.ReactNode
  if (kind === 'done') {
    ball = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  } else if (kind === 'current') {
    ball = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)">
        <rect x="9" y="2" width="6" height="12" rx="3" />
      </svg>
    )
  } else if (kind === 'locked-soon') {
    ball = ballText
  } else {
    ball = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  }
  return (
    <div className={className}>
      <div className="ball">{ball}</div>
      <div className="body">
        <div className="l">{label}</div>
        <h4>{title}</h4>
        {meta && <div className="meta">{meta}</div>}
      </div>
    </div>
  )
}

function HistorialView() {
  return (
    <div className="view">
      <div className="view-head">
        <h2>Historial de sesiones</h2>
        <div className="sub">47 charlas · 5 h 42 min hablados desde que empezaste · 14 mar 2026.</div>
      </div>

      <div className="history-controls">
        <div className="search">
          <SearchIcon />
          <input placeholder="Buscar por tópico o palabra clave" />
        </div>
        <button className="btn btn-secondary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Tutor
        </button>
        <button className="btn btn-secondary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Tópico
        </button>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>Ordenar: Más recientes</button>
      </div>

      <div className="history-grid">
        <HistoryRow dayLabel="Ayer" time="16:42" title="UK Garage · Historia y producción" tutor="The Sincerist" dur="6 min 12 s" lvl="B2" fluidez="+10%" fluidezKind="up" pron="92%" score="87" />
        <HistoryRow dayLabel="Mar 14" time="09:18" title="Arquitectura de software · microservicios" tutor="The Sincerist" dur="8 min 04 s" lvl="B2" fluidez="+4%" fluidezKind="up" pron="88%" score="82" />
        <HistoryRow dayLabel="Lun 13" time="20:50" title="Viajes · aeropuertos en horarios pico" tutor="The Coach" dur="5 min 33 s" lvl="B2" fluidez="-2%" fluidezKind="down" pron="79%" score="76" />
        <HistoryRow dayLabel="Dom 12" time="11:02" title="Producción musical · Ableton workflow" tutor="The Sincerist" dur="7 min 21 s" lvl="B2" fluidez="+6%" fluidezKind="up" pron="85%" score="81" />
        <HistoryRow dayLabel="Sáb 11" time="14:30" title="⚠ Misión de rescate · Pasado simple" tutor="The Sincerist" dur="9 min 12 s" lvl="Forzada" fluidez="8/8" fluidezKind="up" fluidezLabel="Aciertos" pron="90%" score="94" highlight />
        <HistoryRow dayLabel="Vie 10" time="19:48" title="Cine de los 90 · Tarantino" tutor="The Arcade" dur="3 min 18 s" lvl="B2" fluidez="+2%" fluidezKind="up" pron="81%" score="79" />
      </div>
    </div>
  )
}

function HistoryRow({
  dayLabel, time, title, tutor, dur, lvl, fluidez, fluidezKind, fluidezLabel = 'Fluidez', pron, score, highlight,
}: {
  dayLabel: string; time: string; title: string; tutor: string; dur: string; lvl: string;
  fluidez: string; fluidezKind: 'up' | 'down'; fluidezLabel?: string;
  pron: string; score: string; highlight?: boolean
}) {
  return (
    <div className="history-row" style={highlight ? { background: '#FFF7E5', borderColor: 'rgba(255,184,0,.3)' } : undefined}>
      <div className="when"><b>{dayLabel}</b>{time}</div>
      <div>
        <div className="h-title">{title}</div>
        <div className="h-topic">
          <span>{tutor}</span><span>·</span><span>{dur}</span><span>·</span><span>{lvl}</span>
        </div>
      </div>
      <div className="metric"><span className="l">{fluidezLabel}</span><span className={`v ${fluidezKind}`}>{fluidez}</span></div>
      <div className="metric"><span className="l">Pron.</span><span className="v">{pron}</span></div>
      <div className="metric"><span className="l">Score</span><span className="v">{score}</span></div>
      <button className="icon-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

function PerfilView() {
  return (
    <div className="view">
      <div className="view-head">
        <h2>Tu perfil</h2>
        <div className="sub">Tutor activo, intereses, configuración y datos de cuenta.</div>
      </div>

      <div className="profile-grid">
        <div className="profile-header">
          <div className="av">L</div>
          <div style={{ flex: 1 }}>
            <h2>Lautaro Méndez</h2>
            <div className="meta">Inglés · B2 · 47 charlas · miembro desde mar 2026</div>
          </div>
          <button className="btn btn-secondary btn-sm">Editar</button>
        </div>

        <div className="profile-card">
          <h3>Tutor activo</h3>
          <div className="tutor-active">
            <div className="av">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
              </svg>
            </div>
            <div className="body">
              <div className="n">The Sincerist</div>
              <div className="d">Directo · rigurosidad alta · sin interrupciones</div>
            </div>
            <span className="pill pill-primary">En uso</span>
          </div>
          <div className="tutor-list">
            <div className="tutor-opt">
              <div className="dot"></div>
              <div className="ico" style={{ background: 'var(--primary)' }}>♥</div>
              <div className="body">
                <div className="n">The Coach</div>
                <div className="d">Empático · paciente · no penaliza</div>
              </div>
            </div>
            <div className="tutor-opt selected">
              <div className="dot"></div>
              <div className="ico" style={{ background: '#5A6BFF' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
                </svg>
              </div>
              <div className="body">
                <div className="n">The Sincerist</div>
                <div className="d">Profesional · directo · evalúa todo</div>
              </div>
            </div>
            <div className="tutor-opt">
              <div className="dot"></div>
              <div className="ico" style={{ background: 'var(--accent)', color: '#5A3D00' }}>⚡</div>
              <div className="body">
                <div className="n">The Arcade</div>
                <div className="d">Lúdico · veloz · recompensas constantes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>Tus intereses</h3>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 8 }}>Estos punteros alimentan cada charla.</div>
          <div className="interest-chips">
            {['Arquitectura de software', 'Música electrónica', 'Producción musical', 'Viajes'].map((c) => (
              <span key={c} className="chip">{c} <span className="x">×</span></span>
            ))}
            <span className="chip add">+ agregar</span>
          </div>
          <hr style={{ border: 0, height: 1, background: 'var(--border-1)', margin: '16px 0' }} />
          <h3 style={{ fontSize: 14 }}>Sugeridos según tu perfil</h3>
          <div className="interest-chips" style={{ marginTop: 8 }}>
            {['IA generativa', 'Metodologías ágiles', 'Cine de los 90'].map((c) => (
              <span key={c} className="chip" style={{ background: 'var(--bg-2)', color: 'var(--fg-2)' }}>{c}</span>
            ))}
          </div>
        </div>

        <div className="profile-card">
          <h3>Configuración</h3>
          <div className="settings-list">
            <SettingsRow label="Acento del tutor" sub="Cómo te suena la IA" value="British (UK)" />
            <SettingsRow label="Recordatorio diario" sub="08:00 · cada día" switchOn />
            <SettingsRow label="Duración objetivo" sub="Cuánto querés hablar por sesión" value="7 min" />
            <SettingsRow label="Privacidad de audio" sub="Cuándo borramos lo que grabás" value="Tras 30 días" />
            <SettingsRow label="Modo insistente" sub="Forzar misiones de rescate al detectar errores repetidos" switchOn />
          </div>
        </div>

        <div className="profile-card">
          <h3>Cuenta y plan</h3>
          <div style={{ padding: 14, background: 'linear-gradient(135deg, var(--primary-tint) 0%, white 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800 }}>Pro</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Plan Pro · activo</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>US$ 12 / mes · próximo cobro 14 jun</div>
            </div>
            <button className="btn btn-secondary btn-sm">Gestionar</button>
          </div>
          <div className="settings-list">
            <SettingsRow label="lautaro@hablah.com" sub="Email principal" value="Cambiar" />
            <SettingsRow label="Exportar datos" sub="Tus charlas, métricas, transcripciones" value="Descargar" />
            <SettingsRow label="Cerrar cuenta" sub="No se puede deshacer" danger />
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsRow({
  label, sub, value, switchOn, danger,
}: { label: string; sub: string; value?: string; switchOn?: boolean; danger?: boolean }) {
  return (
    <div className="settings-row">
      <div className="ico" style={danger ? { background: '#FCE8E9', color: '#B42127' } : undefined}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <div className="body">
        <div className="l" style={danger ? { color: '#B42127' } : undefined}>{label}</div>
        <div className="s">{sub}</div>
      </div>
      {switchOn !== undefined ? <div className={`switch${switchOn ? '' : ' off'}`}></div> : value ? <span className="v">{value}</span> : null}
    </div>
  )
}
