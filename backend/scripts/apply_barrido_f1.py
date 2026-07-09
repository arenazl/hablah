"""F1-01 parte C — BARRIDO de cláusulas duplicadas de presets. ESCRIBE con --apply.

La capa universal (app_config.universal_conversation_rules) ahora dice, en UNA sola voz, el
CÓMO se conversa (variá, seguí el interés, recast, honestidad, una jugada por turno...). Este
script saca esas MISMAS reglas de donde estaban COPIADAS dentro de los presets de edad/nivel
(seeds/form_rules/pedagogy/session_focus). Una regla, una capa (regla global 7 del rework).

CIRUGÍA DE CLÁUSULA, no borrado de campo: cada entrada del SPEC remueve SOLO las oraciones
listadas por Fable, conservando el resto del texto etario/de nivel. El match es
ACENTO-INSENSIBLE y por substring (los textos en la DB difieren levemente de la transcripción):
se pliega el original a ASCII-minúsculas con un mapa de índices, se ubica la cláusula y se
recorta del ORIGINAL (preservando acentos en lo que queda). Cada patrón se lleva su conector
adyacente (coma/;/:/—) para no dejar puntuación colgando.

Modos:
  (sin flag)          DRY-RUN: imprime ANTES/DESPUÉS de cada campo. No escribe.
  --apply             Escribe el barrido. Backup JSON con los valores ORIGINALES antes.
  --revert <bkp.json> Restaura los valores ORIGINALES desde un backup (deshace el barrido).

NOTA de seguridad (rework): el barrido NO se deja aplicado en la DB compartida hasta que el
composer nuevo esté deployado — si no, prod quedaría sin las reglas y sin la capa universal.
El dueño lo aplica en el deploy coordinado con su validación por voz. Este script se corre acá
solo para AUDITAR el diff y verificar el smoke; después se revierte.
"""
import sys
import os
import re
import json
import asyncio
import unicodedata
from datetime import datetime

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import AsyncSessionLocal, engine

APPLY = "--apply" in sys.argv
REVERT = "--revert" in sys.argv
REVERT_PATH = sys.argv[sys.argv.index("--revert") + 1] if REVERT and len(sys.argv) > sys.argv.index("--revert") + 1 else None


# ─────────── SPEC del barrido (11 campos; +2 en SPEC_EXTRA = 13 en total) — patrones ACENTO-INSENSIBLES ───────────
# Cada patrón está en forma plegada (ASCII minúsculas). Se lleva su conector adyacente.
SPEC = [
    # 1. Mini continuation_seed: variá/festejá distinto · seguí su hilo · NO marches una lista
    {"table": "student_types", "key": "slug", "key_val": "mini", "field": "continuation_seed",
     "patterns": [
         r",\s*festeja distinto cada vez \(varia, nunca la misma frase\)",
         r",\s*y si trajo algo suyo \(su perro, su hermano, su juego\) segui ese hilo un toque antes de avanzar",
         r"no marches una lista\s*[—–-]\s*",
     ]},
    # 2. Mini pedagogy: celebrá el esfuerzo REAL (nunca mientas — ... festejá sólo cuando la diga parecido)
    {"table": "student_types", "key": "slug", "key_val": "mini", "field": "pedagogy",
     "patterns": [
         r"celebra el esfuerzo real \(nunca mientas\s*[—–-]\s*si no la dijo, modela de nuevo y festeja solo cuando la diga parecido\),\s*",
     ]},
    # 3. Mini session_focus: nunca como lista
    {"table": "student_types", "key": "slug", "key_val": "mini", "field": "session_focus",
     "patterns": [
         r",\s*nunca como lista",
     ]},
    # 4. Teen session_focus: El vocabulario del nivel emerge naturalmente..., no como drill
    {"table": "student_types", "key": "slug", "key_val": "teen", "field": "session_focus",
     "patterns": [
         r"\s*el vocabulario del nivel emerge naturalmente en la conversacion, no como drill\.",
     ]},
    # 5. Adult opening_seed: el objetivo gramatical del nivel va INVISIBLE, tejido en la charla
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "opening_seed",
     "patterns": [
         r":\s*el objetivo gramatical del nivel va invisible, tejido en la charla",
     ]},
    # 6. Adult form_rules: objetivo gramatical INVISIBLE · una sola pregunta o situación por turno
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "form_rules",
     "patterns": [
         r";\s*el objetivo gramatical va invisible, tejido en la charla",
         r";\s*una sola pregunta o situacion por turno",
     ]},
    # 7. Adult session_focus: El objetivo lingüístico del nivel queda invisible: ...
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "session_focus",
     "patterns": [
         r"\s*el objetivo linguistico del nivel queda invisible: el tutor lo incorpora naturalmente en su habla y estructura sus preguntas para que el alumno practique sin darse cuenta\.",
     ]},
    # 8. Adult continuation_seed: recast natural · llevá el objetivo sin explicitarlo · una pregunta por turno
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "continuation_seed",
     "patterns": [
         r":\s*una pregunta o situacion por turno",
         r"recast natural de los errores sin cortar la fluidez;\s*",
         r"lleva el objetivo del nivel sin explicitarlo;\s*",
     ]},
    # 9. Adult pedagogy: no interrumpir por errores menores; recast natural
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "pedagogy",
     "patterns": [
         r"no interrumpir por errores menores; recast natural;\s*",
     ]},
    # 10. B2 language_rule: Recast natural de los errores, sin cortar la fluidez (CONSERVA "100% inglés. Sin español.")
    {"table": "levels", "key": "code", "key_val": "B2", "field": "language_rule",
     "patterns": [
         r"\s*recast natural de los errores, sin cortar la fluidez\.",
     ]},
    # 11. A0 expected_production (EL MÁS DELICADO): SOLO los ejemplos de variación + el remate genérico.
    #     CONSERVA íntegro el contrato A0 (frase-puente, invitación fija, PROHIBIDO preguntas, reacción→modelado→invitación).
    {"table": "levels", "key": "code", "key_val": "A0", "field": "expected_production",
     "patterns": [
         r"\s*\(la reaccion, el contexto, una mini-escena, reciclar algo ya visto\)",
         r"\s*para que no suene a lista ni a robot",
     ]},
]

# ─── EXTRA: copias del MISMO rule ("objetivo del nivel invisible / tejido en la charla") que la
#     lista de Fable NO incluía y que el smoke F1-03 (invariante de duplicados) destapó. Es la
#     misma regla universal (rule #1: la estructura/objetivo va invisible) repetida en otros dos
#     campos de EDAD=adult. Se agregan para cerrar "una regla, una capa", pero MARCADAS: el dueño
#     confirma antes del deploy real (son campos fuera de la transcripción de Fable).
#       · tutor_identity: el composer LO RENDERIZA (bloque tutor_profile → Identity) → sí afecta el prompt.
#       · description:    el composer NO lo renderiza (inerte para la clase) → se limpia por prolijidad.
SPEC_EXTRA = [
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "tutor_identity",
     "extra": True, "patterns": [
         r";\s*lleva el objetivo del nivel de forma invisible, tejido en la charla",
     ]},
    {"table": "student_types", "key": "slug", "key_val": "adult", "field": "description",
     "extra": True, "patterns": [
         r",\s*objetivo gramatical invisible",
     ]},
]


def _fold_char(ch: str) -> str:
    d = unicodedata.normalize("NFKD", ch)
    d = "".join(c for c in d if not unicodedata.combining(c))
    return d.lower()


def fold(s: str):
    """Pliega a ASCII-minúsculas devolviendo (plegado, idx_map) donde idx_map[i] = índice
    en el original del i-ésimo char plegado. Para acentos latinos el mapeo es 1:1."""
    out, idx = [], []
    for i, ch in enumerate(s):
        for fc in _fold_char(ch):
            out.append(fc)
            idx.append(i)
    return "".join(out), idx


def remove_first(orig: str, pattern: str):
    """Ubica pattern (regex sobre el plegado) y recorta ese span del ORIGINAL. Devuelve
    (nuevo, found)."""
    folded, idx = fold(orig)
    m = re.search(pattern, folded)
    if not m or m.end() == m.start():
        return orig, False
    o_start = idx[m.start()]
    o_end = idx[m.end() - 1] + 1
    return orig[:o_start] + orig[o_end:], True


def cleanup(s: str) -> str:
    s = re.sub(r"\s+([,.;:])", r"\1", s)   # espacio antes de puntuación
    s = re.sub(r"\s{2,}", " ", s)          # espacios múltiples
    return s.strip()


async def _get(db, table, key, key_val, field):
    r = (await db.execute(
        text(f"SELECT {field} AS v FROM {table} WHERE {key}=:kv"), {"kv": key_val})).mappings().first()
    return r["v"] if r else None


async def do_barrido(db) -> list[dict]:
    """Aplica SPEC (Fable) + SPEC_EXTRA (smoke) en memoria; devuelve la lista de cambios."""
    changes = []
    for spec in SPEC + SPEC_EXTRA:
        original = await _get(db, spec["table"], spec["key"], spec["key_val"], spec["field"])
        extra = spec.get("extra", False)
        tag = f"{spec['table']}.{spec['field']} [{spec['key']}={spec['key_val']}]" + (" (EXTRA)" if extra else "")
        if original is None:
            changes.append({**{k: spec[k] for k in ("table", "key", "key_val", "field")},
                            "extra": extra, "original": None, "new": None,
                            "not_found": spec["patterns"], "tag": tag})
            continue
        cur = original
        not_found = []
        for pat in spec["patterns"]:
            cur, found = remove_first(cur, pat)
            if not found:
                not_found.append(pat)
        cur = cleanup(cur)
        changes.append({**{k: spec[k] for k in ("table", "key", "key_val", "field")},
                        "extra": extra, "original": original, "new": cur, "not_found": not_found, "tag": tag})
    return changes


def print_changes(changes: list[dict]) -> None:
    for c in changes:
        if c.get("extra"):
            print(f"\n{'#'*90}\n# EXTRA (fuera de la lista de Fable — hallado por el smoke; CONFIRMAR con el dueño)")
        print(f"\n{'='*90}\n{c['tag']}")
        if c["original"] is None:
            print("  !! campo no encontrado en la DB (revisar selector)")
            continue
        print(f"  ANTES  ({len(c['original'])}): {c['original']}")
        print(f"  DESPUÉS({len(c['new'])}): {c['new']}")
        if c["not_found"]:
            print(f"  !! cláusulas NO encontradas (no se pudo remover): {c['not_found']}")
        if not c["new"].strip():
            print("  !! ALERTA: el campo quedaría VACÍO — abortará el --apply (rompería el composer)")


async def apply_changes(db, changes: list[dict]) -> str:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    bkp = os.path.join(os.path.dirname(__file__), f"_backup_barrido_f1_{stamp}.json")
    with open(bkp, "w", encoding="utf-8") as fh:
        json.dump({"created": stamp,
                   "fields": [{k: c[k] for k in ("table", "key", "key_val", "field", "original", "new")}
                              for c in changes if c["original"] is not None]},
                  fh, ensure_ascii=False, indent=1)
    for c in changes:
        if c["original"] is None:
            continue
        if not c["new"].strip():
            raise SystemExit(f"ABORTA: {c['tag']} quedaría vacío tras el barrido.")
        await db.execute(
            text(f"UPDATE {c['table']} SET {c['field']}=:v WHERE {c['key']}=:kv"),
            {"v": c["new"], "kv": c["key_val"]})
    await db.commit()
    return bkp


async def revert(db, path: str) -> None:
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    print(f"== REVERT desde {os.path.basename(path)} ({len(data['fields'])} campos) ==")
    for f in data["fields"]:
        cur = await _get(db, f["table"], f["key"], f["key_val"], f["field"])
        same = cur == f["original"]
        print(f"\n{f['table']}.{f['field']} [{f['key']}={f['key_val']}]")
        print(f"  actual  ({len(cur or '')}): {(cur or '')[:110]}...")
        print(f"  -> restaura original ({len(f['original'])}): {f['original'][:110]}...")
        print(f"     (actual ya == original? {same})")
        await db.execute(
            text(f"UPDATE {f['table']} SET {f['field']}=:v WHERE {f['key']}=:kv"),
            {"v": f["original"], "kv": f["key_val"]})
    await db.commit()
    # verificación
    print("\n== verificación post-revert ==")
    all_ok = True
    for f in data["fields"]:
        cur = await _get(db, f["table"], f["key"], f["key_val"], f["field"])
        ok = cur == f["original"]
        all_ok = all_ok and ok
        print(f"  {f['table']}.{f['field']} [{f['key_val']}]: {'OK (== original)' if ok else 'MISMATCH!'}")
    print(f"\n{'TODOS los presets restaurados al ORIGINAL.' if all_ok else 'ALGÚN campo NO coincide — revisar.'}")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        if REVERT:
            if not REVERT_PATH or not os.path.exists(REVERT_PATH):
                raise SystemExit("--revert requiere una ruta de backup válida.")
            await revert(db, REVERT_PATH)
            await engine.dispose()
            return

        changes = await do_barrido(db)
        print_changes(changes)
        total_nf = sum(len(c["not_found"]) for c in changes)
        print(f"\n{'='*90}")
        print(f"resumen: {len([c for c in changes if c['original'] is not None])} campos, "
              f"{total_nf} cláusulas NO encontradas.")

        if APPLY:
            bkp = await apply_changes(db, changes)
            print(f"\nAPLICADO. Backup (originales): {os.path.basename(bkp)}")
            print(f"Para revertir: python scripts/apply_barrido_f1.py --revert scripts/{os.path.basename(bkp)}")
        else:
            await db.rollback()
            print("\nDRY-RUN (nada escrito). Corré con --apply para escribir (deja backup de originales).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
