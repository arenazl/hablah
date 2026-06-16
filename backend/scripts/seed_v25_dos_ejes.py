"""Seed v25 — los 2 ejes del motor, como dato editable.

  EJE NIVEL  (levels)        → el QUÉ se aprende, universal (B2 = voz pasiva tengas
                               8 o 90). Portado de ADULT_RAILS.grammar/eval + el
                               idioma ES/EN por nivel. + duración base.
  EJE EDAD   (student_types) → el CÓMO se enseña (pedagogía + forma), agnóstico del
                               tópico y del nivel. Portado de los presets por banda
                               (doc 03/10) + KIDS_RAILS + el composer actual.

Se APILAN, nunca se cruzan. Valores TENTATIVOS — editables desde el orquestador.
Idempotente: upsert. Uso: python scripts/seed_v25_dos_ejes.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import Level, StudentType

# ─────────────────────────────────────────────────────────────────────────────
# EJE NIVEL — currículum universal por nivel (qué se aprende). Portado de ADULT_RAILS.
# (code: curriculum_grammar, expected_production, language_rule, duration_base_minutes)
# ─────────────────────────────────────────────────────────────────────────────
LEVELS = {
    "A0": dict(
        grammar="Sustantivos directos, adjetivos simples (big, small), saludos.",
        production=("El alumno produce SIEMPRE la frase-puente bilingüe COMPLETA "
                    "'<palabra-ES> se dice <word-EN>' (ej: 'perro se dice dog'), NUNCA la palabra "
                    "inglesa suelta. Motivo: una palabra suelta dura menos de 1 segundo y el motor "
                    "de voz no la capta (no dispara respuesta); la frase-puente dura más de 1 segundo, "
                    "se escucha entera y de paso ancla el concepto en español con la palabra nueva en "
                    "inglés. La unidad que aprende es la palabra nueva; la frase-puente es solo el "
                    "envoltorio para que la diga completa. Tu turno cierra con 'ahora vos: <palabra-ES> "
                    "se dice <word-EN>' y PARÁS hasta que responda."),
        lang=("Idioma de instrucción del coach: 100% ESPAÑOL. Lo ÚNICO en inglés es la palabra "
              "objetivo del día. NUNCA traduzcas tus consignas al inglés (decí \"ahora vos\", NUNCA \"now you\")."),
        dur=6),
    "A1": dict(
        grammar="Estructuras fijas (I like ___, This is a ___), presente continuo (running, eating).",
        production="Arma frases cortas en presente y describe acciones en progreso.",
        lang=("Instrucción mayormente en español. Introducí frases-meta cortas en inglés (2-3 palabras) "
              "que el alumno repite; tus consignas y explicaciones siguen en español."),
        dur=9),
    "A2": dict(
        grammar="Pasado simple (regular/irregular), conectores de causa y efecto (but, because, and).",
        production="Une dos ideas con conectores y habla de su rutina o de cosas que ya pasaron.",
        lang="Mitad español, mitad inglés. El alumno produce frases simples en inglés; rescatás en español sólo si se traba.",
        dur=11),
    "B1": dict(
        grammar="Phrasal verbs cotidianos (get up, look for), expresiones de opinión (In my opinion, I reckon).",
        production="El lenguaje suena natural y nativo, no traducido del español.",
        lang="Mayormente en inglés. Español SOLO como rescate puntual. Velocidad normal.",
        dur=14),
    "B2": dict(
        grammar="Segundos y terceros condicionales, voz pasiva, jerga técnica sectorial.",
        production="Debate, argumenta y maneja tecnicismos del tópico.",
        lang="100% inglés. Sin español. Recast natural de los errores, sin cortar la fluidez.",
        dur=17),
    "C1": dict(
        grammar="Inversión, estructuras enfáticas, colocaciones finas, idiomático, formalidad.",
        production="Matiza, hace hedging, cambia de registro; casi sin errores que rompan el sentido.",
        lang="100% inglés. Registro, matices, ironía. Par intelectual.",
        dur=19),
    "C2": dict(
        grammar="Registro literario, ironía, precisión casi nativa.",
        production="Comprensión y expresión sin esfuerzo; distingue matices finos.",
        lang="100% inglés nativo. Pulido fino de matices y registro.",
        dur=20),
}

# ─────────────────────────────────────────────────────────────────────────────
# EJE EDAD — cómo se enseña (pedagogía + forma), agnóstico del tópico y del nivel.
# (slug: pedagogy, form_rules, duration_adjust_minutes)
# ─────────────────────────────────────────────────────────────────────────────
SEGMENTS = {
    "mini": dict(
        pedagogy=("Gamificación inmersiva en contexto; 0% gramática explícita. El error NUNCA se corrige "
                  "punitivamente: celebrá el esfuerzo REAL (nunca mientas — si no la dijo, modelá de nuevo "
                  "y festejá sólo cuando la diga parecido), modelá la forma correcta y volvé a pedir."),
        form=("Hablá DESPACIO, una idea por turno, y esperá la respuesta. CADA turno mezcla español (lo que "
              "explicás/festejás) + la palabra/frase en inglés; nunca un turno entero en inglés. CONTEXTO antes "
              "que la palabra. Sin onomatopeyas-drill: el canal es la palabra en contexto. A0: el alumno repite "
              "la frase completa ('perro se dice Dog'), no la palabra suelta. La clase la cierra el adulto con el "
              "botón: NUNCA te despidas ni digas 'nos vemos la próxima'."),
        dur_adj=-2),
    "junior": dict(
        pedagogy=("Lúdico con misión/narrativa: el chico es el héroe que resuelve; mini-retos y recompensas; "
                  "gramática implícita, sin metalenguaje."),
        form=("Misiones con opciones A/B en inglés para avanzar la historia; festejá cada parte completada "
              "('Mission part 1 complete!'); reconocé el logro sin infantilizar de más."),
        dur_adj=0),
    "tween": dict(
        pedagogy=("Comunicativo basado en sus intereses; retos y status; dá pistas en vez de respuestas; "
                  "gramática contextual ligera."),
        form=("Challenges numerados en voz ('Challenge 1, ready?'); pistas, no la respuesta; score al final; "
              "tono de igual, nada infantil."),
        dur_adj=1),
    "adult": dict(
        pedagogy=("Fluency first; no interrumpir por errores menores; recast natural; anotar los vicios en "
                  "silencio para el feedback de cierre."),
        form=("Conversación real sobre el tópico; el objetivo gramatical va INVISIBLE, tejido en la charla; "
              "par conversacional, sin infantilizar; una sola pregunta o situación por turno."),
        dur_adj=3),
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        print("EJE NIVEL (levels) — currículum universal:")
        for code, d in LEVELS.items():
            row = (await db.execute(select(Level).where(Level.code == code))).scalar_one_or_none()
            if not row:
                print(f"  [miss] level {code} no existe (correr seed_levels primero)")
                continue
            row.curriculum_grammar = d["grammar"]
            row.expected_production = d["production"]
            row.language_rule = d["lang"]
            row.duration_base_minutes = d["dur"]
            print(f"  [upd] {code}")
        await db.commit()

        print("\nEJE EDAD (student_types) — pedagogía + forma:")
        for slug, d in SEGMENTS.items():
            row = (await db.execute(select(StudentType).where(StudentType.slug == slug))).scalar_one_or_none()
            if not row:
                print(f"  [miss] student_type {slug} no existe")
                continue
            row.pedagogy = d["pedagogy"]
            row.form_rules = d["form"]
            row.duration_adjust_minutes = d["dur_adj"]
            print(f"  [upd] {slug}")
        await db.commit()
    print("\nOK - seed_v25_dos_ejes completo (currículum por nivel + forma por edad)")


if __name__ == "__main__":
    asyncio.run(main())
