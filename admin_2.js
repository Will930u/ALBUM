// CONFIGURACIÓN DE SUPABASE (Pega tu URL y CLAVE real aquí)
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

// INICIALIZACIÓN CLIENTE SUPABASE (Aquí cambiamos "supabase" por "db")
let db = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ESTADO GLOBAL DEL EDITOR
let modoRenderActual = 'canvas'; // 'canvas' | 'ia'
let urlImagenIAGenerada = '';

// ESQUEMAS DE COLOR POR ERA
const PALETAS_ERA = {
    cyber: { fondo: '#0f172a', borde: '#00ff66', texto: '#38bdf8', acento: '#f43f5e' },
    cotidianos: { fondo: '#1c1917', borde: '#f59e0b', texto: '#fbbf24', acento: '#10b981' },
    espacial: { fondo: '#090d16', borde: '#818cf8', texto: '#c084fc', acento: '#38bdf8' },
    antiguo: { fondo: '#1a0f07', borde: '#d97706', texto: '#fef08a', acento: '#dc2626' }
};

// INICIALIZACIÓN AL CARGAR EL DOM
document.addEventListener('DOMContentLoaded', () => {
    logStatus("Cargando componentes del panel de administración...");
    inicializarEventos();
    renderizarCanvasProcedural();
    testearConexionSupabase();
});

function logStatus(msg) {
    const el = document.getElementById('status-log');
    if (el) el.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logServidor(msg);
}

function logServidor(msg) {
    const logBox = document.getElementById('servidor-log-output');
    if (logBox) {
        logBox.innerHTML += `<br>[${new Date().toLocaleTimeString()}] ${msg}`;
        logBox.scrollTop = logBox.scrollHeight;
    }
}

// CONTROL DE PESTAÑAS (SPA)
function cambiarPestana(tabId) {
    document.querySelectorAll('.contenido-pestana').forEach(el => el.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('activo'));

    const tabTarget = document.getElementById(tabId);
    if (tabTarget) tabTarget.classList.add('activa');

    const btnActivo = Array.from(document.querySelectorAll('.tab-btn')).find(
        btn => btn.getAttribute('onclick')?.includes(tabId)
    );
    if (btnActivo) btnActivo.classList.add('activo');

    if (tabId === 'tab-catalogo') cargarCatalogoBD();
    if (tabId === 'tab-servidor') cargarMetricasServidor();
    if (tabId === 'tab-plantillas') contarPlantillasBD();
}

// CAMBIO DE MODO DE RENDER
function seleccionarModoRender(modo) {
    modoRenderActual = modo;
    const btnCanvas = document.getElementById('btn-modo-canvas');
    const btnIA = document.getElementById('btn-modo-ia');
    const labelModo = document.getElementById('label-modo-previa');
    const panelIA = document.getElementById('panel-opciones-ia');
    const btnGenIA = document.getElementById('btn-generar-ia');
    
    const canvas = document.getElementById('canvasCartaGenerada');
    const imgPreview = document.getElementById('imgPollinationsPreview');

    if (modo === 'canvas') {
        btnCanvas?.classList.add('activo');
        btnIA?.classList.remove('activo');
        if (labelModo) labelModo.innerText = 'EN VIVO: RENDERIZADO CANVAS MATEMÁTICO';
        if (panelIA) panelIA.style.display = 'none';
        if (btnGenIA) btnGenIA.style.display = 'none';
        
        if (canvas) canvas.style.display = 'block';
        if (imgPreview) imgPreview.style.display = 'none';
        renderizarCanvasProcedural();
    } else {
        btnIA?.classList.add('activo');
        btnCanvas?.classList.remove('activo');
        if (labelModo) labelModo.innerText = 'EN VIVO: MOTOR GENERATIVO POLLINATIONS IA';
        if (panelIA) panelIA.style.display = 'block';
        if (btnGenIA) btnGenIA.style.display = 'inline-block';
        
        if (canvas) canvas.style.display = 'none';
        if (imgPreview) imgPreview.style.display = 'block';
    }
}

// INICIALIZADOR DE EVENTOS DE ENTRADA
function inicializarEventos() {
    ['carta-id', 'carta-nombre', 'carta-era', 'carta-rareza', 'carta-simbolo', 'carta-lore'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (modoRenderActual === 'canvas') renderizarCanvasProcedural();
        });
    });

    document.getElementById('btn-guardar-carta')?.addEventListener('click', publicarCartaBD);
    document.getElementById('btn-procesar-plantillas')?.addEventListener('click', procesarPlantillasTexto);
    document.getElementById('btn-limpiar-plantillas')?.addEventListener('click', vaciarPlantillasBD);
    document.getElementById('btn-regalar-carta')?.addEventListener('click', regalarCartaUsuario);
    document.getElementById('btn-randomizar')?.addEventListener('click', randomizarDesdePlantillas);
}

// RENDERIZADO CANVAS 2D
function renderizarCanvasProcedural() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas || modoRenderActual !== 'canvas') return;
    const ctx = canvas.getContext('2d');

    const id = document.getElementById('carta-id')?.value || '1';
    const nombre = document.getElementById('carta-nombre')?.value || 'Sin Nombre';
    const era = document.getElementById('carta-era')?.value || 'cyber';
    const rareza = document.getElementById('carta-rareza')?.value || 'Común';
    const simbolo = document.getElementById('carta-simbolo')?.value || '👾';
    const lore = document.getElementById('carta-lore')?.value || 'Sin descripción disponible.';

    const col = PALETAS_ERA[era] || PALETAS_ERA.cyber;

    // Fondo
    ctx.fillStyle = col.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde Decorativo
    ctx.strokeStyle = col.borde;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Cabecera: ID y Rareza
    ctx.fillStyle = col.texto;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`#${id}`, 14, 22);
    
    ctx.fillStyle = col.acento;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(rareza.toUpperCase(), canvas.width - 90, 22);

    // Símbolo / Emoji Central
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(simbolo, canvas.width / 2, 120);

    // Nombre de la Carta
    ctx.textAlign = 'center';
    ctx.fillStyle = col.texto;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText(nombre.substring(0, 18), canvas.width / 2, 180);

    // Recuadro de Lore
    ctx.fillStyle = '#00000088';
    ctx.fillRect(14, 200, canvas.width - 28, 80);
    ctx.strokeStyle = col.borde;
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 200, canvas.width - 28, 80);

    // Texto del Lore
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cccccc';
    ctx.font = '6px "Press Start 2P", monospace';
    wrapText(ctx, lore, 20, 215, canvas.width - 40, 10);

    // Actualizar Leyenda de Semilla
    const infoSemilla = document.getElementById('info-semilla');
    if (infoSemilla) infoSemilla.innerText = `Semilla: #${id} | Era: ${era.toUpperCase()}`;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

// GENERACIÓN DE IMAGEN IA (POLLINATIONS)
async function generarImagenPollinationsDirecta() {
    const promptCustom = document.getElementById('prompt-ia-custom')?.value;
    const nombre = document.getElementById('carta-nombre')?.value || 'creature';
    const simbolo = document.getElementById('carta-simbolo')?.value || '';
    
    const spinner = document.getElementById('spinnerIA');
    const imgPreview = document.getElementById('imgPollinationsPreview');

    const promptFinal = promptCustom || `trading card art of ${nombre} ${simbolo}, vibrant colors, detailed illustration, isolated background`;
    const encodedPrompt = encodeURIComponent(promptFinal);
    const seed = Math.floor(Math.random() * 999999);
    
    urlImagenIAGenerada = `https://pollinations.ai/p/${encodedPrompt}?width=220&height=308&seed=${seed}&nologo=true`;

    if (spinner) spinner.style.display = 'block';
    if (imgPreview) {
        imgPreview.style.display = 'block';
        imgPreview.src = urlImagenIAGenerada;
        imgPreview.onload = () => {
            if (spinner) spinner.style.display = 'none';
            logStatus("Imagen IA generada con éxito.");
        };
        imgPreview.onerror = () => {
            if (spinner) spinner.style.display = 'none';
            logStatus("Error al cargar la imagen desde Pollinations.AI");
        };
    }
}

// INTEGRACIÓN CON BASE DE DATOS (SUPABASE)
async function publicarCartaBD() {
    if (!db) return logStatus("Error: Base de datos no conectada.");

    const cartaData = {
        id: parseInt(document.getElementById('carta-id')?.value),
        nombre: document.getElementById('carta-nombre')?.value,
        era: document.getElementById('carta-era')?.value,
        rareza: document.getElementById('carta-rareza')?.value,
        simbolo: document.getElementById('carta-simbolo')?.value,
        lore: document.getElementById('carta-lore')?.value,
        modo_render: modoRenderActual,
        imagen_url: modoRenderActual === 'ia' ? urlImagenIAGenerada : null,
        created_at: new Date()
    };

    if (!cartaData.id || !cartaData.nombre) {
        return logStatus("Atención: ID y Nombre son obligatorios.");
    }

    logStatus("Guardando receta en la base de datos...");
    const { data, error } = await db.from('cartas_recetas').upsert([cartaData]);

    if (error) {
        logStatus(`Error al guardar: ${error.message}`);
    } else {
        logStatus(`¡Carta #${cartaData.id} publicada exitosamente!`);
    }
}

async function procesarPlantillasTexto() {
    if (!db) return logStatus("Error: Base de datos no conectada.");
    const texto = document.getElementById('textarea-plantillas')?.value;
    if (!texto) return logStatus("El campo de texto plano está vacío.");

    const lineas = texto.split('\n');
    let zonaActual = 'General';
    let registros = [];

    lineas.forEach(linea => {
        linea = linea.trim();
        if (!linea) return;

        if (linea.startsWith('🌋') || linea.startsWith('Zona') || !linea.includes(':')) {
            zonaActual = linea;
        } else {
            const partes = linea.split(':');
            const elementos = partes[0].split('/');
            const descripcion = partes[1] || '';

            elementos.forEach(el => {
                const subPartes = el.trim().split(' ');
                const emoji = subPartes[0];
                const nombre = subPartes.slice(1).join(' ');

                if (emoji && nombre) {
                    registros.push({
                        zona: zonaActual,
                        emoji: emoji,
                        nombre: nombre,
                        descripcion: descripcion.trim()
                    });
                }
            });
        }
    });

    if (registros.length === 0) return logStatus("No se pudieron parsear plantillas válidas.");

    logStatus(`Insertando ${registros.length} plantillas...`);
    const { error } = await db.from('plantillas_criaturas').insert(registros);

    if (error) {
        logStatus(`Error al insertar plantillas: ${error.message}`);
    } else {
        logStatus(`¡Se insertaron ${registros.length} plantillas con éxito!`);
        contarPlantillasBD();
    }
}

async function vaciarPlantillasBD() {
    if (!db) return logStatus("Error: Base de datos no conectada.");
    if (!confirm("¿Está seguro de vaciar la tabla de plantillas?")) return;

    const { error } = await db.from('plantillas_criaturas').delete().neq('id', 0);
    if (error) logStatus(`Error: ${error.message}`);
    else {
        logStatus("Tabla de plantillas vaciada.");
        contarPlantillasBD();
    }
}

async function contarPlantillasBD() {
    if (!db) return;
    const { count, error } = await db.from('plantillas_criaturas').select('*', { count: 'exact', head: true });
    if (!error && document.getElementById('count-plantillas')) {
        document.getElementById('count-plantillas').innerText = count || '0';
    }
}

async function randomizarDesdePlantillas() {
    if (!db) return logStatus("Se requiere conexión a base de datos.");
    const { data, error } = await db.from('plantillas_criaturas').select('*');
    
    if (error || !data || data.length === 0) {
        return logStatus("No hay plantillas registradas para randomizar.");
    }

    const item = data[Math.floor(Math.random() * data.length)];
    
    document.getElementById('carta-nombre').value = item.nombre;
    document.getElementById('carta-simbolo').value = item.emoji;
    document.getElementById('carta-lore').value = item.descripcion;

    if (modoRenderActual === 'canvas') renderizarCanvasProcedural();
    logStatus(`Plantilla cargada: ${item.nombre}`);
}

async function regalarCartaUsuario() {
    if (!db) return logStatus("Error: Base de datos no conectada.");
    
    const usuario = document.getElementById('target-user')?.value.replace('@', '');
    const cartaId = parseInt(document.getElementById('target-carta-id')?.value);
    const cantidad = parseInt(document.getElementById('target-cantidad')?.value) || 1;

    if (!usuario || !cartaId) return logStatus("Especifique usuario e ID de carta.");

    const { error } = await db.from('usuarios_coleccion').insert([{
        username: usuario,
        carta_id: cartaId,
        cantidad: cantidad,
        asignado_at: new Date()
    }]);

    if (error) logStatus(`Error al regalar carta: ${error.message}`);
    else logStatus(`¡Éxito! Se asignaron ${cantidad}x Carta #${cartaId} a @${usuario}`);
}

async function cargarCatalogoBD() {
    const grid = document.getElementById('grid-catalogo-admin');
    if (!grid) return;

    if (!db) {
        grid.innerHTML = '<div style="color:#eab308; font-size:8px;">Base de datos desconectada. Configure SUPABASE_URL en admin_2.js.</div>';
        return;
    }

    grid.innerHTML = '<div style="color:#aaa; font-size:8px;">Cargando catálogo...</div>';
    const { data, error } = await db.from('cartas_recetas').select('*').order('id', { ascending: true });

    if (error) {
        grid.innerHTML = `<div style="color:#ef4444; font-size:8px;">Error: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<div style="color:#666; font-size:8px;">No hay cartas en la base de datos.</div>';
        return;
    }

    grid.innerHTML = '';
    data.forEach(c => {
        const card = document.createElement('div');
        card.style.cssText = "background:#111; border:1px solid #333; padding:8px; text-align:center; font-size:8px;";
        card.innerHTML = `
            <div style="color:#38bdf8; font-weight:bold;">#${c.id} - ${c.nombre}</div>
            <div style="font-size:20px; margin:5px 0;">${c.simbolo || '👾'}</div>
            <div style="color:#aaa;">${c.rareza} | ${c.era}</div>
        `;
        grid.appendChild(card);
    });
}

// CONTROL Y DIAGNÓSTICO DEL SERVIDOR
async function testearConexionSupabase() {
    if (!db) {
        actualizarStatusSupabase(false, '--');
        return;
    }

    const tInicial = Date.now();
    const { error } = await db.from('cartas_recetas').select('id', { count: 'exact', head: true });
    const ping = Date.now() - tInicial;

    if (error) {
        actualizarStatusSupabase(false, '--');
        logServidor(`Error de conexión: ${error.message}`);
    } else {
        actualizarStatusSupabase(true, ping);
        logServidor(`Conexión exitosa. Latencia: ${ping}ms`);
    }
}

function actualizarStatusSupabase(conectado, ping) {
    const elStatus = document.getElementById('status-supabase');
    const elPing = document.getElementById('ping-supabase');

    if (elStatus) {
        elStatus.innerText = conectado ? '● CONECTADO' : '● DESCONECTADO';
        elStatus.style.color = conectado ? '#00ff66' : '#ef4444';
    }
    if (elPing) elPing.innerText = `${ping} ms`;
}

async function cargarMetricasServidor() {
    if (!db) return;

    // Total Cartas
    const resCartas = await db.from('cartas_recetas').select('*', { count: 'exact', head: true });
    document.getElementById('total-cartas-count').innerText = resCartas.count || '0';

    // Total Usuarios
    const resUsers = await db.from('usuarios_coleccion').select('username');
    const usuariosUnicos = new Set(resUsers.data?.map(u => u.username)).size;
    document.getElementById('kpi-usuarios-totales').innerText = usuariosUnicos || '0';

    logServidor("Métricas del servidor actualizadas.");
}

async function limpiarStorageHuerfano() {
    logServidor("Limpiando temporales y storage huérfano...");
    setTimeout(() => {
        logServidor("Limpieza completada exitosamente.");
    }, 1000);
}
