// =============================================================================
// 📱 ALBUM.JS - INTEGRACIÓN COMPLETA (RESPETA ESTRUCTURA Y CUADRÍCULA HTML)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let ID_USUARIO_ACTUAL = "utrera930";
let paginaActual = 1;
const CARTAS_POR_PAGINA = 25;
const TOTAL_PAGINAS = 40;
let inventarioMemoria = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }

        obtenerUsuarioActual();
        configurarNavegacion();
        await cargarDatosSupabase();

    } catch (err) {
        console.error("Error en arranque de Álbum:", err);
    }
});

function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    if (userParam.startsWith("@")) userParam = userParam.substring(1).trim();
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);
}

async function cargarDatosSupabase() {
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from("Coleccion_Usuario")
                .select(`
                    id,
                    cantidad,
                    carta_id,
                    Cartas ( id, nombre, rareza, imagen_url )
                `)
                .eq("usuario_id", ID_USUARIO_ACTUAL);

            if (!error && data) {
                inventarioMemoria = data;
            }
        }
    } catch (err) {
        console.warn("Modo offline o sin conexión a Supabase.");
    } finally {
        actualizarInterfaz();
    }
}

function actualizarInterfaz() {
    const unicas = inventarioMemoria.filter(i => i.Cartas).length;
    
    // Actualizar Progreso
    const progresoEl = buscarElementoPorTexto("PROGRESO:");
    if (progresoEl) {
        progresoEl.textContent = `PROGRESO:  ${String(unicas).padStart(3, '0')} / 2000`;
    }

    // Actualizar Era
    const eraEl = buscarElementoPorTexto("ERA");
    if (eraEl) {
        eraEl.textContent = `ERA ${determinarEraNumero(paginaActual)}: ${determinarEra(paginaActual)}`;
    }

    // Actualizar Pagina
    const pagEl = buscarElementoPorTexto("PÁGINA") || buscarElementoPorTexto("PAGINA");
    if (pagEl) {
        pagEl.textContent = `PÁGINA ${paginaActual}/${TOTAL_PAGINAS}`;
    }

    renderizarCartasEnSlots();
}

function renderizarCartasEnSlots() {
    // Buscar todos los casilleros que ya existen en tu HTML
    let slots = document.querySelectorAll(".grid-album > div, .cuadricula > div, [class*='slot']");

    // Si no encuentra clases específicas, busca los divs dentro del contenedor principal
    if (slots.length < 25) {
        const contenedores = document.querySelectorAll("div");
        for (let c of contenedores) {
            if (c.children.length >= 25) {
                slots = Array.from(c.children).slice(0, 25);
                break;
            }
        }
    }

    if (!slots || slots.length === 0) {
        console.error("No se encontraron los casilleros HTML en la pantalla.");
        return;
    }

    const idInicio = ((paginaActual - 1) * CARTAS_POR_PAGINA) + 1;
    const mapaCartas = {};
    
    inventarioMemoria.forEach(item => {
        if (item.Cartas) mapaCartas[item.Cartas.id] = item;
    });

    slots.forEach((slot, index) => {
        if (index >= 25) return;

        const idCartaEsperada = idInicio + index;
        const itemPoseido = mapaCartas[idCartaEsperada];

        // NO BORRAMOS EL SLOT COMPLETO para no perder el diseño base
        if (itemPoseido) {
            slot.innerHTML = ""; // Limpia el número si la carta existe
            let receta = {};
            try { receta = JSON.parse(itemPoseido.Cartas.imagen_url); } catch (e) {}

            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 125;
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
                badge.style.fontSize = "9px";
                badge.style.fontWeight = "bold";
                badge.style.padding = "1px 4px";
                badge.style.borderRadius = "3px";
                slot.appendChild(badge);
            }

            dibujarCartaMini(canvas, receta, itemPoseido.Cartas.nombre);
        } else {
            // Si la carta no está poseída, restaura el número correspondiente en la casilla
            slot.innerHTML = `<span style="color: #3b5278; font-weight: bold; font-family: monospace;">${idCartaEsperada}</span>`;
        }
    });
}

function configurarNavegacion() {
    document.querySelectorAll("button, div, a").forEach(el => {
        const txt = el.textContent.trim().toUpperCase();

        if (txt.includes("ATRAS") || txt.includes("ATRÁS")) {
            el.onclick = (e) => {
                e.preventDefault();
                if (paginaActual > 1) {
                    paginaActual--;
                    actualizarInterfaz();
                }
            };
        }

        if (txt.includes("SIGUIENTE")) {
            el.onclick = (e) => {
                e.preventDefault();
                if (paginaActual < TOTAL_PAGINAS) {
                    paginaActual++;
                    actualizarInterfaz();
                }
            };
        }
    });
}

function determinarEraNumero(pag) {
    if (pag <= 10) return "1";
    if (pag <= 20) return "2";
    if (pag <= 30) return "3";
    return "4";
}

function determinarEra(pag) {
    if (pag <= 10) return "COTIDIANOS";
    if (pag <= 20) return "ANCESTRAL";
    if (pag <= 30) return "CYBERPUNK";
    return "FUTURISTA";
}

function buscarElementoPorTexto(cadena) {
    const elementos = document.querySelectorAll("*");
    for (let el of elementos) {
        if (el.children.length === 0 && el.textContent.includes(cadena)) {
            return el;
        }
    }
    return null;
}

function dibujarCartaMini(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = receta.fondoColor || "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 8);

    ctx.strokeStyle = receta.marcoColor || "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.fillRect(3, canvas.height - 20, canvas.width - 6, 17);

    ctx.fillStyle = "#ffffff";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((nombre || "CARTA").substring(0, 10), canvas.width / 2, canvas.height - 8);
}
