// =============================================================================
// 🎴 PANEL DE ADMINISTRACIÓN Y MOTOR DE GENERACIÓN PROCEDURAL EN VIVO (2026)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let animacionFrameId = null;

// =============================================================================
// 📜 DICCIONARIO BASE DE CRIATURAS, ZONAS Y BESTIAS
// =============================================================================
const BASE_CRIATURAS = [
    // 🌋 Zona del Caos y Criaturas de la Noche
    { emoji: "👾", nombre: "Monstruo Alienígena", lore: "Invasor del espacio exterior.", era: "espacial" },
    { emoji: "👽", nombre: "Alienígena Ancestral", lore: "Invasor silenciador de mundos.", era: "espacial" },
    { emoji: "🤖", nombre: "Robot Autónomo", lore: "Unidad sintética invasora del espacio.", era: "cyber" },
    { emoji: "👻", nombre: "Fantasma Errante", lore: "Habitante del cementerio maldito.", era: "antiguo" },
    { emoji: "💀", nombre: "Cráneo Profano", lore: "Ectoplasma del cementerio olvidado.", era: "antiguo" },
    { emoji: "☠️", nombre: "Calavera de Huesos", lore: "Guardián de las tumbas antiguas.", era: "antiguo" },
    { emoji: "🧟", nombre: "Zombi No-Muerto", lore: "Cadáver reanimado por la magia negra.", era: "antiguo" },
    { emoji: "👹", nombre: "Ogro Japonés", lore: "Demonio de la mitología oriental.", era: "antiguo" },
    { emoji: "👺", nombre: "Duende de la Montaña", lore: "Espíritu tramposo del bosque oscuro.", era: "antiguo" },
    { emoji: "🎃", nombre: "Calabaza Macabra", lore: "Llama espectral de la noche de brujas.", era: "antiguo" },
    { emoji: "🦇", nombre: "Murciélago Espectral", lore: "Cazador nocturno del bosque oscuro.", era: "antiguo" },
    { emoji: "🧛", nombre: "Vampiro Sangriento", lore: "Señor inmortal de la oscuridad.", era: "antiguo" },
    { emoji: "🧞", nombre: "Genio Místico", lore: "Ser elemental de reinos místico ancestrales.", era: "antiguo" },
    { emoji: "🧜‍♀️", nombre: "Sirena Encantada", lore: "Enchanteresa de las profundidades marinas.", era: "antiguo" },
    { emoji: "🧝", nombre: "Elfo Místico", lore: "Guardián milenario de los bosques mágicos.", era: "antiguo" },
    { emoji: "🦄", nombre: "Unicornio Mágico", lore: "Criatura pura de los reinos celestiales.", era: "antiguo" },

    // 🏡 El Poblado y Granja de los Hombres
    { emoji: "🐶", nombre: "Perro Leal", lore: "Protector de las casas del poblado.", era: "cotidianos" },
    { emoji: "🐕", nombre: "Perro Guardián", lore: "Fiel defensor de las fronteras locales.", era: "cotidianos" },
    { emoji: "🐩", nombre: "Caniche Real", lore: "Mascota de la alta aristocracia.", era: "cotidianos" },
    { emoji: "🐱", nombre: "Gato Silencioso", lore: "Cazador de sombras en los hogares.", era: "cotidianos" },
    { emoji: "🐈", nombre: "Gato Doméstico", lore: "Compañero nocturno del poblado.", era: "cotidianos" },
    { emoji: "🐭", nombre: "Ratón Veloz", lore: "Escurridizo habitante de las despensas.", era: "cotidianos" },
    { emoji: "🐹", nombre: "Hámster Tierno", lore: "Pequeño roedor de los hogares.", era: "cotidianos" },
    { emoji: "🐰", nombre: "Conejo de Campo", lore: "Ágil habitante de las praderas.", era: "cotidianos" },
    { emoji: "🐮", nombre: "Vaca Lechera", lore: "Ganado pacífico del pastizal.", era: "cotidianos" },
    { emoji: "🐄", nombre: "Vaca Manchada", lore: "Proveedora de sustento para la granja.", era: "cotidianos" },
    { emoji: "🐂", nombre: "Buey Fuerte", lore: "Fuerza imparable del arado.", era: "cotidianos" },
    { emoji: "🐃", nombre: "Buey de Agua", lore: "Bestia de carga de los humedales.", era: "cotidianos" },
    { emoji: "🐑", nombre: "Oveja Lanuda", lore: "Pacífica criatura de las colinas.", era: "cotidianos" },
    { emoji: "🐏", nombre: "Carnero Salvaje", lore: "Líder protector de los rebaños.", era: "cotidianos" },
    { emoji: "🐐", nombre: "Cabra Montés", lore: "Escaladora de las rocas del poblado.", era: "cotidianos" },
    { emoji: "🐷", nombre: "Puerco de Granja", lore: "Animal alegre de los corrales.", era: "cotidianos" },
    { emoji: "🐽", nombre: "Hocico de Cerdo", lore: "Rastreador de raíces en el fango.", era: "cotidianos" },
    { emoji: "🐗", nombre: "Jabalí Feroz", lore: "Bestia indomable de las bellotas.", era: "cotidianos" },
    { emoji: "🐔", nombre: "Gallina del Corral", lore: "Avisadora del amanecer campestre.", era: "cotidianos" },
    { emoji: "🦃", nombre: "Pavo del Poblado", lore: "Ave de gran plumaje campesino.", era: "cotidianos" },
    { emoji: "🐣", nombre: "Pollo Naciendo", lore: "Símbolo de renacimiento en la granja.", era: "cotidianos" },
    { emoji: "🐤", nombre: "Pío Pío", lore: "Pequeña ave cantora del amanecer.", era: "cotidianos" },
    { emoji: "🐥", nombre: "Pollito Amarillo", lore: "Habitante de los gallineros del pueblo.", era: "cotidianos" },
    { emoji: "🐴", cabalgata: true, nombre: "Caballo Veloz", lore: "Bestia noble de carga y velocidad.", era: "cotidianos" },
    { emoji: "🦓", nombre: "Cebra Rayada", lore: "Nómada de las llanuras abiertas.", era: "cotidianos" },

    // 🌳 La Selva y los Bosques Salvajes
    { emoji: "🦊", nombre: "Zorro Astuto", lore: "Cazador silente de las sombras.", era: "cotidianos" },
    { emoji: "🐺", nombre: "Lobo Alfa", lore: "Líder de la jauría salvaje.", era: "antiguo" },
    { emoji: "🐻", nombre: "Oso Pardo", lore: "Guardián de las cavernas profundas.", era: "cotidianos" },
    { emoji: "🐼", nombre: "Panda Silencioso", lore: "Maestro del bambú en las montañas.", era: "cotidianos" },
    { emoji: "🐨", nombre: "Koala Trepador", lore: "Habitante tranquilo del eucalipto.", era: "cotidianos" },
    { emoji: "🐯", nombre: "Tigre Feroz", lore: "Depredador supremo de la selva.", era: "cotidianos" },
    { emoji: "🦁", nombre: "León Leal", lore: "Rey indiscutible de la sabana.", era: "cotidianos" },
    { emoji: "🐆", nombre: "Leopardo Ágil", lore: "Cazador sigiloso de la fronda.", era: "cotidianos" },
    { emoji: "🐵", nombre: "Mono Curioso", lore: "Acróbata de la cima de los árboles.", era: "cotidianos" },
    { emoji: "🐒", nombre: "Mono Selvático", lore: "Habitante de la canopia tropical.", era: "cotidianos" },
    { emoji: "🦍", nombre: "Gorila de Montaña", lore: "Fuerza colosal de la selva profunda.", era: "cotidianos" },
    { emoji: "🦧", nombre: "Orangután Sabio", lore: "Ermitaño de las selvas asiáticas.", era: "cotidianos" },
    { emoji: "🦝", nombre: "Mapache Astuto", lore: "Explorador nocturno de los ríos.", era: "cotidianos" },
    { emoji: "🦡", nombre: "Tejón Fiero", lore: "Excavador tenaz de madrigueras.", era: "cotidianos" },
    { emoji: "🦔", nombre: "Erizo Espinoso", lore: "Defensor acorazado de los bosques.", era: "cotidianos" },
    { emoji: "🦦", nombre: "Nutria de Río", lore: "Nadadora juguetona de aguas dulces.", era: "espacial" },
    { emoji: "🦫", nombre: "Castor Constructor", lore: "Arquitecto de presas y represas.", era: "cotidianos" },
    { emoji: "🦥", nombre: "Perezoso Lento", lore: "Meditador de los árboles selváticos.", era: "cotidianos" },
    { emoji: "🦌", nombre: "Ciervo Majestuoso", lore: "Espíritu guardián del claro del bosque.", era: "antiguo" },
    { emoji: "🦬", nombre: "Bisonte Ancestral", lore: "Gigante de las grandes praderas.", era: "cotidianos" },
    { emoji: "🦒", nombre: "Jirafa Altiva", lore: "Vigilante de las copas de los árboles.", era: "cotidianos" },
    { emoji: "🐘", nombre: "Elefante Sabio", lore: "Memoria viva de la sabana.", era: "cotidianos" },
    { emoji: "🦣", nombre: "Mamut Lanudo", lore: "Gigante prehistórico de la era de hielo.", era: "antiguo" },
    { emoji: "🦏", nombre: "Rinoceronte Blindado", lore: "Tanque viviente de la vegetación.", era: "cotidianos" },
    { emoji: "🦛", nombre: "Hipopótamo del Río", lore: "Bestia territorial de los arroyos.", era: "cotidianos" },
    { emoji: "🦘", nombre: "Canguro Saltarín", lore: "Veloz guerrero de las estepas.", era: "cotidianos" },

    // 🦅 Los Cielos Abiertos
    { emoji: "🐦", nombre: "Pájaro Cantarín", lore: "Mensajero de los vientos del norte.", era: "espacial" },
    { emoji: "🐧", nombre: "Pingüino Ártico", lore: "Navegante de los hielos eternos.", era: "cotidianos" },
    { emoji: "🕊️", nombre: "Paloma de la Paz", lore: "Emisaria de treguas ancestrales.", era: "antiguo" },
    { emoji: "🦅", nombre: "Águila Imperial", lore: "Ojo supremo de los cielos abiertos.", era: "espacial" },
    { emoji: "🦆", nombre: "Pato Silvestre", lore: "Viajero de los lagos y cielos.", era: "cotidianos" },
    { emoji: "🦢", nombre: "Cisne Majestuoso", lore: "Elegancia pura sobre las aguas.", era: "antiguo" },
    { emoji: "🦉", nombre: "Búho Sabio", lore: "Observador nocturno del bosque.", era: "antiguo" },
    { emoji: "🦤", nombre: "Dodo Olvidado", lore: "Ave mítica de tiempos lejanos.", era: "antiguo" },
    { emoji: "🦩", nombre: "Flamenco Rosado", lore: "Elegante habitante de las lagunas.", era: "espacial" },
    { emoji: "🦚", nombre: "Pavo Real", lore: "Abono de mil colores en el aire.", era: "espacial" },
    { emoji: "🦜", nombre: "Loro Tropical", lore: "Hablador de las copas de la selva.", era: "espacial" },

    // 🐊 Pantanos y Ríos Prehistóricos
    { emoji: "🐊", nombre: "Cocodrilo del Pantano", lore: "Depredador de la sangre fría.", era: "antiguo" },
    { emoji: "🐢", nombre: "Tortuga Longeva", lore: "Viajera paciente de eras pasadas.", era: "antiguo" },
    { emoji: "🦎", nombre: "Lagartija de Roca", lore: "Superviviente del desierto cálido.", era: "cotidianos" },
    { emoji: "🐍", nombre: "Serpiente Venenosa", lore: "Sombra sigilosa en la hierba.", era: "antiguo" },
    { emoji: "🐸", nombre: "Rana Venenosa", lore: "Anfibio brillante de las charcas.", era: "cyber" },
    { emoji: "🐲", nombre: "Dragón Antiguo", lore: "Cabeza mítica del terror del fuego.", era: "antiguo" },
    { emoji: "🐉", nombre: "Dragón Legendario", lore: "Soberano absoluto de los cielos y fuego.", era: "antiguo" },
    { emoji: "🦕", nombre: "Saurópodo Gigante", lore: "Titán del pasado prehistórico.", era: "antiguo" },
    { emoji: "🦖", nombre: "T-Rex Feroz", lore: "Tirano de la era prehistórica.", era: "antiguo" },

    // 🌊 El Trono del Océano
    { emoji: "🐳", nombre: "Ballena Azul", lore: "Gigante majestuoso del océano.", era: "espacial" },
    { emoji: "🐋", nombre: "Ballena de las Profundidades", lore: "Criatura ancestral de los abismos.", era: "espacial" },
    { emoji: "🐬", nombre: "Delfín del Arrecife", lore: "Guía veloz de los mares cálidos.", era: "espacial" },
    { emoji: "🦭", nombre: "Foca Marina", lore: "Habitante de las costas heladas.", era: "cotidianos" },
    { emoji: "🐟", nombre: "Pez de Río", lore: "Navegante de la corriente rápida.", era: "espacial" },
    { emoji: "🐠", nombre: "Pez Tropical", lore: "Joya viviente del arrecife de coral.", era: "cyber" },
    { emoji: "🐡", nombre: "Pez Globo", lore: "Defensor espinoso de las mareas.", era: "cyber" },
    { emoji: "🦈", nombre: "Tiburón Cazador", lore: "Terror implacable del océano.", era: "cyber" },
    { emoji: "🐙", nombre: "Pulpo de los Abismos", lore: "Maestro del camuflaje submarino.", era: "cyber" },
    { emoji: "🦀", nombre: "Cangrejo del Arrecife", lore: "Guardián acorazado de la costa.", era: "cotidianos" }
];

const RAREZAS = ["Común", "Común", "Común", "Rara", "Rara", "Épica", "Legendaria"];

// Parámetros dinámicos de la carta actual en el visor
let estadoCartaActual = {
    semilla: Math.floor(Math.random() * 900000) + 100000,
    era: "cyber",
    rareza: "Común",
    simbolo: "👾",
    colorPrimario: "#00ff66",
    colorSecundario: "#1e293b",
    colorFondo: "#0d0e15"
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        logStatus("Supabase conectado.");
    } else {
        logStatus("Error: SDK de Supabase no disponible.", true);
    }

    inicializarControlesGUI();
    randomizarParametros();
    iniciarBucleRenderizado();
    cargarCatalogoBaseDatos();
});

// Mensajería y registros de consola
function logStatus(msg, esError = false) {
    const box = document.getElementById('status-log');
    if (!box) return;
    box.style.color = esError ? "#ff0055" : "#00ff66";
    box.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
}

// Navegación de Pestañas SPA
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const pestanaTarget = document.getElementById(idPestana);
    if (pestanaTarget) pestanaTarget.classList.add('activa');

    const btnActivo = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(idPestana));
    if (btnActivo) btnActivo.classList.add('activo');

    if (idPestana === 'tab-catalogo') {
        cargarCatalogoBaseDatos();
    }
}

// Vinculación de listeners a campos de formulario
function inicializarControlesGUI() {
    document.getElementById('carta-era').addEventListener('change', (e) => {
        estadoCartaActual.era = e.target.value;
        actualizarPaletaPorEra();
    });

    document.getElementById('carta-rareza').addEventListener('change', (e) => {
        estadoCartaActual.rareza = e.target.value;
    });

    document.getElementById('carta-simbolo').addEventListener('input', (e) => {
        estadoCartaActual.simbolo = e.target.value || "🃏";
    });

    document.getElementById('btn-randomizar').addEventListener('click', () => {
        randomizarParametros();
    });

    document.getElementById('btn-guardar-carta').addEventListener('click', guardarCartaEnSupabase);
    document.getElementById('btn-regalar-carta').addEventListener('click', regalarCartaAUsuario);
}

// Generación de semilla y selección aleatoria desde la lista
function randomizarParametros() {
    // 1. Selección aleatoria de criatura
    const criatura = BASE_CRIATURAS[Math.floor(Math.random() * BASE_CRIATURAS.length)];
    const rarezaAleatoria = RAREZAS[Math.floor(Math.random() * RAREZAS.length)];

    // 2. Asignar Semilla
    estadoCartaActual.semilla = Math.floor(Math.random() * 900000) + 100000;
    estadoCartaActual.era = criatura.era;
    estadoCartaActual.rareza = rarezaAleatoria;
    estadoCartaActual.simbolo = criatura.emoji;

    // 3. Rellenar entradas del DOM
    document.getElementById('carta-id').value = Math.floor(Math.random() * 1900) + 1;
    document.getElementById('carta-nombre').value = criatura.nombre;
    document.getElementById('carta-simbolo').value = criatura.emoji;
    document.getElementById('carta-lore').value = criatura.lore;
    document.getElementById('carta-era').value = criatura.era;
    document.getElementById('carta-rareza').value = rarezaAleatoria;

    // 4. Actualizar colores y visualizador
    actualizarPaletaPorEra();
    logStatus(`🎲 Criatura autoseleccionada: ${criatura.emoji} ${criatura.nombre}`);
}

function actualizarPaletaPorEra() {
    const era = estadoCartaActual.era;
    const s = estadoCartaActual.semilla;

    if (era === "cyber") {
        estadoCartaActual.colorPrimario = `hsl(${(s % 60) + 120}, 100%, 50%)`;
        estadoCartaActual.colorSecundario = `hsl(${(s % 40) + 280}, 80%, 30%)`;
        estadoCartaActual.colorFondo = "#05050d";
    } else if (era === "cotidianos") {
        estadoCartaActual.colorPrimario = `hsl(${(s % 50) + 30}, 90%, 55%)`;
        estadoCartaActual.colorSecundario = `hsl(${(s % 30) + 10}, 60%, 25%)`;
        estadoCartaActual.colorFondo = "#1c1917";
    } else if (era === "espacial") {
        estadoCartaActual.colorPrimario = `hsl(${(s % 80) + 180}, 100%, 60%)`;
        estadoCartaActual.colorSecundario = `hsl(${(s % 60) + 220}, 90%, 20%)`;
        estadoCartaActual.colorFondo = "#030712";
    } else { // antiguo / místico
        estadoCartaActual.colorPrimario = `hsl(${(s % 40) + 40}, 80%, 50%)`;
        estadoCartaActual.colorSecundario = `hsl(${(s % 30) + 0}, 70%, 20%)`;
        estadoCartaActual.colorFondo = "#1a0c0c";
    }

    const infoSemilla = document.getElementById('info-semilla');
    if (infoSemilla) {
        infoSemilla.innerText = `Semilla: ${estadoCartaActual.semilla} | Era: ${estadoCartaActual.era.toUpperCase()}`;
    }
}

// Bucle dinámico de animación en Canvas
function iniciarBucleRenderizado() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let tiempo = 0;

    function render() {
        tiempo += 0.03;
        dibujarCartaProcedural(ctx, canvas.width, canvas.height, estadoCartaActual, tiempo);
        animacionFrameId = requestAnimationFrame(render);
    }

    if (animacionFrameId) cancelAnimationFrame(animacionFrameId);
    render();
}

// Algoritmo matemático para renderizar la barajita
function dibujarCartaProcedural(ctx, w, h, config, tiempo = 0) {
    ctx.clearRect(0, 0, w, h);

    // 1. Fondo degradado
    const gradiente = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w);
    gradiente.addColorStop(0, config.colorSecundario);
    gradiente.addColorStop(1, config.colorFondo);
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, w, h);

    // 2. Ondulaciones matemáticas en el fondo
    ctx.save();
    ctx.strokeStyle = config.colorPrimario;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 5) {
            const y = (h / 2) + Math.sin(x * 0.03 + tiempo + i + (config.semilla % 10)) * (15 + i * 5);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();

    // 3. Marco decorativo interno
    ctx.strokeStyle = config.colorPrimario;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // 4. Símbolo central animado
    ctx.save();
    ctx.font = "42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const desvY = Math.sin(tiempo * 2) * 5;
    ctx.shadowColor = config.colorPrimario;
    ctx.shadowBlur = 12;
    ctx.fillText(config.simbolo || "🃏", w / 2, (h / 2) + desvY);
    ctx.restore();

    // 5. Etiqueta de Rareza
    ctx.fillStyle = "#ffffff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText((config.rareza || "COMÚN").toUpperCase(), w / 2, h - 25);
}

// Guardar la carta publicando la RECETA JSON en 'imagen_url'
async function guardarCartaEnSupabase() {
    if (!supabaseClient) return logStatus("Cliente Supabase desbalancado.", true);

    const id = parseInt(document.getElementById('carta-id').value);
    const nombre = document.getElementById('carta-nombre').value.trim();
    const lore = document.getElementById('carta-lore').value.trim();

    if (!id || !nombre) {
        return logStatus("El ID y el Nombre son obligatorios.", true);
    }

    // Estructuración de la Receta Matemático-Procedural
    const recetaJSON = JSON.stringify({
        procedural: true,
        semilla: estadoCartaActual.semilla,
        era: estadoCartaActual.era,
        rareza: estadoCartaActual.rareza,
        simbolo: estadoCartaActual.simbolo,
        colorPrimario: estadoCartaActual.colorPrimario,
        colorSecundario: estadoCartaActual.colorSecundario,
        colorFondo: estadoCartaActual.colorFondo
    });

    logStatus(`Publicando receta matemática de la Carta #${id}...`);

    const { error } = await supabaseClient
        .from('Cartas')
        .upsert([{
            id: id,
            nombre: nombre,
            rareza: estadoCartaActual.rareza,
            imagen_url: recetaJSON,
            lore: lore
        }], { onConflict: 'id' });

    if (error) {
        logStatus(`Error guardando en Supabase: ${error.message}`, true);
    } else {
        logStatus(`✅ ¡Carta #${id} (${nombre}) guardada exitosamente con Receta Procedural!`);
        cargarCatalogoBaseDatos();
    }
}

// Asignar carta directamente a un usuario
async function regalarCartaAUsuario() {
    if (!supabaseClient) return logStatus("Cliente Supabase desbalancado.", true);

    let usuario = document.getElementById('target-user').value.trim().replace(/^@/, '');
    const cartaId = parseInt(document.getElementById('target-carta-id').value);
    const cantidad = parseInt(document.getElementById('target-cantidad').value) || 1;

    if (!usuario || !cartaId) {
        return logStatus("El Usuario y el ID de Carta son obligatorios.", true);
    }

    logStatus(`Asignando carta #${cartaId} a @${usuario}...`);

    const { data: existente } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('usuario_id', usuario)
        .eq('carta_id', cartaId)
        .maybeSingle();

    let errorRes = null;

    if (existente) {
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: existente.cantidad + cantidad })
            .eq('id', existente.id);
        errorRes = error;
    } else {
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ usuario_id: usuario, carta_id: cartaId, cantidad: cantidad }]);
        errorRes = error;
    }

    if (errorRes) {
        logStatus(`Error al regalar carta: ${errorRes.message}`, true);
    } else {
        logStatus(`🎁 ¡Carta #${cartaId} (x${cantidad}) asignada correctamente a @${usuario}!`);
    }
}

// Cargar catálogo e interpretar la Receta para dibujarla en pequeños Canvas
async function cargarCatalogoBaseDatos() {
    if (!supabaseClient) return;

    const contenedor = document.getElementById('grid-catalogo-admin');
    if (!contenedor) return;

    contenedor.innerHTML = "<div style='font-size:7px; color:#888;'>Cargando recetas...</div>";

    const { data, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        contenedor.innerHTML = "<div style='font-size:7px; color:#ff0055;'>Error al cargar catálogo.</div>";
        return;
    }

    contenedor.innerHTML = "";

    data.forEach(carta => {
        const item = document.createElement('div');
        item.className = 'tarjeta-admin-item';

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 140;

        const ctx = canvas.getContext('2d');

        // Parseo seguro de la receta JSON
        let configCarta = {
            semilla: carta.id * 1000,
            era: "cyber",
            rareza: carta.rareza || "Común",
            simbolo: "🃏",
            colorPrimario: "#00ff66",
            colorSecundario: "#1e293b",
            colorFondo: "#000000"
        };

        try {
            if (carta.imagen_url && carta.imagen_url.startsWith('{')) {
                configCarta = JSON.parse(carta.imagen_url);
            }
        } catch (e) {
            console.warn(`Carta #${carta.id} sin formato JSON válido.`);
        }

        dibujarCartaProcedural(ctx, canvas.width, canvas.height, configCarta, 0);

        item.innerHTML = `
            <div class="info-admin-card">
                <strong>#${carta.id} ${carta.nombre}</strong>
                <span>${carta.rareza}</span>
            </div>
        `;
        item.prepend(canvas);

        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-mini-admin btn-mini-del';
        btnEliminar.innerText = 'ELIMINAR';
        btnEliminar.onclick = () => eliminarCarta(carta.id);
        item.appendChild(btnEliminar);

        contenedor.appendChild(item);
    });
}

// Eliminar carta del catálogo
async function eliminarCarta(id) {
    if (!confirm(`¿Eliminar la carta #${id} del catálogo global?`)) return;

    const { error } = await supabaseClient
        .from('Cartas')
        .delete()
        .eq('id', id);

    if (error) {
        logStatus(`Error eliminando carta: ${error.message}`, true);
    } else {
        logStatus(`🗑️ Carta #${id} eliminada.`);
        cargarCatalogoBaseDatos();
    }
}
