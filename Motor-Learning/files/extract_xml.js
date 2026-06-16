// Extrae los system_instruction_stack XML del motor de 9 capas (09_motor_interactivo_standalone.html)
// Porta fielmente la logica de buildStack() + render() del HTML. Estado: "open" (Phase 1), igual que el render.
const fs = require("fs");

const TODAY = "2026-06-16"; // fija (el HTML usa new Date())

const TUTOR = {
  early_child:{name:"Sparky",persona:"Dragoncito espacial",tone:"Súper alegre, onomatopeyas y emojis en pantalla"},
  child:{name:"Nova",persona:"Exploradora compañera de aventuras",tone:"Entusiasta, festeja cada logro"},
  teen:{name:"Leo",persona:"Profe-coach cercano, sin disfraz infantil",tone:"Relajado, actual, motivador"},
  adult:{name:"Alex",persona:"Profesor/host carismático",tone:"Claro, cordial, con modismos naturales"}
};
const PEDAGOGY = {
  early_child:"Gamificación inmersiva. 0% gramática explícita. El error nunca se corrige de forma punitiva.",
  child:"Lúdico con mini-retos y recompensas. Gramática implícita, sin metalenguaje.",
  teen:"Comunicativo basado en sus intereses. Gramática contextual ligera.",
  adult:"Fluency first. No interrumpir por errores menores; anotar vicios en silencio para el cierre."
};
const RIELS = {
  early_child:["Prohibido preguntas abiertas en inglés","Flujo de 3 pasos: frase corta → espejo en español → repetir 1 palabra","Máx. 30 palabras por turno"],
  child:["Solo preguntas cerradas simples (yes/no)","Frases de 2 a 4 palabras","Espejo en español tras cada frase nueva"],
  teen:["Preguntas abiertas simples permitidas","Español reducido al mínimo","Conectar siempre con sus intereses"],
  adult:["Una sola pregunta o situación por turno","Si se traba >3s, dar pista o sinónimo, no la respuesta","Priorizar continuidad del diálogo sobre la precisión"]
};
const LEVELMOD = {
  A1:"Nivel A1 · espejo en español SIEMPRE activo, vocabulario mínimo",
  A2:"Nivel A2 · espejo en español frecuente, frases cortas",
  B1:"Nivel B1 · español solo si se traba, conversación guiada",
  B2:"Nivel B2 · sin español (inmersión), corrección por recast",
  C1:"Nivel C1 · sin español (inmersión), matices e idiomático"
};
const TOPIC_DATA = {
  "El mundo de los dinosaurios":{vocab:["Dino","Egg"],phrases:["Big dino","A small egg"],obj:"nombrar animales y describir tamaños"},
  "Explorar el espacio":{vocab:["Star","Planet"],phrases:["A bright star","The red planet"],obj:"describir el cielo y los planetas"},
  "¿Llegaremos a Marte?":{vocab:["Mars","Rocket"],phrases:["Travel to Mars","A big rocket"],obj:"opinar sobre el futuro y la exploración"},
  "Fútbol":{vocab:["Ball","Goal"],phrases:["Score a goal","Kick the ball"],obj:"hablar de un partido"},
  "Escalada":{vocab:["Rope","Summit"],phrases:["Reach the summit","Hold the rope"],obj:"describir una actividad al aire libre"},
  "Deportes al aire libre":{vocab:["Run","Trail"],phrases:["Run on the trail"],obj:"hablar de hábitos y deportes"},
  "Bandas de música":{vocab:["Song","Band"],phrases:["A great song"],obj:"expresar gustos musicales"},
  "Cine de aventuras":{vocab:["Movie","Hero"],phrases:["An action movie"],obj:"recomendar y opinar sobre películas"},
  "Programas de TV clásicos":{vocab:["Show","Channel"],phrases:["A classic show"],obj:"recordar y describir programas"},
  "Animales del océano":{vocab:["Fish","Whale"],phrases:["A big whale"],obj:"nombrar animales marinos"},
  "Volcanes":{vocab:["Lava","Erupt"],phrases:["The volcano erupts"],obj:"explicar un fenómeno natural"},
  "Jardines y plantas":{vocab:["Plant","Flower"],phrases:["Water the plant"],obj:"hablar de rutinas de cuidado"},
  "Cocina del mundo":{vocab:["Recipe","Dish"],phrases:["A tasty dish"],obj:"describir una receta"},
  "Videojuegos":{vocab:["Game","Level"],phrases:["Win the level"],obj:"contar cómo se juega"},
  "Cómo funcionan los robots":{vocab:["Robot","Sensor"],phrases:["The robot moves"],obj:"explicar un proceso técnico"}
};
const CATALOG = {
  "Espacio y ciencia":{"Astronomía":["Explorar el espacio","¿Llegaremos a Marte?"],"Prehistoria":["El mundo de los dinosaurios"]},
  "Naturaleza":{"Océanos":["Animales del océano"],"Geología":["Volcanes"],"Botánica":["Jardines y plantas"]},
  "Deportes":{"Pelota":["Fútbol"],"Aire libre":["Escalada","Deportes al aire libre"]},
  "Cultura y TV":{"Música":["Bandas de música"],"Pantalla":["Cine de aventuras","Programas de TV clásicos"]},
  "Tecnología":{"Robótica":["Cómo funcionan los robots"],"Juegos":["Videojuegos"]},
  "Comida":{"Recetas":["Cocina del mundo"]}
};
function findSubcat(cat,topic){const c=CATALOG[cat]||{};for(const sc in c){if(c[sc].includes(topic))return sc;}return "—";}

const PROFILES = [
  {name:"Timo",age:5,level:"A1",cat:"Espacio y ciencia",topic:"El mundo de los dinosaurios",interests:["dinosaurios","cohetes"],errors:["Banana"]},
  {name:"Mía",age:6,level:"A1",cat:"Naturaleza",topic:"Animales del océano",interests:["animales"],errors:[]},
  {name:"Benja",age:7,level:"A2",cat:"Deportes",topic:"Fútbol",interests:["fútbol"],errors:["sonido 'th'"]},
  {name:"Lola",age:8,level:"A1",cat:"Espacio y ciencia",topic:"El mundo de los dinosaurios",interests:["dibujar"],errors:[]},
  {name:"Thiago",age:9,level:"A2",cat:"Espacio y ciencia",topic:"Explorar el espacio",interests:["espacio"],errors:["Rocket"]},
  {name:"Valen",age:10,level:"B1",cat:"Cultura y TV",topic:"Bandas de música",interests:["música"],errors:[]},
  {name:"Bruno",age:11,level:"A2",cat:"Deportes",topic:"Escalada",interests:["montaña"],errors:["mountain"]},
  {name:"Cata",age:12,level:"B1",cat:"Naturaleza",topic:"Volcanes",interests:["ciencia"],errors:[]},
  {name:"Lucas",age:13,level:"A2",cat:"Tecnología",topic:"Videojuegos",interests:["gaming"],errors:["build"]},
  {name:"Martina",age:14,level:"B2",cat:"Cultura y TV",topic:"Cine de aventuras",interests:["cine"],errors:[]},
  {name:"Nico",age:15,level:"B1",cat:"Cultura y TV",topic:"Programas de TV clásicos",interests:["series"],errors:[]},
  {name:"Sofía",age:16,level:"B2",cat:"Naturaleza",topic:"Volcanes",interests:["medio ambiente"],errors:[]},
  {name:"Tomás",age:17,level:"C1",cat:"Tecnología",topic:"Cómo funcionan los robots",interests:["programación"],errors:[]},
  {name:"Flor",age:19,level:"A2",cat:"Comida",topic:"Cocina del mundo",interests:["cocina"],errors:["recipe"]},
  {name:"Diego",age:24,level:"B1",cat:"Deportes",topic:"Deportes al aire libre",interests:["running"],errors:[]},
  {name:"Caro",age:28,level:"B2",cat:"Espacio y ciencia",topic:"¿Llegaremos a Marte?",interests:["divulgación"],errors:[]},
  {name:"Javier",age:35,level:"B1",cat:"Cultura y TV",topic:"Bandas de música",interests:["DJ"],errors:["terminaciones -ed"]},
  {name:"Romina",age:42,level:"A1",cat:"Naturaleza",topic:"Jardines y plantas",interests:["jardinería"],errors:["plural -s"]},
  {name:"Gustavo",age:55,level:"B2",cat:"Espacio y ciencia",topic:"Explorar el espacio",interests:["astronomía"],errors:[]},
  {name:"Elena",age:68,level:"B1",cat:"Cultura y TV",topic:"Programas de TV clásicos",interests:["historia"],errors:[]}
];

function band(a){ if(a<=6)return"early_child"; if(a<=10)return"child"; if(a<=17)return"teen"; return"adult"; }
function bandLabel(b){return {early_child:"Primera infancia",child:"Niñez",teen:"Adolescencia",adult:"Adulto"}[b];}
function isKid(b){return b==="early_child"||b==="child";}
function adv(level){return ["B1","B2","C1"].includes(level);}
function pacingMin(b,level){const base={early_child:3,child:4,teen:6,adult:8}[b];return base+(["B2","C1"].includes(level)?2:0);}
function topicScale(p){const t=TOPIC_DATA[p.topic];return {words:t.vocab,phrases:adv(p.level)?t.phrases:t.phrases.slice(0,1),obj:t.obj};}
function phasesOf(b){
  if(isKid(b)) return ["Phase 1: Arrival (saludo + enganche con el mundo de hoy)","Phase 2: Mission (juego con el vocabulario objetivo)","Phase 3: Reward (logro y refuerzo)","Phase 4: Session Close (mini-repaso + gancho)"];
  return ["Phase 1: Context Setup (apertura del escenario)","Phase 2: Development (desarrollo de la conversación)","Phase 3: Resolution (resolución del objetivo)","Phase 4: Session Close (salir del marco: repaso + feedback + gancho)"];
}
function istate(b,level,sel){
  const tgt=pacingMin(b,level);
  if(sel==="open") return {Turn:1,Elapsed:0,Signal:"idle",Phase:"Phase 1",tgt};
  if(sel==="dev")  return {Turn:Math.max(3,Math.round(tgt/2)),Elapsed:Math.round(tgt/2),Signal:"flowing",Phase:"Phase 2",tgt};
  return {Turn:"último",Elapsed:tgt,Signal:"flowing",Phase:"Phase 4",tgt};
}
function openingAction(b,p){
  const t=TUTOR[b],td=TOPIC_DATA[p.topic];
  if(isKid(b)) return `Saludá a ${p.name} con mucha energía como ${t.name}, presentá el mundo de hoy ("${p.topic}") y enganchá. Pedile repetir "${td.vocab[0]}". Respetá el flujo de 3 pasos.`;
  if(b==="teen") return `Saludá a ${p.name} de forma relajada como ${t.name}, presentá el tema ("${p.topic}") y abrí con una sola pregunta simple en inglés.`;
  return `Presentate como ${t.name} e iniciá en inglés. Saludá a ${p.name}, dale la bienvenida, presentá el escenario ("${p.topic}") y abrí con la primera consigna. Una sola pregunta por turno.`;
}
function continuationAction(b,p){
  if(isKid(b)) return `Avanzá un paso por turno: 1 frase en inglés → espejo en español → pedir repetición. Nunca preguntas abiertas. Máx. 30 palabras.`;
  if(b==="teen") return `Sostené la charla con una sola pregunta o consigna por turno, español al mínimo, conectando con sus intereses.`;
  return `Mantené la conversación viva: una pregunta/situación por turno, sin castellano, con pistas si se traba >3s. Avanzá hacia ${TOPIC_DATA[p.topic].obj}.`;
}
function closingAction(b,p){
  const td=TOPIC_DATA[p.topic];
  if(isKid(b)) return `Cerrá con calidez: repaso MUY breve ("Hoy aprendimos sobre ${p.topic}: ${td.vocab.join(", ")}"), festejá el logro y enganchá ("¿Jugamos un ratito más?" / "¡Nos vemos la próxima!"). En español con alguna palabra en inglés.`;
  if(b==="teen") return `Cerrá en inglés simple: repaso breve ("Today we practiced ${td.phrases[0]}"), un elogio corto y gancho ("Wanna keep going?" / "See you next time!").`;
  return `Salí suavemente del marco. Repaso al nivel ${p.level} de lo trabajado (${td.obj}: "${td.phrases.join('", "')}"). Entregá 1–2 correcciones de Recent_Errors (los vicios anotados en silencio), sin abrumar. Gancho: "Shall we continue?" / "Well done, ${p.name} — see you next time!".`;
}

function buildStack(p,sel){
  const b=band(p.age),t=TUTOR[b],td=TOPIC_DATA[p.topic],ts=topicScale(p);
  const today=TODAY;
  const ist=istate(b,p.level,sel);
  const ph=phasesOf(b);
  const subcat=findSubcat(p.cat,p.topic);
  const guards=RIELS[b].concat([LEVELMOD[p.level]]);
  const order=[];
  order.push({tag:"runtime_context",body:[`Current Date: ${today}`,`Target Language: English`,`Native Language: Spanish (es-AR, Rioplatense)`,`Interface Mode: Realtime Multimodal Voice Session`,`Voice Output Rule: el texto al TTS va limpio (emojis y onomatopeyas solo a pantalla).`]});
  order.push({tag:"tutor_identity",body:[`Character Persona: Sos ${t.name}, ${t.persona}.`,`Tone: ${t.tone}.`]});
  order.push({tag:"pedagogical_framework_preset",body:[`Methodology: ${PEDAGOGY[b]}`]});
  order.push({tag:"lesson_focus_engagement",body:[ isKid(b)? `Gamification: misión lúdica sobre "${p.topic}". Cada acierto da una recompensa.` : `Gamification: ${b==="teen"?"charla guiada":"roleplay / escenario comunicativo"} sobre "${p.topic}" (objetivo: ${td.obj}).` ]});
  order.push({tag:"student_profile",body:[`Name: ${p.name}`,`Age: ${p.age}`,`Language Level: ${p.level}`,`Interests: ${p.interests.join(", ")}`]});
  order.push({tag:"learner_state",body:[`Mastered: []  (se llena con el historial)`,`Learning: [${ts.words.join(", ")}]`,`Due_For_Review: [${ts.phrases.slice(0,1).join(", ")}]`,`Recent_Errors: [${p.errors.length?p.errors.join(", "):"—"}]`]});
  order.push({tag:"behavioral_guards",body:guards.map((g,i)=>`Rule ${i+1}: ${g}`).concat([
      `Rule ${guards.length+1} (ASR tolerance): si el reconocimiento de voz llega con baja confianza, pedí repetir; no lo cuentes como error.`,
      `Rule ${guards.length+2} (Stay on frame): si deriva a temas fuera de la clase, redirigí con tacto.`,
      `Rule ${guards.length+3} (Closing trigger): si Current_Phase = "Phase 4", ejecutá la Closing_Action; no inicies contenido nuevo.`
    ])});
  order.push({tag:"current_topic_vocabulary",body:[`Category: ${p.cat}`,`Subcategory: ${subcat}`,`Topic Title: ${p.topic}`,`Target Objective: ${td.obj}`,`Key Vocabulary: [${ts.words.join(", ")}]`,`Key Phrases: [${ts.phrases.join(", ")}]`]});
  order.push({tag:"narrative_spine",body:[`Pacing: duración objetivo ~${ist.tgt} min (por banda + nivel; ajustable por preferencia).`,`Session Structure:`].concat(ph.map(x=>`  - ${x}`)).concat([`Current Phase: ${ist.Phase}`])});
  order.push({tag:"interaction_state",body:[`Turn: ${ist.Turn}`,`Elapsed_Min: ${ist.Elapsed} / target ${ist.tgt}`,`Signal: ${ist.Signal}`,`Current_Phase: ${ist.Phase}`]});
  order.push({tag:"execution_trigger",body:[`Phase_Aware: la acción a ejecutar depende de interaction_state.Current_Phase.`,`Opening_Action (Phase 1): ${openingAction(b,p)}`,`Continuation_Action (Phases 2-3): ${continuationAction(b,p)}`,`Closing_Action (Phase 4): ${closingAction(b,p)}`]});
  return {order,b,ist,ts};
}

function toXml(order){
  let raw="<system_instruction_stack>\n\n";
  order.forEach(bl=>{
    raw+="  <"+bl.tag+">\n";
    bl.body.forEach(line=> raw+="    "+line+"\n");
    raw+="  </"+bl.tag+">\n\n";
  });
  raw+="</system_instruction_stack>";
  return raw;
}

let out = "";
PROFILES.forEach((p,i)=>{
  const b=band(p.age);
  const S=buildStack(p,"open");
  out += `============================================================\n`;
  out += `PERFIL ${i+1}/20 · ${p.name}, ${p.age} (${bandLabel(b)}) · nivel ${p.level}\n`;
  out += `tópico: ${p.topic} · intereses: ${p.interests.join(", ")}\n`;
  out += `============================================================\n\n`;
  out += toXml(S.order);
  out += `\n\n\n`;
});

fs.writeFileSync(__dirname + "/09_prompts_extraidos.txt", out, "utf8");
console.log("OK -> 09_prompts_extraidos.txt (" + PROFILES.length + " stacks, " + out.length + " chars)");
