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
    animacionPreviewId: null,
    cartaPreviewActual: null,
    procesandoMasivo: false
};

// BANCOS DE SEMILLAS PARA GENERACIÓN PROCEDURAL (1000 UNIDADES POR CATEGORÍA)
const BANCO_CATEGORIAS = {
    emojis: {
        simbolos: ['👾', '🤖', '👽', '👻', '💀', '🤡', '👹', '👺', '🎃', '👽', '🐲', '🔮', '🧿', '⭐', '💥', '🔥', '⚡', '🌟', '💫', '🎯'],
        prefijos: ['Alfa', 'Beta', 'Gama', 'Cyber', 'Neo', 'Quantum', 'Glitch', 'Sintético', 'Ciber', 'Pixel'],
        sufijos: ['Bot', 'Core', 'Node', 'Unit', 'System', 'Matrix', 'Vector', 'Entity', 'Spark', 'Byte'],
        rareza: ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria']
    },
    personajes: {
        simbolos: ['🧙‍♂️', '🧝‍♂️', '🧛‍♂️', '🧟‍♂️', '🦸‍♂️', '🦹‍♂️', '🥷', '👸', '🤴', '🧜‍♂️', '🧚‍♂️', '👼', '🏼', '🧔‍♂️', '💂‍♂️'],
        prefijos: ['Sombra', 'Elfo', 'Mago', 'Guerrero', 'Paladín', 'Necromante', 'Caballero', 'Señor', 'Brujo', 'Espía'],
        sufijos: ['Místico', 'Oscuro', 'Supremo', 'Arcano', 'Eterno', 'Inmortal', 'Divino', 'Sanguinario', 'Ancestral', 'Prohibido'],
        rareza: ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria']
    },
    animales: {
        simbolos: ['🦁', '🐯', '🐻', '🐺', '🦊', '🦅', '🦈', '🐉', '🐍', '🦉', 'Pantera', '🐗', '🦂', '🐊', '🦍'],
        prefijos: ['Feroz', 'Salvaje', 'Alfa', 'Tigre', 'Lobo', 'Águila', 'Oso', 'Bestia', 'Gato', 'Cazador'],
        sufijos: ['Salvajismo', 'Nativo', 'Depredador', 'Voraz', 'Furia', 'Colmillo', 'Garra', 'Rastro', 'Rugido', 'Sombra'],
        rareza: ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria']
    },
    carros: {
        simbolos: ['🏎️', '🚗', '🚘', '🚙', '🛻', '🏎', '🏎️', '🚙', '🚓', '🚕'],
        prefijos: ['Turbo', 'Nitro', 'Cyber', 'V8', 'Racer', 'Hyper', 'Apex', 'Pro', 'Drift', 'Phantom'],
        sufijos: ['GT', 'Speed', 'Velocity', 'Drive', 'Motors', 'Custom', 'Force', 'Overdrive', 'Boost', 'Racer'],
        rareza: ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria']
    }
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

    await Promise.all([
        cargarMetricasServidor(),
        cargarCatalogoCartas()
    ]);
    
    iniciarSuscripcionRealtimeAlbum();

    // 🎨 Generar solo vista previa aleatoria al recargar (SIN guardar en Supabase)
    try {
        const { data: plantillas } = await supabaseClient
            .from('plantillas_criaturas')
            .select('*');

        if (plantillas && plantillas.length > 0) {
            // Seleccionar una plantilla al azar de la lista
            const plantillaAleatoria = plantillas[Math.floor(Math.random() * plantillas.length)];
            
            Estado.cartaPreviewActual = {
                nombre: plantillaAleatoria.nombre || "Criatura",
                simbolo: plantillaAleatoria.emoji || plantillaAleatoria.simbolo || "👾",
                rareza: plantillaAleatoria.rareza || "Común"
            };
            dibujarCartaCanvas();
        }
    } catch (err) {
        logEstado(`⚠️ No se pudo cargar la vista previa inicial: ${err.message}`);
    }
});

// 2. NAVEGACIÓN Y CAMBIO DE PESTAÑAS / PANELES
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
    const targetUser = DOM.findInput(['target-user', 'regalo-usuario', 'usuario-destino'])?.value?.trim();
    const idCartaInput = DOM.findInput(['target-carta-id', 'regalo-carta-id', 'id-carta-regalo']);
    const idCarta = parseInt(idCartaInput?.value, 10);
    const cantidadAñadir = parseInt(DOM.findInput(['target-cantidad', 'regalo-cantidad'])?.value, 10) || 1;

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

// 5. RENDERIZADO DEL CATÁLOGO
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

    ctx.clearRect(0, 0, width, height);

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

// 6. GENERADOR CANVAS EN VIVO ANIMADO
function escucharDibujoCanvas() {
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
        const carta = Estado.cartaPreviewActual || {
            nombre: "Carta Misteriosa",
            simbolo: "👾",
            rareza: "Común"
        };

        const nombre = carta.nombre || "Carta Misteriosa";
        const simbolo = carta.simbolo || "👾";
        const rareza = carta.rareza || "Común";
        const paleta = PALETAS_ERA[rareza.toLowerCase()] || PALETAS_ERA.cyber;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

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

        DOM.setText('info-semilla', `Rareza: ${rareza.toUpperCase()} | Símbolo: ${simbolo}`);

        if (Estado.modoRenderActual === 'canvas') {
            Estado.animacionPreviewId = requestAnimationFrame(loopPreview);
        }
    }

    Estado.animacionPreviewId = requestAnimationFrame(loopPreview);
}

// 7. MOTOR POLLINATIONS IA
async function generarImagenPollinationsDirecta() {
    const promptCustom = DOM.get('prompt-ia-custom')?.value?.trim();
    const nombre = Estado.cartaPreviewActual?.nombre || "creature";
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

async function procesarYGuardarPlantillas() {
    const textarea = DOM.get('input-texto-plantillas') || document.querySelector('textarea');
    if (!textarea || !textarea.value.trim()) {
        alert("Por favor, ingresa el texto plano de las plantillas.");
        return;
    }

    const textoBruto = textarea.value.trim();
    logEstado("⏳ Parseando e insertando plantillas en Supabase...");

    let zonaActual = "Zona Desconocida";
    let eraSugerida = "cotidianos";
    let descripcionGeneral = "Plantilla cargada masivamente";
    const registrosAInsertar = [];

    // Dividir por líneas para identificar zonas o bloques
    const lineas = textoBruto.split('\n');

    for (let linea of lineas) {
        linea = linea.trim();
        if (!linea) continue;

        // Si la línea contiene una descripción o contexto general
        if (linea.includes(':') && !linea.includes('/')) {
            const partes = linea.split(':');
            zonaActual = partes[0].trim();
            descripcionGeneral = partes[1].trim();
            continue;
        }

        // Procesar elementos separados por '/'
        const elementos = linea.split('/');
        for (let item of elementos) {
            item = item.trim();
            if (!item) continue;

            // Extraer el emoji (primeros caracteres UTF-16/32)
            const matchEmoji = item.match(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u);
            const emoji = matchEmoji ? matchEmoji[0] : "👾";

            // Extraer el nombre (removiendo el emoji y posibles descripciones tras ':')
            let textoLimpio = item.replace(emoji, '').trim();
            let loreItem = descripcionGeneral;

            if (textoLimpio.includes(':')) {
                const partesItem = textoLimpio.split(':');
                textoLimpio = partesItem[0].trim();
                loreItem = partesItem[1].trim();
            }

            if (textoLimpio.length > 0) {
                registrosAInsertar.push({
                    emoji: emoji,
                    nombre: textoLimpio,
                    lore: loreItem,
                    zona: zonaActual,
                    era_sugerida: eraSugerida
                });
            }
        }
    }

    if (registrosAInsertar.length === 0) {
        alert("No se pudieron extraer plantillas válidas del texto.");
        return;
    }

    try {
        // Inserción masiva en Supabase (tabla plantillas_criaturas)
        const { data, error } = await supabaseClient
            .from('plantillas_criaturas')
            .insert(registrosAInsertar);

        if (error) {
            alert("Error al guardar en Supabase: " + error.message);
            logEstado(`❌ Error guardando plantillas: ${error.message}`);
            return;
        }

        logEstado(`✅ Se registraron ${registrosAInsertar.length} plantillas con éxito.`);
        alert(`✅ ¡Proceso completado! Se guardaron ${registrosAInsertar.length} plantillas en la base de datos.`);
        
        // Limpiar area y actualizar contadores si aplica
        textarea.value = '';
        if (typeof cargarContadorPlantillas === 'function') {
            cargarContadorPlantillas();
        }

    } catch (err) {
        logEstado(`❌ Excepción al insertar plantillas: ${err.message}`);
    }
}

// =============================================================================
// 🎲 GENERADOR MASIVO POR CATEGORÍA Y AUTOCONTEO SUPABASE (1000 ITEMS POR BOTÓN)
// =============================================================================

function actualizarTextoTituloId(cantidadActualBD) {
    const textoFormateado = `ID DE CARTA (${cantidadActualBD} a 2000):`;
    const labelId = DOM.get('label-carta-id');
    if (labelId) {
        labelId.textContent = textoFormateado;
    }
}

async function generarMasivoPorCategoria(categoria) {
    if (Estado.procesandoMasivo) {
        alert("Ya se está ejecutando un proceso de generación masiva. Por favor espera.");
        return;
    }

    const configCat = BANCO_CATEGORIAS[categoria];
    if (!configCat) {
        alert("Categoría no válida.");
        return;
    }

    Estado.procesandoMasivo = true;
    logEstado(`🚀 Iniciando creación procedural de 1,000 plantillas para la categoría '${categoria.toUpperCase()}'...`);

    const limiteTotal = 1000;
    const tamanoLote = 50;
    let guardadosCorrectamente = 0;

    DOM.setText('contador-masivo-num', '0');

    for (let i = 0; i < limiteTotal; i += tamanoLote) {
        const lote = [];

        for (let j = 0; j < tamanoLote; j++) {
            const indiceActual = i + j + 1;
            const sim = configCat.simbolos[Math.floor(Math.random() * configCat.simbolos.length)];
            const pref = configCat.prefijos[Math.floor(Math.random() * configCat.prefijos.length)];
            const suf = configCat.sufijos[Math.floor(Math.random() * configCat.sufijos.length)];
            const rareza = configCat.rareza[Math.floor(Math.random() * configCat.rareza.length)];

            const nombreGen = `${pref} ${suf} #${Math.floor(1000 + Math.random() * 9000)}`;
            const loreGen = `Entidad procedural pertenecientes al universo de ${categoria}. Rango de combate #${indiceActual}.`;

            lote.push({
                emoji: sim,
                nombre: nombreGen,
                lore: loreGen,
                zona: `Sector ${categoria.toUpperCase()}`,
                era_sugerida: 'cyber',
                rareza: rareza,
                categoria: categoria
            });

            // Muestra en vivo en Canvas el elemento siendo generado
            Estado.cartaPreviewActual = {
                nombre: nombreGen,
                simbolo: sim,
                rareza: rareza
            };
            dibujarCartaCanvas();
        }

        // Envío en bloques (batching) a la tabla plantillas_criaturas
        try {
            const { error } = await supabaseClient
                .from('plantillas_criaturas')
                .insert(lote);

            if (error) {
                logEstado(`⚠️ Error insertando lote ${i / tamanoLote + 1}: ${error.message}`);
            } else {
                guardadosCorrectamente += lote.length;
                DOM.setText('contador-masivo-num', guardadosCorrectamente);
            }
        } catch (err) {
            logEstado(`❌ Excepción enviando lote a Supabase: ${err.message}`);
        }

        // Breve pausa técnica para mantener fluido el navegador y actualizar Canvas
        await new Promise(resolve => setTimeout(resolve, 30));
    }

    Estado.procesandoMasivo = false;
    logEstado(`🎉 ¡Proceso finalizado! Se crearon y guardaron ${guardadosCorrectamente} de 1000 plantillas en 'plantillas_criaturas'.`);
    alert(`🎉 ¡Completado! Se generaron y guardaron ${guardadosCorrectamente} plantillas de tipo ${categoria.toUpperCase()} en Supabase.`);

    await cargarMetricasServidor();
}

// 9. DIAGNÓSTICO Y MÉTRICAS DEL SERVIDOR
async function cargarMetricasServidor() {
    logEstado("🔄 Comprobando métricas del servidor Supabase...");
    const inicio = Date.now();
    
    try {
        const { count: countCartas } = await supabaseClient
            .from('Cartas')
            .select('*', { count: 'exact', head: true });

        const { count: countUsuarios } = await supabaseClient
            .from('usuarios')
            .select('*', { count: 'exact', head: true });

        const { count: countPremios } = await supabaseClient
            .from('reclamaciones_premios')
            .select('*', { count: 'exact', head: true });

        const { count: countColecciones } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*', { count: 'exact', head: true });

        const latencia = Date.now() - inicio;

        DOM.setText('status-supabase', "● CONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#00ff66";

        const creadasReales = countCartas ?? 0;
        
        actualizarTextoTituloId(creadasReales);
        DOM.setText('total-cartas-count', creadasReales);

        DOM.setText('ping-supabase', `${latencia} ms`);
        DOM.setText('kpi-usuarios-totales', countUsuarios ?? 0);
        DOM.setText('kpi-premios-pendientes', countPremios ?? 0);
        DOM.setText('kpi-total-colecciones', countColecciones ?? 0);

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

        const inputId = DOM.findInput(['carta-id', 'id-carta']);
        if (inputId) {
            DOM.setValue(['carta-id', 'id-carta'], primerIdLibre);
        }

        logEstado(`🟢 Servidor activo | Cartas en BD: ${creadasReales}/2000 | Próximo ID disponible: #${primerIdLibre}`);
    } catch (e) {
        DOM.setText('status-supabase', "● DESCONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#ef4444";
        logEstado(`❌ Error procesando métricas: ${e.message}`);
    }
}

// TESTEAR CONEXIÓN CON SUPABASE
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
    DOM.get('btn-procesar-plantillas')?.addEventListener('click', procesarYGuardarPlantillas);
    DOM.get('btn-generar-ia')?.addEventListener('click', generarImagenPollinationsDirecta);
    DOM.get('btn-modo-canvas')?.addEventListener('click', () => seleccionarModoRender('canvas'));
    DOM.get('btn-modo-ia')?.addEventListener('click', () => seleccionarModoRender('ia'));
    
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
window.generarMasivoPorCategoria = generarMasivoPorCategoria;
window.testearConexionSupabase = testearConexionSupabase;
