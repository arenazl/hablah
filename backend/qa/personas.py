"""Personas sinteticas de alumno para tests automatizados.

Cada persona tiene:
- name: id corto para CLI
- description: que tipo de alumno es
- cefr_level: nivel CEFR del alumno (afecta el super_prompt)
- target_language: idioma que esta aprendiendo
- base_language: idioma materno
- strategy: funcion que dado el contexto (transcript hasta ahora) devuelve
  la proxima respuesta del alumno como texto
- max_turns: cuantos turnos hace antes de "rendirse" (None = ilimitado)

La idea es que CADA persona tenga un comportamiento DISTINTO para stress-testear
el coach desde angulos diferentes.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Callable, Optional


@dataclass
class Persona:
    name: str
    description: str
    cefr_level: str
    target_language: str
    base_language: str
    strategy: Callable[[list[dict], int], str]
    max_turns: int = 8


# ─── Helpers para strategies ──────────────────────────────────────────────

def _coach_said(transcript: list[dict]) -> str:
    """Junta TODO lo que dijo el coach hasta ahora."""
    return " ".join(t["text"] for t in transcript if t.get("who") == "ai").strip()


def _coach_asked_question(transcript: list[dict]) -> bool:
    """Heuristica: el ultimo turno del coach tiene un signo de pregunta."""
    for t in reversed(transcript):
        if t.get("who") == "ai":
            return "?" in t["text"]
    return False


# ─── Strategies por persona ───────────────────────────────────────────────

def _beginner_a1_strategy(transcript: list[dict], turn_n: int) -> str:
    """A1 muy basico — respuestas cortas, errores gramaticales, simples."""
    coach = _coach_said(transcript).lower()
    if turn_n == 0:
        return "yes"
    if "name" in coach or "who" in coach:
        return "my name is Lucas, I am 30"
    if "from" in coach or "where" in coach:
        return "I from Argentina, Buenos Aires"
    if "like" in coach or "favorite" in coach:
        return random.choice(["yes I like it much", "I no like", "is good"])
    if "?" in coach:
        return random.choice([
            "yes, very good",
            "I dont know how say",
            "is easy for me",
            "I think yes",
        ])
    return "ok"


def _intermediate_b1_strategy(transcript: list[dict], turn_n: int) -> str:
    """B1 conversacional, comete errores pero se hace entender."""
    coach = _coach_said(transcript).lower()
    if turn_n == 0:
        return "hi, I'm ready to talk"
    if "name" in coach:
        return "my name is Lucas, nice to meet you too"
    if "favorite" in coach or "like" in coach:
        return "I really enjoy techno music, especially the underground scene in Berlin"
    if "tell me" in coach or "what about you" in coach:
        return "honestly I think it depends a lot on the context, but yes, in general I agree with that"
    if _coach_asked_question(transcript):
        return random.choice([
            "thats a good point, I never thought about it like that",
            "in my experience, it works the opposite way actually",
            "yeah, the same happens in my country too",
            "I would say its complicated, theres no single answer",
        ])
    return "yeah, makes sense"


def _advanced_c1_strategy(transcript: list[dict], turn_n: int) -> str:
    """C1 — debate, opinion, vocabulario amplio, contraargumenta DENTRO del topic."""
    if turn_n == 0:
        return "alright, lets dive in — what's your honest take on this scene?"
    coach = _coach_said(transcript).lower()
    if "?" in coach:
        return random.choice([
            "Honestly, I think most people overstate that — the actual crossover was more accidental than strategic.",
            "Sure, but isn't that reading a bit too much into the production side? Plenty of those tracks weren't engineered for crossover at all.",
            "That's fair, though I'd argue the cultural context mattered more than the technical innovation itself.",
            "Interesting, but my take is the scene peaked precisely because it stayed underground for so long. Going mainstream was the death blow.",
        ])
    return random.choice([
        "Right, and that's exactly why the scene matters historically.",
        "Worth digging into that more — the lineage is more tangled than it looks.",
        "Hmm, I'm not sure that holds up if you look at what came right after.",
    ])


def _distracted_kid_strategy(transcript: list[dict], turn_n: int) -> str:
    """Chico que se distrae, cambia de tema, dice cosas off-topic."""
    if turn_n == 0:
        return "hola! tengo perro"
    pool = [
        "my dog is brown",
        "I dont want talk about that, I want talk about pokemon",
        "what is your favorite color?",
        "i'm hungry, I want pizza",
        "do you like trains? I love trains",
        "I have a sister, her name is Sofia",
        "can we play a game?",
    ]
    return random.choice(pool)


def _silent_strategy(transcript: list[dict], turn_n: int) -> str:
    """Alumno muy monosilabico, casi no aporta. Test de como el coach mantiene
    la charla cuando el otro lado practicamente no responde."""
    pool = ["yes", "no", "i dont know", "maybe", "hmm", "ok", "yeah"]
    return random.choice(pool)


def _off_topic_strategy(transcript: list[dict], turn_n: int) -> str:
    """Alumno que constantemente desvia el tema. Test del coach manteniendo foco."""
    if turn_n == 0:
        return "hi"
    pool = [
        "anyway, did you see the football match yesterday?",
        "by the way, can you recommend me a good restaurant in Buenos Aires?",
        "I have to tell you about this weird dream I had last night",
        "do you think AI will replace teachers?",
        "wait, can you teach me how to say 'I love you' in 5 languages?",
        "what time is it where you are?",
    ]
    return random.choice(pool)


# ─── Catalogo de personas ─────────────────────────────────────────────────

def _free_topic_voice_strategy(transcript: list[dict], turn_n: int) -> str:
    """Alumno que entra a Tema Libre y le tira un topic verbal al coach."""
    if turn_n == 0:
        # Primera respuesta: tirar el topic que querés explorar
        return "I want to talk about the last book that really changed how I think — Sapiens"
    coach = _coach_said(transcript).lower()
    if turn_n == 1:
        return "Yeah, Sapiens by Yuval Noah Harari. It blew my mind, especially the part about shared myths"
    if "?" in coach:
        return random.choice([
            "I think the agricultural revolution chapter is the most controversial — Harari calls it 'history's biggest fraud'",
            "Honestly, the cognitive revolution idea changed how I see why humans cooperate at scale",
            "Yeah, but I'd push back a bit — some of his claims are oversimplified for the sake of narrative",
            "What surprised me most is how he frames money and religion as the same kind of fiction",
        ])
    return "right, makes sense"


PERSONAS: dict[str, Persona] = {
    "beginner_a1": Persona(
        name="beginner_a1",
        description="A1 muy basico, respuestas cortas con errores",
        cefr_level="A1",
        target_language="en",
        base_language="es",
        strategy=_beginner_a1_strategy,
        max_turns=6,
    ),
    "intermediate_b1": Persona(
        name="intermediate_b1",
        description="B1 conversacional, errores menores, se anima a opinar",
        cefr_level="B1",
        target_language="en",
        base_language="es",
        strategy=_intermediate_b1_strategy,
        max_turns=8,
    ),
    "advanced_c1": Persona(
        name="advanced_c1",
        description="C1 con opiniones fuertes, debate, contraargumenta",
        cefr_level="C1",
        target_language="en",
        base_language="es",
        strategy=_advanced_c1_strategy,
        max_turns=8,
    ),
    "distracted_kid": Persona(
        name="distracted_kid",
        description="Chico que cambia de tema, distraido, off-topic",
        cefr_level="A1",
        target_language="en",
        base_language="es",
        strategy=_distracted_kid_strategy,
        max_turns=8,
    ),
    "silent": Persona(
        name="silent",
        description="Alumno monosilabico, casi no aporta",
        cefr_level="B1",
        target_language="en",
        base_language="es",
        strategy=_silent_strategy,
        max_turns=6,
    ),
    "off_topic": Persona(
        name="off_topic",
        description="Constantemente desvia el tema",
        cefr_level="B1",
        target_language="en",
        base_language="es",
        strategy=_off_topic_strategy,
        max_turns=8,
    ),
    "free_topic_voice": Persona(
        name="free_topic_voice",
        description="Entra a 'Tema libre' (open-chat) y le tira un topic verbal al coach",
        cefr_level="B1",
        target_language="en",
        base_language="es",
        strategy=_free_topic_voice_strategy,
        max_turns=6,
    ),
}


def get_persona(name: str) -> Persona:
    if name not in PERSONAS:
        raise ValueError(f"Persona '{name}' no existe. Opciones: {list(PERSONAS.keys())}")
    return PERSONAS[name]
