"""CALIBRACIÓN DEL JUEZ — ¿el juez SLA puede dar 8-9, o tiene un techo artificial?
Le paso clases 'gold' (que un juez previo calificó 8-9, del handoff) con la MISMA rúbrica del
circuito. Si mi juez las baja a ~7, el techo de ~7 es del JUEZ/formato-texto, no de la orquestación
-> dejar de tunear a ciegas y validar con micrófono. Si las pone 8-9, hay techo real que perseguir.

Uso: python scripts/calibrar_juez.py
"""
from __future__ import annotations
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from scripts.validar_cambio import _judge  # misma vara que el circuito  # noqa: E402

# Clases 'gold' del handoff (docs/multi-llm-v3) con su score externo previo.
GOLD = [
    ("early_child A1", "Mi familia", 9, [  # _SPOTCHECK_kids.md (coach flash-lite, dado 9)
        ("Profe", "¡Hola, amiguito! Soy Sparky, tu amigo dragón. Hoy vamos a conocer a mi familia espacial. Yo tengo una mamá dragona, ¡look, this is my mom!"),
        ("Alumno", "¡Hola Sparky! Yo tengo papá, mamá y un hermanito. My familia es happy y grande."),
        ("Profe", "¡Wow, qué familia tan divertida tenés! Me encanta que seas tan feliz. ¿Me contás más? Podés decir, this is my dad, or tell me about your brother."),
        ("Alumno", "Mi papá es tall y strong. Mi hermanito tiene tres años y le gusta play con los toys."),
        ("Profe", "¡Tu papá suena genial! I love your brother, he sounds like so much fun! Can you say, my brother is small?"),
        ("Alumno", "Mi hermanito is small y cute. Él tiene tres años y le gusta play con bloques."),
        ("Profe", "¡Qué tierno! He is so cute. I have a small brother too. Tell me, do you have a big toy box for his blocks?"),
    ]),
    ("early_child A1", "Mi familia", 9, [  # _ISOLACION_gemini-3.1-pro-preview.md NUEVO (dado 9)
        ("Profe", "¡Hola! Soy Sparky, tu amigo el dragón espacial. Hoy vine a conocer a nuestras familias. Mirá, traje una foto de mi mamá. This is my mom. ¿Te animás a decir This is my mom, o contarme cómo se llama la tuya?"),
        ("Alumno", "Esta es mi mamá. This is my mom, ella se llama Ana."),
        ("Profe", "¡Me encanta! She is Ana. Lo dijiste súper bien y te ganaste tu primera estrellita espacial. Ahora, mirá, yo te muestro a mi papá. This is my dad. ¿Te animás a decir This is my dad, o contarme de alguien más?"),
        ("Alumno", "Este es mi papá. This is my dad, su nombre es Carlos."),
        ("Profe", "¡Qué lindo conocer a Carlos! He is Carlos. ¡Ese esfuerzo merece otra estrella gigante! Yo en mi familia tengo un hermanito. I have a brother. ¿Vos tenés hermanos? ¿Te animás a decir I have a brother, o I have a sister?"),
        ("Alumno", "Yo tengo una hermana. I have a sister, ella se llama Sofía."),
        ("Profe", "¡Qué lindo nombre es Sofía! She is Sofía. ¡Me encantó cómo lo dijiste, atrapá esta súper estrella! ¿Y en tu familia hay mascotas? Yo tengo un perrito. I have a dog. ¿Te animás a decir I have a dog o I have a cat?"),
    ]),
    ("child A2", "Mi casa y mis habitaciones", 8, [  # _SPOTCHECK_kids.md (dado 8)
        ("Profe", "Hi! I'm Nova, your adventure partner. ¡Hola! Today we are exploring our houses and our favorite rooms. Where do you spend your time? Tell me, what is your favorite room in your house?"),
        ("Alumno", "My favorite room is the kitchen. Me gusta cooking y jugar."),
        ("Profe", "Oh, the kitchen is the best! You're cooking and playing there? That sounds like so much fun! What do you like to cook the most?"),
        ("Alumno", "I likes to make pizza y galletas in the kitchen."),
        ("Profe", "Yum, homemade pizza and cookies! You like to make those in the kitchen. Are you making pizza right now, or do you usually make it on weekends?"),
        ("Alumno", "I usually make pizza on the weekend, not now. I help my mamá y we cooking together."),
        ("Profe", "That is wonderful! You and your mom cook together. So, you usually make pizza on the weekend, and today you are helping her. You are such a great chef!"),
    ]),
]


async def main():
    print("Calibrando el juez con clases 'gold' (score externo previo):\n")
    for label, title, expected, conv in GOLD:
        c = [{"who": w, "text": t} for w, t in conv]
        ev = await _judge(label.split()[1], title, c)
        s = ev.get("score")
        diff = (s - expected) if isinstance(s, (int, float)) else None
        flag = ""
        if isinstance(diff, (int, float)):
            flag = "  <-- mi juez NO alcanza el gold" if diff <= -1.5 else ("  OK" if abs(diff) < 1.5 else "")
        print(f"  {label:<16} gold={expected}  mi_juez={s}  (nat {ev.get('naturalidad')} afe {ev.get('afecto')} "
              f"i+1 {ev.get('i1')} rec {ev.get('reciclado')} recast {ev.get('recast')}){flag}")
        if ev.get("verdict"):
            print(f"      veredicto: {ev['verdict']}")
    print("\nSi mi juez baja sistemáticamente las gold a ~7 => techo del JUEZ (no de la orquestación).")


if __name__ == "__main__":
    asyncio.run(main())
