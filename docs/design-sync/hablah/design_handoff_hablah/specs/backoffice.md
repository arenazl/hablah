# Backoffice del motor

## Purpose
Auditar y editar el catálogo que alimenta al motor, y ver cómo se está comportando en producción. No es un ABM pelado: cada pantalla abre con una lectura ("15 tópicos · 11 calientes") antes que con una tabla.

## Navegación
Sidebar con grupos: **Operación** (Resumen, Métricas, Sesiones) · **Catálogo** (Tópicos, Edades y niveles, Personalidades, Reglas) · **Gente** (Alumnos, Usuarios) · **Probador** (embebido en iframe). Router por hash (`#/topicos/12`), breadcrumb en el topbar, y las vistas de detalle marcan su sub-item padre.

## Patrones
- **Hero de sección**: headline con la lectura del estado + fila de KPIs (número grande Sora 30px, label 11px uppercase, hint abajo en 11.5px; nunca meter el hint dentro del número).
- **Tabs** por sección, subrayado 2px del activo, sin scrollbar vertical.
- **Tablas**: header uppercase 11px, filas de 52px, hover `--bg-2`, click abre detalle.
- **Heat rows / matriz**: celda coloreada por volumen con el número de clases; vacías marcadas en ámbar.

## Vistas
- **Tópicos** — KPIs de cobertura; detalle con seed prompts por nivel (marcando faltantes y por qué importan), keywords con tipo y % de aparición real, vista "así entra al prompt" y el fragmento XML compilado.
- **Edades y niveles** — matriz con clases por celda; detalle de cruce con los 8 campos y el peso real de cada regla universal (gate + disparos).
- **Personalidades** — share de clases y minutos por profe; detalle con parámetros de entrega, preview de cómo suena y fragmento compilado.
- **Reglas** — las 12 reglas universales con su gate (age_groups + min/max nivel) y cuántas veces entraron.
- **Operación** — Resumen (headline, KPIs con sparkline, tópicos más usados, personalidades en producción, qué atender, errores frecuentes) y Métricas (cruces más usados, minutos por segmento, errores que disparan insistencia, evolución de clases).

## Notas
Todo el dato viene de `backoffice.data.js` (mock). Cada vista es una función `view*()` en `backoffice.views.js` que devuelve HTML; portarlas 1:1 a componentes.
