"""Audit read-only: ¿qué le falta a la BD para que el motor sea 100% funcional?

Recorre TODAS las tablas que alimentan los 9 pasos y reporta completitud (no adivina:
cuenta filas y campos vacíos reales). Uso: python scripts/audit_motor_db.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, func
from core.database import AsyncSessionLocal
from models.methodology import StudentType, Level, Coach, Category, Subcategory
from models.template import Topic
from models.config import AppConfig
from models.kit import Kit, KitTopic


def _miss(val) -> bool:
    return val is None or (isinstance(val, (str, list, dict)) and len(val) == 0)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # ── EJE EDAD: student_types (bloques 2,3,4,6,9,12) ──
        print("=== student_types (EJE EDAD) — 4 segmentos esperados ===")
        ST_FIELDS = ["tutor_mascot", "tutor_identity", "tutor_tonal_rules", "session_focus",
                     "pedagogy", "form_rules", "opening_seed", "continuation_seed", "closing_seed"]
        sts = (await db.execute(select(StudentType).order_by(StudentType.sort_order))).scalars().all()
        print(f"  filas: {len(sts)}")
        for s in sts:
            missing = [f for f in ST_FIELDS if _miss(getattr(s, f, None))]
            print(f"  - {s.slug:7} {'COMPLETO' if not missing else 'FALTA: ' + ', '.join(missing)}")

        # ── EJE NIVEL: levels (bloque 6,7) ──
        print("\n=== levels (EJE NIVEL) — 7 niveles esperados (A0..C2) ===")
        LV_FIELDS = ["language_rule", "curriculum_grammar", "expected_production", "duration_base_minutes", "vocab_depth"]
        lvs = (await db.execute(select(Level).order_by(Level.sort_order))).scalars().all()
        print(f"  filas: {len(lvs)}")
        for l in lvs:
            missing = [f for f in LV_FIELDS if _miss(getattr(l, f, None))]
            print(f"  - {l.code:4} {'COMPLETO' if not missing else 'FALTA: ' + ', '.join(missing)}")

        # ── Coaches (bloque 2 persona) ──
        print("\n=== coaches (persona del tutor, bloque 2) ===")
        coaches = (await db.execute(select(Coach))).scalars().all()
        by_seg: dict = {}
        for c in coaches:
            by_seg.setdefault(c.student_type, []).append(c)
        if not coaches:
            print("  VACÍO — ningún coach cargado (el bloque 2 cae a student_types.tutor_*)")
        for seg, cs in sorted(by_seg.items()):
            incompletos = sum(1 for c in cs if _miss(c.identity) or _miss(c.personality) or _miss(c.voice_name))
            print(f"  - {seg:7} {len(cs)} coaches ({incompletos} con identity/personality/voz incompletos)")

        # ── Catálogo de tópicos (bloque 7) — lo que el sequencer elige ──
        print("\n=== topics (catálogo, bloque 7) — lo que puede romper en vivo ===")
        topics = (await db.execute(select(Topic).where(Topic.is_active.is_(True)))).scalars().all()
        n = len(topics)
        def has_vocab(t):
            return bool((getattr(t, "pinned_vocabulary", None) or []) or (getattr(t, "keywords", None) or [])
                        or (getattr(t, "generated_vocab", None) or []))
        sin_vocab = [t for t in topics if not has_vocab(t)]
        kid = [t for t in topics if t.audience == "kid"]
        adult = [t for t in topics if t.audience == "adult"]
        con_bands = [t for t in topics if getattr(t, "appropriate_bands", None)]
        con_seg = [t for t in topics if getattr(t, "segmento", None)]
        con_cat = [t for t in topics if getattr(t, "category_id", None)]
        print(f"  activos: {n}  (kid: {len(kid)}, adult: {len(adult)})")
        print(f"  SIN vocab (rompen bloque 7 si el sequencer los elige): {len(sin_vocab)}")
        for t in sin_vocab[:15]:
            print(f"      · [{t.audience}] {t.title}  (id {t.id})")
        print(f"  con appropriate_bands (filtro del sequencer): {len(con_bands)}/{n}")
        print(f"  con segmento: {len(con_seg)}/{n}   con category_id: {len(con_cat)}/{n}")

        # ── Jerarquía categorías/subcategorías ──
        cats = (await db.execute(select(func.count()).select_from(Category))).scalar()
        subs = (await db.execute(select(func.count()).select_from(Subcategory))).scalar()
        print(f"\n=== jerarquía ===\n  categories: {cats}   subcategories: {subs}")

        # ── Kits por banda ──
        print("\n=== kits (kit de tópicos por banda) ===")
        kits = (await db.execute(select(Kit))).scalars().all()
        kt = (await db.execute(select(func.count()).select_from(KitTopic))).scalar()
        if not kits:
            print("  VACÍO — sin kits (el sequencer usa todo el catálogo por audience)")
        for k in kits:
            cnt = (await db.execute(select(func.count()).select_from(KitTopic).where(KitTopic.kit_id == k.id))).scalar()
            print(f"  - {getattr(k, 'name', k.id)}: {cnt} tópicos")
        print(f"  kit_topics total: {kt}")

        # ── app_config (bloque output_rules) ──
        print("\n=== app_config (output_rules, bloque 6.x) ===")
        cfg = {c.key: c.value for c in (await db.execute(select(AppConfig))).scalars().all()}
        EXPECTED = ["voice_emojis_screen_only", "asr_low_confidence_retry", "kid_safety_guard",
                    "adult_stay_on_frame", "closing_no_new_content"]
        print(f"  keys cargadas: {len(cfg)}")
        for k in EXPECTED:
            print(f"  - {k}: {cfg.get(k, 'AUSENTE')}")


if __name__ == "__main__":
    asyncio.run(main())
