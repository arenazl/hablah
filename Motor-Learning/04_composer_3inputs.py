"""
Composer del Motor de Lenguaje Dinámico.

Toma 3 datos del alumno  ->  edad, nivel, intereses
y resuelve los 9 bloques del prompt distinguiendo:

  [E] Estatico  : hardcodeado, igual para todos
  [P] Preset    : elegido de un set cerrado segun edad/nivel
  [D] Dinamico  : datos concretos del alumno o la leccion

Genera 05_20_ejemplos.md con 20 casos variados.
En produccion, los presets y los temas vienen de la DB / archivos de config;
aca van inline para que el ejemplo sea autocontenido y ejecutable.
"""
import datetime

# ===========================================================================
#  PRESETS POR BANDA DE EDAD  -> [P]
# ===========================================================================

def age_band(age: int) -> str:
    if age <= 6:  return "early_child"
    if age <= 10: return "child"
    if age <= 17: return "teen"
    return "adult"

TUTOR_PRESETS = {  # Bloque 2 [P]
    "early_child": dict(name="Sparky",
        identity="Dragoncito espacial que viaja recolectando estrellas de energia.",
        tone="Alegre, exclamativo, paciente. Onomatopeyas espaciales y emojis (🚀⭐🦖)."),
    "child": dict(name="Nova",
        identity="Exploradora compañera de aventuras que arma misiones con el alumno.",
        tone="Entusiasta y curiosa. Festeja los logros, usa emojis con mesura."),
    "teen": dict(name="Coach Leo",
        identity="Coach de idiomas cercano, buena onda, sin disfraz infantil.",
        tone="Relajado y motivador. Lenguaje actual, sin sonar acartonado."),
    "adult": dict(name="Coach",
        identity="Tutor profesional de inglés enfocado en objetivos del alumno.",
        tone="Claro, profesional y cordial. Directo, sin infantilizar."),
}

PEDAGOGY_PRESETS = {  # Bloque 3 [P]
    "early_child": dict(method="Gamificacion inmersiva y andamiaje directo (scaffolding).",
        error="Nunca corregir de forma punitiva. Celebra el esfuerzo, repite la palabra correcta dentro de la historia y vuelve a pedir la repeticion.",
        grammar="0% gramatica explicita. Aprendizaje 100% implicito y sensorial."),
    "child": dict(method="Gamificacion con mini-retos y recompensas.",
        error="Correccion suave dentro del juego; reformula sin marcar el error.",
        grammar="Gramatica implicita; nada de metalenguaje."),
    "teen": dict(method="Enfoque comunicativo basado en temas de interes del alumno.",
        error="Correccion por recast natural; valida la idea antes de la forma.",
        grammar="Gramatica contextual ligera, solo cuando bloquea la comunicacion."),
    "adult": dict(method="Inmersion comunicativa orientada al objetivo (trabajo, viaje, etc.).",
        error="Recast y feedback breve; prioriza fluidez sobre perfeccion.",
        grammar="Explicaciones gramaticales solo a pedido o ante error recurrente."),
}

RIELS_PRESETS = {  # Bloque 6 [P] (base por banda; el nivel lo ajusta abajo)
    "early_child": [
        "PROHIBIDO hacer preguntas abiertas o comentarios libres en ingles.",
        "FLUJO OBLIGATORIO de 3 pasos: 1) 1 frase corta en ingles, 2) espejo inmediato en español, 3) orden de repetir 1 palabra clave.",
        "Maximo 30 palabras por turno. Si acierta la palabra, en el proximo turno pedir una frase de 2 palabras.",
    ],
    "child": [
        "Solo preguntas cerradas y simples en ingles (yes/no, esto o aquello).",
        "Frases de 2 a 4 palabras. Mantener el espejo en español tras cada frase nueva.",
        "Maximo 45 palabras por turno.",
    ],
    "teen": [
        "Preguntas abiertas simples permitidas; fomentar que produzca lenguaje.",
        "Reducir el español al minimo; usarlo solo para destrabar.",
        "Conectar siempre con sus intereses para sostener la motivacion.",
    ],
    "adult": [
        "Conversacion natural con preguntas abiertas.",
        "Correccion por recast, sin interrumpir el flujo.",
        "Adaptar el registro al objetivo del alumno (negocios, viaje, social).",
    ],
}

LEVEL_MOD = {  # ajuste de rieles segun nivel -> [P]
    "A1": "Nivel A1: espejo en español SIEMPRE activo. Vocabulario minimo. Maximo andamiaje.",
    "A2": "Nivel A2: espejo en español frecuente. Frases cortas y concretas.",
    "B1": "Nivel B1: español SOLO si se traba. Conversacion guiada.",
    "B2": "Nivel B2: sin español. Correccion por recast. Conversacion fluida.",
    "C1": "Nivel C1: sin español. Matices, idiomatico, se admite el debate.",
}

# ===========================================================================
#  TEMAS POR INTERES  -> alimentan B4/B7/B8  [D]
#  (data limpia; el FRAMING por banda lo pone el composer)
# ===========================================================================

THEMES = {
    "space_dino": dict(label="dinosaurios y cohetes", vocab=["Apple","Banana"],
        phrases=["Eat apple","Yellow banana"],
        kid="Aterrizan en un planeta donde un T-Rex bebe llora de hambre y bloquea el paso; hay que alimentarlo con frutas.",
        adult="Exploracion espacial: describir un planeta y su fauna."),
    "animals": dict(label="animales (gatos, unicornios)", vocab=["Cat","Dog"],
        phrases=["Big cat","Happy dog"],
        kid="Un zoo magico donde los animales perdieron su color y hay que nombrarlos para devolverselo.",
        adult="Documental: describir animales y habitats."),
    "soccer": dict(label="futbol", vocab=["Ball","Goal"],
        phrases=["Kick the ball","Score a goal"],
        kid="Un partido en la cancha de los robots; meter goles desbloquea jugadores.",
        adult="Analisis de un partido: tactica y resultados."),
    "princess_draw": dict(label="princesas y dibujar", vocab=["Crown","Star"],
        phrases=["Gold crown","Blue star"],
        kid="Un castillo donde hay que pintar los objetos diciendo su nombre para iluminarlo.",
        adult="Arte: describir colores y formas."),
    "videogames": dict(label="videojuegos (Minecraft)", vocab=["Block","Build"],
        phrases=["Build a house","Mine the block"],
        kid="Un mundo de bloques donde construir cosas nombrandolas en ingles da recursos.",
        adult="Diseño de juegos: explicar mecanicas."),
    "kpop": dict(label="K-pop y baile", vocab=["Dance","Stage"],
        phrases=["Dance on stage","Move your feet"],
        kid="Un escenario donde cada paso de baile se desbloquea diciendo la palabra.",
        adult="Industria musical: ensayo, escenario y performance."),
    "skate": dict(label="skate", vocab=["Ramp","Trick"],
        phrases=["Do a trick","Up the ramp"],
        kid="Un skatepark donde cada truco bien nombrado suma puntos.",
        adult="Deporte urbano: describir trucos y spots."),
    "horses": dict(label="equitacion y caballos", vocab=["Horse","Ride"],
        phrases=["Ride the horse","Brown horse"],
        kid="Un haras donde hay que cuidar al potrillo nombrando lo que necesita.",
        adult="Hipismo: rutina de cuidado y monta."),
    "esports": dict(label="esports (Fortnite)", vocab=["Win","Team"],
        phrases=["Join the team","We win"],
        kid="Una partida por equipos donde la comunicacion en ingles da ventaja.",
        adult="Esports: estrategia de equipo y comunicacion in-game."),
    "fantasy": dict(label="novelas de fantasia", vocab=["Quest","Dragon"],
        phrases=["Start the quest","An old dragon"],
        kid="Una biblioteca magica donde los libros cobran vida al leerlos.",
        adult="Literatura: comentar tramas y personajes de fantasia."),
    "climbing": dict(label="escalada", vocab=["Rope","Summit"],
        phrases=["Reach the summit","Hold the rope"],
        kid="Una montaña de cristal donde cada agarre se gana nombrandolo.",
        adult="Escalada: planificar una ruta, seguridad y cima."),
    "environment": dict(label="medio ambiente y activismo", vocab=["Recycle","Planet"],
        phrases=["Save the planet","Recycle plastic"],
        kid="Una isla que hay que limpiar nombrando lo que se recicla.",
        adult="Sostenibilidad: debatir cambio climatico y soluciones."),
    "coding": dict(label="programacion y tecnologia", vocab=["Code","Bug"],
        phrases=["Fix the bug","Write code"],
        kid="Un robot que se enciende escribiendo instrucciones simples.",
        adult="Tech: explicar un proyecto, debug y arquitectura en ingles."),
    "travel": dict(label="viajes y mochilear", vocab=["Map","Hostel"],
        phrases=["Read the map","Book a hostel"],
        kid="Un mapa magico que revela ciudades al nombrarlas.",
        adult="Viaje: aeropuerto, hostel, pedir indicaciones."),
    "cooking": dict(label="gastronomia y cocina", vocab=["Recipe","Knife"],
        phrases=["Follow the recipe","Chop the onion"],
        kid="Una cocina encantada donde cada ingrediente nombrado aparece.",
        adult="Cocina profesional: explicar una receta paso a paso."),
    "marketing": dict(label="marketing y negocios", vocab=["Brand","Launch"],
        phrases=["Launch the brand","Grow the market"],
        kid="(no aplica a esta banda)",
        adult="Business English: presentar una campaña y metricas."),
    "music_prod": dict(label="produccion musical / DJ", vocab=["Track","Mix"],
        phrases=["Mix the track","Drop the beat"],
        kid="Un estudio donde los sonidos aparecen al nombrarlos.",
        adult="Produccion: describir un set, mezcla y arreglos en ingles."),
    "gardening": dict(label="jardineria", vocab=["Plant","Water"],
        phrases=["Water the plant","Green leaf"],
        kid="Un jardin magico que florece al nombrar las plantas.",
        adult="Jardineria: cuidado de plantas y temporadas."),
    "finance": dict(label="finanzas e inversiones", vocab=["Invest","Risk"],
        phrases=["Manage the risk","Invest early"],
        kid="(no aplica a esta banda)",
        adult="Finanzas: hablar de inversiones, riesgo y mercados."),
    "art_museum": dict(label="viajes y arte (museos)", vocab=["Painting","Tour"],
        phrases=["Join the tour","An old painting"],
        kid="Un museo donde los cuadros hablan al nombrarlos.",
        adult="Arte y viajes: describir una visita guiada a un museo."),
}

# ===========================================================================
#  COMPOSER
# ===========================================================================

def get_runtime():  # Bloque 1 [E] (+ fecha [D])
    return dict(date=datetime.date.today().isoformat(),
                target="English", native="Spanish", device="Mobile (Voice Input)")

def focus_for(band, theme):  # Bloque 4 [D]
    if band in ("early_child", "child"):
        return f"Mision lúdica sobre {theme['label']}: {theme['kid']} Cada acierto da una recompensa."
    if band == "teen":
        return f"Charla guiada sobre {theme['label']}, conectada con lo que le gusta, para que produzca lenguaje."
    return f"Escenario comunicativo: {theme['adult']}"

def topic_for(band, level, theme):  # Bloque 7 [D]
    title = theme["kid"].split(";")[0] if band in ("early_child","child") else theme["adult"]
    if level in ("A1", "A2"):
        words, phr = theme["vocab"], theme["phrases"][:1]
    else:
        words, phr = theme["vocab"], theme["phrases"]
    return dict(title=title, words=words, phrases=phr)

def narrative_for(band, theme):  # Bloque 8 [D]
    if band in ("early_child", "child"):
        return dict(stage="Arrival", plot=theme["kid"])
    return dict(stage="Opening", plot=f"Escenario inicial sobre {theme['label']}. {theme['adult']}")

def trigger_for(band, name, topic):  # Bloque 9 [D]
    fw = topic["words"][0]
    if band in ("early_child", "child"):
        return (f"Saluda a {name} con mucha energia, presentate y mostrale el mundo de hoy. "
                f"Pedile que repita '{fw}'. Respeta el flujo de 3 pasos de los rieles.")
    if band == "teen":
        return (f"Saluda a {name} de forma relajada, proponé el tema y hacele una pregunta "
                f"simple y abierta usando '{fw}' para que arranque a hablar.")
    return (f"Saluda a {name} de forma profesional y planteá el escenario. "
            f"Invitalo a iniciar la conversacion en torno a '{fw}'.")

def compose(name, age, level, interests, theme_key):
    band = age_band(age)
    theme = THEMES[theme_key]
    rt = get_runtime()
    tutor = TUTOR_PRESETS[band]
    ped = PEDAGOGY_PRESETS[band]
    riels = RIELS_PRESETS[band] + [LEVEL_MOD[level]]
    focus = focus_for(band, theme)
    topic = topic_for(band, level, theme)
    spine = narrative_for(band, theme)
    trig = trigger_for(band, name, topic)

    blocks = []
    blocks.append(("1  [E]  Runtime",
        f"<system_context>\n  Date: {rt['date']}  | Target: {rt['target']} | Native: {rt['native']} | Device: {rt['device']}\n</system_context>"))
    blocks.append((f"2  [P]  Tutor   (banda: {band})",
        f"<tutor_profile>\n  Name: {tutor['name']} | Identity: {tutor['identity']}\n  Tone: {tutor['tone']}\n</tutor_profile>"))
    blocks.append((f"3  [P]  Pedagogia (banda: {band})",
        f"<pedagogical_rules>\n  Method: {ped['method']}\n  Error: {ped['error']}\n  Grammar: {ped['grammar']}\n</pedagogical_rules>"))
    blocks.append(("4  [D]  Enfoque",
        f"<session_focus>\n  {focus}\n</session_focus>"))
    blocks.append(("5  [D]  Alumno  <- los 3 inputs",
        f"<student_profile>\n  Name: {name} | Age: {age} | Level: {level}\n  Interests: {', '.join(interests)}\n</student_profile>"))
    blocks.append((f"6  [P]  Rieles  (banda: {band} + nivel: {level})",
        "<behavioral_guards>\n" + "\n".join(f"  - {r}" for r in riels) + "\n</behavioral_guards>"))
    blocks.append(("7  [D]  Topico",
        f"<current_topic>\n  Title: {topic['title']}\n  Words: {', '.join(topic['words'])} | Phrases: {', '.join(topic['phrases'])}\n</current_topic>"))
    blocks.append(("8  [D]  Narrativa",
        f"<story_spine>\n  Stage: {spine['stage']} | Plot: {spine['plot']}\n</story_spine>"))
    blocks.append(("9  [D]  Arranque",
        f"<trigger_execution>\n  {trig}\n</trigger_execution>"))
    return band, blocks

# ===========================================================================
#  20 PERSONAS VARIADAS  (edad / nivel / intereses)
# ===========================================================================

PERSONAS = [
    ("Timo",      5,  "A1", ["dinosaurios","cohetes"],          "space_dino"),
    ("Mia",       6,  "A1", ["gatos","unicornios"],             "animals"),
    ("Benja",     7,  "A2", ["futbol","Messi"],                 "soccer"),
    ("Lola",      8,  "A1", ["princesas","dibujar"],            "princess_draw"),
    ("Thiago",    9,  "A2", ["Minecraft","construir"],          "videogames"),
    ("Valentina", 10, "B1", ["K-pop","baile"],                  "kpop"),
    ("Bruno",     11, "A2", ["skate"],                          "skate"),
    ("Cata",      12, "B1", ["caballos","equitacion"],          "horses"),
    ("Lucas",     13, "A2", ["Fortnite","esports"],             "esports"),
    ("Martina",   14, "B2", ["novelas de fantasia","leer"],     "fantasy"),
    ("Nico",      15, "B1", ["escalada","montaña"],             "climbing"),
    ("Sofia",     16, "B2", ["medio ambiente","activismo"],     "environment"),
    ("Tomas",     17, "C1", ["programacion","tecnologia"],      "coding"),
    ("Florencia", 19, "A2", ["viajes","mochilear"],             "travel"),
    ("Diego",     24, "B1", ["cocina","gastronomia"],           "cooking"),
    ("Carolina",  28, "B2", ["marketing","negocios"],           "marketing"),
    ("Javier",    33, "B1", ["produccion musical","DJ"],        "music_prod"),
    ("Romina",    39, "A1", ["jardineria"],                     "gardening"),
    ("Gustavo",   47, "B2", ["finanzas","inversiones"],         "finance"),
    ("Elena",     58, "B1", ["viajes","arte","museos"],         "art_museum"),
]

# ===========================================================================
#  GENERA EL MARKDOWN
# ===========================================================================

def render():
    out = []
    out.append("# 20 ejemplos de implementacion — armado dinamico del prompt\n")
    out.append("Cada ejemplo parte de **3 inputs** (edad / nivel / intereses) y resuelve los 9 bloques.\n")
    out.append("Leyenda:  **[E]** Estatico · **[P]** Preset (segun edad/nivel) · **[D]** Dinamico (datos del alumno/leccion)\n")
    out.append("---\n")
    for i, (name, age, level, interests, theme_key) in enumerate(PERSONAS, 1):
        band, blocks = compose(name, age, level, interests, theme_key)
        out.append(f"## Ejemplo {i:02d} — {name}, {age} años · {level} · {THEMES[theme_key]['label']}\n")
        out.append(f"**Inputs:** edad `{age}` → banda `{band}` · nivel `{level}` · intereses `{', '.join(interests)}`\n")
        out.append("```xml")
        for header, body in blocks:
            out.append(f"# --- Bloque {header} ---")
            out.append(body)
        out.append("```\n")
        out.append("---\n")
    return "\n".join(out)

if __name__ == "__main__":
    md = render()
    with open("/mnt/user-data/outputs/05_20_ejemplos.md", "w", encoding="utf-8") as f:
        f.write(md)
    print("OK -> 05_20_ejemplos.md")
    print(f"{len(PERSONAS)} ejemplos generados.")
