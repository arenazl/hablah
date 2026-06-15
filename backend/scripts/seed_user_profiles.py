"""Seed de 20 perfiles de usuario variados para testing del motor adaptativo.

Crea usuarios con combinaciones realistas de:
  age_group × english_self_level × learning_goal × occupation × cefr_level

El mapeo english_self_level → cefr_level:
  'zero'          → A0
  'survival'      → A1
  'basic'         → A2
  'intermediate'  → B1
  'upper'         → B2
  'advanced'      → C1
  'near_native'   → C2

Todos con contraseña: hablah123
Idempotente: no re-crea si el email ya existe.
"""
import asyncio, sys, os

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from passlib.context import CryptContext
from core.database import AsyncSessionLocal
from models.user import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Mapeo nivel descriptivo → CEFR
SELF_TO_CEFR = {
    "zero": "A0",
    "survival": "A1",
    "basic": "A2",
    "intermediate": "B1",
    "upper": "B2",
    "advanced": "C1",
    "near_native": "C2",
}

PROFILES = [
    # Mini / kids (manejados por padres; el alumno real es el chico)
    {"nombre": "Lucas",      "apellido": "Fernandez", "age_group": "teen",        "english_self_level": "zero",         "cefr_level": "A0", "occupation": "Estudiante primaria", "learning_goal": "estudio",   "email": "lucas.f@demo.hablah.app"},
    {"nombre": "Sofia",      "apellido": "Gomez",     "age_group": "teen",        "english_self_level": "survival",     "cefr_level": "A1", "occupation": "Estudiante primaria", "learning_goal": "estudio",   "email": "sofia.g@demo.hablah.app"},
    # Teens (13-17)
    {"nombre": "Valentina",  "apellido": "Lopez",     "age_group": "teen",        "english_self_level": "basic",        "cefr_level": "A2", "occupation": "Estudiante secundaria", "learning_goal": "estudio", "email": "vale.l@demo.hablah.app"},
    {"nombre": "Mateo",      "apellido": "Torres",    "age_group": "teen",        "english_self_level": "intermediate", "cefr_level": "B1", "occupation": "Estudiante secundaria", "learning_goal": "viajes",  "email": "mateo.t@demo.hablah.app"},
    # Young adults (18-30) tech
    {"nombre": "Agustina",   "apellido": "Ruiz",      "age_group": "young_adult", "english_self_level": "basic",        "cefr_level": "A2", "occupation": "Desarrolladora junior", "learning_goal": "trabajo", "email": "agus.r@demo.hablah.app"},
    {"nombre": "Facundo",    "apellido": "Herrera",   "age_group": "young_adult", "english_self_level": "intermediate", "cefr_level": "B1", "occupation": "Ingeniero de software", "learning_goal": "trabajo", "email": "facu.h@demo.hablah.app"},
    {"nombre": "Camila",     "apellido": "Moreno",    "age_group": "young_adult", "english_self_level": "upper",        "cefr_level": "B2", "occupation": "UX Designer",           "learning_goal": "trabajo", "email": "cami.m@demo.hablah.app"},
    {"nombre": "Nicolas",    "apellido": "Castro",    "age_group": "young_adult", "english_self_level": "advanced",     "cefr_level": "C1", "occupation": "Product Manager",       "learning_goal": "trabajo", "email": "nico.c@demo.hablah.app"},
    # Young adults no-tech
    {"nombre": "Florencia",  "apellido": "Vega",      "age_group": "young_adult", "english_self_level": "survival",     "cefr_level": "A1", "occupation": "Enfermera",             "learning_goal": "viajes",  "email": "flor.v@demo.hablah.app"},
    {"nombre": "Ignacio",    "apellido": "Blanco",    "age_group": "young_adult", "english_self_level": "zero",         "cefr_level": "A0", "occupation": "Músico independiente",  "learning_goal": "hobby",   "email": "igna.b@demo.hablah.app"},
    # Adults (30-60)
    {"nombre": "Marcela",    "apellido": "Perez",     "age_group": "adult",       "english_self_level": "basic",        "cefr_level": "A2", "occupation": "Contadora",             "learning_goal": "trabajo", "email": "marce.p@demo.hablah.app"},
    {"nombre": "Diego",      "apellido": "Sanchez",   "age_group": "adult",       "english_self_level": "intermediate", "cefr_level": "B1", "occupation": "Arquitecto",            "learning_goal": "viajes",  "email": "diego.s@demo.hablah.app"},
    {"nombre": "Natalia",    "apellido": "Gimenez",   "age_group": "adult",       "english_self_level": "upper",        "cefr_level": "B2", "occupation": "Abogada",               "learning_goal": "trabajo", "email": "nati.g@demo.hablah.app"},
    {"nombre": "Rodrigo",    "apellido": "Medina",    "age_group": "adult",       "english_self_level": "advanced",     "cefr_level": "C1", "occupation": "Médico",                "learning_goal": "estudio", "email": "rodri.m@demo.hablah.app"},
    {"nombre": "Gabriela",   "apellido": "Rojas",     "age_group": "adult",       "english_self_level": "near_native",  "cefr_level": "C2", "occupation": "Docente universitaria", "learning_goal": "trabajo", "email": "gaby.r@demo.hablah.app"},
    # Adults migración / emprendedores
    {"nombre": "Pablo",      "apellido": "Diaz",      "age_group": "adult",       "english_self_level": "survival",     "cefr_level": "A1", "occupation": "Gastronómico",          "learning_goal": "migracion","email": "pablo.d@demo.hablah.app"},
    {"nombre": "Carolina",   "apellido": "Nunez",     "age_group": "adult",       "english_self_level": "basic",        "cefr_level": "A2", "occupation": "Emprendedora e-commerce","learning_goal": "trabajo","email": "caro.n@demo.hablah.app"},
    # Seniors (60+)
    {"nombre": "Roberto",    "apellido": "Alvarez",   "age_group": "senior",      "english_self_level": "zero",         "cefr_level": "A0", "occupation": "Jubilado (ex gerente)", "learning_goal": "viajes",  "email": "roberto.a@demo.hablah.app"},
    {"nombre": "Susana",     "apellido": "Vargas",    "age_group": "senior",      "english_self_level": "survival",     "cefr_level": "A1", "occupation": "Jubilada (ama de casa)", "learning_goal": "viajes",  "email": "susana.v@demo.hablah.app"},
    {"nombre": "Eduardo",    "apellido": "Rios",      "age_group": "senior",      "english_self_level": "basic",        "cefr_level": "A2", "occupation": "Médico jubilado",       "learning_goal": "hobby",   "email": "eduardo.r@demo.hablah.app"},
]


async def main() -> None:
    pw_hash = pwd_ctx.hash("hablah123")
    created = 0
    async with AsyncSessionLocal() as db:
        for p in PROFILES:
            existing = (await db.execute(
                select(User).where(User.email == p["email"])
            )).scalar_one_or_none()
            if existing:
                print(f"  [skip] {p['email']}")
                continue
            user = User(
                email=p["email"],
                hashed_password=pw_hash,
                nombre=p["nombre"],
                apellido=p["apellido"],
                role="student",
                is_active=True,
                cefr_level=p["cefr_level"],
                target_language="en",
                base_language="es",
            )
            # Campos v16 (si existen en el modelo; setattr es seguro de todas formas)
            for field in ("age_group", "english_self_level", "learning_goal", "occupation"):
                setattr(user, field, p.get(field))
            setattr(user, "onboarding_done", 1)
            db.add(user)
            created += 1
            print(f"  [ok] {p['nombre']} {p['apellido']} · {p['age_group']} · {p['cefr_level']} · {p['learning_goal']}")
        await db.commit()

    print(f"\nOK — {created} perfiles creados (+ los que ya existían skipeados)")


if __name__ == "__main__":
    asyncio.run(main())
