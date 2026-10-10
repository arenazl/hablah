# Pendientes

Formato (base-compartida/28): una línea, el dato que lo justifica y dónde está el detalle.

- **Kids Mini A1/A2 y Junior A0/A1 siguen con beats por palabra y "decí {word}".** Mismo
  esqueleto que el drill de Mini A0 corregido el 2026-10-09; corregir con los mismos principios
  cuando Lucas valide Mini A0 por voz. Detalle: `docs/handoffs/2026-10-09_fix_kids_mini_a0.md`.
- **`levels.A0.expected_production` conserva el modelado doble** (editado 2026-07-13 15:50). Hoy
  no se renderiza (el template usa `age_level_matrix`), pero una re-cura desde `levels` lo
  traería de vuelta. Alinear con la versión "frase abierta" (`backend/scripts/_backup_a0_expected_production_20260712_031000.json`).
- **Rama `test/kids-mini-a0` y `experiment/kids-organic-reciprocity-20261008`: no mergear.**
  `mini_a0_enfoque_v1.json` es el texto TPR de junio ("decí después de mí: ARMS"), opuesto a
  la doctrina; `mini_lite_composer.py` saltea el motor único. Borrar las ramas cuando Lucas lo diga.
- **Snapshot del catálogo desfasado.** `snapshot_catalogo.py` muestra 3.300 líneas de drift en
  `topics.json`, 166 en `levels.json`, 82 en `app_config.json` respecto de lo commiteado; el
  2026-10-09 sólo se commiteó `student_types.json`. Correr y commitear el snapshot completo en
  un commit propio.
- **Prefix del VAD kids: slider en 700, memoria del 13/07 dice calibrado 200 a 250.** Default
  en `KidsSession.tsx` (`kids_prefix_ms`) y fallback 700 en `gemini_live_engine.py`. Calibrar
  con clases reales y sacar el panel dev cuando quede fijo.
