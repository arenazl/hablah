# Handoff — 2026-08-15/16 · Motor database-driven + multi-curso

## La doctrina (leer esto antes de tocar nada)

Dicho por el dueño, textual y con énfasis:

> "Tu código debería tener casi tres o cuatro variantes y nada más. No importa si
> vas a enseñar francés, portugués, a hacer un motor, a ajustar tornillos o
> fonética. Si tenés todo armado con placeholders, no tendrías que estar
> arreglando un `SELECT`."

**Qué significa en la práctica:**

- El código NO tiene que saber qué se enseña. La variación real son dos o tres
  semánticas —cómo le explicás a un chico, cómo a un adulto— y todo lo demás
  entra por placeholder.
- **Si para un cambio hay que tocar backend, está mal modelado.** Eso incluye
  cosas que parecen inocentes: agregar un campo a un `SELECT` para mostrar un
  nombre ya es señal de acoplamiento.
- No hay ambiente de QA y la app la usa él solo: se puede romper. Lo que no se
  puede es necesitar un deploy para cambiar comportamiento.

**PERO — matiz importante que aclaró después:** la JERARQUÍA sí es fija y está
bien que el código la conozca:

    disciplina → edad → nivel → categoría → tópico

Esas cinco son el esqueleto del motor. Lo agnóstico es *lo que las llena*, no la
cadena. No hay que "agnosticar" eso.

**Filosofía del producto:** es una app CONVERSACIONAL. El aprendizaje va
implícito. El alumno tiene que sentir que habla con un amigo o un colega — si
siente que arranca una clase, ya se perdió.

---

## Qué se hizo (commits, en orden)

| commit | qué |
|---|---|
| `1a194dd` | menú con divisores + delta de Hoy del handoff v2 + fotos de tópicos (Pexels) |
| `c6d1854` | Practicar del handoff v2: quick start, copiloto, filtros, grilla con fotos, selbar |
| `134225a` | disciplina como eje real; saca el hardcode de "FON", "ingles" y "CEFR" |
| `4968b0a` | 5 disciplinas nuevas (46 tópicos) + matriz unificada a castellano |
| `7dced2f` | **AppConfig no matcheaba la tabla** — el motor componía con la config VACÍA |
| `8312a98` | la cadena de combos filtra y deshabilita |
| `2cee15d` | database-driven: tope por edad, idiomas y etiquetas salen de tablas |
| `df68d38` | las reglas universales se filtran por DATO, no por un `if` con ids a mano |
| `ed4502c` | los números que deciden cómo suena la clase pasan a `motor_params` |
| `bc0227e` | los cursos dejan de ser solo-adultos; la categoría muestra su nombre |

---

## Estado del motor

**Catálogo: 146 tópicos activos, 7 disciplinas, 36 categorías.**
Todos con narrativa completa (setting + conflict + role + generated_vocab) y con
foto de Pexels.

    idiomas      17 cat · 99 top      oficios      5 cat · 12 top
    oratoria      3 cat · 12 top      creativo     3 cat ·  8 top
    musica        3 cat ·  7 top      informatica  4 cat ·  7 top
    fonetica      1 cat ·  1 top

**Ya es DATO** (se cambia con UPDATE, sin deploy):

| qué | dónde |
|---|---|
| disciplina de cada categoría | `categories.discipline` |
| tope de nivel por edad | `student_types.max_level_order` (NULL = sin tope) |
| grupo kid/adult | `student_types.phase_group` |
| nombres de idioma | `app_config.languages_map` ← tabla `languages` |
| etiquetas de segmento | `app_config.segment_labels` ← `student_types.name` |
| qué reglas recibe el coach | `app_config.conversation_rules_json` ← tabla |
| cuántas palabras ve el coach | `motor_params` (por nivel/edad/disciplina) |
| cuánta memoria del alumno | `motor_params.memory_interests` / `memory_mastered` |
| cierre universal | `app_config.universal_closing_rule` |

`motor_params` resuelve por especificidad: **level > age > discipline > global**.

**Herramientas nuevas** (todas en `backend/scripts/`):

    smoke_disciplinas.py    compone un prompt real por disciplina · hoy 7/7 OK
    audit_combos.py         producto cartesiano de TODOS los cruces
    lint_hardcode_motor.py  detecta hardcode del motor por gravedad
    lint_narrativas.py      puntúa las narrativas y lista las flojas
    cargar_disciplinas.py   carga disciplinas/categorías/tópicos
    fetch_topic_images.py   fotos de Pexels (calcado del de FenixParser)

---

## Pendiente, por prioridad

### 1. El probador está mal modelado (lo más importante)

`/api/motor/dimensions` arma un **payload a medida** con joins específicos. Cada
campo que el front necesita hay que agregarlo a mano en una query — por eso hubo
que tocar backend para mostrar el nombre de una categoría, y por eso el dueño
paró el trabajo.

**La pieza genérica ya existe en el proyecto y el probador no la usa:**
`ABM_REGISTRY` en `api/motor.py` lee cualquier tabla registrada, y el front ya lo
consume con `motorAPI.rows('topics')`. El ABM del backoffice funciona así.

Lo que corresponde: que el probador consuma las entidades crudas
(`categories`, `levels`, `student_types`, `topics`) y arme los combos del lado
del front. Con eso, agregar una columna aparece sola.

**Confirmar el enfoque con el dueño antes de empezar.**

### 2. Editar una regla no llega al motor

El composer lee `app_config.conversation_rules_json`, que es una **copia
publicada** de la tabla `conversation_rules`. Si se edita desde el ABM, el cambio
no impacta hasta republicar a mano. Rompe justo lo que el dueño quiere: editar y
ver. Lo mismo con `motor_params` y `languages_map`.

Idea: que la publicación sea automática (trigger, o que el endpoint del ABM
republique al guardar).

### 3. Catálogo incompleto — 13 de 32 cruces sin fila en `age_level_matrix`

    junior × B2        teen × A0        teen × C1        teen × C2
    junior/teen/adult × FONR   (fonética sólo existe para mini)

Sin la fila el motor no tiene instrucciones y el nivel sale deshabilitado con
"sin cruce" en el probador. Además, con el cruce cargado pero **0 tópicos**:
`idiomas × junior × B1`, y `adult × C2` en creativo/informática/oficios.

### 3.a DECISIÓN PENDIENTE: fallback agnóstico por capa vs. fail-fast

Pedido del dueño el 2026-08-16, y **contradice una regla dura vigente del
composer**:

    # composer_proto.py, docstring
    # REGLA DURA: el motor NO usa fallbacks. Si un dato de catálogo falta,
    # se lanza MotorDataMissing. Mejor explotar y saber qué falta.

Lo que pide: *"si por un error nuestro no lo llenamos para algún nivel, que la
charla no se vuelva tosca — que tenga un fallback con un mensaje agnóstico. Eso
tiene que aplicar a cualquier capa."*

Las dos posturas sirven, pero a públicos distintos:

- **fail-fast** es para el backoffice: que se vea qué falta y se cargue.
- **fallback agnóstico** es para el alumno: no puede pagar un olvido de carga con
  una charla rota.

**Propuesta (sin implementar):** en runtime nunca explota — cae a un texto
agnóstico **cargado como dato** en cada capa (no como constante en el código) —
y en paralelo el probador marca ese cruce en rojo como dato faltante. El alumno
no se entera; el dueño lo ve igual.

Requiere decidir dónde viven esos textos mínimos por capa. Candidato: una fila
`scope='fallback'` por campo, o una columna `*_fallback` en cada tabla del eje.

### 3.b El saludo: SÍ varía por nivel (corrección del propio dueño)

Primero dijo que el saludo sólo dependía de la edad; después lo corrigió y tiene
razón: **también varía con el nivel**, porque cambia la complejidad lingüística.

    A0  "hello, how are you? how was your day?"
    C1  "what's up? how was your week? anything new in dev?"

O sea el **cruce edad × nivel es el lugar correcto** — `age_level_matrix` — y lo
que se hizo el 2026-08-16 no estaba mal ubicado, estaba INCOMPLETO: el saludo se
escribió sólo en `adult` B2/C1/C2, y falta en los otros 16 cruces.

Lo que NO cambia con el nivel es que **el saludo tiene que estar siempre**: eso ya
quedó como regla universal `always_greet` en `conversation_rules`.

Ojo con la tentación de meterlo en `student_types.opening_seed`: ese campo existe
y es por edad, pero si el saludo varía también por nivel, ahí sólo entraría el
registro/tono, no el texto.

El saludo se escribió **dentro del `comando_de_arranque` de cada cruce**, o sea
en `age_level_matrix` (edad × nivel). Está mal por la ley de asignación:

- ¿Cambia con la EDAD? **Sí** — a un nene se lo saluda distinto.
- ¿Cambia con el NIVEL? **No** — saber poco o mucho inglés no cambia que te
  saluden.

Entonces va en el eje EDAD, **y el campo ya existe**: `student_types.opening_seed`
(el composer ya lo rota entre variantes por semilla). Lo que falta es que el
arranque del cruce traiga sólo el **placeholder**:

    student_types.opening_seed      "¡Hola {name}! …"        ← por edad, N variantes
    age_level_matrix.comando_...    "{saludo}. Después, UNA línea sobre {topic}…"

El cruce dice CUÁNDO va el saludo; CÓMO suena lo pone la edad. Hoy el 2026-08-16
se hizo al revés: se escribió el saludo dentro de los cruces adult B2/C1/C2, lo
cual funciona pero repite texto en 19 filas y lo ata al nivel.

**Es el ejemplo canónico de la doctrina**: el placeholder se llama `{saludo}` /
`greeting` / `icebreaker`, vive al inicio de la orquestación y sólo se acopla a
la edad.

### 4. Hardcode que queda (correr `lint_hardcode_motor.py`)

    composer_proto:324   el if viejo de reglas — quedó SÓLO como red
    _IDENTICAL_COGNATES_ES_EN   lista de cognados atada al par es-en
    ABM_REGISTRY         nombres de tabla interpolados (SQL dinámico)

El dueño marcó el SQL dinámico como problema serio. Hay f-strings con nombres de
columna/tabla en queries — `scripts/unificar_idioma_matriz.py` es culpable, y el
registry del ABM también.

### 5. Sin validar por voz

Todo lo de hoy cambia cómo suena la clase y **sólo se probó una vez**:

- **El coach pasa de 6-8 reglas a 9-11.** Va contra lo ya medido en este
  proyecto ("menos reglas = más bandwidth"; en B1+ el Flash tiene techo de
  EJECUCIÓN). Se revierte SIN deploy borrando `conversation_rules_json`.
- Las keywords ahora **rotan por semilla** en vez de tomar las primeras 6.
- La cantidad de palabras cambió por nivel: A0 bajó de 6 a 4, C2 subió a 10.
- Las 5 disciplinas nuevas nunca se escucharon en una charla real.

---

## Hallazgos que conviene no perder

**`AppConfig` estaba roto y nadie lo sabía.** El modelo declaraba 6 columnas
(`key`, `value`, `kind`, `section`, `label`, `updated_at`) y la tabla tiene DOS
(`config_key`, `config_value`). Cualquier `select(AppConfig)` reventaba, así que
el motor venía componiendo **con la config vacía**. Ya estaba dejando rastro:
`services/gemini_live.py:165` tiene un comentario explicando que por eso ahí se
usa SQL crudo — se esquivó el bug en un lugar en vez de arreglar el modelo.

**714 palabras curadas que el coach no veía.** El corte era `keywords[:6]` y
tomaba **las primeras por orden de carga**: 88 tópicos tienen más de 6, y 15
tienen 40 de las que se usaban 6.

**El saludo nunca fue una regla universal.** Vivía en el `comando_de_arranque` de
cada cruce: A0-B1 saludaban, B2/C1/C2 decían "sin preámbulo". Por eso en B2 el
coach abría directo con una opinión técnica. Ya se cargó `always_greet` como
regla universal y se sacó la contradicción de los tres cruces altos.

**Los ES1-3 fueron un experimento del propio dueño** (commit `24a1900`), ya
revertido en `88de480` (`active=0`). No hay nada que migrar ahí.

**Fonética es otro mundo y está fuera del camino crítico.** Con el ASR actual no
se puede evaluar pronunciación —la información fonética se pierde en la
conversión audio→texto— así que el coach modela pero nunca corrige. Contexto
completo en `docs/fonetica_brief.md`, con 21 temas propuestos que necesitan
curación fonoaudiológica.

---

## Cómo trabajar

- **Front en localhost:5200, back en Cloud Run, base Aiven (una sola).** Los
  cambios de front se ven al toque; los de back necesitan push + build; los de
  base pegan al instante en los dos.
- Con base única, **agregar columnas es seguro** (el código viejo las ignora),
  pero **renombrar o borrar exige pushear el código en el mismo movimiento**.
- Verificar siempre con `smoke_disciplinas.py` antes de pushear.
- El dueño pidió **cuidar el contexto**: rutas absolutas en Bash (el cwd se
  resetea), una verificación por cambio, respuestas secas.

## Prototipos del handoff de diseño

En `docs/design-sync/hablah-ds/v2/`: Hoy, Practicar (+ `practicar.js`), Mapa,
Historial, Perfil y `app.css`. Vienen del proyecto `hablah` de Claude Design
(id `031f4bbb-0b30-4c08-a08e-8e40368bf91d`), **carpeta raíz**.

Implementadas: Hoy y Practicar. **Sin hacer: Reporte y Perfil** — el dueño las
bajó de prioridad ("la interfaz a segundo plano, quiero que ande el motor").
