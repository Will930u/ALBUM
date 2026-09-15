// =============================================================================
// 📱 ALBUM.JS - RENDERING GARANTIZADO DE 25 CASILLEROS CON FORMATO RETRO
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
    // Inicialización del cliente Supabase si está disponible
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    obtenerUsuarioActual();
    configurarEventos();

    // Esperar a que la fuente personalizada se cargue para renderizar correctamente el Canvas
    if (document.fonts) {
        await document.fonts.ready;
    }

    await cargarColeccionInicial();
});

function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    if (userParam.startsWith("@")) userParam = userParam.substring(1).trim();
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    const handleEl = document.getElementById("user-handle");
    if (handleEl) handleEl.textContent = `@${ID_USUARIO_ACTUAL}`;
}

async function cargarColeccionInicial() {
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
        console.warn("Servidor no disponible, cargando vista estática.");
    } finally {
        const unicas = inventarioMemoria.filter(i => i.Cartas).length;
        actualizarProgreso(unicas);
        renderizarPagina(paginaActual);
    }
}

function renderizarPagina(pagina) {
    const gridContainer = document.getElementById("grid-album");
    if (!gridContainer) return;

    gridContainer.innerHTML = "";
    const idInicio = ((pagina - 1) * CARTAS_POR_PAGINA) + 1;

    const mapaCartas = {};
    inventarioMemoria.forEach(item => {
        if (item.Cartas) mapaCartas[item.Cartas.id] = item;
    });

    for (let i = 0; i < CARTAS_POR_PAGINA; i++) {
        const idCartaEsperada = idInicio + i;
        const itemPoseido = mapaCartas[idCartaEsperada];

        const slot = document.createElement("div");
        slot.className = "slot";

        if (itemPoseido) {
            slot.classList.add("occupied");

            let receta = {};
            try { 
                receta = typeof itemPoseido.Cartas.imagen_url === 'string' 
                    ? JSON.parse(itemPoseido.Cartas.imagen_url) 
                    : itemPoseido.Cartas.imagen_url; 
            } catch (e) {
                receta = {};
            }

            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 125;
            slot.appendChild(canvas);

            if (itemPoseido.cantidad > 1) {
                const badge = document.createElement("span");
                badge.className = "badge-qty";
                badge.textContent = `x${itemPoseido.cantidad}`;
                slot.appendChild(badge);
            }

            dibujarCartaMini(canvas, receta, itemPoseido.Cartas.nombre);
        } else {
            const numSpan = document.createElement("span");
            numSpan.className = "slot-number";
            numSpan.textContent = idCartaEsperada;
            slot.appendChild(numSpan);
        }

        gridContainer.appendChild(slot);
    }

    // Actualización de textos de interfaz
    const eraLabel = document.getElementById("era-label");
    if (eraLabel) {
        eraLabel.textContent = `ERA ${determinarEraNumero(pagina)}: ${determinarEra(pagina)}`;
    }
    
    const paginaLabel = document.getElementById("pagina-label");
    if (paginaLabel) {
        paginaLabel.textContent = `PÁGINA ${pagina}/${TOTAL_PAGINAS}`;
    }
}

function configurarEventos() {
    const btnAtras = document.getElementById("btn-atras");
    if (btnAtras) {
        btnAtras.onclick = () => {
            if (paginaActual > 1) {
                paginaActual--;
                renderizarPagina(paginaActual);
            }
        };
    }

    const btnSiguiente = document.getElementById("btn-siguiente");
    if (btnSiguiente) {
        btnSiguiente.onclick = () => {
            if (paginaActual < TOTAL_PAGINAS) {
                paginaActual++;
                renderizarPagina(paginaActual);
            }
        };
    }
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

function actualizarProgreso(unicas) {
    const el = document.getElementById("progreso-label");
    if (el) {
        el.textContent = `PROGRESO: ${String(unicas).padStart(3, '0')} / 2000`;
    }
}

function dibujarCartaMini(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    // Fondo base del casillero poseído
    ctx.fillStyle = receta.fondoColor || "#101929";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render del ícono o avatar pixel art
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 10);

    // Borde interno tipo barajita
    ctx.strokeStyle = receta.marcoColor || "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Franja inferior con fondo oscuro para el nombre de la carta
    ctx.fillStyle = "rgba(4, 8, 16, 0.95)";
    ctx.fillRect(2, canvas.height - 22, canvas.width - 4, 20);

    // Texto del nombre de la carta
    ctx.fillStyle = "#ffffff";
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const textoNombre = (nombre || "CARTA").toUpperCase();
    ctx.fillText(textoNombre.length > 9 ? textoNombre.substring(0, 8) + "." : textoNombre, canvas.width / 2, canvas.height - 11);
}
