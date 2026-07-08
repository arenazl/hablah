# Resultados del especialista — banco multi-LLM v3

coach = Gemini (prod) · alumno = modelo Ollama (uno por perfil) · juez = Claude (SLA)  
Score por clase con historia creciente: **0 → 1 → 2 → 3** historias.

| Banda | Nivel | Alumno (modelo) | Tópico | h0 | h1 | h2 | h3 |
|---|---|---|---|----|----|----|----|
| early_child | A1 | gpt-oss:120b | Mi familia | 6.5 | 3 | 3 | 3 |

## Veredictos por clase

### early_child A1 · Mi familia · alumno `gpt-oss:120b`
- **Clase 1** (historia 0obj/0it) — score **6.5**: Filtro afectivo excelente, pero reciclado débil (family/mom/dad sin conectar). Recast limitado a una vez; input muy corto sin extensión comprensible ni procesamiento profundo.
- **Clase 2** (historia 3obj/8it) — score **3**: TPR robótico sin recast. Alumno trae conexión emocional (mamá bonita, papá grande) y clase la ignora. Cero naturalidad, filtro afectivo muerto.
- **Clase 3** (historia 4obj/12it) — score **3**: Carrusel mecánico sin negociación: input i+1 bueno, pero secuencia idéntica 4 veces mata la asimetría. Recast nulo (ignora la mezcla español/inglés); feedback hipergenérico cero grip pedagógico.
- **Clase 4** (historia 4obj/17it) — score **3**: Celebración superficial sin abordar code-switching (mi/my, familia/family). Repetición sin contexto real ni comprensión: alumno no sabe qué significa 'This is', solo imita fonemas. Falta reciclaje previo y preguntas que creen genuina need-for-output.
