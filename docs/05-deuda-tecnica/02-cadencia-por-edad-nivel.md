# Deuda técnica — Cadencia de voz graduable por EDAD × NIVEL

**Idea (planteada por el dueño, 2026-07-12):** la **velocidad de habla del coach** no debería ser una regla hardcodeada solo para `mini`, sino una **propiedad graduable** asignada por el cruce **edad × nivel** — el mismo doble acoplamiento que ya tienen los tópicos.

## El concepto
Pensarla como una **escala** (nombres del dueño, orientativos):

```
lentísimo  <  lento  <  normal  <  velocidad nativa
```

Y asignar el valor según el **universo** donde "hablar lento" tiene sentido:
- **Toda la franja kids** (mini / junior / tween) → lento / lentísimo.
- **Adultos y teens en niveles iniciales** (A0 / A1) → lento.
- **Adultos/teens en niveles medios-altos** (B1+) → normal / nativa.

O sea: **edad joven _O_ nivel bajo ⇒ más lento.** Es doble acoplamiento (como el tópico, ver `project_modelo_datos_dos_ejes`).

### Matriz orientativa (a afinar con la profe)
| | A0 | A1 | A2 | B1+ |
|---|---|---|---|---|
| mini | lentísimo | lentísimo | lento | — |
| junior/tween | lento | lento | lento | normal |
| teen | lento | lento | normal | nativa |
| adult | lento | lento | normal | nativa |

## Estado actual (2026-07-12)
- La cadencia vive como **texto libre** dentro de `student_types.tutor_tonal_rules` (eje EDAD nada más).
- Se aplicó la instrucción reforzada **solo en `mini`** (kids mini). junior / teen / adult **no** la tienen, y **no** hay cruce con el nivel.
- Es el enfoque pobre: para cubrir el universo real habría que copiar el texto en cada segmento → duplicación y drift (lo que venimos evitando).

## Cómo debería cargarse (rediseño)
- Un **atributo de cadencia** (enum: `lentisimo | lento | normal | nativa`) resuelto del **cruce edad × nivel**, no texto libre duplicado.
- El **composer** lo traduce a UNA frase de tono en el bloque `tutor_profile` (una sola fuente, agnóstica al tópico).
- Encaja con la **ley de asignación** (`project_cura_generico_vs_segmento`): la cadencia es pedagógica (cómo se enseña) → por segmento, pero por el cruce edad×nivel, no solo edad.
- Recordar: Gemini Live **no tiene dial de velocidad** (confirmado) → el atributo se materializa como **instrucción de prompt** (efecto blando), no como parámetro de audio.

## Prioridad
Media. Primero **validar por voz** que la cadencia por prompt mueve la aguja en `mini` (experimento en curso). Si funciona, generalizar a este modelo edad×nivel en vez de repetir texto por segmento.
