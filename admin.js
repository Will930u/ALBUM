// =============================================================================
// 🎴 PANEL DE ADMINISTRACIÓN Y PARSER PROCEDURAL DE PLANTILLAS
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let animacionFrameId = null;// =============================================================================
// 🎴 PANEL DE ADMINISTRACIÓN Y PARSER PROCEDURAL / IA DE PLANTILLAS
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let animacionFrameId = null;

const RAREZAS = ["Común", "Común", "Común", "Rara", "Rara", "Épica", "Legendaria"];

// Modo de renderizado actual: 'canvas' o 'ia'
let modoRenderizadoActual = "canvas";

// Estado reactivo del canvas y generador IA
let estadoCartaActual = {
    modo: "canvas",
    semilla: Math.floor(Math.random() * 900000) + 100000,
    era: "cyber",
    rareza: "Común",
    simbolo: "👾",
    colorPrimario: "#00ff66",
    colorSecundario: "#1e293b",
    colorFondo: "#0d0e15",
    promptIA: "",
    urlImagenIA: ""
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        logStatus("Supabase conectado correctamente.");
    } else {
        logStatus("Error: SDK de Supabase no disponible.", true);
    }

    inicializarControlesGUI();
    iniciarBucleRenderizado();
    contarPlantillasRegistradas();
});

function logStatus(msg, esError = false) {
    const box = document.getElementById('status-log');
    if (!box) return;
    box.style.color = esError ? "#ff0055" : "#00ff66";
    box.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
}

function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const pestanaTarget = document.getElementById(idPestana);
    if (pestanaTarget) pestanaTarget.classList.add('activa');

    const btnActivo = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(idPestana));
    if (btnActivo) btnActivo.classList.add('activo');

    if (idPestana === 'tab-catalogo') {
        cargarCatalogoBaseDatos();
    } else if (idPestana === 'tab-plantillas') {
        contarPlantillasRegistradas();
    }
}

function seleccionarModoRender(modo) {
    modoRenderizadoActual = modo;
    estadoCartaActual.modo = modo;

    const btnCanvas = document.getElementById('btn-modo-canvas');
    const btnIA = document.getElementById('btn-modo-ia');
    const canvas = document.getElementById('canvasCartaGenerada');
    const imgIA = document.getElementById('imgPollinationsPreview');
    const panelIA = document.getElementById('panel-opciones-ia');
    const btnGenIA = document.getElementById('btn-generar-ia');
    const labelModo = document.getElementById('label-modo-previa');

    if (modo === 'canvas') {
        btnCanvas.classList.add('activo');
        btnIA.classList.remove('activo');
        canvas.style.display = 'block';
        imgIA.style.display = 'none';
        panelIA.style.display = 'none';
        btnGenIA.style.display = 'none';
        labelModo.innerText = 'EN VIVO: RENDERIZADO CANVAS MATEMÁTICO';
    } else {
        btnIA.classList.add('activo');
        btnCanvas.classList.remove('activo');
        canvas.style.display = 'none';
        imgIA.style.display = 'block';
        panelIA.style.display = 'block';
        btnGenIA.style.display = 'block';
        labelModo.innerText = 'EN VIVO: GENERADOR POLLINATIONS.AI';

        if (!estadoCartaActual.urlImagenIA) {
            generarImagenPollinationsDirecta();
        }
    }
}

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

    document.getElementById('btn-randomizar').addEventListener('click', randomizarDesdePlantillas);
    document.getElementById('btn-guardar-carta').addEventListener('click', guardarCartaEnSupabase);
    document.getElementById('btn-regalar-carta').addEventListener('click', regalarCartaAUsuario);
    document.getElementById('btn-procesar-plantillas').addEventListener('click', parsearYGuardarPlantillas);
    document.getElementById('btn-limpiar-plantillas').addEventListener('click', vaciarTablaPlantillas);
}

// =============================================================================
// 🤖 INTEGRACIÓN GENERACIÓN DE IMÁGENES POLLINATIONS.AI
// =============================================================================

function construirPromptIA() {
    const custom = document.getElementById('prompt-ia-custom').value.trim();
    if (custom) return custom;

    const nombre = document.getElementById('carta-nombre').value.trim() || "creature";
    const simbolo = estadoCartaActual.simbolo || "";
    return `3d emoji style of ${nombre} ${simbolo}, vibrant colors, smooth glossy surface, centered, isolated on white background, vector high quality, 8k render`;
}

function generarImagenPollinationsDirecta() {
    const prompt = construirPromptIA();
    const seed = estadoCartaActual.semilla;
    const promptEncoded = encodeURIComponent(prompt);

    const spinner = document.getElementById('spinnerIA');
    const imgElement = document.getElementById('imgPollinationsPreview');

    if (spinner) spinner.style.display = 'block';
    logStatus("Generando imagen desde Pollinations.ai...");

    const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=512&height=512&seed=${seed}&nologo=true`;

    imgElement.onload = () => {
        if (spinner) spinner.style.display = 'none';
        estadoCartaActual.urlImagenIA = url;
        estadoCartaActual.promptIA = prompt;
        logStatus("✅ Imagen de Pollinations.ai renderizada con éxito.");
    };

    imgElement.onerror = () => {
        if (spinner) spinner.style.display = 'none';
        logStatus("X Error al cargar la imagen desde Pollinations.ai.", true);
    };

    imgElement.src = url;
}

// =============================================================================
// ⚙️ PARSER INTELIGENTE DE TEXTO Y MAPEO A BASE DE DATOS
// =============================================================================

function determinarEraPorZona(zonaNombre) {
    const txt = zonaNombre.toLowerCase();
    if (txt.includes("caos") || txt.includes("noche") || txt.includes("pantano") || txt.includes("prehistóricos")) {
        return "antiguo";
    } else if (txt.includes("poblado") || txt.includes("granja") || txt.includes("selva") || txt.includes("bosques")) {
        return "cotidianos";
    } else if (txt.includes("cielos") || txt.includes("océano") || txt.includes("trono")) {
        return "espacial";
    }
    return "cyber";
}

async function parsearYGuardarPlantillas() {
    if (!supabaseClient) return logStatus("Supabase no conectado.", true);

    const textoRaw = document.getElementById('textarea-plantillas').value.trim();
    if (!textoRaw) {
        return logStatus("El campo de texto está vacío. Pega la lista primero.", true);
    }

    logStatus("Iniciando procesamiento de texto...");

    const lineas = textoRaw.split('\n');
    let zonaActual = "Zona Desconocida";
    let eraActual = "cotidianos";
    const registrosAInsertar = [];

    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

    for (let linea of lineas) {
        linea = linea.trim();
        if (!linea) continue;

        if (!linea.includes(":") && !linea.includes("/")) {
            zonaActual = linea;
            eraActual = determinarEraPorZona(zonaActual);
            continue;
        }

        const partes = linea.split(':');
        const lore = partes.length > 1 ? partes[1].trim() : "Criatura misteriosa.";
        const items = partes[0].split('/');

        for (let item of items) {
            item = item.trim();
            const emojisEncontrados = item.match(emojiRegex);
            const emoji = emojisEncontrados ? emojisEncontrados[0] : "👾";
            const nombre = item.replace(emojiRegex, '').trim();

            if (nombre) {
                registrosAInsertar.push({
                    emoji: emoji,
                    nombre: nombre,
                    lore: lore,
                    zona: zonaActual,
                    era_sugerida: eraActual
                });
            }
        }
    }

    if (registrosAInsertar.length === 0) {
        return logStatus("No se pudieron extraer elementos válidos del texto.", true);
    }

    logStatus(`Procesadas ${registrosAInsertar.length} plantillas. Guardando en Supabase...`);

    const { error } = await supabaseClient
        .from('plantillas_criaturas')
        .insert(registrosAInsertar);

    if (error) {
        logStatus(`Error al guardar plantillas: ${error.message}`, true);
    } else {
        logStatus(`✅ ¡Se guardaron exitosamente ${registrosAInsertar.length} plantillas!`);
        document.getElementById('textarea-plantillas').value = "";
        contarPlantillasRegistradas();
    }
}

async function contarPlantillasRegistradas() {
    if (!supabaseClient) return;

    const { count, error } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*', { count: 'exact', head: true });

    if (!error) {
        const el = document.getElementById('count-plantillas');
        if (el) el.innerText = count || 0;
    }
}

async function vaciarTablaPlantillas() {
    if (!supabaseClient) return;
    if (!confirm("¿Seguro que deseas eliminar TODAS las plantillas registradas?")) return;

    const { error } = await supabaseClient
        .from('plantillas_criaturas')
        .delete()
        .neq('id', 0);

    if (error) {
        logStatus(`Error al vaciar tabla: ${error.message}`, true);
    } else {
        logStatus("🗑️ Tabla de plantillas vaciada completamente.");
        contarPlantillasRegistradas();
    }
}

// =============================================================================
// 🎲 SELECCIÓN ALEATORIA DESDE LA TABLA DE PLANTILLAS
// =============================================================================

async function randomizarDesdePlantillas() {
    if (!supabaseClient) return logStatus("Supabase no conectado.", true);

    logStatus("Consultando plantilla aleatoria...");

    const { count, error: errCount } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*', { count: 'exact', head: true });

    if (errCount || !count || count === 0) {
        return logStatus("No hay plantillas registradas. Ve a '📋 PLANTILLAS' para cargar la lista.", true);
    }

    const randomIndex = Math.floor(Math.random() * count);

    const { data, error } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*')
        .range(randomIndex, randomIndex)
        .single();

    if (error || !data) {
        return logStatus("Error al seleccionar plantilla aleatoria.", true);
    }

    const rarezaAleatoria = RAREZAS[Math.floor(Math.random() * RAREZAS.length)];

    estadoCartaActual.semilla = Math.floor(Math.random() * 900000) + 100000;
    estadoCartaActual.era = data.era_sugerida || "cyber";
    estadoCartaActual.rareza = rarezaAleatoria;
    estadoCartaActual.simbolo = data.emoji;

    document.getElementById('carta-id').value = Math.floor(Math.random() * 1900) + 1;
    document.getElementById('carta-nombre').value = data.nombre;
    document.getElementById('carta-simbolo').value = data.emoji;
    document.getElementById('carta-lore').value = data.lore;
    document.getElementById('carta-era').value = data.era_sugerida;
    document.getElementById('carta-rareza').value = rarezaAleatoria;

    actualizarPaletaPorEra();
    logStatus(`🎲 Plantilla seleccionada: ${data.emoji} ${data.nombre} (${data.zona})`);

    if (modoRenderizadoActual === 'ia') {
        generarImagenPollinationsDirecta();
    }
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
    } else {
        estadoCartaActual.colorPrimario = `hsl(${(s % 40) + 40}, 80%, 50%)`;
        estadoCartaActual.colorSecundario = `hsl(${(s % 30) + 0}, 70%, 20%)`;
        estadoCartaActual.colorFondo = "#1a0c0c";
    }

    const infoSemilla = document.getElementById('info-semilla');
    if (infoSemilla) {
        infoSemilla.innerText = `Semilla: ${estadoCartaActual.semilla} | Era: ${estadoCartaActual.era.toUpperCase()}`;
    }
}

// =============================================================================
// 🎨 RENDERIZADO PROCEDURAL CANVAS
// =============================================================================

function iniciarBucleRenderizado() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let tiempo = 0;

    function render() {
        tiempo += 0.03;
        if (modoRenderizadoActual === 'canvas') {
            dibujarCartaProcedural(ctx, canvas.width, canvas.height, estadoCartaActual, tiempo);
        }
        animacionFrameId = requestAnimationFrame(render);
    }

    if (animacionFrameId) cancelAnimationFrame(animacionFrameId);
    render();
}

function dibujarCartaProcedural(ctx, w, h, config, tiempo = 0) {
    ctx.clearRect(0, 0, w, h);

    const gradiente = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w);
    gradiente.addColorStop(0, config.colorSecundario || "#1e293b");
    gradiente.addColorStop(1, config.colorFondo || "#000000");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = config.colorPrimario || "#00ff66";
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

    ctx.strokeStyle = config.colorPrimario || "#00ff66";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.save();
    ctx.font = "42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const desvY = Math.sin(tiempo * 2) * 5;
    ctx.shadowColor = config.colorPrimario || "#00ff66";
    ctx.shadowBlur = 12;
    ctx.fillText(config.simbolo || "🃏", w / 2, (h / 2) + desvY);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText((config.rareza || "COMÚN").toUpperCase(), w / 2, h - 25);
}

// =============================================================================
// 💾 GUARDADO Y ASIGNACIÓN DE CARTAS
// =============================================================================

async function guardarCartaEnSupabase() {
    if (!supabaseClient) return logStatus("Cliente Supabase desbalancado.", true);

    const id = parseInt(document.getElementById('carta-id').value);
    const nombre = document.getElementById('carta-nombre').value.trim();
    const lore = document.getElementById('carta-lore').value.trim();

    if (!id || !nombre) {
        return logStatus("El ID y el Nombre son obligatorios.", true);
    }

    const recetaJSON = JSON.stringify({
        modo: modoRenderizadoActual,
        procedural: modoRenderizadoActual === 'canvas',
        semilla: estadoCartaActual.semilla,
        era: estadoCartaActual.era,
        rareza: estadoCartaActual.rareza,
        simbolo: estadoCartaActual.simbolo,
        colorPrimario: estadoCartaActual.colorPrimario,
        colorSecundario: estadoCartaActual.colorSecundario,
        colorFondo: estadoCartaActual.colorFondo,
        urlImagenIA: estadoCartaActual.urlImagenIA,
        promptIA: estadoCartaActual.promptIA
    });

    logStatus(`Publicando receta de la Carta #${id}...`);

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
        logStatus(`✅ ¡Carta #${id} (${nombre}) guardada en la base de datos!`);
        cargarCatalogoBaseDatos();
    }
}

async function regalarCartaAUsuario() {
    if (!supabaseClient) return logStatus("Cliente Supabase desbalancado.", true);

    let usuario = document.getElementById('target-user').value.trim().replace(/^@/, '');
    const cartaId = parseInt(document.getElementById('target-carta-id').value);
    const cantidad = parseInt(document.getElementById('target-cantidad').value) || 1;

    if (!usuario || !cartaId) {
        return logStatus("El Usuario y el ID son obligatorios.", true);
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
        logStatus(`🎁 ¡Carta #${cartaId} (x${cantidad}) asignada a @${usuario}!`);
    }
}

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

        let configCarta = {
            modo: "canvas",
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
            console.warn(`Carta #${carta.id} sin receta válida.`);
        }

        if (configCarta.modo === 'ia' && configCarta.urlImagenIA) {
            const img = document.createElement('img');
            img.src = configCarta.urlImagenIA;
            img.alt = carta.nombre;
            item.appendChild(img);
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 140;
            const ctx = canvas.getContext('2d');
            dibujarCartaProcedural(ctx, canvas.width, canvas.height, configCarta, 0);
            item.appendChild(canvas);
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-admin-card';
        infoDiv.innerHTML = `
            <strong>#${carta.id} ${carta.nombre}</strong>
            <span>${carta.rareza}</span>
        `;
        item.appendChild(infoDiv);

        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-mini-admin btn-mini-del';
        btnEliminar.innerText = 'ELIMINAR';
        btnEliminar.onclick = () => eliminarCarta(carta.id);
        item.appendChild(btnEliminar);

        contenedor.appendChild(item);
    });
}

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

const RAREZAS = ["Común", "Común", "Común", "Rara", "Rara", "Épica", "Legendaria"];

// Estado reactivo del canvas
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
        logStatus("Supabase conectado correctamente.");
    } else {
        logStatus("Error: SDK de Supabase no disponible.", true);
    }

    inicializarControlesGUI();
    iniciarBucleRenderizado();
    contarPlantillasRegistradas();
});

function logStatus(msg, esError = false) {
    const box = document.getElementById('status-log');
    if (!box) return;
    box.style.color = esError ? "#ff0055" : "#00ff66";
    box.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
}

function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const pestanaTarget = document.getElementById(idPestana);
    if (pestanaTarget) pestanaTarget.classList.add('activa');

    const btnActivo = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(idPestana));
    if (btnActivo) btnActivo.classList.add('activo');

    if (idPestana === 'tab-catalogo') {
        cargarCatalogoBaseDatos();
    } else if (idPestana === 'tab-plantillas') {
        contarPlantillasRegistradas();
    }
}

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

    document.getElementById('btn-randomizar').addEventListener('click', randomizarDesdePlantillas);
    document.getElementById('btn-guardar-carta').addEventListener('click', guardarCartaEnSupabase);
    document.getElementById('btn-regalar-carta').addEventListener('click', regalarCartaAUsuario);
    document.getElementById('btn-procesar-plantillas').addEventListener('click', parsearYGuardarPlantillas);
    document.getElementById('btn-limpiar-plantillas').addEventListener('click', vaciarTablaPlantillas);
}

// =============================================================================
// ⚙️ PARSER INTELIGENTE DE TEXTO Y MAPEO A BASE DE DATOS
// =============================================================================

function determinarEraPorZona(zonaNombre) {
    const txt = zonaNombre.toLowerCase();
    if (txt.includes("caos") || txt.includes("noche") || txt.includes("pantano") || txt.includes("prehistóricos")) {
        return "antiguo";
    } else if (txt.includes("poblado") || txt.includes("granja") || txt.includes("selva") || txt.includes("bosques")) {
        return "cotidianos";
    } else if (txt.includes("cielos") || txt.includes("océano") || txt.includes("trono")) {
        return "espacial";
    }
    return "cyber";
}

async function parsearYGuardarPlantillas() {
    if (!supabaseClient) return logStatus("Supabase no conectado.", true);

    const textoRaw = document.getElementById('textarea-plantillas').value.trim();
    if (!textoRaw) {
        return logStatus("El campo de texto está vacío. Pega la lista primero.", true);
    }

    logStatus("Iniciando procesamiento de texto...");

    const lineas = textoRaw.split('\n');
    let zonaActual = "Zona Desconocida";
    let eraActual = "cotidianos";
    const registrosAInsertar = [];

    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;

    for (let linea of lineas) {
        linea = linea.trim();
        if (!linea) continue;

        if (!linea.includes(":") && !linea.includes("/")) {
            zonaActual = linea;
            eraActual = determinarEraPorZona(zonaActual);
            continue;
        }

        const partes = linea.split(':');
        const lore = partes.length > 1 ? partes[1].trim() : "Criatura misteriosa.";
        const items = partes[0].split('/');

        for (let item of items) {
            item = item.trim();
            const emojisEncontrados = item.match(emojiRegex);
            const emoji = emojisEncontrados ? emojisEncontrados[0] : "👾";
            const nombre = item.replace(emojiRegex, '').trim();

            if (nombre) {
                registrosAInsertar.push({
                    emoji: emoji,
                    nombre: nombre,
                    lore: lore,
                    zona: zonaActual,
                    era_sugerida: eraActual
                });
            }
        }
    }

    if (registrosAInsertar.length === 0) {
        return logStatus("No se pudieron extraer elementos válidos del texto.", true);
    }

    logStatus(`Procesadas ${registrosAInsertar.length} plantillas. Guardando en Supabase...`);

    const { error } = await supabaseClient
        .from('plantillas_criaturas')
        .insert(registrosAInsertar);

    if (error) {
        logStatus(`Error al guardar plantillas: ${error.message}`, true);
    } else {
        logStatus(`✅ ¡Se guardaron exitosamente ${registrosAInsertar.length} plantillas!`);
        document.getElementById('textarea-plantillas').value = "";
        contarPlantillasRegistradas();
    }
}

async function contarPlantillasRegistradas() {
    if (!supabaseClient) return;

    const { count, error } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*', { count: 'exact', head: true });

    if (!error) {
        const el = document.getElementById('count-plantillas');
        if (el) el.innerText = count || 0;
    }
}

async function vaciarTablaPlantillas() {
    if (!supabaseClient) return;
    if (!confirm("¿Seguro que deseas eliminar TODAS las plantillas registradas?")) return;

    const { error } = await supabaseClient
        .from('plantillas_criaturas')
        .delete()
        .neq('id', 0);

    if (error) {
        logStatus(`Error al vaciar tabla: ${error.message}`, true);
    } else {
        logStatus("🗑️ Tabla de plantillas vaciada completamente.");
        contarPlantillasRegistradas();
    }
}

// =============================================================================
// 🎲 SELECCIÓN ALEATORIA DESDE LA TABLA DE PLANTILLAS
// =============================================================================

async function randomizarDesdePlantillas() {
    if (!supabaseClient) return logStatus("Supabase no conectado.", true);

    logStatus("Consultando plantilla aleatoria...");

    const { count, error: errCount } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*', { count: 'exact', head: true });

    if (errCount || !count || count === 0) {
        return logStatus("No hay plantillas registradas. Ve a '📋 PLANTILLAS' para cargar la lista.", true);
    }

    const randomIndex = Math.floor(Math.random() * count);

    const { data, error } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*')
        .range(randomIndex, randomIndex)
        .single();

    if (error || !data) {
        return logStatus("Error al seleccionar plantilla aleatoria.", true);
    }

    const rarezaAleatoria = RAREZAS[Math.floor(Math.random() * RAREZAS.length)];

    estadoCartaActual.semilla = Math.floor(Math.random() * 900000) + 100000;
    estadoCartaActual.era = data.era_sugerida || "cyber";
    estadoCartaActual.rareza = rarezaAleatoria;
    estadoCartaActual.simbolo = data.emoji;

    document.getElementById('carta-id').value = Math.floor(Math.random() * 1900) + 1;
    document.getElementById('carta-nombre').value = data.nombre;
    document.getElementById('carta-simbolo').value = data.emoji;
    document.getElementById('carta-lore').value = data.lore;
    document.getElementById('carta-era').value = data.era_sugerida;
    document.getElementById('carta-rareza').value = rarezaAleatoria;

    actualizarPaletaPorEra();
    logStatus(`🎲 Plantilla seleccionada: ${data.emoji} ${data.nombre} (${data.zona})`);
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
    } else {
        estadoCartaActual.colorPrimario = `hsl(${(s % 40) + 40}, 80%, 50%)`;
        estadoCartaActual.colorSecundario = `hsl(${(s % 30) + 0}, 70%, 20%)`;
        estadoCartaActual.colorFondo = "#1a0c0c";
    }

    const infoSemilla = document.getElementById('info-semilla');
    if (infoSemilla) {
        infoSemilla.innerText = `Semilla: ${estadoCartaActual.semilla} | Era: ${estadoCartaActual.era.toUpperCase()}`;
    }
}

// =============================================================================
// 🎨 RENDERIZADO PROCEDURAL CANVAS
// =============================================================================

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

function dibujarCartaProcedural(ctx, w, h, config, tiempo = 0) {
    ctx.clearRect(0, 0, w, h);

    const gradiente = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w);
    gradiente.addColorStop(0, config.colorSecundario);
    gradiente.addColorStop(1, config.colorFondo);
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, w, h);

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

    ctx.strokeStyle = config.colorPrimario;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.save();
    ctx.font = "42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const desvY = Math.sin(tiempo * 2) * 5;
    ctx.shadowColor = config.colorPrimario;
    ctx.shadowBlur = 12;
    ctx.fillText(config.simbolo || "🃏", w / 2, (h / 2) + desvY);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText((config.rareza || "COMÚN").toUpperCase(), w / 2, h - 25);
}

// =============================================================================
// 💾 GUARDADO Y ASIGNACIÓN DE CARTAS
// =============================================================================

async function guardarCartaEnSupabase() {
    if (!supabaseClient) return logStatus("Cliente Supabase desbalancado.", true);

    const id = parseInt(document.getElementById('carta-id').value);
    const nombre = document.getElementById('carta-nombre').value.trim();
    const lore = document.getElementById('carta-lore').value.trim();

    if (!id || !nombre) {
        return logStatus("El ID y el Nombre son obligatorios.", true);
    }

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

    logStatus(`Publicando receta de la Carta #${id}...`);

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
        logStatus(`✅ ¡Carta #${id} (${nombre}) guardada en la base de datos!`);
        cargarCatalogoBaseDatos();
    }
}

async function regalarCartaAUsuario() {
    if (!supabaseClient) return logStatus("Cliente Supabase desbalancado.", true);

    let usuario = document.getElementById('target-user').value.trim().replace(/^@/, '');
    const cartaId = parseInt(document.getElementById('target-carta-id').value);
    const cantidad = parseInt(document.getElementById('target-cantidad').value) || 1;

    if (!usuario || !cartaId) {
        return logStatus("El Usuario y el ID son obligatorios.", true);
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
        logStatus(`🎁 ¡Carta #${cartaId} (x${cantidad}) asignada a @${usuario}!`);
    }
}

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
            console.warn(`Carta #${carta.id} sin receta válida.`);
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
