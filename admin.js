// =============================================================================
// 🎴 ÁLBUM DIGITAL DE BARAJITAS - NÚCLEO DE COLECCIÓN Y INTERFAZ CANVAS (2026)
// =============================================================================

// Configuración de conexión a Supabase
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables de estado global del Álbum
let idUsuarioTelegram = "utrera930"; // ID por defecto si se prueba fuera de Telegram
let inventarioUsuarioCache = new Map(); // Guarda { carta_id: { cantidad, datosCarta } }
let catalogoGlobalCartas = new Map();   // Guarda metadata de la tabla 'Cartas'
let paginaActual = 1;
const CARTAS_POR_PAGINA = 12;
const TOTAL_CARTAS_COLECCION = 2000;

// Inicialización general al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
    detectarUsuarioTelegram();
    configurarNavegacionInterface();
    await cargarCatalogoCartasGlobal();
    await cargarInventarioInicial();
});

// 1. Detección de Usuario vía SDK de Telegram
function detectarUsuarioTelegram() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        idUsuarioTelegram = user.username ? `@${user.username}` : (user.id ? user.id.toString() : idUsuarioTelegram);
        
        // Expandir Telegram WebApp a pantalla completa
        if (typeof window.Telegram.WebApp.expand === 'function') {
            window.Telegram.WebApp.expand();
        }
    }

    // Actualizar nombre de usuario en la interfaz si existe la etiqueta
    const tagUsuario = document.getElementById('user-telegram-tag') || document.querySelector('.user-telegram-tag');
    if (tagUsuario) {
        tagUsuario.textContent = idUsuarioTelegram;
    }
}

// 2. Carga del Catálogo Base (Tabla 'Cartas')
async function cargarCatalogoCartasGlobal() {
    try {
        const { data, error } = await supabaseClient
            .from('Cartas')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error("❌ Error obteniendo catálogo de Cartas:", error.message);
            return;
        }

        catalogoGlobalCartas.clear();
        if (data) {
            data.forEach(carta => {
                catalogoGlobalCartas.set(Number(carta.id), carta);
            });
        }
        console.log(`📦 Catálogo cargado: ${catalogoGlobalCartas.size} barajitas registradas.`);
    } catch (err) {
        console.error("❌ Excepción al cargar catálogo:", err);
    }
}

// 3. Carga del Inventario del Usuario (Tabla 'Coleccion_Usuario')
async function cargarInventarioInicial() {
    try {
        if (!supabaseClient) return;

        // Formatear cadenas para tolerar consultas con o sin '@'
        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim();
        const idConArroba = `@${idLimpio}`;

        const { data, error } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('carta_id, cantidad')
            .or(`usuario_id.eq.${idLimpio},usuario_id.eq.${idConArroba}`);

        if (error) {
            console.error("❌ Error leyendo Coleccion_Usuario:", error.message);
            return;
        }

        inventarioUsuarioCache.clear();

        if (data && data.length > 0) {
            data.forEach(item => {
                if (item.carta_id !== null && item.carta_id !== undefined) {
                    const idNum = Number(item.carta_id);
                    const cantNum = Number(item.cantidad || 1);
                    const existente = inventarioUsuarioCache.get(idNum);

                    if (existente) {
                        existente.cantidad += cantNum;
                    } else {
                        inventarioUsuarioCache.set(idNum, {
                            carta_id: idNum,
                            cantidad: cantNum
                        });
                    }
                }
            });
        }

        console.log("✅ Colección procesada del usuario:", inventarioUsuarioCache);
        renderizarLibro();

    } catch (err) {
        console.error("❌ Excepción en cargarInventarioInicial:", err);
    }
}

// 4. Renderizado del Álbum (Cuadrícula, Progreso y Paginación)
function renderizarLibro() {
    // Actualización de contadores de Progreso
    let unicasObtenidas = 0;
    inventarioUsuarioCache.forEach(item => {
        if (item.cantidad > 0) unicasObtenidas++;
    });

    const elProgreso = document.getElementById('progreso-texto') || document.querySelector('.progreso-texto');
    if (elProgreso) {
        const textoNum = String(unicasObtenidas).padStart(3, '0');
        elProgreso.textContent = `PROGRESO: ${textoNum} / ${TOTAL_CARTAS_COLECCION}`;
    }

    const elPaginaLabel = document.getElementById('pagina-num-label') || document.querySelector('.pagina-num-label');
    if (elPaginaLabel) {
        const totalPaginas = Math.ceil(TOTAL_CARTAS_COLECCION / CARTAS_POR_PAGINA);
        elPaginaLabel.textContent = `PÁGINA ${paginaActual}/${totalPaginas}`;
    }

    // Renderizado de las 12 ranuras de la página activa
    const gridContenedor = document.getElementById('grid-barajitas') || 
                           document.querySelector('.grid-barajitas') || 
                           document.getElementById('album-grid');

    if (!gridContenedor) {
        console.warn("⚠️ No se encontró el contenedor del grid para el álbum.");
        return;
    }

    gridContenedor.innerHTML = "";

    const idInicio = (paginaActual - 1) * CARTAS_POR_PAGINA + 1;
    const idFin = paginaActual * CARTAS_POR_PAGINA;

    for (let idCarta = idInicio; idCarta <= idFin; idCarta++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'slot-barajita-item';
        
        const tieneCarta = inventarioUsuarioCache.has(idCarta) && inventarioUsuarioCache.get(idCarta).cantidad > 0;
        const datosColeccion = inventarioUsuarioCache.get(idCarta);
        const datosInfoCarta = catalogoGlobalCartas.get(idCarta);

        if (tieneCarta) {
            slotDiv.classList.add('slot-desbloqueado');
            const imgUrl = (datosInfoCarta && datosInfoCarta.imagen_url) ? datosInfoCarta.imagen_url : '';
            const nombreCarta = (datosInfoCarta && datosInfoCarta.nombre) ? datosInfoCarta.nombre : `Barajita #${idCarta}`;

            slotDiv.innerHTML = `
                <div class="header-slot-id">#${idCarta}</div>
                <div class="wrapper-canvas-img">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${nombreCarta}" loading="lazy" class="img-barajita-pixel">` : `<div class="placeholder-icon">🃏</div>`}
                </div>
                <div class="footer-slot-badge">x${datosColeccion.cantidad}</div>
            `;
            slotDiv.onclick = () => abrirModalDetalleCarta(idCarta);
        } else {
            slotDiv.classList.add('slot-bloqueado');
            slotDiv.innerHTML = `
                <div class="header-slot-id">#${idCarta}</div>
                <div class="wrapper-canvas-img">
                    <div class="lock-icon">🔒</div>
                </div>
                <div class="footer-slot-badge vacio">BLOQUEADO</div>
            `;
        }

        gridContenedor.appendChild(slotDiv);
    }
}

// 5. Configuración de Eventos de Navegación y Pestañas
function configurarNavegacionInterface() {
    const btnAtras = document.getElementById('btn-pagina-atras');
    const btnSiguiente = document.getElementById('btn-pagina-siguiente');

    btnAtras?.addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            renderizarLibro();
        }
    });

    btnSiguiente?.addEventListener('click', () => {
        const maxPaginas = Math.ceil(TOTAL_CARTAS_COLECCION / CARTAS_POR_PAGINA);
        if (paginaActual < maxPaginas) {
            paginaActual++;
            renderizarLibro();
        }
    });

    // Menú de navegación inferior (Álbum, Tienda, Subastas)
    const botonesMenu = document.querySelectorAll('.nav-bottom-btn');
    botonesMenu.forEach(btn => {
        btn.addEventListener('click', (e) => {
            botonesMenu.forEach(b => b.classList.remove('activo'));
            const objetivo = e.currentTarget;
            objetivo.classList.add('activo');

            const idSeccion = objetivo.getAttribute('data-target');
            document.querySelectorAll('.seccion-modulo').forEach(sec => sec.classList.remove('activa'));
            const moduloMostrar = document.getElementById(idSeccion);
            if (moduloMostrar) moduloMostrar.classList.add('activa');
        });
    });
}

// 6. Modal de Detalle de Carta / Previsualizador
function abrirModalDetalleCarta(idCarta) {
    const datosCarta = catalogoGlobalCartas.get(idCarta);
    const datosInventario = inventarioUsuarioCache.get(idCarta);

    if (!datosCarta) return;

    const modal = document.getElementById('modal-detalle-barajita');
    if (!modal) return;

    const imgModal = document.getElementById('modal-img-carta');
    const tituloModal = document.getElementById('modal-titulo-carta');
    const rarezaModal = document.getElementById('modal-rareza-carta');
    const cantidadModal = document.getElementById('modal-cantidad-carta');
    const loreModal = document.getElementById('modal-lore-carta');

    if (imgModal) imgModal.src = datosCarta.imagen_url || '';
    if (tituloModal) tituloModal.textContent = `#${datosCarta.id} - ${datosCarta.nombre || 'Sin Nombre'}`;
    if (rarezaModal) rarezaModal.textContent = `Rareza: ${datosCarta.rareza || 'Común'}`;
    if (cantidadModal) cantidadModal.textContent = `Posees: ${datosInventario ? datosInventario.cantidad : 0} copia(s)`;
    if (loreModal) loreModal.textContent = datosCarta.lore || 'Sin historia registrada.';

    modal.style.display = 'flex';
}

function cerrarModalDetalle() {
    const modal = document.getElementById('modal-detalle-barajita');
    if (modal) modal.style.display = 'none';
}

// Escuchar evento global de recarga para sincronización en vivo
window.sincronizarAlbumUsuario = async function() {
    await cargarInventarioInicial();
};
