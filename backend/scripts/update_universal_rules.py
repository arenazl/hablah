import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    db = _connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("SELECT config_value FROM app_config WHERE config_key = 'universal_conversation_rules'")
            row = cur.fetchone()
            if not row or not row.get('config_value'):
                print("No se encontró universal_conversation_rules")
                return

            rules_text = row['config_value']
            # Reemplazar la regla 12 rígida por la versión agnóstica que respeta la Expected_Production del nivel
            old_pattern = 'give a direct and simple command in the native language (e.g., "Decí conmigo: {word}"), and wait in silence.'
            new_pattern = 'invite production following the level\'s Expected_Production format (e.g., bridge-phrase for A0 or target word for higher levels), and wait in silence.'

            if old_pattern in rules_text:
                updated_text = rules_text.replace(old_pattern, new_pattern)
            else:
                # Si varía la puntuación, hacemos un reemplazo más amplio sobre la regla 12
                import re
                updated_text = re.sub(
                    r'12\.\s*To make the student PRODUCE.*?(?=13\.|\Z)',
                    '12. To make the student PRODUCE (Echo Protocol / Wait & Scaffold): plant the target in the story, invite production following the level\'s Expected_Production format (e.g., bridge-phrase for A0 or target word for higher levels), and wait in silence. Never leave the sentence open or incomplete for them to finish. If they stay silent, scaffold: repeat the key word or phrase slowly and wait again.\n',
                    rules_text,
                    flags=re.DOTALL
                )

            cur.execute(
                "UPDATE app_config SET config_value = %s WHERE config_key = 'universal_conversation_rules'",
                (updated_text,)
            )
            db.conn.commit()
            print("universal_conversation_rules actualizado en MySQL con la regla agnóstica.")

    finally:
        db.conn.close()

if __name__ == '__main__':
    main()
