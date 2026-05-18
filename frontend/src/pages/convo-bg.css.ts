export const CONVO_BG_CSS = `
/* ============== FONDOS PARA LA PANTALLA DE CHARLA ============== */
/* Se aplican como className al .convo-view; el orb va encima.    */

.convo-view { position: relative; isolation: isolate; }
.convo-view > * { position: relative; z-index: 1; }
.convo-view::before {
  content: ''; position: absolute; inset: 0; z-index: 0;
  pointer-events: none; transition: opacity .4s ease;
}

/* (0) Solid black - default actual, no animacion */
.convo-view.bg-0::before { background: #000; }

/* (1) Aurora boreal - manchas verdes que flotan lento */
.convo-view.bg-1 { background: #000; }
.convo-view.bg-1::before {
  background:
    radial-gradient(ellipse 800px 500px at 20% 30%, rgba(0,179,126,.18), transparent 60%),
    radial-gradient(ellipse 600px 400px at 80% 70%, rgba(94,224,176,.12), transparent 60%),
    radial-gradient(ellipse 400px 600px at 50% 90%, rgba(5,74,58,.5), transparent 70%);
  animation: bg1-drift 18s ease-in-out infinite alternate;
}
@keyframes bg1-drift {
  0%   { transform: translate(0,0) scale(1); }
  50%  { transform: translate(-30px,20px) scale(1.08); }
  100% { transform: translate(20px,-30px) scale(1.04); }
}

/* (2) Mesh gradient animado - estilo Linear/Vercel */
.convo-view.bg-2 { background: #000; }
.convo-view.bg-2::before {
  background:
    radial-gradient(circle at 25% 25%, #00B37E33 0, transparent 35%),
    radial-gradient(circle at 75% 25%, #054A3A55 0, transparent 40%),
    radial-gradient(circle at 75% 75%, #00B37E22 0, transparent 35%),
    radial-gradient(circle at 25% 75%, #00845C44 0, transparent 40%);
  filter: blur(30px);
  animation: bg2-mesh 20s ease-in-out infinite;
}
@keyframes bg2-mesh {
  0%, 100% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; }
  50%      { background-position: 100% 50%, 0% 100%, 0% 50%, 100% 0%; }
}

/* (3) Grid de lineas + glow radial central */
.convo-view.bg-3 { background: #000; }
.convo-view.bg-3::before {
  background:
    radial-gradient(circle 600px at 50% 50%, rgba(0,179,126,.18), transparent 70%),
    linear-gradient(rgba(0,179,126,.04) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, rgba(0,179,126,.04) 1px, transparent 1px) 0 0 / 40px 40px;
  animation: bg3-pulse 6s ease-in-out infinite;
}
@keyframes bg3-pulse {
  0%, 100% { opacity: .85; }
  50%      { opacity: 1; }
}

/* (4) Particulas / estrellas verdes parpadeantes */
.convo-view.bg-4 { background: #000; }
.convo-view.bg-4::before {
  background-image:
    radial-gradient(1.5px 1.5px at 20% 30%, #5EE0B0, transparent),
    radial-gradient(1px 1px at 40% 70%, #00B37E, transparent),
    radial-gradient(2px 2px at 50% 50%, #7CE7BD, transparent),
    radial-gradient(1px 1px at 80% 10%, #00B37E, transparent),
    radial-gradient(1.5px 1.5px at 10% 90%, #5EE0B0, transparent),
    radial-gradient(1px 1px at 90% 80%, #7CE7BD, transparent),
    radial-gradient(1.5px 1.5px at 65% 35%, #00B37E, transparent),
    radial-gradient(1px 1px at 30% 50%, #5EE0B0, transparent);
  background-size: 600px 600px, 400px 400px, 500px 500px, 700px 700px, 300px 300px, 500px 500px, 600px 600px, 400px 400px;
  animation: bg4-twinkle 8s ease-in-out infinite;
}
@keyframes bg4-twinkle {
  0%, 100% { opacity: .4; }
  50%      { opacity: 1; }
}

/* (5) Anillos concentricos pulsando desde el centro */
.convo-view.bg-5 { background: #000; }
.convo-view.bg-5::before {
  background:
    radial-gradient(circle at 50% 50%,
      transparent 0, transparent 200px,
      rgba(0,179,126,.10) 201px, rgba(0,179,126,.10) 203px,
      transparent 204px, transparent 280px,
      rgba(0,179,126,.07) 281px, rgba(0,179,126,.07) 283px,
      transparent 284px, transparent 360px,
      rgba(0,179,126,.05) 361px, rgba(0,179,126,.05) 363px,
      transparent 364px, transparent 440px,
      rgba(0,179,126,.03) 441px, rgba(0,179,126,.03) 443px,
      transparent 444px
    );
  animation: bg5-ripple 4s linear infinite;
}
@keyframes bg5-ripple {
  0%   { transform: scale(.92); opacity: .6; }
  100% { transform: scale(1.18); opacity: 0; }
}

/* ============== SELECTOR DE BG (5 botoncitos arriba derecha) ============== */
.bg-picker {
  position: absolute; top: 18px; right: 18px; z-index: 50;
  display: flex; gap: 6px; padding: 5px;
  background: rgba(0,0,0,.5); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.08); border-radius: 999px;
}
.bg-picker button {
  width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.18);
  cursor: pointer; padding: 0; transition: all .15s var(--ease);
  display: grid; place-items: center; font-size: 9px; font-weight: 700; color: rgba(255,255,255,.7);
}
.bg-picker button:hover { border-color: rgba(255,255,255,.45); transform: scale(1.08); }
.bg-picker button.active { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(0,179,126,.3); color: #fff; }
.bg-picker .bgp-0 { background: #000; }
.bg-picker .bgp-1 { background: radial-gradient(circle, #00B37E66, #054A3A); }
.bg-picker .bgp-2 { background: linear-gradient(135deg, #00B37E, #054A3A, #00845C); }
.bg-picker .bgp-3 { background: #000 linear-gradient(rgba(0,179,126,.4) 1px, transparent 1px) 0 0 / 6px 6px; }
.bg-picker .bgp-4 { background: #000; box-shadow: inset 2px 3px 0 #5EE0B0, inset -3px -2px 0 #00B37E, inset 5px -4px 0 #7CE7BD; }
.bg-picker .bgp-5 { background: radial-gradient(circle, transparent 30%, #00B37E66 31%, transparent 33%, transparent 60%, #00B37E33 61%, transparent 63%); }
`
