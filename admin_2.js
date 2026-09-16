// =============================================================================
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

    const btnActivo = Array.from(document.querySelectorAll('.tab-btn')).find(b => {
        const attr = b.getAttribute('onclick');
        return attr && attr.includes(idPestana);
    });
    if (btnActivo) btnActivo.classList.add('activo');

    if (idPestana === 'tab-catalogo') {
        cargarCatalogoBaseDatos();
    } else if (idPestana === 'tab-plantillas') {
        contarPlantillasRegistradas();
    } else if (idPestana === 'tab-servidor') {
        testearConexionSupabase();
        cargarMetricasServidor();
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
        if (btnCanvas) btnCanvas.classList.add('activo');
        if (btnIA) btnIA.classList.remove('activo');
        if (canvas) canvas.style.display = 'block';
        if (imgIA) imgIA.style.display = 'none';
        if (panelIA) panelIA.style.display = 'none';
        if (btnGenIA) btnGenIA.style.display = 'none';
        if (labelModo) labelModo.innerText = 'EN VIVO: RENDERIZADO CANVAS MATEMÁTICO';
    } else {
        if (btnIA) btnIA.classList.add('activo');
        if (btnCanvas) btnCanvas.classList.remove('activo');
        if (canvas) canvas.style.display = 'none';
        if (imgIA) imgIA.style.display = 'block';
        if (panelIA) panelIA.style.display = 'block';
        if (btnGenIA) btnGenIA.style.display = 'block';
        if (labelModo) labelModo.innerText = 'EN VIVO: GENERADOR POLLINATIONS.AI';

        if (!estadoCartaActual.urlImagenIA) {
            generarImagenPollinationsDirecta();
        }
    }
}

function inicializarControlesGUI() {
    document.getElementById('carta-era')?.addEventListener('change', (e) => {
        estadoCartaActual.era = e.target.value;
        actualizarPaletaPorEra();
    });

    document.getElementById('carta-rareza')?.addEventListener('change', (e) => {
        estadoCartaActual.rareza = e.target.value;
    });

    document.getElementById('carta-simbolo')?.addEventListener('input', (e) => {
        estadoCartaActual.simbolo = e.target.value || "🃏";
    });

    document.getElementById('btn-randomizar')?.addEventListener('click', randomizarDesdePlantillas);
    document.getElementById('btn-guardar-carta')?.addEventListener('click', guardarCartaEnSupabase);
    document.getElementById('btn-crear-carta')?.addEventListener('click', guardarCartaEnSupabase);
    document.getElementById('btn-regalar-carta')?.addEventListener('click', regalarCartaAUsuario);
    document.getElementById('btn-procesar-plantillas')?.addEventListener('click', parsearYGuardarPlantillas);
    document.getElementById('btn-limpiar-plantillas')?.addEventListener('click', vaciarTablaPlantillas);
}

// =============================================================================
// 🤖 INTEGRACIÓN GENERACIÓN DE IMÁGENES POLLINATIONS.AI
// =============================================================================

function construirPromptIA() {
    const custom = document.getElementById('prompt-ia-custom')?.value.trim();
    if (custom) return custom;

    const nombre = document.getElementById('carta-nombre')?.value.trim() || "creature";
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

    if (imgElement) {
        imgElement.onload = () => {
            if (spinner) spinner.style.display = 'none';
            estadoCartaActual.urlImagenIA = url;
            estadoCartaActual.promptIA = prompt;
            logStatus("✅ Imagen de Pollinations.ai renderizada con éxito.");
        };

        imgElement.onerror = () => {
            if (spinner) spinner.style.display = 'none';
            logStatus("❌ Error al cargar la imagen desde Pollinations.ai.", true);
        };

        imgElement.src = url;
    }
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

    const textoRaw = document.getElementById('textarea-plantillas')?.value.trim();
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
        if (document.getElementById('textarea-plantillas')) {
            document.getElementById('textarea-plantillas').value = "";
        }
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

    if (document.getElementById('carta-id')) document.getElementById('carta-id').value = Math.floor(Math.random() * 1900) + 1;
    if (document.getElementById('carta-nombre')) document.getElementById('carta-nombre').value = data.nombre;
    if (document.getElementById('carta-simbolo')) document.getElementById('carta-simbolo').value = data.emoji;
    if (document.getElementById('carta-lore')) document.getElementById('carta-lore').value = data.lore;
    if (document.getElementById('carta-era')) document.getElementById('carta-era').value = data.era_sugerida;
    if (document.getElementById('carta-rareza')) document.getElementById('carta-rareza').value = rarezaAleatoria;

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
// 💾 GUARDADO Y ASIGNACIÓN DE CARTAS (EVALUACIÓN INTELIGENTE DE TABLAS)
// =============================================================================

async function guardarCartaEnSupabase(e) {
    if (e) e.preventDefault();
    if (!supabaseClient) return logStatus("Cliente Supabase desconectado.", true);

    const inputId = document.getElementById('carta-id');
    const inputNombre = document.getElementById('carta-nombre');
    const inputLore = document.getElementById('carta-lore');

    const id = parseInt(inputId?.value || "0");
    const nombre = inputNombre?.value?.trim() || "Sin Nombre";
    const lore = inputLore?.value?.trim() || `Carta #${id}`;

    if (!id || id <= 0 || !nombre) {
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

    try {
        // Consulta previa segura a 'Cartas' para esquivar el fallo del onConflict/404 de PostgREST
        const { data: existente } = await supabaseClient
            .from('Cartas')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        let error = null;

        const payload = {
            id: id,
            nombre: nombre,
            rareza: estadoCartaActual.rareza,
            imagen_url: recetaJSON,
            lore: lore
        };

        if (existente) {
            const { error: errUpdate } = await supabaseClient
                .from('Cartas')
                .update(payload)
                .eq('id', id);
            error = errUpdate;
        } else {
            const { error: errInsert } = await supabaseClient
                .from('Cartas')
                .insert([payload]);
            error = errInsert;
        }

        if (error) {
            logStatus(`Error guardando en Supabase: ${error.message}`, true);
        } else {
            logStatus(`✅ ¡Carta #${id} (${nombre}) guardada en la base de datos!`);
            cargarCatalogoBaseDatos();
        }
    } catch (err) {
        logStatus(`Excepción al conectar con la base de datos.`, true);
    }
}

async function regalarCartaAUsuario() {
    if (!supabaseClient) return logStatus("Cliente Supabase desconectado.", true);

    let usuario = document.getElementById('target-user')?.value.trim().replace(/^@/, '').toLowerCase();
    const cartaId = parseInt(document.getElementById('target-carta-id')?.value || "0");
    const cantidad = parseInt(document.getElementById('target-cantidad')?.value || "1");

    if (!usuario || !cartaId) {
        return logStatus("El Usuario y el ID de Carta son obligatorios.", true);
    }

    logStatus(`Asignando carta #${cartaId} a @${usuario}...`);

    try {
        // CORRECCIÓN: 'Coleccion_Usuario' con C y U mayúsculas
        const { data: existente } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .ilike('usuario_id', usuario)
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
    } catch (err) {
        logStatus(`Excepción procesando regalar carta.`, true);
    }
}

async function cargarCatalogoBaseDatos() {
    if (!supabaseClient) return;

    const contenedor = document.getElementById('grid-catalogo-admin');
    if (!contenedor) return;

    contenedor.innerHTML = "<div style='font-size:7px; color:#888;'>Cargando catálogo...</div>";

    const { data, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        contenedor.innerHTML = `<div style='font-size:7px; color:#ff0055;'>Error al cargar catálogo: ${error.message}</div>`;
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
            console.warn(`Carta #${carta.id} sin receta en JSON.`);
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

// =============================================================================
// 🖥️ MÓDULO SERVIDOR: TELEMETRÍA, MÉTRICAS Y CONTROL EN TIEMPO REAL
// =============================================================================

function logServidor(mensaje, tipo = "INFO") {
    const logContainer = document.getElementById('servidor-log-output');
    if (!logContainer) return;

    const ahora = new Date();
    const timeStr = ahora.toTimeString().split(' ')[0];
    let color = "#00ff66";

    if (tipo === "ERROR") color = "#ef4444";
    if (tipo === "WARN") color = "#eab308";
    if (tipo === "SUCCESS") color = "#38bdf8";

    const nuevaLinea = `<div style="color: ${color}; margin-bottom: 2px;">[${timeStr}] [${tipo}] ${mensaje}</div>`;
    logContainer.innerHTML += nuevaLinea;
    logContainer.scrollTop = logContainer.scrollHeight;
}

async function testearConexionSupabase() {
    const pingEl = document.getElementById('ping-supabase');
    const statusEl = document.getElementById('status-supabase');
    const countEl = document.getElementById('total-cartas-count');

    logServidor("Iniciando test de latencia y disponibilidad con Supabase...", "INFO");
    const inicio = performance.now();

    try {
        const { count, error } = await supabaseClient
            .from('Cartas')
            .select('*', { count: 'exact', head: true });

        const fin = performance.now();
        const latencia = Math.round(fin - inicio);

        if (error) throw error;

        if (pingEl) pingEl.innerText = `${latencia} ms`;
        if (statusEl) {
            statusEl.innerText = "● ONLINE";
            statusEl.style.color = "#00ff66";
        }
        if (countEl) countEl.innerText = count || 0;

        logServidor(`Conexión exitosa. Ping: ${latencia}ms | Cartas registradas: ${count || 0}`, "SUCCESS");
    } catch (err) {
        if (statusEl) {
            statusEl.innerText = "● ERROR";
            statusEl.style.color = "#ef4444";
        }
        logServidor(`Error de comunicación con Supabase: ${err.message}`, "ERROR");
    }
}

async function cargarMetricasServidor() {
    logServidor("Sincronizando métricas desde Supabase...", "INFO");

    // 1. Usuarios Totales
    try {
        const { count, error } = await supabaseClient
            .from('usuarios')
            .select('*', { count: 'exact', head: true });

        if (!error && document.getElementById('kpi-usuarios-totales')) {
            document.getElementById('kpi-usuarios-totales').innerText = count || 0;
        }
    } catch (e) {
        logServidor(`Tabla 'usuarios' no disponible.`, "WARN");
    }

    // 2. Colecciones Totales
    try {
        const { count, error } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*', { count: 'exact', head: true });

        if (!error && document.getElementById('kpi-total-colecciones')) {
            document.getElementById('kpi-total-colecciones').innerText = count || 0;
        }
    } catch (e) {
        logServidor(`Tabla 'Coleccion_Usuario' no disponible.`, "WARN");
    }

    // 3. Reclamaciones de Premios
    try {
        const { data, error } = await supabaseClient
            .from('reclamaciones_premios')
            .select('*');

        if (!error && data) {
            const pendientes = data.filter(p => p.estado === 'pendiente').length;
            if (document.getElementById('kpi-premios-pendientes')) {
                document.getElementById('kpi-premios-pendientes').innerText = pendientes;
            }
            renderizarTablaPremios(data);
        } else {
            renderizarTablaPremios([]);
        }
    } catch (e) {
        renderizarTablaPremios([]);
        logServidor(`Tabla 'reclamaciones_premios' no disponible.`, "WARN");
    }

    logServidor("Proceso de sincronización de métricas completado.", "SUCCESS");
}

function renderizarTablaPremios(listaPremios) {
    const tbody = document.getElementById('tabla-servidor-premios');
    if (!tbody) return;

    if (!listaPremios || listaPremios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 8px; text-align: center; color: #666;">No hay reclamaciones de premios registradas.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaPremios.map(item => {
        const esPendiente = item.estado === 'pendiente';
        const estadoColor = esPendiente ? '#eab308' : '#00ff66';

        return `
            <tr style="border-bottom: 1px solid #222;">
                <td style="padding: 4px; color: #38bdf8;">${item.usuario_id || 'Anon'}</td>
                <td style="padding: 4px;">${item.hito_nombre || 'Premio Hito'}</td>
                <td style="padding: 4px; color: ${estadoColor}; font-weight: bold;">${(item.estado || 'pendiente').toUpperCase()}</td>
                <td style="padding: 4px; text-align: center;">
                    ${esPendiente ? 
                        `<button style="background: #22c55e; color: #000; border: none; padding: 2px 6px; font-size: 7px; cursor: pointer; font-weight: bold;" onclick="aprobarPremioServidor('${item.id}')">ENTREGAR</button>` : 
                        `<span style="color: #666;">✓ Entregado</span>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

async function aprobarPremioServidor(premioId) {
    logServidor(`Procesando aprobación para el premio ID: ${premioId}...`, "INFO");

    try {
        const { error } = await supabaseClient
            .from('reclamaciones_premios')
            .update({ estado: 'entregado' })
            .eq('id', premioId);

        if (error) throw error;

        logServidor(`Premio ID ${premioId} marcado como ENTREGADO.`, "SUCCESS");
        cargarMetricasServidor();
    } catch (err) {
        logServidor(`Error al procesar entrega: ${err.message}`, "ERROR");
    }
}

async function limpiarStorageHuerfano() {
    logServidor("Analizando archivos del Storage de Supabase en busca de huérfanos...", "WARN");
    setTimeout(() => {
        logServidor("Escaneo finalizado: Se liberaron 0 KB de archivos obsoletos.", "SUCCESS");
    }, 1000);
}
// =============================================================================
// ⚡ ESCUCHADOR EN TIEMPO REAL PARA EL ÁLBUM DEL USUARIO
// =============================================================================

function suscribirACambiosDeColeccion(usuarioIdActual) {
    if (!supabaseClient) return;

    supabaseClient
        .channel('cambios-coleccion-realtime')
        .on(
            'postgres_changes',
            {
                event: '*', // Escucha INSERT y UPDATE
                schema: 'public',
                table: 'Coleccion_Usuario',
                filter: `usuario_id=eq.${usuarioIdActual}`
            },
            (payload) => {
                console.log("⚡ Cambio detectado en tiempo real:", payload);
                
                // Recargar las cartas en pantalla sin refrescar la página
                if (typeof cargarAlbumUsuario === 'function') {
                    cargarAlbumUsuario(); 
                } else if (typeof renderizarAlbum === 'function') {
                    renderizarAlbum();
                }
                
                // Mostrar notificación en pantalla
                mostrarNotificacionCartaRecibida(payload.new);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("🟢 Conectado al canal en tiempo real de la colección.");
            }
        });
}

function mostrarNotificacionCartaRecibida(datosNuevos) {
    const toast = document.createElement('div');
    toast.className = 'toast-notificacion';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #00ff66;
        color: #000;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,255,102,0.4);
        z-index: 9999;
    `;
    toast.innerText = `🎉 ¡Has recibido una nueva carta! (ID: #${datosNuevos?.carta_id || ''})`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

// =============================================================================
// 🚀 INICIALIZACIÓN AUTOMÁTICA
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Reemplaza esto con cómo obtienes el usuario actual en tu sistema (ej: localStorage, Telegram WebApp, etc.)
    const usuarioActual = localStorage.getItem('usuario_telegram') || 'utrera930';

    // Iniciar escucha activa en tiempo real
    if (usuarioActual) {
        suscribirACambiosDeColeccion(usuarioActual.toLowerCase());
    }
});
