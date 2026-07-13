# Diseño de Arquitectura: Semillas Narrativas (Narrative Seeds)
Para implementar las **Semillas Narrativas** y separar la mecánica del motor de la temática, agregaremos tres nuevas columnas a la tabla `topics` en la base de datos de producción:
```sql
ALTER TABLE topics ADD COLUMN narrative_setting TEXT NULL;
ALTER TABLE topics ADD COLUMN narrative_conflict TEXT NULL;
ALTER TABLE topics ADD COLUMN narrative_role TEXT NULL;
```
Estas tres columnas nos permitirán inyectar dinámicamente el *dónde*, el *para qué* y el *quiénes somos* en cada sesión, evitando que el modelo recurra a naves espaciales o dinosaurios por defecto cuando los tópicos cambien.
---
# Plantilla para Cargar las Semillas Narrativas
Completá los campos `{narrative_setting}`, `{narrative_conflict}` y `{narrative_role}` para cada tópico a continuación. Una vez completado, procesaremos este archivo para generar el script de migración SQL o JSON correspondiente.

## 🦖 Tópicos Infantiles (Kids / Mini & Junior)
### [143] Abrir juguetes
* **Categoría:** kids
* **Palabras clave (muestreo):** box, open, surprise, toy, gift, new
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [139] Animales de la granja y la selva
* **Categoría:** kids
* **Palabras clave (muestreo):** animal, cow, dog, cat, lion, elephant
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [185] Causas que me importan
* **Categoría:** kids
* **Palabras clave (muestreo):** cause, awareness, injustice, activism, change, voice
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [159] Cocinar y recetas
* **Categoría:** kids
* **Palabras clave (muestreo):** recipe, cook, bake, ingredient, taste, sweet
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [154] Coleccionar cartas y figuritas
* **Categoría:** kids
* **Palabras clave (muestreo):** collection, trade, rare, common, card, figure
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [146] Comida divertida
* **Categoría:** kids
* **Palabras clave (muestreo):** burger, fries, nuggets, popcorn, candy, ice cream
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [155] Comida rápida y dulces
* **Categoría:** kids
* **Palabras clave (muestreo):** combo, burger, fries, soda, ice cream, menu
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [142] Comidas ricas
* **Categoría:** kids
* **Palabras clave (muestreo):** apple, bread, milk, rice, egg, banana
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [180] Construcción con bloques mágicos
* **Categoría:** kids
* **Palabras clave (muestreo):** block, build, tall, house, castle, break
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [140] Contar del 1 al 10
* **Categoría:** kids
* **Palabras clave (muestreo):** one, two, three, count, number, ten
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [184] Crecer en un mundo que cambia rápido
* **Categoría:** kids
* **Palabras clave (muestreo):** change, uncertain, technology, generation, adapt, overwhelming
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [160] Cuidar el planeta
* **Categoría:** kids
* **Palabras clave (muestreo):** recycle, pollution, climate, ocean, plastic, animal
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [150] Cómo me siento
* **Categoría:** kids
* **Palabras clave (muestreo):** happy, sad, angry, scared, excited, calm
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [161] Decir lo que pensás
* **Categoría:** kids
* **Palabras clave (muestreo):** think, agree, disagree, opinion, because, however
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [152] Desafíos virales
* **Categoría:** kids
* **Palabras clave (muestreo):** challenge, subscriber, viral, reaction, prank, video
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [132] Dibujar y crear
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** draw, color, paint, red, blue, yellow
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [144] Dibujitos y superhéroes
* **Categoría:** kids
* **Palabras clave (muestreo):** hero, fast, strong, fly, save, funny
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [128] Dinosaurios
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** dinosaur, T-Rex, huge, ancient, egg, roar
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [129] Espacio
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** planet, rocket, moon, star, astronaut, Earth
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [164] Gaming pro y esports
* **Categoría:** kids
* **Palabras clave (muestreo):** team, tournament, rank, pro, competitive, strategy
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [179] Juegos de pelea y torneos
* **Categoría:** kids
* **Palabras clave (muestreo):** combo, arena, block, health bar, tournament, character
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [145] Jugar en la pantalla
* **Categoría:** kids
* **Palabras clave (muestreo):** play, jump, run, win, lose, level
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [137] La escuela
* **Categoría:** kids
* **Palabras clave (muestreo):** school, teacher, friend, class, lunch, recess
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [186] Libertad y límites con mis padres
* **Categoría:** kids
* **Palabras clave (muestreo):** curfew, trust, independence, rules, privacy, argument
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [130] Mar y animales
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** fish, whale, shark, dolphin, ocean, swim
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [134] Mascotas
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** dog, cat, pet, soft, fluffy, loyal
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [148] Mi casa y mis habitaciones
* **Categoría:** kids
* **Palabras clave (muestreo):** room, kitchen, bathroom, bedroom, house, garden
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [141] Mi cuerpo
* **Categoría:** kids
* **Palabras clave (muestreo):** head, nose, eye, mouth, hand, foot
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [131] Mi deporte
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** soccer, basketball, ball, team, score, win
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [147] Mi día de la mañana a la noche
* **Categoría:** kids
* **Palabras clave (muestreo):** wake up, breakfast, lunch, dinner, bed, morning
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [135] Mi familia
* **Categoría:** kids
* **Palabras clave (muestreo):** mom, dad, brother, sister, grandma, grandpa
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [138] Mis colores favoritos
* **Categoría:** kids
* **Palabras clave (muestreo):** color, red, blue, yellow, green, purple
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [153] Mundos de bloques
* **Categoría:** kids
* **Palabras clave (muestreo):** build, block, craft, mine, create, server
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [133] Música y canciones
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** song, sing, dance, music, guitar, drums
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [156] Música, pelis y series
* **Categoría:** kids
* **Palabras clave (muestreo):** song, movie, series, binge, favorite, playlist
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [151] Naturaleza y dinosaurios
* **Categoría:** kids
* **Palabras clave (muestreo):** forest, ocean, mountain, dinosaur, jungle, tree
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [149] Pasatiempos y deportes
* **Categoría:** kids
* **Palabras clave (muestreo):** soccer, basketball, draw, music, play, swim
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [182] Quién soy y quién quiero ser
* **Categoría:** kids
* **Palabras clave (muestreo):** identity, comparison, pressure, authentic, confidence, insecure
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [183] Redes sociales: el lado B
* **Categoría:** tech
* **Palabras clave (muestreo):** algorithm, comparison, screen time, validation, burnout, filter
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [165] Slang y tendencias online
* **Categoría:** kids
* **Palabras clave (muestreo):** slang, trend, vibe, hype, flex, cringe
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [162] Streamers y transmisiones
* **Categoría:** kids
* **Palabras clave (muestreo):** live, stream, chat, follow, donate, clip
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [181] Suscripciones gaming y juego en la nube
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** cloud gaming, library, subscription, latency, cross-play, catalog
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [158] Trabajos del futuro
* **Categoría:** kids
* **Palabras clave (muestreo):** job, career, engineer, designer, scientist, creator
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [157] Viajes y culturas
* **Categoría:** kids
* **Palabras clave (muestreo):** travel, country, culture, language, city, trip
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [163] Zapatillas y moda urbana
* **Categoría:** kids
* **Palabras clave (muestreo):** sneakers, drop, limited, outfit, style, fit
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

## 💼 Tópicos de Adultos / Avanzados
### [94] Adicción al celular
* **Categoría:** tech
* **Palabras clave (muestreo):** screen time, addicted, doomscroll, limit, notification, dopamine
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [80] Animales en la ciencia
* **Categoría:** animales
* **Palabras clave (muestreo):** research, lab animal, trial, ethics, necessary evil, alternative
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [76] Animales en peligro
* **Categoría:** animales
* **Palabras clave (muestreo):** endangered, extinct, habitat, conservation, poaching, captivity
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [74] Animales raros que existen
* **Categoría:** animales
* **Palabras clave (muestreo):** bizarre, deep sea, platypus, axolotl, blobfish, documentary
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [8] Anécdotas de aeropuertos
* **Categoría:** viajes
* **Palabras clave (muestreo):** airport, layover, delay, lost luggage, boarding, gate change
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [88] Apps que uso a diario
* **Categoría:** tech
* **Palabras clave (muestreo):** app, daily, habit, addicted, notification, swipe
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [92] Aprender a programar
* **Categoría:** tech
* **Palabras clave (muestreo):** code, programming, learn, tutorial, bootcamp, self-taught
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [36] Aprender un instrumento
* **Categoría:** musica
* **Palabras clave (muestreo):** instrument, practice, chords, scales, lesson, self-taught
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [2] Arquitectura de software
* **Categoría:** tech
* **Palabras clave (muestreo):** it's not perfect but it works, we ran into, made the call, would do it differently, in hindsight, wish we had
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [107] Arte callejero
* **Categoría:** arte
* **Palabras clave (muestreo):** graffiti, street art, Banksy, vandalism, mural, ephemeral
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [106] Arte digital vs tradicional
* **Categoría:** arte
* **Palabras clave (muestreo):** digital, Procreate, iPad, paint, canvas, purist
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [109] Arte y dinero
* **Categoría:** arte
* **Palabras clave (muestreo):** market, auction, Sotheby's, millions, investment, starving artist
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [15] Asado argentino · técnica y rituales
* **Categoría:** gastronomia
* **Palabras clave (muestreo):** takes hours, the smell, Sunday tradition, low and slow, perfectly cooked, everyone gathers around
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [79] Bienestar animal
* **Categoría:** animales
* **Palabras clave (muestreo):** welfare, factory farm, free range, cage, cruelty-free, humane
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [19] Biología · evolución y genética
* **Categoría:** ciencia
* **Palabras clave (muestreo):** fascinating, it makes sense when you think about it, tiny changes over time, I'd never thought about, completely changed how I see, subtle but powerful
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [10] Básquet · NBA y leyendas
* **Categoría:** deportes
* **Palabras clave (muestreo):** carried the team, unstoppable that season, clutch, all-time great, underrated, the goat debate
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [16] Café de especialidad · v60, espresso
* **Categoría:** gastronomia
* **Palabras clave (muestreo):** I'm picky about, my go-to, smooth, way too acidic, right amount of, morning ritual
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [99] Cambio climático
* **Categoría:** ciencia
* **Palabras clave (muestreo):** climate, warming, carbon, tipping point, denier, renewable
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [18] Cambio climático · ciencia y políticas
* **Categoría:** ciencia
* **Palabras clave (muestreo):** we're running out of, small changes add up, I'm worried about, we should be doing more, the data shows, it's already affecting
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [111] Censura en el arte
* **Categoría:** arte
* **Palabras clave (muestreo):** censorship, ban, controversial, offensive, free expression, context
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [166] Charla abierta
* **Categoría:** general
* **Palabras clave (muestreo):** 
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [84] Choque cultural
* **Categoría:** viajes
* **Palabras clave (muestreo):** culture shock, weird, rude, polite, unspoken, adapt
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [7] Cine de los 90 · Tarantino
* **Categoría:** arte
* **Palabras clave (muestreo):** favorite scene, blew my mind, rewatchable, stuck with me, stylish, over the top
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [46] Cine vs streaming en casa
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** cinema, theater, release, experience, couch, popcorn
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [32] Ciudades que quiero conocer
* **Categoría:** viajes
* **Palabras clave (muestreo):** 
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [14] Cocina italiana · pasta y vinos
* **Categoría:** gastronomia
* **Palabras clave (muestreo):** the secret is, my nonna used to, fresh ingredients, comfort food, you can't go wrong with, from scratch
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [66] Cocinar en casa
* **Categoría:** comida
* **Palabras clave (muestreo):** cook, kitchen, ingredient, recipe, stove, oven
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [71] Cocinar para otros
* **Categoría:** comida
* **Palabras clave (muestreo):** host, guest, dinner party, impress, show off, stress
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [85] Comer cuando viajás
* **Categoría:** viajes
* **Palabras clave (muestreo):** street food, fancy, Michelin, scared, adventurous, weird
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [69] Comida típica de mi país
* **Categoría:** comida
* **Palabras clave (muestreo):** traditional, national dish, regional, comfort food, Sunday lunch, festival
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [123] Comprar moda online
* **Categoría:** moda
* **Palabras clave (muestreo):** online, return, fit, size, review, Shein
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [34] Conciertos que me marcaron
* **Categoría:** musica
* **Palabras clave (muestreo):** concert, live, crowd, venue, encore, energy
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [58] Console wars
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** console, PC, controller, exclusive, platform, loyal
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [108] Crear arte propio
* **Categoría:** arte
* **Palabras clave (muestreo):** create, hobby, amateur, draw, paint, write
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [119] Cuerpo ideal y presión social
* **Categoría:** fitness
* **Palabras clave (muestreo):** body image, ideal, social media, filter, Photoshop, compare
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [136] Cómo me siento
* **Categoría:** kids-deprecated
* **Palabras clave (muestreo):** happy, sad, angry, scared, excited, calm
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [177] Desarrollo de software y herramientas IA
* **Categoría:** tech
* **Palabras clave (muestreo):** framework, prompt, backend, syntax, deploy, repository
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [70] Dietas y modas
* **Categoría:** comida
* **Palabras clave (muestreo):** diet, keto, vegan, intermittent fasting, fad, stick to
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [178] Diseño y construcción del hogar
* **Categoría:** lifestyle
* **Palabras clave (muestreo):** layout, blueprint, space, renovation, contractor, budget
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [55] Doping y ética
* **Categoría:** deportes
* **Palabras clave (muestreo):** doping, performance enhancer, ban, test, scandal, level playing field
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [98] El cuerpo humano
* **Categoría:** ciencia
* **Palabras clave (muestreo):** body, brain, gut, immune, DNA, evolve
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [97] El espacio
* **Categoría:** ciencia
* **Palabras clave (muestreo):** space, planet, Mars, NASA, rocket, telescope
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [57] El juego del momento
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** game, playthrough, addicting, save, level up, grinding
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [56] El negocio del deporte
* **Categoría:** deportes
* **Palabras clave (muestreo):** salary, contract, transfer fee, sponsor, merchandise, broadcasting rights
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [113] Empezar a entrenar
* **Categoría:** fitness
* **Palabras clave (muestreo):** start, intimidating, newbie, personal trainer, form, consistency
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [29] Emprender · early-stage startup
* **Categoría:** negocios
* **Palabras clave (muestreo):** we figured out, almost gave up, the turning point, we had to pivot, no funding yet, small win
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [5] Entrenamiento de fuerza y suplementación
* **Categoría:** fitness
* **Palabras clave (muestreo):** hit a PR, felt amazing, back day, form over weight, took years to, small wins
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [28] Entrevistas técnicas · system design
* **Categoría:** negocios
* **Palabras clave (muestreo):** stressed about, they asked me, happy with how it went, wish I had said, took me by surprise, good vibe
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [17] Espacio · astronomía y misiones
* **Categoría:** ciencia
* **Palabras clave (muestreo):** mind-blowing, imagine that, I read recently that, we still don't know, tiny in comparison, it took years
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [63] Esports: ¿deporte real?
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** esports, pro player, tournament, League of Legends, stream, twitch
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [125] Fast fashion
* **Categoría:** moda
* **Palabras clave (muestreo):** fast fashion, Shein, exploitation, cheap, throwaway, carbon
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [13] Fórmula 1 y automovilismo
* **Categoría:** deportes
* **Palabras clave (muestreo):** wheel-to-wheel, from the back of the grid, made the difference, blew the rest away, questionable call, could've gone either way
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [9] Fútbol · Mundiales y selecciones
* **Categoría:** deportes
* **Palabras clave (muestreo):** amazing match, comeback, couldn't believe it, the best game I've ever seen, we deserved it, robbed
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [102] Genética y ética
* **Categoría:** ciencia
* **Palabras clave (muestreo):** DNA, edit, CRISPR, designer baby, disease, cure
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [37] Géneros que descubrí
* **Categoría:** musica
* **Palabras clave (muestreo):** genre, underground, mainstream, scene, fusion, subgenre
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [47] Géneros que evito y por qué
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** genre, horror, drama, romcom, thriller, documentary
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [53] Hacer deporte vs mirarlo
* **Categoría:** deportes
* **Palabras clave (muestreo):** practice, play, spectator, couch, active, watching
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [62] Historias en videojuegos
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** narrative, story-driven, RPG, choice, ending, writing
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [4] IA generativa · ética
* **Categoría:** tech
* **Palabras clave (muestreo):** double-edged sword, we should be careful with, hard to draw the line, happening faster than we think, I'm not sure how I feel about, useful but scary
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [93] IA y el futuro del trabajo
* **Categoría:** tech
* **Palabras clave (muestreo):** automation, job loss, skill, reskill, creative, manual
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [61] Indies vs AAA
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** indie, AAA, studio, budget, creative, polished
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [77] Inteligencia animal
* **Categoría:** animales
* **Palabras clave (muestreo):** smart, octopus, crow, consciousness, tool use, language
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [89] Inteligencia artificial
* **Categoría:** tech
* **Palabras clave (muestreo):** AI, ChatGPT, generate, replace, job, creative
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [100] Inventos que cambiaron todo
* **Categoría:** ciencia
* **Palabras clave (muestreo):** invention, revolution, printing press, electricity, internet, antibiotic
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [30] Japón · cultura y tradiciones
* **Categoría:** viajes
* **Palabras clave (muestreo):** blew me away, completely different vibe, I'd go back tomorrow, the food alone, wish I had more time, every detail
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [59] Jugar con amigos online
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** multiplayer, co-op, voice chat, lobby, lag, toxic
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [44] Libro vs película
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** adaptation, loyal, miss the point, casting, purist, skip
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [121] Marcas favoritas
* **Categoría:** moda
* **Palabras clave (muestreo):** brand, loyal, splurge, drop, limited edition, investment piece
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [78] Mascotas exóticas: ¿está bien?
* **Categoría:** animales
* **Palabras clave (muestreo):** exotic, legal, illegal, smuggle, snake, reptile
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [24] Meditación y mindfulness
* **Categoría:** lifestyle
* **Palabras clave (muestreo):** helps me, calms me down, I try to, every morning, took a while to, I noticed that
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [6] Metodologías ágiles · retrospectivas
* **Categoría:** tech
* **Palabras clave (muestreo):** we tried, what worked for us, it was a mess, lesson learned, the team grew, small improvements
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [33] Mi banda favorita
* **Categoría:** musica
* **Palabras clave (muestreo):** band, favorite, discover, lyrics, album, concert
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [65] Mi comida favorita
* **Categoría:** comida
* **Palabras clave (muestreo):** food, dish, favorite, taste, smell, homemade
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [49] Mi deporte favorito
* **Categoría:** deportes
* **Palabras clave (muestreo):** sport, play, watch, team, league, rookie
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [50] Mi equipo y sus rivales
* **Categoría:** deportes
* **Palabras clave (muestreo):** team, rival, fan base, derby, home, away
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [120] Mi estilo personal
* **Categoría:** moda
* **Palabras clave (muestreo):** style, outfit, wardrobe, go-to, color palette, uniform
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [73] Mi mascota
* **Categoría:** animales
* **Palabras clave (muestreo):** pet, dog, cat, adopt, rescue, habits
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [112] Mi rutina actual
* **Categoría:** fitness
* **Palabras clave (muestreo):** routine, gym, morning, evening, consistent, skip
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [82] Mi viaje soñado
* **Categoría:** viajes
* **Palabras clave (muestreo):** dream, bucket list, someday, save up, plan, destination
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [81] Mi último viaje
* **Categoría:** viajes
* **Palabras clave (muestreo):** trip, destination, highlight, weather, local, flight
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [83] Mochilero vs hotel
* **Categoría:** viajes
* **Palabras clave (muestreo):** backpacker, hostel, luxury, hotel, off the beaten path, spend
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [126] Moda sostenible
* **Categoría:** moda
* **Palabras clave (muestreo):** sustainable, ethical, transparency, fabric, natural, expensive
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [127] Moda y género
* **Categoría:** moda
* **Palabras clave (muestreo):** gender, fluid, menswear, womenswear, neutral, label
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [26] Moda · streetwear y sneakers
* **Categoría:** lifestyle
* **Palabras clave (muestreo):** instant cop, been waiting for this drop, elevates the fit, low-key, everyday wear, comfort and style
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [35] Música para entrenar
* **Categoría:** musica
* **Palabras clave (muestreo):** workout, playlist, beat, pump up, tempo, motivation
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [39] Música y emociones
* **Categoría:** musica
* **Palabras clave (muestreo):** mood, nostalgia, tear, soundtrack of my life, evoke, associate
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [110] NFTs y arte digital
* **Categoría:** arte
* **Palabras clave (muestreo):** NFT, crypto, blockchain, ownership, scam, bubble
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [115] Nutrición básica
* **Categoría:** fitness
* **Palabras clave (muestreo):** protein, carbs, macros, balanced, snack, processed
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [25] Nutrición · dietas y mitos
* **Categoría:** lifestyle
* **Palabras clave (muestreo):** I try to stick to, made a huge difference, not as hard as it sounds, I cut down on, energy levels, small changes
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [31] Patagonia · trekking y montañas
* **Categoría:** viajes
* **Palabras clave (muestreo):** the silence up there, tougher than I expected, worth every step, weather changed in minutes, stunning view, couldn't believe my eyes
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [43] Personajes inolvidables
* **Categoría:** peliculas
* **Palabras clave (muestreo):** character, antihero, villain, develop, arc, iconic
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [48] Premios y críticos: ¿importan?
* **Categoría:** peliculas
* **Palabras clave (muestreo):** Oscar, award, critic, ratings, overrated, underrated
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [90] Privacidad online
* **Categoría:** tech
* **Palabras clave (muestreo):** privacy, data, tracking, cookie, VPN, creepy
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [3] Producción musical y cultura DJ
* **Categoría:** musica
* **Palabras clave (muestreo):** I usually start with, the trick is, play around with, happy accident, the sound I was after, tweak
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [103] Pseudociencia vs ciencia
* **Categoría:** ciencia
* **Palabras clave (muestreo):** pseudoscience, homeopathy, astrology, flat earth, skeptic, evidence
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [54] Reglas raras o injustas
* **Categoría:** deportes
* **Palabras clave (muestreo):** rule, controversial, VAR, offside, penalty, interpretation
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [68] Restaurantes memorables
* **Categoría:** comida
* **Palabras clave (muestreo):** restaurant, reservation, waiter, tasting menu, service, atmosphere
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [22] Rock clásico · 70s a 90s
* **Categoría:** arte
* **Palabras clave (muestreo):** stood the test of time, killer riff, the album that changed everything, I keep going back to, raw energy, their best era
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [117] Running para principiantes
* **Categoría:** fitness
* **Palabras clave (muestreo):** running, couch to 5k, pace, shoes, knee pain, marathon
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [11] Running · entrenamiento y maratones
* **Categoría:** deportes
* **Palabras clave (muestreo):** hit the wall, felt amazing, personal best, tough day, kept pushing, first time I
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [116] Salud mental
* **Categoría:** fitness
* **Palabras clave (muestreo):** mental health, therapy, anxious, stress, burnout, talk to
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [20] Series de streaming · drama prestigio
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** binged it, hooked from episode one, slow burn, the writing, the ending broke me, underrated
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [122] Sneakers
* **Categoría:** moda
* **Palabras clave (muestreo):** sneaker, drop, collab, Jordan, Yeezy, collector
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [72] Sostenibilidad y comida
* **Categoría:** comida
* **Palabras clave (muestreo):** sustainable, local, seasonal, carbon footprint, waste, leftovers
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [60] Speedruns y secretos
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** speedrun, world record, glitch, skip, any%, 100%
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [45] Spoilers y cómo manejarlos
* **Categoría:** peliculas
* **Palabras clave (muestreo):** spoiler, twist, trigger warning, reveal, social media, tag
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [23] Stand-up · comediantes y especiales
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** had me crying laughing, spot on, uncomfortable but funny, the way he tells it, edgy, relatable
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [40] Streaming vs comprar música
* **Categoría:** musica
* **Palabras clave (muestreo):** streaming, royalties, artist payment, subscription, vinyl revival, ownership
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [118] Suplementos: ¿sí o no?
* **Categoría:** fitness
* **Palabras clave (muestreo):** supplement, protein powder, creatine, vitamin, scam, necessary
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [75] Tener mascota: ¿sí o no?
* **Categoría:** animales
* **Palabras clave (muestreo):** responsibility, commitment, lifestyle, lonely, allergic, expensive
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [12] Tenis · Grand Slam y rivalidades
* **Categoría:** deportes
* **Palabras clave (muestreo):** epic five-setter, raised his level, match point, the GOAT, incredible comeback, lost it mentally
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [27] Trabajo remoto · nómade digital
* **Categoría:** negocios
* **Palabras clave (muestreo):** best of both worlds, I miss the office sometimes, flexible, discipline is key, I work better when, the freedom
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [87] Turismo masivo y sus efectos
* **Categoría:** viajes
* **Palabras clave (muestreo):** overtourism, destination, ruined, local, Airbnb effect, gentrification
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [104] Un artista que admiro
* **Categoría:** arte
* **Palabras clave (muestreo):** artist, admire, work, style, influence, discover
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [91] Un gadget que me cambió la vida
* **Categoría:** tech
* **Palabras clave (muestreo):** gadget, device, game-changer, essential, luxury, splurge
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [51] Un partido inolvidable
* **Categoría:** deportes
* **Palabras clave (muestreo):** match, comeback, extra time, penalty, underdog, final whistle
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [38] Un álbum entero, no playlists
* **Categoría:** musica
* **Palabras clave (muestreo):** album, track, intro, outro, concept, filler
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [96] Una curiosidad científica
* **Categoría:** ciencia
* **Palabras clave (muestreo):** fact, mind-blown, phenomenon, explain, physics, biology
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [41] Una peli que me marcó
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** movie, favorite, plot, twist, character, scene
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [67] Una receta que aprendí
* **Categoría:** comida
* **Palabras clave (muestreo):** recipe, learn, grandmother, YouTube, step, mistake
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [42] Una serie que no pude parar
* **Categoría:** peliculas
* **Palabras clave (muestreo):** binge, episode, cliffhanger, marathon, season finale, spin-off
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [86] Viajar solo
* **Categoría:** viajes
* **Palabras clave (muestreo):** solo, alone, lonely, freedom, introvert, meet people
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [101] Vida en otros planetas
* **Categoría:** ciencia
* **Palabras clave (muestreo):** alien, life, Mars, exoplanet, Drake equation, Fermi paradox
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [64] Videojuegos como arte
* **Categoría:** videojuegos
* **Palabras clave (muestreo):** medium, expression, interactive, agency, art form, respected
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [21] Videojuegos · indie y AAA
* **Categoría:** entretenimiento
* **Palabras clave (muestreo):** addictive, playing through, the story really got me, couldn't put it down, underrated gem, the gameplay just feels right
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [124] Vintage vs moderno
* **Categoría:** moda
* **Palabras clave (muestreo):** vintage, thrift, second hand, Y2K, 90s, find
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [105] Visitar museos
* **Categoría:** arte
* **Palabras clave (muestreo):** museum, exhibition, wandering, audio guide, overwhelmed, rush
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [114] Yoga y meditación
* **Categoría:** fitness
* **Palabras clave (muestreo):** yoga, meditate, breathwork, flexibility, mind-body, instructor
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [95] Ética en tecnología
* **Categoría:** tech
* **Palabras clave (muestreo):** ethics, monopoly, platform, moderation, free speech, censorship
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

### [52] Ídolos del deporte
* **Categoría:** deportes
* **Palabras clave (muestreo):** idol, GOAT, legend, career, retire, comeback
```yaml
narrative_setting: ""
narrative_conflict: ""
narrative_role: ""
```

