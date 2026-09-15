// CONFIGURACIÓN DE CONEXIÓN CON TU SERVIDOR DE SUPABASE
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

let idUsuarioTelegram = "utrera930";
let paginaActual = 1;
const cartasPorPagina = 25;
const totalPaginas = 40;

let inventarioUsuarioCache = new Map();

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (e) {
        console.warn("Supabase no cargado en modo offline.");
    }

    inicializarUsuarioTelegram();
    document.getElementById('ano-actual').innerText = new Date().getFullYear();

    await cargarInventarioInicial();
    renderizarLibro(paginaActual);

    document.getElementById('btn-anterior').addEventListener('click', () => {
        if (paginaActual > 1) { 
            paginaActual--; 
            renderizarLibro(paginaActual); 
        }
    });

    document.getElementById('btn-siguiente').addEventListener('click', () => {
        if (paginaActual < totalPaginas) { 
            paginaActual++; 
            renderizarLibro(paginaActual); 
        }
    });

    document.getElementById('modal-visor').addEventListener('click', () => {
        document.getElementById('modal-visor').style.display = 'none';
    });
});

function inicializarUsuarioTelegram() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        idUsuarioTelegram = user.username || user.id.toString();
        
        document.getElementById('user-username').innerText = `@${idUsuarioTelegram}`;
        document.getElementById('user-fullname').innerText = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        
        if (user.photo_url) {
            document.getElementById('user-avatar').src = user.photo_url;
        }
    }
}

async function cargarInventarioInicial() {
    try {
        if (!supabaseClient) return;
        
        // Buscamos coincidencia tanto por username como por ID numérico
        const { data, error } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .or(`usuario_id.eq.${idUsuarioTelegram},id_usuario.eq.${idUsuarioTelegram}`);
        
        if (!error && data) {
            inventarioUsuarioCache.clear();
            data.forEach(item => {
                // Soporta si la columna se llama carta_id o id_carta
                const idCarta = item.carta_id || item.id_carta;
                if (idCarta) {
                    inventarioUsuarioCache.set(Number(idCarta), item);
                }
            });
        }
    } catch (err) {
        console.warn("Error cargando inventario inicial:", err);
    }
}

function renderizarLibro(pagina) {
    const grillaCartas = document.getElementById('grilla-cartas');
    const inicioRango = (pagina - 1) * cartasPorPagina + 1;
    const finRango = pagina * cartasPorPagina;

    document.getElementById('indicador-pagina').innerText = `PÁGINA ${pagina}/${totalPaginas}`;

    let eraTexto = "ERA 1: COTIDIANOS 🐾";
    if (inicioRango > 250) eraTexto = "ERA 2: ANCESTRAL 📜";
    if (inicioRango > 500) eraTexto = "ERA 3: CYBERPUNK 🦾";
    if (inicioRango > 750) eraTexto = "ERA 4: FUTURISTA 🚀";
    document.getElementById('titulo-bloque').innerText = eraTexto;

    const poseidasTotales = inventarioUsuarioCache.size;
    document.getElementById('contador-progreso').innerText = `PROGRESO: ${String(poseidasTotales).padStart(3, '0')} / 2000`;

    // Reconstruir slots 5x5 estables
    grillaCartas.innerHTML = "";

    for (let idCarta = inicioRango; idCarta <= finRango; idCarta++) {
        const slot = document.createElement('div');
        slot.className = 'miniatura-slot';

        const itemPoseido = inventarioUsuarioCache.get(idCarta);

        if (itemPoseido) {
            slot.classList.add('poseida');

            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 125;
            slot.appendChild(canvas);

            if (itemPoseido.cantidad > 1) {
                const badge = document.createElement('span');
                badge.className = 'badge-cantidad';
                badge.textContent = `x${itemPoseido.cantidad}`;
                slot.appendChild(badge);
            }

            let receta = {};
            try { 
                receta = JSON.parse(itemPoseido.Cartas?.imagen_url || itemPoseido.imagen_url); 
            } catch (e) {
                receta = { fondoColor: "#1e293b", simbolo: "👾", marcoColor: "#38bdf8" };
            }

            const nombreCarta = itemPoseido.Cartas?.nombre || `CARTA #${idCarta}`;
            dibujarCartaMini(canvas, receta, nombreCarta);

            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                desplegarVisor(receta, nombreCarta, idCarta);
            });
        } else {
            slot.innerText = idCarta;
        }

        grillaCartas.appendChild(slot);
    }
}

// MOTOR ALGORÍTMICO DE DIBUJO EN CANVAS
function dibujarCartaMini(canvas, receta, nombre) {
    const ctx = canvas.getContext("2d");
    
    // Fondo Algorítmico
    ctx.fillStyle = receta.fondoColor || "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ícono Pixel Art en el Centro
    ctx.font = "26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(receta.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 8);

    // Marco / Borde
    ctx.strokeStyle = receta.marcoColor || "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Franja de Nombre
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.fillRect(3, canvas.height - 20, canvas.width - 6, 17);

    // Texto
    ctx.fillStyle = "#ffffff";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((nombre || "BARAJITA").substring(0, 10), canvas.width / 2, canvas.height - 8);
}

function desplegarVisor(receta, nombre, idCarta) {
    const modalVisor = document.getElementById('modal-visor');
    const contenidoFrontal = document.getElementById('contenido-carta-frontal');

    contenidoFrontal.innerHTML = `
        <div style="text-align:center;">
            <h3 style="font-size:10px; color:#ffcc00; margin-bottom:10px;">${nombre.toUpperCase()}</h3>
            <canvas id="canvas-visor" width="220" height="270" style="border-radius:4px; border:2px solid #38bdf8; width:100%;"></canvas>
            <p style="font-size:8px; color:#aaa; margin-top:10px;">#${String(idCarta).padStart(4, '0')}</p>
        </div>
    `;

    const canvasVisor = document.getElementById('canvas-visor');
    dibujarCartaMini(canvasVisor, receta, nombre);

    modalVisor.style.display = 'flex';
}
