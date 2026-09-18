// =============================================================================
// 💻 CONTROLADOR DEL ÁLBUM DIGITAL (VERSIÓN CORREGIDA - VYLON)
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

let idUsuarioTelegram = ""; 
let nombreUsuarioTelegram = "Jugador";
let uuidUsuarioSupabase = "";

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

    // 1. Obtener y resolver obligatoriamente el UUID de la tabla 'usuarios'
    await resolverUUIDUsuario();

    // 2. Cargar la colección en base a todos los identificadores detectados
    await cargarInventarioInicial();

    // 3. Activar listener en vivo para compras/premios en tiempo real
    activarAlbumEnTiempoReal();

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
    const uName = document.getElementById('user-username');
    const fName = document.getElementById('user-fullname');
    const avatar = document.getElementById('user-avatar');

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        idUsuarioTelegram = user.username 
            ? user.username.replace(/^@/, '').trim().toLowerCase() 
            : (user.id ? user.id.toString().trim() : "invitado_dev");

        nombreUsuarioTelegram = `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Jugador";

        if (uName) uName.innerText = `@${user.username || idUsuarioTelegram}`;
        if (fName) fName.innerText = nombreUsuarioTelegram;
        if (avatar && user.photo_url) avatar.src = user.photo_url;
    } else {
        idUsuarioTelegram = "utrera930";
        nombreUsuarioTelegram = "William Utrera";

        if (uName) uName.innerText = `@${idUsuarioTelegram}`;
        if (fName) fName.innerText = nombreUsuarioTelegram;
    }
}

async function resolverUUIDUsuario() {
    if (!supabaseClient || !idUsuarioTelegram) return;

    try {
        const tgIdNum = tg?.initDataUnsafe?.user?.id ? tg.initDataUnsafe.user.id.toString() : null;
        const usernameLimpio = idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase();

        // Buscar primero en la tabla 'usuarios' para mapear username / telegram_id con el UUID
        let queryFilter = `username.ilike.${usernameLimpio}`;
        if (tgIdNum) {
            queryFilter += `,telegram_id.eq.${tgIdNum}`;
        }

        const { data: usuarioBD } = await supabaseClient
            .from('usuarios')
            .select('id')
            .or(queryFilter)
            .maybeSingle();

        if (usuarioBD && usuarioBD.id) {
            uuidUsuarioSupabase = String(usuarioBD.id).trim();
            localStorage.setItem('usuario_uuid', uuidUsuarioSupabase);
        } else {
            // Si el usuario no existe en la tabla usuarios, se registra para asignarle un UUID
            const { data: nuevoUsuario } = await supabaseClient
                .from('usuarios')
                .upsert([{
                    telegram_id: tgIdNum || usernameLimpio,
                    username: usernameLimpio,
                    nombre: nombreUsuarioTelegram,
                    ultimo_ingreso: new Date().toISOString()
                }], { onConflict: 'username' })
                .select();

            if (nuevoUsuario && nuevoUsuario.length > 0 && nuevoUsuario[0].id) {
                uuidUsuarioSupabase = String(nuevoUsuario[0].id).trim();
                localStorage.setItem('usuario_uuid', uuidUsuarioSupabase);
            }
        }
    } catch (e) {
        console.warn("Aviso al vincular UUID de usuario:", e);
    }
}

async function cargarInventarioInicial() {
    try {
        if (!supabaseClient) return;

        const identificadores = [];
        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase();
        
        if (idLimpio) {
            identificadores.push(`usuario_id.ilike.${idLimpio}`);
            identificadores.push(`usuario_id.ilike.@${idLimpio}`);
        }
        
        const tgIdNum = tg?.initDataUnsafe?.user?.id ? tg.initDataUnsafe.user.id.toString() : null;
        if (tgIdNum) {
            identificadores.push(`usuario_id.eq.${tgIdNum}`);
        }

        const uuidLocal = uuidUsuarioSupabase || localStorage.getItem('usuario_uuid');
        if (uuidLocal) {
            identificadores.push(`usuario_id.eq.${uuidLocal}`);
        }

        if (identificadores.length === 0) return;

        // Búsqueda multi-filtro (Username + Telegram ID + UUID)
        let { data: coleccion, error: errColeccion } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .or(identificadores.join(','));

        if (errColeccion) {
            console.error("❌ Error leyendo Coleccion_Usuario:", errColeccion.message);
            return;
        }

        inventarioUsuarioCache.clear();

        if (coleccion && coleccion.length > 0) {
            const idsCartas = coleccion.map(item => Number(item.carta_id)).filter(id => !isNaN(id));

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
                if (item.carta_id !== undefined && item.carta_id !== null) {
                    const idCartaNum = Number(item.carta_id);
                    const cantidadNum = Number(item.cantidad) || 1;
                    const previo = inventarioUsuarioCache.get(idCartaNum);
                    const infoCarta = mapaCartas.get(idCartaNum);
                    
                    if (previo) {
                        previo.cantidad += cantidadNum;
                    } else {
                        inventarioUsuarioCache.set(idCartaNum, { 
                            carta_id: idCartaNum, 
                            cantidad: cantidadNum,
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

function irAPaginaDeCarta(idCarta) {
    const idNum = Number(idCarta);
    if (!isNaN(idNum) && idNum > 0) {
        const paginaDestino = Math.ceil(idNum / cartasPorPagina);
        paginaActual = Math.min(Math.max(paginaDestino, 1), totalPaginas);
        renderizarLibro(paginaActual);
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

        const itemPoseido = inventarioUsuarioCache.get(Number(idCarta));

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

    ctx.fillStyle = config.fondoColor || config.colorFondo || "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(config.simbolo || "👾", canvas.width / 2, (canvas.height / 2) - 10);

    ctx.strokeStyle = config.marcoColor || config.colorPrimario || "#64748b";
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

    const colorFondo = config.fondoColor || config.colorFondo || '#0f172a';
    const colorMarco = config.marcoColor || config.colorPrimario || '#00ff66';
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

function activarAlbumEnTiempoReal() {
    if (!supabaseClient) return;

    supabaseClient
        .channel(`realtime-album-global`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'Coleccion_Usuario'
            },
            async (payload) => {
                const nuevoRegistro = payload.new;
                if (!nuevoRegistro) return;

                const uId = String(nuevoRegistro.usuario_id || "").toLowerCase();
                const usuarioLimpio = idUsuarioTelegram ? idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase() : "";
                const tgIdNum = tg?.initDataUnsafe?.user?.id ? tg.initDataUnsafe.user.id.toString() : "";
                const uuidLocal = (uuidUsuarioSupabase || localStorage.getItem('usuario_uuid') || "").toLowerCase();

                const esMio = uId === usuarioLimpio || 
                             uId === `@${usuarioLimpio}` || 
                             (tgIdNum && uId === tgIdNum) || 
                             (uuidLocal && uId === uuidLocal);

                if (esMio) {
                    mostrarNotificacionCartaRecibida(nuevoRegistro);
                    await cargarInventarioInicial();
                    if (nuevoRegistro.carta_id) {
                        irAPaginaDeCarta(nuevoRegistro.carta_id);
                    }
                }
            }
        )
        .subscribe();
}

function mostrarNotificacionCartaRecibida(datosNuevos) {
    const toast = document.createElement('div');
    toast.className = 'toast-notificacion';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #00ff66;
        color: #000;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,255,102,0.4);
        z-index: 9999;
    `;
    toast.innerText = `🎉 ¡Has recibido una nueva carta! (ID: #${datosNuevos?.carta_id || ''})`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}
