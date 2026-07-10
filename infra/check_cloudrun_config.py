#!/usr/bin/env python3
"""Chequeo post-deploy de Cloud Run para hablah-api (WO F3-04).

Por que existe: el CD (`gcloud run deploy --source`, trigger `deploy-hablah-api`)
puede pisar min/max-instances, cpu-throttling y timeout en cada push si esos
flags no estan explicitos en el step de Cloud Build (ver infra/service.yaml,
seccion "EL PROBLEMA QUE ESTO RESUELVE"). Este script es la forma barata de
confirmar, DESPUES de cada deploy, que la config viva sigue siendo la correcta
-- sin tener que leer el output de gcloud a ojo.

Que valida (falla / exit != 0 si alguno esta mal, exactamente los 4 del WO):
  1. min-instances == 1   (rooms_registry vive en memoria del proceso)
  2. max-instances == 1   (idem — multi-instancia rompe las salas de voz)
  3. CPU throttling DESACTIVADO (--no-cpu-throttling aplicado)
  4. timeout >= 3600s     (sesiones de voz son WS largos)

Memoria, concurrency, cpu-count e imagen se imprimen como INFO (no fallan el
chequeo — no son el riesgo #1 que ataca este WO; ver infra/service.yaml).

Uso:
    python infra/check_cloudrun_config.py
    python infra/check_cloudrun_config.py --service hablah-api --region us-east4 --project hablah-prod
    python infra/check_cloudrun_config.py --json     # salida machine-readable, sin prints decorativos

Requiere: gcloud CLI autenticado con acceso al proyecto (misma cuenta que
gestiona el resto del ecosistema). NO dispara ningun deploy ni cambia nada:
es 100% de lectura (`gcloud run services describe`).

Codigos de salida:
  0 = todo OK (los 4 checks obligatorios en verde)
  1 = no se pudo consultar el servicio (gcloud fallo, no autenticado, servicio
      no existe, JSON invalido, etc.) -- error operativo, no de config
  2 = el servicio existe pero la config tiene drift en >=1 de los 4 checks
      obligatorios -- ESTE es el caso que le importa a Infra tras un deploy
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field

DEFAULT_SERVICE = "hablah-api"
DEFAULT_REGION = "us-east4"
DEFAULT_PROJECT = "hablah-prod"

MIN_SCALE_ANNOTATION = "autoscaling.knative.dev/minScale"
MAX_SCALE_ANNOTATION = "autoscaling.knative.dev/maxScale"
CPU_THROTTLING_ANNOTATION = "run.googleapis.com/cpu-throttling"

REQUIRED_MIN_INSTANCES = 1
REQUIRED_MAX_INSTANCES = 1
REQUIRED_TIMEOUT_SECONDS = 3600


@dataclass
class CheckResult:
    name: str
    ok: bool
    expected: str
    actual: str
    severity: str = "FAIL"  # "FAIL" (cuenta para exit 2) o "INFO" (no cuenta)


@dataclass
class Report:
    service: str
    region: str
    project: str
    checks: list[CheckResult] = field(default_factory=list)

    @property
    def hard_failures(self) -> list[CheckResult]:
        return [c for c in self.checks if c.severity == "FAIL" and not c.ok]


def fetch_service_json(service: str, region: str, project: str) -> dict:
    """Corre `gcloud run services describe --format=json` y parsea el output.

    Read-only. No dispara ningun deploy ni escribe nada.
    """
    cmd = [
        "gcloud", "run", "services", "describe", service,
        "--region", region,
        "--project", project,
        "--format", "json",
    ]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60, check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "gcloud CLI no encontrado en PATH. Instalar/activar el SDK de GCP."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("gcloud no respondio en 60s (red o auth colgada).") from exc

    if proc.returncode != 0:
        raise RuntimeError(
            f"gcloud fallo (exit {proc.returncode}). stderr:\n{proc.stderr.strip()}"
        )

    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Respuesta de gcloud no es JSON valido: {exc}") from exc


def evaluate(data: dict, service: str, region: str, project: str) -> Report:
    report = Report(service=service, region=region, project=project)

    template = data.get("spec", {}).get("template", {})
    tpl_meta = template.get("metadata", {})
    tpl_annotations = tpl_meta.get("annotations", {})
    tpl_spec = template.get("spec", {})

    # --- 1. min-instances -------------------------------------------------
    min_raw = tpl_annotations.get(MIN_SCALE_ANNOTATION)
    min_ok = min_raw is not None and str(min_raw) == str(REQUIRED_MIN_INSTANCES)
    report.checks.append(CheckResult(
        name="min-instances",
        ok=min_ok,
        expected=str(REQUIRED_MIN_INSTANCES),
        actual=min_raw if min_raw is not None else "(sin anotacion -> default Cloud Run, min=0)",
    ))

    # --- 2. max-instances -------------------------------------------------
    max_raw = tpl_annotations.get(MAX_SCALE_ANNOTATION)
    max_ok = max_raw is not None and str(max_raw) == str(REQUIRED_MAX_INSTANCES)
    report.checks.append(CheckResult(
        name="max-instances",
        ok=max_ok,
        expected=str(REQUIRED_MAX_INSTANCES),
        actual=max_raw if max_raw is not None else "(sin anotacion -> default Cloud Run, max=100)",
    ))

    # --- 3. CPU throttling --------------------------------------------------
    # La anotacion presente + "false" = --no-cpu-throttling aplicado (bien).
    # Ausente, o "true" = throttling ACTIVO (el default de Cloud Run) = mal.
    throttling_raw = tpl_annotations.get(CPU_THROTTLING_ANNOTATION)
    throttling_disabled = str(throttling_raw).lower() == "false"
    report.checks.append(CheckResult(
        name="cpu-throttling",
        ok=throttling_disabled,
        expected="desactivado (annotation cpu-throttling=false, o sea --no-cpu-throttling)",
        actual=(
            "desactivado (OK)" if throttling_disabled
            else f"ACTIVO -- annotation={throttling_raw!r} (default Cloud Run castra CPU entre requests)"
        ),
    ))

    # --- 4. timeout ---------------------------------------------------------
    timeout_raw = tpl_spec.get("timeoutSeconds")
    try:
        timeout_val = int(timeout_raw) if timeout_raw is not None else None
    except (TypeError, ValueError):
        timeout_val = None
    timeout_ok = timeout_val is not None and timeout_val >= REQUIRED_TIMEOUT_SECONDS
    report.checks.append(CheckResult(
        name="timeout",
        ok=timeout_ok,
        expected=f">= {REQUIRED_TIMEOUT_SECONDS}s",
        actual=f"{timeout_val}s" if timeout_val is not None else f"(sin valor -> default Cloud Run, 300s)",
    ))

    # --- INFO (no fallan el gate, pero se reportan) --------------------------
    concurrency = tpl_spec.get("containerConcurrency")
    report.checks.append(CheckResult(
        name="concurrency (info)", ok=True, expected="~80-250 (recomendado)",
        actual=str(concurrency), severity="INFO",
    ))

    containers = tpl_spec.get("containers", [{}])
    limits = (containers[0].get("resources", {}) or {}).get("limits", {}) if containers else {}
    report.checks.append(CheckResult(
        name="memory (info)", ok=True, expected="512Mi base, 1Gi si hay OOM medido",
        actual=str(limits.get("memory")), severity="INFO",
    ))
    report.checks.append(CheckResult(
        name="cpu-count (info)", ok=True, expected="1 (workload I/O-bound)",
        actual=str(limits.get("cpu")), severity="INFO",
    ))

    image = containers[0].get("image") if containers else None
    latest_revision = data.get("status", {}).get("latestReadyRevisionName")
    report.checks.append(CheckResult(
        name="revision (info)", ok=True, expected="-",
        actual=f"image={image} revision={latest_revision}", severity="INFO",
    ))

    return report


def print_human(report: Report) -> None:
    print(f"Cloud Run config check -- service={report.service} region={report.region} project={report.project}")
    print("-" * 78)
    for c in report.checks:
        tag = "OK  " if c.ok else ("FAIL" if c.severity == "FAIL" else "INFO")
        print(f"[{tag}] {c.name:<20} esperado={c.expected:<45} actual={c.actual}")
    print("-" * 78)
    failures = report.hard_failures
    if failures:
        print(f"RESULTADO: DRIFT DETECTADO ({len(failures)} check(s) obligatorio(s) en rojo).")
        print("El CD probablemente piso los flags en el ultimo deploy. Ver infra/service.yaml")
        print("para los flags exactos a re-aplicar en el trigger deploy-hablah-api.")
    else:
        print("RESULTADO: OK -- los 4 checks obligatorios (min/max/throttling/timeout) en verde.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--service", default=DEFAULT_SERVICE)
    parser.add_argument("--region", default=DEFAULT_REGION)
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--json", action="store_true", help="salida JSON, sin prints decorativos")
    args = parser.parse_args()

    try:
        data = fetch_service_json(args.service, args.region, args.project)
    except RuntimeError as exc:
        if args.json:
            print(json.dumps({"error": str(exc)}))
        else:
            print(f"ERROR consultando el servicio: {exc}", file=sys.stderr)
        return 1

    report = evaluate(data, args.service, args.region, args.project)

    if args.json:
        print(json.dumps({
            "service": report.service,
            "region": report.region,
            "project": report.project,
            "checks": [c.__dict__ for c in report.checks],
            "hard_failures": len(report.hard_failures),
        }, indent=2))
    else:
        print_human(report)

    return 2 if report.hard_failures else 0


if __name__ == "__main__":
    sys.exit(main())
