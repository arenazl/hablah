"""AppConfig — configuración de runtime editable desde el back office (doc 11 §1.5).

Reglas de salida y seguridad como DATO, no como constantes: regla de voz (emojis
solo a pantalla), tolerancia de ASR, guarda de seguridad infantil y los umbrales
del validador determinista (máx. palabras por banda). La idea del doc: que el
engine las lea en vez de hardcodearlas. Tabla key-value tipada para una pantalla
de toggles/umbrales.
"""
from sqlalchemy import Column, String, Text

from core.database import Base


class AppConfig(Base):
    """Key-value de runtime.

    OJO con el mapeo: la tabla real tiene `config_key` / `config_value`, y sólo
    esas dos columnas. El modelo declaraba `key`, `value`, `kind`, `section`,
    `label` y `updated_at` — ninguna existía, así que cualquier `select(AppConfig)`
    reventaba con "Unknown column 'app_config.key'" y el motor terminaba
    componiendo con la config vacía.

    Se mantienen los nombres `key`/`value` del lado Python (es como lo consume
    todo el código) pero apuntando a las columnas reales. Los otros cuatro
    campos se sacaron: no existían en la tabla y no los usaba nadie.
    """

    __tablename__ = "app_config"

    key = Column("config_key", String(80), primary_key=True)
    value = Column("config_value", Text, nullable=False, default="")
