// =============================================================================
// 📱 ALBUM.JS - CONTROLADOR ULTRA-ROBUSTO CON DETECCIÓN DE ERRORES
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let ID_USUARIO_ACTUAL = "utrera930";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Validación de la SDK de Supabase
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.error("❌ La librería de Supabase no está cargada en index.html");
            mostrarErrorEnPantalla("Error: Falta la librería SDK de Supabase en index.html");
            return;
        }

        obtenerUsuarioActual();
        await cargarColeccionUsuario();

    } catch (errGlobal) {
        console.error("❌ Error de ejecución en álbum:", errGlobal);
        mostrarErrorEnPantalla("Error de inicialización: " + errGlobal.message);
    }
});

function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    if (userParam.startsWith("@")) {
        userParam = userParam.substring(1).trim();
    }
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    const elemTag = document.getElementById("tag-usuario");
    if (elemTag) elemTag.textContent = `@${ID_USUARIO_ACTUAL}`;
}

async function cargarColeccionUsuario() {
    if (!supabaseClient) return;

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

        if (error) {
            console.error("Error en consulta Supabase:", error);
            mostrarErrorEnPantalla("Error consultando base de datos: " + error.message);
            return;
        }

        renderizarGridAlbum(inventario || []);

    } catch (err) {
        console.error("Error inesperado al cargar colección:", err);
        mostrarErrorEnPantalla("Error al conectar con el servidor: " + err.message);
    }
}

function renderizarGridAlbum(inventario) {
    const coleccionMap = {};
    let totalUnicas = 0;

    inventario.forEach(item => {
        if (item.Cartas) {
            coleccionMap[item.Cartas.id] = {
                cantidad: item.cantidad,
                datos: item.Cartas
            };
            totalUnicas++;
        }
    });

    const txtProgreso = document.getElementById("txt-progreso");
    if (txtProgreso) {
        txtProgreso.textContent = `${String(totalUnicas).padStart(3, '0')} / 2000`;
    }

    // Busca los slots por selectores comunes
    const slots = document.querySelectorAll(".slot-carta, .grid-item, [data-slot]");
    
    if (slots.length === 0) {
        console.warn("⚠️ No se encontraron elementos .slot-carta o .grid-item en el HTML.");
    }

    slots.forEach((slot, index) => {
        const idSlot = parseInt(slot.getAttribute("data-slot")) || (index + 1);
        const poseeCarta = coleccionMap[idSlot];

        slot.innerHTML = "";

        if (poseeCarta) {
            slot.classList.remove("bloqueada");
            slot.classList.add("desbloqueada");

            let receta = {};
            try {
                receta = JSON.parse(poseeCarta.datos.imagen_url);
            } catch (e) {
                receta = {};
            }

            const canvas = document.createElement("canvas");
            canvas.width = 120;
            canvas.height = 160;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.className = "canvas-carta-mini";
            slot.appendChild(canvas);

            if (poseeCarta.cantidad > 1) {
                const badge = document.createElement("span");
                badge.className = "badge-cantidad";
                badge.textContent = `x${poseeCarta.cantidad}`;
                slot.appendChild(badge);
            }

            dibujarCartaEnCanvas(canvas, receta, poseeCarta.datos.nombre);

        } else {
            slot.classList.add("bloqueada");
            slot.classList.remove("desbloqueada");
            slot.innerHTML = `<span class="numero-slot">${idSlot}</span>`;
        }
    });
}

function dibujarCartaEnCanvas(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = receta.fondoColor || "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "35px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 10);

    ctx.strokeStyle = receta.marcoColor || "#64748b";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
    ctx.fillRect(4, canvas.height - 25, canvas.width - 8, 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((nombre || "CARTA").substring(0, 12), canvas.width / 2, canvas.height - 12);
}

function mostrarErrorEnPantalla(msg) {
    const elemProgreso = document.getElementById("txt-progreso");
    if (elemProgreso) {
        elemProgreso.style.color = "#ef4444";
        elemProgreso.textContent = "ERROR";
    }
}
