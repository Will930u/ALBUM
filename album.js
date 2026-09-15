// =============================================================================
// 📱 ALBUM.JS - CONTROLADOR COMPLETO DEL ÁLBUM DEL JUGADOR (SUPABASE & CANVAS)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID del usuario autenticado (Normalizado sin '@')
let ID_USUARIO_ACTUAL = "utrera930"; 

document.addEventListener("DOMContentLoaded", async () => {
    obtenerUsuarioActual();
    await cargarColeccionUsuario();
});

// 1. Detección y sanitización del identificador del usuario
function obtenerUsuarioActual() {
    const params = new URLSearchParams(window.location.search);
    let userParam = params.get("user") || localStorage.getItem("usuario_id") || "utrera930";
    
    // Normalización: remueve '@' si viene desde Telegram o la URL
    if (userParam.startsWith("@")) {
        userParam = userParam.substring(1).trim();
    }
    
    ID_USUARIO_ACTUAL = userParam;
    localStorage.setItem("usuario_id", ID_USUARIO_ACTUAL);

    const elemTag = document.getElementById("tag-usuario");
    if (elemTag) elemTag.textContent = `@${ID_USUARIO_ACTUAL}`;
}

// 2. Carga sincrónica de la colección desde Supabase
async function cargarColeccionUsuario() {
    const contenedorGrid = document.getElementById("grid-album") || document.querySelector(".grid-album");
    if (!contenedorGrid) return;

    try {
        // Consulta relacional: trae el inventario y une la tabla Cartas
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

        // Renderiza las cartas obtenidas en la rejilla
        renderizarGridAlbum(inventario || []);

    } catch (err) {
        console.error("Error al cargar la colección del usuario:", err.message);
    }
}

// 3. Mapeo y desbloqueo de slots dentro del Álbum
function renderizarGridAlbum(inventario) {
    const coleccionMap = {};
    let totalUnicas = 0;

    // Crear mapa rápido usando el ID de la carta
    inventario.forEach(item => {
        if (item.Cartas) {
            coleccionMap[item.Cartas.id] = {
                cantidad: item.cantidad,
                datos: item.Cartas
            };
            totalUnicas++;
        }
    });

    // Actualizar contador global de progreso
    const txtProgreso = document.getElementById("txt-progreso");
    if (txtProgreso) {
        txtProgreso.textContent = `${String(totalUnicas).padStart(3, '0')} / 2000`;
    }

    // Buscar todos los casilleros de la cuadrícula
    const slots = document.querySelectorAll(".slot-carta, .grid-item, [data-slot]");
    
    slots.forEach((slot, index) => {
        // Asigna el número de slot basado en el atributo data-slot o en el índice + 1
        const idSlot = parseInt(slot.getAttribute("data-slot")) || (index + 1);
        const poseeCarta = coleccionMap[idSlot];

        slot.innerHTML = ""; // Limpia el slot

        if (poseeCarta) {
            slot.classList.remove("bloqueada");
            slot.classList.add("desbloqueada");

            let receta = {};
            try {
                receta = JSON.parse(poseeCarta.datos.imagen_url);
            } catch (e) {
                receta = {};
            }

            // Crear el elemento Canvas donde se dibujará el personaje
            const canvas = document.createElement("canvas");
            canvas.width = 120;
            canvas.height = 160;
            canvas.className = "canvas-carta-mini";
            slot.appendChild(canvas);

            // Badge numérico para duplicados
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

// 4. Renderizador Canvas algorítmico ligero para la Mini App
function dibujarCartaEnCanvas(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    // Fondo de la carta
    ctx.fillStyle = receta.fondoColor || "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Personaje / Símbolo
    ctx.font = "35px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 10);

    // Borde de la rareza
    ctx.strokeStyle = receta.marcoColor || "#64748b";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Cuadro inferior del Nombre
    ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
    ctx.fillRect(4, canvas.height - 25, canvas.width - 8, 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((nombre || "CARTA").substring(0, 12), canvas.width / 2, canvas.height - 12);
}
