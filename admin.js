// =============================================================================
// 🎴 PANEL DE ADMINISTRACIÓN Y MOTOR DE GENERACIÓN PROCEDURAL EN VIVO (2026)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let animacionFrameId = null;

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

// Generación de semilla y colores aleatorios
function randomizarParametros() {
    estadoCartaActual.semilla = Math.floor(Math.random() * 900000) + 100000;
    actualizarPaletaPorEra();
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
    } else { // antiguo
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
    ctx.fillText(config.rareza.toUpperCase(), w / 2, h - 25);
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
            imagen_url: recetaJSON, // Guarda la receta numérico-matemática en lugar del archivo PNG
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

        // Renderizado inicial sin animación para miniaturas
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
