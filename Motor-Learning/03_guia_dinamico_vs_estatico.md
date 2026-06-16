# Guía operativa — Estático vs. Dinámico y los 3 datos de entrada

Esta guía explica cómo, a partir de **3 datos del alumno**, el motor arma un prompt de 9 bloques distinguiendo lo que es fijo de lo que se calcula en cada sesión.

---

## 1. Los 3 datos de entrada

Todo arranca con tres datos. Dos los sabemos de entrada y uno se lo preguntamos al alumno:

1. **Edad** — define la *banda* (primera infancia, niñez, adolescencia, adulto).
2. **Nivel de inglés** — A1 → C1.
3. **Intereses** — qué le gusta (escalar, fútbol, videojuegos, cocina, negocios…). Se lo preguntamos al registrarse.

Con esos tres, el motor resuelve las 9 capas. Nada más se le pide al alumno.

---

## 2. Estático vs. Dinámico: las tres naturalezas

Cada bloque es de uno de tres tipos:

| Tag | Tipo | Significado |
|-----|------|-------------|
| **[E]** | Estático | Hardcodeado. Idéntico para todos. No depende de los inputs. |
| **[P]** | Preset | Se elige de un conjunto cerrado según edad y/o nivel. |
| **[D]** | Dinámico | Se llena con datos concretos del alumno o de la lección. |

---

## 3. Mapa de los 9 bloques

| # | Bloque | Tipo | Lo determina |
|---|--------|------|--------------|
| 1 | Runtime context | **[E]** (la fecha es el único dato que cambia) | sistema |
| 2 | Perfil del tutor | **[P]** | banda de edad |
| 3 | Pedagogía (estilo) | **[P]** | banda de edad |
| 4 | Enfoque de sesión | **[D]** | intereses + tipo de sesión |
| 5 | El alumno | **[D]** | **los 3 inputs** (edad + nivel + intereses) |
| 6 | Rieles (cómo enseñás) | **[P]** | banda de edad + nivel |
| 7 | Tópico del día | **[D]** | nivel + intereses |
| 8 | Narrativa | **[D]** | intereses + banda de edad |
| 9 | Arranque (trigger) | **[D]** (plantilla + datos) | nombre + tópico |

Lectura rápida: **el Bloque 5 es el único que recibe los 3 inputs crudos.** El resto se deriva de ellos.

---

## 4. Cómo cada input dispara los bloques

```
EDAD ───────► banda de edad ──► preset Tutor (B2)
                              ├─► preset Pedagogía (B3)
                              ├─► preset Rieles (B6, junto con nivel)
                              ├─► complejidad de la Narrativa (B8)
                              └─► se escribe en El Alumno (B5)

NIVEL ──────► ajusta los Rieles (B6): ¿se traduce al español o no?,
              cuántas palabras por turno, registro
           ├─► dificultad del Tópico (B7)
           └─► se escribe en El Alumno (B5)

INTERESES ──► tematiza el Enfoque (B4)
           ├─► tematiza el Tópico (B7) y la Narrativa (B8)
           └─► se escribe en El Alumno (B5)
```

---

## 5. Las bandas de edad y sus presets

Los presets **[P]** son el corazón de la adaptación. Resumen de qué cambia por banda:

### Primera infancia (5–6) — preset `early_child`
- **Tutor (B2):** mascota lúdica (dragón/animal espacial). Onomatopeyas y emojis.
- **Pedagogía (B3):** gamificación inmersiva, 0% gramática explícita, error nunca punitivo.
- **Rieles (B6):** prohibido preguntas abiertas en inglés; flujo de 3 pasos (frase corta → espejo en español → repetir 1 palabra); ≤30 palabras por turno.

### Niñez (7–10) — preset `child`
- **Tutor (B2):** compañero de aventuras, algo menos infantil.
- **Pedagogía (B3):** lúdico con mini-retos; gramática implícita.
- **Rieles (B6):** preguntas cerradas simples permitidas; frases de 2–4 palabras; espejo en español todavía presente.

### Adolescencia (11–17) — preset `teen`
- **Tutor (B2):** coach cercano, buena onda, sin mascota infantil.
- **Pedagogía (B3):** comunicativa, basada en temas que le interesan; gramática contextual ligera.
- **Rieles (B6):** preguntas abiertas simples OK; menos español; se fomenta la producción.

### Adulto (18+) — preset `adult`
- **Tutor (B2):** tutor profesional / coach.
- **Pedagogía (B3):** comunicativa / inmersión según objetivo (negocios, viaje, etc.).
- **Rieles (B6):** sin traducción salvo bloqueo; preguntas abiertas; corrección por *recast*.

### Modificador por nivel (sobre los Rieles, todas las bandas)
- **A1–A2:** espejo en español activado; vocabulario mínimo; mucho andamiaje.
- **B1:** español solo si se traba; conversación guiada.
- **B2–C1:** sin español; corrección por *recast*; matices e idiomático.

---

## 6. Regla de oro

El **Bloque 7 (Tópico)** nunca lleva instrucciones de comportamiento: solo vocabulario y frases objetivo. El *cómo* enseñar vive en los Bloques 2, 3 y 6. Si un texto le dice al modelo cómo actuar, no va en el tópico.

---

Ver `04_composer_3inputs.py` para la implementación que toma los 3 inputs y resuelve los 9 bloques, y `05_20_ejemplos.md` para los 20 casos generados.
