# Motor Mini — Estado roto (2026-06-27)

## Qué está pasando

El coach de Mini A0 genera incoherencias graves en cada clase. No es estocástico — es estructural.

## Incoherencias concretas observadas hoy

### 1. Pide cosas que la app no puede hacer
```
Coach: "¿Querés ver una foto?"
```
La app es 100% voz. No hay fotos, no hay imágenes, no hay cámara. El coach improvisa referencias visuales que no existen.

**Causa:** `session_focus` (student_types.mini) dice "HABI y el chico exploran juntos un escenario del tópico". Gemini interpreta "escenario" como escena visual y empieza a referenciar fotos, personajes, lugares que no existen en la app.

### 2. Pide respuestas de monosílabo
```
Coach: "¿Querés ver una foto?"  → espera: "sí" / "no"
```
Para A0, el protocolo es que el alumno produzca siempre la frase-puente completa: "X se dice Y". Una respuesta monosílabo ("sí") no activa el VAD de Gemini Live (dura menos de 1 segundo) y no se registra. La clase queda muda.

**Causa:** La pregunta yes/no está prohibida en `expected_production` A0 desde hoy, pero el `session_focus` sigue generando el escenario narrativo que naturalmente termina en pregunta sí/no.

### 3. Frase en inglés completa como apertura
```
Coach: "This is my mom, esta es mi mamá."
```
Para A0, `language_rule` dice "100% ESPAÑOL. Lo ÚNICO en inglés es la palabra objetivo del día." El coach debería decir "Esta es mi mamá, en inglés: mom" — no liderar con oración en inglés.

**Causa:** `opening_seed` fue actualizado hoy para ser genérico ("respetá Language_Rule del nivel"), pero Gemini tiene recency bias y sigue usando el patrón de A1 ("English phrase → Spanish echo") para A0.

---

## Qué se cambió hoy (y qué no funcionó)

| Campo | Cambio | Efecto |
|-------|--------|--------|
| `student_types.mini.tutor_tonal_rules` | Restaurado (estaba corrupto: "exclamativ67vuelta") | Probablemente ayuda |
| `student_types.mini.session_focus` | Restaurado (estaba corrupto: "Aventur667") | Genera escenarios con fotos — problema |
| `student_types.mini.form_rules` | Restaurado (estaba corrupto: "Hablá DESPA") | Probablemente ayuda |
| `student_types.mini.opening_seed` | Actualizado — delegado a Expected_Production | No tuvo efecto visible |
| `student_types.mini.continuation_seed` | Actualizado — cero preguntas abiertas | No tuvo efecto visible |
| `levels.expected_production` (A0) | Estructura fija 3 pasos + prohibición de preguntas | Muy reciente, sin validar |
| `behavioral_guard` g19 | Actualizado | NO AFECTA producción (motor v3 desactivado) |
| `trigger_template` t18, t20 | Insertados | NO AFECTAN producción (motor v3 desactivado) |

## Problema de arquitectura real

El motor de producción es **compose_proto** (`services/composer_proto.py`). Lee:
- `student_types` (eje EDAD)
- `levels` (eje NIVEL)
- `topics` (tópico de la clase)

El `session_focus` restaurado dice que HABI "le pide ayuda con algo concreto" en un escenario. Eso es correcto para A1/A2 donde el alumno puede conversar. Para A0 es un desastre: genera preguntas sí/no y referencias a cosas que no existen.

**El session_focus es genérico para todo Mini (A0, A1, A2).** No diferencia niveles. Un A0 necesita drill estructurado (model → repeat), no "exploración de escenario".

## Lo que hay que resolver

### Urgente
1. **`session_focus` para A0**: Necesita anular el escenario narrativo. Opciones:
   - Agregar un campo `session_focus_a0` a student_types (schema change)
   - Mover la restricción de escenario al `expected_production` A0 con "PROHIBIDO: referencias a fotos, personajes, lugares que no existen en la app"
   - Cambiar el `session_focus` genérico para que no genere referencias visuales

2. **Preguntas yes/no**: Aunque `expected_production` A0 ahora las prohíbe, el `session_focus` las genera. La prohibición debe ser más fuerte o el session_focus debe cambiar.

3. **Idioma en apertura**: El coach abre con frase en inglés para A0. El `language_rule` A0 lo prohíbe pero el `opening_seed` genérico no lo refuerza lo suficiente.

### No urgente (motor v3)
- `behavioral_guard`, `trigger_template`, `level_policy` — tablas del motor v3 (desactivado con `MOTOR_V3_KIDS=0`). No afectan nada en producción hasta que se active el flag.

## Cómo verificar el estado del motor antes de tocar nada

```python
# Verificar campos críticos de Mini (NO deben estar truncados)
import pymysql
from services import motor_engine
db = motor_engine._connect()

with db.conn.cursor(pymysql.cursors.DictCursor) as cur:
    cur.execute('SELECT tutor_tonal_rules, session_focus, form_rules, opening_seed, continuation_seed FROM student_types WHERE slug=%s', ('mini',))
    r = cur.fetchone()
    for k, v in r.items():
        print(k, ':', repr(v)[:80])
    
    cur.execute('SELECT language_rule, expected_production FROM levels WHERE code=%s', ('A0',))
    lv = cur.fetchone()
    print('language_rule:', repr(lv['language_rule'])[:80])
    print('expected_production:', repr(lv['expected_production'])[:80])
```

Si algún campo tiene texto cortado (termina en medio de una palabra) o tiene números random ("667", "exclamativ67vuelta") — está corrupto. Restaurar desde `backend/scripts/seed_tutor_personas.py` y `backend/scripts/seed_v25_dos_ejes.py`.

## Próximo paso recomendado

El `session_focus` de Mini no puede generar escenarios narrativos para A0. La solución más limpia sin schema change:

Actualizar `expected_production` A0 para agregar:
```
PROHIBIDO: mencionar fotos, imágenes, videos, personajes fuera de la conversación, 
lugares físicos o cualquier elemento que no sea voz. La app es SOLO VOZ.
```

Y separar el session_focus por nivel dentro del texto del mismo campo, usando una condición que Gemini pueda leer:
```
Para A0: presentá el tema como exploración verbal — nombrá las cosas, no las mostrés.
Para A1+: HABI y el chico exploran juntos un escenario narrativo del tópico.
```
