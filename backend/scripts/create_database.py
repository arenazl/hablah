"""Crea la base de datos en Aiven si no existe. Correr una sola vez al inicio."""
import sys
import os
import pymysql
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def main():
    host = os.getenv("DB_HOST")
    port = int(os.getenv("DB_PORT"))
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    db_name = os.getenv("DB_NAME")

    print(f"Conectando a {host}:{port} como {user}...")
    conn = pymysql.connect(host=host, port=port, user=user, password=password, ssl={"ssl": {}})
    cursor = conn.cursor()
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS {db_name} "
        f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    print(f"Database '{db_name}' creada (o ya existia).")
    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
