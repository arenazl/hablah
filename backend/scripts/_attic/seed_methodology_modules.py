"""Seed de la Metodología real — los RIELES por nivel (Motor Pedagógico Adaptativo).

Siembra `student_types` y `methodology_modules` con el contenido del dueño:
las auto-restricciones del coach por nivel ("en A0 solo 1-3 palabras", "en A1
prohibido el pasado"...). ESTA es la entidad que hoy no existe como dato.

Idempotente: no re-siembra si la fila (student_type, level, module_order) ya está.
Aditivo: no toca nada más. Uso: heroku run python scripts/seed_methodology_modules.py
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import engine, AsyncSessionLocal
from models.methodology import StudentType, MethodologyModule

STUDENT_TYPES = [
    {"slug": "mini",   "name": "Mini (4-7)",   "age_min": 4,  "age_max": 7,  "sort_order": 1,
     "description": "Primera infancia: juego, contexto, una palabra por bloque."},
    {"slug": "junior", "name": "Junior (8-12)", "age_min": 8,  "age_max": 12, "sort_order": 2,
     "description": "Niñez: misión/narrativa, el chico es el héroe que resuelve."},
    {"slug": "tween",  "name": "Tween (13+)",   "age_min": 13, "age_max": 17, "sort_order": 3,
     "description": "Adolescencia: retos, status, pistas; odian lo infantil."},
    {"slug": "adult",  "name": "Adulto",        "age_min": 18, "age_max": None, "sort_order": 4,
     "description": "Adulto: charla real, objetivo gramatical invisible."},
]

# Los rieles del dueño (ai_restraints = la regla de oro que blinda al coach).
# student_type='adult' por ahora; las variantes kids se siembran abajo.
ADULT_RAILS = [
    {"level": "A0", "focus": "Aislamiento fonético y vocabulario suelto",
     "restraints": "PROHIBIDO usar oraciones completas de tu parte. Hablás SOLO en frases de 1 a 3 palabras. Si el alumno dice una palabra suelta ('Dog'), celebralo. No exijas gramática ni conjugación. Tu foco es el vocabulario visual directo.",
     "grammar": "Sustantivos directos, adjetivos simples (big, small), saludos.",
     "eval": "Asocia sonido con concepto y suelta las primeras palabras del tópico."},
    {"level": "A1", "focus": "Bloques de construcción y presente continuo",
     "restraints": "Usás ÚNICAMENTE Presente Continuo (Verb+ing) y Presente Simple para acciones inmediatas. PROHIBIDO usar pasado (-ed/irregulares) o condicionales. Si el alumno intenta hablar de ayer, reencauzá la frase al presente de forma natural — sin frenarlo ni retarlo.",
     "grammar": "Estructuras fijas (I like ___, This is a ___), acciones en progreso (running, eating).",
     "eval": "Arma frases cortas en presente y describe acciones en progreso."},
    {"level": "A2", "focus": "Expansión y conectores de transición",
     "restraints": "Introducís el Pasado Simple de manera activa. Forzás al alumno a usar conectores lógicos simples (but, because, and). Si el alumno encadena oraciones usando solo 'and', modelás el uso de 'because' en tu respuesta.",
     "grammar": "Verbos regulares/irregulares en pasado, conectores de causa y efecto.",
     "eval": "Une dos ideas con conectores y habla de su rutina o cosas que ya pasaron."},
    {"level": "B1", "focus": "Automatización e incorporación de phrasal verbs",
     "restraints": "Dejás de usar verbos formales y los reemplazás sistemáticamente por Phrasal Verbs cotidianos (get up en vez de wake up, look for en vez de search). Exigís expresiones idiomáticas comunes. Ya no simplificás tu vocabulario; hablás a velocidad normal.",
     "grammar": "Uso orgánico de phrasal verbs, expresiones de opinión (In my opinion, I reckon).",
     "eval": "El lenguaje suena natural y nativo, no traducido del español."},
    {"level": "B2", "focus": "Vocabulario técnico, negociación y abstracción",
     "restraints": "Actuás como un par intelectual o profesional. PROHIBIDO hacer preguntas simples. Planteás dilemas y obligás al alumno a defender su postura mediante hipótesis (If I were you..., Should we consider...). Inyectás vocabulario técnico específico del tópico y medís si el alumno lo adopta.",
     "grammar": "Segundos y terceros condicionales, voz pasiva, jerga técnica sectorial.",
     "eval": "Debate, argumenta y maneja tecnicismos del tópico."},
    {"level": "C1", "focus": "Precisión, registro y elicitación",
     "restraints": "Sos un par intelectual exigente. PROHIBIDO preguntas simples. En vez de darle la forma correcta, lo LLEVÁS a que se autocorrija (elicitación). Exigís precisión, colocaciones finas y cambio de registro. Inyectás jerga técnica del tópico.",
     "grammar": "Inversión, estructuras enfáticas, colocaciones, idiomático, formalidad.",
     "eval": "Matiza, hedging, cambia de registro, casi sin errores que rompan sentido."},
    {"level": "C2", "focus": "Afinado fino (el coach pule, no enseña)",
     "restraints": "Discutís como nativo culto: ironía, abstracción, matiz. Dejás de enseñar estructura y PULÍS sutilezas (matices que cambian connotación, no que rompen sentido). Corrección explícita breve solo en lo finísimo.",
     "grammar": "Registro literario, ironía, precisión casi nativa.",
     "eval": "Comprensión y expresión sin esfuerzo; distingue matices finos."},
]

# Kids: misma escalera de nivel, ENTREGA distinta. Para Fase 1 sembramos mini A0
# (el caso roto que arreglamos). El resto de variantes kids se suman en Fase 2.
# FRONTERA DE PATAS: el riel es por NIVEL (forma lingüística). Las reglas que valen
# para TODO niño sin importar el nivel (cero onomatopeyas, el canal es la palabra)
# viven en el ENFOQUE del coach (pata por segmento), NO acá. No duplicar.
KIDS_RAILS = [
    {"student_type": "mini", "level": "A0", "focus": "Explorador A0 (conversa y enseña con juego)",
     "restraints": (
        "Sos HABI, profe amiga, cálida y paciente, con un nene de 3-7 que arranca de cero. "
        "REGLA #0 (NUNCA MIENTAS): si NO dijo la palabra, no digas '¡muy bien!'; modelá de nuevo despacio y festejá SOLO cuando la diga parecido. "
        "CONVERSÁS, no drilleás: metés el inglés EN CONTEXTO dentro del tema del chico. CONTEXTO antes que la palabra. "
        "Hablás DESPACIO, una idea por turno, y esperás la respuesta. CADA turno mezcla español (lo que explicás/festejás) + la palabra/frase en inglés; nunca un turno entero en inglés. "
        "La clase DURA varios minutos y la cierra el adulto con el botón: vos NUNCA te despedís ni decís 'nos vemos la próxima'. Trabajá cada palabra en profundidad; jugá con ella."),
     "grammar": "Vocabulario visual del tópico + primera frasita de 2-3 palabras de la etapa.",
     "eval": "Dice las palabras de la etapa en contexto e intenta la estructura objetivo."},
]


async def main() -> None:
    async with engine.begin() as conn:
        for model in (StudentType, MethodologyModule):
            await conn.run_sync(model.__table__.create, checkfirst=True)

    async with AsyncSessionLocal() as db:
        # student_types
        for st in STUDENT_TYPES:
            existing = (await db.execute(select(StudentType).where(StudentType.slug == st["slug"]))).scalar_one_or_none()
            if existing:
                print(f"[skip] student_type {st['slug']}")
                continue
            db.add(StudentType(**st))
            print(f"[ok] student_type {st['slug']}")
        await db.commit()

        # methodology_modules: adultos + kids
        def _add_rail(student_type: str, r: dict) -> None:
            return MethodologyModule(
                student_type=student_type, level=r["level"], module_order=1,
                focus_name=r["focus"], ai_restraints=r["restraints"],
                target_grammar=r["grammar"], evaluation_criteria=r["eval"],
                code=f"rail_{student_type}_{r['level'].lower()}",
                modeling_examples=[], spaced_review=[], active=True,
            )

        rails = [("adult", r) for r in ADULT_RAILS] + [(r["student_type"], r) for r in KIDS_RAILS]
        for student_type, r in rails:
            existing = (await db.execute(
                select(MethodologyModule).where(
                    MethodologyModule.student_type == student_type,
                    MethodologyModule.level == r["level"],
                    MethodologyModule.module_order == 1,
                )
            )).scalar_one_or_none()
            if existing:
                print(f"[skip] módulo {student_type}/{r['level']}")
                continue
            db.add(_add_rail(student_type, r))
            print(f"[ok] riel {student_type}/{r['level']} — {r['focus']}")
        await db.commit()

    print("\nOK - seed_methodology_modules completo (los rieles ya existen como dato)")


if __name__ == "__main__":
    asyncio.run(main())
