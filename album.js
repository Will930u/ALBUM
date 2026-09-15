// =============================================================================
// 💻 CONTROLADOR DEL ÁLBUM CON SOPORTE SUPABASE Y TELEGRAM
// =============================================================================

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
const totalPaginas = 80; // 2000 cartas / 25 por página = 80

let inventarioUsuarioCache = new Map();

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (e) {
        console.warn("⚠️ Supabase no cargado en modo offline.");
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
        document.getElementById('modal-visor').style.display = 'none';
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
    }
}

// Carga del inventario combinando ambas tablas mediante JOIN
async function cargarInventarioInicial() {
    try {
        if (!supabaseClient) return;

        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim();
        const idConArroba = `@${idLimpio}`;

        // Consultar la tabla Coleccion_Usuario cruzando la información con Cartas
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
                            datosCarta: item.Cartas
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

    let eraTexto = "ERA 1: COTIDIANOS 🐾";
    if (inicioRango > 250) eraTexto = "ERA 2: ANCESTRAL 📜";
    if (inicioRango > 500) eraTexto = "ERA 3: CYBERPUNK 🦾";
    if (inicioRango > 750) eraTexto = "ERA 4: FUTURISTA 🚀";
    
    const elTitulo = document.getElementById('titulo-bloque');
    if (elTitulo) elTitulo.innerText = eraTexto;

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

            const imgUrl = itemPoseido.datosCarta?.imagen_url || 'https://via.placeholder.com/100';
            const img = document.createElement('img');
            img.src = imgUrl;
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
    const imgUrl = datosCarta?.imagen_url || 'https://via.placeholder.com/200';
    const rareza = datosCarta?.rareza || 'Común';
    const lore = datosCarta?.lore || 'Sin descripción disponible.';

    contenidoFrontal.innerHTML = `
        <div style="text-align:center;">
            <h3 style="font-size:10px; color:#ffcc00; margin-bottom:8px;">${nombre.toUpperCase()}</h3>
            <img src="${imgUrl}" style="width:100%; max-height:180px; object-fit:contain; border-radius:4px; border:1px solid #00ff66; margin-bottom:8px;">
            <p style="font-size:7px; color:#38bdf8; margin-bottom:4px;">Rareza: ${rareza} | Copias: ${cantidad}</p>
            <p style="font-size:6px; color:#aaa; margin-bottom:8px;">${lore}</p>
            <p style="font-size:7px; color:#555;">#${String(idCarta).padStart(4, '0')}</p>
        </div>
    `;

    modalVisor.style.display = 'flex';
}
