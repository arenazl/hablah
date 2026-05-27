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
  position: absolute; top: 14px; right: 14px; z-index: 5;
  display: flex; gap: 6px; padding: 5px;
  background: rgba(0,0,0,.55); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.08); border-radius: 999px;
}
@media (max-width: 880px) {
  .bg-picker { top: 10px; right: 10px; padding: 4px; gap: 4px; }
  .bg-picker button { width: 22px; height: 22px; }
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

/* ============== TOOLBARS SIMÉTRICOS (Estilo + Audio) ──────────────────
   Ambos picker tienen exactamente la misma anatomía:
   - Label de 56px de ancho (mismo padding, mismo case, misma opacidad)
   - Chips circulares 32x32, icon-only SIEMPRE (sin texto, label por title=)
   - Mismo gap (8px), mismo border-radius, mismas transiciones
   Así las dos filas se ven simétricas y "encajan" visualmente. */
.ped-picker, .voice-presets {
  display: inline-flex; align-items: center; gap: 8px;
  flex-wrap: nowrap;
}
.ped-picker-label, .voice-presets-label {
  font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: rgba(232,236,234,.42);
  width: 56px;  /* MISMO ancho para alinear chips entre filas */
  flex-shrink: 0;
}
.ped-picker-chips {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: nowrap;
}
.ped-chip, .vp-chip {
  --c: #00B37E;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0;
  border-radius: 999px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(232,236,234,.7);
  cursor: pointer; flex-shrink: 0;
  transition: transform .15s var(--ease), color .2s var(--ease),
              border-color .2s var(--ease), background .2s var(--ease),
              box-shadow .25s var(--ease);
}
.ped-chip svg, .vp-chip svg { color: var(--c); transition: color .2s var(--ease), filter .2s var(--ease); }
.ped-chip:hover, .vp-chip:hover {
  transform: translateY(-1px);
  color: #fff;
  border-color: color-mix(in oklab, var(--c) 55%, transparent);
}
.ped-chip.active, .vp-chip.active {
  color: #fff;
  background: color-mix(in oklab, var(--c) 18%, transparent);
  border-color: color-mix(in oklab, var(--c) 65%, transparent);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--c) 35%, transparent),
              0 0 16px color-mix(in oklab, var(--c) 40%, transparent);
}
.ped-chip.active svg, .vp-chip.active svg {
  color: #fff;
  filter: drop-shadow(0 0 4px color-mix(in oklab, var(--c) 80%, transparent));
}
.ped-chip-txt, .vp-chip-txt { display: none; }  /* SIEMPRE icon-only */

@media (max-width: 720px) {
  .ped-picker-label, .voice-presets-label { width: 44px; font-size: 9px; }
  .ped-chip, .vp-chip { width: 30px; height: 30px; }
}
@media (max-width: 480px) {
  .ped-picker-label, .voice-presets-label { display: none; }
}
.ped-chip-ico { display: inline-flex; align-items: center; justify-content: center; }
.ped-chip.active .ped-chip-ico { color: #fff; }

/* ============== COACH PICKER (dropdown custom para tutor activo) ============== */
.coach-picker { position: relative; display: inline-block; }
.coach-trigger {
  --c: #00B37E;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px 5px 8px; height: 30px;
  background: linear-gradient(135deg, color-mix(in oklab, var(--c) 22%, transparent), color-mix(in oklab, var(--c) 6%, transparent));
  border: 1px solid color-mix(in oklab, var(--c) 35%, transparent);
  border-radius: 999px;
  color: #E8ECEA; font-size: 13px; font-weight: 700; letter-spacing: -.005em;
  cursor: pointer; transition: all .18s var(--ease);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--c) 18%, transparent) inset;
}
.coach-trigger:hover:not(:disabled) {
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--c) 35%, transparent) inset,
              0 0 18px color-mix(in oklab, var(--c) 35%, transparent);
  transform: translateY(-1px);
}
.coach-trigger:disabled { opacity: .55; cursor: wait; }
.coach-orb {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  background: radial-gradient(circle at 32% 30%, color-mix(in oklab, var(--c) 92%, white) 0%, var(--c) 45%, color-mix(in oklab, var(--c) 60%, black) 100%);
  box-shadow: 0 0 10px color-mix(in oklab, var(--c) 70%, transparent),
              inset 0 0 6px color-mix(in oklab, var(--c) 85%, white);
  animation: coach-pulse 3.6s ease-in-out infinite;
}
@keyframes coach-pulse {
  0%, 100% { box-shadow: 0 0 8px color-mix(in oklab, var(--c) 55%, transparent), inset 0 0 6px color-mix(in oklab, var(--c) 85%, white); }
  50%      { box-shadow: 0 0 16px color-mix(in oklab, var(--c) 80%, transparent), inset 0 0 8px color-mix(in oklab, var(--c) 90%, white); }
}
.coach-chev { color: rgba(232,236,234,.7); transition: transform .2s var(--ease); }
.coach-picker.open .coach-chev { transform: rotate(180deg); }

.coach-panel {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 30;
  min-width: 280px; max-width: min(360px, calc(100vw - 32px));
  padding: 6px; display: flex; flex-direction: column; gap: 2px;
  background: rgba(14,22,20,.92); backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(0,179,126,.08);
  animation: coach-pop .18s var(--ease);
}
@keyframes coach-pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: none; } }
.coach-option {
  --c: #00B37E;
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px;
  background: transparent; border: 1px solid transparent; border-radius: 10px;
  color: rgba(232,236,234,.85); text-align: left;
  cursor: pointer; transition: background .15s var(--ease), border-color .15s var(--ease);
}
.coach-option:hover { background: rgba(255,255,255,.04); border-color: color-mix(in oklab, var(--c) 35%, transparent); }
.coach-option.active {
  background: color-mix(in oklab, var(--c) 14%, transparent);
  border-color: color-mix(in oklab, var(--c) 45%, transparent);
}
.coach-option .coach-orb { width: 22px; height: 22px; margin-top: 1px; }
.coach-option-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.coach-option-name { font-size: 13px; font-weight: 700; color: #F1F5F3; letter-spacing: -.005em; }
.coach-option-desc { font-size: 11.5px; line-height: 1.35; color: rgba(232,236,234,.55); }

.convo-header .meta-level { font-size: 12px; color: rgba(232,236,234,.55); }
`
