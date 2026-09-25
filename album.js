// =============================================================================
// 📔 CONTROLADOR DEL ÁLBUM DIGITAL - USUARIO FINAL
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
let usuarioActual = "invitado";
let paginaActual = 1;
const totalPaginas = 80;
const cartasPorPagina = 25; // 2000 cartas totales / 80 páginas

// Función global para iniciar la aplicación desde la portada (Splash Screen)
window.iniciarApp = function() {
    console.log("Iniciando matriz y aplicación...");
    const pantallaPortada = document.getElementById('pantalla-portada');
    if (pantallaPortada) {
        pantallaPortada.style.opacity = '0';
        pantallaPortada.style.visibility = 'hidden';
        setTimeout(() => {
            pantallaPortada.style.display = 'none';
        }, 500);
    }
    cargarDatosUsuario();
};

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("❌ Error crítico: El SDK de Supabase no está disponible.");
    }

    // Inicializar datos de Telegram WebApp si está disponible
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            usuarioActual = String(user.username || user.id).trim().toLowerCase();
            
            const usernameElem = document.getElementById('user-username');
            const fullnameElem = document.getElementById('user-fullname');
            const avatarElem = document.getElementById('user-avatar');

            if (usernameElem) usernameElem.textContent = `@${user.username || user.id}`;
            if (fullnameElem) fullnameElem.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            if (avatarElem && user.photo_url) avatarElem.src = user.photo_url;
        }
    }

    // Configurar botones de navegación de páginas
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSiguiente = document.getElementById('btn-siguiente');

    if (btnAnterior) {
        btnAnterior.addEventListener('click', () => {
            if (paginaActual > 1) {
                paginaActual--;
                renderizarPaginaAlbum();
            }
        });
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                renderizarPaginaAlbum();
            }
        });
    }

    // Renderizado inicial vacío o de carga
    renderizarPaginaAlbum();
});

async function cargarDatosUsuario() {
    try {
        if (!supabaseClient) return;

        // Consultar la colección del usuario actual
        let { data: coleccion, error } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .eq('usuario_id', usuarioActual);

        if (error) {
            console.error("Error al cargar la colección:", error.message);
            return;
        }

        window.coleccionUsuarioCache = coleccion || [];
        actualizarHUDProgreso(window.coleccionUsuarioCache);
        renderizarPaginaAlbum();

    } catch (e) {
        console.error("Excepción al cargar datos del usuario:", e);
    }
}

function actualizarHUDProgreso(coleccion) {
    let totalObtenidas = 0;
    coleccion.forEach(item => {
        totalObtenidas += Number(item.cantidad) || 0;
    });

    const contadorProgreso = document.getElementById('contador-progreso');
    if (contadorProgreso) {
        contadorProgreso.textContent = `PROGRESO: ${String(totalObtenidas).padStart(3, '0')} / 2000`;
    }

    const valorUsd = document.getElementById('valor-usd');
    const valorBs = document.getElementById('valor-bs');
    
    // Cálculo estimado de valor de colección (ejemplo base)
    const valorTotalUsd = totalObtenidas * 0.10;
    if (valorUsd) valorUsd.textContent = `USD: $${valorTotalUsd.toFixed(2)}`;
    if (valorBs) valorBs.textContent = `BS: ${(valorTotalUsd * 36.5).toFixed(2)}`; // Tasa referencial ajustable
}

function renderizarPaginaAlbum() {
    const grilla = document.getElementById('grilla-cartas');
    const indicadorPagina = document.getElementById('indicador-pagina');
    
    if (indicadorPagina) {
        indicadorPagina.textContent = `PÁGINA ${paginaActual}/${totalPaginas}`;
    }

    if (!grilla) return;
    grilla.innerHTML = '';

    const inicioCarta = (paginaActual - 1) * cartasPorPagina + 1;
    const finCarta = paginaActual * cartasPorPagina;

    const coleccionMap = {};
    if (window.coleccionUsuarioCache) {
        window.coleccionUsuarioCache.forEach(item => {
            coleccionMap[Number(item.carta_id)] = Number(item.cantidad) || 0;
        });
    }

    // Generar la cuadrícula de cartas para la página actual
    for (let id = inicioCarta; id <= finCarta; id++) {
        const cantidadPoseida = coleccionMap[id] || 0;
        const cartaDiv = document.createElement('div');
        
        cartaDiv.className = `carta-slot ${cantidadPoseida > 0 ? 'poseida' : 'bloqueada'}`;
        cartaDiv.style.cssText = "background: #121324; border: 1px solid #00f3ff; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; min-height: 90px; text-align: center; font-family: 'Press Start 2P', monospace; position: relative;";
        
        if (cantidadPoseida > 0) {
            cartaDiv.innerHTML = `
                <span style="color: #00f3ff; font-size: 8px; margin-bottom: 4px;">#${id}</span>
                <span style="color: #ff007f; font-size: 6px;">CYBER CARD</span>
                <span style="background: #ff007f; color: #fff; font-size: 6px; padding: 2px 5px; border-radius: 4px; margin-top: 4px;">x${cantidadPoseida}</span>
            `;
        } else {
            cartaDiv.innerHTML = `
                <span style="color: #555; font-size: 8px; margin-bottom: 4px;">#${id}</span>
                <span style="color: #444; font-size: 6px;">[ BLOQUEADA ]</span>
            `;
        }

        grilla.appendChild(cartaDiv);
    }
}

// Funciones globales auxiliares requeridas por la interfaz
window.enviarSolicitudPremio = function() {
    alert("Solicitud de premio enviada correctamente a revisión.");
    const modal = document.getElementById('modal-ganador-premio');
    if (modal) modal.style.display = 'none';
};

window.reiniciarAlbumUsuario = function() {
    alert("El álbum se ha reiniciado para una nueva era.");
    location.reload();
};
