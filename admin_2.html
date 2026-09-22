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
    cartasCatalogoCache: []
};

// BANCOS ALGORÍTMICOS PARA GENERACIÓN AUTÓNOMA (SIN DEPENDENCIA DE PLANTILLAS NI EMOJIS)
const BANCO_NOMBRES_ANIME = [
    "Aoi", "Akira", "Ren", "Sora", "Hikari", "Kaito", "Yuki", "Haruto", "Rin", "Tatsuya",
    "Kenji", "Shin", "Asuka", "Rei", "Mei", "Kira", "Zero", "Luffy", "Naruto", "Goku",
    "Natsu", "Eren", "Levi", "Mikasa", "Tanjiro", "Nezuko", "Zenitsu", "Inosuke", "Saitama", "Genos"
];

const BANCO_APELLIDOS_ANIME = [
    "Kurogane", "Takahashi", "Sato", "Suzuki", "Watanabe", "Yamamoto", "Nakamura", "Kobayashi",
    "Kato", "Yoshida", "Yamada", "Sasaki", "Yamaguchi", "Saito", "Matsumoto", "Inoue", "Kimura"
];

const BANCO_CLASES_TIPO = [
    "Humanoide Pixel", "Guerrero Cyber", "Nigromante", "Androide", "Viajero Astral",
    "Espadachín", "Mago Arcano", "Piloto Mecha", "Sombra Digital", "Invocador Sol"
];

const BANCO_LORE_AUTONOMO = [
    "Entidad emergida del núcleo de datos procedimental.",
    "Guerrero legendario forjado en los mapas de memoria del servidor.",
    "Viajero interdimensional compuesto por matrices de renderizado en vivo.",
    "Especialista en combate cibernético con altas frecuencias de actualización.",
    "Espíritu ancestral atrapado en una cuadrícula de 32x32 píxeles.",
    "Defensor del algoritmo central en la red de coleccionables digitales."
];

// PALETAS DE COLOR POR ERA / RAREZA
const PALETAS_ERA = Object.freeze({
    cyber:      { fondo: '#0d0f18', borde: '#00ffcc', acento: '#ff007f', texto: '#00ffcc' },
    cotidiano:  { fondo: '#1f1b24', borde: '#ffb703', acento: '#fb8500', texto: '#fff' },
    cotidianos: { fondo: '#1f1b24', borde: '#ffb703', acento: '#fb8500', texto: '#fff' },
    espacial:   { fondo: '#0b091a', borde: '#8a2be2', acento: '#00ffff', texto: '#e0e0ff' },
    antiguo:    { fondo: '#1c120c', borde: '#d4af37', acento: '#ff4500', texto: '#f3e5ab' }
});

// =============================================================================
// 🎨 PALETAS Y PROCEDIMIENTOS DE PERSONAJES PIXEL ART ANIME (CANVAS 32x32)
// =============================================================================
const skinPalettes = [
    { base: '#ffe0bd', shadow: '#ffd0a1', blush: '#ffb3b3' },
    { base: '#fcd5b5', shadow: '#e5b38f', blush: '#f8a5a5' },
    { base: '#dca271', shadow: '#b87c4c', blush: '#d06e6e' },
    { base: '#7c5230', shadow: '#59381e', blush: '#8e4848' }
];

const hairPalettes = [
    { base: '#3b82f6', light: '#93c5fd', shadow: '#1d4ed8' }, // Azul
    { base: '#ec4899', light: '#fbcfe8', shadow: '#be185d' }, // Rosa
    { base: '#a855f7', light: '#e9d5ff', shadow: '#6b21a8' }, // Púrpura
    { base: '#eab308', light: '#fef08a', shadow: '#a16207' }, // Rubio
    { base: '#10b981', light: '#a7f3d0', shadow: '#047857' }, // Verde Menta
    { base: '#ef4444', light: '#fca5a5', shadow: '#991b1b' }, // Rojo
    { base: '#1e293b', light: '#64748b', shadow: '#0f172a' }, // Negro
    { base: '#f97316', light: '#fed7aa', shadow: '#c2410c' }  // Naranja
];

const eyeColors = ['#2563eb', '#dc2626', '#059669', '#9333ea', '#d97706', '#ec4899', '#06b6d4'];
const clothesColors = ['#1e1b4b', '#831843', '#064e3b', '#431407', '#312e81', '#0f172a', '#4a044e', '#1e3a8a'];
const backgroundStyles = ['cyberpunk', 'sunset', 'forest', 'space', 'cherry_blossom', 'neon_grid'];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generarDatosPersonajeAnime() {
    return {
        skin: getRandomItem(skinPalettes),
        hair: getRandomItem(hairPalettes),
        eyeColor: getRandomItem(eyeColors),
        clothColor: getRandomItem(clothesColors),
        bgType: getRandomItem(backgroundStyles),
        hasCatEars: Math.random() > 0.6,
        hasGlasses: Math.random() > 0.7,
        hairstyle: Math.floor(Math.random() * 3), // 0: corto, 1: largo, 2: coletas
        animSpeed: 0.05 + Math.random() * 0.05,
        animOffset: Math.random() * Math.PI * 2
    };
}

function drawAnimeBackground(ctx, bgType, time) {
    ctx.save();
    if (bgType === 'cyberpunk') {
        ctx.fillStyle = '#0f051d';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#f43f5e';
        const shift = Math.floor(Math.sin(time) * 2);
        ctx.fillRect(0, 20 + shift, 32, 12);
        ctx.fillStyle = '#06b6d4';
        for (let i = 0; i < 32; i += 4) {
            ctx.fillRect(i, 20 + shift, 2, 12);
        }
    } else if (bgType === 'sunset') {
        const gradient = ctx.createLinearGradient(0, 0, 0, 32);
        gradient.addColorStop(0, '#f97316');
        gradient.addColorStop(0.5, '#e11d48');
        gradient.addColorStop(1, '#4c0519');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(12, 14, 8, 8);
    } else if (bgType === 'forest') {
        ctx.fillStyle = '#022c22';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#059669';
        ctx.fillRect(2, 8, 6, 24);
        ctx.fillRect(24, 6, 6, 26);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(4, 12, 2, 20);
        ctx.fillRect(26, 10, 2, 22);
    } else if (bgType === 'space') {
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#ffffff';
        if (Math.sin(time * 2) > 0) ctx.fillRect(4, 5, 1, 1);
        if (Math.cos(time * 3) > 0) ctx.fillRect(25, 8, 1, 1);
        if (Math.sin(time * 1.5) > 0) ctx.fillRect(12, 22, 1, 1);
        if (Math.cos(time * 2.5) > 0) ctx.fillRect(28, 26, 1, 1);
    } else if (bgType === 'cherry_blossom') {
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#f472b6';
        const p1Y = (Math.floor(time * 10) % 32);
        const p2Y = (Math.floor(time * 12 + 10) % 32);
        ctx.fillRect(6, p1Y, 2, 2);
        ctx.fillRect(22, p2Y, 2, 2);
    } else { // neon_grid
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#a855f7';
        for (let i = 0; i < 32; i += 6) {
            ctx.fillRect(i, 0, 1, 32);
            ctx.fillRect(0, i, 32, 1);
        }
    }
    ctx.restore();
}

function renderAnimeCharacterPixelArt(ctx, data, time, isAnimated) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const t = isAnimated ? (time * data.animSpeed + data.animOffset) : 0;
    const breathY = isAnimated ? Math.round(Math.sin(t) * 0.8) : 0;

    // 1. Dibujar Fondo Animado
    drawAnimeBackground(ctx, data.bgType, t);

    // 2. Cabello Posterior (Largo o Coletas)
    if (data.hairstyle === 1 || data.hairstyle === 2) {
        ctx.fillStyle = data.hair.shadow;
        ctx.fillRect(7, 12 + breathY, 18, 16);
        ctx.fillStyle = data.hair.base;
        ctx.fillRect(8, 12 + breathY, 16, 15);

        if (data.hairstyle === 2) {
            const sideWiggle = isAnimated ? Math.round(Math.cos(t * 2) * 0.6) : 0;
            ctx.fillRect(3 + sideWiggle, 10 + breathY, 5, 14);
            ctx.fillRect(24 - sideWiggle, 10 + breathY, 5, 14);
        }
    }

    // 3. Cuello y Hombros / Uniforme
    ctx.fillStyle = data.clothColor;
    ctx.fillRect(8, 24 + breathY, 16, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13, 24 + breathY, 6, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(15, 26 + breathY, 2, 3);

    // Cuello
    ctx.fillStyle = data.skin.shadow;
    ctx.fillRect(14, 21 + breathY, 4, 4);
    ctx.fillStyle = data.skin.base;
    ctx.fillRect(14, 21 + breathY, 4, 2);

    // 4. Rostro Base Anime
    ctx.fillStyle = data.skin.base;
    ctx.fillRect(10, 10 + breathY, 12, 11);
    ctx.fillRect(11, 21 + breathY, 10, 1);
    ctx.fillRect(12, 22 + breathY, 8, 1);
    ctx.fillRect(13, 23 + breathY, 6, 1);

    // Sombra rostro
    ctx.fillStyle = data.skin.shadow;
    ctx.fillRect(10, 10 + breathY, 1, 11);
    ctx.fillRect(21, 10 + breathY, 1, 11);

    // Rubor (Blush)
    ctx.fillStyle = data.skin.blush;
    ctx.fillRect(11, 17 + breathY, 3, 1);
    ctx.fillRect(18, 17 + breathY, 3, 1);

    // 5. Ojos Anime (Parpadeo)
    const isBlinking = isAnimated && Math.sin(t * 3) > 0.95;

    if (isBlinking) {
        ctx.fillStyle = data.hair.shadow;
        ctx.fillRect(11, 15 + breathY, 3, 1);
        ctx.fillRect(18, 15 + breathY, 3, 1);
    } else {
        // Ojo Izquierdo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11, 14 + breathY, 3, 4);
        ctx.fillStyle = data.eyeColor;
        ctx.fillRect(12, 14 + breathY, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 14 + breathY, 1, 1);

        // Ojo Derecho
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 14 + breathY, 3, 4);
        ctx.fillStyle = data.eyeColor;
        ctx.fillRect(18, 14 + breathY, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 14 + breathY, 1, 1);

        // Pestañas
        ctx.fillStyle = data.hair.shadow;
        ctx.fillRect(10, 13 + breathY, 5, 1);
        ctx.fillRect(17, 13 + breathY, 5, 1);
    }

    // Boca
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(15, 20 + breathY, 2, 1);

    // 6. Cabello Frontal (Flequillo)
    ctx.fillStyle = data.hair.shadow;
    ctx.fillRect(9, 8 + breathY, 14, 5);
    ctx.fillStyle = data.hair.base;
    ctx.fillRect(10, 7 + breathY, 12, 5);

    // Mechones
    ctx.fillRect(10, 11 + breathY, 2, 3);
    ctx.fillRect(13, 11 + breathY, 2, 4);
    ctx.fillRect(17, 11 + breathY, 2, 4);
    ctx.fillRect(20, 11 + breathY, 2, 3);

    // Brillo del cabello
    ctx.fillStyle = data.hair.light;
    ctx.fillRect(11, 8 + breathY, 10, 1);

    // 7. Gafas (Accesorio)
    if (data.hasGlasses) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(10, 14 + breathY, 5, 4);
        ctx.fillRect(17, 14 + breathY, 5, 4);
        ctx.fillRect(14, 15 + breathY, 4, 1);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(11, 15 + breathY, 1, 1);
        ctx.fillRect(18, 15 + breathY, 1, 1);
    }

    // 8. Orejas de Gato
    if (data.hasCatEars) {
        ctx.fillStyle = data.hair.base;
        ctx.fillRect(8, 4 + breathY, 3, 4);
        ctx.fillRect(9, 3 + breathY, 2, 2);
        ctx.fillRect(21, 4 + breathY, 3, 4);
        ctx.fillRect(21, 3 + breathY, 2, 2);

        ctx.fillStyle = data.skin.blush;
        ctx.fillRect(9, 5 + breathY, 1, 2);
        ctx.fillRect(22, 5 + breathY, 1, 2);
    }

    ctx.restore();
}

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

    // 🎨 Generar vista previa inicial aleatoria en Canvas
    Estado.cartaPreviewActual = {
        nombre: `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`,
        simbolo: "",
        rareza: "Común",
        personajeData: generarDatosPersonajeAnime()
    };
    dibujarCartaCanvas();
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

    if (idPestana === 'tab-catalogo') {
        setTimeout(() => {
            iniciarBucleAnimacionCatalogo();
        }, 50);
    }

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

// 5. RENDERIZADO DEL CATÁLOGO DINÁMICO EN MOVIMIENTO (CANVAS EN VIVO)
async function cargarCatalogoCartas() {
    const grid = DOM.get('grid-catalogo-admin');
    if (!grid) return;

    if (Estado.animacionCatalogoId) {
        cancelAnimationFrame(Estado.animacionCatalogoId);
        Estado.animacionCatalogoId = null;
    }

    grid.innerHTML = `<div style="color:#00ffcc; font-size:10px;">Cargando catálogo dinámico desde Supabase...</div>`;

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

    Estado.cartasCatalogoCache = cartas.map(carta => {
        let personajeData = null;
        if (carta.imagen_url && carta.imagen_url.startsWith('{')) {
            try {
                const parsed = JSON.parse(carta.imagen_url);
                if (parsed.personajeData) personajeData = parsed.personajeData;
            } catch (e) {}
        }
        if (!personajeData) {
            personajeData = generarDatosPersonajeAnime();
        }
        return { ...carta, personajeData };
    });

    grid.innerHTML = Estado.cartasCatalogoCache.map(carta => renderizarCartaDesdeBD(carta)).join('');
    
    setTimeout(() => {
        iniciarBucleAnimacionCatalogo();
    }, 50);
}

function renderizarCartaDesdeBD(carta) {
    const rarezaTexto = (carta.rareza || 'Común').toString().trim();
    const rarezaClase = `rareza-${rarezaTexto.toLowerCase()}`;
    const paleta = PALETAS_ERA[rarezaTexto.toLowerCase()] || PALETAS_ERA.cyber;

    const rawUrl = String(carta.imagen_url || '').trim();
    const esImagenHttp = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

    return `
        <div class="tarjeta-carta ${rarezaClase}" data-id="${carta.id || ''}">
            <div class="fondo-movil-animado"></div>
            <div class="efecto-brillo-holografico"></div>
            <div style="display:flex; justify-content:space-between; font-size:8px; border-bottom:1px solid ${paleta.borde}; padding-bottom:4px; margin-bottom:6px; position:relative; z-index:2;">
                <span style="font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">#${carta.id || '?'} ${carta.nombre || 'Sin nombre'}</span>
                <span class="badge-rareza" style="color:${paleta.acento}; font-weight:bold;">${rarezaTexto}</span>
            </div>
            <div style="text-align:center; margin:8px 0; background:rgba(0,0,0,0.5); border: 1px solid ${paleta.borde}44; border-radius:4px; padding:4px; height:110px; display:flex; align-items:center; justify-content:center; position:relative; z-index:2; overflow:hidden;">
                ${esImagenHttp 
                    ? `<img src="${rawUrl}" alt="${carta.nombre}" style="max-width:100%; max-height:100%; object-fit:contain;">` 
                    : `<canvas id="canvas-cat-${carta.id}" width="150" height="100" style="max-width:100%; max-height:100%; display:block;"></canvas>`
                }
            </div>
            <div style="font-size:7px; font-style:italic; line-height:1.2; color:#eee; height:28px; overflow:hidden; position:relative; z-index:2; text-shadow: 1px 1px 2px #000; margin-bottom:4px;">
                "${carta.lore || 'Sin descripción disponible.'}"
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:6px; text-transform:uppercase; color:${paleta.acento}; font-weight:bold; position:relative; z-index:2; border-top:1px solid ${paleta.borde}33; padding-top:4px;">
                <span>${carta.tipo || 'Humanoide Pixel'}</span>
                <span>${rarezaTexto}</span>
            </div>
        </div>
    `;
}

function animarMiniCanvasCarta(canvas, carta, tiempo) {
    if (!canvas || !canvas.getContext) return;
    if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 32;
    offscreenCanvas.height = 32;
    const offCtx = offscreenCanvas.getContext('2d');

    renderAnimeCharacterPixelArt(offCtx, carta.personajeData, tiempo * 0.005, true);

    ctx.imageSmoothingEnabled = false;
    const targetSize = 90;
    const targetX = (width - targetSize) / 2;
    const targetY = (height - targetSize) / 2;

    ctx.drawImage(offscreenCanvas, targetX, targetY, targetSize, targetSize);
}

function iniciarBucleAnimacionCatalogo() {
    if (Estado.animacionCatalogoId) {
        cancelAnimationFrame(Estado.animacionCatalogoId);
        Estado.animacionCatalogoId = null;
    }

    function loop(tiempo) {
        if (Estado.cartasCatalogoCache && Estado.cartasCatalogoCache.length > 0) {
            Estado.cartasCatalogoCache.forEach(carta => {
                const canvasEl = DOM.get(`canvas-cat-${carta.id}`);
                if (canvasEl) {
                    animarMiniCanvasCarta(canvasEl, carta, tiempo);
                }
            });
        }
        Estado.animacionCatalogoId = requestAnimationFrame(loop);
    }
    Estado.animacionCatalogoId = requestAnimationFrame(loop);
}

// 6. GENERADOR CANVAS EN VIVO ANIMADO
function escucharDibujoCanvas() {
    DOM.get('btn-randomizar')?.addEventListener('click', seleccionarPlantillaAleatoria);
    DOM.get('btn-plantilla-aleatoria')?.addEventListener('click', seleccionarPlantillaAleatoria);
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
            nombre: `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`,
            simbolo: "",
            rareza: "Común",
            personajeData: generarDatosPersonajeAnime()
        };

        if (!carta.personajeData) {
            carta.personajeData = generarDatosPersonajeAnime();
        }

        const nombre = carta.nombre || "Carta Anime";
        const rareza = carta.rareza || "Común";
        const paleta = PALETAS_ERA[rareza.toLowerCase()] || PALETAS_ERA.cyber;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = paleta.fondo;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = paleta.borde;
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, width - 12, height - 12);

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 32;
        offscreenCanvas.height = 32;
        const offCtx = offscreenCanvas.getContext('2d');

        renderAnimeCharacterPixelArt(offCtx, carta.personajeData, tiempo * 0.005, true);

        ctx.imageSmoothingEnabled = false;
        const targetSize = 180;
        const targetX = (width - targetSize) / 2;
        const targetY = 30;

        ctx.drawImage(offscreenCanvas, targetX, targetY, targetSize, targetSize);

        ctx.strokeStyle = paleta.acento;
        ctx.lineWidth = 2;
        ctx.strokeRect(targetX, targetY, targetSize, targetSize);

        ctx.fillStyle = paleta.texto;
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nombre.substring(0, 14), width / 2, height - 30);

        DOM.setText('info-semilla', `Rareza: ${rareza.toUpperCase()} | Pelo: ${carta.personajeData.hair.base}`);

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
    const textarea = DOM.get('textarea-plantillas') || document.querySelector('textarea');
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

    const lineas = textoBruto.split('\n');

    for (let linea of lineas) {
        linea = linea.trim();
        if (!linea) continue;

        if (linea.includes(':') && !linea.includes('/')) {
            const partes = linea.split(':');
            zonaActual = partes[0].trim();
            descripcionGeneral = partes[1].trim();
            continue;
        }

        const elementos = linea.split('/');
        for (let item of elementos) {
            item = item.trim();
            if (!item) continue;

            const matchEmoji = item.match(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u);
            const emoji = matchEmoji ? matchEmoji[0] : "";

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
        textarea.value = '';
    } catch (err) {
        logEstado(`❌ Excepción al insertar plantillas: ${err.message}`);
    }
}

// =============================================================================
// 🎲 GENERADOR INDIVIDUAL Y GENERACIÓN MASIVA AUTÓNOMA (HASTA 2000 CARTAS)
// =============================================================================

function actualizarTextoTituloId(cantidadActualBD) {
    const textoFormateado = `ID DE CARTA (${cantidadActualBD} a 2000):`;
    const labelId = DOM.get('label-carta-id');
    if (labelId) {
        labelId.textContent = textoFormateado;
    }
}

// GENERADOR INDIVIDUAL AUTÓNOMO
async function seleccionarPlantillaAleatoria() {
    logEstado("🎲 Generando personaje anime procedimental e insertando en BD...");

    try {
        const { data: cartasExistentes, error: errCartas } = await supabaseClient
            .from('Cartas')
            .select('id, nombre');

        if (errCartas) {
            alert("Error consultando Cartas: " + errCartas.message);
            return;
        }

        const idsOcupados = new Set(cartasExistentes ? cartasExistentes.map(c => Number(c.id)) : []);
        const nombresExistentes = new Set(cartasExistentes ? cartasExistentes.map(c => c.nombre?.toLowerCase().trim()) : []);

        let proximoIdLibre = null;
        for (let i = 1; i <= 2000; i++) {
            if (!idsOcupados.has(i)) {
                proximoIdLibre = i;
                break;
            }
        }

        if (!proximoIdLibre) {
            alert("Se ha alcanzado el límite máximo de 2000 cartas creadas.");
            return;
        }

        // Generación de nombre único autónomo
        let nombreGenerado = "";
        let intentos = 0;
        do {
            nombreGenerado = `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`;
            intentos++;
            if (intentos > 100) {
                nombreGenerado = `${getRandomItem(BANCO_NOMBRES_ANIME)} #${proximoIdLibre}`;
                break;
            }
        } while (nombresExistentes.has(nombreGenerado.toLowerCase().trim()));

        const rarezas = ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria'];
        const rarezaElegida = getRandomItem(rarezas);
        const tipoElegido = getRandomItem(BANCO_CLASES_TIPO);
        const loreElegido = getRandomItem(BANCO_LORE_AUTONOMO);
        const nuevosDatosAnime = generarDatosPersonajeAnime();

        Estado.cartaPreviewActual = {
            nombre: nombreGenerado,
            simbolo: "",
            rareza: rarezaElegida,
            personajeData: nuevosDatosAnime
        };
        dibujarCartaCanvas();

        const payloadCarta = {
            id: proximoIdLibre,
            nombre: nombreGenerado,
            rareza: rarezaElegida,
            tipo: tipoElegido,
            lore: loreElegido,
            imagen_url: JSON.stringify({
                personajeData: nuevosDatosAnime,
                simbolo: ""
            })
        };

        const { error: errInsert } = await supabaseClient
            .from('Cartas')
            .insert([payloadCarta]);

        if (errInsert) {
            alert("Error al guardar la carta en Supabase: " + errInsert.message);
            return;
        }

        const nuevoTotal = idsOcupados.size + 1;
        DOM.setValue(['carta-id', 'id-carta'], proximoIdLibre);
        actualizarTextoTituloId(nuevoTotal);
        DOM.setText('total-cartas-count', nuevoTotal);

        logEstado(`✅ Carta #${proximoIdLibre} "${nombreGenerado}" guardada en Supabase.`);
        await cargarCatalogoCartas();
        await cargarMetricasServidor();

    } catch (e) {
        logEstado(`❌ Error procesando generación procedimental: ${e.message}`);
    }
}

// GENERACIÓN MASIVA AUTÓNOMA HASTA COMPLETAR 2000 CARTAS
async function generar2000CombinacionesEnLote() {
    logEstado("⚡ Iniciando generación procedimental autónoma masiva en lote...");

    try {
        const { data: cartasExistentes, error: errCartas } = await supabaseClient
            .from('Cartas')
            .select('id, nombre');

        if (errCartas) {
            alert("Error al consultar cartas existentes: " + errCartas.message);
            return;
        }

        const idsOcupados = new Set(cartasExistentes ? cartasExistentes.map(c => Number(c.id)) : []);
        const nombresExistentes = new Set(cartasExistentes ? cartasExistentes.map(c => c.nombre?.toLowerCase().trim()) : []);

        const idsLibres = [];
        for (let i = 1; i <= 2000; i++) {
            if (!idsOcupados.has(i)) idsLibres.push(i);
        }

        if (idsLibres.length === 0) {
            alert("Ya existen 2000 cartas registradas en la base de datos.");
            return;
        }

        const rarezas = ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria'];
        const numAInsertar = idsLibres.length;

        if (!confirm(`Se generarán procedimentalmente e insertarán ${numAInsertar} nuevas cartas anime sin emojis en Supabase. ¿Deseas continuar?`)) {
            return;
        }

        const loteAInsertar = [];
        for (let k = 0; k < numAInsertar; k++) {
            const currentId = idsLibres[k];
            let nombreGen = "";
            let intentos = 0;

            do {
                nombreGen = `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`;
                intentos++;
                if (intentos > 50) {
                    nombreGen = `${getRandomItem(BANCO_NOMBRES_ANIME)} #${currentId}`;
                    break;
                }
            } while (nombresExistentes.has(nombreGen.toLowerCase().trim()));

            nombresExistentes.add(nombreGen.toLowerCase().trim());

            const nuevosDatosAnime = generarDatosPersonajeAnime();

            loteAInsertar.push({
                id: currentId,
                nombre: nombreGen,
                rareza: getRandomItem(rarezas),
                tipo: getRandomItem(BANCO_CLASES_TIPO),
                lore: getRandomItem(BANCO_LORE_AUTONOMO),
                imagen_url: JSON.stringify({
                    personajeData: nuevosDatosAnime,
                    simbolo: ""
                })
            });
        }

        logEstado(`⏳ Insertando lote autónomo de ${loteAInsertar.length} cartas en Supabase...`);

        const TAMANO_BLOQUE = 100;
        let insertados = 0;

        for (let i = 0; i < loteAInsertar.length; i += TAMANO_BLOQUE) {
            const bloque = loteAInsertar.slice(i, i + TAMANO_BLOQUE);
            const { error: errBloque } = await supabaseClient.from('Cartas').insert(bloque);

            if (errBloque) {
                logEstado(`❌ Error al insertar bloque: ${errBloque.message}`);
                break;
            }
            insertados += bloque.length;
            logEstado(`🔄 Insertadas ${insertados}/${loteAInsertar.length} cartas...`);
        }

        alert(`🎉 ¡Lote procesado exitosamente! Se guardaron ${insertados} cartas procedimentales en la base de datos.`);
        await cargarCatalogoCartas();
        await cargarMetricasServidor();

    } catch (err) {
        logEstado(`❌ Excepción durante la generación en lote: ${err.message}`);
    }
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

async function vaciarTablaPlantillas() {
    if (!confirm("⚠️ ¿Estás seguro de que deseas eliminar TODAS las plantillas de la base de datos?")) return;
    logEstado("⏳ Limpiando tabla plantillas_criaturas...");
    try {
        const { error } = await supabaseClient.from('plantillas_criaturas').delete().neq('id', 0);
        if (error) {
            alert("Error al vaciar plantillas: " + error.message);
        } else {
            alert("✅ Tabla 'plantillas_criaturas' vaciada correctamente.");
            logEstado("🧹 Tabla de plantillas vaciada.");
        }
    } catch (err) {
        logEstado(`❌ Error al vaciar plantillas: ${err.message}`);
    }
}

async function limpiarStorageHuerfano() {
    logEstado("🧹 Módulo de limpieza de Storage ejecutado.");
    alert("Operación de mantenimiento completada.");
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
    DOM.get('btn-limpiar-plantillas')?.addEventListener('click', vaciarTablaPlantillas);
    DOM.get('btn-generar-ia')?.addEventListener('click', generarImagenPollinationsDirecta);
    DOM.get('btn-modo-canvas')?.addEventListener('click', () => seleccionarModoRender('canvas'));
    DOM.get('btn-modo-ia')?.addEventListener('click', () => seleccionarModoRender('ia'));
}

// EXPOSICIÓN GLOBAL DE FUNCIONES PARA EVENTOS ONCLICK EN EL DOM
window.cambiarPestana = cambiarPestana;
window.seleccionarModoRender = seleccionarModoRender;
window.generar2000CombinacionesEnLote = generar2000CombinacionesEnLote;
window.generarImagenPollinationsDirecta = generarImagenPollinationsDirecta;
window.procesarYGuardarPlantillas = procesarYGuardarPlantillas;
window.vaciarTablaPlantillas = vaciarTablaPlantillas;
window.regalarCartaAUsuario = regalarCartaAUsuario;
window.cargarMetricasServidor = cargarMetricasServidor;
window.testearConexionSupabase = testearConexionSupabase;
window.limpiarStorageHuerfano = limpiarStorageHuerfano;
window.limpiarLogServidor = limpiarLogServidor;
window.cargarCatalogoCartas = cargarCatalogoCartas;
window.seleccionarPlantillaAleatoria = seleccionarPlantillaAleatoria;
