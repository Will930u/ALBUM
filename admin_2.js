// =============================================================================
// 💻 CONTROLADOR DE ADMINISTRACIÓN, GENERADOR PROCEDURAL / IA Y SERVIDOR
// =============================================================================

// =============================================================================
// ⚙️ CONFIGURACIÓN CENTRALIZADA
// =============================================================================
const CONFIG = {
    SUPABASE_URL: "https://ddbdemxrntjqncetyrnr.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs",
    POLLINATIONS_URL: "https://pollinations.ai/p/",
    RENDER_SERVER_URL: "https://juego-barajitas.onrender.com",
    TELEGRAM_BOT_TOKEN: "<%= TELEGRAM_BOT_TOKEN %>",
    ID_CANAL_ALERTAS: "<%= ID_CANAL_ALERTAS %>"
};

// Inicializar cliente de Supabase
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// =============================================================================
// 📊 ESTADO GLOBAL
// =============================================================================
const Estado = {
    modoRenderActual: 'canvas',
    canalRealtimeColeccion: null,
    canalRealtimePagos: null,
    animacionCatalogoId: null,
    animacionPreviewId: null,
    cartaPreviewActual: null,
    cartasCatalogoCache: []
};

// =============================================================================
// 🎨 BANCOS DE DATOS PARA GENERACIÓN
// =============================================================================
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

// =============================================================================
// 🎨 PALETAS DE COLOR
// =============================================================================
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

// =============================================================================
// 🔧 FUNCIONES AUXILIARES
// =============================================================================
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

// =============================================================================
// 🎨 FUNCIONES DE RENDERIZADO CANVAS
// =============================================================================
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

// =============================================================================
// 🎯 MANIPULACIÓN DEL DOM
// =============================================================================
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
    setText: (id, text) => { 
        const el = document.getElementById(id); 
        if (el) el.textContent = text; 
    },
    setDisplay: (id, display) => { 
        const el = document.getElementById(id); 
        if (el) el.style.display = display; 
    },
    toggleClass: (id, className, force) => { 
        const el = document.getElementById(id); 
        if (el) el.classList.toggle(className, force); 
    }
};

// =============================================================================
// 🚀 INICIALIZACIÓN
// =============================================================================
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

// =============================================================================
// 📑 NAVEGACIÓN DE PESTAÑAS
// =============================================================================
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

// =============================================================================
//  MODO DE RENDERIZADO
// =============================================================================
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

// =============================================================================
#
