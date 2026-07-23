import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            updates = [
                ("vad_start_sensitivity_kid", "START_SENSITIVITY_HIGH"),
                ("vad_end_sensitivity_kid", "END_SENSITIVITY_LOW"),
                ("vad_prefix_padding_ms_kid", "700"),
                ("vad_silence_duration_ms_kid", "1500"),
                ("vad_activity_handling", "START_OF_ACTIVITY_INTERRUPTS"),
            ]
            for key, val in updates:
                cur.execute(
                    "INSERT INTO app_config (config_key, config_value) VALUES (%s, %s) "
                    "ON DUPLICATE KEY UPDATE config_value = %s",
                    (key, val, val)
                )
                print(f"Updated app_config: {key} = {val}")
        db.conn.commit()
        print("VAD app_config actualizado con éxito en MySQL.")
    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
