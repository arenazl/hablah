import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("SELECT id, title, keywords, pinned_vocabulary FROM topics WHERE is_active = 1")
            rows = cur.fetchall()
            print(f"Total tópicos activos: {len(rows)}")
            identical_words = set()
            import json
            for r in rows:
                raw_kw = r.get('keywords')
                raw_pv = r.get('pinned_vocabulary')
                kw = json.loads(raw_kw) if isinstance(raw_kw, str) and raw_kw.startswith('[') else ([raw_kw] if raw_kw else [])
                pv = json.loads(raw_pv) if isinstance(raw_pv, str) and raw_pv.startswith('[') else ([raw_pv] if raw_pv else [])
                words = (kw if isinstance(kw, list) else []) + (pv if isinstance(pv, list) else [])
                for w in words:
                    sw = str(w).strip().lower()
                    if sw in ["banana", "chocolate", "pasta", "radio", "hotel", "hospital", "mango", "cable", "sofa", "animal", "actor", "doctor", "piano", "tango", "cacao", "idea"]:
                        identical_words.add((r['id'], r['title'], sw))
            print("\nTópicos con palabras idénticas ES/EN encontradas:")
            for tid, title, w in sorted(identical_words):
                print(f"Topic #{tid} '{title}': '{w}'")
    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
