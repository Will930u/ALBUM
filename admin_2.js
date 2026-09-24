// =============================================================================
// 💻 CONTROLADOR DE ADMINISTRACIÓN CON VERIFICACIÓN DE PAGOS
// =============================================================================

const CONFIG = {
    SUPABASE_URL: "https://ddbdemxrntjqncetyrnr.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs",
    POLLINATIONS_URL: "https://pollinations.ai/p/"
};

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const Estado = {
    modoRenderActual: 'canvas',
    canalRealtimeColeccion: null,
    canalRealtimeCompras: null,
    animacionCatalogoId: null,
    animacionPreviewId: null,
    filtroComprasActual: 'pendiente'
};

const PALETAS_ERA = Object.freeze({
    cyber:      { fondo: '#0d0f18', borde: '#00ffcc', acento: '#ff007f', texto: '#00ffcc' },
    cotidianos: { fondo: '#1f1b24', borde: '#ffb703', acento: '#fb8500', texto: '#fff' },
    espacial:   { fondo: '#0b091a', borde: '#8a2be2', acento: '#00ffff', texto: '#e0e0ff' },
    antiguo:    { fondo: '#1c120c', borde: '#d4af37', acento: '#ff4500', texto: '#f3e5ab' }
});

const DOM = {
    get: (id) => document.getElementById(id),
    findInput: (posiblesIds) => {
        for (let id of posiblesIds) {
            let el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
            if (el) return el;
        }
        return null;
    },
    setValue: (posiblesIds, val) => {
        const idList = Array.isArray(posiblesIds) ? posiblesIds : [posiblesIds];
        idList.forEach(id => {
            const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    },
    setText: (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; },
    setDisplay: (id, display) => { const el = document.getElementById(id); if (el) el.style.display = display; },
    toggleClass: (id, className, force) => { const el = document.getElementById(id); if (el) el.classList.toggle(className, force); }
};

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    logEstado("Inicializando Panel de Mando...");
    configurarEventosUI();
    escucharDibujoCanvas();
    const pestanaGuardada = localStorage.getItem('admin_pestana_activa') || 'tab-crear';
    cambiarPestana(pestanaGuardada);
    await Promise.all([cargarMetricasServidor(), cargarCatalogoCartas()]);
    iniciarSuscripcionRealtimeAlbum();
    iniciarSuscripcionVerificacionPagos();
});

// 2. NAVEGACIÓN
function cambiarPestana(idPestana) {
    if (!idPestana) return;
    document.querySelectorAll('.contenido-pestana').forEach(el => el.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('activo'));
    const pestanaDestino = DOM.get(idPestana);
    if (pestanaDestino) pestanaDestino.classList.add('activa');
    const botonActivo = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.getAttribute('onclick')?.includes(idPestana)
    );
    if (botonActivo) botonActivo.classList.add('activo');
    try { localStorage.setItem('admin_pestana_activa', idPestana); } catch (e) {}
    
    // Si vamos a la pestaña de verificación, cargar las compras
    if (idPestana === 'tab-verificacion') {
        cargarComprasPendientes();
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
        : "EN VIVO: MOTOR GENERATIVO POLLINATIONS IA");
    if (esCanvas) dibujarCartaCanvas();
}

// 3. SUSCRIPCIÓN REALTIME
function iniciarSuscripcionRealtimeAlbum() {
    if (Estado.canalRealtimeColeccion) {
        supabaseClient.removeChannel(Estado.canalRealtimeColeccion);
    }
    Estado.canalRealtimeColeccion = supabaseClient
        .channel('public:Coleccion_Usuario')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Coleccion_Usuario' }, (payload) => {
            logEstado(`⚡ Cambio detectado en colección (${payload.eventType}).`);
            cargarCatalogoCartas();
            cargarMetricasServidor();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                logEstado("🟢 Suscripción Realtime activa.");
            }
        });
}

function iniciarSuscripcionVerificacionPagos() {
    if (Estado.canalRealtimeCompras) {
        supabaseClient.removeChannel(Estado.canalRealtimeCompras);
    }
    Estado.canalRealtimeCompras = supabaseClient
        .channel('public:compras_barajitas')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'compras_barajitas' 
        }, (payload) => {
            logEstado(`⚡ Cambio en compras: ${payload.eventType}`);
            const pestanaActiva = document.querySelector('.contenido-pestana.activa');
            if (pestanaActiva && pestanaActiva.id === 'tab-verificacion') {
                cargarTablaVerificacionPagos();
            }
        })
        .subscribe();
}

// 4. REGALAR CARTA
async function regalarCartaAUsuario() {
    const targetUser = DOM.findInput(['target-user'])?.value?.trim();
    const idCarta = parseInt(DOM.findInput(['target-carta-id'])?.value, 10);
    const cantidadAñadir = parseInt(DOM.findInput(['target-cantidad'])?.value, 10) || 1;

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
            alert(`❌ La Carta #${idCarta} no existe en la BD.`);
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

// 5. GUARDAR CARTA
async function guardarCartaBD() {
    const id = parseInt(DOM.findInput(['carta-id'])?.value, 10);
    const nombre = DOM.findInput(['carta-nombre'])?.value?.trim();
    const rareza = DOM.findInput(['carta-rareza'])?.value?.trim() || 'Común';
    const era = DOM.findInput(['carta-era'])?.value?.trim() || 'cyber';
    const simbolo = DOM.findInput(['carta-simbolo'])?.value?.trim() || '👾';
    const lore = DOM.findInput(['carta-lore'])?.value?.trim() || '';

    if (!id || !nombre) {
        alert("Por favor completa el ID y el Nombre de la carta.");
        return;
    }

    logEstado(`Guardando receta de Carta #${id} (${nombre})...`);

    let imagenUrlData = "";
    if (Estado.modoRenderActual === 'canvas') {
        const canvas = DOM.get('canvasCartaGenerada');
        imagenUrlData = canvas ? canvas.toDataURL("image/png") : "";
    } else {
        const imgIa = DOM.get('imgPollinationsPreview');
        imagenUrlData = imgIa ? imgIa.src : "";
    }

    const payloadCarta = {
        id: id,
        nombre: nombre,
        rareza: rareza,
        era: era.toLowerCase(),
        simbolo: simbolo,
        lore: lore,
        tipo: 'Algorítmica Canvas',
        imagen_url: imagenUrlData
    };

    const { error } = await supabaseClient.from('Cartas').upsert([payloadCarta]);

    if (error) {
        alert("Error al publicar carta: " + error.message);
        logEstado(`❌ Error guardando Carta #${id}: ${error.message}`);
    } else {
        alert(`✅ Carta #${id} "${nombre}" publicada con éxito.`);
        logEstado(`✅ Carta #${id} guardada correctamente.`);
        await cargarCatalogoCartas();
        await cargarMetricasServidor();
    }
}

// 6. CATÁLOGO
async function cargarCatalogoCartas() {
    const grid = DOM.get('grid-catalogo-admin');
    if (!grid) return;

    if (Estado.animacionCatalogoId) {
        cancelAnimationFrame(Estado.animacionCatalogoId);
        Estado.animacionCatalogoId = null;
    }

    grid.innerHTML = `<div style="color:#00ffcc; font-size:10px;">Cargando catálogo...</div>`;

    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        grid.innerHTML = `<div style="color:#ef4444; font-size:10px;">Error: ${error.message}</div>`;
        return;
    }

    if (!cartas || cartas.length === 0) {
        grid.innerHTML = `<div style="color:#888; font-size:10px;">No hay cartas registradas.</div>`;
        return;
    }

    grid.innerHTML = cartas.map(carta => renderizarCartaDesdeBD(carta)).join('');
    iniciarBucleAnimacionCatalogo(cartas);
}

function renderizarCartaDesdeBD(carta) {
    const eraClave = (carta.era || 'cyber').toString().toLowerCase().trim();
    const rarezaTexto = (carta.rareza || 'Común').toString().trim();
    const rarezaClase = `rareza-${rarezaTexto.toLowerCase()}`;
    const paleta = PALETAS_ERA[eraClave] || PALETAS_ERA.cyber;

    const rawUrl = String(carta.imagen_url || '').trim();
    const esImagenUrlDirecta = rawUrl.startsWith('data:image/') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

    let simbolo = carta.simbolo || '👾';
    if (rawUrl.startsWith('{')) {
        try {
            const parsed = JSON.parse(rawUrl);
            if (parsed.simbolo) simbolo = parsed.simbolo;
        } catch (e) {}
    }

    return `
        <div class="tarjeta-carta ${rarezaClase} era-${eraClave}" data-id="${carta.id || ''}">
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
                <span>${eraClave}</span>
            </div>
        </div>
    `;
}

function animarFondoMiniCanvas(canvas, carta, tiempo) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const eraClave = (carta.era || 'cyber').toString().toLowerCase().trim();
    const paleta = PALETAS_ERA[eraClave] || PALETAS_ERA.cyber;

    let simbolo = carta.simbolo || '';
    const rawUrl = String(carta.imagen_url || '').trim();
    if (rawUrl.startsWith('{')) {
        try {
            const parsed = JSON.parse(rawUrl);
            if (parsed.simbolo) simbolo = parsed.simbolo;
        } catch (e) {}
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const t = tiempo * 0.002;
    const gradiente = ctx.createLinearGradient(
        (Math.sin(t) * 0.5 + 0.5) * width, 0,
        (Math.cos(t) * 0.5 + 0.5) * width, height
    );
    gradiente.addColorStop(0, paleta.fondo);
    gradiente.addColorStop(0.5, paleta.acento + '33');
    gradiente.addColorStop(1, '#000000');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = paleta.borde;
    const size = 16;
    for (let x = 8; x < width; x += size) {
        for (let y = 8; y < height; y += size) {
            let alpha = Math.sin((x * 0.05 + y * 0.05 + tiempo * 0.003)) * 0.4 + 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillRect(x - 1, y - 1, 2.5, 2.5);
        }
    }
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = paleta.borde;
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    const offsetFlotacion = Math.sin(t * 2) * 3;
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, width / 2, height / 2 + offsetFlotacion);
}

function iniciarBucleAnimacionCatalogo(cartas) {
    function loop(tiempo) {
        cartas.forEach(carta => {
            const canvasEl = DOM.get(`canvas-cat-${carta.id}`);
            if (canvasEl && canvasEl.style.display !== 'none') {
                animarFondoMiniCanvas(canvasEl, carta, tiempo);
            }
        });
        Estado.animacionCatalogoId = requestAnimationFrame(loop);
    }
    Estado.animacionCatalogoId = requestAnimationFrame(loop);
}

// 7. CANVAS EN VIVO
function escucharDibujoCanvas() {
    ['carta-nombre', 'carta-era', 'carta-rareza', 'carta-simbolo'].forEach(id => {
        const el = DOM.get(id);
        if (el) {
            el.addEventListener('input', () => {
                if (Estado.modoRenderActual === 'canvas') dibujarCartaCanvas();
            });
        }
    });

    DOM.get('btn-randomizar')?.addEventListener('click', () => {
        const simbolos = ['', '👽', '🤖', '🐲', '⚡', '🔥', '🔮', '️'];
        DOM.setValue(['carta-simbolo'], simbolos[Math.floor(Math.random() * simbolos.length)]);
        const eras = ['cyber', 'cotidianos', 'espacial', 'antiguo'];
        DOM.setValue(['carta-era'], eras[Math.floor(Math.random() * eras.length)]);
        dibujarCartaCanvas();
    });

    DOM.get('btn-guardar-carta')?.addEventListener('click', guardarCartaBD);
    DOM.get('btn-regalar-carta')?.addEventListener('click', regalarCartaAUsuario);
}

function dibujarCartaCanvas() {
    const canvas = DOM.get('canvasCartaGenerada');
    if (!canvas) return;
    if (Estado.animacionPreviewId) {
        cancelAnimationFrame(Estado.animacionPreviewId);
        Estado.animacionPreviewId = null;
    }

    function loopPreview(tiempo) {
        const ctx = canvas.getContext('2d');
        const nombre = DOM.findInput(['carta-nombre'])?.value || "Carta Misteriosa";
        const simbolo = DOM.findInput(['carta-simbolo'])?.value || "";
        const era = DOM.findInput(['carta-era'])?.value || "cyber";
        const paleta = PALETAS_ERA[era] || PALETAS_ERA.cyber;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const t = tiempo * 0.002;
        const gradiente = ctx.createLinearGradient(
            (Math.sin(t) * 0.5 + 0.5) * width, 0,
            (Math.cos(t) * 0.5 + 0.5) * width, height
        );
        gradiente.addColorStop(0, paleta.fondo);
        gradiente.addColorStop(0.5, paleta.acento + '33');
        gradiente.addColorStop(1, '#000000');
        ctx.fillStyle = gradiente;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = paleta.borde;
        const size = 18;
        for (let x = 10; x < width; x += size) {
            for (let y = 10; y < height; y += size) {
                let alpha = Math.sin((x * 0.05 + y * 0.05 + tiempo * 0.003)) * 0.4 + 0.5;
                ctx.globalAlpha = alpha;
                ctx.fillRect(x - 1, y - 1, 3, 3);
            }
        }
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = paleta.borde;
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, width - 12, height - 12);

        const offsetFlotacion = Math.sin(t * 2) * 4;
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(simbolo, width / 2, height / 2 - 10 + offsetFlotacion);

        ctx.fillStyle = paleta.texto;
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText(nombre.substring(0, 14), width / 2, height - 30);

        DOM.setText('info-semilla', `Era: ${era.toUpperCase()} | Símbolo: ${simbolo}`);

        if (Estado.modoRenderActual === 'canvas') {
            Estado.animacionPreviewId = requestAnimationFrame(loopPreview);
        }
    }
    Estado.animacionPreviewId = requestAnimationFrame(loopPreview);
}

// 8. POLLINATIONS IA
async function generarImagenPollinationsDirecta() {
    const promptCustom = DOM.get('prompt-ia-custom')?.value?.trim();
    const nombre = DOM.findInput(['carta-nombre'])?.value || "creature";
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

// =============================================================================
// 💳 VERIFICACIÓN DE PAGOS - COMPRAS DE BARAJITAS
// =============================================================================

async function cargarComprasPendientes() {
    Estado.filtroComprasActual = 'pendiente';
    await cargarTablaVerificacionPagos();
}

async function cargarTodasLasCompras() {
    Estado.filtroComprasActual = 'todas';
    await cargarTablaVerificacionPagos();
}

async function cargarTablaVerificacionPagos() {
    const contenedor = DOM.get('tabla-verificacion-pagos');
    const contador = DOM.get('contador-compras');
    
    if (!contenedor) return;
    
    contenedor.innerHTML = `<div style="text-align: center; padding: 20px; color: #00ffcc; font-size: 8px;">Cargando compras...</div>`;
    
    try {
        let query = supabaseClient
            .from('compras_barajitas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (Estado.filtroComprasActual === 'pendiente') {
            query = query.eq('estado', 'pendiente');
        }
        
        const { data: compras, error } = await query.limit(50);
        
        if (error) {
            contenedor.innerHTML = `<div style="color: #ef4444; padding: 10px; font-size: 8px;">Error: ${error.message}</div>`;
            return;
        }
        
        if (!compras || compras.length === 0) {
            contenedor.innerHTML = `<div style="color: #888; padding: 20px; text-align: center; font-size: 8px;">No hay compras ${Estado.filtroComprasActual === 'pendiente' ? 'pendientes' : ''}.</div>`;
            if (contador) contador.textContent = 'Total: 0';
            return;
        }
        
        if (contador) {
            const pendientes = compras.filter(c => c.estado === 'pendiente').length;
            contador.textContent = `Mostrando: ${compras.length} | Pendientes: ${pendientes}`;
        }
        
        contenedor.innerHTML = compras.map(compra => {
            const fecha = compra.created_at ? new Date(compra.created_at).toLocaleString('es-VE') : 'N/A';
            const estadoColor = compra.estado === 'aprobado' ? '#22c55e' : (compra.estado === 'rechazado' ? '#ef4444' : '#eab308');
            const estadoTexto = (compra.estado || 'pendiente').toUpperCase();
            
            return `
                <div style="background: #0a0a0f; border: 1px solid #333; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-size: 7px; color: #00ffcc; margin-bottom: 4px;">
                                👤 <strong>@${compra.user_id || 'anónimo'}</strong>
                            </div>
                            <div style="font-size: 6px; color: #888; margin-bottom: 4px;">
                                📱 ${compra.telefono || 'S/T'} |  ${fecha}
                            </div>
                            <div style="font-size: 7px; color: #fff; margin-bottom: 4px;">
                                🎴 Barajita #${compra.barajita_id}
                            </div>
                            <div style="font-size: 6px; color: #38bdf8;">
                                💰 Ref: ${compra.referencia || 'N/A'} | Monto: ${compra.monto || '0.00'} Bs.
                            </div>
                        </div>
                        <div style="text-align: right; margin-left: 10px;">
                            <div style="font-size: 7px; color: ${estadoColor}; font-weight: bold;">
                                ${estadoTexto}
                            </div>
                        </div>
                    </div>
                    
                    ${compra.estado === 'pendiente' ? `
                        <div style="display: flex; gap: 8px; border-top: 1px solid #222; padding-top: 8px;">
                            <button onclick="aprobarCompraVerificacion('${compra.id}', '${compra.user_id}', ${compra.barajita_id})" 
                                    style="flex: 1; background: #22c55e; color: #000; border: none; padding: 8px; font-size: 7px; font-family: 'Press Start 2P', monospace; cursor: pointer; border-radius: 4px; font-weight: bold;">
                                ✅ VERIFICADO
                            </button>
                            <button onclick="rechazarCompraVerificacion('${compra.id}', '${compra.user_id}', ${compra.barajita_id})" 
                                    style="flex: 1; background: #ef4444; color: #fff; border: none; padding: 8px; font-size: 7px; font-family: 'Press Start 2P', monospace; cursor: pointer; border-radius: 4px; font-weight: bold;">
                                ❌ NO APROBADO
                            </button>
                        </div>
                    ` : `
                        <div style="text-align: center; font-size: 7px; color: ${estadoColor}; border-top: 1px solid #222; padding-top: 8px;">
                            ${compra.estado === 'aprobado' ? '✓ PROCESADA' : '✗ RECHAZADA'}
                            ${compra.motivo_rechazo ? `<br><span style="font-size:6px; color:#888;">${compra.motivo_rechazo}</span>` : ''}
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
    } catch (e) {
        contenedor.innerHTML = `<div style="color: #ef4444; padding: 10px; font-size: 8px;">Error: ${e.message}</div>`;
    }
}

async function aprobarCompraVerificacion(idCompra, usuarioId, barajitaId) {
    if (!confirm(`¿Confirmar que el pago de la barajita #${barajitaId} para @${usuarioId} es VÁLIDO?`)) {
        return;
    }
    
    logEstado(`⏳ Aprobando compra #${idCompra}...`);
    
    try {
        const usuarioLimpio = usuarioId.replace(/^@/, '').trim().toLowerCase();
        
        // 1. Marcar compra como aprobada
        const { error: errCompra } = await supabaseClient
            .from('compras_barajitas')
            .update({ 
                estado: 'aprobado',
                procesado_at: new Date().toISOString()
            })
            .eq('id', idCompra);
        
        if (errCompra) {
            alert("Error actualizando la compra: " + errCompra.message);
            return;
        }
        
        // 2. Consultar existencia actual en la colección
        const { data: regActual } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('cantidad')
            .eq('usuario_id', usuarioLimpio)
            .eq('carta_id', barajitaId)
            .maybeSingle();
        
        const cantidadActual = regActual ? (Number(regActual.cantidad) || 0) : 0;
        
        // 3. UPSERT en Coleccion_Usuario
        const { error: errColeccion } = await supabaseClient
            .from('Coleccion_Usuario')
            .upsert({
                usuario_id: usuarioLimpio,
                carta_id: Number(barajitaId),
                cantidad: cantidadActual + 1
            }, { onConflict: 'usuario_id,carta_id' });
        
        if (errColeccion) {
            alert("Error al entregar la barajita: " + errColeccion.message);
            return;
        }
        
        alert(`✅ ¡Compra aprobada! Barajita #${barajitaId} añadida a @${usuarioLimpio}.`);
        logEstado(`✅ Compra #${idCompra} aprobada y barajita #${barajitaId} entregada a @${usuarioLimpio}`);
        
        await cargarTablaVerificacionPagos();
        await cargarMetricasServidor();
        
    } catch (e) {
        alert("Error crítico: " + e.message);
        logEstado(`❌ Error aprobando compra: ${e.message}`);
    }
}

async function rechazarCompraVerificacion(idCompra, usuarioId, barajitaId) {
    const motivo = prompt(`Motivo del rechazo para la barajita #${barajitaId} (opcional):`, 'Referencia no válida');
    
    if (!confirm(`¿Confirmar que el pago de la barajita #${barajitaId} para @${usuarioId} es INVÁLIDO?\n\nEl usuario recibirá una notificación.`)) {
        return;
    }
    
    logEstado(` Rechazando compra #${idCompra}...`);
    
    try {
        const { error: errCompra } = await supabaseClient
            .from('compras_barajitas')
            .update({ 
                estado: 'rechazado',
                procesado_at: new Date().toISOString(),
                motivo_rechazo: motivo || 'Referencia no válida'
            })
            .eq('id', idCompra);
        
        if (errCompra) {
            alert("Error actualizando la compra: " + errCompra.message);
            return;
        }
        
        alert(`❌ Compra rechazada. El usuario @${usuarioId} será notificado.`);
        logEstado(`❌ Compra #${idCompra} rechazada para @${usuarioId}`);
        
        await cargarTablaVerificacionPagos();
        
    } catch (e) {
        alert("Error crítico: " + e.message);
        logEstado(`❌ Error rechazando compra: ${e.message}`);
    }
}

// 9. MÉTRICAS
async function cargarMetricasServidor() {
    logEstado("🔄 Comprobando métricas del servidor...");
    const inicio = Date.now();

    try {
        const { count: countCartas } = await supabaseClient.from('Cartas').select('*', { count: 'exact', head: true });
        const { count: countUsuarios } = await supabaseClient.from('usuarios').select('*', { count: 'exact', head: true });
        const { count: countPremios } = await supabaseClient.from('reclamaciones_premios').select('*', { count: 'exact', head: true });
        const { count: countColecciones } = await supabaseClient.from('Coleccion_Usuario').select('*', { count: 'exact', head: true });

        const latencia = Date.now() - inicio;

        DOM.setText('status-supabase', "● CONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#00ff66";

        DOM.setText('total-cartas-count', countCartas ?? 0);
        DOM.setText('ping-supabase', `${latencia} ms`);
        DOM.setText('kpi-usuarios-totales', countUsuarios ?? 0);
        DOM.setText('kpi-premios-pendientes', countPremios ?? 0);
        DOM.setText('kpi-total-colecciones', countColecciones ?? 0);

        logEstado(`🟢 Servidor activo | Cartas: ${countCartas ?? 0}/2000`);
    } catch (e) {
        DOM.setText('status-supabase', "● DESCONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#ef4444";
        logEstado(`❌ Error procesando métricas: ${e.message}`);
    }
}

async function testearConexionSupabase() {
    logEstado("🔄 Testeando conexión...");
    const inicio = Date.now();

    try {
        const { error } = await supabaseClient.from('Cartas').select('id', { count: 'exact', head: true });
        const latencia = Date.now() - inicio;

        if (error) {
            DOM.setText('status-supabase', "● DESCONECTADO");
            const statusEl = DOM.get('status-supabase');
            if (statusEl) statusEl.style.color = "#ef4444";
            logEstado(`❌ Fallo en test: ${error.message}`);
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
        logEstado(`❌ Error crítico: ${e.message}`);
    }
}

function limpiarLogServidor() {
    const logServidor = DOM.get('servidor-log-output');
    if (logServidor) {
        logServidor.innerHTML = `[${new Date().toLocaleTimeString()}] 🧹 Consola limpiada.`;
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
    DOM.get('btn-generar-ia')?.addEventListener('click', generarImagenPollinationsDirecta);
    DOM.get('btn-modo-canvas')?.addEventListener('click', () => seleccionarModoRender('canvas'));
    DOM.get('btn-modo-ia')?.addEventListener('click', () => seleccionarModoRender('ia'));
    DOM.get('btn-refrescar-servidor')?.addEventListener('click', cargarMetricasServidor);
    DOM.get('btn-probar-conexion')?.addEventListener('click', testearConexionSupabase);
    DOM.get('btn-limpiar-log')?.addEventListener('click', limpiarLogServidor);
    DOM.get('btn-refrescar-catalogo')?.addEventListener('click', cargarCatalogoCartas);
}

// EXPOSICIÓN GLOBAL
window.cambiarPestana = cambiarPestana;
window.cargarMetricasServidor = cargarMetricasServidor;
window.limpiarLogServidor = limpiarLogServidor;
window.cargarCatalogoCartas = cargarCatalogoCartas;
window.testearConexionSupabase = testearConexionSupabase;
window.cargarComprasPendientes = cargarComprasPendientes;
window.cargarTodasLasCompras = cargarTodasLasCompras;
window.aprobarCompraVerificacion = aprobarCompraVerificacion;
window.rechazarCompraVerificacion = rechazarCompraVerificacion;
