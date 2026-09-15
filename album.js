// =============================================================================
// 📱 ALBUM.JS - RENDERING GARANTIZADO DE 25 CASILLEROS (FIX RECONSTRUCCIÓN)
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
        } else {
            console.error("❌ SDK de Supabase no disponible.");
        }

        obtenerUsuarioActual();
        configurarBotonesNavegacion();
        await cargarColeccionInicial();

    } catch (err) {
        console.error("❌ Error de inicio:", err);
    }
});

function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    if (userParam.startsWith("@")) userParam = userParam.substring(1).trim();
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    // Actualizar labels de usuario
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0) {
            if (el.textContent.includes("@usuario") || el.textContent.includes("@utrera930")) {
                el.textContent = `@${ID_USUARIO_ACTUAL}`;
            }
        }
    });
}

async function cargarColeccionInicial() {
    try {
        if (supabaseClient) {
            const { data: inventario, error } = await supabaseClient
                .from("Coleccion_Usuario")
                .select(`
                    id,
                    cantidad,
                    carta_id,
                    Cartas ( id, nombre, rareza, imagen_url )
                `)
                .eq("usuario_id", ID_USUARIO_ACTUAL);

            if (!error && inventario) {
                inventarioMemoria = inventario;
            }
        }
    } catch (err) {
        console.warn("⚠️ No se pudo conectar a Supabase. Mostrando álbum en modo local.", err);
    } finally {
        const unicas = inventarioMemoria.filter(i => i.Cartas).length;
        actualizarProgreso(unicas);
        renderizarPagina(paginaActual);
    }
}

function renderizarPagina(pagina) {
    const idInicio = ((pagina - 1) * CARTAS_POR_PAGINA) + 1;

    // Mapa de cartas obtenidas
    const mapaCartas = {};
    inventarioMemoria.forEach(item => {
        if (item.Cartas) mapaCartas[item.Cartas.id] = item;
    });

    // Ubicar o crear el contenedor principal de la cuadrícula
    let contenedorGrid = document.querySelector(".grid-album") || document.querySelector(".cuadricula");
    
    if (!contenedorGrid) {
        // Si no existe una clase explícita, buscamos el contenedor entre el Header y la Pagina
        const barraProgreso = document.querySelector(".pagina-info") || document.querySelector(".barra-superior");
        contenedorGrid = document.createElement("div");
        contenedorGrid.className = "grid-album";
        
        // Aplicar estilos grid si no los tiene CSS
        contenedorGrid.style.display = "grid";
        contenedorGrid.style.gridTemplateColumns = "repeat(5, 1fr)";
        contenedorGrid.style.gap = "8px";
        contenedorGrid.style.padding = "10px";
        contenedorGrid.style.margin = "10px 0";
        contenedorGrid.style.border = "1px solid #1e293b";
        contenedorGrid.style.borderRadius = "8px";
        contenedorGrid.style.background = "#090d16";

        const footerPagina = document.querySelectorAll("div")[10]; // fallback
        if (footerPagina && footerPagina.parentNode) {
            footerPagina.parentNode.insertBefore(contenedorGrid, footerPagina);
        } else {
            document.body.appendChild(contenedorGrid);
        }
    }

    // Reconstruir SIEMPRE los 25 slots para garantizar que se vean las cajas
    contenedorGrid.innerHTML = "";

    for (let i = 0; i < CARTAS_POR_PAGINA; i++) {
        const idCartaEsperada = idInicio + i;
        const itemPoseido = mapaCartas[idCartaEsperada];

        const slot = document.createElement("div");
        slot.style.aspectRatio = "3/4";
        slot.style.display = "flex";
        slot.style.flexDirection = "column";
        slot.style.alignItems = "center";
        slot.style.justifyContent = "center";
        slot.style.borderRadius = "6px";
        slot.style.position = "relative";

        if (itemPoseido) {
            slot.style.background = "#0f172a";
            slot.style.border = "1px solid #38bdf8";

            let receta = {};
            try { receta = JSON.parse(itemPoseido.Cartas.imagen_url); } catch (e) {}

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
                slot.appendChild(badge);
            }

            dibujarCartaMini(canvas, receta, itemPoseido.Cartas.nombre);
        } else {
            // Cuadro vacío por defecto (estilo azul/grisáceo original)
            slot.style.background = "#182232";
            slot.style.border = "1px solid #28374d";

            const numSpan = document.createElement("span");
            numSpan.textContent = idCartaEsperada;
            numSpan.style.color = "#475569";
            numSpan.style.fontFamily = "monospace";
            numSpan.style.fontWeight = "bold";
            numSpan.style.fontSize = "14px";
            slot.appendChild(numSpan);
        }

        contenedorGrid.appendChild(slot);
    }

    actualizarEstadoUI(`ERA ${determinarEraNumero(pagina)}: ${determinarEra(pagina)}`);
    actualizarTextoPagina(pagina);
}

function configurarBotonesNavegacion() {
    document.querySelectorAll("button, div, a").forEach(el => {
        const texto = el.textContent.trim().toUpperCase();

        if (texto.includes("ATRAS") || texto.includes("ATRÁS")) {
            el.onclick = (e) => {
                e.preventDefault();
                if (paginaActual > 1) {
                    paginaActual--;
                    renderizarPagina(paginaActual);
                }
            };
        }

        if (texto.includes("SIGUIENTE")) {
            el.onclick = (e) => {
                e.preventDefault();
                if (paginaActual < TOTAL_PAGINAS) {
                    paginaActual++;
                    renderizarPagina(paginaActual);
                }
            };
        }
    });
}

function determinarEraNumero(pagina) {
    if (pagina <= 10) return "1";
    if (pagina <= 20) return "2";
    if (pagina <= 30) return "3";
    return "4";
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
