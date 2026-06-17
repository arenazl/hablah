"""Catálogo de reglas del motor — la BIBLIOTECA precargada (no texto libre).

Cada fila = una regla reusable de alguna de las 9 capas. La orquestación NO escribe
texto: SELECCIONA reglas de acá por (banda, nivel, tópico) según el eje de cada una.
Fuente de verdad: Motor-Learning/catalogo_reglas_motor.xlsx (hoja "Reglas").

Ejes (de qué depende la regla):
  FIJO     → igual para todos.
  EDAD     → por banda: early_child | child | teen | adult.
  NIVEL    → por nivel A1..C1 (agnóstico de la edad).
  TÓPICO   → dato del tópico (qué tópico se ofrece se filtra por edad → bandas aptas).
  RUNTIME  → no es regla: dato vivo del alumno/sesión (esquema; lo llena la app).
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from core.database import Base


class Rule(Base):
    __tablename__ = "rules"

    id = Column(String(40), primary_key=True)                  # ID estable del catálogo (ej: GRD-EC-01)
    bloque = Column(String(40), nullable=False, index=True)    # capa destino: "6 behavioral_guards"
    categoria = Column(String(40), nullable=False)             # behavioral_guard | tutor_identity | safety | phase | trigger_template ...
    eje = Column(String(24), nullable=False, index=True)       # FIJO | EDAD | NIVEL | TÓPICO | EDAD+TÓPICO | RUNTIME
    aplica_a = Column(String(160), nullable=False)             # "todos" | "banda:early_child" | "nivel:A1" | "banda:teen,adult"
    regla = Column(Text, nullable=False)                       # el contenido de la regla
    origen = Column(String(20), nullable=True)                 # "seed v1" | "propuesto"
    editable = Column(Boolean, nullable=False, default=True)
    notas = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
