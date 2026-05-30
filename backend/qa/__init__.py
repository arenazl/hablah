"""QA harness para Hablah.

Suite de tests sinteticos que simulan a un alumno (texto, no audio) hablando
con el coach a traves del mismo /api/voice/ws de produccion. Captura el
transcript completo, mide latencias y errores, y le pasa la conversacion a
Gemini Flash para que la evalue contra las reglas del super_prompt.

Componentes:
- personas: profiles de alumno (A1, B1, C1, kid, distraido, etc.)
- scenarios: combinaciones topic x persona x n_turns
- runner: ejecuta una conversacion via WebSocket
- scorer: evalua calidad con LLM
- runner CLI: scripts/qa_run.py

Pensado para correrse contra prod (hablah-api en Cloud Run) o local.
"""
