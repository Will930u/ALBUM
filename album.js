// =============================================================================
// 📱 ALBUM.JS - SISTEMA ROBUSTO CON NAVEGACIÓN LOCAL Y CACHÉ ANTI-DESCONEXIÓN
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let ID_USUARIO_ACTUAL = "utrera930";
let paginaActual = 1;
const CARTAS_POR_PAGINA = 25;
const TOTAL_PAGINAS = 40;

// Caché local para evitar consultas repetidas que cierren la conexión HTTP
let inventarioMemoria = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.error("❌ SDK de Supabase no disponible en HTML.");
            actualizarEstadoUI("ERROR SDK");
            return;
        }

        obtenerUsuarioActual();
        configurarBotonesNavegacion();
        await cargarColeccionInicial();

    } catch (err) {
        console.error("❌ Error de inicialización:", err);
        actualizarEstadoUI("ERROR DE INICIO");
    }
});

// 1. Identificación y sanitización del ID
function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    if (userParam.startsWith("@")) {
        userParam = userParam.substring(1).trim();
    }
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    // Ajuste de interfaz con el ID del usuario
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && el.textContent.includes("@usuario")) {
            el.textContent = `@${ID_USUARIO_ACTUAL}`;
        }
        if (el.children.length === 0 && el.textContent.includes("NOMBRE COMPLETO")) {
            el.textContent = ID_USUARIO_ACTUAL.toLowerCase();
        }
    });
}

// 2. ÚNICA petición de red con manejo de errores anti-desconexión
async function cargarColeccionInicial() {
    actualizarEstadoUI("CARGANDO ERA...");

    try {
        const { data: inventario, error } = await supabaseClient
            .from("Coleccion_Usuario")
            .select(`
                id,
                cantidad,
                carta_id,
                Cartas (
                    id,
                    nombre,
                    rareza,
                    imagen_url
                )
            `)
            .eq("usuario_id", ID_USUARIO_ACTUAL);

        if (error) throw error;

        // Guardar en caché local
        inventarioMemoria = inventario || [];
        
        // Actualizar contador global
        const unicas = inventarioMemoria.filter(i => i.Cartas).length;
        actualizarProgreso(unicas);

        // Dibujar primera página localmente
        renderizarPaginaLocal(paginaActual);

    } catch (err) {
        console.warn("⚠️ Fallo en red (ERR_CONNECTION_CLOSED). Reintentando desde memoria...", err.message);
        // Si hay un error de red, intenta renderizar con los datos en caché si existían
        renderizarPaginaLocal(paginaActual);
        actualizarEstadoUI(`ERA: ${determinarEra(paginaActual)}`);
    }
}

// 3. Renderizado 100% local (Sin peticiones HTTP extra al cambiar de página)
function renderizarPaginaLocal(pagina) {
    const idInicio = ((pagina - 1) * CARTAS_POR_PAGINA) + 1;

    // Mapa rápido desde la memoria local
    const mapaCartas = {};
    inventarioMemoria.forEach(item => {
        if (item.Cartas) mapaCartas[item.Cartas.id] = item;
    });

    // Búsqueda flexible de casilleros HTML
    let casilleros = document.querySelectorAll(".grid-album > div, .cuadricula > div, [data-slot]");
    
    if (casilleros.length === 0) {
        // Selector secundario de respaldo si los contenedores no tienen clases específicas
        casilleros = Array.from(document.querySelectorAll("div")).filter(el => {
            const txt = el.textContent.trim();
            return !isNaN(parseInt(txt)) && parseInt(txt) >= 1 && parseInt(txt) <= 25;
        });
    }

    const slotsVisibles = Array.from(casilleros).slice(0, 25);

    slotsVisibles.forEach((slot, index) => {
        const idCartaEsperada = idInicio + index;
        const itemPoseido = mapaCartas[idCartaEsperada];

        slot.innerHTML = "";
        slot.style.position = "relative";
        slot.style.display = "flex";
        slot.style.flexDirection = "column";
        slot.style.alignItems = "center";
        slot.style.justifyContent = "center";

        if (itemPoseido) {
            slot.style.background = "#0f172a";
            slot.style.border = "1px solid #38bdf8";

            let receta = {};
            try { receta = JSON.parse(itemPoseido.Cartas.imagen_url); } catch (e) { receta = {}; }

            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 130;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            slot.appendChild(canvas);

            if (itemPoseido.cantidad > 1) {
                const badge = document.createElement("span");
                badge.textContent = `x${itemPoseido.cantidad}`;
                badge.style.position = "absolute";
                badge.style.top = "2px";
                badge.style.right = "2px";
                badge.style.background = "#eab308";
                badge.style.color = "#000";
                badge.style.fontSize = "10px";
                badge.style.fontWeight = "bold";
                badge.style.padding = "1px 4px";
                badge.style.borderRadius = "3px";
                badge.style.zIndex = "10";
                slot.appendChild(badge);
            }

            dibujarCartaMini(canvas, receta, itemPoseido.Cartas.nombre);

        } else {
            slot.style.background = ""; // Mantiene color de plantilla
            slot.style.border = "";

            const numSpan = document.createElement("span");
            numSpan.textContent = idCartaEsperada;
            numSpan.style.color = "#334155";
            numSpan.style.fontFamily = "monospace";
            numSpan.style.fontWeight = "bold";
            slot.appendChild(numSpan);
        }
    });

    // Actualización de texto de Era y Número de Página sin peticiones
    actualizarEstadoUI(`ERA: ${determinarEra(pagina)}`);
    actualizarTextoPagina(pagina);
}

// 4. Listeners de Navegación Locales y Seguros
function configurarBotonesNavegacion() {
    document.querySelectorAll("button, div, a").forEach(el => {
        const texto = el.textContent.trim().toUpperCase();

        if (texto.includes("ATRAS") || texto.includes("ATRÁS")) {
            el.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (paginaActual > 1) {
                    paginaActual--;
                    renderizarPaginaLocal(paginaActual);
                }
            };
        }

        if (texto.includes("SIGUIENTE")) {
            el.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (paginaActual < TOTAL_PAGINAS) {
                    paginaActual++;
                    renderizarPaginaLocal(paginaActual);
                }
            };
        }
    });
}

function determinarEra(pagina) {
    if (pagina <= 10) return "COTIDIANOS";
    if (pagina <= 20) return "ANCESTRAL";
    if (pagina <= 30) return "CYBERPUNK";
    return "FUTURISTA";
}

function actualizarEstadoUI(texto) {
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && (el.textContent.includes("CARGANDO ERA") || el.textContent.includes("ERA"))) {
            el.textContent = texto;
            el.style.color = "#00ff66";
        }
    });
}

function actualizarProgreso(unicas) {
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && el.textContent.includes("PROGRESO:")) {
            el.textContent = `PROGRESO:  ${String(unicas).padStart(3, '0')} / 2000`;
        }
    });
}

function actualizarTextoPagina(pagina) {
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && el.textContent.includes("PÁGINA")) {
            el.textContent = `PÁGINA ${pagina}/${TOTAL_PAGINAS}`;
        }
    });
}

function dibujarCartaMini(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = receta.fondoColor || "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 8);

    ctx.strokeStyle = receta.marcoColor || "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.fillRect(3, canvas.height - 22, canvas.width - 6, 19);

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((nombre || "CARTA").substring(0, 10), canvas.width / 2, canvas.height - 9);
}
