"""Seed v3 · catálogo de tópicos del MOTOR (motor_v3.sql).

10 categorías × 6 subcategorías × 10 tópicos = 600 tópicos (título + objetivo),
+ bandas de edad sugeridas por categoría (topic_suggested_band).

CONTENIDO GENERADO para curar en el editor — no son "datos reales", son temas
conversacionales propuestos. El léxico por nivel va en una tanda aparte.

Idempotente: get-or-create por nombre/título (no duplica si se corre dos veces).
Conecta a la misma BD que el motor (pymysql + SSL a Aiven, vía core.config.settings).
Correr:  cd backend && python scripts/seed_v3_topics.py
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

# ── verbo pedagógico + bandas sugeridas por categoría ──
# bandas: 1=early_child(0-6) 2=child(7-10) 3=teen(11-17) 4=adult(18+)
CAT_META = {
    "Espacio y ciencia":          ("Explicar y conversar sobre",   [1, 2, 3, 4]),
    "Naturaleza":                 ("Describir y conversar sobre",  [1, 2, 3, 4]),
    "Deportes":                   ("Contar y opinar sobre",        [2, 3, 4]),
    "Cultura y entretenimiento":  ("Opinar y recomendar sobre",    [2, 3, 4]),
    "Tecnología":                 ("Explicar y debatir sobre",     [2, 3, 4]),
    "Comida y bebida":            ("Describir y recomendar sobre",  [2, 3, 4]),
    "Viajes y lugares":           ("Contar y describir sobre",     [3, 4]),
    "Vida cotidiana":             ("Conversar sobre",              [1, 2, 3, 4]),
    "Trabajo y negocios":         ("Conversar y argumentar sobre", [4]),
    "Salud y bienestar":          ("Conversar y aconsejar sobre",  [3, 4]),
}

# ── taxonomía: categoría -> subcategoría -> 10 tópicos ──
TAX: dict[str, dict[str, list[str]]] = {
    "Espacio y ciencia": {
        "Astronomía": ["Los planetas del sistema solar", "Las fases de la Luna", "Estrellas y constelaciones", "Agujeros negros", "El Sol y la luz", "Cometas y meteoritos", "Galaxias y la Vía Láctea", "¿Hay vida en otros planetas?", "Eclipses de sol y luna", "Telescopios: cómo miramos el cielo"],
        "Prehistoria": ["Los dinosaurios más grandes", "La extinción de los dinosaurios", "Fósiles y cómo se forman", "El hombre de las cavernas", "Mamuts y la era de hielo", "Los primeros animales", "La evolución del ser humano", "Herramientas de piedra", "El fuego y los primeros humanos", "Pinturas rupestres"],
        "Física y química": ["Por qué flotan los barcos", "La gravedad explicada simple", "Los estados del agua", "Imanes y magnetismo", "La electricidad en casa", "La luz y los colores", "El sonido y cómo viaja", "Reacciones químicas cotidianas", "La energía y sus formas", "Cómo funciona una pila"],
        "Genética y evolución": ["Por qué nos parecemos a nuestros padres", "El ADN explicado fácil", "La selección natural", "Especies en peligro", "Cómo se adaptan los animales", "Clonación: ¿qué es?", "Las mutaciones", "El árbol de la vida", "Darwin y su viaje", "Genética y enfermedades"],
        "Inventos": ["La rueda y por qué cambió todo", "La imprenta", "El teléfono", "Edison, Tesla y la electricidad", "Internet: cómo nació", "La penicilina", "El primer avión", "La cámara de fotos", "Inventos argentinos", "Inventos que fallaron"],
        "Exploración espacial": ["La llegada a la Luna", "La Estación Espacial Internacional", "Misiones a Marte", "El día a día de un astronauta", "Cohetes: cómo despegan", "Satélites y para qué sirven", "El telescopio James Webb", "Turismo espacial", "Las sondas Voyager", "¿Colonizaremos otro planeta?"],
    },
    "Naturaleza": {
        "Océanos": ["Los animales del océano", "Las ballenas", "Los tiburones", "Arrecifes de coral", "Las profundidades del mar", "Mareas y olas", "Pulpos y criaturas raras", "La contaminación del mar", "Pingüinos y vida polar", "Tortugas marinas"],
        "Volcanes y geología": ["Cómo erupciona un volcán", "Los terremotos", "Las montañas más altas", "Cuevas y cavernas", "Minerales y piedras preciosas", "El ciclo de las rocas", "Géiseres y aguas termales", "Los tsunamis", "La deriva continental", "Volcanes famosos del mundo"],
        "Botánica": ["Cómo crece una planta", "Los árboles más viejos", "Flores y polinización", "Plantas carnívoras", "Las semillas y cómo viajan", "Cactus y desierto", "Árboles frutales", "La fotosíntesis explicada", "Plantas medicinales", "Tener un huerto en casa"],
        "Animales salvajes": ["Los leones y la sabana", "Los elefantes", "Lobos y manadas", "Los osos", "Reptiles y serpientes", "Aves migratorias", "Animales nocturnos", "Insectos increíbles", "Animales en peligro de extinción", "El camuflaje animal"],
        "Bosques y selvas": ["La selva amazónica", "Los animales de la selva", "Bosques de montaña", "Incendios forestales", "Por qué importan los árboles", "Hongos y musgos", "La vida en las copas", "Pueblos que viven en la selva", "Bosques bajo el agua", "Reforestar el planeta"],
        "Clima y fenómenos": ["Cómo se forma la lluvia", "Tormentas y rayos", "Tornados y huracanes", "El arcoíris", "La nieve y el granizo", "Las estaciones del año", "El calentamiento global", "Sequías e inundaciones", "Auroras boreales", "El viento y de dónde viene"],
    },
    "Deportes": {
        "Fútbol": ["Un partido inolvidable", "Los Mundiales", "Mi equipo favorito", "Las reglas del fútbol", "Jugadores legendarios", "Tácticas y formaciones", "El fútbol femenino", "La final que cambió todo", "Hinchadas y pasión", "Fútbol de potrero"],
        "Básquet": ["La NBA y sus estrellas", "Cómo se juega al básquet", "Jordan vs LeBron", "El básquet olímpico", "Tiros y jugadas", "Equipos históricos", "El básquet callejero", "¿La altura importa?", "El entrenamiento de un jugador", "Finales épicas"],
        "Tenis": ["Los torneos Grand Slam", "Federer, Nadal y Djokovic", "Cómo se puntúa en tenis", "El saque perfecto", "Tierra vs césped", "Rivalidades históricas", "El tenis femenino", "Wimbledon y sus tradiciones", "Raquetas y tecnología", "Mi primer partido"],
        "Aire libre": ["Escalada en roca", "Senderismo en la montaña", "Acampar bajo las estrellas", "Surf y olas", "Ciclismo de montaña", "Kayak y ríos", "Escalar una cumbre", "Equipo para la aventura", "Supervivencia básica", "Deportes de invierno"],
        "Automovilismo": ["La Fórmula 1", "Las paradas en boxes", "Pilotos legendarios", "El Rally Dakar", "Un auto de carrera por dentro", "Circuitos famosos", "La seguridad en las carreras", "El MotoGP", "Autos eléctricos en competencia", "Una carrera bajo la lluvia"],
        "Running y fitness": ["Entrenar para una maratón", "Rutinas de gimnasio", "Correr por la ciudad", "La alimentación del deportista", "Yoga y flexibilidad", "Levantar pesas", "Lesiones y cómo evitarlas", "Los beneficios del ejercicio", "Qué es el crossfit", "Mi rutina semanal"],
    },
    "Cultura y entretenimiento": {
        "Música": ["Mi banda favorita", "El rock clásico", "Aprender un instrumento", "Festivales de música", "La música electrónica", "Conciertos inolvidables", "Cómo se hace una canción", "El jazz y el blues", "La música de mi país", "Letras que marcan"],
        "Cine": ["Mi película favorita", "El cine de superhéroes", "Directores legendarios", "Cómo se hace una película", "El cine de terror", "Películas que te hacen pensar", "Los premios Oscar", "Los efectos especiales", "El cine argentino", "Una escena inolvidable"],
        "Series y TV": ["Series para maratonear", "Un final que decepcionó", "Las mejores comedias", "Series de misterio", "El streaming cambió todo", "Personajes inolvidables", "Series basadas en libros", "Documentales que enseñan", "La televisión de antes", "Mi serie del momento"],
        "Videojuegos": ["Mi videojuego favorito", "Indie vs AAA", "Los esports", "Cómo se hace un videojuego", "Juegos de mi infancia", "Mundos abiertos", "Jugar en línea con amigos", "La historia de Mario", "La realidad virtual", "¿Los videojuegos son arte?"],
        "Stand-up": ["Comediantes que me hacen reír", "Qué hace gracioso a un chiste", "El stand-up en vivo", "La improvisación", "El humor de cada país", "Especiales de comedia", "Reírse de uno mismo", "El humor negro", "Hacer reír a una multitud", "Mi chiste favorito"],
        "Arte y museos": ["Pintores famosos", "Visitar un museo", "El arte callejero", "La Mona Lisa y su misterio", "La escultura", "El arte moderno", "Cómo mirar un cuadro", "La fotografía como arte", "El arte de mi ciudad", "Museos del mundo"],
    },
    "Tecnología": {
        "Robótica": ["Cómo funcionan los robots", "Robots en las fábricas", "Robots que ayudan en casa", "Sensores y movimiento", "Robots exploradores", "Los drones", "¿Los robots nos reemplazan?", "Robots humanoides", "Construir tu propio robot", "Robots en la medicina"],
        "Inteligencia artificial": ["Qué es la inteligencia artificial", "ChatGPT y los asistentes", "La IA en el día a día", "¿La IA puede ser creativa?", "Los riesgos de la IA", "La IA y el trabajo", "Autos que se manejan solos", "Reconocer imágenes con IA", "La ética de la IA", "El futuro con IA"],
        "Programación": ["Qué es programar", "Mi primer programa", "Los lenguajes de programación", "Cómo funciona una app", "Videojuegos y código", "La web por dentro", "Bases de datos simples", "Aprender a programar de grande", "Errores y cómo arreglarlos", "Mujeres en la programación"],
        "Gadgets": ["El celular ideal", "Auriculares y sonido", "Relojes inteligentes", "La cámara del teléfono", "Tablet vs laptop", "Cargadores y baterías", "Gadgets para la casa", "Lo último en tecnología", "Gadgets inútiles pero divertidos", "¿Vale el último modelo?"],
        "Redes sociales": ["La vida en redes", "Los influencers", "Memes y cultura de internet", "¿Las redes nos aíslan?", "Privacidad en línea", "TikTok y los videos cortos", "Hacer crecer una cuenta", "Las noticias falsas", "El detox digital", "Las redes de antes"],
        "Ciberseguridad": ["Contraseñas seguras", "Quiénes son los hackers", "Estafas por internet", "Proteger tus datos", "Qué es el phishing", "Virus y antivirus", "Comprar seguro en línea", "Por qué importa la privacidad", "El robo de identidad", "Navegar con cuidado"],
    },
    "Comida y bebida": {
        "Recetas del mundo": ["La comida italiana", "Tacos y comida mexicana", "El sushi japonés", "La cocina india y sus especias", "La comida china", "Platos de Medio Oriente", "La comida tailandesa", "Cocina mediterránea", "Comida callejera del mundo", "Mi plato típico favorito"],
        "Repostería": ["Hacer una torta", "Galletas caseras", "El chocolate", "Postres famosos", "Decorar tortas", "Pan casero", "Helados artesanales", "Repostería sin azúcar", "Un postre de la abuela", "Programas de repostería"],
        "Café y bebidas": ["El café de especialidad", "Cómo preparar un buen café", "El té y sus variedades", "Jugos y smoothies", "El mate argentino", "Bebidas de verano", "La historia del café", "Cafeterías que me gustan", "Café vs té", "Bebidas sin alcohol"],
        "Cocina saludable": ["Comer sano sin aburrirse", "Ensaladas ricas", "Desayunos nutritivos", "Comida vegetariana", "Meal prep para la semana", "Snacks saludables", "Cocinar con pocas calorías", "Proteínas vegetales", "Mitos de la comida sana", "Comer sano con poco dinero"],
        "Asado y parrilla": ["El asado argentino", "Cómo encender el fuego", "Los cortes de carne", "El chimichurri", "Asado para vegetarianos", "La parrilla perfecta", "Un domingo de asado", "Los acompañamientos", "El asado en otros países", "Trucos del parrillero"],
        "Comida callejera": ["La mejor comida callejera", "Las hamburguesas", "Pizza al paso", "Las empanadas", "Los food trucks", "Comida de feria", "Snacks de cada país", "Comer rico y barato", "Mi puesto favorito", "Comida callejera saludable"],
    },
    "Viajes y lugares": {
        "Ciudades": ["Mi ciudad favorita", "Nueva York", "París y sus encantos", "Tokio", "Ciudades para caminar", "Ciudades baratas para viajar", "La ciudad de mis sueños", "La vida nocturna", "Ciudades históricas", "Perderse en una ciudad nueva"],
        "Aeropuertos y vuelos": ["Mi primer vuelo", "Sobrevivir a una escala", "El miedo a volar", "Hacer la valija", "Aeropuertos enormes", "Demoras y cancelaciones", "Los vuelos largos", "Turista vs primera clase", "Anécdotas de aeropuerto", "Volar barato"],
        "Mochileros": ["Viajar con mochila", "Viajar solo", "Hostels y conocer gente", "Viajar con poco dinero", "Rutas por Sudamérica", "El sudeste asiático", "Trabajar mientras viajás", "Lo que aprendés viajando", "Imprevistos en el camino", "Mi viaje soñado"],
        "Playas y montañas": ["La playa perfecta", "Montañas para escalar", "Islas paradisíacas", "Acampar en la naturaleza", "Deportes de playa", "Pueblos de montaña", "Atardeceres inolvidables", "¿Playa o montaña?", "Lagos y cascadas", "El mar en invierno"],
        "Cultura local": ["Festivales del mundo", "Costumbres que sorprenden", "Probar comida local", "Aprender el idioma del lugar", "Mercados tradicionales", "Los días festivos", "Etiqueta en otros países", "Música y baile típicos", "El choque cultural", "Lo que extrañás de casa"],
        "Hoteles": ["El hotel ideal", "Airbnb vs hotel", "Hoteles de lujo", "Reservar barato", "Anécdotas de hospedaje", "Hoteles raros del mundo", "El desayuno del hotel", "Camping vs hotel", "Quejas y reclamos", "Hospedarse con locales"],
    },
    "Vida cotidiana": {
        "Rutinas": ["Mi rutina de la mañana", "Un día típico", "¿Madrugar o trasnochar?", "La rutina del fin de semana", "Hábitos buenos y malos", "Organizar el día", "La rutina después del trabajo", "Cambiar de rutina", "La rutina de los chicos", "Tiempo para uno mismo"],
        "La casa": ["Mi habitación", "Ordenar y limpiar", "Mudarse de casa", "La casa de mis sueños", "Decorar el hogar", "Las tareas de la casa", "Vivir solo", "Compartir departamento", "Plantas en casa", "Arreglos y reparaciones"],
        "Compras": ["Ir al supermercado", "Comprar ropa", "Compras en línea", "Regatear precios", "Comprar por impulso", "Las listas de compras", "El centro comercial", "Comprar usado", "Ofertas y descuentos", "Devolver un producto"],
        "Transporte y ciudad": ["El transporte público", "Andar en bici por la ciudad", "El tráfico", "Manejar en la ciudad", "Llegar tarde", "Apps de transporte", "Caminar la ciudad", "El subte y el colectivo", "Sacar el registro", "Ciudades sin auto"],
        "Estaciones": ["El verano y el calor", "El invierno y el frío", "La primavera", "El otoño", "Mi estación favorita", "Ropa para cada clima", "Días de lluvia", "Las vacaciones de verano", "El cambio de hora", "Actividades por estación"],
        "Familia y amigos": ["Mi familia", "Cenas familiares", "Reencuentros con amigos", "Las mejores amistades", "Discutir y reconciliarse", "Los cumpleaños", "Vivir lejos de la familia", "Hacer amigos de grande", "Tradiciones familiares", "Mascotas en la familia"],
    },
    "Trabajo y negocios": {
        "Entrevistas": ["Una entrevista de trabajo", "Hablar de tus fortalezas", "El currículum perfecto", "Preguntas difíciles", "Cómo vestirse", "Los nervios de la entrevista", "Negociar el sueldo", "Entrevistas en inglés", "Errores comunes", "El primer día de trabajo"],
        "Reuniones": ["Una reunión de trabajo", "Hacer una presentación", "Hablar en público", "Reuniones por videollamada", "Reuniones que sobran", "Dar tu opinión", "Estar en desacuerdo con respeto", "Tomar notas", "Liderar una reunión", "Reuniones efectivas"],
        "Emprender": ["Tener una idea de negocio", "Empezar un emprendimiento", "El primer cliente", "Fracasar y volver a empezar", "Buscar inversión", "Trabajar en equipo", "Marketing para emprendedores", "Una startup famosa", "Vender tu producto", "El miedo a emprender"],
        "Finanzas personales": ["Ahorrar dinero", "Hacer un presupuesto", "Invertir para principiantes", "Gastar con cabeza", "El primer sueldo", "Las tarjetas de crédito", "Ahorrar para un viaje", "Salir de deudas", "El dinero y la felicidad", "Educación financiera"],
        "Oficina": ["La vida de oficina", "Los compañeros de trabajo", "El jefe ideal", "El café de la oficina", "Trabajar bajo presión", "Home office vs oficina", "Conflictos laborales", "El almuerzo en el trabajo", "Los ascensos", "Renunciar a un trabajo"],
        "Trabajo remoto": ["Trabajar desde casa", "Ser nómade digital", "Organizar el día sin jefe", "Reuniones por Zoom", "Distracciones en casa", "Trabajar desde otro país", "Los coworkings", "El equilibrio vida-trabajo", "Las zonas horarias", "Pros y contras del remoto"],
    },
    "Salud y bienestar": {
        "Ejercicio": ["Empezar a entrenar", "El mejor ejercicio para vos", "Hacer deporte en casa", "Caminar todos los días", "Estirar y la flexibilidad", "Ejercicio y energía", "Ir al gimnasio", "Deporte en grupo", "Ponerse en forma", "Excusas para no entrenar"],
        "Nutrición": ["Comer balanceado", "Mitos de las dietas", "Las proteínas", "Azúcar y ultraprocesados", "El ayuno intermitente", "Comer según la edad", "Vitaminas y suplementos", "Beber agua", "Comer con ansiedad", "Cambiar hábitos alimenticios"],
        "Salud mental": ["El estrés del día a día", "La ansiedad", "Pedir ayuda", "Hablar de las emociones", "El burnout", "Dormir bien y la mente", "Las redes y la autoestima", "Tomarse un descanso", "La terapia", "Cuidar la salud mental"],
        "En el médico": ["Una visita al médico", "Describir un síntoma", "En la farmacia", "El dentista", "Las vacunas", "La sala de espera", "Hablar con el médico en inglés", "Una emergencia", "Chequeos anuales", "Remedios caseros"],
        "Sueño": ["Dormir bien", "El insomnio", "¿Cuántas horas dormir?", "Los sueños", "Madrugar", "La siesta", "Pantallas antes de dormir", "Trastornos del sueño", "Dormir en viajes", "La rutina antes de dormir"],
        "Mindfulness": ["Meditar por primera vez", "La respiración", "Vivir el presente", "Mindfulness en el trabajo", "El silencio", "Apps de meditación", "Calmar la mente", "Gratitud diaria", "El yoga y la mente", "Desconectar del celular"],
    },
}


def _connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME,
        ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def main() -> None:
    conn = _connect()
    cur = conn.cursor()
    stats = {"cat": 0, "sub": 0, "topic": 0, "band": 0, "skip": 0}

    def get_or_create_cat(name: str) -> int:
        cur.execute("SELECT category_id FROM category WHERE name=%s", (name,))
        r = cur.fetchone()
        if r:
            return r["category_id"]
        cur.execute("INSERT INTO category (name) VALUES (%s)", (name,))
        stats["cat"] += 1
        return cur.lastrowid

    def get_or_create_sub(cat_id: int, name: str) -> int:
        cur.execute("SELECT subcategory_id FROM subcategory WHERE category_id=%s AND name=%s", (cat_id, name))
        r = cur.fetchone()
        if r:
            return r["subcategory_id"]
        cur.execute("INSERT INTO subcategory (category_id, name) VALUES (%s,%s)", (cat_id, name))
        stats["sub"] += 1
        return cur.lastrowid

    def get_or_create_topic(sub_id: int, title: str, objective: str) -> int:
        cur.execute("SELECT topic_id FROM topic WHERE subcategory_id=%s AND title=%s", (sub_id, title))
        r = cur.fetchone()
        if r:
            stats["skip"] += 1
            return r["topic_id"]
        cur.execute("INSERT INTO topic (subcategory_id, title, objective) VALUES (%s,%s,%s)",
                    (sub_id, title, objective[:200]))
        stats["topic"] += 1
        return cur.lastrowid

    for cat_name, subs in TAX.items():
        verb, bands = CAT_META[cat_name]
        cat_id = get_or_create_cat(cat_name)
        for sub_name, titles in subs.items():
            sub_id = get_or_create_sub(cat_id, sub_name)
            for title in titles:
                objective = f"{verb} {title[0].lower() + title[1:]}."
                topic_id = get_or_create_topic(sub_id, title, objective)
                for band_id in bands:
                    cur.execute(
                        "INSERT IGNORE INTO topic_suggested_band (topic_id, band_id, overridable) VALUES (%s,%s,1)",
                        (topic_id, band_id))
                    if cur.rowcount:
                        stats["band"] += 1

    conn.commit()
    cur.close()
    conn.close()

    expected = sum(len(t) for subs in TAX.values() for t in subs.values())
    print(f"Categorías nuevas:     {stats['cat']}")
    print(f"Subcategorías nuevas:  {stats['sub']}")
    print(f"Tópicos nuevos:        {stats['topic']}  (ya existían: {stats['skip']})")
    print(f"Bandas sugeridas:      {stats['band']}")
    print(f"Tópicos esperados en la taxonomía: {expected}")


if __name__ == "__main__":
    main()
