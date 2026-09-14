// =============================================================================
// 📱 ALBUM.JS - SISTEMA COMPLETO CON PAGINACIÓN Y DETECCIÓN DE ERAS
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let ID_USUARIO_ACTUAL = "utrera930";
let paginaActual = 1;
const CARTAS_POR_PAGINA = 50;
const TOTAL_PAGINAS = 40;
let inventarioUsuario = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Inicializar SDK de Supabase
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.error("❌ SDK de Supabase no encontrado en el HTML.");
            actualizarEstadoCarga("ERROR SDK SUPABASE");
            return;
        }

        obtenerUsuarioActual();
        configurarNavegacion();
        await cargarDatosAlbum();

    } catch (err) {
        console.error("❌ Error de inicio:", err);
        actualizarEstadoCarga("ERROR DE CÓDIGO");
    }
});

// 1. Detección del usuario y actualización de la barra inferior
function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    if (userParam.startsWith("@")) {
        userParam = userParam.substring(1).trim();
    }
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    // Actualiza la barra inferior (@usuario)
    const elemTag = document.getElementById("tag-usuario") || document.querySelector(".usuario-tag") || document.querySelectorAll("span")[2];
    const elemNombre = document.getElementById("nombre-usuario") || document.querySelector(".usuario-nombre");

    // Buscar por texto si no hay IDs
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && el.textContent.includes("@usuario")) {
            el.textContent = `@${ID_USUARIO_ACTUAL}`;
        }
        if (el.children.length === 0 && el.textContent.includes("NOMBRE COMPLETO")) {
            el.textContent = ID_USUARIO_ACTUAL.toUpperCase();
        }
    });
}

// 2. Carga datos de Supabase
async function cargarDatosAlbum() {
    actualizarEstadoCarga("CARGANDO ERA...");

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

        inventarioUsuario = inventario || [];
        
        // Actualizar progreso total
        const unicas = inventarioUsuario.filter(i => i.Cartas).length;
        actualizarProgreso(unicas);

        // Renderizar la página actual
        renderizarPagina(paginaActual);

    } catch (err) {
        console.error("❌ Error consultando Supabase:", err.message);
        actualizarEstadoCarga("ERROR CONEXION");
    }
}

// 3. Renderizado dinamico de la cuadrícula por páginas
function renderizarPagina(pagina) {
    let contenedor = document.getElementById("grid-album") || document.querySelector(".grid-album") || document.querySelector(".cuadricula");
    
    // Si no existe el contenedor de cartas dentro del marco, lo crea automáticamente
    if (!contenedor) {
        const marcoVacio = document.querySelectorAll(".grid-album, div")[3]; 
        contenedor = document.createElement("div");
        contenedor.id = "grid-album";
        contenedor.style.display = "grid";
        contenedor.style.gridTemplateColumns = "repeat(auto-fill, minmax(70px, 1fr))";
        contenedor.style.gap = "8px";
        contenedor.style.padding = "10px";
        contenedor.style.maxHeight = "350px";
        contenedor.style.overflowY = "auto";

        // Insertar antes del footer (donde dice PÁGINA 1/40)
        const footer = document.querySelector("div:has(> .usuario-tag)") || document.querySelectorAll("div")[document.querySelectorAll("div").length - 2];
        if (footer && footer.parentNode) {
            footer.parentNode.insertBefore(contenedor, footer);
        } else {
            document.body.appendChild(contenedor);
        }
    }

    contenedor.innerHTML = ""; // Limpiar vista

    // Cálculo del rango numérico de cartas de la página
    const idInicio = ((pagina - 1) * CARTAS_POR_PAGINA) + 1;
    const idFin = pagina * CARTAS_POR_PAGINA;

    // Nombre de la Era dinámica
    const eraNombre = determinarEra(pagina);
    actualizarEstadoCarga(`ERA: ${eraNombre}`);

    // Mapa de inventario para búsqueda rápida
    const mapaCartas = {};
    inventarioUsuario.forEach(item => {
        if (item.Cartas) mapaCartas[item.Cartas.id] = item;
    });

    // Generar casilleros
    for (let id = idInicio; id <= idFin; id++) {
        const itemPoseido = mapaCartas[id];
        const slot = document.createElement("div");
        slot.className = "slot-carta";
        slot.style.aspectRatio = "3/4";
        slot.style.border = "1px solid #1e293b";
        slot.style.borderRadius = "4px";
        slot.style.display = "flex";
        slot.style.flexDirection = "column";
        slot.style.alignItems = "center";
        slot.style.justifyContent = "center";
        slot.style.background = itemPoseido ? "#0f172a" : "#020617";
        slot.style.position = "relative";

        if (itemPoseido) {
            let receta = {};
            try { receta = JSON.parse(itemPoseido.Cartas.imagen_url); } catch (e) {}

            const canvas = document.createElement("canvas");
            canvas.width = 80;
            canvas.height = 100;
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
            slot.innerHTML = `<span style="color:#334155; font-size:10px; font-family:monospace;">#${id}</span>`;
        }

        contenedor.appendChild(slot);
    }

    // Actualizar indicador inferior de página
    actualizarTextoPagina(pagina);
}

// 4. Utilidades visuales y eventos de botones
function configurarNavegacion() {
    const botones = document.querySelectorAll("button, div");
    
    botones.forEach(btn => {
        if (btn.textContent.includes("ATRAS")) {
            btn.onclick = () => {
                if (paginaActual > 1) {
                    paginaActual--;
                    renderizarPagina(paginaActual);
                }
            };
        }
        if (btn.textContent.includes("SIGUIENTE")) {
            btn.onclick = () => {
                if (paginaActual < TOTAL_PAGINAS) {
                    paginaActual++;
                    renderizarPagina(paginaActual);
                }
            };
        }
    });
}

function determinarEra(pagina) {
    if (pagina <= 10) return "ANCESTRAL";
    if (pagina <= 20) return "MEDIEVAL";
    if (pagina <= 30) return "CYBERPUNK";
    return "FUTURISTA";
}

function actualizarEstadoCarga(texto) {
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && (el.textContent.includes("CARGANDO ERA") || el.textContent.includes("ERA:"))) {
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

    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, canvas.height / 2 - 5);

    ctx.strokeStyle = receta.marcoColor || "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
}
