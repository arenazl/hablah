import sys
import os
import unittest
from types import SimpleNamespace

# Add backend to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.composer_proto import compose_proto_prompt, MotorDataMissing

class TestComposerProto(unittest.TestCase):
    def test_compose_proto_prompt_success_bloque_b(self):
        # Mock User (Junior A2 -> Bloque B)
        user = SimpleNamespace(
            id=1,
            nombre="Lucas",
            age_group="junior",
            cefr_level="A2"
        )
        
        # Mock Topic
        topic = SimpleNamespace(
            id=101,
            title="La Escuela",
            pinned_vocabulary=["book", "pencil"],
            narrative_role="un maestro de escuela",
            narrative_setting="el aula de clases",
            narrative_conflict="encontrar la tiza perdida"
        )
        
        # Mock Student Type Data (Vínculo)
        student_type_data = {
            "slug": "junior",
            "tutor_mascot": "HABI",
            "tutor_identity": "Profe inspiradora, gamificadora y activa.",
            "tutor_tonal_rules": "Invisible Lesson: Todo es una misión o juego.",
            "form_rules": "Confidence First: Corregí exclusivamente mediante Recasting.",
            "pedagogy": "Lúdico con misión/narrativa",
            "session_focus": "Misión con objetivo claro.",
            "opening_seed": "Saludá a {name} con entusiasmo sobre {topic} y la palabra {first_vocab}.",
            "continuation_seed": "Avanzá la misión usando {expected_production}.",
            "closing_seed": "Al completar la tarea del día, festejá."
        }
        
        # Mock Level Data (Andamiaje)
        level_data = {
            "code": "A2",
            "vocab_depth": "basic",
            "language_rule": "Mitad español, mitad inglés.",
            "curriculum_grammar": "Pasado simple",
            "expected_production": (
                "El alumno debe producir una oración simple.\n"
                "Call_to_Action_Format: Finaliza SIEMPRE con una pregunta cerrada."
            )
        }
        
        # Mock App Config with all target rules to verify filtering & re-numbering
        app_config = {
            "universal_conversation_rules": (
                "1. Keep the lesson structure invisible.\n"
                "2. Never repeat your own phrasing.\n"
                "3. Build each turn.\n"
                "4. Make ONE conversational move.\n"
                "5. Correct language by recasting.\n"
                "9. Praise only what really happened.\n"
                "10. End every turn.\n"
                "12. Echo Protocol.\n"
                "13. Make it PERSONAL.\n"
                "14. Never claim to SEE.\n"
                "15. Harvest, don't chase.\n"
                "16. Correct native pronunciation."
            ),
            "universal_closing_rule": "La clase la cierra el adulto con el botón: NUNCA te despidas."
        }
        
        # Act
        prompt = compose_proto_prompt(
            user=user,
            topic=topic,
            student_type_data=student_type_data,
            level_data=level_data,
            app_config=app_config
        )
        
        # Assert
        self.assertIsInstance(prompt, str)
        self.assertIn("Lucas", prompt)  # Interpolated {name}
        self.assertIn("La Escuela", prompt)  # Interpolated {topic}
        self.assertIn("Finaliza SIEMPRE con una pregunta cerrada.", prompt) # Interpolated {expected_production}
        self.assertIn("Invisible Lesson: Todo es una misión o juego.", prompt) # Decoupled rules present
        self.assertIn("Confidence First: Corregí exclusivamente mediante Recasting.", prompt)
        
        # Verify placeholders were removed
        self.assertNotIn("{name}", prompt)
        self.assertNotIn("{topic}", prompt)

        # Verify JIT Bloque B filtering: target_ids = [1, 4, 5, 9, 10, 13, 14, 15, 16], re-indexed 1 to 9
        self.assertIn("1. Keep the lesson structure invisible.", prompt)
        self.assertIn("2. Make ONE conversational move.", prompt) # Originally 4
        self.assertIn("3. Correct language by recasting.", prompt) # Originally 5
        self.assertIn("4. Praise only what really happened.", prompt) # Originally 9
        self.assertIn("5. End every turn.", prompt) # Originally 10
        self.assertIn("6. Make it PERSONAL.", prompt) # Originally 13
        self.assertIn("7. Never claim to SEE.", prompt) # Originally 14
        self.assertIn("8. Harvest, don't chase.", prompt) # Originally 15
        self.assertIn("9. Correct native pronunciation.", prompt) # Originally 16
        # Rules 2, 3, 12 should NOT be in Bloque B output
        self.assertNotIn("Never repeat your own phrasing.", prompt)
        self.assertNotIn("Build each turn.", prompt)
        self.assertNotIn("Echo Protocol.", prompt)

    def test_compose_proto_prompt_bloque_a(self):
        # Mock User (Mini A0 -> Bloque A)
        user = SimpleNamespace(
            id=2,
            nombre="Timo",
            age_group="mini",
            cefr_level="A0"
        )
        topic = SimpleNamespace(
            id=102,
            title="Los Animales",
            pinned_vocabulary=["dog", "cat"],
            narrative_role="un explorador de la selva",
            narrative_setting="la selva tropical",
            narrative_conflict="buscar un tesoro escondido"
        )
        student_type_data = {
            "slug": "mini",
            "tutor_mascot": "Sparky",
            "tutor_identity": "Coach lúdico.",
            "tutor_tonal_rules": "Actitud entusiasta.",
            "form_rules": "No baby talk.",
            "pedagogy": "Juegos",
            "session_focus": "Aventura",
            "opening_seed": "Hola {name}!",
            "continuation_seed": "Busca el {first_vocab}.",
            "closing_seed": "Chao!"
        }
        level_data = {
            "code": "A0",
            "vocab_depth": "basic",
            "language_rule": "100% español.",
            "curriculum_grammar": "Sustantivos",
            "expected_production": "Repetir la frase-puente."
        }
        app_config = {
            "universal_conversation_rules": (
                "1. Keep the lesson structure invisible.\n"
                "2. Never repeat your own phrasing.\n"
                "3. Build each turn.\n"
                "4. Make ONE conversational move.\n"
                "5. Correct language by recasting.\n"
                "9. Praise only what really happened.\n"
                "10. End every turn.\n"
                "12. Echo Protocol.\n"
                "13. Make it PERSONAL.\n"
                "14. Never claim to SEE.\n"
                "15. Harvest, don't chase.\n"
                "16. Correct native pronunciation."
            ),
            "universal_closing_rule": "La clase la cierra el adulto con el botón."
        }

        # Act
        prompt = compose_proto_prompt(
            user=user,
            topic=topic,
            student_type_data=student_type_data,
            level_data=level_data,
            app_config=app_config
        )

        # Assert
        self.assertIsInstance(prompt, str)
        # Verify JIT Bloque A filtering: target_ids = [2, 3, 10, 12, 14, 16], re-indexed 1 to 6
        self.assertNotIn("Keep the lesson structure invisible.", prompt) # Rule 1 removed
        self.assertIn("1. Never repeat your own phrasing.", prompt) # Originally 2
        self.assertIn("2. Build each turn.", prompt) # Originally 3
        self.assertIn("3. End every turn.", prompt) # Originally 10
        self.assertIn("4. Echo Protocol.", prompt) # Originally 12
        self.assertIn("5. Never claim to SEE.", prompt) # Originally 14
        self.assertIn("6. Correct native pronunciation.", prompt) # Originally 16
        # Rules 4, 13, 15 should NOT be in Bloque A output
        self.assertNotIn("Make ONE conversational move.", prompt)
        self.assertNotIn("Make it PERSONAL.", prompt)
        self.assertNotIn("Harvest, don't chase.", prompt)

    def test_compose_proto_prompt_missing_data(self):
        # Should raise MotorDataMissing if critical data is missing
        user = SimpleNamespace(id=1, nombre="Lucas", age_group="junior", cefr_level="A2")
        topic = SimpleNamespace(id=101, title="La Escuela", pinned_vocabulary=[])
        
        with self.assertRaises(MotorDataMissing):
            compose_proto_prompt(
                user=user,
                topic=topic,
                student_type_data={"slug": "junior"},
                level_data={"vocab_depth": "basic"}
            )

if __name__ == "__main__":
    unittest.main()
