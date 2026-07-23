import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            # Topic #142: Comidas ricas -> reemplazar banana por cheese
            cur.execute("SELECT keywords FROM topics WHERE id = 142")
            row = cur.fetchone()
            if row:
                kw = json.loads(row['keywords']) if isinstance(row['keywords'], str) else row['keywords']
                kw = [w if w != 'banana' else 'cheese' for w in kw]
                cur.execute("UPDATE topics SET keywords = %s WHERE id = 142", (json.dumps(kw),))
                print("Topic #142 actualizado:", kw)

            # Topic #146: Comida divertida -> reemplazar chocolate por donut
            cur.execute("SELECT keywords FROM topics WHERE id = 146")
            row = cur.fetchone()
            if row:
                kw = json.loads(row['keywords']) if isinstance(row['keywords'], str) else row['keywords']
                kw = [w if w != 'chocolate' else 'donut' for w in kw]
                cur.execute("UPDATE topics SET keywords = %s WHERE id = 146", (json.dumps(kw),))
                print("Topic #146 actualizado:", kw)

            # Topic #139: Animales de la granja y la selva -> reemplazar animal por tiger
            cur.execute("SELECT keywords FROM topics WHERE id = 139")
            row = cur.fetchone()
            if row:
                kw = json.loads(row['keywords']) if isinstance(row['keywords'], str) else row['keywords']
                kw = [w if w != 'animal' else 'tiger' for w in kw]
                cur.execute("UPDATE topics SET keywords = %s WHERE id = 139", (json.dumps(kw),))
                print("Topic #139 actualizado:", kw)

        db.conn.commit()
        print("Tópicos limpiados de palabras idénticas ES/EN con éxito.")
    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
