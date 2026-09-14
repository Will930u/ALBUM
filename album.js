// CONFIGURACIÓN DE CONEXIÓN CON TU SERVIDOR DE SUPABASE
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

// Inicializar cliente Supabase de manera segura
let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Inicialización de Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

// Variables globales
let idUsuarioTelegram = "usuario_test_venezuela";
let paginaActual = 1;
const cartasPorPagina = 25;
const totalPaginas = 40;

// Caché global en memoria
let inventarioUsuarioCache = new Map();

// Elementos del DOM
const grillaCartas = document.getElementById('grilla-cartas');
const contadorProgreso = document.getElementById('contador-progreso');
const tituloBloque = document.getElementById('titulo-bloque');
const indicadorPagina = document.getElementById('indicador-pagina');
const modalVisor = document.getElementById('modal-visor');
const cartaAnimada = document.getElementById('carta-animada');
const contenidoFrontal = document.getElementById('contenido-carta-frontal');

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargar datos del usuario de Telegram
    inicializarUsuarioTelegram();

    // 2. Actualizar año
    const elAno = document.getElementById('ano-actual');
    if (elAno) elAno.innerText = new Date().getFullYear();

    // 3. Cargar inventario inicial de forma segura
    await cargarInventarioInicial();
    
    // 4. Renderizar libro (25 slots garantizados por página)
    await renderizarLibro(paginaActual);

    // 5. Escuchar en vivo si Supabase está activo
    if (supabaseClient) {
        activarEscuchaColeccionEnVivo();
    }

    // Controles de navegación
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

    // Cerrar visor modal
    modalVisor.addEventListener('click', () => {
        cartaAnimada.classList.remove('girar-y-ampliar');
        setTimeout(() => { modalVisor.style.display = 'none'; }, 250);
    });
});

function inicializarUsuarioTelegram() {
    const avatarImg = document.getElementById('user-avatar');
    
    // Asignar avatar por defecto tipo SVG SVG inmune a bloqueos
    avatarImg.onerror = function() {
        this.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%2300ff66'><circle cx='12' cy='8' r='4'/><path d='M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z'/></svg>";
    };

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        idUsuarioTelegram = user.id.toString();
        
        document.getElementById('user-username').innerText = user.username ? `@${user.username}` : `@id_${user.id}`;
        document.getElementById('user-fullname').innerText = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        
        if (user.photo_url) {
            avatarImg.src = user.photo_url;
        } else {
            avatarImg.onerror();
        }
    } else {
        avatarImg.onerror();
    }
}

async function cargarInventarioInicial() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('Coleccion_Usuario')
            .select('id_carta, cantidad')
            .eq('id_usuario', idUsuarioTelegram);
        
        if (!error && data) {
            inventarioUsuarioCache = new Map(data.map(i => [Number(i.id_carta), i.cantidad]));
        }
    } catch (err) {
        console.warn("Advertencia al cargar inventario:", err);
    }
}

async function renderizarLibro(pagina) {
    const inicioRango = (pagina - 1) * cartasPorPagina + 1;
    const finRango = pagina * cartasPorPagina;

    indicadorPagina.innerText = `PÁGINA ${pagina}/${totalPaginas}`;

    let eraTexto = "ERA 1: COTIDIANOS 🐾";
    if (inicioRango > 500)  eraTexto = "ERA 2: SILVESTRES 🦅";
    if (inicioRango > 1000) eraTexto = "ERA 3: EXTINTOS 🦖";
    if (inicioRango > 1500) eraTexto = "ERA 4: MITOLÓGICOS 🔮";
    tituloBloque.innerText = eraTexto;

    let mapaCatalogo = new Map();

    if (supabaseClient) {
        try {
            const { data: catalogoCartas, error: errCartas } = await supabaseClient.from('Cartas')
                .select('*')
                .gte('id_carta', inicioRango)
                .lte('id_carta', finRango);

            if (!errCartas && catalogoCartas) {
                mapaCatalogo = new Map(catalogoCartas.map(c => [Number(c.id_carta), c]));
            }
        } catch (err) {
            console.warn("Error consultando la base de datos:", err);
        }
    }

    // Actualizar progreso
    const poseidasTotales = inventarioUsuarioCache.size;
    contadorProgreso.innerText = `PROGRESO: ${String(poseidasTotales).padStart(3, '0')} / 2000`;

    // Limpiar y rellenar exactamente 25 cuadros (del 1 al 25, 26 al 50, etc.)
    grillaCartas.innerHTML = "";

    for (let idCarta = inicioRango; idCarta <= finRango; idCarta++) {
        const slot = document.createElement('div');
        slot.classList.add('miniatura-slot');

        const datosCarta = mapaCatalogo.get(idCarta);
        const jugadorLaPosee = inventarioUsuarioCache.has(idCarta);

        if (datosCarta && jugadorLaPosee) {
            slot.innerHTML = `<img src="${datosCarta.url_imagen}" alt="Barajita ${idCarta}">`;
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                desplegarCarta3D(datosCarta);
            });
        } else {
            // Muestra siempre el número ordinal correspondiente
            slot.classList.add('bloqueada');
            slot.innerText = idCarta;
        }

        grillaCartas.appendChild(slot);
    }
}

function desplegarCarta3D(carta) {
    const numeroEstrellas = Math.min(Math.max(Math.floor((carta.poder || 100) / 100), 1), 5);
    let estrellasHtml = "★".repeat(numeroEstrellas);

    contenidoFrontal.innerHTML = `
        <div style="text-align:center; padding: 10px;">
            <h3 style="font-size:10px; color:#ffcc00; margin-bottom:5px;">${(carta.nombre || 'BARAJITA').toUpperCase()}</h3>
            <p style="font-size:8px; color:#00ff66; margin-bottom:10px;">${estrellasHtml}</p>
            <img src="${carta.url_imagen}" style="width:100%; height:180px; object-fit:cover; border-radius:4px; border:2px solid #3a6ea5;">
            <p style="font-size:7px; color:#aaa; margin-top:10px;">#${String(carta.id_carta).padStart(4, '0')}</p>
        </div>
    `;

    modalVisor.style.display = 'flex';
    setTimeout(() => {
        cartaAnimada.classList.add('girar-y-ampliar');
    }, 30);
}

function activarEscuchaColeccionEnVivo() {
    supabaseClient
        .channel('cambios-album-en-vivo')
        .on(
            'postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'Coleccion_Usuario',
                filter: `id_usuario=eq.${idUsuarioTelegram}`
            }, 
            (payload) => {
                const nuevaCarta = payload.new;
                inventarioUsuarioCache.set(Number(nuevaCarta.id_carta), nuevaCarta.cantidad);

                const inicioRango = (paginaActual - 1) * cartasPorPagina + 1;
                const finRango = paginaActual * cartasPorPagina;

                if (nuevaCarta.id_carta >= inicioRango && nuevaCarta.id_carta <= finRango) {
                    renderizarLibro(paginaActual);
                }
            }
        )
        .subscribe();
}
