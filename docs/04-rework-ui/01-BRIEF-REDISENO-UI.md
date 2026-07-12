# Habláh — Rediseño integral de UI (Brief para la app de diseño)

> **Consolidador de TODO el flujo de pantallas de Habláh para un rediseño de UI mobile-first.**
> El diseño visual lo hace una app/skill de diseño de aplicaciones — **este doc es el requerimiento
> (el QUÉ y el flujo); no implementar la UI sin el diseño aprobado.**
> El dueño va a adjuntar **capturas** de cada pantalla; este documento las acompaña describiendo
> la navegación, los elementos y los problemas a resolver.

---

## 1. Qué es Habláh

App de **aprendizaje de idiomas voz-first** con IA conversacional (inglés / portugués / italiano).
El alumno **habla por micrófono** con un tutor de voz (Gemini Live, audio bidireccional en tiempo real)
5 minutos por día. **Sin lecciones lineales ni exámenes.**

Tiene **dos productos dentro de la misma app**, con estéticas distintas:
- **App adulta** (`/app/*`): dashboard sobrio, la charla con un **orbe** verde.
- **Módulo Kids** (`/kids/*`): colorido, la charla con un **personaje/mascota** (león u otro "buddy") —
  esto **tiene que ser la joya de la app**.

Es una **PWA instalable** (se agrega a la pantalla de inicio del celular). **Se usa mayormente en
celular.** Deploy: front en Netlify, back en Cloud Run (charla de voz por WebSocket).

---

## 2. El problema (por qué se rediseña)

La UI actual **no funciona bien como app de celular**. Problemas concretos, verificados en iPhone:

- **Viewport roto:** el contenido queda **cortado arriba** (bajo el notch / Dynamic Island) y **cortado
  abajo** (bajo el home indicator). La safe-area no está bien resuelta.
- **No es responsive:** los elementos **no se acomodan al contenedor** según la resolución. En la
  pantalla de sesión kids, la card de vocabulario **se corta**, el **león se descentra al hacer scroll**,
  y el texto empuja todo.
- **La barra inferior tapa contenido** y queda pegada al borde.
- **El menú hamburguesa no responde al toque** (no abre).
- **Botones transparentes / sin feedback** de toque.
- **Altura mal centrada** — los elementos no quedan cómodos verticalmente.
- **La transcripción de la charla se acumula:** muestra el párrafo entero del coach y **tapa al orbe/león**.
- **El emoji del vocabulario (visual cue) se superpone sobre la cabeza del león.**

Ya se intentó parchar caso por caso y no alcanza: **necesita un rediseño de fondo, pensado mobile-first
como app nativa.**

---

## 3. Objetivo

Una PWA que **se sienta app nativa en el celular**:
- Todo **entra cómodo en cualquier resolución**, sin cortes, sin scroll donde no corresponde.
- **Safe-area respetada** (arriba y abajo), barra de estado clara (no negra).
- **Kids = la joya:** colorida, viva, con el **orbe/mascota protagonista** en el centro y un **subtítulo
  estilo película** abajo.
- Navegación **clara y con feedback** (menú que abre, botones que responden).

---

## 4. Mapa de navegación (el flujo completo)

```
PÚBLICO (sin login)
  /                     Landing (marketing, SEO) — hero, cómo funciona, tutores, precios
  /como-funciona, /tutores, /topicos, /topicos/:slug, /precios, /faq
  /login                Login (form) + acceso al "Modo Habi" (kids)

APP ADULTA (/app/*  — requiere login)
  Hoy                   dashboard: misión del día + racha + colección + camino (niveles)
  Mapa                  el "camino" de niveles/etapas (trail)
  Historial             clases pasadas con métricas
  Perfil                datos del alumno, tutor activo, intereses
  Configuración         ajustes (voz, tema, audio, notificaciones, nivel)
  Charla (sesión)       pantalla de voz: ORBE verde + transcripción + controles de mic
  Modo Kids · Perfiles  (/app/kids) el adulto crea/administra los perfiles de sus hijos

MÓDULO KIDS (/kids/*  — perfil de hijo)
  Hoy (Home)            hero "aventura del día" + grilla de tópicos + colección + racha + camino
  Categorías/Tópicos    (/kids/topicos) elegir de qué hablar (por categoría → tópico)
  Colección             (/kids/coleccion) stickers/premios desbloqueados
  Aventuras             (/kids/aventuras)
  Perfil                (/kids/perfil)
  Sesión con Habi       (/kids/sesion/:topicId) LA JOYA: mascota/león + subtítulo + botón hablar

BACK-OFFICE (/admin, /lab — no es parte de este rediseño, es interno)
```

**Entrada de la PWA:** el ícono instalado abre en `/app` → si hay perfil de hijo activo va a `/kids`,
si no hay sesión va a `/login`. La URL pelada `hablah.com.ar` muestra la landing (público).

---

## 5. Requisitos de UI / UX por pantalla

### 5.1 Login (`/login`)
- Panel de marca (verde) + **formulario**: usuario/email + contraseña + "Ingresar".
- Botón destacado **"Entrar al modo Habi"** (kids).
- El form debe permitir **guardar contraseña** del navegador (ya está: `autocomplete`).

### 5.2 App adulta — "Hoy" (`/app`)
- **Topbar** (sticky): logo/título, buscador, racha, avatar. En mobile: hamburguesa que abre un **drawer**
  lateral con la navegación. **(BUG actual: la hamburguesa no abre — resolver.)**
- **Misión del día** (card oscura grande con CTA "empezar charla") + **racha semanal** + **colección** +
  **camino/niveles** en columnas (en mobile: apiladas).
- **Bottom bar mobile** (fija): Hoy · Mapa · [FAB central] · Historial · Más. **(BUG: tapa contenido y
  el FAB/botón se ve transparente — resolver con safe-area y estados de toque.)**

### 5.3 App adulta — Charla / Sesión (el ORBE)
- Pantalla de voz a **fondo oscuro**. En el centro un **ORBE verde** que **pulsa con el audio**
  (habla el coach / habla el alumno, cambia intensidad/color).
- **Transcripción en vivo** de la charla (subtítulo).
- Controles: micrófono, terminar. Panel lateral (desktop) con el transcript + métricas.
- Al cerrar: **overlay de reporte** (split: informe + orbe).

### 5.4 Kids — "Hoy" / Home (`/kids`)
- **Topbar mobile:** hamburguesa + saludo "¡Hola, {nombre}!" + monedas + avatar.
- **Hero "aventura del día"** (verde) con la mascota **Habi** rebotando + CTA "¡A hablar con Habi!" +
  "Elegir de qué hablar".
- **Grilla de tópicos** coloridos (cards con escena/ilustración por tópico).
- **Monstruo del idioma** (card de gamificación: el error a corregir), **racha**, **colección de stickers**,
  **camino/rangos**.
- **Bottom tabbar mobile** (fija): Hoy · Colección · [FAB micrófono central] · Aventuras · Perfil.

### 5.5 Kids — Categorías / Elegir tópico
- Selector **categoría → subcategoría → tópico** ("¿De qué hablamos hoy?"). Cards por categoría.
- Cada tópico está acotado por **edad y nivel** (no todos los temas para todos).

### 5.6 Kids — SESIÓN con Habi (`/kids/sesion/:topicId`) — **LA JOYA, priorizar**
Esta es la pantalla más importante y la que más falla hoy. Debe ser **una pantalla fija sin scroll**, con
**tres zonas** que se acomodan a cualquier alto de celular:

1. **Arriba (fija):** "Volver" + estado ("Hablando con Habi" / "Tu turno" / "Habi te habla").
2. **Centro (protagonista):** el **león/mascota (orbe)** SIEMPRE **centrado**, con un **aro bicolor** que
   indica quién habla (ámbar = habla Habi, verde = tu turno). **Nunca se mueve, nunca se tapa.**
3. **Abajo (fija, altura constante):** el **subtítulo estilo película** — **2 líneas** que se van
   **sucediendo** (una de Habi, una del nene), **reemplazando** (NO acumula el párrafo entero). La frase
   que el nene tiene que decir se resalta ("Ella es mi… **grandma**"). Debajo, el **botón de micrófono**
   grande ("¡Hablar!") + secundarios (Cambiar tema / Invitar / Terminar), con **safe-area**.

**Visual cue del vocabulario (importante):** cuando el coach nombra una palabra con imagen (perro,
elefante), **NO** debe aparecer un cartel que tape al león. En su lugar: el **león hace un flip/fade y en
su mismo lugar aparece la foto/emoji de la palabra** unos segundos, y **después vuelve el león**. Usan el
mismo centro; nada se pisa. (Dirección validada: **forzar vocab visual degrada la clase** — el visual es
REACTIVO, solo aparece cuando el coach ya nombró la palabra, nunca al revés.)

**Ambiente:** objetos de la colección (SVG) flotando **por los bordes** de la pantalla, **lejos del centro**
(no deben acercarse a la cabeza del león). Blobs de color difusos de fondo.

### 5.7 Configuración (`/app` → Configuración)
- Lista de ajustes: **voz/acento** (US/UK), **tema** (claro/oscuro), **retención de audio**, **notificaciones**,
  **nivel CEFR**. Switches e items tipo lista.

### 5.8 Modo Kids · Perfiles (`/app/kids`)
- El **adulto** administra los **perfiles de sus hijos** (crear perfil hijo con nombre y edad → cada uno
  entra a su "Modo Habi"). Empty state: "Todavía no creaste ningún perfil" + "Crear primer perfil".

---

## 6. El "orbe" / mascota (elemento central de la marca)

- **Adulto:** un **orbe** verde abstracto que pulsa con la voz.
- **Kids:** un **personaje/buddy** (el usuario elige uno: león, etc.) con **aro de estado bicolor**.
- Ambos: **reaccionan al audio en tiempo real** (pulso/amplitud), y marcan **de quién es el turno**
  (color del aro). Es el corazón visual de la charla — debe verse **vivo, centrado y protagonista**.

---

## 7. Principios de diseño obligatorios (mobile-first)

1. **Celular primero, app nativa.** Todo pensado para una mano en un teléfono.
2. **Safe-area SIEMPRE:** header con `env(safe-area-inset-top)`, barras inferiores con
   `env(safe-area-inset-bottom)`; **nunca contar la safe-area dos veces**. Barra de estado **clara**
   (no negra).
3. **Cada elemento se acomoda al contenedor** en cualquier resolución. Usar **zonas flex + `dvh`**; el
   elemento central (orbe) **cede espacio** cuando falta alto; nada se corta.
4. **Sin scroll donde no corresponde:** las pantallas "de estar" (sesión, home) entran completas.
5. **Subtítulo estilo película:** contenedor de **altura constante**, **2 líneas** que se reemplazan.
   Nunca un párrafo que crece y empuja.
6. **El visual del vocab no tapa el orbe** (flip en el mismo lugar, ver 5.6).
7. **Feedback de toque en TODO** botón (pressed/active). Nada transparente ni "muerto".
8. **Sin emojis Unicode en la UI:** iconos SVG modernos (Lucide/Phosphor/Heroicons). (Los "emojis" del
   vocab kids son **ilustraciones/Lottie/SVG** de la biblioteca visual, no emojis de sistema.)
9. **Zoom bloqueado** (viewport `maximum-scale=1`), inputs a `≥16px` (evita auto-zoom iOS), sin scroll
   horizontal.

---

## 8. Sistema de diseño actual (base — se puede evolucionar)

- **Kids:** verde `#00B37E` (marca) + crema `#FFFCF6` + acentos vivos (rosa, violeta, cian, ámbar, naranja).
  Tipografía display **Sora**, cuerpo **Inter**. Look redondeado, glassy, con movimiento.
- **Adulto:** más sobrio; fondo oscuro para la charla, verde de marca en el orbe. Tipografía **Inter**
  (+ un serif editorial en algunos títulos).
- **Marca:** "habláh" en minúscula, la "h" como logo. Slogan "Hablás. Aprendés."

---

## 9. Reglas duras (no negociables)

- **Mobile real:** diseñar y validar para celular (iPhone con notch + home indicator, y Android).
- **Safe-area** resuelta arriba y abajo. **Barra de estado clara.**
- **Sin emojis de sistema** en la UI — iconos SVG.
- **Kids es la prioridad** (la joya): la sesión con la mascota tiene que quedar impecable.
- **No romper la charla de voz:** la UI envuelve una sesión WebSocket en vivo; el rediseño es visual/layout,
  no toca el pipeline de audio (orbe reactivo, transcript, botón de mic → esos contratos se mantienen).
- Entregable: **diseño aprobado primero**, implementación después.
```

