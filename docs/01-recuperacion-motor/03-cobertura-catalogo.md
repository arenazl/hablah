# Cobertura de catálogos (edad × nivel × tópico) — audit 2026-07-08

> Info **agnóstica** de la orquestación (son tópicos/reglas/niveles). Sirve para saber qué está
> cubierto y qué falta. **Etiquetado:** `[CONTROLADO]` = trabajo mecánico/seguro que hacemos ahora ·
> `[PARA FABLE]` = necesita criterio pedagógico o validación por voz.

## Lo que SÍ está completo

- **Edades (`student_types`):** 4/4 activas — `mini` (4-7), `junior` (8-12), `teen` (13-17), `adult`. ✓
- **Niveles (`levels`):** 7/7 (A0→C2), y los campos clave (`language_rule`, `curriculum_grammar`,
  `expected_production`, `vocab_depth`) están **todos llenos**. ✓

## Tópicos — cobertura por (segmento × nivel)

| seg \ niv | A0 | A1 | A2 | B1 | B2 | C1 | C2 |
|---|---|---|---|---|---|---|---|
| adultos | 97 | 128 | 128 | 127 | 127 | 126 | 30 |
| junior  | 15 | 15 | 15 | 0 | 0 | 0 | 0 |
| mini    | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| teen    | 10 | 10 | 10 | 0 | 0 | 0 | 0 |

(Cada tópico kid trae `levels=[A0,A1,A2]` → por eso los números se repiten en A0/A1/A2: el mismo tópico
aplica a esos 3 niveles. Total: 165 tópicos — 37 kid, 128 adult.)

## Gaps (hechos, sin juicio)

1. **Kids con catálogo FLACO**: mini 12, junior 15, teen 10 (vs ~127 de adultos por nivel).
2. **Kids sólo A0–A2**: junior y teen no tienen tópicos B1+ (un teen de 15-17 podría llegar a B1/B2).
3. **Adult C2 flaco**: 30 (vs ~127 en A0–C1).

## Qué hacemos vs qué queda para Fable

- `[CONTROLADO]` **Render-safety**: que cada tópico existente resuelva sin `MotorDataMissing` en sus
  niveles; completar semilla liviana (título + pocas palabras) donde falte. No rompe nada, no fuerza vocab.
- `[CONTROLADO]` **Limpieza gruesa del tagging**: sacar disparates estructurales (audience/segmento/
  `levels` obviamente mal). Reportar, no curar el detalle.
- `[PARA FABLE]` **Llenar los gaps** (más tópicos kids, B1+ para teen/junior, C2 adult): QUÉ tópico va
  a QUÉ edad/nivel es **decisión pedagógica** ("no empanadas a un nene de 5") → criterio + validación.
- `[PARA FABLE]` **Tagging fino** edad×nivel×tópico (la matriz curada).

**Regla:** completar/crear contenido pedagógico = Fable. Sanear estructura y garantizar que nada
crashee = nosotros.
