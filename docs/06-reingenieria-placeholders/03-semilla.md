# F2 — Semilla de curación (la orquestación como dato)

**Fecha:** 2026-07-16 · **Fase:** F2 (Opus, curación) · **Entregable:**
`data/catalogo/orquestacion_placeholders.json` · **Estado:** generado, PENDIENTE gate del dueño (OK a los
textos ANTES de aplicar). No se aplicó a la BD.

## Qué contiene el JSON (v2 — cruzado con el JSON de Gemini)

Estructura adoptada de Gemini (mejor que la primera pasada por-celda):
- **`orchestration_template`** — el template XML, 1 fila activa. (Ahora con `Narrative_Mode` {EDAD} +
  `Narrative_Anchors` {TOPICO}.)
- **`dimension_edad`** (4) — campos `{EDAD}`: tutor, identidad, gamification, estilo, **anclas con MODO**
  (`USE/NO ROLEPLAY` + tipo de vínculo; el escenario concreto lo pone el tópico).
- **`dimension_nivel_recura`** (7) — PROPUESTA de re-cura del eje NIVEL (`levels`): gramática + idioma con
  porcentajes. Toca `levels`, decisión aparte del dueño.
- **`arquetipos_cruce`** (**11 arquetipos por rango**) — se materializan a las **18 filas** de
  `age_level_matrix` en el seed (mini_a1_a2 → 2 filas idénticas, etc.). Menos superficie, menos drift.
- **`conversation_rules`** (12) — reglas individuales gateadas por dato. El gating **reproduce los 2
  bloques A/B de Gemini** (ver `_conversation_rules_equivalencia_bloques`), pero individual = `INSERT`
  sin re-agrupar (doctrina F1).

### Merge con Gemini — qué se tomó y de qué me aparté
- **De Gemini:** arquetipos por rango · anclas con modo roleplay por edad · idiomas con %.
- **Corregí:** `adult-A0/A1` NO usa "repetí/decí conmigo" (Gemini lo tenía; tu `band_policy` adult lo
  prohíbe — infantiliza). Saqué **teen-A0** y agregué **junior-B1** (rango aprobado). Reglas individuales,
  no los 2 bloques.

## Decisiones de curación (el criterio, no relleno)
1. **El tono de la edad manda sobre el nivel bajo.** adult-A0/A1 NO usa "repetí/decí conmigo" (tu
   `band_policy` adult: infantiliza); teen-A1/A2 andamia "con onda de par", no cuentito. El "Decí conmigo"
   quedó SOLO para mini/junior (regla `echo_protocol` gateada a `["mini","junior"]` + `max A1`).
2. **El idioma sigue al nivel** (no hay hardcode): arranque en español (A0-A2), en inglés (B1+), reflejado
   por cruce. Esto mata la familia 1 sin el `Language_Consistency_Rule` contradictorio.
3. **Familia 3 resuelta, no movida:** los campos que antes chocaban dentro de `expected_production`
   (producir la frase completa vs palabra suelta) quedan separados en `produccion_esperada` +
   `formato_de_cierre_de_turno` + `aceptacion`, coherentes entre sí.
4. **`anclas_narrativas` salen del TÓPICO** (`{TOPICO}`), no del cruce (Gemini las había puesto por edad).
5. **Re-cura:** `{tutor}` en vez de "HABI"; muere "punitivamente" (mini.pedagogy); dedup tonal/form (el
   tono vive por cruce); "X" de los rails desaparece (los pasos se reescribieron por cruce).

## Gates para el dueño (antes de aplicar en F4)
- **Nombres de tutor:** Gemini propuso **Finn** (junior) y **Sam** (adult); hoy la BD tiene HABI y Coach.
  Confirmar cuáles quedan.
- **Sparse:** `reglas_de_tono_y_entrega` y `pasos_de_la_sesion` — si terminan idénticos entre niveles de
  una misma edad, colapsan a `{EDAD}`. Se decide viendo la matriz cargada (recién ahora es visible).
- **Reglas 7/8/11** (contacto personal + "weave, don't drill") removidas de la BD viva antes de esta
  reingeniería: re-agregables como INSERT si el dueño quiere.

## Próximo: F3 (resolver) y F4 (migración)
- F3: `services/orchestration_resolver.py` + **matar el hardcode de idioma** (composer:186) + visor
  from-template. F4: Alembic + aplicar esta semilla (dry-run → backup → apply).
