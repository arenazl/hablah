# Propuesta F4-03 — Flujo de pantallas (IA de navegación)

> **Esto es una PROPUESTA para el gate del dueño — WO F4-03.** No se tocó código de
> producción. El flujo de referencia ya está decidido en `02-hoja-de-ruta.md`; este
> documento lo baja a pantalla por pantalla contra el código REAL de hoy (relevado en
> `frontend/src/pages/`, `App.tsx` y `WebApp.tsx`), marca qué existe y qué es nuevo, y
> wireframea en texto las 2 pantallas nuevas para que se aprueben antes de codear.

## Convenciones usadas en este documento

| Marca | Significado |
|---|---|
| **[EXISTE]** | La pantalla ya está construida y en producción, tal cual. No se toca en F4-03 (más allá de aplicar el sistema visual de F4-05 después). |
| **[EXISTE → consolidar]** | Ya existe pero en una forma más rica/distinta de la que pide el flujo de referencia. Se propone qué recortar o reordenar — el dueño decide si aplica. |
| **[NUEVO]** | No existe ninguna versión hoy. Va wireframe de texto completo. |

---

## 1. Mapa de IA de navegación

### 1.1 Adulto

```
Landing (/)  ──[Empezar gratis]──▶  Login (/login)  ──[login OK]──▶  ¿ya completó onboarding?
                                                                         │
                                                    NO ──────────────────┼────────────────── SÍ
                                                     │                                          │
                                                     ▼                                          ▼
                                      Onboarding paso 1/3                              Home "Hoy" (/app)
                                      Tópicos [EXISTE→reencuadrar]                             │
                                                     │                              [1 tap] "Empezá tu clase"
                                                     ▼                                          │
                                      Onboarding paso 2/3                                       ▼
                                      Mini-test de nivel por VOZ [NUEVO]                 Clase (/app/practicar)
                                                     │                                    [EXISTE]
                                                     ▼                                          │
                                      Onboarding paso 3/3                              [salir / fin de sesión]
                                      Nombre y edad [NUEVO]                                      │
                                                     │                                          ▼
                                                     ▼                                  Post-clase (overlay)
                                              Home "Hoy" (/app)  ◀───────────────────────  [EXISTE]
                                              [EXISTE→consolidar]                                │
                                                                                     [cerrar] → vuelve a Hoy

Secundarias (desde el shell, siempre 1 tap): Progreso (historial /app/historial + mapa /app/mapa)
                                              · Tópicos/Perfil (/app/perfil) · Kids switch (/app/kids)
```

### 1.2 Kids

```
/kids (KidsHome)  ──[toca Habi / "Jugar"]──▶  ¿tiene edad guardada?
  [EXISTE]                                        │
                                    NO ────────────┼──── SÍ
                                     │                      │
                                     ▼                      ▼
                        /kids/seleccionar-edad      /kids/sesion/:topicId
                        [EXISTE]                    Clase kids [EXISTE]
                                     │                      │
                                     └──────────────────────┘
                                                  │
                                          [fin de sesión] → vuelve a /kids
                                          (colección/aventuras suman — cablear a
                                           sesiones reales es WO F4-04, no F4-03)

Gate parental: KidsParentSwitch — SIEMPRE antes de cualquier config o compra.
Hoy vive en /app/kids (cambio de cuenta adulto→kids) — revisar en la implementación
que también intercepte /kids/perfil si ahí hay algo sensible (fuera de alcance de
este documento; nota para el implementador de F4-03).
```

### 1.3 Invitado (`/charla/:token`)

```
Link compartido  ──▶  /charla/:token (GuestRoom)  [EXISTE — es el demo público]
```
Sin cambios de flujo. Solo aplica F4-02 (viewport/safe-area), que es WO aparte.

---

## 2. Regla transversal: ≤ 2 taps a la clase

Verificado contra las rutas reales:

| Desde | Camino | Taps |
|---|---|---|
| Home "Hoy" (`/app`) | botón primario → `/app/practicar?topic=<id>` (auto-arranca sesión, confirmado en el código: `PracticarView` lee `?topic=` y llama a `beginSession` sin pantalla intermedia) | **1** |
| Cualquier vista secundaria del shell adulto (mapa, historial, perfil) | nav del shell → Hoy → botón primario | **2** |
| `/kids` Home | botón "Jugar"/Habi → `/kids/sesion/:topicId` | **1** |
| Landing, sin sesión | Login → (si onboarding completo) Hoy → botón primario | cuenta desde login, no desde landing — la regla aplica **dentro de la app**, no incluye auth |

La regla se cumple hoy en el código relevado. Lo único a vigilar en la implementación: que
la Home consolidada (§4) noañada un paso intermedio (ej. un modal de "confirmá el tópico")
entre el botón primario y el inicio de la sesión.

---

## 3. Pantalla por pantalla — flujo adulto

### 3.1 Landing (`/`) — **[EXISTE]**
7 páginas (`Home, HowItWorks, Tutors, Topics, TopicDetail, Pricing, Faq`). CTA principal
"Empezar gratis" → `/login`. Sin cambios de flujo en F4-03 (SEO/contenido es F5).

### 3.2 Login (`/login`) — **[EXISTE]**
Un solo formulario email+password (o username sin `@`, se completa `@hablah.app`). Atajo a
modo Kids (`/kids`) debajo, separado por una línea.

**Hallazgo, no decisión mía — pregunta abierta para el dueño:** relevando `services/api.ts`
solo existe `auth.login` y `auth.me`; no hay una llamada `register`/`signup` en el frontend.
No se ve un flujo de alta de cuenta propio. Si hoy la cuenta se crea por otro medio (admin,
seed, backend auto-crea en el primer login), aclarar — porque el WO asume "registro/login"
como un paso del flujo y ahora mismo solo hay "login". Esto es constatación de código, no
una sugerencia de qué hacer.

### 3.3 Onboarding — paso 1/3: Tópicos — **[EXISTE → reencuadrar]**
`OnboardingBubbles.tsx` ya hace exactamente esto: splash → grid de categorías como orbs →
tocás una → elegís tópicos → "Comenzar (N)". Es sólido y no hace falta tocarlo.
**Cambio de flujo (no de UI):** hoy termina el onboarding entero (llama `onDone` → entra
directo a Hoy). Pasa a ser el paso 1 de 3: al terminar, en vez de `onDone`, avanza al paso 2.
Sugerencia liviana: agregar un indicador "Paso 1 de 3" en el header (hoy dice "Elegí tus
intereses" sin numeración) — el dueño decide si lo quiere.

### 3.4 Onboarding — paso 2/3: Mini-test de nivel por VOZ — **[NUEVO]**

Es la pieza nueva más importante del onboarding: 60-90 segundos de charla con el coach que
fija el nivel inicial (`cefr_level` en el perfil), reusando la misma tecnología de voz que
ya existe (`useLiveVoice`) — no es un test de opción múltiple.

```
┌──────────────────────────────────────────────────────────┐
│  ● ─ ─ ○ ─ ─ ○           Paso 2 de 3                [Saltar →]
│                                                              │
│                     ╭─────────────╮                         │
│                    │               │                        │
│                    │   (( o ))     │  ← aura/orb, mismo      │
│                    │               │    componente de la     │
│                     ╰─────────────╯    pantalla de clase     │
│                                                              │
│         "Contame algo de vos — dónde vivís,                 │
│          a qué te dedicás, qué te gusta hacer."              │
│                                                              │
│              [ Estado: escuchando… ]                        │
│                                                              │
│         ────────────────────────────────                   │
│         Charlá tranquilo. No hay respuestas                 │
│         correctas — esto nos dice en qué nivel               │
│         arrancás, no te evalúa.                              │
│                                                              │
│                    ~ 60-90 segundos                          │
└──────────────────────────────────────────────────────────┘

  al terminar (el coach corta o el alumno toca "Listo"):

┌──────────────────────────────────────────────────────────┐
│                                                              │
│                        ✓ (icono SVG check, no emoji)         │
│                                                              │
│              Arrancás en nivel B1                            │
│         Intermedio — ya armás oraciones con                  │
│         conectores, vamos a pulir fluidez.                   │
│                                                              │
│                  [ Continuar → ]                             │
└──────────────────────────────────────────────────────────┘
```

Notas de implementación (para cuando se codee, no ahora):
- Reusa el aura/orb y el hook `useLiveVoice` tal cual — cero componente de audio nuevo.
- Botón "Saltar" siempre visible (fricción cero es más importante que el dato — si el
  alumno no quiere hablar todavía, asignar un nivel default y que el motor lo corrija con
  la primera clase real vía `learner_state`, cuando F2 esté cerrado).
- El resultado escribe `student_profile.cefr_level` — el mismo campo que ya lee el motor
  (`compose_proto`), no hace falta un campo nuevo.
- Pantalla de resultado breve (no un desglose tipo "tu score fue X/100" — contradice "sin
  exámenes", que es mensaje de marca, ver `03-branding-mensaje.md`).

### 3.5 Onboarding — paso 3/3: Nombre y edad — **[NUEVO]**

El paso más simple — 2 campos, sin fricción. Se ubica al final (no al principio) a
propósito: el alumno ya invirtió tiempo (tópicos + charla), pedir datos livianos al final
tiene menor abandono que pedirlos antes de dar valor.

```
┌──────────────────────────────────────────────────────────┐
│  ● ── ● ── ○           Paso 3 de 3                          │
│                                                              │
│         Último paso. ¿Cómo te llamamos?                      │
│                                                              │
│         ┌────────────────────────────────┐                  │
│         │  Nombre                         │                  │
│         └────────────────────────────────┘                  │
│                                                              │
│         ┌────────────────────────────────┐                  │
│         │  Edad (opcional)                │                  │
│         └────────────────────────────────┘                  │
│                                                              │
│                                                              │
│                  [ Empezar a hablar → ]                      │
└──────────────────────────────────────────────────────────┘
```

Al confirmar → entra directo a Home "Hoy" con todo ya seteado (tópicos + nivel + nombre).
Cero pantalla de "¡Bienvenido!" intermedia — la regla ≤2 taps empieza a contar desde acá.

### 3.6 Home "Hoy" (`/app`) — **[EXISTE → consolidar]**

**Esto es lo más importante para leer con cuidado:** la Home YA EXISTE y es más rica que
lo que describe el flujo de referencia. Hoy tiene, todo junto en una pantalla
(`HoyView` en `WebApp.tsx`): hero con tópico del día + tutor + duración + 3 "desafíos en
pantalla" (vocab/gramática/restricción), tarjeta de "misión de rescate" condicional, lista
de últimas sesiones, tarjeta de racha con heatmap de 28 días, tarjeta de progreso CEFR con
gauge, y tarjeta de tópicos. Es una pantalla de dashboard con 5-6 bloques.

El flujo de referencia pide algo más angosto: **"una sola acción primaria: 'Empezá tu
clase de hoy' + racha + último reporte"**. Van las dos versiones para que el dueño elija —
esto es una decisión de producto, no solo de layout:

**Opción A — dejar la Home como está.** Es rica mas no está mal (no rompe la regla de
≤2 taps: el botón "Empezar charla" sigue siendo 1 tap). El riesgo es carga cognitiva antes
de la clase (Sweller: cuantos más bloques antes de empezar a hablar, más fricción mental).

**Opción B — consolidar al wireframe de referencia** (lo que pide el WO):

```
┌──────────────────────────────────────────────────────────┐
│  habláh                                    🔥 5      [≡]   │
│                                                              │
│         Hola, {nombre}                                       │
│                                                              │
│    ┌────────────────────────────────────────────────┐      │
│    │                                                    │      │
│    │   Hoy: {tópico del día}                           │      │
│    │   con {tutor} · {N} min sugeridos                 │      │
│    │                                                    │      │
│    │         [ Empezá tu clase de hoy → ]              │      │
│    │                                                    │      │
│    └────────────────────────────────────────────────┘      │
│                                                              │
│    "Tu profe se acuerda: la última vez te costó el          │
│     pasado simple. Hoy vamos a trabajar eso."                │
│     (línea de memoria — depende de F2/F4-04, si no hay        │
│      historia esta línea no aparece)                         │
│                                                              │
│    Racha: 5 días · mejor 12          Última charla: ayer,   │
│                                       7.5 fluidez            │
│                                                              │
│    ─────────────────────────────────────────────────       │
│    [Progreso]      [Tópicos]      [Perfil]                  │
└──────────────────────────────────────────────────────────┘
```

Todo lo demás (heatmap detallado, gauge de nivel, desafíos en pantalla, misión de rescate)
se movería a **Progreso** (`/app/mapa` + `/app/historial`), que ya existen como secundarias.
Esto es una propuesta de recorte real — no cosmética — y toca lógica de `WebApp.tsx`
(`HoyView`, ~líneas 660-1050). **No se implementa sin el OK explícito del dueño** (regla
global 5: es cambio de producto, no solo visual).

### 3.7 Clase (`/app/practicar`) — **[EXISTE]**

`PracticarView`. Ya es "aura + tópico + salir": usa `useLiveVoice` para animar el
orb/aura con `audioLevel`/frecuencias reales, muestra `topicTitle`, tiene `handleEnd` para
salir. Es la pantalla que las 3 maquetas de `02-sistema-diseno.md` visten (F4-05). F4-03 no
le cambia la estructura, solo confirma que el flujo de entrada (con `?topic=` desde Hoy) ya
cumple la regla de 1 tap.

### 3.8 Post-clase (overlay) — **[EXISTE]**

`SessionReportOverlay`: pantalla dividida full-screen al cerrar sesión, con el reporte
(elogio + puntos a pulir) ya armado por el backend (`sessions.report`). Hacerlo más
prominente / usar `learner_state` es el alcance de **F4-04** (depende de F2), no de F4-03.
Acá solo se confirma que el flujo (Clase → cierre → overlay → botón cerrar → vuelve a Hoy)
ya es el que pide la referencia.

### 3.9 Secundarias — **[EXISTEN]**

- **Progreso:** `/app/mapa` (`MapaView`) + `/app/historial` (`HistorialView`) + detalle de
  sesión (`/app/sesiones/:id`, reusa el mismo componente `SessionReport` del overlay).
- **Tópicos/Perfil:** `/app/perfil` (`PerfilView`) — permite editar intereses, ya
  referenciado desde la Home actual ("Editar →").
- **Kids switch:** `/app/kids` → `KidsParentSwitchLazy`.

**Hallazgo fuera de alcance de este documento** (para anotar, no para resolver acá): el
router de `WebApp.tsx` también monta `/app/qa` (`QaPanel`) y `/app/admin/users`
(`AdminUsersPanel`) dentro del mismo árbol que el producto — parecen residuos de laboratorio
que F0-04 no alcanzó a mover a `/lab/*` o `/admin/*` porque viven adentro del router anidado
de `WebApp.tsx`, no en `App.tsx`. Vale la pena que el dueño lo confirme como deuda pendiente
de F0-04/F4-01, no de F4-03.

---

## 4. Resumen de lo que cambia vs. lo que ya está

| Pantalla | Estado | Acción propuesta |
|---|---|---|
| Landing | EXISTE | Ninguna (F5) |
| Login | EXISTE | Ninguna — flag: no hay registro propio (pregunta al dueño) |
| Onboarding 1/3 Tópicos | EXISTE | Reencuadrar como paso 1/3 (agregar indicador de pasos, no bloquea) |
| Onboarding 2/3 Mini-test de voz | **NUEVO** | Construir según wireframe §3.4 |
| Onboarding 3/3 Nombre/edad | **NUEVO** | Construir según wireframe §3.5 |
| Home "Hoy" | EXISTE (versión rica) | **Decisión del dueño:** ¿Opción A (dejar) u Opción B (consolidar a 1 acción primaria, mover el resto a Progreso)? |
| Clase | EXISTE | Ninguna en F4-03 (viste con F4-05) |
| Post-clase | EXISTE | Ninguna en F4-03 (se profundiza en F4-04) |
| Progreso / Tópicos / Perfil | EXISTEN | Ninguna |
| Kids (flujo completo) | EXISTE | Ninguna en F4-03 — F4-06 es la mejora (visual reactivo) |
| Invitado | EXISTE | Ninguna (solo F4-02 viewport) |

---

## 5. Lo que necesito que el dueño confirme antes de codear

1. **¿Existe o no un flujo de registro propio?** (hallazgo de código, §3.2) — si no existe,
   ¿lo agregamos como parte de este WO o se resuelve aparte?
2. **Home "Hoy": Opción A (dejar rica) u Opción B (consolidar a 1 acción primaria)** — es la
   decisión de producto más grande de este documento.
3. **Mini-test de voz: ¿"Saltar" queda siempre visible?** (propuesto sí, por fricción cero)
4. ¿El indicador "Paso N de 3" en el onboarding suma o resta? (cosmético, baja prioridad)
