import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            tables = [list(r.values())[0] for r in cur.fetchall()]

            if "sessions" in tables:
                print("\n=================== LATEST SESSIONS ===================")
                cur.execute("SELECT id, topic_id, transcript FROM sessions ORDER BY id DESC LIMIT 5")
                sessions = cur.fetchall()
                for s in sessions:
                    print(f"\n--- SESSION ID: {s.get('id')} | Topic: {s.get('topic_id')} ---")
                    raw = s.get('transcript')
                    if raw:
                        try:
                            tr = json.loads(raw) if isinstance(raw, str) else raw
                            if isinstance(tr, list):
                                for turn in tr:
                                    who = turn.get('who') or turn.get('role') or 'speaker'
                                    text = turn.get('text') or turn.get('content') or turn.get('message')
                                    print(f"  [{who}] {text}")
                            else:
                                print(tr)
                        except Exception as e:
                            print("Raw transcript:", raw)
                    else:
                        print("(No transcript content)")

            if "finaltest_class" in tables:
                print("\n=================== LATEST FINALTEST_CLASS ===================")
                cur.execute("SELECT id, band_code, level_code, topic_title, transcript FROM finaltest_class ORDER BY id DESC LIMIT 5")
                for row in cur.fetchall():
                    print(f"\n--- FINALTEST CLASS {row.get('id')} | {row.get('band_code')} x {row.get('level_code')} | {row.get('topic_title')} ---")
                    raw = row.get('transcript')
                    if raw:
                        try:
                            tr = json.loads(raw) if isinstance(raw, str) else raw
                            if isinstance(tr, list):
                                for turn in tr:
                                    who = turn.get('who') or turn.get('role') or 'speaker'
                                    text = turn.get('text') or turn.get('content') or turn.get('message')
                                    print(f"  [{who}] {text}")
                            else:
                                print(tr)
                        except Exception as e:
                            print("Raw transcript:", raw)

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()

