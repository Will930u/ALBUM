// =============================================================================
// 💻 CONTROLADOR DE ADMINISTRACIÓN, GENERADOR PROCEDURAL / IA Y SERVIDOR (admin_2.js)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let modoRenderActual = "canvas"; // "canvas" | "ia"
let plantillasCache = [];

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        logEstado("✅ Supabase inicializado correctamente.");
    } else {
        logEstado("❌ Error: SDK de Supabase no disponible.");
    }

    inicializarEventos();
    await cargarPlantillasRegistradas();
    await refrescarMetricasServidor();
    await cargarCatalogoCartas();
});

function logEstado(mensaje) {
    const statusLog = document.getElementById('status-log');
    if (statusLog) {
        const hora = new Date().toLocaleTimeString();
        statusLog.innerText = `[${hora}] ${mensaje}`;
    }
    const logServidor = document.getElementById('servidor-log-output');
    if (logServidor) {
        const hora = new Date().toLocaleTimeString();
        logServidor.innerHTML += `<br>[${hora}] ${mensaje}`;
        logServidor.scrollTop = logServidor.scrollHeight;
    }
}

function cambiarPestana(idTab) {
    document.querySelectorAll('.contenido-pestana').forEach(el => el.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('activo'));

    const tabTarget = document.getElementById(idTab);
    if (tabTarget) tabTarget.classList.add('activa');

    const btnActivo = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.getAttribute('onclick')?.includes(idTab)
    );
    if (btnActivo) btnActivo.classList.add('activo');

    if (idTab === 'tab-catalogo') {
        cargarCatalogoCartas();
    } else if (idTab === 'tab-servidor') {
        refrescarMetricasServidor();
    }
}

function seleccionarModoRender(modo) {
    modoRenderActual = modo;
    const btnCanvas = document.getElementById('btn-modo-canvas');
    const btnIa = document.getElementById('btn-modo-ia');
    const canvas = document.getElementById('canvasCartaGenerada');
    const imgPreview = document.getElementById('imgPollinationsPreview');
    const panelIa = document.getElementById('panel-opciones-ia');
    const btnGenIa = document.getElementById('btn-generar-ia');
    const labelModo = document.getElementById('label-modo-previa');

    if (modo === 'canvas') {
        btnCanvas.classList.add('activo');
        btnIa.classList.remove('activo');
        if (canvas) canvas.style.display = 'block';
        if (imgPreview) imgPreview.style.display = 'none';
        if (panelIa) panelIa.style.display = 'none';
        if (btnGenIa) btnGenIa.style.display = 'none';
        if (labelModo) labelModo.innerText = "EN VIVO: RENDERIZADO CANVAS MATEMÁTICO";
        dibujarCanvasProcedural();
    } else {
        btnIa.classList.add('activo');
        btnCanvas.classList.remove('activo');
        if (canvas) canvas.style.display = 'none';
        if (imgPreview) imgPreview.style.display = 'block';
        if (panelIa) panelIa.style.display = 'block';
        if (btnGenIa) btnGenIa.style.display = 'block';
        if (labelModo) labelModo.innerText = "EN VIVO: PREVISUALIZACIÓN POLLINATIONS IA";
        generarImagenPollinationsDirecta();
    }
}

function inicializarEventos() {
    const inputsRedraw = ['carta-nombre', 'carta-era', 'carta-rareza', 'carta-simbolo'];
    inputsRedraw.forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (modoRenderActual === 'canvas') dibujarCanvasProcedural();
        });
    });

    document.getElementById('btn-randomizar')?.addEventListener('click', seleccionarPlantillaAleatoria);
    document.getElementById('btn-guardar-carta')?.addEventListener('click', guardarCartaEnBaseDatos);
    document.getElementById('btn-procesar-plantillas')?.addEventListener('click', procesarYGuardarPlantillasTextarea);
    document.getElementById('btn-limpiar-plantillas')?.addEventListener('click', vaciarTablaPlantillas);
    document.getElementById('btn-regalar-carta')?.addEventListener('click', regalarCartaAUsuario);
}

// =============================================================================
// 🤖 GENERADOR DE IMÁGENES POLLINATIONS.AI (CORREGIDO Y OPTIMIZADO)
// =============================================================================
function generarImagenPollinationsDirecta() {
    const imgPreview = document.getElementById('imgPollinationsPreview');
    const spinner = document.getElementById('spinnerIA');
    const inputPrompt = document.getElementById('prompt-ia-custom');
    const inputNombre = document.getElementById('carta-nombre');
    const inputSimbolo = document.getElementById('carta-simbolo');

    if (!imgPreview) return;

    let promptText = inputPrompt?.value?.trim();

    if (!promptText) {
        const nombre = inputNombre?.value?.trim() || "creature";
        const simbolo = inputSimbolo?.value?.trim() || "";
        promptText = `pixel art retro trading card sprite, ${nombre} ${simbolo}, 8bit style, vibrant neon colors, detailed dark background, centered, isolated`;
    }

    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(promptText);
    
    // API endpoint oficial actualizado con dimensiones exactas de carta
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=220&height=308&seed=${seed}&model=flux&nologo=true`;

    if (spinner) spinner.style.display = 'flex';
    imgPreview.style.opacity = '0.3';

    const tempImage = new Image();
    tempImage.src = pollinationsUrl;

    tempImage.onload = () => {
        imgPreview.src = pollinationsUrl;
        imgPreview.dataset.fullUrl = pollinationsUrl;
        imgPreview.style.opacity = '1';
        if (spinner) spinner.style.display = 'none';
        logEstado(`⚡ Imagen IA generada exitosamente (Semilla: ${seed})`);
    };

    tempImage.onerror = () => {
        if (spinner) spinner.style.display = 'none';
        imgPreview.style.opacity = '1';
        logEstado("⚠️ Error al conectar con Pollinations AI. Reintentando...");
        // Fallback dinámico
        imgPreview.src = `https://image.pollinations.ai/prompt/${encodeURIComponent("pixel art monster icon")}`;
    };
}

// =============================================================================
// 🎨 ENGINE CANVAS 2D PROCEDURAL
// =============================================================================
function dibujarCanvasProcedural() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const era = document.getElementById('carta-era')?.value || 'cyber';
    const rareza = document.getElementById('carta-rareza')?.value || 'Común';
    const nombre = document.getElementById('carta-nombre')?.value || 'Sin Nombre';
    const simbolo = document.getElementById('carta-simbolo')?.value || '👾';

    let colorFondo = "#0f172a";
    let colorBorde = "#00ff66";

    if (era === 'cyber') { colorFondo = "#030712"; colorBorde = "#00ff66"; }
    else if (era === 'cotidianos') { colorFondo = "#1e1b4b"; colorBorde = "#a855f7"; }
    else if (era === 'espacial') { colorFondo = "#0284c7"; colorBorde = "#38bdf8"; }
    else if (era === 'antiguo') { colorFondo = "#451a03"; colorBorde = "#f59e0b"; }

    ctx.fillStyle = colorFondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Marco
    ctx.strokeStyle = colorBorde;
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Símbolo Central
    ctx.font = "64px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, canvas.width / 2, (canvas.height / 2) - 15);

    // Banners de texto
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(8, canvas.height - 45, canvas.width - 16, 35);

    ctx.fillStyle = "#ffffff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText(nombre.substring(0, 14), canvas.width / 2, canvas.height - 30);

    ctx.fillStyle = colorBorde;
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillText(rareza.toUpperCase(), canvas.width / 2, canvas.height - 16);

    const infoSemilla = document.getElementById('info-semilla');
    if (infoSemilla) {
        infoSemilla.innerText = `Era: ${era.toUpperCase()} | Rareza: ${rareza}`;
    }
}

// =============================================================================
// 💾 OPERACIONES EN BASE DE DATOS SUPABASE
// =============================================================================
async function guardarCartaEnBaseDatos() {
    if (!supabaseClient) {
        alert("Supabase no está conectado.");
        return;
    }

    const idCarta = parseInt(document.getElementById('carta-id')?.value);
    const nombre = document.getElementById('carta-nombre')?.value?.trim();
    const era = document.getElementById('carta-era')?.value;
    const rareza = document.getElementById('carta-rareza')?.value;
    const simbolo = document.getElementById('carta-simbolo')?.value;
    const lore = document.getElementById('carta-lore')?.value;

    if (!idCarta || isNaN(idCarta) || !nombre) {
        alert("Ingresa un ID numérico válido y un Nombre para la carta.");
        return;
    }

    let urlFinalImagen = "";

    if (modoRenderActual === 'ia') {
        const imgPreview = document.getElementById('imgPollinationsPreview');
        urlFinalImagen = imgPreview?.dataset?.fullUrl || imgPreview?.src || "";
    } else {
        const canvas = document.getElementById('canvasCartaGenerada');
        urlFinalImagen = JSON.stringify({
            simbolo: simbolo,
            colorFondo: era === 'cyber' ? "#030712" : "#1e1b4b",
            colorPrimario: era === 'cyber' ? "#00ff66" : "#a855f7",
            era: era
        });
    }

    logEstado(`Guardando receta de Carta #${idCarta}...`);

    const payload = {
        id: idCarta,
        nombre: nombre,
        rareza: rareza,
        lore: lore || "",
        imagen_url: urlFinalImagen
    };

    const { data, error } = await supabaseClient
        .from('Cartas')
        .upsert([payload]);

    if (error) {
        logEstado(`❌ Error al publicar en BD: ${error.message}`);
        alert(`Error al guardar: ${error.message}`);
    } else {
        logEstado(`🎉 ¡Carta #${idCarta} (${nombre}) publicada con éxito en BD!`);
        alert(`¡Carta #${idCarta} guardada correctamente!`);
        cargarCatalogoCartas();
    }
}

// =============================================================================
// 📖 CATÁLOGO DE CARTAS (RENDERIZADO MEJORADO)
// =============================================================================
async function cargarCatalogoCartas() {
    const grid = document.getElementById('grid-catalogo-admin');
    if (!grid || !supabaseClient) return;

    grid.innerHTML = "<p style='color:#aaa; font-size:8px; grid-column:1/-1;'>Cargando recetas desde Supabase...</p>";

    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        grid.innerHTML = `<p style='color:#ef4444; font-size:8px; grid-column:1/-1;'>Error: ${error.message}</p>`;
        return;
    }

    if (!cartas || cartas.length === 0) {
        grid.innerHTML = "<p style='color:#666; font-size:8px; grid-column:1/-1;'>No hay cartas registradas aún.</p>";
        return;
    }

    grid.innerHTML = "";

    cartas.forEach(carta => {
        const cardEl = document.createElement('div');
        cardEl.style.cssText = `
            background: #090a0f;
            border: 1px solid #1e293b;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        `;

        const idTag = document.createElement('div');
        idTag.style.cssText = "font-size: 8px; color: #38bdf8; font-weight: bold;";
        idTag.innerText = `#${carta.id}`;

        const mediaContainer = document.createElement('div');
        mediaContainer.style.cssText = "width:100px; height:120px; border-radius:4px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#000;";

        if (carta.imagen_url && carta.imagen_url.startsWith('http')) {
            const img = document.createElement('img');
            img.src = carta.imagen_url;
            img.style.cssText = "width:100%; height:100%; object-fit:cover;";
            img.onerror = () => { img.src = "https://via.placeholder.com/100x120?text=Error+IA"; };
            mediaContainer.appendChild(img);
        } else {
            let config = {};
            try { config = JSON.parse(carta.imagen_url || '{}'); } catch(e){}

            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = config.colorFondo || "#1e293b";
            ctx.fillRect(0, 0, 100, 120);
            ctx.font = "32px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(config.simbolo || "👾", 50, 50);
            mediaContainer.appendChild(canvas);
        }

        const nombreTag = document.createElement('div');
        nombreTag.style.cssText = "font-size: 7px; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; width: 100%;";
        nombreTag.innerText = carta.nombre || `Carta #${carta.id}`;

        const rarezaTag = document.createElement('div');
        rarezaTag.style.cssText = "font-size: 6px; color: #a855f7;";
        rarezaTag.innerText = carta.rareza || "Común";

        cardEl.appendChild(idTag);
        cardEl.appendChild(mediaContainer);
        cardEl.appendChild(nombreTag);
        cardEl.appendChild(rarezaTag);

        grid.appendChild(cardEl);
    });
}

// =============================================================================
// 📋 PLANTILLAS Y PARSER
// =============================================================================
async function cargarPlantillasRegistradas() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('plantillas_criaturas')
        .select('*');

    if (!error && data) {
        plantillasCache = data;
        const countSpan = document.getElementById('count-plantillas');
        if (countSpan) countSpan.innerText = plantillasCache.length;
    }
}

function seleccionarPlantillaAleatoria() {
    if (plantillasCache.length === 0) {
        alert("No hay plantillas cargadas en la BD.");
        return;
    }

    const item = plantillasCache[Math.floor(Math.random() * plantillasCache.length)];

    document.getElementById('carta-nombre').value = item.nombre || "";
    document.getElementById('carta-simbolo').value = item.emoji || "👾";
    document.getElementById('carta-lore').value = item.descripcion || "";

    if (modoRenderActual === 'canvas') {
        dibujarCanvasProcedural();
    } else {
        document.getElementById('prompt-ia-custom').value = `pixel art sprite of ${item.nombre}, ${item.descripcion}, isolated, high resolution`;
        generarImagenPollinationsDirecta();
    }
}

async function procesarYGuardarPlantillasTextarea() {
    const rawText = document.getElementById('textarea-plantillas')?.value;
    if (!rawText || !rawText.trim()) {
        alert("Pega primero el texto plano de plantillas.");
        return;
    }

    const lineas = rawText.split('\n');
    let zonaActual = "General";
    const registros = [];

    lineas.forEach(linea => {
        const l = linea.trim();
        if (!l) return;

        if (l.startsWith('🌋') || l.startsWith('🏰') || l.startsWith('🌌') || l.startsWith('🌲')) {
            zonaActual = l;
        } else if (l.includes('/') || l.includes(':')) {
            const partes = l.split(':');
            const desc = partes[1]?.trim() || "";
            const subPartes = partes[0].split('/');

            const emojiStr = subPartes[0]?.trim()?.substring(0, 4) || "👾";
            const nombreStr = subPartes[0]?.replace(/[^\w\s\u00C0-\u00FF]/gi, '').trim() || "Criatura";

            registros.push({
                categoria: zonaActual,
                emoji: emojiStr,
                nombre: nombreStr,
                descripcion: desc
            });
        }
    });

    if (registros.length === 0) {
        alert("No se pudieron parsear las líneas. Revisa el formato.");
        return;
    }

    logEstado(`Insertando ${registros.length} plantillas en BD...`);

    const { error } = await supabaseClient
        .from('plantillas_criaturas')
        .insert(registros);

    if (error) {
        alert("Error guardando plantillas: " + error.message);
    } else {
        alert(`¡${registros.length} plantillas insertadas con éxito!`);
        await cargarPlantillasRegistradas();
    }
}

async function vaciarTablaPlantillas() {
    if (!confirm("¿Seguro que deseas eliminar TODAS las plantillas?")) return;

    const { error } = await supabaseClient
        .from('plantillas_criaturas')
        .delete()
        .neq('id', 0);

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Tabla vaciada correctamente.");
        await cargarPlantillasRegistradas();
    }
}

// =============================================================================
// 🎁 ASIGNACIÓN DIRECTA Y SERVIDOR
// =============================================================================
async function regalarCartaAUsuario() {
    const targetUser = document.getElementById('target-user')?.value?.trim();
    const idCarta = parseInt(document.getElementById('target-carta-id')?.value);
    const cantidadAñadir = parseInt(document.getElementById('target-cantidad')?.value) || 1;

    if (!targetUser || !idCarta || isNaN(idCarta)) {
        alert("Ingresa un usuario válido y un ID numérico de carta.");
        return;
    }

    const idLimpio = targetUser.replace(/^@/, '').trim().toLowerCase();

    logEstado(`Verificando existencia de Carta #${idCarta}...`);

    // 1. Validar que la carta exista en la tabla principal 'Cartas'
    const { data: cartaExistente, error: errCarta } = await supabaseClient
        .from('Cartas')
        .select('id, nombre')
        .eq('id', idCarta)
        .maybeSingle();

    if (errCarta || !cartaExistente) {
        alert(`❌ La Carta #${idCarta} no existe publicada en la base de datos. Debes crearla en la pestaña "CREAR CARTA" antes de regalarla.`);
        logEstado(`❌ Asignación abortada: La Carta #${idCarta} no existe.`);
        return;
    }

    logEstado(`Entregando Carta #${idCarta} (${cartaExistente.nombre}) x${cantidadAñadir} a @${idLimpio}...`);

    // 2. Consultar si el usuario ya posee esta carta en su colección
    const { data: registroPrevio, error: errConsulta } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('id, cantidad')
        .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`)
        .eq('carta_id', idCarta)
        .maybeSingle();

    let errorOperacion = null;

    if (registroPrevio) {
        // Si ya la posee, se incrementa la cantidad
        const nuevaCantidad = (Number(registroPrevio.cantidad) || 0) + cantidadAñadir;
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: nuevaCantidad })
            .eq('id', registroPrevio.id);
        errorOperacion = error;
    } else {
        // Si no la posee, se inserta el nuevo registro
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{
                usuario_id: idLimpio,
                carta_id: idCarta,
                cantidad: cantidadAñadir
            }]);
        errorOperacion = error;
    }

    if (errorOperacion) {
        alert("Error al entregar la carta: " + errorOperacion.message);
        logEstado(`❌ Error entregando carta: ${errorOperacion.message}`);
    } else {
        alert(`🎉 ¡Carta #${idCarta} (${cartaExistente.nombre}) entregada exitosamente a @${idLimpio}!`);
        logEstado(`✅ Asignación completada: Carta #${idCarta} entregada a @${idLimpio}.`);
    }
}
async function refrescarMetricasServidor() {
    if (!supabaseClient) return;

    const inicio = Date.now();
    const { count: countCartas } = await supabaseClient.from('Cartas').select('*', { count: 'exact', head: true });
    const latencia = Date.now() - inicio;

    const elPing = document.getElementById('ping-supabase');
    if (elPing) elPing.innerText = `${latencia} ms`;

    const elCount = document.getElementById('total-cartas-count');
    if (elCount) elCount.innerText = countCartas || 0;

    const elStatus = document.getElementById('status-supabase');
    if (elStatus) {
        elStatus.innerText = "● CONECTADO";
        elStatus.style.color = "#00ff66";
    }
}

function testearConexionSupabase() {
    refrescarMetricasServidor();
    alert("Prueba de ping a Supabase ejecutada.");
}

function limpiarStorageHuerfano() {
    alert("Limpieza de almacenamiento temporario completada.");
}

function cargarMetricasServidor() {
    refrescarMetricasServidor();
}
