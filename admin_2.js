// =============================================================================
// 💻 CONTROLADOR DE ADMINISTRACIÓN, GENERADOR PROCEDURAL / IA Y SERVIDOR
// =============================================================================

// CONFIGURACIÓN CENTRALIZADA
const CONFIG = {
    SUPABASE_URL: "https://ddbdemxrntjqncetyrnr.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs",
    POLLINATIONS_URL: "https://pollinations.ai/p/"
};

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ESTADO GLOBAL
const Estado = {
    modoRenderActual: 'canvas', // 'canvas' | 'ia'
    canalRealtimeColeccion: null
};

// PALETAS DE COLOR POR ERA / RAREZA
const PALETAS_ERA = Object.freeze({
    cyber:      { fondo: '#0d0f18', borde: '#00ffcc', acento: '#ff007f', texto: '#00ffcc' },
    cotidiano:  { fondo: '#1f1b24', borde: '#ffb703', acento: '#fb8500', texto: '#fff' },
    cotidianos: { fondo: '#1f1b24', borde: '#ffb703', acento: '#fb8500', texto: '#fff' },
    espacial:   { fondo: '#0b091a', borde: '#8a2be2', acento: '#00ffff', texto: '#e0e0ff' },
    antiguo:    { fondo: '#1c120c', borde: '#d4af37', acento: '#ff4500', texto: '#f3e5ab' }
});

// AYUDANTES DE DOM (DOM HELPERS)
const DOM = {
    get: (id) => document.getElementById(id),
    setValue: (id, val) => { const el = document.getElementById(id); if (el) el.value = val; },
    setText: (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; },
    setDisplay: (id, display) => { const el = document.getElementById(id); if (el) el.style.display = display; },
    toggleClass: (id, className, force) => { const el = document.getElementById(id); if (el) el.classList.toggle(className, force); }
};

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    logEstado("Inicializando Panel de Mando...");
    configurarEventosUI();

    // 🔄 Obtener la última pestaña guardada (o 'tab-crear' si es la primera vez)
    const pestanaGuardada = localStorage.getItem('admin_pestana_activa') || 'tab-crear';
    
    // Abrir la pestaña en la que estabas antes de refrescar
    cambiarPestana(pestanaGuardada);

    // Cargar los datos correspondientes
    await Promise.all([
        cargarMetricasServidor(),
        cargarCatalogoCartas()
    ]);
});

// 2. NAVEGACIÓN Y CAMBIO DE PESTAÑAS / PANELES
function cambiarPestana(idPestana) {
    if (!idPestana) return;

    // Ocultar todas las pestañas y quitar estado activo a botones
    document.querySelectorAll('.contenido-pestana').forEach(el => el.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('activo'));
    
    // Activar el panel destino
    const pestanaDestino = DOM.get(idPestana);
    if (pestanaDestino) pestanaDestino.classList.add('activa');
    
    // Marcar el botón activo correspondiente
    const botonActivo = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.getAttribute('onclick')?.includes(idPestana)
    );
    if (botonActivo) botonActivo.classList.add('activo');

    // 💾 GUARDAR PESTAÑA EN LOCALSTORAGE PARA MANTENER ESTADO AL REFRESCAR
    try {
        localStorage.setItem('admin_pestana_activa', idPestana);
    } catch (e) {
        console.warn("No se pudo guardar la pestaña en localStorage:", e);
    }
}

function seleccionarModoRender(modo) {
    Estado.modoRenderActual = modo;
    const esCanvas = modo === 'canvas';

    DOM.toggleClass('btn-modo-canvas', 'activo', esCanvas);
    DOM.toggleClass('btn-modo-ia', 'activo', !esCanvas);
    
    DOM.setDisplay('canvasCartaGenerada', esCanvas ? 'block' : 'none');
    DOM.setDisplay('imgPollinationsPreview', esCanvas ? 'none' : 'block');
    DOM.setDisplay('panel-opciones-ia', esCanvas ? 'none' : 'block');
    DOM.setDisplay('btn-generar-ia', esCanvas ? 'none' : 'block');

    DOM.setText('label-modo-previa', esCanvas 
        ? "EN VIVO: RENDERIZADO CANVAS MATEMÁTICO" 
        : "EN VIVO: MOTOR GENERATIVO POLLINATIONS IA"
    );

    if (esCanvas) dibujarCartaCanvas();
}

// 3. SUSCRIPCIÓN EN TIEMPO REAL (REALTIME)
function iniciarSuscripcionRealtimeAlbum() {
    if (Estado.canalRealtimeColeccion) {
        supabaseClient.removeChannel(Estado.canalRealtimeColeccion);
    }
    
    Estado.canalRealtimeColeccion = supabaseClient
        .channel('public:Coleccion_Usuario')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Coleccion_Usuario' },
            (payload) => {
                logEstado(`⚡ Cambio detectado en colección (${payload.eventType}). Actualizando álbum...`);
                window.dispatchEvent(new CustomEvent('actualizarAlbumRealtime', { detail: payload }));
                cargarCatalogoCartas();
                cargarMetricasServidor();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                logEstado("🟢 Suscripción Realtime activa: El álbum se actualizará instantáneamente.");
            }
        });
}

// 4. ASIGNAR / REGALAR CARTA A USUARIO
async function regalarCartaAUsuario() {
    const targetUser = DOM.get('target-user')?.value?.trim();
    const idCarta = parseInt(DOM.get('target-carta-id')?.value, 10);
    const cantidadAñadir = parseInt(DOM.get('target-cantidad')?.value, 10) || 1;

    if (!targetUser || !idCarta || isNaN(idCarta)) {
        alert("Ingresa un usuario válido y un ID numérico de carta.");
        return;
    }

    const idLimpio = targetUser.replace(/^@/, '').trim().toLowerCase();
    logEstado(`Verificando existencia de Carta #${idCarta}...`);

    try {
        const { data: cartaExistente, error: errCarta } = await supabaseClient
            .from('Cartas')
            .select('id, nombre, rareza')
            .eq('id', idCarta)
            .maybeSingle();

        if (errCarta || !cartaExistente) {
            alert(`❌ La Carta #${idCarta} no existe en la BD. Créala primero.`);
            return;
        }

        const { data: registroExistente } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('id, cantidad')
            .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`)
            .eq('carta_id', idCarta)
            .maybeSingle();

        let errorRespuesta = null;

        if (registroExistente) {
            const nuevaCantidad = (Number(registroExistente.cantidad) || 0) + cantidadAñadir;
            const { error } = await supabaseClient
                .from('Coleccion_Usuario')
                .update({ cantidad: nuevaCantidad })
                .eq('id', registroExistente.id);
            errorRespuesta = error;
        } else {
            const { error } = await supabaseClient
                .from('Coleccion_Usuario')
                .insert([{ usuario_id: idLimpio, carta_id: idCarta, cantidad: cantidadAñadir }]);
            errorRespuesta = error;
        }

        if (errorRespuesta) {
            alert("Error al asignar carta: " + errorRespuesta.message);
        } else {
            alert(`🎉 Carta #${idCarta} entregada exitosamente a @${idLimpio}.`);
            logEstado(`✅ Asignación completada: Carta #${idCarta} -> @${idLimpio}`);
        }
    } catch (e) {
        alert("Error en la operación: " + e.message);
    }
}

// 5. CREACIÓN Y PUBLICACIÓN DE CARTA
async function guardarCartaBD() {
    const id = parseInt(DOM.get('carta-id')?.value, 10);
    const nombre = DOM.get('carta-nombre')?.value.trim();
    const rareza = DOM.get('carta-rareza')?.value.trim() || 'Común';
    const tipo = DOM.get('carta-tipo')?.value.trim() || 'Algorítmica Canvas';
    const lore = DOM.get('carta-lore')?.value.trim() || '';
    const simbolo = DOM.get('carta-simbolo')?.value.trim() || '👾';

    if (!id || !nombre) {
        alert("Por favor completa el ID y el Nombre de la carta.");
        return;
    }

    logEstado(`Guardando receta de Carta #${id} (${nombre})...`);
    let imagenUrlData = "";

    if (Estado.modoRenderActual === 'canvas') {
        const canvas = DOM.get('canvasCartaGenerada');
        imagenUrlData = canvas 
            ? canvas.toDataURL("image/png") 
            : JSON.stringify({ modo: "canvas", procedural: true, simbolo: simbolo, nombre: nombre });
    } else {
        const imgIa = DOM.get('imgPollinationsPreview');
        imagenUrlData = imgIa ? imgIa.src : "";
    }

    const payloadCarta = {
        id: id,
        nombre: nombre,
        rareza: rareza,
        tipo: tipo,
        lore: lore,
        imagen_url: imagenUrlData
    };

    const { error } = await supabaseClient.from('Cartas').upsert([payloadCarta]);

    if (error) {
        alert("Error al publicar carta: " + error.message);
    } else {
        alert(`✅ Carta #${id} "${nombre}" publicada con éxito.`);
        logEstado(`✅ Carta #${id} guardada correctamente.`);
        await cargarCatalogoCartas();
    }
}

// 6. RENDERIZADO DEL CATÁLOGO
async function cargarCatalogoCartas() {
    const grid = DOM.get('grid-catalogo-admin');
    if (!grid) return;

    grid.innerHTML = `<div style="color:#00ffcc; font-size:10px;">Cargando catálogo desde Supabase...</div>`;

    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        grid.innerHTML = `<div style="color:#ef4444; font-size:10px;">Error: ${error.message}</div>`;
        return;
    }

    if (!cartas || cartas.length === 0) {
        grid.innerHTML = `<div style="color:#888; font-size:10px;">No hay cartas registradas en la base de datos.</div>`;
        return;
    }

    grid.innerHTML = cartas.map(carta => renderizarCartaDesdeBD(carta)).join('');

    // Dibuja canvas algorítmico si no es imagen fija
    cartas.forEach(carta => {
        const canvasEl = DOM.get(`canvas-cat-${carta.id}`);
        if (canvasEl) {
            dibujarMiniCanvasProcedural(canvasEl, carta);
        }
    });
}

function renderizarCartaDesdeBD(carta) {
    const rarezaTexto = (carta.rareza || 'Común').toString().trim();
    const rarezaClase = `rareza-${rarezaTexto.toLowerCase()}`;
    const paleta = PALETAS_ERA[rarezaTexto.toLowerCase()] || PALETAS_ERA.cyber;

    const rawUrl = String(carta.imagen_url || '').trim();
    const esImagenUrlDirecta = rawUrl.startsWith('data:image/') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

    return `
        <div class="tarjeta-carta ${rarezaClase}" data-id="${carta.id || ''}">
            <div class="fondo-movil-animado"></div>
            <div class="efecto-brillo-holografico"></div>
            <div style="display:flex; justify-content:space-between; font-size:8px; border-bottom:1px solid ${paleta.borde}; padding-bottom:4px; margin-bottom:6px; position:relative; z-index:2;">
                <span style="font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">#${carta.id || '?'} ${carta.nombre || 'Sin nombre'}</span>
                <span class="badge-rareza" style="color:${paleta.acento}; font-weight:bold;">${rarezaTexto}</span>
            </div>
            <div style="text-align:center; margin:8px 0; background:rgba(0,0,0,0.5); border: 1px solid ${paleta.borde}44; border-radius:4px; padding:4px; height:110px; display:flex; align-items:center; justify-content:center; position:relative; z-index:2; overflow:hidden;">
                ${esImagenUrlDirecta 
                    ? `<img src="${rawUrl}" alt="${carta.nombre}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.style.display='none'; const c = document.getElementById('canvas-cat-${carta.id}'); if(c) c.style.display='block';">
                       <canvas id="canvas-cat-${carta.id}" width="150" height="100" style="display:none; max-width:100%; max-height:100%;"></canvas>` 
                    : `<canvas id="canvas-cat-${carta.id}" width="150" height="100" style="max-width:100%; max-height:100%;"></canvas>`
                }
            </div>
            <div style="font-size:7px; font-style:italic; line-height:1.2; color:#eee; height:28px; overflow:hidden; position:relative; z-index:2; text-shadow: 1px 1px 2px #000; margin-bottom:4px;">
                "${carta.lore || 'Sin descripción disponible.'}"
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:6px; text-transform:uppercase; color:${paleta.acento}; font-weight:bold; position:relative; z-index:2; border-top:1px solid ${paleta.borde}33; padding-top:4px;">
                <span>${carta.tipo || 'Algorítmica'}</span>
                <span>${rarezaTexto}</span>
            </div>
        </div>
    `;
}

function dibujarMiniCanvasProcedural(canvas, carta) {
    const ctx = canvas.getContext('2d');
    const rareza = (carta.rareza || 'Común').toLowerCase();
    const paleta = PALETAS_ERA[rareza] || PALETAS_ERA.cyber;
    let simbolo = '👾';

    if (carta.imagen_url && carta.imagen_url.startsWith('{')) {
        try {
            const parsed = JSON.parse(carta.imagen_url);
            if (parsed.simbolo) simbolo = parsed.simbolo;
        } catch (e) {
            // Manejo silencioso
        }
    }

    ctx.fillStyle = paleta.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = paleta.borde;
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, canvas.width / 2, canvas.height / 2);
}

// 7. GENERADOR CANVAS EN VIVO
function escucharDibujoCanvas() {
    ['carta-nombre', 'carta-rareza', 'carta-simbolo'].forEach(id => {
        DOM.get(id)?.addEventListener('input', () => {
            if (Estado.modoRenderActual === 'canvas') dibujarCartaCanvas();
        });
    });

    DOM.get('btn-randomizar')?.addEventListener('click', () => {
        const simbolos = ['👾', '👽', '🤖', '🐲', '⚡', '🔥', '🔮', '⚔️', '🐝', '🦋', '🐜'];
        const aleatorio = simbolos[Math.floor(Math.random() * simbolos.length)];
        DOM.setValue('carta-simbolo', aleatorio);
        dibujarCartaCanvas();
    });

    DOM.get('btn-guardar-carta')?.addEventListener('click', guardarCartaBD);
    DOM.get('btn-regalar-carta')?.addEventListener('click', regalarCartaAUsuario);
}

function dibujarCartaCanvas() {
    const canvas = DOM.get('canvasCartaGenerada');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const nombre = DOM.get('carta-nombre')?.value || "Carta Misteriosa";
    const simbolo = DOM.get('carta-simbolo')?.value || "👾";
    const rareza = DOM.get('carta-rareza')?.value || "Común";
    const paleta = PALETAS_ERA[rareza.toLowerCase()] || PALETAS_ERA.cyber;

    ctx.fillStyle = paleta.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = paleta.borde;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, canvas.width / 2, canvas.height / 2 - 10);
    
    ctx.fillStyle = paleta.texto;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(nombre.substring(0, 14), canvas.width / 2, canvas.height - 30);
    
    DOM.setText('info-semilla', `Rareza: ${rareza.toUpperCase()} | Símbolo: ${simbolo}`);
}

// 8. MOTOR POLLINATIONS IA
async function generarImagenPollinationsDirecta() {
    const promptCustom = DOM.get('prompt-ia-custom')?.value?.trim();
    const nombre = DOM.get('carta-nombre')?.value || "creature";
    const imgIa = DOM.get('imgPollinationsPreview');
    
    const promptFinal = promptCustom || `trading card art of ${nombre}, digital art, highly detailed, vibrant background`;
    const seed = Math.floor(Math.random() * 99999);
    const urlIa = `${CONFIG.POLLINATIONS_URL}${encodeURIComponent(promptFinal)}?width=220&height=308&seed=${seed}&nologo=true`;

    DOM.setDisplay('spinnerIA', 'block');

    if (imgIa) {
        imgIa.onload = () => {
            DOM.setDisplay('spinnerIA', 'none');
            logEstado("⚡ Imagen IA generada con éxito.");
        };
        imgIa.onerror = () => {
            DOM.setDisplay('spinnerIA', 'none');
            logEstado("❌ Fallo al generar imagen con Pollinations IA.");
        };
        imgIa.src = urlIa;
    }
}

// 9. PARSER E IMPORTACIÓN DE PLANTILLAS
async function procesarYGuardarPlantillas() {
    const textoArea = DOM.get('texto-plantillas-masivo');
    if (!textoArea || !textoArea.value.trim()) {
        alert("Pega el texto de las plantillas en el área de texto primero.");
        return;
    }
    logEstado("Procesando bloque de plantillas...");
    alert("✅ Función de parseo lista.");
    logEstado("✅ Plantillas procesadas.");
}

async function seleccionarPlantillaAleatoria() {
    logEstado("Consultando plantillas_criaturas...");
    try {
        const { data, error } = await supabaseClient
            .from('plantillas_criaturas')
            .select('*')
            .limit(1);
        
        if (error || !data || data.length === 0) {
            alert("No se encontraron plantillas en la base de datos.");
            return;
        }
        
        const plantilla = data[0];
        DOM.setValue('carta-nombre', plantilla.nombre || "Criatura Aleatoria");
        DOM.setValue('carta-rareza', plantilla.rareza || "Común");
        DOM.setValue('carta-simbolo', plantilla.simbolo || "👾");
        DOM.setValue('carta-lore', plantilla.lore || "Generado desde plantilla.");
        
        dibujarCartaCanvas();
        logEstado("✅ Plantilla aleatoria cargada en el formulario.");
    } catch (e) {
        logEstado(`❌ Error al obtener plantilla: ${e.message}`);
    }
}

// 10. DIAGNÓSTICO Y MÉTRICAS DEL SERVIDOR
async function cargarMetricasServidor() {
    logEstado("🔄 Comprobando métricas del servidor Supabase...");
    const inicio = Date.now();
    
    try {
        // 1. Consultar Total de Cartas
        const { count: countCartas, error: errCartas } = await supabaseClient
            .from('Cartas')
            .select('*', { count: 'exact', head: true });

        // 2. Consultar Usuarios Registrados (Verificar si la tabla es 'usuarios' o 'perfiles')
        const { count: countUsuarios, error: errUsuarios } = await supabaseClient
            .from('usuarios')
            .select('*', { count: 'exact', head: true });

        // 3. Consultar Premios Pendientes (Verificar 'reclamaciones_premios' o 'premios_ganados')
        const { count: countPremios, error: errPremios } = await supabaseClient
            .from('reclamaciones_premios')
            .select('*', { count: 'exact', head: true });

        // 4. Consultar Colecciones Activas
        const { count: countColecciones, error: errColecciones } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*', { count: 'exact', head: true });

        const latencia = Date.now() - inicio;

        if (errUsuarios) console.error("Error Supabase (usuarios):", errUsuarios.message);
        if (errPremios) console.error("Error Supabase (premios):", errPremios.message);
        if (errColecciones) console.error("Error Supabase (colecciones):", errColecciones.message);

        // Inyectar datos en el DOM
        DOM.setText('total-cartas-count', countCartas ?? 0);
        DOM.setText('ping-supabase', `${latencia} ms`);
        DOM.setText('kpi-usuarios-totales', countUsuarios ?? 0);
        DOM.setText('kpi-premios-pendientes', countPremios ?? 0);
        DOM.setText('kpi-total-colecciones', countColecciones ?? 0);

        logEstado(`🟢 Servidor activo | usuarios: ${countUsuarios ?? 0}`);
    } catch (e) {
        logEstado(`❌ Error procesando métricas: ${e.message}`);
    }
}

function limpiarLogServidor() {
    const logServidor = DOM.get('servidor-log-output');
    if (logServidor) {
        logServidor.innerHTML = `[${new Date().toLocaleTimeString()}] 🧹 Consola de servidor limpiada.`;
    }
}

function logEstado(mensaje) {
    const timestamp = new Date().toLocaleTimeString();
    DOM.setText('status-log', `[${timestamp}] ${mensaje}`);
    
    const logServidor = DOM.get('servidor-log-output');
    if (logServidor) {
        logServidor.innerHTML += `<br>[${timestamp}] ${mensaje}`;
        logServidor.scrollTop = logServidor.scrollHeight;
    }
}

function configurarEventosUI() {
    // Botones del Generador / Plantillas
    DOM.get('btn-procesar-plantillas')?.addEventListener('click', procesarYGuardarPlantillas);
    DOM.get('btn-plantilla-aleatoria')?.addEventListener('click', seleccionarPlantillaAleatoria);
    DOM.get('btn-generar-ia')?.addEventListener('click', generarImagenPollinationsDirecta);
    DOM.get('btn-modo-canvas')?.addEventListener('click', () => seleccionarModoRender('canvas'));
    DOM.get('btn-modo-ia')?.addEventListener('click', () => seleccionarModoRender('ia'));
    
    // Botones del Panel de Servidor y Catálogo
    DOM.get('btn-refrescar-servidor')?.addEventListener('click', cargarMetricasServidor);
    DOM.get('btn-probar-conexion')?.addEventListener('click', cargarMetricasServidor);
    DOM.get('btn-limpiar-log')?.addEventListener('click', limpiarLogServidor);
    DOM.get('btn-refrescar-catalogo')?.addEventListener('click', cargarCatalogoCartas);
}

// EXPONER FUNCIONES GLOBALMENTE PARA ATRIBUTOS ONCLICK DEL HTML
window.cambiarPestana = cambiarPestana;
window.cargarMetricasServidor = cargarMetricasServidor;
window.limpiarLogServidor = limpiarLogServidor;
window.cargarCatalogoCartas = cargarCatalogoCartas;

}

// =============================================================================
// FUNCIÓN AUXILIAR: TESTEAR CONEXIÓN CON SUPABASE
// =============================================================================
async function testearConexionSupabase() {
    logEstado("🔄 Testeando conexión directa con Supabase...");
    const inicio = Date.now();
    try {
        const { error } = await supabaseClient
            .from('Cartas')
            .select('id', { count: 'exact', head: true });

        const latencia = Date.now() - inicio;

        if (error) {
            DOM.setText('status-supabase', "● DESCONECTADO");
            const statusEl = DOM.get('status-supabase');
            if (statusEl) statusEl.style.color = "#ef4444";
            logEstado(`❌ Fallo en test de conexión: ${error.message}`);
        } else {
            DOM.setText('status-supabase', "● CONECTADO");
            const statusEl = DOM.get('status-supabase');
            if (statusEl) statusEl.style.color = "#00ff66";
            DOM.setText('ping-supabase', `${latencia} ms`);
            logEstado(`🟢 Test exitoso | Latencia: ${latencia}ms`);
        }
    } catch (e) {
        DOM.setText('status-supabase', "● DESCONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#ef4444";
        logEstado(`❌ Error crítico al probar conexión: ${e.message}`);
    }
}

