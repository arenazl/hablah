# Orquestación como "seeds" — separación de responsabilidades y unificación

Doc de diseño (en progreso, 2026-07-13). Idea que fue saliendo al arreglar el bug de "frase abierta"
en kids. **No implementar sin diseñar el modelo completo primero** — toca el corazón del motor.

## De dónde salió

Bug real: en la clase de animales el coach abría *"elefante se dice…"* (frase abierta → palabra suelta,
PROHIBIDA en A0), mientras en colores/familia decía la frase completa. Mismo chico, mismo nivel.

Causa raíz: la **forma de producción** estaba dicha en DOS capas que se contradecían:
- `levels.A0.expected_production` (nivel) → "frase COMPLETA 'X se dice Y'" ✅
- `student_types.mini.opening_seed` + `.continuation_seed` (edad) → "dejá la frase abierta… la palabra o la frase-puente… ¿cómo se dice?" ❌ (habilitaba la palabra suelta)

Fix aplicado (anda): los seeds de mini quedaron **solo narrativa** y delegan la forma al `Expected_Production`.

## El principio (separación de responsabilidades)

Cada regla vive en UNA capa, según su alcance:

| Capa | Alcance | Responsabilidad | Ejemplo |
|---|---|---|---|
| `universal_conversation_rules` | **agnóstico** (toda edad/nivel) | reglas de turno/producción | "la forma la manda el Expected_Production; NO cambies la forma, solo el envoltorio; si se calla repetí la palabra clave despacio y esperá; después PARÁ; una interacción por turno" |
| `seed` (opening/continuation) | **edad** | narrativa | mini: "escena viva, jugando, energético" · junior: "misión A/B" · teen: "reto" · adult: "conversación real" |
| `expected_production` | **nivel** | la forma concreta | A0: "frase-puente completa 'X se dice Y'" |

**Pendiente #1 (chico):** mover lo AGNÓSTICO que hoy quedó hardcodeado en el `continuation_seed` de mini
—*"NUNCA la forma de producción. Si se queda callado, repetí la palabra clave despacio, alargada, y esperá.
Después PARÁ"* + el enlace *"producí como indica el Expected_Production"*— a `universal_conversation_rules`.
Así el seed queda 100% narrativa y el enlace no se repite ni se olvida por segmento.

## La visión grande (unificar en "seeds", eliminar tablas acopladas)

Hoy la orquestación está dispersa y acoplada en 4 tablas con campos sueltos (`student_types`, `levels`,
`app_config`, `topic`). La idea: **un solo modelo de "seeds"** con metadatos de alcance + responsabilidad,
y el composer los ensambla por contexto.

```
seeds( scope, scope_key, role, content, priority )
  universal · –        · reglas_turno      · "la forma la manda el Expected_Production; PARÁ; si se calla repetí…"
  edad      · mini     · narrativa         · "escena viva, jugando, energético"
  nivel     · A0       · forma_produccion  · "frase-puente completa X se dice Y"
  edad×niv  · mini_A0  · (si hace falta)   · …
  topico    · 141      · vocab/story       · …
```

El composer, dado (edad, nivel, tópico): selecciona **universal + edad + nivel + cruce + tópico**, ordena por
`priority` (recency) y arma el prompt. La separación de responsabilidades queda **estructural** — cada seed
declara qué es y a quién aplica. El enlace agnóstico pasa a ser **un seed universal** (uno solo).

**Beneficios:** menos tablas acopladas · agregar/quitar reglas es data pura · el enlace nunca se repite ·
determinismo total · fácil de auditar (un seed = una responsabilidad + un alcance).

**Trade-off / riesgo:** es rediseñar el modelo de datos del motor + migrar 4 tablas. Alto riesgo. Diseñar el
esquema, cómo el composer selecciona/ordena, y un plan de migración capa por capa ANTES de tocar nada.
Encaja como pieza de arquitectura del rework (`docs/03-rework`).

## Orden sugerido
1. (chico, ya se puede) Mover lo agnóstico del `continuation_seed` de mini a `universal_conversation_rules`.
2. (grande, diseñar primero) Modelo unificado de `seeds` que reemplace los campos dispersos.

## Muestreo de candidatos a migrar (2026-07-13, "en caliente")

Revisando las capas de kids (`student_types.mini` + `levels.A0` + `app_config`), los candidatos **más
evidentes** (muestreo — el dueño completa el resto):

| Regla (texto real) | Hoy vive en | Debería ir a | Por qué |
|---|---|---|---|
| *"A0: el alumno repite la frase completa ('perro se dice Dog'), no la palabra suelta"* | `mini.form_rules` (EDAD) | **NIVEL A0** (`expected_production`, ya lo dice) | Es **forma de producción del NIVEL**, no de la edad. Hoy está **duplicada** (y fue parte del lío). Sacar de `form_rules`. |
| *"Esperá la respuesta antes de seguir"* | `mini.form_rules` (EDAD) | **universal** (ya existe: regla 4 "one move per turn, then stop") | Turn-taking **agnóstico**, ya está en `universal_conversation_rules`. Redundante. |
| *"La clase la cierra el adulto con el botón; NUNCA te despidas / 'nos vemos la próxima'"* | `mini.form_rules` (EDAD) | **universal_conversation_rules** | Aplica a **toda edad/nivel** (ningún coach se despide, el adulto cierra con el botón). |
| *"NUNCA la forma de producción; si se queda callado repetí la palabra clave despacio y esperá; después PARÁ"* + enlace *"producí como indica el Expected_Production"* | `mini.continuation_seed` (EDAD) | **universal_conversation_rules** | Reglas de turno + delegación de forma = **agnósticas**. (Es el pendiente #1 de arriba.) |

**Lo que SÍ es de la EDAD (queda en mini, NO migrar):** *"CADA turno mezcla español + inglés"*, *"sin
onomatopeyas-drill"*, *"lo único que ve es la PANTALLA / mostrale el dibujo"*, y la narrativa (escena, jugando).
**Lo que es EDAD×NIVEL** (ver `02-cadencia-por-edad-nivel.md`): la cadencia de `tutor_tonal_rules`.

> Regla de dedo para completar el barrido: si una frase valdría **igual para un adulto o un teen**, es
> **universal**; si depende de **cómo se enseña a esa edad**, es del **seed**; si depende de **qué produce en
> ese nivel**, es del **`expected_production`**.

## 🔴 Hallazgo del Artifact (2026-07-13) — la guardia UNIVERSAL #12 también dice "frase abierta"

Revisando el Artifact *"El motor de Habláh en 4 niveles"* (nivel 3, las 15 guardias), la **guardia #12** de
`app_config.universal_conversation_rules` dice textual:
> *"Para hacer PRODUCIR: plantá la palabra, **dejá la frase abierta** y ESPERÁ en silencio. Si calla, andamiá…"*

Es **otra fuente del "frase abierta"**, pero a nivel **UNIVERSAL** — NO se tocó hoy (hoy limpiamos los seeds de
mini). En A0 el `expected_production` ("frase completa") la **contrarresta por prioridad** (va en el
`critical_objective`), por eso granja anduvo; pero es una **contradicción latente** para kids A0. **Revisar:**
¿la guardia universal debería dictar la FORMA ("frase abierta") o delegar al `expected_production` como hicimos
con los seeds? Es el mismo criterio, a nivel universal.

**Además, para actualizar el Artifact** cuando haya crédito: refleja el estado VIEJO en (a) el ejemplo del niño
A1 ("Arranque: dejá una frase abierta") y (b) la guardia #12. Y falta reflejar la separación de
responsabilidades que aplicamos hoy (seed = narrativa; forma = `expected_production`).
