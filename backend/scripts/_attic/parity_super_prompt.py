"""Harness de paridad / smoke del compositor JIT (Motor Pedagógico Adaptativo).

String puro, SIN red ni BD: arma fixtures en memoria y compara el prompt LEGACY
(flag off) vs el COMPOSITOR (flag on) para los casos clave. Verifica el fix de
kids A0 (el tópico deja de ignorarse) y que las ramas no migradas no cambien.

Uso local: python scripts/parity_super_prompt.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
# Defensa por si core.config exige envs al importar.
os.environ.setdefault("DATABASE_URL", "mysql+aiomysql://x:x@localhost/x")
os.environ.setdefault("JWT_SECRET", "x")

from types import SimpleNamespace

from services.super_prompt import build_super_prompt  # noqa: E402


def _kid_user():
    return SimpleNamespace(
        nombre="Timi", cefr_level="A0", target_language="en", base_language="es",
        age_group="mini", parent_user_id=10, user_preferences=None,
    )


def _kid_topic():
    # Tópico que el nene ELIGIÓ (el que hoy se ignora).
    return SimpleNamespace(
        title="Jugar en la pantalla", slug="kids-mini-x-jugar", keywords=[],
        pinned_vocabulary=None, seed_prompts={}, category="kids",
        kid_age_group="mini", is_active=True, levels=["A0"], id=99,
    )


STAGE = {  # etapa "Colores" (lo que el nene tiene que aprender)
    "title": "Colores", "vocabulary": [{"en": "red", "es": "rojo"}, {"en": "blue", "es": "azul"}],
    "target_structure": "It's red", "mastery_criteria": "Nombra 2 colores",
}
MODULE = {  # el riel A0 (las auto-restricciones)
    "focus_name": "Aislamiento fonético", "target_grammar": "Sustantivos + adjetivos simples",
    "ai_restraints": ("Solo 1-3 palabras. No exijas gramática. Festejá solo si lo dice de verdad. "
                      "Nunca cierres la clase: la termina el adulto."),
}
JUNCTION = {  # celda tópico×módulo: el léxico permitido
    "seed_prompt": "It's red", "required_keywords": ["red", "blue"],
    "allowed_vocabulary": ["red", "blue"],
}


def _run(env_modes: str, **extra):
    os.environ["COMPOSER_MODES"] = env_modes
    return build_super_prompt(
        user=_kid_user(), template=None, topic=_kid_topic(),
        methodology_stage=STAGE, **extra,
    )


def main() -> int:
    legacy = _run("")  # flag off -> monolito viejo (kids A0 que ignora el tópico)
    composed = _run("staged_vocab", methodology_module=MODULE, topic_content=JUNCTION)

    print("=" * 70)
    print("LEGACY (flag off) — primeros 600 chars:")
    print(legacy[:600])
    print("=" * 70)
    print("COMPOSITOR (staged_vocab) — primeros 900 chars:")
    print(composed[:900])
    print("=" * 70)

    checks = {
        "compositor USA el tópico elegido": "Jugar en la pantalla" in composed,
        "compositor enseña el vocab de la etapa (red/blue)": "red" in composed and "blue" in composed,
        "compositor PROHÍBE ignorar el tema": "PROHIBIDO" in composed and "ignor" in composed.lower(),
        "compositor PROHÍBE cerrar la clase": "NUNCA te despidas" in composed or "cerres la clase" in composed.lower() or "cierres la clase" in composed.lower(),
        "compositor trae el riel A0 (1-3 palabras)": "1-3 palabras" in composed,
        "legacy NO trae la regla de combinación nueva": "REGLA DE COMBINACIÓN" not in legacy,
        "legacy y compositor difieren": legacy != composed,
    }
    print("\nRESULTADOS:")
    ok = True
    for name, passed in checks.items():
        print(f"  [{'OK ' if passed else 'FAIL'}] {name}")
        ok = ok and passed
    print("\n" + ("TODO OK — el compositor arregla kids A0 sin romper legacy" if ok else "HAY FALLAS"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
