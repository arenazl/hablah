"""Catalogo de objetivos pedagogicos por nivel CEFR.

Cada sesion tiene UN objetivo: una estructura gramatical o set de phrasal
verbs / vocab que el coach trabaja con el alumno durante la charla.

El objetivo es INVISIBLE al alumno (no se anuncia). El coach lo entreteje
en la conversacion del topic: crea contextos donde el alumno tiene que
usar la estructura, modela frases con ella, corrige sutilmente cuando
el alumno la usa mal.

Seleccion: backend elige UN objetivo del nivel del alumno, EXCLUYENDO
los trabajados en las ultimas 5 sesiones (rotacion automatica).
"""
from __future__ import annotations

import random
from typing import Optional

# Catalogo: cada objetivo tiene code, label (es), focus, modeling_examples,
# correction_hint.
#
# - code: id unico (snake_case)
# - label_es: nombre humano (para logs)
# - focus: que tiene que practicar el alumno
# - modeling: 2-3 ejemplos que el coach puede tirar para guiar al alumno a usarlo
# - correction_hint: como corregir cuando el alumno la usa mal (sin entrar en
#   teoria gramatical - solo modelar la version correcta)

A1_OBJECTIVES = [
    {
        "code": "present_simple_be",
        "label_es": "Verbo to be en presente",
        "focus": "Use of 'I am / you are / he is / she is / we are / they are' in present.",
        "modeling": [
            "I am a teacher.",
            "She is from Argentina.",
            "We are happy today.",
        ],
        "correction_hint": "If they say 'I is' or 'he are', repeat the correct form casually: 'Oh, he IS!' or 'Yeah, I AM'.",
    },
    {
        "code": "present_simple_have",
        "label_es": "Verbo to have en presente",
        "focus": "Use of 'I have / he has / she has / we have / they have'.",
        "modeling": [
            "I have a dog at home.",
            "She has two brothers.",
            "We have a long weekend.",
        ],
        "correction_hint": "If they say 'he have' or 'I has', model the correct form: 'Oh, he HAS!' without explaining.",
    },
    {
        "code": "basic_questions_do_does",
        "label_es": "Preguntas con do/does",
        "focus": "Use of 'Do you...?' and 'Does he/she...?' to ask questions.",
        "modeling": [
            "Do you like coffee?",
            "Does she work here?",
        ],
        "correction_hint": "If they ask without do/does, repeat their question with it: 'Like coffee? Yeah, DO YOU like coffee?'",
    },
    {
        "code": "colors_numbers_family",
        "label_es": "Vocab basico: colores, numeros, familia",
        "focus": "Use of common vocab: colors, numbers 1-100, family members.",
        "modeling": [
            "My brother is twenty-five.",
            "I have a red car.",
            "There are three apples on the table.",
        ],
        "correction_hint": "If they don't know a word, say it slowly and ask them to repeat: 'Brother — repeat: brother.'",
    },
]

A2_OBJECTIVES = [
    {
        "code": "past_simple_regular",
        "label_es": "Pasado simple con verbos regulares",
        "focus": "Use of regular verbs in past simple: walked, played, worked, watched.",
        "modeling": [
            "I watched a movie last night.",
            "She worked at a bank for two years.",
            "We walked home together.",
        ],
        "correction_hint": "If they say 'I watch yesterday' (no -ed), model it: 'Oh nice, you WATCHED a movie! What did you watch?'",
    },
    {
        "code": "past_simple_irregular",
        "label_es": "Pasado simple con verbos irregulares",
        "focus": "Use of common irregular verbs in past: went, ate, saw, said, took, made, got.",
        "modeling": [
            "I went to Buenos Aires last summer.",
            "She ate the whole pizza.",
            "We saw a great movie yesterday.",
        ],
        "correction_hint": "If they say 'I goed' or 'I eated', drop the correct form naturally: 'Oh you WENT! Where exactly?'",
    },
    {
        "code": "present_continuous",
        "label_es": "Present continuous",
        "focus": "Use of 'am/is/are + verb-ing' to talk about right now or temporary actions.",
        "modeling": [
            "I'm learning English with you right now.",
            "She's working on a new project this month.",
            "We're talking about videogames.",
        ],
        "correction_hint": "If they say 'I learn now', model it: 'Yeah, you're LEARNING. What are you learning these days?'",
    },
    {
        "code": "future_will",
        "label_es": "Futuro con will",
        "focus": "Use of 'will + verb' for predictions and spontaneous decisions.",
        "modeling": [
            "I think it will rain tomorrow.",
            "I'll call you later.",
            "She'll love that movie.",
        ],
        "correction_hint": "If they use present for future, model with will: 'Yeah, you WILL like it!'",
    },
    {
        "code": "basic_phrasal_verbs_daily",
        "label_es": "Phrasal verbs basicos (rutina)",
        "focus": "Use of: get up, wake up, look for, turn on/off, pick up, sit down.",
        "modeling": [
            "I get up at seven every day.",
            "I'm looking for a new job.",
            "Can you turn off the light?",
        ],
        "correction_hint": "If they say 'I rise at 7' or 'I search for', model phrasal: 'Oh, you GET UP at 7!' or 'You're LOOKING FOR a job, cool.'",
    },
    {
        "code": "comparatives",
        "label_es": "Comparativos (-er / more)",
        "focus": "Use of 'bigger / smaller / better / more interesting / more expensive'.",
        "modeling": [
            "This movie is better than the first one.",
            "Buenos Aires is bigger than Rosario.",
            "Italian food is more interesting than I thought.",
        ],
        "correction_hint": "If they say 'more big' or 'gooder', model: 'Yeah it's BIGGER!' or 'It's BETTER, totally.'",
    },
]

B1_OBJECTIVES = [
    {
        "code": "present_perfect_experience",
        "label_es": "Present perfect (experiencia)",
        "focus": "Use of 'have/has + past participle' for life experience: 'Have you ever...?'.",
        "modeling": [
            "Have you ever been to Brazil?",
            "I've never tried sushi.",
            "She's seen that movie three times.",
        ],
        "correction_hint": "If they use past simple for experience without time, model: 'Have you EVER tried it?' to show the structure.",
    },
    {
        "code": "conditional_type_1",
        "label_es": "Condicional tipo 1 (if + present, will)",
        "focus": "Use of 'If + present simple, will + verb' for real future possibilities.",
        "modeling": [
            "If it rains tomorrow, I'll stay home.",
            "If you study, you'll pass the exam.",
        ],
        "correction_hint": "If they say 'If it will rain', model: 'Yeah, if it RAINS, I'll stay home too.'",
    },
    {
        "code": "modals_should_might",
        "label_es": "Modales: should, might, must",
        "focus": "Use of 'should' (advice), 'might' (possibility), 'must' (obligation).",
        "modeling": [
            "You should try that game.",
            "It might be a good idea.",
            "I must finish this today.",
        ],
        "correction_hint": "If they say 'you have to' for advice, model: 'Yeah, you SHOULD try it!'",
    },
    {
        "code": "phrasal_verbs_relationships",
        "label_es": "Phrasal verbs (relaciones/social)",
        "focus": "Use of: get along, break up, make up, fall out, look up to, get on with.",
        "modeling": [
            "I get along with my brother really well.",
            "They broke up last month.",
            "I look up to my dad — he's my role model.",
        ],
        "correction_hint": "Model phrasal naturally if the student uses non-phrasal: 'You GET ALONG with him? Cool.'",
    },
]

B2_C1_OBJECTIVES = [
    {
        "code": "past_perfect",
        "label_es": "Past perfect (had + past participle)",
        "focus": "Use of past perfect for actions before another past action.",
        "modeling": [
            "By the time I arrived, they had already left.",
            "She had never tried sushi before that night.",
        ],
        "correction_hint": "If they use simple past for both actions, model the sequence: 'So by then, you HAD already finished?'",
    },
    {
        "code": "conditional_type_2_3",
        "label_es": "Condicionales tipo 2 y 3",
        "focus": "Type 2: 'If I were rich...' Type 3: 'If I had known...'.",
        "modeling": [
            "If I were you, I'd take the offer.",
            "If I had known, I would have gone.",
        ],
        "correction_hint": "Model the structure casually if they use type 1 instead: 'If you HAD KNOWN, you would have done it.'",
    },
    {
        "code": "phrasal_verbs_business",
        "label_es": "Phrasal verbs (negocios/trabajo)",
        "focus": "Use of: take over, lay off, carry out, follow up, set up, work out.",
        "modeling": [
            "The new CEO took over last month.",
            "We need to follow up on that email.",
            "Let's set up a meeting for Friday.",
        ],
        "correction_hint": "Casually use these in your turn so the student picks them up.",
    },
    {
        "code": "passive_voice",
        "label_es": "Voz pasiva",
        "focus": "Use of passive: 'The match was played in Buenos Aires.'",
        "modeling": [
            "The album was released in 2019.",
            "That movie is loved by everyone.",
        ],
        "correction_hint": "If active is awkward, use passive in your turn so they hear the pattern.",
    },
]


CATALOG_BY_CEFR = {
    "A0": A1_OBJECTIVES,  # A0 cae al modo override propio, igual le pasamos algo
    "A1": A1_OBJECTIVES,
    "A2": A2_OBJECTIVES,
    "B1": B1_OBJECTIVES,
    "B2": B2_C1_OBJECTIVES,
    "C1": B2_C1_OBJECTIVES,
    "C2": B2_C1_OBJECTIVES,
}


def pick_objective(
    cefr: str,
    recently_used_codes: Optional[set] = None,
) -> Optional[dict]:
    """Elige UN objetivo del catalogo del nivel CEFR del alumno.

    Excluye los codes que ya se trabajaron en las ultimas N sesiones.
    Si todos fueron usados, reset y vuelve a tirar random del pool completo.
    """
    pool = CATALOG_BY_CEFR.get((cefr or "B1").upper(), B1_OBJECTIVES)
    if not pool:
        return None
    used = recently_used_codes or set()
    fresh = [o for o in pool if o["code"] not in used]
    if not fresh:
        fresh = pool
    return random.choice(fresh)


def format_objective_for_prompt(obj: dict, target_lang_name: str = "English") -> str:
    """Convierte el objetivo elegido en un bloque para inyectar al system prompt."""
    examples = "\n".join(f'    · "{ex}"' for ex in obj.get("modeling", []))
    correction = obj.get("correction_hint", "")
    return (
        f"OBJETIVO PEDAGÓGICO DE ESTA SESIÓN (INVISIBLE AL ALUMNO — NO LO ANUNCIES)\n"
        f"- Foco: {obj.get('focus', '')}\n"
        f"- Tu trabajo: entretejé este foco en la conversación del topic.\n"
        f"  Creá contextos donde el alumno NATURALMENTE tenga que usar esta estructura.\n"
        f"  Cuando la use bien, NO la celebres explícitamente — solo seguí la charla.\n"
        f"  Cuando la use mal, modelá la versión correcta en tu próxima frase, SIN\n"
        f"  explicar gramática.\n"
        f"- FRASES MODELO que vos podés tirar para que el alumno las absorba\n"
        f"  (no las leas literal, integralas naturalmente al flujo de la charla):\n"
        f"{examples}\n"
        f"- CÓMO CORREGIR sin que parezca corrección:\n"
        f"  {correction}\n"
        f"- IMPORTANTE: el alumno NO debe sentir que esto es una clase de gramática.\n"
        f"  Es una charla sobre el tópico, donde 'casualmente' aparece esta estructura.\n"
    )
