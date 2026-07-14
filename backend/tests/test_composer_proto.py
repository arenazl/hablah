import sys
import os
import unittest
from types import SimpleNamespace

# Add backend to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.composer_proto import compose_proto_prompt, MotorDataMissing

class TestComposerProto(unittest.TestCase):
    def test_compose_proto_prompt_success(self):
        # Mock User
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
            pinned_vocabulary=["book", "pencil"]
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
        
        # Mock App Config
        app_config = {
            "universal_conversation_rules": (
                "1. Keep the lesson structure invisible.\n"
                "2. Never repeat your own phrasing."
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
        self.assertIn("1. Keep the lesson structure invisible.", prompt) # Universal rules present
        
        # Verify placeholders were removed
        self.assertNotIn("{name}", prompt)
        self.assertNotIn("{topic}", prompt)

    def test_compose_proto_prompt_missing_data(self):
        # Should raise MotorDataMissing if critical data is missing
        user = SimpleNamespace(id=1, nombre="Lucas", age_group="junior", cefr_level="A2")
        # topic with no vocabulary
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
