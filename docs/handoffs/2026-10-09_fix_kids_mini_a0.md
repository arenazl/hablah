# 2026-10-09 · Fix kids Mini A0: sin drill, sin cuento con palabras, sin referencias visuales

**Qué pasó.** Lucas vio la sesión 778 (timo, "Mi familia") y la rechazó entera: *"Papá se dice
dad, a ver, ahora vos... mirá quién está ahí, es tu hermana"*. Sus tres NO: referencias
visuales nunca; repetición nunca; no es un cuento donde se meten palabras.

**Diagnóstico (prompt_final real de la Auditoría, no a mano).** Cada síntoma estaba ORDENADO
por una fila del catálogo, y la regresión vive en `main` desde julio, no en la rama de
experimentos del 08/10:

| Síntoma | Fila | Cuándo |
|---|---|---|
| "X se dice dad... ¡ahora vos, timo!" (modelado doble) | `levels.A0.expected_production`, copiado a `age_level_matrix.mini×A0` | 2026-07-13 15:50 (el mismo día, a las 01:57, se había vuelto a la versión "frase abierta" que andaba de 10) |
| "pasamos de foto, mirá, ahí está tu abuela" | `topics.narrative_*` ("álbum de fotos gigante") inyectado como `Narrative_Anchors` | semillas narrativas importadas para 175 tópicos |
| "juego mágico", "cuentos de magia" | `student_types.mini.anclas_narrativas` ("USE ROLEPLAY, lugar mágico"), `estilo_de_sesion` ("Cuentito interactivo") | 2026-07-14 |
| una palabra por beat + "pedí repetición directa" | `age_level_matrix.mini×A0.pasos_de_la_sesion / accion_de_continuacion` | 2026-07-16, 2026-08-15 |
| "Decí conmigo: dad" | `conversation_rules.echo_protocol` (ley 9, gateada mini/junior ≤ A1) | 2026-07 |
| imagen desfasada de la voz | commit `f739973` (2026-07-14): disparo con CADA mención del vocab + 1,5 s inventados por match | pisó el filtro "se dice X" del 13/07 |

**Qué se hizo (commit `0ec31ef` en `main` + UPDATE en la base).**
- Front `KidsSession.tsx`: una tarjeta por palabra y por turno (primera mención), delay =
  backlog real del audio + offset. Sin incrementos artificiales.
- Base (el motor la lee en vivo, sin deploy): `age_level_matrix.mini×A0` (7 columnas: charla
  con contenido desde la vida del nene, el nene produce completando la frase abierta, sin
  "ahora vos", sin beats por palabra, sin historia que avanzar), `student_types.mini`
  (`NO ROLEPLAY` → la escena del tópico deja de inyectarse por el mecanismo que ya existía
  en el resolver; identidad y foco reescritos), `conversation_rules.echo_protocol` (frase
  abierta, no "decí conmigo"). Backup previo: `data/catalogo/backups/pre_fix_kids_mini_a0_*.json`.
  Snapshot `data/catalogo/student_types.json` refrescado.
- `Words_Available` se dejó: es una lista disponible, no una cuota; el rail nuevo dice
  "si no aparece, no la fuerces".

**Verificado:** el prompt recompuesto por el camino del probador (`_resolve_v2_sync`) ya no
tiene "ahora vos", "modelado doble", "mágic", "álbum", `Narrative_Anchors` ni beats. Build +
eslint OK. **No verificado:** la clase por voz. La vara es el micrófono: próxima clase Mini de
timo y mirar `/admin/auditoria` (prompt_final + transcript).

**Qué NO se tocó.** Mini A1/A2 y Junior (mismo esqueleto de beats y "decí {word}"),
`levels.A0.expected_production` (ya no se renderiza, pero sigue con el drill), el template
activo (es uno solo para todas las edades), la rama `test/kids-mini-a0` y sus experimentos
(`mini_lite_composer.py`, `mini_a0_enfoque_v1.json`: van en contra de la doctrina, no mergear).
