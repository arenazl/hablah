/**
 * Pantalla "Hoy" de Kids — porteo del Kids.html de Claude Design.
 *
 * Estructura:
 * - Greeting + stars today
 * - Hero verde con Habi mascot bouncing + CTA
 * - Topics grid (6+ tópicos coloridos)
 * - Monstruo del idioma (rescue reskinned)
 * - Sidebar derecha: streak + colección + path
 *
 * Esta version usa MOCK_KID y datos hardcodeados. La proxima
 * iteracion lo cablea con /api/kids/topics, /api/kids/me, etc.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Habi, KidsLayout } from './_shared'
import { KIDS_AGE_KEY, type KidsAgeGroup } from './KidsAgeSelect'
import { useKid, KIDS_RANKS } from './KidsContext'

interface KidsTopic {
  id: number
  slug: string
  title: string
  category: string
}

const TOPIC_COLOR_MAP: Record<string, { bg: string; sublabel: string }> = {
  // Mini
  'kids-colors':           { bg: 'linear-gradient(135deg,#FF6AA9,#DB2777)', sublabel: 'rojo, azul, amarillo' },
  'kids-animals-farm':     { bg: 'linear-gradient(135deg,#22C55E,#15803D)', sublabel: 'granja y selva' },
  'kids-counting':         { bg: 'linear-gradient(135deg,#FACC15,#CA8A04)', sublabel: 'del 1 al 10' },
  'kids-body':             { bg: 'linear-gradient(135deg,#06B6D4,#0891B2)', sublabel: 'cabeza, manos, pies' },
  'kids-family':           { bg: 'linear-gradient(135deg,#EC4899,#BE185D)', sublabel: 'mamá, papá, hermanos' },
  'kids-food-basic':       { bg: 'linear-gradient(135deg,#FB7C39,#EA580C)', sublabel: 'manzana, pan, leche' },
  'kids-toy-unboxing':     { bg: 'linear-gradient(135deg,#A855F7,#7C3AED)', sublabel: 'cajas y sorpresas' },
  'kids-cartoons-heroes':  { bg: 'linear-gradient(135deg,#3B82F6,#1E40AF)', sublabel: 'dibujitos y poderes' },
  'kids-gaming-basic':     { bg: 'linear-gradient(135deg,#00B37E,#008F63)', sublabel: 'jugar en la pantalla' },
  'kids-treats':           { bg: 'linear-gradient(135deg,#F472B6,#DB2777)', sublabel: 'comida rica y dulce' },
  // Junior
  'kids-school':           { bg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', sublabel: 'cole y amigos' },
  'kids-routine':          { bg: 'linear-gradient(135deg,#22D3EE,#0E7490)', sublabel: 'mañana a noche' },
  'kids-house':            { bg: 'linear-gradient(135deg,#A855F7,#7C3AED)', sublabel: 'casa y habitaciones' },
  'kids-hobbies':          { bg: 'linear-gradient(135deg,#FB7C39,#EA580C)', sublabel: 'deportes y pasatiempos' },
  'kids-emotions':         { bg: 'linear-gradient(135deg,#FACC15,#CA8A04)', sublabel: 'cómo me siento' },
  'kids-nature':           { bg: 'linear-gradient(135deg,#22C55E,#15803D)', sublabel: 'naturaleza y dinos' },
  'kids-youtube-challenges':{ bg: 'linear-gradient(135deg,#EF4444,#B91C1C)', sublabel: 'desafíos virales' },
  'kids-sandbox-worlds':   { bg: 'linear-gradient(135deg,#10B981,#047857)', sublabel: 'mundos de bloques' },
  'kids-collecting':       { bg: 'linear-gradient(135deg,#3B82F6,#1E40AF)', sublabel: 'cartas y figuritas' },
  'kids-fast-food':        { bg: 'linear-gradient(135deg,#F472B6,#DB2777)', sublabel: 'combo, fries, soda' },
  // Tween
  'kids-entertainment':    { bg: 'linear-gradient(135deg,#A855F7,#7C3AED)', sublabel: 'música y series' },
  'kids-travel':           { bg: 'linear-gradient(135deg,#06B6D4,#0891B2)', sublabel: 'viajes y culturas' },
  'kids-future-jobs':      { bg: 'linear-gradient(135deg,#00B37E,#008F63)', sublabel: 'profesiones' },
  'kids-cooking':          { bg: 'linear-gradient(135deg,#FB7C39,#EA580C)', sublabel: 'recetas y sabores' },
  'kids-planet':           { bg: 'linear-gradient(135deg,#22C55E,#15803D)', sublabel: 'ecología' },
  'kids-opinions':         { bg: 'linear-gradient(135deg,#FACC15,#CA8A04)', sublabel: 'qué pensás' },
  'kids-streaming':        { bg: 'linear-gradient(135deg,#EF4444,#B91C1C)', sublabel: 'streamers en vivo' },
  'kids-sneakers':         { bg: 'linear-gradient(135deg,#0EA5E9,#0369A1)', sublabel: 'moda urbana' },
  'kids-esports':          { bg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', sublabel: 'gaming pro' },
  'kids-slang':            { bg: 'linear-gradient(135deg,#F472B6,#DB2777)', sublabel: 'memes y slang' },
}

// Iconos genéricos por categoría (sin marcas literales)
const GENERIC_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
  </svg>
)

const TOPIC_ICONS: Record<string, JSX.Element> = {
  // Mini
  'kids-colors':           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 10-10 4 4 0 0 1-4 4h-2a2 2 0 0 0-2 2 4 4 0 0 1-2 4z"/><circle cx="7" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/><circle cx="17" cy="11" r="1" fill="currentColor"/></svg>,
  'kids-animals-farm':     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10c0-3 3-5 7-5s7 2 7 5v3c0 4-3 6-7 6s-7-2-7-6z"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/><path d="M10 15c1 1 3 1 4 0"/></svg>,
  'kids-counting':         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6h2v12"/><path d="M11 18c0-3 6-4 6-8 0-2-2-4-4-4s-3 1-3 3"/></svg>,
  'kids-body':             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v8M8 12h8M9 22l3-6 3 6"/></svg>,
  'kids-family':           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M14 21a4 4 0 0 1 8 0"/></svg>,
  'kids-food-basic':       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c4 0 8 3 8 8 0 6-4 10-8 10s-8-4-8-10c0-5 4-8 8-8z"/><path d="M12 3v3"/></svg>,
  'kids-toy-unboxing':     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>,
  'kids-cartoons-heroes':  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"/></svg>,
  'kids-gaming-basic':     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 12h4M9 10v4"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="17" cy="13" r="1" fill="currentColor"/></svg>,
  'kids-treats':           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10l1 10h12l1-10"/><path d="M3 10h18l-2-3H5z"/></svg>,

  // Junior
  'kids-school':           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12v12H6z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><path d="M9 14h6"/></svg>,
  'kids-routine':          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  'kids-house':            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/></svg>,
  'kids-hobbies':          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5 7l14 10M19 7L5 17"/></svg>,
  'kids-emotions':         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>,
  'kids-nature':           <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 16 c0-2 2-3 4-3 0-3 3-7 8-7 3 0 6 2 6 5 0 1-1 2-2 2 0 2-1 5-4 6 -3 1-5 1-7 0v3h-2v-3c-2 0-3-1-3-3z"/></svg>,
  'kids-youtube-challenges':<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><polygon points="10 9 16 12 10 15" fill="currentColor"/></svg>,
  'kids-sandbox-worlds':   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>,
  'kids-collecting':       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
  'kids-fast-food':        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10c0-3 4-5 8-5s8 2 8 5"/><path d="M3 10h18l-1 3H4z"/><path d="M5 16h14l-1 4H6z"/></svg>,

  // Tween
  'kids-entertainment':    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/></svg>,
  'kids-travel':           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>,
  'kids-future-jobs':      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M3 13h18"/></svg>,
  'kids-cooking':          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v6c0 2 2 3 6 3s6-1 6-3V3"/><path d="M6 12v9h12v-9"/></svg>,
  'kids-planet':           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c4 4 6 8 6 12l-3 4h-6l-3-4c0-4 2-8 6-12z"/><path d="M9 12c1 1 2 1 3 0s2-1 3 0"/></svg>,
  'kids-opinions':         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  'kids-streaming':        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>,
  'kids-sneakers':         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15c0-2 2-4 5-4l3-3h6c3 0 4 3 4 6v3H3z"/><path d="M11 8v3"/></svg>,
  'kids-esports':          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>,
  'kids-slang':            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>,
}

const HOME_CSS = `
.kids-greet { padding:18px 0 22px; display:flex; align-items:flex-end; gap:18px; flex-wrap:wrap; }
.kids-greet .gtext { flex:1; min-width:280px; }
.kids-eyebrow { font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--green-700); font-weight:800; display:inline-flex; align-items:center; gap:8px; }
.kids-title { font-family:var(--font-display); font-weight:800; letter-spacing:-0.025em; font-size:42px; line-height:1.02; margin:8px 0 6px; color:var(--fg-1); }
.kids-title em { font-style:normal; color:var(--green-700); background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.22) 64% 96%,transparent 96%); padding:0 4px; }
.kids-greet .sub { color:var(--fg-2); font-size:16px; margin:0; max-width:580px; }
.kids-greet .sub b { color:var(--fg-1); font-weight:700; }

.kids-stars-today { display:flex; align-items:center; gap:10px; background:#fff; border:1px solid var(--border-2); border-radius:18px; padding:10px 14px; box-shadow:var(--shadow-soft); }
.kids-stars-today .sti { width:36px; height:36px; border-radius:12px; background:linear-gradient(135deg,var(--amber),#FFC93B); display:grid; place-items:center; box-shadow:inset 0 -3px 0 #C58F00; color:#fff; }
.kids-stars-today .stt { font-size:11px; color:var(--fg-3); font-weight:700; letter-spacing:.08em; text-transform:uppercase; line-height:1.1; }
.kids-stars-today .stt b { display:block; font-family:var(--font-display); font-weight:800; font-size:22px; color:var(--fg-1); letter-spacing:-0.02em; margin-top:2px; }

.kids-hero { position:relative; border-radius:var(--r-card-lg); overflow:hidden; background:linear-gradient(150deg,#00B37E 0%,#008F63 50%,#054A3A 100%); color:#fff; display:grid; grid-template-columns:1.3fr 1fr; align-items:stretch; min-height:340px; box-shadow:var(--shadow-pop); margin-bottom:24px; }
.kids-hero::before { content:""; position:absolute; inset:0; background: radial-gradient(800px 400px at 100% 0%, rgba(255,184,0,.22), transparent 60%), radial-gradient(600px 300px at 0% 100%, rgba(94,224,176,.16), transparent 60%); pointer-events:none; }
.kids-hero-l { padding:30px 32px; position:relative; z-index:1; display:flex; flex-direction:column; gap:14px; }
.kids-hero-eye { font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:#7CE7BD; font-weight:800; display:inline-flex; align-items:center; gap:8px; }
.kids-hero-eye .star { font-family:var(--font-display); font-weight:800; color:var(--amber); }
.kids-hero-l h2 { font-family:var(--font-display); font-weight:800; letter-spacing:-0.025em; font-size:52px; line-height:.98; margin:6px 0 4px; color:#fff; }
.kids-hero-l h2 .acc { color:var(--amber); display:inline-block; font-style:italic; }
.kids-hero-l p { margin:0; font-size:16px; line-height:1.4; color:rgba(255,255,255,.78); max-width:440px; }
.kids-hero-l p b { color:#fff; font-weight:600; }

.kids-hero-cta { display:flex; align-items:center; gap:14px; margin-top:10px; flex-wrap:wrap; }
.btn-play { display:inline-flex; align-items:center; gap:12px; height:62px; padding:0 26px 0 22px; border-radius:var(--r-btn); background:#fff; color:var(--green-900); font-family:var(--font-display); font-weight:800; font-size:18px; letter-spacing:-0.01em; transition:transform .15s var(--ease); box-shadow:0 8px 24px rgba(0,0,0,.18); }
.btn-play:hover { transform:translateY(-2px) scale(1.02); }
.btn-play:active { transform:scale(.97); }
.btn-play .pl-ico { width:36px; height:36px; border-radius:50%; background:var(--amber); color:#3A2A00; display:grid; place-items:center; flex-shrink:0; box-shadow:inset 0 -2px 0 #C58F00; }
.btn-ghost-w { display:inline-flex; align-items:center; gap:8px; height:54px; padding:0 18px; border-radius:var(--r-btn); background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.18); color:#fff; font-weight:600; font-size:14px; }
.btn-ghost-w:hover { background:rgba(255,255,255,.16); }

.kids-hero-meta { display:flex; align-items:center; gap:10px; color:rgba(255,255,255,.7); font-size:13px; margin-top:auto; flex-wrap:wrap; }
.kids-hero-meta .pill { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.14); padding:5px 11px; border-radius:99px; font-weight:600; font-size:12px; color:#fff; }

.kids-hero-r { position:relative; display:flex; align-items:center; justify-content:center; padding:20px; }
.habi-wrap { position:relative; width:280px; height:280px; display:grid; place-items:center; }
.habi-wrap::before { content:""; position:absolute; inset:0; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.12),transparent 65%); }
.habi-bubble { position:absolute; top:18px; right:-10px; background:#fff; color:var(--green-900); font-family:var(--font-display); font-weight:700; font-size:13px; padding:9px 14px; border-radius:18px; box-shadow:0 6px 16px rgba(0,0,0,.18); animation:habi-bubble-pop .5s var(--ease) backwards; animation-delay:.8s; }
.habi-bubble::after { content:""; position:absolute; bottom:-6px; left:24px; width:14px; height:14px; background:#fff; transform:rotate(45deg); border-radius:3px; }
@keyframes habi-bubble-pop { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }

.kids-grid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:22px; }
@media (max-width:1180px) { .kids-grid { grid-template-columns:1fr; } }

.kids-sh { display:flex; align-items:baseline; justify-content:space-between; margin:6px 0 12px; }
.kids-sh h3 { font-family:var(--font-display); font-weight:800; font-size:22px; letter-spacing:-0.02em; margin:0; color:var(--fg-1); }
.kids-sh .link { font-size:13.5px; color:var(--green-700); font-weight:700; }

.kids-topics { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
@media (max-width:760px) { .kids-topics { grid-template-columns:repeat(2,1fr); } }
.kids-topic { position:relative; border-radius:var(--r-card); padding:18px 18px 16px; min-height:160px; overflow:hidden; cursor:pointer; color:#fff; transition:transform .18s var(--ease), box-shadow .18s var(--ease); text-align:left; display:flex; flex-direction:column; justify-content:space-between; border:0; }
.kids-topic:hover { transform:translateY(-3px) rotate(-.5deg); box-shadow:var(--shadow-pop); }
.kids-topic .t-ico { width:56px; height:56px; border-radius:18px; backdrop-filter:blur(6px); display:grid; place-items:center; margin-bottom:auto; color:#fff; }
.kids-topic .t-ico svg { width:30px; height:30px; }
.kids-topic .t-name { font-family:var(--font-display); font-weight:800; font-size:18px; letter-spacing:-0.015em; line-height:1.1; margin-top:14px; }
.kids-topic .t-name small { display:block; font-family:var(--font-sans); font-weight:500; font-size:12px; color:rgba(255,255,255,.78); margin-top:4px; }
.kids-topic .recommend { position:absolute; top:-8px; left:14px; background:var(--amber); color:#3A2A00; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:99px; box-shadow:0 4px 10px rgba(255,184,0,.4); }

.kids-streak { background:linear-gradient(160deg,#FFF7DD 0%,#FFE9A6 100%); border:2px solid rgba(255,184,0,.3); border-radius:var(--r-card); padding:22px; position:relative; overflow:hidden; }
.kids-streak-h { font-family:var(--font-display); font-weight:800; font-size:18px; letter-spacing:-0.015em; color:#3A2A00; margin:0 0 4px; }
.kids-streak-sub { font-size:13px; color:#7A5800; margin:0 0 16px; }
.kids-streak-sub b { font-weight:700; color:#3A2A00; }
.kids-streak-days { display:flex; justify-content:space-between; gap:6px; }
.kids-sday { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; }
.kids-sday .sd-name { font-size:10.5px; font-weight:700; color:#7A5800; text-transform:uppercase; }
.kids-sday .sd-cir { width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,.5); border:2px solid rgba(122,88,0,.18); display:grid; place-items:center; color:#7A5800; font-family:var(--font-display); font-weight:800; font-size:13px; }
.kids-sday.done .sd-cir { background:linear-gradient(135deg,var(--amber),#FFC93B); color:#fff; border-color:#7A5800; box-shadow:0 2px 6px rgba(255,184,0,.45); }
.kids-sday.today .sd-cir { background:#fff; border-color:var(--green); color:var(--green-700); box-shadow:0 0 0 4px rgba(0,179,126,.2); }
.kids-sday.today .sd-name { color:var(--green-700); }
.kids-sday.future .sd-cir { background:transparent; border-style:dashed; color:#9A8550; }

/* MONSTRUO DEL IDIOMA */
.kids-monster { background:linear-gradient(180deg,#FFFDF4,#FFF4D8); border:2px solid #F4E1A4; border-radius:var(--r-card); padding:22px 24px; display:grid; grid-template-columns:auto 1fr auto; gap:18px; align-items:center; }
.kids-monster .m-vis { width:88px; height:88px; flex-shrink:0; position:relative; }
.kids-monster .m-vis svg { width:100%; height:100%; animation:kids-wiggle 2s ease-in-out infinite; }
@keyframes kids-wiggle { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(6deg)} }
.kids-monster .m-txt h4 { font-family:var(--font-display); font-weight:800; font-size:20px; letter-spacing:-0.015em; margin:0 0 4px; color:#3A2A00; line-height:1.15; }
.kids-monster .m-txt h4 small { display:block; font-family:var(--font-sans); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:#9A2D31; margin-bottom:6px; }
.kids-monster .m-txt p { margin:0; color:#6A4F00; font-size:13.5px; line-height:1.5; max-width:380px; }
.kids-monster .m-txt p b { color:#3A2A00; font-weight:700; }
.kids-monster .m-cta { display:flex; flex-direction:column; align-items:center; gap:6px; }
.kids-btn-catch { display:inline-flex; align-items:center; gap:8px; height:48px; padding:0 18px; border-radius:14px; background:#0D1412; color:#fff; font-family:var(--font-display); font-weight:800; font-size:14px; letter-spacing:-0.005em; transition:all .15s var(--ease); }
.kids-btn-catch:hover { background:#000; transform:translateY(-1px); }
.kids-monster .m-cta small { font-size:11px; color:#8A6A00; font-weight:600; }
@media (max-width:900px) {
  .kids-monster { grid-template-columns:1fr; text-align:center; padding:20px 18px; gap:14px; }
  .kids-monster .m-vis { margin:0 auto; }
  .kids-btn-catch { justify-content:center; width:100%; }
}

/* COLECCION (stickers) */
.kids-stickers-card { background:#fff; border:1px solid var(--border-1); border-radius:var(--r-card); padding:20px; }
.kids-stickers-card .sh { margin:0 0 16px; }
.kids-stickers-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.kids-sticker { aspect-ratio:1; border-radius:18px; display:grid; place-items:center; position:relative; cursor:pointer; transition:transform .15s var(--ease); border:0; }
.kids-sticker:hover { transform:scale(1.08) rotate(-3deg); }
.kids-sticker.locked { background:repeating-linear-gradient(135deg,#F2EAD9,#F2EAD9 6px,#E8DFCA 6px 12px); opacity:.6; cursor:default; }
.kids-sticker.locked:hover { transform:none; }
.kids-sticker svg { width:60%; height:60%; }
.kids-sticker .new { position:absolute; top:-4px; right:-4px; background:#FF6AA9; color:#fff; font-size:9px; font-weight:800; padding:2px 6px; border-radius:99px; letter-spacing:.06em; text-transform:uppercase; }

/* Pill de edad activa arriba del topbar */
.kids-age-pill-current { display:inline-flex; align-items:center; gap:8px; padding:5px 12px; background:#FFF7DD; border:1px solid rgba(255,184,0,.35); border-radius:99px; font-size:11.5px; font-weight:700; color:#7A5800; letter-spacing:.02em; cursor:pointer; transition:all .15s var(--ease); }
.kids-age-pill-current:hover { background:#FFE9A6; transform:translateY(-1px); }
.kids-age-pill-current .lvl-dot { width:8px; height:8px; border-radius:50%; background:#FFB800; }

.kids-path { background:#fff; border:1px solid var(--border-1); border-radius:var(--r-card); padding:20px; }
.kids-path-h { font-family:var(--font-display); font-weight:800; font-size:18px; letter-spacing:-0.015em; margin:0 0 4px; }
.kids-path-sub { font-size:13px; color:var(--fg-3); margin:0 0 16px; }
.kids-ranks-line { height:3px; background:var(--bg-3); border-radius:99px; margin:8px 22px 12px; position:relative; }
.kids-ranks-line i { display:block; height:100%; background:var(--green); border-radius:99px; }
.kids-ranks { display:flex; align-items:center; gap:6px; justify-content:space-between; }
.kids-rank { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; }
.kids-rank .r-ico { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; color:#fff; font-family:var(--font-display); font-weight:800; font-size:16px; }
.kids-rank.done .r-ico { background:var(--green); }
.kids-rank.now .r-ico { background:#fff; color:var(--green-700); border:3px solid var(--green); box-shadow:0 0 0 4px rgba(0,179,126,.18); }
.kids-rank.next .r-ico { background:var(--bg-3); color:var(--fg-4); border:2px dashed var(--border-2); }
.kids-rank .r-name { font-family:var(--font-display); font-weight:700; font-size:11px; color:var(--fg-3); text-align:center; }
.kids-rank.now .r-name { color:var(--fg-1); font-weight:800; }

@media (max-width:900px) {
  .kids-hero { grid-template-columns:1fr; min-height:auto; margin-bottom:20px; }
  .kids-hero-r { display:none; }
  .kids-hero-l { padding:24px 22px; gap:12px; }
  .kids-hero-l h2 { font-size:36px; }
  .kids-grid { grid-template-columns:1fr; gap:18px; }
  .kids-title { font-size:32px; line-height:1.04; }
  .kids-topics { grid-template-columns:repeat(2,1fr); gap:10px; }
  .kids-topic { min-height:148px; padding:16px; }
}
`

const AGE_LABEL: Record<KidsAgeGroup, string> = {
  mini: 'Mini · 4-7 años',
  junior: 'Junior · 7-10 años',
  tween: 'Tween · 10-14 años',
}

// Colección mock — 8 stickers que el chico va desbloqueando
interface StickerSlot {
  bg: string
  label: string
  icon: JSX.Element
  isNew?: boolean
  locked?: boolean
}

const MOCK_STICKERS: StickerSlot[] = [
  { bg: 'linear-gradient(135deg,#00B37E,#008F63)', label: 'Animales', icon: <svg viewBox="0 0 24 24" fill="#fff"><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M7 7l-2-3M17 7l2-3M5 13c0 4 3 7 7 7s7-3 7-7" stroke="#fff" strokeWidth="2" fill="none"/></svg> },
  { bg: 'linear-gradient(135deg,#A855F7,#7C3AED)', label: 'Héroe', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2 5 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1z"/></svg>, isNew: true },
  { bg: 'linear-gradient(135deg,#06B6D4,#0891B2)', label: 'Color', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22a10 10 0 1 1 10-10 4 4 0 0 1-4 4h-2a2 2 0 0 0-2 2 4 4 0 0 1-2 4z"/></svg> },
  { bg: 'linear-gradient(135deg,#FF6AA9,#DB2777)', label: 'Música', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="#fff"/><circle cx="18" cy="16" r="3" fill="#fff"/></svg> },
  { bg: 'linear-gradient(135deg,#FB7C39,#EA580C)', label: 'Pelota', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg> },
  { bg: 'linear-gradient(135deg,#FACC15,#F59E0B)', label: 'Estrella', icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg> },
  { bg: 'linear-gradient(135deg,#3B82F6,#1E40AF)', label: 'Casa', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M3 11l9-7 9 7v9H3z"/></svg> },
  { locked: true, bg: '', label: 'Bloqueado', icon: <svg viewBox="0 0 24 24" fill="none" stroke="#98A19D" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> },
]

export function KidsHome() {
  const navigate = useNavigate()
  const { kid: profile } = useKid()
  const [topics, setTopics] = useState<KidsTopic[]>([])
  const ageGroup = profile.age_group

  useEffect(() => {
    const stored = localStorage.getItem(KIDS_AGE_KEY) as KidsAgeGroup | null
    // Si no hay perfil real (id null) y no hay localStorage -> selector
    if (!profile.is_real && (!stored || !['mini', 'junior', 'tween'].includes(stored))) {
      navigate('/kids/seleccionar-edad', { replace: true })
      return
    }

    fetch(`/api/kids/topics?age_group=${ageGroup}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTopics)
      .catch(() => setTopics([]))
  }, [navigate, ageGroup, profile.is_real])

  const featured = topics[0]
  const currentRankIdx = KIDS_RANKS.findIndex((r) => r.slug === profile.rank_slug)
  // kid local para uso en JSX (matches el shape original)
  const kid = {
    name: profile.name,
    coins: profile.coins,
    rank_slug: profile.rank_slug,
    rank_label: (KIDS_RANKS.find(r => r.slug === profile.rank_slug)?.name) ?? 'Curioso',
    progress_pct: 0,
    next_rank_label: '',
    charlas_to_next: 0,
  }

  return (
    <KidsLayout>
      <style>{HOME_CSS}</style>

      <header className="kids-topbar">
        <div className="kids-crumbs">
          Hoy<span className="day">· tu aventura diaria</span>
        </div>
        <div className="actions">
          <button
            className="kids-age-pill-current"
            onClick={() => navigate('/kids/seleccionar-edad')}
            title="Cambiar nivel de edad"
          >
            <span className="lvl-dot" />
            {AGE_LABEL[ageGroup]}
          </button>
          <div className="kids-avatar">{kid.name.charAt(0)}</div>
        </div>
      </header>

      <section className="kids-greet">
        <div className="gtext">
          <div className="kids-eyebrow">¡Buen día, {kid.name}!</div>
          <h1 className="kids-title">Tu aventura de hoy: <em>{featured?.title.toLowerCase() ?? 'dinosaurios'}</em></h1>
          <p className="sub">Vas a charlar con Habi <b>5 minutos</b> y ganarás <b>monedas</b> si nombrás 3 cosas distintas. ¿Listo?</p>
        </div>
        <div className="kids-stars-today">
          <div className="sti">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
          </div>
          <div className="stt">monedas esta semana<b>+86</b></div>
        </div>
      </section>

      <div className="kids-hero">
        <div className="kids-hero-l">
          <div className="kids-hero-eye"><span className="star">★</span> Aventura del día</div>
          <h2>Hablamos de <span className="acc">{featured?.title.toLowerCase() ?? 'dinosaurios'}</span></h2>
          <p>Habi conoce muchísimos. ¿Cuál es <b>tu favorito</b>? Si te trabás, Habi te va a ayudar.</p>

          <div className="kids-hero-cta">
            <button
              className="btn-play"
              onClick={() => {
                if (featured) {
                  navigate(`/kids/sesion/${featured.id}`, { state: { topic: featured } })
                } else {
                  navigate('/kids/topicos')
                }
              }}
            >
              <span className="pl-ico">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              </span>
              ¡A hablar con Habi!
            </button>
            <Link to="/kids/topicos" className="btn-ghost-w">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 4v8h8"/></svg>
              Cambiar tema
            </Link>
          </div>

          <div className="kids-hero-meta">
            <span className="pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              5 minutos
            </span>
            <span className="pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
              hasta +20 monedas
            </span>
            <span className="pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              nivel: {kid.rank_label.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="kids-hero-r">
          <div className="habi-wrap">
            <Habi size={240} bounce />
            <div className="habi-bubble">¡Hola, te estaba esperando!</div>
          </div>
        </div>
      </div>

      <div className="kids-grid">
        <div>
          {/* TOPICS */}
          <div>
            <div className="kids-sh">
              <h3>¿De qué charlamos?</h3>
              <Link to="/kids/topicos" className="link">Ver todos →</Link>
            </div>

            <div className="kids-topics">
              {topics.length === 0 && (
                <div style={{ color: '#6B7672', fontSize: 13 }}>Cargando temas...</div>
              )}
              {topics.map((t, idx) => {
                const conf = TOPIC_COLOR_MAP[t.slug] ?? { bg: 'linear-gradient(135deg,#00B37E,#008F63)', sublabel: '' }
                return (
                  <button
                    key={t.id}
                    className="kids-topic"
                    style={{ background: conf.bg }}
                    onClick={() => navigate(`/kids/sesion/${t.id}`, { state: { topic: t } })}
                  >
                    {idx === 0 && <span className="recommend">★ hoy</span>}
                    <div className="t-ico" style={{ background: 'rgba(255,255,255,.18)' }}>
                      {TOPIC_ICONS[t.slug] ?? GENERIC_ICON}
                    </div>
                    <div className="t-name">
                      {t.title}
                      <small>{conf.sublabel}</small>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* MONSTRUO DEL IDIOMA */}
          <div className="kids-monster" style={{ marginTop: 22 }}>
            <div className="m-vis">
              <svg viewBox="0 0 100 100">
                <ellipse cx="50" cy="62" rx="34" ry="32" fill="#FB7C39" />
                <ellipse cx="40" cy="50" rx="18" ry="14" fill="#FFC23B" opacity=".7" />
                <path d="M30 30 L 26 18 L 36 28 Z" fill="#FB7C39" />
                <path d="M70 30 L 74 18 L 64 28 Z" fill="#FB7C39" />
                <circle cx="38" cy="56" r="6" fill="#fff" />
                <circle cx="62" cy="56" r="6" fill="#fff" />
                <circle cx="50" cy="44" r="5" fill="#fff" />
                <circle cx="38" cy="57" r="3" fill="#0D1412" />
                <circle cx="62" cy="57" r="3" fill="#0D1412" />
                <circle cx="50" cy="45" r="2.5" fill="#0D1412" />
                <path d="M38 72 Q 50 84 62 72" stroke="#0D1412" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M46 72 L 46 78 L 50 78 Z" fill="#fff" />
              </svg>
            </div>
            <div className="m-txt">
              <h4>
                <small>★ monstruo del idioma</small>
                "Gusté" se le escapa a {kid.name}
              </h4>
              <p>3 charlas seguidas dijo <b>"yo gusté el helado"</b>. La próxima vez le decimos cómo es: <b>"a mí me gustó el helado"</b>. ¡Si lo atrapa, gana 25 monedas!</p>
            </div>
            <div className="m-cta">
              <button className="kids-btn-catch">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
                ¡Atrapar!
              </button>
              <small>+25 monedas si lo lográs</small>
            </div>
          </div>
        </div>

        <div>
          {/* STREAK */}
          <div className="kids-streak">
            <div className="kids-streak-h">¡4 días seguidos!</div>
            <div className="kids-streak-sub">Si charlás hoy, llegás a <b>5</b>.</div>
            <div className="kids-streak-days">
              {['Vie', 'Sáb', 'Dom', 'Lun', 'HOY', 'Mié', 'Jue'].map((d, i) => {
                const klass = i < 4 ? 'done' : i === 4 ? 'today' : 'future'
                return (
                  <div key={d} className={`kids-sday ${klass}`}>
                    <span className="sd-name">{d}</span>
                    <span className="sd-cir">
                      {i < 4 ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                      ) : i === 4 ? '★' : '·'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* COLECCION */}
          <div className="kids-stickers-card" style={{ marginTop: 18 }}>
            <div className="kids-sh">
              <h3 style={{ fontSize: 18 }}>Mi colección</h3>
              <Link to="/kids/coleccion" className="link">{MOCK_STICKERS.filter(s => !s.locked).length}/30 →</Link>
            </div>
            <div className="kids-stickers-grid">
              {MOCK_STICKERS.map((s, i) => (
                <button
                  key={i}
                  className={`kids-sticker ${s.locked ? 'locked' : ''}`}
                  style={!s.locked ? { background: s.bg } : undefined}
                  title={s.label}
                  aria-label={s.label}
                >
                  {s.isNew && <span className="new">¡nuevo!</span>}
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          {/* PATH */}
          <div className="kids-path" style={{ marginTop: 18 }}>
            <h4 className="kids-path-h">Mi camino</h4>
            <p className="kids-path-sub">Cada nivel te abre temas nuevos.</p>
            <div className="kids-ranks-line"><i style={{ width: `${(currentRankIdx / (KIDS_RANKS.length - 1)) * 100}%` }} /></div>
            <div className="kids-ranks">
              {KIDS_RANKS.map((r, i) => {
                const klass = i < currentRankIdx ? 'done' : i === currentRankIdx ? 'now' : 'next'
                return (
                  <div key={r.slug} className={`kids-rank ${klass}`}>
                    <div className="r-ico">{i === KIDS_RANKS.length - 1 ? '★' : i + 1}</div>
                    <div className="r-name">{r.name}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </KidsLayout>
  )
}
