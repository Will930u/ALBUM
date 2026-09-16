// =============================================================================
// 💻 CONTROLADOR DEL ÁLBUM DIGITAL (VERSIÓN COMPLETA RLS-COMPATIBLE)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseClient = null;
const tg = window.Telegram?.WebApp;

if (tg) {
    try { 
        tg.expand(); 
        tg.ready();
    } catch (e) {}
}

let idUsuarioTelegram = "utrera930"; 
let paginaActual = 1;
const cartasPorPagina = 25;
const totalPaginas = 80;

let inventarioUsuarioCache = new Map();

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("❌ El SDK de Supabase no está cargado en el HTML.");
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
    let idDetectado = null;

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        if (user.username) {
            idDetectado = user.username.replace(/^@/, '').trim();
        } else if (user.id) {
            idDetectado = user.id.toString().trim();
        }

        const uName = document.getElementById('user-username');
        const fName = document.getElementById('user-fullname');
        const avatar = document.getElementById('user-avatar');

        if (uName) uName.innerText = `@${idDetectado || 'utrera930'}`;
        if (fName) fName.innerText = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        if (avatar && user.photo_url) avatar.src = user.photo_url;
    } else {
        const uName = document.getElementById('user-username');
        if (uName) uName.innerText = `@${idUsuarioTelegram} (Web)`;
    }

    idUsuarioTelegram = idDetectado || "utrera930";
}

async function cargarInventarioInicial() {
    try {
        if (!supabaseClient) return;

        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim();

        // ilike ignora diferencias entre mayúsculas y minúsculas (Utrera930 == utrera930)
        let { data: coleccion, error: errColeccion } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio},usuario_id.ilike.utrera930`);

        if (errColeccion) {
            console.error("❌ Error leyendo Coleccion_Usuario:", errColeccion.message);
            return;
        }

        inventarioUsuarioCache.clear();

        if (coleccion && coleccion.length > 0) {
            const idsCartas = coleccion.map(item => item.carta_id);

            const { data: datosCartas, error: errCartas } = await supabaseClient
                .from('Cartas')
                .select('*')
                .in('id', idsCartas);

            if (errCartas) console.error("❌ Error leyendo la tabla Cartas:", errCartas.message);

            const mapaCartas = new Map();
            if (datosCartas) {
                datosCartas.forEach(c => mapaCartas.set(Number(c.id), c));
            }

            coleccion.forEach(item => {
                if (item.carta_id) {
                    const idCartaNum = Number(item.carta_id);
                    const previo = inventarioUsuarioCache.get(idCartaNum);
                    const infoCarta = mapaCartas.get(idCartaNum);
                    
                    if (previo) {
                        previo.cantidad += item.cantidad;
                    } else {
                        inventarioUsuarioCache.set(idCartaNum, { 
                            carta_id: idCartaNum, 
                            cantidad: item.cantidad,
                            datosCarta: infoCarta || { id: idCartaNum, nombre: `Carta #${idCartaNum}` }
                        });
                    }
                }
            });
        }

        renderizarLibro(paginaActual);

    } catch (err) {
        console.error("Excepción en cargarInventarioInicial:", err);
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

            dibujarBarajitaAlgoritmicaSlot(slot, itemPoseido.datosCarta, idCarta);

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

function dibujarBarajitaAlgoritmicaSlot(contenedor, datosCarta, idCarta) {
    let config = {};
    try {
        config = typeof datosCarta?.imagen_url === 'string' 
            ? JSON.parse(datosCarta.imagen_url) 
            : (datosCarta?.imagen_url || {});
    } catch (e) {
        config = {};
    }

    if (typeof datosCarta?.imagen_url === 'string' && datosCarta.imagen_url.startsWith('data:image')) {
        const img = document.createElement('img');
        img.src = datosCarta.imagen_url;
        img.className = 'img-slot-carta';
        contenedor.appendChild(img);
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.borderRadius = "4px";

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = config.fondoColor || "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 10);

    ctx.strokeStyle = config.marcoColor || "#64748b";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(5, canvas.height - 28, canvas.width - 10, 22);

    ctx.fillStyle = "#ffffff";
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    const nombreVisual = datosCarta?.nombre || `CARTA #${idCarta}`;
    ctx.fillText(nombreVisual.substring(0, 10), canvas.width / 2, canvas.height - 14);

    contenedor.appendChild(canvas);
}

function desplegarVisor(datosCarta, idCarta, cantidad) {
    const modalVisor = document.getElementById('modal-visor');
    const contenidoFrontal = document.getElementById('contenido-carta-frontal');
    if (!modalVisor || !contenidoFrontal) return;

    const nombre = datosCarta?.nombre || `CARTA #${idCarta}`;
    const rareza = datosCarta?.rareza || 'Común';
    const lore = datosCarta?.lore || 'Sin descripción disponible.';

    let config = {};
    try {
        config = typeof datosCarta?.imagen_url === 'string' ? JSON.parse(datosCarta.imagen_url) : (datosCarta?.imagen_url || {});
    } catch(e){}

    const colorFondo = config.fondoColor || '#0f172a';
    const colorMarco = config.marcoColor || '#00ff66';
    const simbolo = config.simbolo || '👾';

    contenidoFrontal.innerHTML = `
        <div style="text-align:center;">
            <h3 style="font-size:10px; color:#ffcc00; margin-bottom:8px;">${nombre.toUpperCase()}</h3>
            <div style="width:180px; height:230px; margin: 0 auto 10px auto; background:${colorFondo}; border:3px solid ${colorMarco}; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:70px; box-shadow:0 0 10px ${colorMarco};">
                ${simbolo}
            </div>
            <p style="font-size:7px; color:#38bdf8; margin-bottom:4px;">Rareza: ${rareza} | Copias: ${cantidad}</p>
            <p style="font-size:6px; color:#aaa; margin-bottom:8px;">${lore}</p>
            <p style="font-size:7px; color:#555;">#${String(idCarta).padStart(4, '0')}</p>
        </div>
    `;

    modalVisor.style.display = 'flex';
}
