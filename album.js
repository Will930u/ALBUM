// =============================================================================
// 📱 ALBUM.JS - INTEGRACIÓN DIRECTA CON CASILLEROS HTML Y PAGINACIÓN
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let ID_USUARIO_ACTUAL = "utrera930";
let paginaActual = 1;
const CARTAS_POR_PAGINA = 25; // 25 cuadros visibles por página
const TOTAL_PAGINAS = 40;
let inventarioUsuario = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.error("❌ SDK de Supabase no encontrado.");
            return;
        }

        obtenerUsuarioActual();
        configurarNavegacion();
        await cargarDatosAlbum();

    } catch (err) {
        console.error("❌ Error de inicio:", err);
    }
});

// 1. Identificación y sanitización del usuario
function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    if (userParam.startsWith("@")) {
        userParam = userParam.substring(1).trim();
    }
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    // Actualizar nombre y tag en la barra inferior
    const elemTag = document.getElementById("tag-usuario");
    if (elemTag) elemTag.textContent = `@${ID_USUARIO_ACTUAL}`;
}

// 2. Consulta de inventario en Supabase
async function cargarDatosAlbum() {
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
        
        // Actualizar contador global (ej: 007 / 2000)
        const unicas = inventarioUsuario.filter(i => i.Cartas).length;
        actualizarProgreso(unicas);

        // Renderizar sobre los cuadros HTML existentes
        renderizarPagina(paginaActual);

    } catch (err) {
        console.error("❌ Error consultando Supabase:", err.message);
    }
}

// 3. Inyección visual dentro de los casilleros HTML existentes
function renderizarPagina(pagina) {
    const idInicio = ((pagina - 1) * CARTAS_POR_PAGINA) + 1;
    const idFin = pagina * CARTAS_POR_PAGINA;

    // Mapa de cartas poseídas por carta_id
    const mapaCartas = {};
    inventarioUsuario.forEach(item => {
        if (item.Cartas) mapaCartas[item.Cartas.id] = item;
    });

    // Obtener los 25 cuadros creados en el HTML
    const slotsHTML = document.querySelectorAll(".grid-album > div, .cuadricula > div, [data-slot], .slot");
    
    // Si se utilizan divs genéricos dentro del marco contenedor
    const casilleros = Array.from(slotsHTML).filter(el => {
        const num = parseInt(el.textContent.trim());
        return !isNaN(num) || el.querySelector("canvas") || el.classList.contains("slot");
    }).slice(0, 25);

    casilleros.forEach((slot, index) => {
        const idCartaEsperada = idInicio + index;
        const itemPoseido = mapaCartas[idCartaEsperada];

        slot.innerHTML = ""; // Limpiar contenido previo (número o canvas)
        slot.style.position = "relative";
        slot.style.display = "flex";
        slot.style.flexDirection = "column";
        slot.style.alignItems = "center";
        slot.style.justifyContent = "center";

        if (itemPoseido) {
            slot.classList.add("desbloqueada");
            slot.style.background = "#0f172a";
            slot.style.border = "1px solid #38bdf8";

            let receta = {};
            try { receta = JSON.parse(itemPoseido.Cartas.imagen_url); } catch (e) {}

            // Crear el Canvas para el gráfico
            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 130;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.objectFit = "contain";
            slot.appendChild(canvas);

            // Indicar duplicados (x2, x3...)
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
            slot.classList.remove("desbloqueada");
            slot.style.background = ""; // Mantiene el estilo oscuro por defecto
            
            // Reinsertar el número de slot (1 al 25)
            const numSpan = document.createElement("span");
            numSpan.textContent = idCartaEsperada;
            numSpan.style.color = "#334155";
            numSpan.style.fontFamily = "monospace";
            numSpan.style.fontWeight = "bold";
            slot.appendChild(numSpan);
        }
    });

    actualizarTextoPagina(pagina);
}

// 4. Navegación entre páginas
function configurarNavegacion() {
    const botones = document.querySelectorAll("button, div, a");
    
    botones.forEach(btn => {
        if (btn.textContent.includes("ATRAS")) {
            btn.onclick = (e) => {
                e.preventDefault();
                if (paginaActual > 1) {
                    paginaActual--;
                    renderizarPagina(paginaActual);
                }
            };
        }
        if (btn.textContent.includes("SIGUIENTE")) {
            btn.onclick = (e) => {
                e.preventDefault();
                if (paginaActual < TOTAL_PAGINAS) {
                    paginaActual++;
                    renderizarPagina(paginaActual);
                }
            };
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

// Renderizado gráfico Canvas Pixel Art
function dibujarCartaMini(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    // Fondo de la carta
    ctx.fillStyle = receta.fondoColor || "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ícono / Símbolo central
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 8);

    // Borde de rareza
    ctx.strokeStyle = receta.marcoColor || "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Nombre inferior
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.fillRect(3, canvas.height - 22, canvas.width - 6, 19);

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((nombre || "CARTA").substring(0, 10), canvas.width / 2, canvas.height - 9);
}
