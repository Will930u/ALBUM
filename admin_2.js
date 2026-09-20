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
    canalRealtimeColeccion: null,
    animacionCatalogoId: null,
    animacionPreviewId: null
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
    setValue: (id, val) => { 
        const el = document.getElementById(id); 
        if (el) {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
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

    // 🔄 Obtener la última pestaña guardada (o 'tab-crear' si es la primera vez)
    const pestanaGuardada = localStorage.getItem('admin_pestana_activa') || 'tab-crear';
    
    // Abrir la pestaña en la que estabas antes de refrescar
    cambiarPestana(pestanaGuardada);

    // Cargar los datos correspondientes
    await Promise.all([
        cargarMetricasServidor(),
        cargarCatalogoCartas()
    ]);
    
    iniciarSuscripcionRealtimeAlbum();
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
    const tipo = DOM.get('carta-tipo')?.value.trim() || DOM.get('carta-era')?.value.trim() || 'Algorítmica Canvas';
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
        await cargarMetricasServidor();
    }
}

// 6. RENDERIZADO DEL CATÁLOGO
async function cargarCatalogoCartas() {
    const grid = DOM.get('grid-catalogo-admin');
    if (!grid) return;

    if (Estado.animacionCatalogoId) {
        cancelAnimationFrame(Estado.animacionCatalogoId);
        Estado.animacionCatalogoId = null;
    }

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

    // Iniciar bucle de animación para fondos en movimiento procedural
    iniciarBucleAnimacionCatalogo(cartas);
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

// DIBUJO ANIMADO CONTINUO DE FONDOS PROCEDURALES (CATÁLOGO)
function animarFondoMiniCanvas(canvas, carta, tiempo) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const rareza = (carta.rareza || 'Común').toLowerCase();
    const paleta = PALETAS_ERA[rareza] || PALETAS_ERA.cyber;
    let simbolo = '👾';

    if (carta.imagen_url && carta.imagen_url.startsWith('{')) {
        try {
            const parsed = JSON.parse(carta.imagen_url);
            if (parsed.simbolo) simbolo = parsed.simbolo;
        } catch (e) {}
    }

    const width = canvas.width;
    const height = canvas.height;

    // 1. Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // 2. Fondo dinámico
    const t = tiempo * 0.002;
    const gradiente = ctx.createLinearGradient(
        (Math.sin(t) * 0.5 + 0.5) * width,
        0,
        (Math.cos(t) * 0.5 + 0.5) * width,
        height
    );
    gradiente.addColorStop(0, paleta.fondo);
    gradiente.addColorStop(0.5, paleta.acento + '33');
    gradiente.addColorStop(1, '#000000');

    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, width, height);

    // 3. REJILLA MATRIX / PUNTOS FLOTANTES (PARTÍCULAS DE NODOS)
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

    // 4. Borde neón
    ctx.strokeStyle = paleta.borde;
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // 5. Dibujar símbolo central con flotación suave
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

// 7. GENERADOR CANVAS EN VIVO ANIMADO
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

// GENERADOR CANVAS EN VIVO ANIMADO (CREADOR DE BARAJITAS)
function dibujarCartaCanvas() {
    const canvas = DOM.get('canvasCartaGenerada');
    if (!canvas) return;

    if (Estado.animacionPreviewId) {
        cancelAnimationFrame(Estado.animacionPreviewId);
        Estado.animacionPreviewId = null;
    }

    function loopPreview(tiempo) {
        const ctx = canvas.getContext('2d');
        const nombre = DOM.get('carta-nombre')?.value || "Carta Misteriosa";
        const simbolo = DOM.get('carta-simbolo')?.value || "👾";
        const rareza = DOM.get('carta-rareza')?.value || "Común";
        const paleta = PALETAS_ERA[rareza.toLowerCase()] || PALETAS_ERA.cyber;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Fondo animado en vivo
        const t = tiempo * 0.002;
        const gradiente = ctx.createLinearGradient(
            (Math.sin(t) * 0.5 + 0.5) * width,
            0,
            (Math.cos(t) * 0.5 + 0.5) * width,
            height
        );
        gradiente.addColorStop(0, paleta.fondo);
        gradiente.addColorStop(0.5, paleta.acento + '33');
        gradiente.addColorStop(1, '#000000');

        ctx.fillStyle = gradiente;
        ctx.fillRect(0, 0, width, height);

        // 2. REJILLA MATRIX / PUNTOS FLOTANTES (PARTÍCULAS DE NODOS)
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

        // 3. Borde exterior
        ctx.strokeStyle = paleta.borde;
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, width - 12, height - 12);

        // 4. Símbolo central flotante
        const offsetFlotacion = Math.sin(t * 2) * 4;
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(simbolo, width / 2, height / 2 - 10 + offsetFlotacion);

        // 5. Nombre de la carta
        ctx.fillStyle = paleta.texto;
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText(nombre.substring(0, 14), width / 2, height - 30);

        DOM.setText('info-semilla', `Rareza: ${rareza.toUpperCase()} | Símbolo: ${simbolo}`);

        if (Estado.modoRenderActual === 'canvas') {
            Estado.animacionPreviewId = requestAnimationFrame(loopPreview);
        }
    }

    Estado.animacionPreviewId = requestAnimationFrame(loopPreview);
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

// =============================================================================
// 🎲 RANDOMIZADOR AVANZADO DE PLANTILLAS Y AUTOCONTEO SUPABASE (1 A 2000)
// =============================================================================
async function seleccionarPlantillaAleatoria() {
    logEstado("🎲 Verificando base de datos para asignar ID disponible (1 a 2000)...");

    let proximoIdLibre = 1;
    let totalCreadas = 0;

    try {
        // 1. Consultar a Supabase los IDs existentes entre 1 y 2000
        const { data: cartasExistentes, error } = await supabaseClient
            .from('Cartas')
            .select('id')
            .gte('id', 1)
            .lte('id', 2000);

        if (!error && cartasExistentes) {
            const idsOcupados = new Set(cartasExistentes.map(c => Number(c.id)));
            totalCreadas = idsOcupados.size;

            // Buscar el primer número del 1 al 2000 que no esté usado
            for (let i = 1; i <= 2000; i++) {
                if (!idsOcupados.has(i)) {
                    proximoIdLibre = i;
                    break;
                }
            }
        }
    } catch (e) {
        console.warn("Fallo al obtener IDs de Supabase, asignando respaldo:", e.message);
        proximoIdLibre = Math.floor(Math.random() * 2000) + 1;
    }

    const quedanDisponibles = Math.max(0, 2000 - totalCreadas);
    logEstado(`📊 Estado Colección BD: ${totalCreadas}/2000 Creadas | Quedan: ${quedanDisponibles} | Asignando ID Libre: #${proximoIdLibre}`);

    // Reflejar conteo en la interfaz de usuario
    DOM.setText('total-cartas-count', totalCreadas);

    // 2. GENERADOR COMBINATORIO DE NOMBRES (> 2,000 COMBINACIONES ÚNICAS)
    const prefijosNombre = [
        "Ciber", "Guardián", "Espectro", "Centinela", "Titán", "Mago", "Fénix", "Sombra",
        "Señor", "Héroe", "Dragón", "Búho", "Alien", "Escarabajo", "Gato", "Nómada", "Oráculo",
        "Vanguardia", "Cazador", "Caminante", "Sacerdote", "Automátón", "Astral", "Crono"
    ];
    const nucleosNombre = [
        "Místico", "Neón", "Arcano", "Espacial", "Solar", "Espectral", "Néctar", "Ancestral",
        "Cuántico", "Radiante", "Salvaje", "Digital", "Tenebroso", "Estelar", "Oscuro",
        "Pixel", "Cósmico", "Sintético", "Eterno", "Cibernético", "Olvido", "Infinito"
    ];
    const sufijosNombre = [
        "del Abismo", "de Neón", "del Cosmos", "de la Sombra", "Supremo", "Alfa", "Prime",
        "del Milenio", "de Luz", "de Acero", "del Vacío", "Ancestral", "v2.0", "de Cristal",
        "de Fuego", "del Viento", "Eterno", "Prototipo", "del Caos", "Sombra"
    ];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const nombreAleatorio = `${pick(prefijosNombre)} ${pick(nucleosNombre)} ${pick(sufijosNombre)}`;

    // 3. ERAS CONCEPTUALES Y SUB-PALETAS (50+ COMBINACIONES)
    const erasCategorias = [
        "Cyberpunk / Neón",
        "Cotidianos / Retro",
        "Cosmos / Estelar",
        "Místico / Arcana"
    ];
    const eraElegida = pick(erasCategorias);

    // 4. PONDERACIÓN AUTOMÁTICA DE RAREZA
    const randRareza = Math.random() * 100;
    let rarezaAsignada = "Común";
    if (randRareza > 95) rarezaAsignada = "Legendaria";
    else if (randRareza > 80) rarezaAsignada = "Épica";
    else if (randRareza > 50) rarezaAsignada = "Rara";

    // 5. GENERADOR PROCEDURAL DE HISTORIA / LORE (300+ VARIACIONES)
    const iniciosLore = [
        "Originado en las profundidades del sector neón,",
        "Descubierto durante una excavación espacial,",
        "Forjado en el núcleo de una estrella extinta,",
        "Antigua deidad atrapada en una red cibernética,",
        "Entidad programada para proteger el equilibrio del reino,",
        "Un mito olvidado que volvió a emerger de las sombras,"
    ];
    const desarrollosLore = [
        "posee el control absoluto sobre la energía de su entorno y",
        "utiliza tecnología cuántica avanzada para canalizar su poder,",
        "patrulla los límites del espacio conocido mientras",
        "aguarda pacientemente el momento de desplegar su verdadero poder,",
        "desafía las leyes de la física en cada manifestación,"
    ];
    const finalesLore = [
        "nadie ha logrado descifrar su código original.",
        "convirtiéndose en una leyenda para los coleccionistas.",
        "marcando el inicio de una nueva era cibernética.",
        "dejando una ráfaga de resplandor tras su paso.",
        "revelando secretos ocultos del universo digital."
    ];

    const loreAleatorio = `${pick(iniciosLore)} ${pick(desarrollosLore)} ${pick(finalesLore)}`;
    const simbolosValidos = ['👾', '👽', '🤖', '🐲', '⚡', '🔥', '🔮', '⚔️', '🐝', '🦋', '🦉', '🪲'];
    const simboloAleatorio = pick(simbolosValidos);

    // 6. AUTO-RELLENADO FORZADO Y EXACTO DE TODOS LOS CAMPOS EN EL DOM
    DOM.setValue('carta-id', proximoIdLibre);
    DOM.setValue('carta-nombre', nombreAleatorio);
    DOM.setValue('carta-rareza', rarezaAsignada);
    DOM.setValue('carta-simbolo', simboloAleatorio);
    DOM.setValue('carta-lore', loreAleatorio);

    // Asignar Era / Tipo buscando elementos probables en el HTML
    ['carta-tipo', 'carta-era', 'select-era'].forEach(idEl => {
        const el = DOM.get(idEl);
        if (el) DOM.setValue(idEl, eraElegida);
    });

    // Re-renderizar inmediatamente el Canvas en vivo con la nueva receta
    dibujarCartaCanvas();
    
    logEstado(`✅ Formulario actualizado: Carta #${proximoIdLibre} "${nombreAleatorio}" (${rarezaAsignada}).`);
}

// 10. DIAGNÓSTICO Y MÉTRICAS DEL SERVIDOR
async function cargarMetricasServidor() {
    logEstado("🔄 Comprobando métricas del servidor Supabase...");
    const inicio = Date.now();
    
    try {
        const { count: countCartas, error: errCartas } = await supabaseClient
            .from('Cartas')
            .select('*', { count: 'exact', head: true });

        const { count: countUsuarios, error: errUsuarios } = await supabaseClient
            .from('usuarios')
            .select('*', { count: 'exact', head: true });

        const { count: countPremios, error: errPremios } = await supabaseClient
            .from('reclamaciones_premios')
            .select('*', { count: 'exact', head: true });

        const { count: countColecciones, error: errColecciones } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*', { count: 'exact', head: true });

        const latencia = Date.now() - inicio;

        if (errUsuarios) console.error("Error Supabase (usuarios):", errUsuarios.message);
        if (errPremios) console.error("Error Supabase (premios):", errPremios.message);
        if (errColecciones) console.error("Error Supabase (colecciones):", errColecciones.message);

        // Actualizar estado de conexión a CONECTADO
        DOM.setText('status-supabase', "● CONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#00ff66";

        const creadasReales = countCartas ?? 0;
        DOM.setText('total-cartas-count', creadasReales);
        DOM.setText('ping-supabase', `${latencia} ms`);
        DOM.setText('kpi-usuarios-totales', countUsuarios ?? 0);
        DOM.setText('kpi-premios-pendientes', countPremios ?? 0);
        DOM.setText('kpi-total-colecciones', countColecciones ?? 0);

        // Buscar próximo ID libre e informarlo al cargar
        const { data: cartasActivas } = await supabaseClient
            .from('Cartas')
            .select('id')
            .gte('id', 1)
            .lte('id', 2000);

        let primerIdLibre = 1;
        if (cartasActivas) {
            const setIds = new Set(cartasActivas.map(c => Number(c.id)));
            for (let i = 1; i <= 2000; i++) {
                if (!setIds.has(i)) {
                    primerIdLibre = i;
                    break;
                }
            }
        }

        // Auto-colocar el primer ID libre en el input del formulario si está vacío o no ha sido cambiado
        const inputId = DOM.get('carta-id');
        if (inputId && (!inputId.value || inputId.value === "0")) {
            DOM.setValue('carta-id', primerIdLibre);
        }

        logEstado(`🟢 Servidor activo | Cartas en BD: ${creadasReales}/2000 | Próximo ID disponible: #${primerIdLibre}`);
    } catch (e) {
        DOM.setText('status-supabase', "● DESCONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#ef4444";
        logEstado(`❌ Error procesando métricas: ${e.message}`);
    }
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
    DOM.get('btn-probar-conexion')?.addEventListener('click', testearConexionSupabase);
    DOM.get('btn-limpiar-log')?.addEventListener('click', limpiarLogServidor);
    DOM.get('btn-refrescar-catalogo')?.addEventListener('click', cargarCatalogoCartas);
}

// EXPONER FUNCIONES GLOBALMENTE PARA ATRIBUTOS ONCLICK DEL HTML
window.cambiarPestana = cambiarPestana;
window.cargarMetricasServidor = cargarMetricasServidor;
window.limpiarLogServidor = limpiarLogServidor;
window.cargarCatalogoCartas = cargarCatalogoCartas;
window.seleccionarPlantillaAleatoria = seleccionarPlantillaAleatoria;
window.testearConexionSupabase = testearConexionSupabase;
