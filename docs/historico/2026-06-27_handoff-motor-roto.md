# HANDOFF — Hablah (2026-06-27)

> **LEER PRIMERO**: El motor Mini tiene incoherencias activas. Ver sección "Motor roto" antes de tocar cualquier cosa.

---

## Motor roto — incoherencias activas en Mini A0

### Síntomas observados hoy con micrófono real

1. **Coach pide cosas que la app no puede hacer**
   ```
   "¿Querés ver una foto?"
   ```
   La app es 100% voz. No hay fotos ni imágenes. El coach las inventa porque `session_focus` dice "HABI y el chico exploran juntos un escenario del tópico" y Gemini completa el escenario con recursos visuales que no existen.

2. **Coach pide respuesta de monosílabo**
   ```
   "¿Querés ver una foto?" → espera "sí" o "no"
   ```
   Para A0 el alumno debe producir SIEMPRE la frase-puente completa ("X se dice Y"). Una respuesta "sí" dura < 1 segundo y el VAD de Gemini Live no la capta — la clase queda muda.

3. **Coach abre con frase en inglés completa**
   ```
   "This is my mom, esta es mi mamá."
   ```
   `language_rule` A0 dice "100% ESPAÑOL, lo ÚNICO en inglés es la palabra objetivo". El coach debería decir "Esta es mi mamá, en inglés: mom" — no liderar con oración en inglés.

4. **Preguntas abiertas de conversación**
   ```
   "¿Tenés alguno que te guste mucho mucho?"
   "¿Te gusta mucho?"
   ```
   Prohibidas en A0. El alumno de 4-5 años necesita estructura cerrada: model → "ahora vos: X se dice Y" → PARÁ.

### Causa raíz

El `session_focus` (campo en `student_types` donde slug='mini') es GENÉRICO para A0+A1+A2. Dice "explorar un escenario con el chico". Eso es correcto para A1/A2 pero para A0 genera:
- Preguntas abiertas de conversación
- Referencias a fotos/imágenes que no existen
- Preguntas yes/no que el VAD no capta

`session_focus` actual (restaurado hoy desde seed):
```
"Aventura en el mundo del tópico: HABI y el chico exploran juntos un escenario del tópico 
(ej: 'The Hungry Dino Planet'). Las palabras en inglés aparecen en el contexto de la historia, 
nunca como lista. El chico es protagonista: HABI le pide ayuda con algo concreto."
```

### Qué se cambió hoy (y por qué no alcanzó)

| Campo | Estado |
|-------|--------|
| `student_types.mini.tutor_tonal_rules` | Restaurado (estaba corrupto: "exclamativ67vuelta") |
| `student_types.mini.session_focus` | Restaurado (estaba corrupto: "Aventur667") — pero el valor original también genera el problema |
| `student_types.mini.form_rules` | Restaurado (estaba corrupto: "Hablá DESPA") |
| `student_types.mini.opening_seed` | Actualizado — delega a Expected_Production |
| `student_types.mini.continuation_seed` | Actualizado — prohíbe preguntas abiertas |
| `levels.expected_production` (A0) | Actualizado — estructura fija 3 pasos + PROHIBIDO preguntas |
| `behavioral_guard`, `trigger_template` | Modificados pero NO AFECTAN producción (motor v3 desactivado) |

### Lo que falta resolver

**Problema central**: `session_focus` no puede ser genérico para A0. Para A0 el protocolo es drill estructurado (model → repeat), NO "exploración de escenario narrativo".

**Fix recomendado** (sin schema change):
Actualizar `session_focus` de mini para separar explícitamente A0 del resto:
```
Para A0: presentá la palabra objetivo en contexto verbal directo. 
PROHIBIDO: referencias a fotos, imágenes, escenarios visuales, o cualquier elemento que no sea voz.
Para A1+: HABI y el chico exploran juntos un escenario narrativo del tópico.
```

O más limpio: agregar un campo `session_focus_a0` a student_types.

**También falta**: agregar a `expected_production` A0 la prohibición explícita de referencias visuales.

---

## Path del motor de producción (CRÍTICO)

El motor real es **compose_proto** (`services/composer_proto.py`).
- Motor v3 está **desactivado** (`MOTOR_V3_KIDS=0`).
- `behavioral_guard`, `trigger_template`, `level_policy` → NO afectan producción hasta activar el flag.

Tablas que SÍ importan:
- `student_types` (slug='mini') — tutor, pedagogy, seeds, session_focus, form_rules
- `levels` (code='A0') — language_rule, expected_production, curriculum_grammar
- `topics` (165 registros) — tópicos reales de Mini

### Verificación rápida antes de tocar cualquier cosa

```python
cd backend && python -c "
import sys, pymysql
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from services import motor_engine
db = motor_engine._connect()
with db.conn.cursor(pymysql.cursors.DictCursor) as cur:
    cur.execute('SELECT tutor_tonal_rules, session_focus, form_rules, opening_seed, continuation_seed FROM student_types WHERE slug=%s', ('mini',))
    r = cur.fetchone()
    for k, v in r.items(): print(k, ':', repr(v)[:100])
    cur.execute('SELECT language_rule, expected_production FROM levels WHERE code=%s', ('A0',))
    lv = cur.fetchone()
    for k, v in lv.items(): print(k, ':', repr(v)[:100])
"
```
Si algún campo termina a mitad de frase o tiene números random → está corrupto. Restaurar desde `backend/scripts/seed_tutor_personas.py` y `backend/scripts/seed_v25_dos_ejes.py`.

---

## Estado del deploy

- Frontend: `https://hablah.com.ar` (Netlify, auto-deploy en push a main)
- Backend: `https://hablah-api-abcaf6c43a5d.herokuapp.com` (Heroku, auto-deploy en push a heroku)
- `/mini-test` está live y accesible

## KSP (Knowledge Share Protocol) — OK

- Endpoint: `GET /api/knowledge-base` + `/health`
- Versión: v1.2
- En producción: health OK, 401 sin key, 200 con key
- Secrets Heroku: `KB_CLAVE_SALESBOT` y `KB_CLAVE_MEDIASTUDIO`

## Archivos clave

| Archivo | Qué hace |
|---|---|
| `backend/api/knowledge_base.py` | Endpoint KSP v1.2 |
| `backend/services/composer_proto.py` | Motor de producción — arma el prompt de 12 bloques |
| `backend/services/gemini_live.py` | WS de voz — llama a compose_proto |
| `frontend/src/pages/MiniTestPanel.tsx` | Pantalla de prueba Mini con micrófono |
| `backend/scripts/seed_tutor_personas.py` | Valores originales de student_types |
| `backend/scripts/seed_v25_dos_ejes.py` | Valores originales de form_rules/pedagogy |

## Datos de infra

| Recurso | Valor |
|---|---|
| Backend (Heroku) | `https://hablah-api-abcaf6c43a5d.herokuapp.com` |
| Frontend (Netlify) | `https://hablah.com.ar` |
| Netlify site ID | `f7daf480-dced-4ad5-89ab-bbb00024fd59` |
| Repo GitHub | `arenazl/hablah` |
