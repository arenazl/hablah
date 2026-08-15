# Habláh — Design System

**Habláh** es aprendizaje de idiomas **por voz** con un coach de IA: hablás, el coach
conversa con vos como un colega, y la clase es invisible. La marca es **cálida, directa
y viva** — verde como "dale, hablá"; tipografía limpia; cero solemnidad académica.
El nombre juega con "hablá" (voseo rioplatense) y su h muda: la app es argentina y
conversacional hasta en el logo.

> Sistema creado en este proyecto a partir del producto REAL: los tokens salen del
> código vivo (backoffice + webapp), no de un Figma. Fuente: repo `Hablah`,
> `frontend/src/pages/backoffice.css.ts`, `webapp.css.ts`, paleta OWNERS del motor.

## Superficies

| Superficie | Audiencia | Estado |
|---|---|---|
| **App del alumno** (PWA) | Adultos/teens que aprenden hablando | En producción |
| **Kids** (mini/junior) | Chicos 4-12, con capa visual propia | En producción |
| **Back office / Probador** (`/motor`) | El dueño-profesor: arma, inspecciona y prueba clases | Rediseño en curso → `ui_kits/probador/` |

## Índice

```
/
├── README.md               — este archivo
├── colors_and_type.css     — tokens + componentes base (importar en todo HTML del kit)
├── preview/
│   └── foundations.html    — card de fundamentos (paleta, dueños del dato, tipo)
└── ui_kits/
    └── probador/           — 4 layouts del Probador de clases + brief
```

## Voz y copy

Habláh habla como **un profe-colega argentino**: cercano, concreto, sin jerga académica.

- **Persona:** vos. Jamás usted.
- Botones dicen lo que pasa: "Iniciar clase", "Terminar", "Guardar y recomponer".
- Errores: qué pasó → qué hacer. Nunca "Oops".
- **CERO emojis** en UI, código y datos (regla dura del dueño). Iconos SVG (Lucide, 2px stroke).
- Términos del dominio se respetan: cruce, cadencia, semilla, orquestación, placeholder —
  el usuario del back office es el dueño del motor y ese vocabulario ES el producto.

## Color

- **Primario `#00B37E`** (Habláh green): acción, voz en vivo, éxito.
- **Acento `#FFB800`**: energía, destacados, kids.
- Neutrales cálidos con tinte verde: de `#FAFBFA` (bg) a `#0D1412` (fg). Nunca gris clínico.
- Semánticos: danger `#E5484D` · info `#3B82F6` · violet `#7C3AED`.

### Paleta por DUEÑO del dato (ley de la casa)

En el back office, **cada dato se colorea por la tabla de la que viene** — el dueño
identifica secciones por color de un vistazo, en TODAS las vistas (crudo, formateado,
mapa de nodos, capas). Nunca inventar colores nuevos para esto:

| Dueño | Color | Qué es |
|---|---|---|
| Runtime | `#3B82F6` azul | sesión: fecha, alumno, dispositivo |
| EDAD | `#FBBF24` ámbar | student_types — el CÓMO por edad |
| NIVEL | `#7DD3FC` celeste | levels — el QUÉ lingüístico |
| CRUCE | `#00B37E` verde | age_level_matrix — la celda edad×nivel |
| TÓPICO | `#818CF8` índigo | topics — léxico y anclas |
| REGLAS | `#A855F7` violeta | conversation_rules gateadas |
| Template | `#8E938F` gris | literal del esqueleto |
| Código | `#F87171` rojo | lo único que vive en Python |

## Tipografía

- **Inter** para todo el UI (400/500/600/700/800). El peso hace la jerarquía, no el tamaño.
- **Mono** (Geist Mono / ui-monospace) para: claves de campos, rutas `tabla.columna`,
  cadencias (`1,0,2,1,0,2,3,1`), semillas, XML crudo. Lo técnico SE VE técnico.
- Labels uppercase chiquitos (10px, letter-spacing .08em) para títulos de sección.
- `tnum` siempre en números alineados.

## Forma

- Radii: cards `12px`, inputs `10px`, pills `999px`, sheets `16px`. Suavemente geométrico.
- Bordes 1px del tinte cálido; borde IZQUIERDO de 3-4px como marcador de dueño del dato.
- Sombras: 2 niveles (card / float). Jamás borde visible + sombra fuerte juntos.
- Spacing base 4px; secciones respiran en múltiplos de 8.

## Temas

Claro y oscuro completos vía `[data-theme="dark"]` — los tokens cambian, los componentes
no se enteran. El oscuro es verde-carbón (`#0B1210`), no negro azulado.

## Interacción

- Easing único `cubic-bezier(.2,.8,.2,1)`; 150ms UI, 240ms paneles.
- La VOZ es el corazón: los estados de clase (conectando / te escucha / el profe habla)
  siempre visibles, con el verde vivo y nivel de mic. La clase en vivo **nunca tapada**.
- Nada de `<select>` nativo crudo: selects modernos con búsqueda.

## Ver también

- `ui_kits/probador/BRIEF-claude-design.md` — el brief completo del rediseño del Probador
- `preview/foundations.html` — fundamentos renderizados como card
