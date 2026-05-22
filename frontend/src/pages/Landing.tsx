import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Flame,
  Gamepad2,
  Gauge,
  Globe,
  Heart,
  Instagram,
  Languages,
  Linkedin,
  Menu,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Star,
  Timer,
  Twitter,
  X as XIcon,
  Zap,
} from 'lucide-react'

const LANDING_CSS = `
.landing-root {
  --primary:      #00B37E;
  --primary-dark: #008F63;
  --primary-tint: #E6F7F1;
  --accent:       #FFB800;
  --accent-tint:  #FFF4D6;
  --danger:       #E5484D;
  --info:         #3B82F6;

  --bg-1:    #FAFBFA;
  --bg-2:    #F2F4F1;
  --bg-3:    #EAEDE8;
  --surface: #FFFFFF;
  --border-1: rgba(13,20,18,0.08);
  --border-2: rgba(13,20,18,0.14);

  --fg-1: #0D1412;
  --fg-2: #2D3431;
  --fg-3: #5A625F;
  --fg-4: #8E938F;

  --ink-1: #0E1614;
  --ink-2: #19211E;

  --t-xs: 11px;   --t-sm: 13px;  --t-base: 16px;
  --t-lg: 20px;   --t-xl: 25px;  --t-2xl: 31px;
  --t-3xl: 39px;  --t-4xl: 49px; --t-5xl: 61px; --t-6xl: 76px;
  --lh-tight: 1.1; --lh-base: 1.25; --lh-relax: 1.5;

  --r-md: 10px;  --r-lg: 12px;  --r-xl: 16px;
  --r-2xl: 20px; --r-3xl: 28px; --r-pill: 999px;

  --shadow-card:  0 1px 2px rgba(13,20,18,.04), 0 2px 6px rgba(13,20,18,.04);
  --shadow-float: 0 6px 20px rgba(13,20,18,.10), 0 2px 6px rgba(13,20,18,.06);
  --shadow-lift:  0 14px 40px rgba(13,20,18,.14), 0 4px 12px rgba(13,20,18,.06);

  --ease: cubic-bezier(.2,.8,.2,1);

  --container-w: 1200px;
  --gutter: 24px;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: var(--t-base);
  line-height: var(--lh-base);
  color: var(--fg-1);
  background: var(--bg-1);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'cv11','ss01','tnum';
}
.landing-root * { box-sizing: border-box; }
.landing-root img, .landing-root svg { display: block; max-width: 100%; }
.landing-root a { color: inherit; text-decoration: none; }
.landing-root button { font-family: inherit; }

.landing-root .container {
  max-width: var(--container-w);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

.landing-root .btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; font-weight: 600; font-size: var(--t-base);
  border-radius: var(--r-lg); padding: 14px 22px;
  border: 1px solid transparent; cursor: pointer;
  transition: all .15s var(--ease); white-space: nowrap; line-height: 1;
}
.landing-root .btn-primary { background: var(--primary); color: white; }
.landing-root .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,179,126,.3); }
.landing-root .btn-dark { background: var(--ink-1); color: white; }
.landing-root .btn-dark:hover { background: var(--ink-2); }
.landing-root .btn-ghost { background: transparent; color: var(--fg-2); }
.landing-root .btn-ghost:hover { background: var(--bg-2); }
.landing-root .btn-outline { background: transparent; color: var(--fg-1); border-color: var(--border-2); }
.landing-root .btn-outline:hover { background: var(--bg-2); }
.landing-root .btn-light { background: white; color: var(--primary-dark); }
.landing-root .btn-light:hover { background: var(--bg-2); }
.landing-root .btn-lg { padding: 18px 28px; font-size: var(--t-lg); }
.landing-root .btn-sm { padding: 8px 14px; font-size: var(--t-sm); }
.landing-root .btn-block { display: flex; width: 100%; }

.landing-root .pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: var(--r-pill);
  font-size: var(--t-xs); font-weight: 700; letter-spacing: .02em;
  background: var(--bg-2); color: var(--fg-2);
}
.landing-root .eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: var(--primary-dark);
}

.landing-root .nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(250,251,250,.86);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-1);
}
.landing-root .nav-inner { display: flex; align-items: center; gap: 24px; height: 64px; }
.landing-root .logo { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 18px; letter-spacing: -.01em; }
.landing-root .logo-mark {
  width: 30px; height: 30px; border-radius: 8px; display: block; flex-shrink: 0;
}
.landing-root .nav-links { display: flex; gap: 4px; margin-left: 24px; }
.landing-root .nav-links a { padding: 8px 14px; border-radius: var(--r-md); font-size: 14px; font-weight: 500; color: var(--fg-2); }
.landing-root .nav-links a:hover { background: var(--bg-2); color: var(--fg-1); }
.landing-root .nav-cta { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.landing-root .nav-toggle { display: none; background: transparent; border: 0; cursor: pointer; }

.landing-root .hero { position: relative; padding: 80px 0 100px; overflow: hidden; }
.landing-root .hero-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 80px; align-items: center; }
.landing-root .hero-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px; background: var(--surface);
  border: 1px solid var(--border-1); border-radius: var(--r-pill);
  box-shadow: var(--shadow-card); font-size: 13px; font-weight: 500;
  color: var(--fg-2); margin-bottom: 24px;
}
.landing-root .hero-pill .dot {
  background: var(--primary-tint); color: var(--primary-dark);
  padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
  letter-spacing: .04em;
}
.landing-root .hero h1 {
  font-size: clamp(38px, 6vw, 76px);
  line-height: 1.02; letter-spacing: -.035em; font-weight: 800;
  margin: 0 0 24px;
}
.landing-root .hero h1 em {
  font-style: normal;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.landing-root .hero h1 .strike { text-decoration: none; position: relative; color: var(--fg-3); font-weight: 600; display: inline-block; }
.landing-root .hero h1 .strike::after {
  content: ''; position: absolute; left: -2%; right: -2%; top: 54%; height: 3px;
  background: var(--accent); transform: rotate(-2deg); border-radius: 2px;
}
.landing-root .hero p { font-size: var(--t-xl); color: var(--fg-2); line-height: 1.4; margin: 0 0 32px; max-width: 540px; }
.landing-root .hero-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.landing-root .hero-actions .meta { font-size: 13px; color: var(--fg-3); display: flex; gap: 14px; flex-wrap: wrap; margin-top: 20px; width: 100%; }
.landing-root .hero-actions .meta b { color: var(--fg-1); font-weight: 600; }
.landing-root .hero-actions .meta span { display: inline-flex; align-items: center; gap: 6px; }

.landing-root .hero-phone-wrap { position: relative; display: flex; justify-content: center; perspective: 1200px; }
.landing-root .hero-phone {
  width: 320px; height: 660px; border-radius: 44px; background: var(--ink-1);
  padding: 8px; box-shadow: 0 30px 80px rgba(13,20,18,.25), 0 8px 24px rgba(13,20,18,.12);
  transform: rotate(-1.5deg); position: relative;
}
.landing-root .hero-phone .pscreen {
  width: 100%; height: 100%; border-radius: 36px; background: var(--ink-1);
  overflow: hidden; color: white; position: relative;
  display: flex; flex-direction: column;
}
.landing-root .hero-phone .notch {
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 90px; height: 26px; background: black; border-radius: 999px; z-index: 5;
}
.landing-root .phone-status { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px 0; color: white; font-size: 13px; font-weight: 600; }
.landing-root .phone-status .icons { display: flex; gap: 5px; opacity: .9; }
.landing-root .phone-status .icons span { display: block; width: 4px; height: 8px; background: white; border-radius: 1px; }
.landing-root .phone-status .icons span:nth-child(2) { height: 10px; }
.landing-root .phone-status .icons span:nth-child(3) { height: 12px; }

.landing-root .phone-orb {
  margin: 60px auto 24px; width: 180px; height: 180px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--primary) 0%, var(--primary-dark) 60%, #003E2B 100%);
  box-shadow: 0 20px 60px rgba(0,179,126,.4); position: relative;
}
.landing-root .phone-orb::after, .landing-root .phone-orb::before {
  content: ''; position: absolute; inset: -16px; border-radius: 50%;
  border: 1px solid rgba(0,179,126,.3);
}
.landing-root .phone-orb::before { inset: -36px; border-color: rgba(0,179,126,.15); }

.landing-root .phone-label { text-align: center; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(232,236,234,.5); margin-top: 4px; }
.landing-root .phone-quote { text-align: center; padding: 12px 24px 0; font-size: 14px; color: rgba(232,236,234,.78); font-style: italic; line-height: 1.4; }
.landing-root .phone-quote b { color: white; font-style: normal; font-weight: 600; }

.landing-root .phone-challenge {
  margin: auto 16px 16px;
  background: linear-gradient(135deg, rgba(255,184,0,.18), rgba(255,184,0,.06));
  border: 1px solid rgba(255,184,0,.35);
  border-radius: 14px; padding: 12px 14px;
  display: flex; gap: 10px; align-items: flex-start;
}
.landing-root .phone-challenge .ico {
  width: 28px; height: 28px; border-radius: 8px; background: rgba(255,184,0,.22);
  display: grid; place-items: center; flex-shrink: 0;
  color: var(--accent);
}
.landing-root .phone-challenge .body { font-size: 13px; }
.landing-root .phone-challenge .body .lbl { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--accent); text-transform: uppercase; }
.landing-root .phone-challenge .body strong { color: var(--accent); }

.landing-root .phone-bottom { display: flex; align-items: center; gap: 10px; padding: 8px 16px 24px; }
.landing-root .phone-mic-bar {
  flex: 1; height: 48px; border-radius: 999px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  display: flex; align-items: center; gap: 4px; padding: 0 16px;
}
.landing-root .phone-mic-bar i { display: block; width: 3px; background: var(--primary); border-radius: 2px; }
.landing-root .phone-mic-bar i:nth-child(1) { height: 40%; } .landing-root .phone-mic-bar i:nth-child(2) { height: 70%; }
.landing-root .phone-mic-bar i:nth-child(3) { height: 50%; } .landing-root .phone-mic-bar i:nth-child(4) { height: 90%; }
.landing-root .phone-mic-bar i:nth-child(5) { height: 60%; } .landing-root .phone-mic-bar i:nth-child(6) { height: 100%; }
.landing-root .phone-mic-bar i:nth-child(7) { height: 80%; } .landing-root .phone-mic-bar i:nth-child(8) { height: 50%; }
.landing-root .phone-mic-bar i:nth-child(9) { height: 30%; } .landing-root .phone-mic-bar i:nth-child(10) { height: 70%; }
.landing-root .phone-mic-bar i:nth-child(11) { height: 95%; } .landing-root .phone-mic-bar i:nth-child(12) { height: 60%; }
.landing-root .phone-mic-bar i:nth-child(13) { height: 40%; } .landing-root .phone-mic-bar i:nth-child(14) { height: 80%; }
.landing-root .phone-stop { width: 48px; height: 48px; border-radius: 999px; background: var(--danger); display: grid; place-items: center; color: white; }

.landing-root .hero-badge {
  position: absolute; background: white; padding: 12px 16px;
  border-radius: var(--r-lg); box-shadow: var(--shadow-float);
  display: flex; align-items: center; gap: 10px; font-size: 13px;
}
.landing-root .hero-badge .ico { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; }
.landing-root .hero-badge.b1 { top: 60px; left: -30px; }
.landing-root .hero-badge.b1 .ico { background: var(--primary-tint); color: var(--primary-dark); font-weight: 800; font-size: 13px; }
.landing-root .hero-badge.b2 { bottom: 100px; right: -20px; }
.landing-root .hero-badge.b2 .ico { background: var(--accent-tint); color: #8A5A00; }
.landing-root .hero-badge .small { font-size: 11px; color: var(--fg-3); }

.landing-root .pillars { padding: 32px 0; background: var(--bg-2); border-top: 1px solid var(--border-1); border-bottom: 1px solid var(--border-1); }
.landing-root .pillars-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
.landing-root .pillar { display: flex; align-items: center; gap: 14px; }
.landing-root .pillar .ico { width: 40px; height: 40px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border-1); display: grid; place-items: center; color: var(--primary-dark); flex-shrink: 0; }
.landing-root .pillar .k { font-size: 15px; font-weight: 700; color: var(--fg-1); letter-spacing: -.01em; }
.landing-root .pillar .lbl { font-size: 13px; color: var(--fg-3); max-width: 180px; line-height: 1.35; }

.landing-root section { padding: 100px 0; }
.landing-root .sec-head { max-width: 720px; margin: 0 auto 64px; text-align: center; }
.landing-root .sec-head h2 { font-size: clamp(30px, 4vw, 49px); line-height: 1.08; letter-spacing: -.025em; font-weight: 800; margin: 12px 0 16px; }
.landing-root .sec-head p { font-size: var(--t-lg); color: var(--fg-3); margin: 0; line-height: 1.5; }

.landing-root .how { background: var(--bg-1); }
.landing-root .how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.landing-root .how-card { background: var(--surface); border-radius: var(--r-2xl); padding: 32px; border: 1px solid var(--border-1); position: relative; }
.landing-root .how-card .num { font-size: 14px; font-weight: 800; letter-spacing: .08em; color: var(--primary-dark); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.landing-root .how-card .num::before { content: ''; width: 32px; height: 1px; background: var(--primary); }
.landing-root .how-card h3 { font-size: var(--t-xl); line-height: 1.15; letter-spacing: -.015em; font-weight: 700; margin: 0 0 12px; }
.landing-root .how-card p { font-size: 15px; color: var(--fg-3); line-height: 1.5; margin: 0 0 24px; }

.landing-root .how-viz { height: 160px; border-radius: var(--r-lg); overflow: hidden; background: var(--bg-2); display: flex; align-items: center; justify-content: center; position: relative; }
.landing-root .viz-bubbles { display: flex; flex-direction: column; gap: 8px; padding: 16px; width: 100%; }
.landing-root .viz-bubble { padding: 8px 12px; border-radius: 14px; font-size: 12px; background: var(--surface); align-self: flex-start; max-width: 80%; }
.landing-root .viz-bubble.you { background: var(--primary); color: white; align-self: flex-end; }
.landing-root .viz-cefr { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 0 24px; width: 100%; }
.landing-root .viz-cefr div { height: 60px; border-radius: 8px; background: var(--bg-3); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; font-size: 11px; font-weight: 700; color: var(--fg-3); }
.landing-root .viz-cefr div.active { background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; height: 90px; }
.landing-root .viz-feedback { padding: 16px; width: 100%; display: flex; flex-direction: column; gap: 8px; }
.landing-root .viz-feedback .row { display: flex; gap: 8px; padding: 8px 10px; border-radius: 10px; font-size: 12px; align-items: center; }
.landing-root .viz-feedback .row.bad { background: #FCE8E9; color: #B42127; }
.landing-root .viz-feedback .row.good { background: var(--primary-tint); color: var(--primary-dark); }
.landing-root .viz-feedback .row .mark { display: inline-flex; align-items: center; }

.landing-root .tutors { background: var(--ink-1); color: white; padding: 100px 0; }
.landing-root .tutors .sec-head h2 { color: white; }
.landing-root .tutors .sec-head p { color: rgba(232,236,234,.7); }
.landing-root .tutors .eyebrow { color: var(--primary); }
.landing-root .tutors-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.landing-root .tutor { background: var(--ink-2); border-radius: var(--r-2xl); padding: 32px; border: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 18px; }
.landing-root .tutor.featured { background: linear-gradient(160deg, rgba(0,179,126,.16) 0%, rgba(0,179,126,.02) 100%); border-color: rgba(0,179,126,.4); }
.landing-root .tutor-ico { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; color: white; }
.landing-root .tutor.coach .tutor-ico { background: var(--primary); }
.landing-root .tutor.sincerist .tutor-ico { background: #5A6BFF; }
.landing-root .tutor.arcade .tutor-ico { background: var(--accent); color: #5A3D00; }
.landing-root .tutor h3 { font-size: var(--t-xl); margin: 0; font-weight: 700; letter-spacing: -.01em; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.landing-root .tutor h3 .badge-most { font-size: 11px; color: var(--primary); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; }
.landing-root .tutor .desc { font-size: 14px; color: rgba(232,236,234,.7); margin: 0; line-height: 1.5; }
.landing-root .tutor .meter { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px dashed rgba(255,255,255,.1); }
.landing-root .tutor .meter:last-of-type { border-bottom: 1px dashed rgba(255,255,255,.1); margin-bottom: 8px; }
.landing-root .tutor .meter .k { font-size: 12px; color: rgba(232,236,234,.55); flex: 1; }
.landing-root .tutor .meter .v { display: flex; gap: 3px; }
.landing-root .tutor .meter .v span { width: 16px; height: 5px; border-radius: 2px; background: rgba(255,255,255,.15); }
.landing-root .tutor .meter .v span.on { background: var(--primary); }
.landing-root .tutor.arcade .meter .v span.on { background: var(--accent); }
.landing-root .tutor.sincerist .meter .v span.on { background: #8A95FF; }
.landing-root .tutor .ideal { margin-top: auto; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 13px; }
.landing-root .tutor .ideal b { color: white; }
.landing-root .tutor .ideal .small { color: rgba(232,236,234,.6); display: block; margin-top: 2px; font-size: 12px; }

.landing-root .topics .sec-head { margin-bottom: 40px; }
.landing-root .topics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.landing-root .topic-card { background: var(--surface); border-radius: var(--r-xl); padding: 24px; border: 1px solid var(--border-1); transition: all .2s var(--ease); cursor: default; }
.landing-root .topic-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); border-color: var(--primary-tint); }
.landing-root .topic-card .cat { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--primary-dark); margin-bottom: 8px; }
.landing-root .topic-card h4 { font-size: 17px; font-weight: 700; margin: 0 0 16px; line-height: 1.25; }
.landing-root .topic-card .tags { display: flex; flex-wrap: wrap; gap: 4px; }
.landing-root .topic-card .tags span { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--bg-2); color: var(--fg-3); }
.landing-root .topics-more { text-align: center; margin-top: 40px; font-size: 15px; color: var(--fg-3); }
.landing-root .topics-more b { color: var(--fg-1); }

.landing-root .feature { padding: 100px 0; }
.landing-root .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.landing-root .feature.reverse .feature-grid { direction: rtl; }
.landing-root .feature.reverse .feature-grid > * { direction: ltr; }
.landing-root .feature h2 { font-size: clamp(28px, 3.4vw, 39px); line-height: 1.12; letter-spacing: -.02em; font-weight: 800; margin: 12px 0 16px; }
.landing-root .feature p { font-size: var(--t-lg); color: var(--fg-3); line-height: 1.5; margin: 0 0 24px; }
.landing-root .feature ul { list-style: none; padding: 0; margin: 0; }
.landing-root .feature ul li { display: flex; gap: 10px; padding: 8px 0; font-size: 15px; color: var(--fg-2); align-items: flex-start; }
.landing-root .feature ul li .li-ico { color: var(--primary); flex-shrink: 0; margin-top: 3px; }

.landing-root .mock-report { background: white; border-radius: var(--r-2xl); padding: 0; box-shadow: var(--shadow-lift); overflow: hidden; max-width: 460px; margin: 0 auto; }
.landing-root .mock-report .head { background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 24px 24px 32px; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; }
.landing-root .mock-report .head .lbl { font-size: 12px; font-weight: 600; opacity: .9; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px; }
.landing-root .mock-report .head h3 { font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -.015em; }
.landing-root .mock-report .head p { font-size: 14px; opacity: .9; margin: 0 0 16px; }
.landing-root .mock-report .head .stats { display: flex; gap: 8px; }
.landing-root .mock-report .head .stats div { flex: 1; background: rgba(255,255,255,.13); border-radius: 12px; padding: 10px 12px; }
.landing-root .mock-report .head .stats .v { font-size: 18px; font-weight: 800; }
.landing-root .mock-report .head .stats .k { font-size: 11px; opacity: .85; }
.landing-root .mock-report .body { padding: 20px 24px; }
.landing-root .mock-report .body .feed { border: 1px solid var(--border-1); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.landing-root .mock-report .body .feed .type { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: var(--fg-3); text-transform: uppercase; margin-bottom: 8px; }
.landing-root .mock-report .body .feed .bad, .landing-root .mock-report .body .feed .good { padding: 10px; border-radius: 8px; font-size: 13px; display: flex; gap: 8px; margin-bottom: 6px; align-items: center; }
.landing-root .mock-report .body .feed .bad { background: #FCE8E9; color: #5A1F22; }
.landing-root .mock-report .body .feed .good { background: var(--primary-tint); color: #024E36; }
.landing-root .mock-report .body .feed .listen { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; background: var(--primary-dark); color: white; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }

.landing-root .mock-rescue { background: white; border-radius: var(--r-2xl); padding: 28px; box-shadow: var(--shadow-lift); max-width: 420px; margin: 0 auto; border: 2px solid #FFE9A0; }
.landing-root .mock-rescue .ico-big { width: 64px; height: 64px; border-radius: 20px; background: #FCE8E9; display: grid; place-items: center; margin: 0 auto 16px; color: var(--danger); }
.landing-root .mock-rescue h3 { text-align: center; font-size: 24px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 6px; }
.landing-root .mock-rescue .sub { text-align: center; color: var(--fg-3); font-size: 14px; margin: 0 0 20px; }
.landing-root .mock-rescue .weak { background: #FFF7E5; border: 1px solid rgba(255,184,0,.35); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.landing-root .mock-rescue .weak .l { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8A5A00; }
.landing-root .mock-rescue .weak .t { font-size: 16px; font-weight: 700; margin-top: 2px; }
.landing-root .mock-rescue .weak .s { font-size: 13px; color: var(--fg-3); margin-top: 4px; font-style: italic; }
.landing-root .mock-rescue .list { padding: 0; margin: 0; list-style: none; }
.landing-root .mock-rescue .list li { display: flex; gap: 10px; padding: 5px 0; font-size: 14px; align-items: flex-start; }
.landing-root .mock-rescue .list li .li-ico { color: var(--primary); flex-shrink: 0; margin-top: 3px; }

.landing-root .for-who { background: var(--bg-2); }
.landing-root .for-who-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.landing-root .for-who-card { background: var(--surface); border-radius: var(--r-2xl); padding: 32px; border: 1px solid var(--border-1); display: flex; flex-direction: column; gap: 16px; }
.landing-root .for-who-card .ico { width: 48px; height: 48px; border-radius: 12px; background: var(--primary-tint); color: var(--primary-dark); display: grid; place-items: center; }
.landing-root .for-who-card h3 { font-size: var(--t-xl); margin: 0; font-weight: 700; letter-spacing: -.015em; }
.landing-root .for-who-card .scenario { font-size: 14px; color: var(--fg-3); line-height: 1.5; margin: 0; font-style: italic; }
.landing-root .for-who-card .fit { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-1); font-size: 13px; color: var(--fg-2); }
.landing-root .for-who-card .fit b { color: var(--fg-1); }

.landing-root .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
.landing-root .price-card { background: var(--surface); border-radius: var(--r-2xl); padding: 32px; border: 1px solid var(--border-1); display: flex; flex-direction: column; gap: 16px; position: relative; }
.landing-root .price-card.featured { background: var(--ink-1); color: white; border-color: var(--ink-1); transform: scale(1.02); box-shadow: var(--shadow-lift); }
.landing-root .price-card .name { font-size: 14px; font-weight: 700; letter-spacing: .04em; }
.landing-root .price-card .blurb { font-size: 13px; color: var(--fg-3); margin: -8px 0 4px; }
.landing-root .price-card.featured .blurb { color: rgba(232,236,234,.65); }
.landing-root .price-card .price { display: flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
.landing-root .price-card .amount { font-size: 48px; font-weight: 800; letter-spacing: -.025em; line-height: 1; }
.landing-root .price-card .per { font-size: 14px; color: var(--fg-3); }
.landing-root .price-card.featured .per { color: rgba(232,236,234,.65); }
.landing-root .price-card .feats { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.landing-root .price-card .feats li { display: flex; gap: 10px; font-size: 14px; line-height: 1.4; align-items: flex-start; }
.landing-root .price-card .feats li .li-ico { color: var(--primary); flex-shrink: 0; margin-top: 3px; }
.landing-root .price-card .badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #5A3D00; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }

.landing-root .faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 6px; }
.landing-root .faq-item { background: var(--surface); border-radius: var(--r-lg); border: 1px solid var(--border-1); padding: 0; overflow: hidden; }
.landing-root .faq-item details summary { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; font-weight: 600; font-size: 16px; cursor: pointer; list-style: none; gap: 16px; }
.landing-root .faq-item details summary::-webkit-details-marker { display: none; }
.landing-root .faq-item details summary .chev { color: var(--fg-3); transition: transform .25s var(--ease); flex-shrink: 0; }
.landing-root .faq-item details[open] summary .chev { transform: rotate(180deg); color: var(--primary-dark); }
.landing-root .faq-item details p { padding: 0 20px 18px; margin: 0; color: var(--fg-3); font-size: 15px; line-height: 1.5; }

.landing-root .cta-final { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 100px 0; text-align: center; position: relative; overflow: hidden; }
.landing-root .cta-final::before, .landing-root .cta-final::after { content: ''; position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); }
.landing-root .cta-final::before { width: 400px; height: 400px; top: -200px; right: -100px; }
.landing-root .cta-final::after { width: 300px; height: 300px; bottom: -150px; left: -50px; }
.landing-root .cta-final h2 { font-size: clamp(32px, 5vw, 61px); line-height: 1.05; letter-spacing: -.03em; font-weight: 800; margin: 0 0 16px; position: relative; }
.landing-root .cta-final p { font-size: var(--t-xl); opacity: .9; max-width: 540px; margin: 0 auto 32px; position: relative; }
.landing-root .cta-final-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }

.landing-root footer { background: var(--ink-1); color: rgba(232,236,234,.75); padding: 64px 0 32px; }
.landing-root .footer-grid { display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 40px; padding-bottom: 48px; border-bottom: 1px solid rgba(255,255,255,.08); }
.landing-root .footer-col h5 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: rgba(232,236,234,.5); margin: 0 0 14px; font-weight: 700; }
.landing-root .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.landing-root .footer-col a { font-size: 14px; color: rgba(232,236,234,.75); transition: color .15s var(--ease); }
.landing-root .footer-col a:hover { color: white; }
.landing-root .footer-brand .logo { color: white; margin-bottom: 12px; }
.landing-root .footer-brand p { font-size: 13px; color: rgba(232,236,234,.55); line-height: 1.5; margin: 0 0 16px; max-width: 280px; }
.landing-root .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; font-size: 12px; color: rgba(232,236,234,.45); flex-wrap: wrap; gap: 12px; }
.landing-root .social-btn { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,.05); display: grid; place-items: center; color: rgba(232,236,234,.75); transition: all .15s var(--ease); }
.landing-root .social-btn:hover { background: rgba(255,255,255,.12); color: white; }

.landing-root .fade-on-scroll {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity .8s var(--ease), transform .8s var(--ease);
  will-change: opacity, transform;
}
.landing-root .fade-on-scroll.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.landing-root .fade-stagger > * {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity .7s var(--ease), transform .7s var(--ease);
}
.landing-root .fade-stagger.is-visible > * {
  opacity: 1;
  transform: translateY(0);
}
.landing-root .fade-stagger.is-visible > *:nth-child(1) { transition-delay: 0ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(2) { transition-delay: 90ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(3) { transition-delay: 180ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(4) { transition-delay: 270ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(5) { transition-delay: 360ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(6) { transition-delay: 450ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(7) { transition-delay: 540ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(8) { transition-delay: 630ms; }

.landing-root .hero-fade-in {
  opacity: 0;
  transform: translateY(16px);
  animation: heroFadeIn .9s var(--ease) forwards;
}
.landing-root .hero-fade-in.d1 { animation-delay: 120ms; }
.landing-root .hero-fade-in.d2 { animation-delay: 220ms; }
.landing-root .hero-fade-in.d3 { animation-delay: 320ms; }
.landing-root .hero-fade-in.d4 { animation-delay: 420ms; }
.landing-root .hero-fade-in.d5 { animation-delay: 520ms; }
@keyframes heroFadeIn {
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .landing-root .fade-on-scroll,
  .landing-root .fade-stagger > *,
  .landing-root .hero-fade-in {
    opacity: 1;
    transform: none;
    transition: none;
    animation: none;
  }
}

@media (max-width: 880px) {
  .landing-root section { padding: 64px 0; }
  .landing-root .nav-links, .landing-root .nav-cta .btn-outline { display: none; }
  .landing-root .nav-toggle { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 8px; background: transparent; border: 0; color: var(--fg-1); }
  .landing-root .nav-cta { margin-left: auto; }
  .landing-root .hero { padding: 56px 0 64px; }
  .landing-root .hero-grid { grid-template-columns: 1fr; gap: 48px; }
  .landing-root .hero p { font-size: 17px; max-width: none; }
  .landing-root .hero-phone { transform: rotate(-1deg) scale(.9); }
  .landing-root .hero-badge.b1 { left: 0; top: 24px; }
  .landing-root .hero-badge.b2 { right: 0; bottom: 60px; }
  .landing-root .pillars-inner { justify-content: flex-start; }
  .landing-root .pillar { flex: 1 1 calc(50% - 24px); min-width: 160px; }
  .landing-root .sec-head { margin-bottom: 40px; }
  .landing-root .how-grid, .landing-root .tutors-grid, .landing-root .for-who-grid, .landing-root .pricing-grid { grid-template-columns: 1fr; gap: 16px; }
  .landing-root .topics-grid { grid-template-columns: repeat(2, 1fr); }
  .landing-root .feature { padding: 64px 0; }
  .landing-root .feature-grid { grid-template-columns: 1fr; gap: 40px; }
  .landing-root .feature.reverse .feature-grid { direction: ltr; }
  .landing-root .price-card.featured { transform: none; }
  .landing-root .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
  .landing-root .footer-brand { grid-column: 1 / -1; }
  .landing-root .cta-final { padding: 64px 0; }
}
@media (max-width: 480px) {
  .landing-root { --gutter: 18px; }
  .landing-root .topics-grid { grid-template-columns: 1fr; }
  .landing-root .hero h1 { font-size: 42px; }
  .landing-root .hero-actions .btn { flex: 1; }
}
`

function ensureGoogleFont() {
  if (document.getElementById('hablah-google-fonts')) return
  const pre1 = document.createElement('link')
  pre1.rel = 'preconnect'
  pre1.href = 'https://fonts.googleapis.com'
  const pre2 = document.createElement('link')
  pre2.rel = 'preconnect'
  pre2.href = 'https://fonts.gstatic.com'
  pre2.crossOrigin = 'anonymous'
  const link = document.createElement('link')
  link.id = 'hablah-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap'
  document.head.appendChild(pre1)
  document.head.appendChild(pre2)
  document.head.appendChild(link)
}

function useFadeInOnScroll() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      '.landing-root .fade-on-scroll, .landing-root .fade-stagger',
    )
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export function Landing() {
  useEffect(() => {
    ensureGoogleFont()
    const prevTitle = document.title
    document.title = 'Habláh — Hablás. Aprendés. Sin exámenes.'
    return () => {
      document.title = prevTitle
    }
  }, [])

  useFadeInOnScroll()

  return (
    <div className="landing-root">
      <style>{LANDING_CSS}</style>

      <nav className="nav">
        <div className="container nav-inner">
          <a href="#" className="logo">
            <img src="/logos/hablah-mark.svg" alt="habláh" className="logo-mark" width="30" height="30" />
            habláh
          </a>
          <div className="nav-links">
            <a href="#how">Cómo funciona</a>
            <a href="#tutors">Tutores</a>
            <a href="#topics">Tópicos</a>
            <a href="#pricing">Precios</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-cta">
            <Link to="/login" className="btn btn-outline btn-sm">
              Ingresar
            </Link>
            <Link to="/login" className="btn btn-primary btn-sm">
              Empezar gratis
            </Link>
            <button className="nav-toggle" aria-label="Menú">
              <Menu size={22} strokeWidth={2} />
            </button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="hero-pill hero-fade-in">
              <span className="dot">NUEVO</span>
              Charlas reales, no flashcards
            </div>
            <h1 className="hero-fade-in d1">
              Hablás.<br />
              <em>Aprendés.</em>
              <br />
              Sin <span className="strike">exámenes</span>.
            </h1>
            <p className="hero-fade-in d2">
              Cinco minutos de conversación al día con un tutor de IA que se adapta a tu nivel, tus intereses y tus errores.
              Olvidate de las lecciones lineales.
            </p>
            <div className="hero-actions hero-fade-in d3">
              <Link to="/login" className="btn btn-primary btn-lg">
                Empezar gratis
                <ArrowRight size={18} strokeWidth={2.4} />
              </Link>
              <a href="#how" className="btn btn-ghost btn-lg">
                <Play size={18} strokeWidth={2.2} />
                Ver demo (90 s)
              </a>
              <div className="meta">
                <span><Check size={14} strokeWidth={2.6} color="var(--primary-dark)" /> <b>14 días</b> sin tarjeta</span>
                <span><Check size={14} strokeWidth={2.6} color="var(--primary-dark)" /> iOS y Android</span>
                <span><Check size={14} strokeWidth={2.6} color="var(--primary-dark)" /> Inglés, portugués, italiano</span>
              </div>
            </div>
          </div>
          <div className="hero-phone-wrap hero-fade-in d4">
            <div className="hero-badge b1">
              <div className="ico">B2</div>
              <div>
                <div><b>Nivel detectado</b></div>
                <div className="small">sin examen</div>
              </div>
            </div>
            <div className="hero-phone">
              <div className="pscreen">
                <div className="notch"></div>
                <div className="phone-status">
                  <span>9:41</span>
                  <div className="icons">
                    <span></span><span></span><span></span>
                    <span style={{ width: 18, border: '1px solid rgba(255,255,255,.5)', borderRadius: 3, height: 9, background: 'transparent', position: 'relative' }}>
                      <i style={{ position: 'absolute', inset: 1, background: 'white', borderRadius: 1 }}></i>
                    </span>
                  </div>
                </div>
                <div className="phone-orb"></div>
                <div className="phone-label">Tu turno</div>
                <div className="phone-quote">
                  "And then producers in South London <b>started to mix</b> two-step rhythms…"
                </div>
                <div className="phone-challenge">
                  <div className="ico"><Zap size={16} strokeWidth={2.4} /></div>
                  <div className="body">
                    <div className="lbl">Reto · vocabulario</div>
                    <div style={{ marginTop: 4, color: 'white' }}>
                      Incorporá <strong>"nevertheless"</strong> en tu próxima idea.
                    </div>
                  </div>
                </div>
                <div className="phone-bottom">
                  <div className="phone-mic-bar">
                    {Array.from({ length: 14 }).map((_, i) => <i key={i} />)}
                  </div>
                  <div className="phone-stop">
                    <Square size={14} fill="white" strokeWidth={0} />
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-badge b2">
              <div className="ico"><Flame size={18} strokeWidth={2.2} /></div>
              <div>
                <div><b>Racha diaria</b></div>
                <div className="small">Mantenida automáticamente</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pillars fade-on-scroll">
        <div className="container pillars-inner fade-stagger">
          <div className="pillar">
            <div className="ico"><Timer size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">5 min al día</div>
              <div className="lbl">Sesiones cortas, diseñadas para sostener el hábito</div>
            </div>
          </div>
          <div className="pillar">
            <div className="ico"><Sparkles size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">Cero exámenes</div>
              <div className="lbl">Diagnóstico continuo en segundo plano</div>
            </div>
          </div>
          <div className="pillar">
            <div className="ico"><Gauge size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">CEFR A1 a C2</div>
              <div className="lbl">Calibración nativa del nivel sin tests</div>
            </div>
          </div>
          <div className="pillar">
            <div className="ico"><Languages size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">3 idiomas activos</div>
              <div className="lbl">Inglés, portugués e italiano · más en camino</div>
            </div>
          </div>
        </div>
      </div>

      <section className="how" id="how">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">Cómo funciona</span>
            <h2>Tres pasos. Cero exámenes.</h2>
            <p>La IA arma cada conversación a tu medida — combina tu nivel real, tus intereses y los errores que arrastrás de las charlas anteriores.</p>
          </div>
          <div className="how-grid fade-stagger">
            <div className="how-card">
              <div className="num">01 · Diagnóstico</div>
              <h3>Una charla informal, no un examen.</h3>
              <p>Hablás un minuto sobre lo que hacés. En segundo plano medimos fluidez, léxico, sintaxis y pronunciación.</p>
              <div className="how-viz">
                <div className="viz-bubbles">
                  <div className="viz-bubble">Tell me a bit about your job — what got you into it?</div>
                  <div className="viz-bubble you">"Well, I work as a product designer at a fintech…"</div>
                  <div className="viz-bubble" style={{ background: 'var(--primary-tint)', color: 'var(--primary-dark)', fontWeight: 600 }}>
                    Analizando · 142 palabras/min
                  </div>
                </div>
              </div>
            </div>
            <div className="how-card">
              <div className="num">02 · Tu nivel CEFR</div>
              <h3>Sabemos exactamente dónde estás.</h3>
              <p>En 3 minutos te ubicamos en el marco europeo (A1 a C2). De ahí en adelante, el contenido se calibra solo.</p>
              <div className="how-viz">
                <div className="viz-cefr">
                  <div>A1</div><div>A2</div><div>B1</div><div className="active">B2</div><div>C1</div><div>C2</div>
                </div>
              </div>
            </div>
            <div className="how-card">
              <div className="num">03 · Conversación diaria</div>
              <h3>Misiones de 5 a 10 minutos.</h3>
              <p>Hablás de lo que te gusta — música, código, fitness, lo que sea. Al final: 1 elogio + 3 puntos para pulir.</p>
              <div className="how-viz">
                <div className="viz-feedback">
                  <div className="row bad"><span className="mark"><XIcon size={14} strokeWidth={2.6} /></span> "producers started <i>to mixing</i>…"</div>
                  <div className="row good"><span className="mark"><Check size={14} strokeWidth={2.6} /></span> "producers started <i>mixing</i>…"</div>
                  <div className="row good"><span className="mark"><Check size={14} strokeWidth={2.6} /></span> Usaste "nevertheless" perfecto</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tutors" id="tutors">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">Tres personalidades</span>
            <h2>Elegí tu tutor.<br />O dejá que el sistema lo elija.</h2>
            <p>Cada uno tiene un tono, una rigurosidad y una velocidad distinta. Podés cambiar cuando quieras.</p>
          </div>
          <div className="tutors-grid fade-stagger">
            <div className="tutor coach">
              <div className="tutor-ico"><Heart size={26} strokeWidth={2.2} /></div>
              <h3>The Coach</h3>
              <p className="desc">Empático, paciente, motivador. Prioriza la consistencia sobre la precisión. No penaliza.</p>
              <div className="meter">
                <span className="k">Rigurosidad</span>
                <span className="v"><span className="on"></span><span className="on"></span><span></span><span></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Retos por minuto</span>
                <span className="v"><span className="on"></span><span></span><span></span><span></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Interrupciones</span>
                <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Nunca</span>
              </div>
              <div className="ideal">
                <b>Ideal para</b>
                <span className="small">Principiantes · alguien con miedo al habla · regreso al idioma</span>
              </div>
            </div>

            <div className="tutor sincerist featured">
              <div className="tutor-ico"><Zap size={26} strokeWidth={2.2} /></div>
              <h3>
                The Sincerist
                <span className="badge-most">
                  <Star size={11} strokeWidth={2.4} fill="currentColor" />
                  Más usado
                </span>
              </h3>
              <p className="desc">Profesional, directo, demandante. Evalúa cada palabra. Bloqueos por error repetido.</p>
              <div className="meter">
                <span className="k">Rigurosidad</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span></span>
              </div>
              <div className="meter">
                <span className="k">Retos por minuto</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Interrupciones</span>
                <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Solo en simulaciones</span>
              </div>
              <div className="ideal">
                <b>Ideal para</b>
                <span className="small">Preparar entrevistas · certificaciones · acelerar B2 a C1</span>
              </div>
            </div>

            <div className="tutor arcade">
              <div className="tutor-ico"><Gamepad2 size={26} strokeWidth={2.2} /></div>
              <h3>The Arcade</h3>
              <p className="desc">Enérgico, lúdico, veloz. Sesiones cortas con recompensas visuales y velocidad alta.</p>
              <div className="meter">
                <span className="k">Rigurosidad</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Retos por minuto</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span></span>
              </div>
              <div className="meter">
                <span className="k">Interrupciones</span>
                <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Constantes y cortas</span>
              </div>
              <div className="ideal">
                <b>Ideal para</b>
                <span className="small">Sesiones express · gente que se aburre · cuando vas en el subte</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="topics" id="topics">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">Tópicos</span>
            <h2>Hablás de lo que te interesa.<br />Punto.</h2>
            <p>Elegís 4 o 5 punteros — son el combustible de cada conversación. Más de 75 tópicos activos.</p>
          </div>
          <div className="topics-grid fade-stagger">
            <TopicCard cat="Tecnología" title="Arquitectura de software" tags={['microservicios', 'DDD', 'event sourcing']} />
            <TopicCard cat="Arte" title="Música electrónica · UK Garage" tags={['two-step', 'sub-bass', 'producción']} />
            <TopicCard cat="Lifestyle" title="Entrenamiento de fuerza" tags={['powerlifting', 'nutrición', 'recovery']} />
            <TopicCard cat="Diseño" title="Arquitectura residencial" tags={['hormigón visto', 'plantas', 'materialidad']} />
            <TopicCard cat="Tecnología" title="IA generativa y ética" tags={['RLHF', 'bias', 'regulación']} />
            <TopicCard cat="Arte" title="Cine de los 90" tags={['Tarantino', 'indie', 'noir']} />
            <TopicCard cat="Lifestyle" title="Viajes internacionales" tags={['aeropuertos', 'cultura', 'nómadas']} />
            <TopicCard cat="Negocios" title="Metodologías ágiles" tags={['retros', 'OKRs', 'scrum']} />
          </div>
          <p className="topics-more fade-on-scroll">+ 67 tópicos más. ¿No está el tuyo? <b>Lo agregamos.</b></p>
        </div>
      </section>

      <section className="feature">
        <div className="container feature-grid">
          <div className="fade-on-scroll">
            <span className="eyebrow">Feedback sincerista</span>
            <h2>Te decimos lo que está mal.<br />Sin "Oops, algo salió mal".</h2>
            <p>La IA tiene prohibido interrumpirte mientras hablás. Todo el feedback se guarda y se entrega al final — claro, directo, accionable.</p>
            <ul>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span><b>1 elogio</b> · qué hiciste mejor que ayer</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span><b>Máximo 3 puntos a pulir</b> · gramática, pronunciación o léxico</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Frases <b>exactas</b> que dijiste, con la versión natural al lado</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Audio nativo de la pronunciación correcta · tocá para escuchar</span></li>
            </ul>
          </div>
          <div className="fade-on-scroll">
            <div className="mock-report">
              <div className="head">
                <div className="lbl">
                  <Check size={14} strokeWidth={2.6} /> Sesión completa · 6 min 12 s
                </div>
                <h3>¡Buenísima charla!</h3>
                <p>Tu fluidez subió un <b>10%</b> respecto de ayer.</p>
                <div className="stats">
                  <div><div className="k">Fluidez</div><div className="v">+10%</div></div>
                  <div><div className="k">Vocabulario</div><div className="v">14 nuevos</div></div>
                  <div><div className="k">Pron.</div><div className="v">92%</div></div>
                </div>
              </div>
              <div className="body">
                <div className="feed">
                  <div className="type">Gramática · pasado simple</div>
                  <div className="bad"><XIcon size={14} strokeWidth={2.6} /> <span>"producers started <i>to mixing</i>…"</span></div>
                  <div className="good"><Check size={14} strokeWidth={2.6} /> <span>"producers started <i>mixing</i>…"</span></div>
                </div>
                <div className="feed">
                  <div className="type">Pronunciación · garage</div>
                  <div className="bad"><XIcon size={14} strokeWidth={2.6} /> <span>/ˈɡærɪdʒ/</span></div>
                  <div className="good">
                    <Check size={14} strokeWidth={2.6} /> <span>/ˈɡærɑːʒ/</span>
                    <span className="listen">
                      <Play size={11} strokeWidth={2.6} fill="white" />
                      escuchar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature reverse" style={{ background: 'var(--bg-2)' }}>
        <div className="container feature-grid">
          <div className="fade-on-scroll">
            <span className="eyebrow">Modo insistente</span>
            <h2>El error que se repite,<br />te lo cobramos.</h2>
            <p>Si tropezás con la misma cosa tres sesiones seguidas, el sistema pausa tu mapa y dispara una <b>Misión de rescate</b>: una charla diseñada para forzar exactamente ese punto débil hasta que lo resuelvas.</p>
            <ul>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Detección automática · sin que tengas que pedirla</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Sobre <b>verbos irregulares</b>, <b>fonemas</b> o cualquier otra cosa</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Liberación con <b>8 instancias correctas</b> en una conversación</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Sin progreso nuevo hasta que el bloqueo se resuelve</span></li>
            </ul>
          </div>
          <div className="fade-on-scroll">
            <div className="mock-rescue">
              <div className="ico-big"><AlertTriangle size={32} strokeWidth={2.2} /></div>
              <h3>Misión de rescate.</h3>
              <p className="sub">Tropezaste con lo mismo 3 sesiones seguidas. Hoy lo dejamos atrás.</p>
              <div className="weak">
                <div className="l">Punto débil</div>
                <div className="t">Verbos irregulares · pasado simple</div>
                <div className="s">"go → goed", "buy → buyed", "begin → beginned".</div>
              </div>
              <ul className="list">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Tu mapa queda pausado hasta resolverlo.</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>El tutor va a forzar contextos narrativos en pasado.</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Mínimo 8 verbos irregulares correctos en una charla.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="for-who">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">Para quién está pensado</span>
            <h2>Tres formas de usarlo.<br />Las tres funcionan.</h2>
            <p>No importa de dónde arranques — el sistema se calibra solo. Estas son las situaciones más comunes.</p>
          </div>
          <div className="for-who-grid fade-stagger">
            <UseCase
              icon={<Compass size={22} strokeWidth={2.2} />}
              title="Si retomás después de años"
              scenario={`"Estudié inglés en el secundario y nunca más lo usé. Lo entiendo, pero al hablar me trabo."`}
              fit="The Coach baja la presión. Empezás con frases cortas, sin penalización, hasta que recuperás el reflejo."
            />
            <UseCase
              icon={<Zap size={22} strokeWidth={2.2} />}
              title="Si necesitás entrevistas en inglés"
              scenario={`"Trabajo en producto/dev/diseño y la próxima entrevista es 100% en inglés técnico."`}
              fit="The Sincerist te exige precisión. Cargás los tópicos de tu rubro y simula conversaciones de presión."
            />
            <UseCase
              icon={<Globe size={22} strokeWidth={2.2} />}
              title="Si viajás seguido"
              scenario={`"Me defiendo, pero al pedir comida o pedir ayuda en la calle me quedo en blanco."`}
              fit="The Arcade te tira micro-sesiones rápidas con situaciones cotidianas. Ideal para usar en el subte."
            />
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">Precios</span>
            <h2>Empezás gratis.<br />Pagás cuando te enganche.</h2>
            <p>14 días de Pro sin tarjeta. Después elegís el plan que te haga sentido.</p>
          </div>
          <div className="pricing-grid fade-stagger">
            <div className="price-card">
              <div className="name">Free</div>
              <div className="blurb">Para probar y mantener la racha</div>
              <div className="price"><span className="amount">$0</span><span className="per">/ mes</span></div>
              <ul className="feats">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>1 charla de 5 minutos por día</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Tutor The Coach</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>3 punteros de interés</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Feedback básico</span></li>
              </ul>
              <Link to="/login" className="btn btn-outline btn-block" style={{ marginTop: 'auto' }}>Empezar gratis</Link>
            </div>

            <div className="price-card featured">
              <span className="badge">Más popular</span>
              <div className="name" style={{ color: 'var(--primary)' }}>Pro</div>
              <div className="blurb">Para los que quieren ver progreso real</div>
              <div className="price"><span className="amount">US$ 12</span><span className="per">/ mes</span></div>
              <ul className="feats">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Charlas ilimitadas</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Los 3 tutores (Coach, Sincerist, Arcade)</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Hasta 5 punteros de interés</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Feedback sincerista completo + audio nativo</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Misiones de rescate · modo insistente</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Mapa de progreso por tema</span></li>
              </ul>
              <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: 'auto' }}>Probar 14 días gratis</Link>
            </div>

            <div className="price-card">
              <div className="name">Bootcamp</div>
              <div className="blurb">Para acelerar fuerte (incluye coach humano)</div>
              <div className="price"><span className="amount">US$ 49</span><span className="per">/ mes</span></div>
              <ul className="feats">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Todo lo de Pro</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span><b>1 sesión semanal</b> con coach humano</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Templates personalizados</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Plan a medida (objetivo específico)</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Soporte prioritario</span></li>
              </ul>
              <a href="#" className="btn btn-outline btn-block" style={{ marginTop: 'auto' }}>Hablar con ventas</a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--bg-2)' }} id="faq">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">FAQ</span>
            <h2>Preguntas que recibimos seguido.</h2>
          </div>
          <div className="faq-list fade-stagger">
            <FaqItem q="¿Cómo decide mi nivel sin un examen?" a="Mientras conversás, un pipeline analiza riqueza léxica, precisión sintáctica, fluidez (palabras por minuto y pausas) y precisión fonética. En 2 a 3 minutos te ubica en el marco CEFR (A1 a C2). Sin opción múltiple, sin presión." />
            <FaqItem q="¿Qué idiomas están disponibles?" a="Hoy: inglés (US y UK), portugués (BR y PT) e italiano. Próximamente francés y alemán. Como alumno base aceptamos español (todas las variantes), portugués e inglés." />
            <FaqItem q="¿Necesito buena conexión?" a="Funciona con 3G estable. El audio se procesa en streaming. Si la conexión se cae, la sesión guarda lo hablado y reanuda al volver." />
            <FaqItem q="¿Qué pasa con mi audio? ¿Lo guardan?" a={'Por defecto se borra a los 30 días. Podés cambiarlo a "borrar después de cada sesión" en tu perfil. Nunca lo usamos para entrenar modelos sin tu consentimiento explícito.'} />
            <FaqItem q="¿Puedo cancelar Pro cuando quiera?" a="Sí, desde la app, en un toque. No hay permanencia. Si cancelás, mantenés tu nivel y rachas, solo pasás al plan Free." />
            <FaqItem q="¿Sirve para certificaciones (TOEFL, IELTS, Cambridge)?" a="Sirve para llegar al nivel, pero no entrena formato de examen. Para eso usamos Bootcamp con coach humano, que arma simulacros específicos." />
            <FaqItem q="¿Y si soy ultra principiante (A0)?" a="The Coach está pensado para vos. Las primeras semanas son híbridas: la IA te tira frases simples, vas repitiendo y construyendo. Al mes ya hacés charlas reales cortas." />
          </div>
        </div>
      </section>

      <section className="cta-final" id="cta">
        <div className="container fade-on-scroll">
          <h2>Hablás más en una semana<br />que en seis meses de cursos.</h2>
          <p>14 días de Pro, sin tarjeta. La primera charla se siente rara. La quinta, no podés parar.</p>
          <div className="cta-final-actions">
            <a href="#" className="btn btn-light btn-lg">
              <Smartphone size={18} strokeWidth={2.2} />
              Descargar en App Store
            </a>
            <a href="#" className="btn btn-dark btn-lg" style={{ background: 'rgba(0,0,0,.25)', color: 'white', border: '1px solid rgba(255,255,255,.25)' }}>
              <Play size={16} strokeWidth={2.2} fill="white" />
              Disponible en Google Play
            </a>
          </div>
          <div style={{ marginTop: 24, fontSize: 13, opacity: .8 }}>o probalo en la web · 5 minutos · sin descarga</div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="logo"><img src="/logos/hablah-mark.svg" alt="habláh" className="logo-mark" width="30" height="30" /> habláh</a>
              <p>Plataforma adaptativa de aprendizaje de idiomas con IA. Hablás de lo que te gusta. El sistema se encarga del resto.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <a href="#" className="social-btn" aria-label="X/Twitter"><Twitter size={16} strokeWidth={2} /></a>
                <a href="#" className="social-btn" aria-label="LinkedIn"><Linkedin size={16} strokeWidth={2} /></a>
                <a href="#" className="social-btn" aria-label="Instagram"><Instagram size={16} strokeWidth={2} /></a>
              </div>
            </div>
            <div className="footer-col">
              <h5>Producto</h5>
              <ul>
                <li><a href="#how">Cómo funciona</a></li>
                <li><a href="#tutors">Tutores</a></li>
                <li><a href="#topics">Tópicos</a></li>
                <li><a href="#pricing">Precios</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Empresa</h5>
              <ul>
                <li><a href="#">Sobre nosotros</a></li>
                <li><a href="#">Carreras</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Prensa</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Recursos</h5>
              <ul>
                <li><a href="#">Centro de ayuda</a></li>
                <li><a href="#">Para empresas</a></li>
                <li><a href="#">API · próximamente</a></li>
                <li><a href="#">Estado del servicio</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <ul>
                <li><a href="#">Términos</a></li>
                <li><a href="#">Privacidad</a></li>
                <li><a href="#">Cookies</a></li>
                <li><a href="#">Manejo de audio</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} strokeWidth={2.2} />
              © 2026 Habláh. Hecho en LatAm.
            </span>
            <span>Hablás. Aprendés. Sin exámenes.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

interface TopicCardProps {
  cat: string
  title: string
  tags: string[]
}

function TopicCard({ cat, title, tags }: TopicCardProps) {
  return (
    <div className="topic-card">
      <div className="cat">{cat}</div>
      <h4>{title}</h4>
      <div className="tags">
        {tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
}

interface UseCaseProps {
  icon: React.ReactNode
  title: string
  scenario: string
  fit: string
}

function UseCase({ icon, title, scenario, fit }: UseCaseProps) {
  return (
    <div className="for-who-card">
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      <p className="scenario">{scenario}</p>
      <div className="fit"><b>Para vos si:</b> {fit}</div>
    </div>
  )
}

interface FaqItemProps {
  q: string
  a: string
}

function FaqItem({ q, a }: FaqItemProps) {
  return (
    <div className="faq-item">
      <details>
        <summary>
          {q}
          <ChevronDown size={20} strokeWidth={2} className="chev" />
        </summary>
        <p>{a}</p>
      </details>
    </div>
  )
}
