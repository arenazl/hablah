"""Barrido cartesiano del motor: EDAD x NIVEL x TOPICO -> que placeholder falta.

Que hace y que NO hace
----------------------
IDENTIFICA huecos. No los llena, no inventa, no propone genericos. El motor de 9 pasos
revienta cuando falta un dato (MotorDataMissing) y eso se queda asi: este script solo
recorre el cartesiano ANTES de que reviente en una clase, y deja el mapa.

Por que no compone de verdad
----------------------------
Componer el cartesiano entero son ~8.760 llamadas y cada _resolve_v2_sync abre dos
conexiones. Se carga el catalogo UNA vez y se resuelve cada placeholder en memoria con
las MISMAS reglas del resolver (mismo diccionario por prefijo, misma fuente por campo).
Si el resolver cambia de reglas, este script hay que actualizarlo — por eso lee los
placeholders del template activo en vez de tener la lista hardcodeada.

Dos universos, porque miden cosas distintas
-------------------------------------------
  A) EDAD x NIVEL              cruces de age_level_matrix que faltan, sin mirar topicos.
                               Acotado por student_types.max_level_order: mini x C2 no es
                               un hueco, es un combo que no existe.
  B) TOPICO x NIVEL x EDAD     lo que de verdad bloquea una clase: cada topico contra los
                               niveles que EL declara y las edades de su segmento.

Salida
------
docs/08-barrido-huecos/huecos_motor.json — brief de llenado: cada hueco trae tabla, fila,
columna, cuantas combinaciones bloquea, y DOS ejemplos de filas hermanas ya cargadas para
que quien lo complete copie el registro y no invente un tono nuevo.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from collections import Counter, defaultdict

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

_PH = re.compile(r"\{([A-Z_]+):([a-z_]+)\}")

# Mismo mapeo prefijo->fuente que orchestration_resolver. EDAD y NIVEL son diccionarios
# CERRADOS en el resolver (hardcodeados); EDAD_X_NIVEL es abierto (cualquier columna).
CAMPO_EDAD = {
    "tutor_name": "tutor_mascot", "tutor_identity": "tutor_identity",
    "gamification_focus": "session_focus", "estilo_de_sesion": "estilo_de_sesion",
    "anclas_narrativas": "anclas_narrativas",
}
CAMPO_NIVEL = {"gramatica_objetivo": "curriculum_grammar", "idioma_instruccion": "language_rule"}
# Computado por el resolver, no es columna.
CALCULADOS = {"reglas_universales_filtradas"}


def _lista(raw):
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    try:
        v = json.loads(raw)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def _vacio(v) -> bool:
    return v is None or (isinstance(v, str) and not v.strip())


async def main() -> None:
    async with AsyncSessionLocal() as s:
        async def q(sql):
            return (await s.execute(text(sql))).mappings().all()

        tpl = (await q("SELECT id, name, body FROM orchestration_templates WHERE active=1 "
                       "ORDER BY id DESC LIMIT 1"))[0]
        edades = await q("SELECT * FROM student_types WHERE active=1 ORDER BY sort_order")
        niveles = await q("SELECT * FROM levels WHERE active=1 ORDER BY sort_order")
        cruces = await q("SELECT * FROM age_level_matrix WHERE active=1")
        topicos = await q("SELECT t.*, c.family AS cat_family, c.name AS cat_name "
                          "FROM topics t LEFT JOIN categories c ON c.id=t.category_id "
                          "WHERE t.is_active=1 ORDER BY t.id")

    placeholders = _PH.findall(tpl["body"])
    ph_edad = [f for p, f in placeholders if p == "EDAD"]
    ph_nivel = [f for p, f in placeholders if p == "NIVEL"]
    ph_cruce = [f for p, f in placeholders if p == "EDAD_X_NIVEL" and f not in CALCULADOS]
    ph_topico = [f for p, f in placeholders if p == "TOPICO"]

    edad_por_slug = {e["slug"]: e for e in edades}
    nivel_por_code = {n["code"]: n for n in niveles}
    cruce_por_key = {(c["age_slug"], c["level_code"]): c for c in cruces}

    # Ejemplos de filas hermanas YA cargadas, para que el que llene copie el registro.
    def ejemplos_cruce(campo, excluir_key, n=2):
        out = []
        for c in cruces:
            if (c["age_slug"], c["level_code"]) == excluir_key:
                continue
            v = c.get(campo)
            if not _vacio(v):
                out.append({"fila": f"{c['age_slug']} x {c['level_code']}", "valor": str(v)[:400]})
            if len(out) >= n:
                break
        return out

    def ejemplos_col(filas, campo, excluir_id, etiqueta, n=2):
        out = []
        for r in filas:
            if r.get("id") == excluir_id:
                continue
            v = r.get(campo)
            if not _vacio(v):
                out.append({"fila": str(r.get(etiqueta)), "valor": str(v)[:400]})
            if len(out) >= n:
                break
        return out

    huecos = {"age_level_matrix": [], "levels": [], "student_types": [], "topics": []}
    bloqueos = Counter()

    # ── Universo A: EDAD x NIVEL, acotado por max_level_order ─────────────────────────
    combos_validos = []
    for e in edades:
        techo = e.get("max_level_order")
        for n in niveles:
            if techo is not None and (n.get("sort_order") or 0) > techo:
                continue  # combo que el catalogo declara imposible: no es hueco
            combos_validos.append((e["slug"], n["code"]))

    for age_slug, level_code in combos_validos:
        cruce = cruce_por_key.get((age_slug, level_code))
        if cruce is None:
            huecos["age_level_matrix"].append({
                "tabla": "age_level_matrix", "fila": {"age_slug": age_slug, "level_code": level_code},
                "problema": "la fila NO EXISTE",
                "columnas_a_cargar": ph_cruce,
                "familia_del_nivel": nivel_por_code[level_code].get("family"),
                "ejemplos": {c: ejemplos_cruce(c, (age_slug, level_code)) for c in ph_cruce},
            })
            continue
        faltan = [c for c in ph_cruce if _vacio(cruce.get(c))]
        if faltan:
            huecos["age_level_matrix"].append({
                "tabla": "age_level_matrix", "fila": {"age_slug": age_slug, "level_code": level_code},
                "problema": "fila incompleta",
                "columnas_a_cargar": faltan,
                "familia_del_nivel": nivel_por_code[level_code].get("family"),
                "ejemplos": {c: ejemplos_cruce(c, (age_slug, level_code)) for c in faltan},
            })

    # ── Ejes sueltos: NIVEL y EDAD ────────────────────────────────────────────────────
    for n in niveles:
        faltan = [f for f in ph_nivel if _vacio(n.get(CAMPO_NIVEL[f]))]
        if faltan:
            huecos["levels"].append({
                "tabla": "levels", "fila": {"code": n["code"]}, "familia": n.get("family"),
                "columnas_a_cargar": [CAMPO_NIVEL[f] for f in faltan],
                "ejemplos": {CAMPO_NIVEL[f]: ejemplos_col(niveles, CAMPO_NIVEL[f], n["id"], "code")
                             for f in faltan},
            })
    for e in edades:
        faltan = [f for f in ph_edad if _vacio(e.get(CAMPO_EDAD[f]))]
        if faltan:
            huecos["student_types"].append({
                "tabla": "student_types", "fila": {"slug": e["slug"]},
                "columnas_a_cargar": [CAMPO_EDAD[f] for f in faltan],
                "ejemplos": {CAMPO_EDAD[f]: ejemplos_col(edades, CAMPO_EDAD[f], e["id"], "slug")
                             for f in faltan},
            })

    # ── Universo B: TOPICO x NIVEL x EDAD (lo que bloquea una clase de verdad) ────────
    SEG_A_EDAD = {"adultos": ["adult"], "adulto": ["adult"], "mini": ["mini"],
                  "junior": ["junior"], "teen": ["teen"], "kids": ["mini", "junior"]}
    total = ok = 0
    falta_por_topico = defaultdict(set)

    for t in topicos:
        vocab = _lista(t.get("keywords")) + _lista(t.get("pinned_vocabulary"))
        frases = _lista(t.get("generated_vocab"))
        # DOS categorias distintas, y confundirlas seria mentir sobre el estado del motor:
        #   rompe   -> el resolver revienta (fail-fast). Es un hueco de verdad.
        #   incompleto -> compone igual, pero le falta un dato que el MODELO necesita
        #                 (la familia decide como se comportan las semillas). No bloquea
        #                 una clase hoy; bloquea el diseno.
        rompe, incompleto = [], []
        if not vocab and not frases:
            rompe.append("semillas")              # {TOPICO:semillas} revienta
        if _vacio(t.get("title")):
            rompe.append("titulo")
        if t.get("cat_family") is None:
            incompleto.append("categoria sin familia")
        if rompe or incompleto:
            falta_por_topico[t["id"]] = (tuple(rompe), tuple(incompleto))

        seg = (t.get("segmento") or "").strip().lower()
        edades_t = SEG_A_EDAD.get(seg)
        if not edades_t:
            edades_t = ["adult"] if (t.get("audience") or "") == "adult" else [e["slug"] for e in edades]
        for lvl in _lista(t.get("levels")):
            for age_slug in edades_t:
                if age_slug not in edad_por_slug or lvl not in nivel_por_code:
                    continue
                total += 1
                if (age_slug, lvl) not in cruce_por_key:
                    bloqueos[f"falta cruce {age_slug} x {lvl}"] += 1
                elif rompe:
                    bloqueos[f"topico {t['id']}: {', '.join(rompe)}"] += 1
                else:
                    ok += 1

    for t in topicos:
        p = falta_por_topico.get(t["id"])
        if p:
            rompe, incompleto = p
            huecos["topics"].append({
                "tabla": "topics", "fila": {"id": t["id"], "title": t["title"]},
                "familia": t.get("cat_family"), "categoria": t.get("cat_name"),
                "segmento": t.get("segmento"), "niveles_declarados": _lista(t.get("levels")),
                "rompe_la_composicion": sorted(rompe),
                "incompleto_para_el_modelo": sorted(incompleto),
            })

    salida = {
        "universo": {
            "edades": len(edades), "niveles": len(niveles), "topicos_activos": len(topicos),
            "template_activo": {"id": tpl["id"], "name": tpl["name"]},
            "placeholders_del_template": [f"{p}:{f}" for p, f in placeholders],
            "combos_edad_x_nivel_validos": len(combos_validos),
            "combos_topico_x_nivel_x_edad": total,
        },
        "resumen": {
            "combos_que_componen": ok,
            "combos_bloqueados": total - ok,
            "cruces_faltantes_o_incompletos": len(huecos["age_level_matrix"]),
            "topicos_con_huecos": len(huecos["topics"]),
            "niveles_con_huecos": len(huecos["levels"]),
            "edades_con_huecos": len(huecos["student_types"]),
        },
        "bloqueos_mas_frecuentes": [{"causa": k, "combos": v} for k, v in bloqueos.most_common(30)],
        "huecos": huecos,
    }

    destino = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "08-barrido-huecos")
    os.makedirs(destino, exist_ok=True)
    ruta = os.path.abspath(os.path.join(destino, "huecos_motor.json"))
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(salida, fh, ensure_ascii=False, indent=2)

    print(f"template activo: id={tpl['id']} {tpl['name']!r} — {len(placeholders)} placeholders")
    print(f"universo: {len(edades)} edades x {len(niveles)} niveles x {len(topicos)} topicos")
    print(f"  combos EDAD x NIVEL validos (por max_level_order): {len(combos_validos)}")
    print(f"  combos TOPICO x NIVEL x EDAD:                      {total}")
    print()
    print(f"COMPONEN:   {ok}")
    print(f"BLOQUEADOS: {total - ok}")
    print()
    for k, v in salida["resumen"].items():
        print(f"  {k:<36} {v}")
    print("\ntop bloqueos:")
    for b in salida["bloqueos_mas_frecuentes"][:15]:
        print(f"  {b['combos']:>5}  {b['causa']}")
    print(f"\n-> {ruta}")


if __name__ == "__main__":
    asyncio.run(main())
