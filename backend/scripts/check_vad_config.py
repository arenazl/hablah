import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("SELECT config_key, config_value FROM app_config")
            rows = cur.fetchall()
            print("=== APP_CONFIG ===")
            for r in rows:
                print(f"{r.get('config_key')} = {r.get('config_value')}")
    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
