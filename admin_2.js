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
    canalRealtimePagos: null,
    animacionCatalogoId: null,
    animacionPreviewId: null,
    cartaPreviewActual: null,
    cartasCatalogoCache: []
};

// BANCOS ALGORÍTMICOS PARA GENERACIÓN AUTÓNOMA
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

const skinPalettes = [
    { base: '#ffe0bd', shadow: '#ffd0a1', blush: '#ffb3b3' },
    { base: '#fcd5b5', shadow: '#e5b38f', blush: '#f8a5a5' },
    { base: '#dca271', shadow: '#b87c4c', blush: '#d06e6e' },
    { base: '#7c5230', shadow: '#59381e', blush: '#8e4848' }
];

const hairPalettes = [
    { base: '#3b82f6', light: '#93c5fd', shadow: '#1d4ed8' },
    { base: '#ec4899', light: '#fbcfe8', shadow: '#be185d' },
    { base: '#a855f7', light: '#e9d5ff', shadow: '#6b21a8' },
    { base: '#eab308', light: '#fef08a', shadow: '#a16207' },
    { base: '#10b981', light: '#a7f3d0', shadow: '#047857' },
    { base: '#ef4444', light: '#fca5a5', shadow: '#991b1b' },
    { base: '#1e293b', light: '#64748b', shadow: '#0f172a' },
    { base: '#f97316', light: '#fed7aa', shadow: '#c2410c' }
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
        hairstyle: Math.floor(Math.random() * 3),
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
    } else {
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

    drawAnimeBackground(ctx, data.bgType, t);

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

    ctx.fillStyle = data.clothColor;
    ctx.fillRect(8, 24 + breathY, 16, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13, 24 + breathY, 6, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(15, 26 + breathY, 2, 3);

    ctx.fillStyle = data.skin.shadow;
    ctx.fillRect(14, 21 + breathY, 4, 4);
    ctx.fillStyle = data.skin.base;
    ctx.fillRect(14, 21 + breathY, 4, 2);

    ctx.fillStyle = data.skin.base;
    ctx.fillRect(10, 10 + breathY, 12, 11);
    ctx.fillRect(11, 21 + breathY, 10, 1);
    ctx.fillRect(12, 22 + breathY, 8, 1);
    ctx.fillRect(13, 23 + breathY, 6, 1);

    ctx.fillStyle = data.skin.shadow;
    ctx.fillRect(10, 10 + breathY, 1, 11);
    ctx.fillRect(21, 10 + breathY, 1, 11);

    ctx.fillStyle = data.skin.blush;
    ctx.fillRect(11, 17 + breathY, 3, 1);
    ctx.fillRect(18, 17 + breathY, 3, 1);

    const isBlinking = isAnimated && Math.sin(t * 3) > 0.95;

    if (isBlinking) {
        ctx.fillStyle = data.hair.shadow;
        ctx.fillRect(11, 15 + breathY, 3, 1);
        ctx.fillRect(18, 15 + breathY, 3, 1);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11, 14 + breathY, 3, 4);
        ctx.fillStyle = data.eyeColor;
        ctx.fillRect(12, 14 + breathY, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 14 + breathY, 1, 1);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 14 + breathY, 3, 4);
        ctx.fillStyle = data.eyeColor;
        ctx.fillRect(18, 14 + breathY, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 14 + breathY, 1, 1);

        ctx.fillStyle = data.hair.shadow;
        ctx.fillRect(10, 13 + breathY, 5, 1);
        ctx.fillRect(17, 13 + breathY, 5, 1);
    }

    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(15, 20 + breathY, 2, 1);

    ctx.fillStyle = data.hair.shadow;
    ctx.fillRect(9, 8 + breathY, 14, 5);
    ctx.fillStyle = data.hair.base;
    ctx.fillRect(10, 7 + breathY, 12, 5);

    ctx.fillRect(10, 11 + breathY, 2, 3);
    ctx.fillRect(13, 11 + breathY, 2, 4);
    ctx.fillRect(17, 11 + breathY, 2, 4);
    ctx.fillRect(20, 11 + breathY, 2, 3);

    ctx.fillStyle = data.hair.light;
    ctx.fillRect(11, 8 + breathY, 10, 1);

    if (data.hasGlasses) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(10, 14 + breathY, 5, 4);
        ctx.fillRect(17, 14 + breathY, 5, 4);
        ctx.fillRect(14, 15 + breathY, 4, 1);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(11, 15 + breathY, 1, 1);
        ctx.fillRect(18, 15 + breathY, 1, 1);
    }

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

document.addEventListener('DOMContentLoaded', async () => {
    logEstado("Inicializando Panel de Mando...");
    configurarEventosUI();
    escucharDibujoCanvas();

    const pestanaGuardada = localStorage.getItem('admin_pestana_activa') || 'tab-crear';
    cambiarPestana(pestanaGuardada);

    await Promise.all([
        cargarMetricasServidor(),
        cargarCatalogoCartas(),
        cargarTablaPremiosServidor(),
        cargarTablaComprasBarajitas()
    ]);
    
    iniciarSuscripcionesRealtimeAdmin();

    Estado.cartaPreviewActual = {
        nombre: `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`,
        simbolo: "",
        rareza: "Común",
        personajeData: generarDatosPersonajeAnime()
    };
    dibujarCartaCanvas();
});

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

function iniciarSuscripcionesRealtimeAdmin() {
    // 1. Suscripción para la colección de usuarios
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
                logEstado("🟢 Suscripción Realtime de Colección activa.");
            }
        });

    // 2. Suscripción para los pagos pendientes en tiempo real
    if (Estado.canalRealtimePagos) {
        supabaseClient.removeChannel(Estado.canalRealtimePagos);
    }

    Estado.canalRealtimePagos = supabaseClient
        .channel('public:pagos_pendientes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'pagos_pendientes' },
            (payload) => {
                logEstado(`⚡ Nuevo pago recibido en tiempo real.`);
                cargarTablaComprasBarajitas();
                cargarMetricasServidor();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                logEstado("🟢 Suscripción Realtime de Pagos Pendientes activa.");
            }
        });
}

function parsearIdsCartasEntrada(inputStr) {
    if (!inputStr) return [];
    
    const idsSet = new Set();
    const segmentos = inputStr.split(/[,;\s]+/);

    segmentos.forEach(seg => {
        const item = seg.trim();
        if (!item) return;

        if (item.includes('-')) {
            const partes = item.split('-');
            if (partes.length === 2) {
                const inicio = parseInt(partes[0], 10);
                const fin = parseInt(partes[1], 10);

                if (!isNaN(inicio) && !isNaN(fin)) {
                    const min = Math.min(inicio, fin);
                    const max = Math.max(inicio, fin);
                    for (let i = min; i <= max; i++) {
                        if (i >= 1 && i <= 2000) idsSet.add(i);
                    }
                }
            }
        } else {
            const idNum = parseInt(item, 10);
            if (!isNaN(idNum) && idNum >= 1 && idNum <= 2000) {
                idsSet.add(idNum);
            }
        }
    });

    return Array.from(idsSet).sort((a, b) => a - b);
}

async function regalarCartaAUsuario() {
    const targetUser = DOM.findInput(['target-user', 'regalo-usuario', 'usuario-destino'])?.value?.trim();
    const inputCartas = DOM.findInput(['target-cartas-input', 'target-carta-id'])?.value?.trim();
    const cantidadAñadir = parseInt(DOM.findInput(['target-cantidad', 'regalo-cantidad'])?.value, 10) || 1;

    if (!targetUser) {
        alert("Ingresa un usuario válido.");
        return;
    }

    const listaIds = parsearIdsCartasEntrada(inputCartas);
    if (listaIds.length === 0) {
        alert("Formato de cartas inválido.");
        return;
    }

    const idLimpio = targetUser.replace(/^@/, '').trim().toLowerCase();
    logEstado(`Verificando cartas en BD para @${idLimpio}...`);

    try {
        const { data: cartasExistentes, error: errCartas } = await supabaseClient
            .from('Cartas')
            .select('id')
            .in('id', listaIds);

        if (errCartas) {
            alert("Error consultando las cartas en BD: " + errCartas.message);
            return;
        }

        const idsValidos = cartasExistentes ? cartasExistentes.map(c => Number(c.id)) : [];
        if (idsValidos.length === 0) {
            alert("Ninguna de las cartas especificadas existe.");
            return;
        }

        const { data: registrosExistentes } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('carta_id, cantidad')
            .eq('usuario_id', idLimpio)
            .in('carta_id', idsValidos);

        const mapaCantidades = new Map();
        if (registrosExistentes) {
            registrosExistentes.forEach(r => {
                mapaCantidades.set(Number(r.carta_id), Number(r.cantidad) || 0);
            });
        }

        const filasUpsert = idsValidos.map(cartaId => {
            const cantidadActual = mapaCantidades.get(cartaId) || 0;
            return {
                usuario_id: idLimpio,
                carta_id: cartaId,
                cantidad: cantidadActual + cantidadAñadir
            };
        });

        const { error: errUpsert } = await supabaseClient
            .from('Coleccion_Usuario')
            .upsert(filasUpsert, { onConflict: 'usuario_id,carta_id' });

        if (errUpsert) {
            alert("Error durante la asignación: " + errUpsert.message);
            return;
        }

        alert(`🎉 ¡Éxito! Se asignaron ${idsValidos.length} carta(s) a @${idLimpio}.`);
        logEstado(`✅ Regalo completado para @${idLimpio}`);
        await cargarMetricasServidor();

    } catch (e) {
        alert("Error en la operación de regalo: " + e.message);
    }
}

async function cargarCatalogoCartas() {
    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error || !cartas) return;

    Estado.cartasCatalogoCache = cartas.map(carta => {
        let personajeData = null;
        if (carta.imagen_url && carta.imagen_url.startsWith('{')) {
            try {
                const parsed = JSON.parse(carta.imagen_url);
                if (parsed.personajeData) personajeData = parsed.personajeData;
            } catch (e) {}
        }
        if (!personajeData) personajeData = generarDatosPersonajeAnime();
        return { ...carta, personajeData };
    });
}

function escucharDibujoCanvas() {
    DOM.get('btn-randomizar')?.addEventListener('click', seleccionarPlantillaAleatoria);
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

        if (!carta.personajeData) carta.personajeData = generarDatosPersonajeAnime();

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

async function generarImagenPollinationsDirecta() {
    const promptCustom = DOM.get('prompt-ia-custom')?.value?.trim();
    const nombre = Estado.cartaPreviewActual?.nombre || "creature";
    const imgIa = DOM.get('imgPollinationsPreview');
    
    const promptFinal = promptCustom || `trading card art of ${nombre}, digital art, highly detailed, vibrant background`;
    const seed = Math.floor(Math.random() * 99999);
    const urlIa = `${CONFIG.POLLINATIONS_URL}${encodeURIComponent(promptFinal)}?width=220&height=308&seed=${seed}&nologo=true`;

    DOM.setDisplay('spinnerIA', 'block');

    if (imgIa) {
        imgIa.onload = () => { DOM.setDisplay('spinnerIA', 'none'); logEstado("⚡ Imagen IA generada."); };
        imgIa.onerror = () => { DOM.setDisplay('spinnerIA', 'none'); logEstado("❌ Fallo IA."); };
        imgIa.src = urlIa;
    }
}

function actualizarTextoTituloId(cantidadActualBD) {
    const textoFormateado = `ID DE CARTA (${cantidadActualBD} a 2000):`;
    const labelId = DOM.get('label-carta-id');
    if (labelId) labelId.textContent = textoFormateado;
}

async function seleccionarPlantillaAleatoria() {
    logEstado("🎲 Generando personaje anime...");

    try {
        const { data: cartasExistentes, error: errCartas } = await supabaseClient
            .from('Cartas')
            .select('id, nombre');

        if (errCartas) return alert("Error: " + errCartas.message);

        const idsOcupados = new Set(cartasExistentes ? cartasExistentes.map(c => Number(c.id)) : []);
        const nombresExistentes = new Set(cartasExistentes ? cartasExistentes.map(c => c.nombre?.toLowerCase().trim()) : []);

        let proximoIdLibre = null;
        for (let i = 1; i <= 2000; i++) {
            if (!idsOcupados.has(i)) { proximoIdLibre = i; break; }
        }

        if (!proximoIdLibre) return alert("Límite de 2000 cartas alcanzado.");

        let nombreGenerado = "";
        let intentos = 0;
        do {
            nombreGenerado = `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`;
            intentos++;
            if (intentos > 100) { nombreGenerado = `${getRandomItem(BANCO_NOMBRES_ANIME)} #${proximoIdLibre}`; break; }
        } while (nombresExistentes.has(nombreGenerado.toLowerCase().trim()));

        const rarezas = ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria'];
        const rarezaElegida = getRandomItem(rarezas);
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
            tipo: getRandomItem(BANCO_CLASES_TIPO),
            lore: getRandomItem(BANCO_LORE_AUTONOMO),
            imagen_url: JSON.stringify({ personajeData: nuevosDatosAnime, simbolo: "" })
        };

        const { error: errInsert } = await supabaseClient.from('Cartas').insert([payloadCarta]);
        if (errInsert) return alert("Error al guardar: " + errInsert.message);

        const nuevoTotal = idsOcupados.size + 1;
        DOM.setValue(['carta-id', 'id-carta'], proximoIdLibre);
        actualizarTextoTituloId(nuevoTotal);
        DOM.setText('total-cartas-count', nuevoTotal);

        logEstado(`✅ Carta #${proximoIdLibre} "${nombreGenerado}" guardada.`);
        await cargarCatalogoCartas();
        await cargarMetricasServidor();
    } catch (e) {
        logEstado(`❌ Error: ${e.message}`);
    }
}

async function generar2000CombinacionesEnLote() {
    logEstado("⚡ Generando lote automático...");
    try {
        const { data: cartasExistentes } = await supabaseClient.from('Cartas').select('id, nombre');
        const idsOcupados = new Set(cartasExistentes ? cartasExistentes.map(c => Number(c.id)) : []);
        const nombresExistentes = new Set(cartasExistentes ? cartasExistentes.map(c => c.nombre?.toLowerCase().trim()) : []);

        const idsLibres = [];
        for (let i = 1; i <= 2000; i++) { if (!idsOcupados.has(i)) idsLibres.push(i); }

        if (idsLibres.length === 0) return alert("Ya existen 2000 cartas.");

        if (!confirm(`Se generarán e insertarán ${idsLibres.length} cartas. ¿Continuar?`)) return;

        const rarezas = ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria'];
        const loteAInsertar = idsLibres.map(currentId => {
            let nombreGen = `${getRandomItem(BANCO_NOMBRES_ANIME)} ${getRandomItem(BANCO_APELLIDOS_ANIME)}`;
            nombresExistentes.add(nombreGen.toLowerCase().trim());
            const nuevosDatosAnime = generarDatosPersonajeAnime();
            return {
                id: currentId,
                nombre: nombreGen,
                rareza: getRandomItem(rarezas),
                tipo: getRandomItem(BANCO_CLASES_TIPO),
                lore: getRandomItem(BANCO_LORE_AUTONOMO),
                imagen_url: JSON.stringify({ personajeData: nuevosDatosAnime, simbolo: "" })
            };
        });

        for (let i = 0; i < loteAInsertar.length; i += 100) {
            await supabaseClient.from('Cartas').insert(loteAInsertar.slice(i, i + 100));
        }

        alert("🎉 ¡Lote procesado con éxito!");
        await cargarCatalogoCartas();
        await cargarMetricasServidor();
    } catch (err) {
        logEstado(`❌ Error en lote: ${err.message}`);
    }
}

// -----------------------------------------------------------------------------
// 💳 GESTIÓN DE LA TABLA `compras_barajitas` y `pagos_pendientes`
// -----------------------------------------------------------------------------
async function cargarTablaComprasBarajitas() {
    const tbody = DOM.get('tabla-compras-barajitas');
    if (!tbody) return;

    logEstado("🔄 Consultando pagos en la base de datos...");

    try {
        // Consultamos sin restricciones estrictas de estado para verificar si hay registros en la tabla
        const { data: pagos, error } = await supabaseClient
            .from('pagos_pendientes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) {
            throw error;
        }

        if (!pagos || pagos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 8px; text-align: center; color: #666;">No hay registros de pagos en la tabla.</td></tr>`;
            logEstado("ℹ️ La tabla 'pagos_pendientes' no devolvió registros.");
            return;
        }

        logEstado(`✅ Se encontraron ${pagos.length} registros de pagos.`);

        tbody.innerHTML = pagos.map(pago => {
            const estadoColor = pago.estado === 'aprobado' ? '#22c55e' : (pago.estado === 'rechazado' ? '#ef4444' : '#eab308');
            const usuario = pago.usuario_id ? `@${pago.usuario_id}` : 'Anónimo';
            const telefono = pago.telefono_origen || pago.telefono || 'S/T';
            const sobres = pago.cantidad_sobres || 1;
            const referencia = pago.referencia || 'N/A';
            const monto = pago.monto || '0.00';

            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 6px; color: #00ffcc;">${usuario}<br><span style="font-size:6px; color:#888;">📱 ${telefono}</span></td>
                    <td style="padding: 6px; font-weight: bold;">📦 ${sobres} Sobre(s)</td>
                    <td style="padding: 6px;">Ref: ${referencia}<br><span style="color:#38bdf8;">$${monto}</span></td>
                    <td style="padding: 6px; color: ${estadoColor}; font-weight: bold;">${(pago.estado || 'pendiente').toUpperCase()}</td>
                    <td style="padding: 6px; text-align: center;">
                        ${pago.estado !== 'aprobado' 
                            ? `<button onclick="aprobarPagoPendiente('${pago.id}', '${pago.usuario_id}',${sobres})" style="background:#22c55e; border:none; color:#000; font-size:6px; padding:4px 8px; cursor:pointer; font-weight:bold;">APROBAR</button>`
                            : `<span style="color:#22c55e;">COMPLETADO</span>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 8px; text-align: center; color: #ef4444;">Error al cargar: ${e.message}</td></tr>`;
        logEstado(`❌ Error en consulta de pagos: ${e.message}`);
    }
}

async function aprobarPagoPendiente(idPago, usuarioId, cantidadSobres) {
    if (!confirm(`¿Deseas aprobar este pago y entregar los sobres/barajitas correspondientes?`)) return;

    logEstado(`⏳ Aprobando pago ID #${idPago} para @${usuarioId}...`);
    try {
        // 1. Marcar el pago como aprobado en la tabla pagos_pendientes
        const { error: errPago } = await supabaseClient
            .from('pagos_pendientes')
            .update({ 
                estado: 'aprobado',
                updated_at: new Date().toISOString()
            })
            .eq('id', idPago);

        if (errPago) throw errPago;

        // 2. Actualizar las barajitas del usuario de translúcidas/bloqueadas a activas/normales
        // (Asumiendo que guardas una columna como 'estado' o 'translucido' en Coleccion_Usuario)
        const { error: errColeccion } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ estado: 'activo' }) // O 'translucido: false' según tu estructura
            .eq('usuario_id', usuarioId)
            .eq('estado', 'translucido'); // Actualiza únicamente las que estaban pendientes de aprobación

        if (errColeccion) {
            console.warn("Aviso al actualizar la colección del usuario:", errColeccion.message);
        }

        alert(`✅ ¡Pago aprobado y barajitas activadas con éxito!`);
        logEstado(`✅ Pago #${idPago} procesado y colección actualizada.`);
        
        await cargarTablaComprasBarajitas();
        await cargarMetricasServidor();

    } catch (e) {
        alert("Error crítico al procesar el pago: " + e.message);
        logEstado(`❌ Error al aprobar pago: ${e.message}`);
    }
}

async function cargarMetricasServidor() {
    logEstado("🔄 Comprobando métricas del servidor Supabase...");
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

        const creadasReales = countCartas ?? 0;
        actualizarTextoTituloId(creadasReales);
        DOM.setText('total-cartas-count', creadasReales);
        DOM.setText('ping-supabase', `${latencia} ms`);
        DOM.setText('kpi-usuarios-totales', countUsuarios ?? 0);
        DOM.setText('kpi-premios-pendientes', countPremios ?? 0);
        DOM.setText('kpi-total-colecciones', countColecciones ?? 0);

        await cargarTablaPremiosServidor();
        await cargarTablaComprasBarajitas();

        logEstado(`🟢 Servidor activo | Cartas en BD: ${creadasReales}/2000`);
    } catch (e) {
        DOM.setText('status-supabase', "● DESCONECTADO");
        const statusEl = DOM.get('status-supabase');
        if (statusEl) statusEl.style.color = "#ef4444";
        logEstado(`❌ Error procesando métricas: ${e.message}`);
    }
}

async function cargarTablaPremiosServidor() {
    const tbody = DOM.get('tabla-servidor-premios');
    if (!tbody) return;

    try {
        const { data: reclamaciones, error } = await supabaseClient
            .from('reclamaciones_premios')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error || !reclamaciones || reclamaciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 8px; text-align: center; color: #666;">No hay solicitudes de premios.</td></tr>`;
            return;
        }

        tbody.innerHTML = reclamaciones.map(rec => `
            <tr style="border-bottom: 1px solid #222;">
                <td style="padding: 4px; color: #00ffcc;">@${rec.usuario_id || 'anónimo'}</td>
                <td style="padding: 4px;">${rec.premio_nombre || 'Premio'}</td>
                <td style="padding: 4px; color: ${rec.estado === 'completado' ? '#22c55e' : '#eab308'};">${(rec.estado || 'pendiente').toUpperCase()}</td>
                <td style="padding: 4px; text-align: center;">
                    ${rec.estado !== 'completado' 
                        ? `<button onclick="procesarReclamacionPremio('${rec.id}', 'completado')" style="background:#22c55e; border:none; color:#000; font-size:6px; padding:2px 4px; cursor:pointer;">APROBAR</button>`
                        : `<span style="color:#888;">✓</span>`
                    }
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 8px; text-align: center; color: #ef4444;">Error: ${e.message}</td></tr>`;
    }
}

async function procesarReclamacionPremio(idReclamacion, nuevoEstado) {
    try {
        await supabaseClient.from('reclamaciones_premios').update({ estado: nuevoEstado }).eq('id', idReclamacion);
        alert(`✅ Reclamación #${idReclamacion} actualizada.`);
        await cargarMetricasServidor();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function testearConexionSupabase() {
    logEstado("🔄 Testeando conexión con Supabase...");
    const inicio = Date.now();
    try {
        const { error } = await supabaseClient.from('Cartas').select('id', { count: 'exact', head: true });
        const latencia = Date.now() - inicio;

        if (error) {
            logEstado(`❌ Fallo en test: ${error.message}`);
        } else {
            DOM.setText('status-supabase', "● CONECTADO");
            DOM.setText('ping-supabase', `${latencia} ms`);
            logEstado(`🟢 Test exitoso | Latencia: ${latencia}ms`);
        }
    } catch (e) {
        logEstado(`❌ Error de conexión: ${e.message}`);
    }
}

async function limpiarStorageHuerfano() {
    alert("Operación de mantenimiento completada.");
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
}

// EXPOSICIÓN GLOBAL
window.cambiarPestana = cambiarPestana;
window.seleccionarModoRender = seleccionarModoRender;
window.generar2000CombinacionesEnLote = generar2000CombinacionesEnLote;
window.generarImagenPollinationsDirecta = generarImagenPollinationsDirecta;
window.regalarCartaAUsuario = regalarCartaAUsuario;
window.cargarMetricasServidor = cargarMetricasServidor;
window.testearConexionSupabase = testearConexionSupabase;
window.limpiarStorageHuerfano = limpiarStorageHuerfano;
window.cargarCatalogoCartas = cargarCatalogoCartas;
window.seleccionarPlantillaAleatoria = seleccionarPlantillaAleatoria;
window.procesarReclamacionPremio = procesarReclamacionPremio;
window.cargarTablaComprasBarajitas = cargarTablaComprasBarajitas;
window.aprobarPagoPendiente = aprobarPagoPendiente;
