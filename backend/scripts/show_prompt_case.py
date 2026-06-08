"""Reconstruye y MUESTRA el prompt final de un caso, para ver la cadena entera.

Caso del bug: nene 5 (A0) + tópico "Comidas ricas" + riel Explorador A0 +
etapa "Saludos" (fallback) + junction INEXISTENTE. Imprime el prompt final
EXACTO que recibió el coach, para ver de dónde salió "la pizza tiene un name".

Local: python scripts/show_prompt_case.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "mysql+aiomysql://x:x@localhost/x")
os.environ.setdefault("JWT_SECRET", "x")
os.environ["COMPOSER_MODES"] = "staged_vocab"

from types import SimpleNamespace
from services.super_prompt import build_super_prompt

user = SimpleNamespace(
    nombre="Timi", cefr_level="A0", target_language="en", base_language="es",
    age_group="mini", parent_user_id=10, user_preferences=None,
    kid_methodology_order=1, curriculum_position=1,
)
topic = SimpleNamespace(
    title="Comidas ricas", slug="kids-comidas-ricas", keywords=[],
    pinned_vocabulary=None, seed_prompts={}, category="kids",
    kid_age_group="mini", is_active=True, levels=["A0"], id=42,
    audience="kid", is_curriculum=False,
)
# El riel que el usuario pegó (Explorador A0).
methodology_module = {
    "focus_name": "Explorador A0 (conversa y enseña con juego)",
    "ai_restraints": (
        "Sos HABI, profe amiga, cálida y paciente, con un nene de 3-7 que arranca de cero. "
        "REGLA #0 (NUNCA MIENTAS): si NO dijo la palabra, no digas '¡muy bien!'; modelá de nuevo despacio "
        "y festejá SOLO cuando la diga parecido. CONVERSÁS, no drilleás: metés el inglés EN CONTEXTO dentro "
        "del tema del chico. CONTEXTO antes que la palabra. Hablás DESPACIO, una idea por turno, y esperás "
        "la respuesta. CADA turno mezcla español + la palabra/frase en inglés; nunca un turno entero en inglés. "
        "PROHIBIDO el circo: nada de onomatopeyas de relleno. La clase DURA varios minutos y la cierra el adulto: "
        "vos NUNCA te despedís. Trabajá cada palabra en profundidad; jugá con ella."
    ),
    "target_grammar": "Vocabulario visual del tópico + primera frasita de 2-3 palabras de la etapa.",
    "evaluation_criteria": "Dice las palabras de la etapa en contexto.",
}
# La etapa "Saludos" (lo que el fallback inyecta porque NO hay junction).
methodology_stage = {
    "title": "Saludos",
    "vocabulary": [{"en": "hello", "es": "hola"}, {"en": "bye", "es": "chau"}, {"en": "name", "es": "nombre"}],
    "target_structure": "My name is ___",
}

prompt = build_super_prompt(
    user=user, template=None, topic=topic,
    methodology_stage=methodology_stage,
    methodology_module=methodology_module,
    topic_content=None,  # <-- el junction (Comidas ricas x A0) NO existe
)

print("=" * 78)
print("PROMPT FINAL QUE RECIBIÓ EL COACH (caso: nene 5 + Comidas ricas + A0)")
print("=" * 78)
print(prompt)
print("=" * 78)
print(f"len={len(prompt)} chars")
