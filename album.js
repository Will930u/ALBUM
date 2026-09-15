// =============================================================================
// 💻 CONTROLADOR DEL ÁLBUM DIGITAL (VERSIÓN CORREGIDA HÍBRIDA)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
const tg = window.Telegram?.WebApp;
if (tg) {
    try { tg.expand(); } catch (e) {}
}

// Usuario por defecto si entra desde el navegador web fuera de Telegram
let idUsuarioTelegram = "utrera930"; 
let paginaActual = 1;
const cartasPorPagina = 25;
const totalPaginas = 80;

let inventarioUsuarioCache = new Map();

document.addEventListener("DOMContentLoaded", async () => {
    // Inicializar Supabase con fallback de verificación
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("❌ La librería @supabase/supabase-js no está cargada.");
    }

    inicializarUsuarioTelegram();
    
    const elAno = document.getElementById('ano-actual');
    if (elAno) elAno.innerText = new Date().getFullYear();

    await cargarInventarioInicial();

    document.getElementById('btn-anterior')?.addEventListener('click', () => {
        if (paginaActual > 1) { 
            paginaActual--; 
            renderizarLibro(paginaActual); 
        }
    });

    document.getElementById('btn-siguiente')?.addEventListener('click', () => {
        if (paginaActual < totalPaginas) { 
            paginaActual++; 
            renderizarLibro(paginaActual); 
        }
    });

    document.getElementById('modal-visor')?.addEventListener('click', () => {
        const visor = document.getElementById('modal-visor');
        if (visor) visor.style.display = 'none';
    });
});

function inicializarUsuarioTelegram() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        idUsuarioTelegram = user.username || user.id.toString();
        
        const uName = document.getElementById('user-username');
        const fName = document.getElementById('user-fullname');
        const avatar = document.getElementById('user-avatar');

        if (uName) uName.innerText = `@${idUsuarioTelegram}`;
        if (fName) fName.innerText = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        if (avatar && user.photo_url) avatar.src = user.photo_url;
    } else {
        // Asignación explícita para pruebas en Navegador Web fuera de Telegram
        const uName = document.getElementById('user-username');
        if (uName) uName.innerText = `@${idUsuarioTelegram} (Web)`;
    }
}

async function cargarInventarioInicial() {
    try {
        if (!supabaseClient) return;

        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim();
        const idConArroba = `@${idLimpio}`;

        // Consulta unificada
        const { data: coleccion, error: errColeccion } = await supabaseClient
            .from('Coleccion_Usuario')
            .select(`
                carta_id, 
                cantidad,
                Cartas ( id, nombre, rareza, imagen_url, lore )
            `)
            .or(`usuario_id.eq.${idLimpio},usuario_id.eq.${idConArroba}`);

        if (errColeccion) {
            console.error("❌ Error leyendo Coleccion_Usuario:", errColeccion.message);
            return;
        }

        inventarioUsuarioCache.clear();

        if (coleccion && coleccion.length > 0) {
            coleccion.forEach(item => {
                if (item.carta_id) {
                    const idCartaNum = Number(item.carta_id);
                    const previo = inventarioUsuarioCache.get(idCartaNum);
                    
                    if (previo) {
                        previo.cantidad += item.cantidad;
                    } else {
                        inventarioUsuarioCache.set(idCartaNum, { 
                            carta_id: idCartaNum, 
                            cantidad: item.cantidad,
                            datosCarta: Array.isArray(item.Cartas) ? item.Cartas[0] : item.Cartas
                        });
                    }
                }
            });
        }

        renderizarLibro(paginaActual);

    } catch (err) {
        console.warn("Excepción en cargarInventarioInicial:", err);
    }
}

function renderizarLibro(pagina) {
    const grillaCartas = document.getElementById('grilla-cartas');
    if (!grillaCartas) return;

    const inicioRango = (pagina - 1) * cartasPorPagina + 1;
    const finRango = pagina * cartasPorPagina;

    const elPagina = document.getElementById('indicador-pagina');
    if (elPagina) elPagina.innerText = `PÁGINA ${pagina}/${totalPaginas}`;

    const poseidasTotales = inventarioUsuarioCache.size;
    const elProgreso = document.getElementById('contador-progreso');
    if (elProgreso) elProgreso.innerText = `PROGRESO: ${String(poseidasTotales).padStart(3, '0')} / 2000`;

    grillaCartas.innerHTML = "";

    for (let idCarta = inicioRango; idCarta <= finRango; idCarta++) {
        const slot = document.createElement('div');
        slot.className = 'miniatura-slot';

        const itemPoseido = inventarioUsuarioCache.get(idCarta);

        if (itemPoseido) {
            slot.classList.add('poseida');

            // Control de imagen rota o vacía con fallback visual
            const imgUrl = itemPoseido.datosCarta?.imagen_url || '';
            const img = document.createElement('img');
            
            if (imgUrl && imgUrl.trim() !== '') {
                img.src = imgUrl;
            } else {
                // SVG de respaldo si no hay URL configurada
                img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130" viewBox="0 0 100 130"><rect width="100%" height="100%" fill="%231a1a24"/><text x="50%" y="50%" fill="%2300ff66" font-size="10" text-anchor="middle" font-family="sans-serif">CARTA %23' + idCarta + '</text></svg>';
            }

            img.onerror = function() {
                // Fallback si la URL remota da 404 o falla la carga
                this.onerror = null;
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130" viewBox="0 0 100 130"><rect width="100%" height="100%" fill="%232a0000"/><text x="50%" y="50%" fill="%23ff0055" font-size="8" text-anchor="middle" font-family="sans-serif">ERR: IMG 404</text></svg>';
            };

            img.alt = `Carta #${idCarta}`;
            img.className = 'img-slot-carta';
            slot.appendChild(img);

            if (itemPoseido.cantidad > 1) {
                const badge = document.createElement('span');
                badge.className = 'badge-cantidad';
                badge.textContent = `x${itemPoseido.cantidad}`;
                slot.appendChild(badge);
            }

            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                desplegarVisor(itemPoseido.datosCarta, idCarta, itemPoseido.cantidad);
            });
        } else {
            slot.innerText = idCarta;
        }

        grillaCartas.appendChild(slot);
    }
}

function desplegarVisor(datosCarta, idCarta, cantidad) {
    const modalVisor = document.getElementById('modal-visor');
    const contenidoFrontal = document.getElementById('contenido-carta-frontal');
    if (!modalVisor || !contenidoFrontal) return;

    const nombre = datosCarta?.nombre || `CARTA #${idCarta}`;
    const imgUrl = datosCarta?.imagen_url || '';
    const rareza = datosCarta?.rareza || 'Común';
    const lore = datosCarta?.lore || 'Sin descripción disponible.';

    const imgSrcFinal = (imgUrl && imgUrl.trim() !== '') ? imgUrl : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="100%" height="100%" fill="%231a1a24"/><text x="50%" y="50%" fill="%2300ff66" font-size="12" text-anchor="middle">SIN IMAGEN</text></svg>';

    contenidoFrontal.innerHTML = `
        <div style="text-align:center;">
            <h3 style="font-size:10px; color:#ffcc00; margin-bottom:8px;">${nombre.toUpperCase()}</h3>
            <img src="${imgSrcFinal}" style="width:100%; max-height:180px; object-fit:contain; border-radius:4px; border:1px solid #00ff66; margin-bottom:8px;" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\' viewBox=\'0 0 200 200\'><rect width=\'100%\' height=\'100%\' fill=\'%232a0000\'/><text x=\'50%\' y=\'50%\' fill=\'%23ff0055\' font-size=\'10\' text-anchor=\'middle\'>IMAGEN NO DISPONIBLE</text></svg>'">
            <p style="font-size:7px; color:#38bdf8; margin-bottom:4px;">Rareza: ${rareza} | Copias: ${cantidad}</p>
            <p style="font-size:6px; color:#aaa; margin-bottom:8px;">${lore}</p>
            <p style="font-size:7px; color:#555;">#${String(idCarta).padStart(4, '0')}</p>
        </div>
    `;

    modalVisor.style.display = 'flex';
}
