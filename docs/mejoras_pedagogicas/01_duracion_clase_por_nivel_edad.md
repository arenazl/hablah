# 01 — La duración de la clase está atada a nivel × edad

> Apunte pedagógico. NO implementado (hoy el motor de 9 pasos corre hardcodeado).

- **Bajo nivel de inglés (y/o alumno más chico):** el alumno "se estrella" — la
  clase **no puede durar más de ~5 minutos**.
- **Alto nivel:** la clase **se puede extender**.
- **Hoy** lo manejamos nosotros según edad + nivel.
- **A futuro:** debe ser **configurable por el alumno** también.

**Dónde va a vivir (cuando pasemos a BD):** cambia con el nivel Y con la edad →
`MethodologyModule` (clave: student_type + level). Columnas tipo
`max_session_minutes` / `max_turns_per_session`, pobladas por (segmento, nivel).
