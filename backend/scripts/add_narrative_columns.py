import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.motor_engine import _connect

def main():
    db = _connect()
    try:
        # Verificar qué columnas existen
        cols_query = db.q("SHOW COLUMNS FROM topics")
        col_names = [c["Field"] for c in cols_query]
        
        print("Existing columns:", col_names)
        
        # Columnas a agregar
        to_add = {
            "narrative_setting": "TEXT NULL",
            "narrative_conflict": "TEXT NULL",
            "narrative_role": "TEXT NULL"
        }
        
        for col, col_type in to_add.items():
            if col not in col_names:
                print(f"Adding column '{col}'...")
                db.conn.ping(reconnect=True)
                with db.conn.cursor() as cur:
                    cur.execute(f"ALTER TABLE topics ADD COLUMN `{col}` {col_type}")
                db.conn.commit()
                print(f"Column '{col}' added successfully.")
            else:
                print(f"Column '{col}' already exists.")
                
        print("Database schema update finished successfully.")
    finally:
        db.conn.close()

if __name__ == "__main__":
    main()
