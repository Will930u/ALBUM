// =============================================================================
// 🎮 ÁLBUM RETRO ARCADE - CONTROLADOR DE GRILLA (VERSIÓN CONFIGURADA A 25 SLOTS)
// =============================================================================

// CONFIGURACIÓN DE CONEXIÓN CON TU SERVIDOR DE SUPABASE
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicialización de Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand(); // Fuerza a la Mini App a abrirse en pantalla completa dentro de Telegram
}

// Variables globales organizadas
let idUsuarioTelegram = "usuario_test_venezuela";
let paginaActual = 1;
const cartasPorPagina = 25; // Sincronizado con tu grilla visual de 5x5
const totalPaginas = 80;    // CORREGIDO: 80 páginas × 25 slots = 2000 cartas totales

// Caché global en memoria (Evita congelamiento de red en Venezuela)
let inventarioUsuarioCache = new Map();

// Elementos del DOM
const grillaCartas = document.getElementById('grilla-cartas');
const contadorProgreso = document.getElementById('contador-progreso');
const tituloBloque = document.getElementById('titulo-bloque');
const indicadorPagina = document.getElementById('indicador-pagina');
const modalVisor = document.getElementById('modal-visor');
const cartaAnimada = document.getElementById('carta-animada');
const contenidoFrontal = document.getElementById('contenido-carta-frontal');

// Escuchador principal de arranque
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Intentar capturar los datos reales del usuario si entra desde Telegram
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        idUsuarioTelegram = String(tg.initDataUnsafe.user.id);
        console.log(`🤖 Jugador autenticado por Telegram ID: ${idUsuarioTelegram}`);
    }

    // 2. Descargar inventario e inicializar libro
    await cargarInventarioInicial();
    renderizarLibro(paginaActual);
    activarEscuchaColeccionEnVivo();

    // 3. Eventos interactivos de los botones de navegación
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

    // Cerrar el visor modal 3D al hacer clic en el fondo oscuro
    if (modalVisor) {
        modalVisor.addEventListener('click', () => {
            if (cartaAnimada) cartaAnimada.classList.remove('girar-y-ampliar');
            setTimeout(() => { modalVisor.style.display = 'none'; }, 250);
        });
    }
});

// Carga inicial inmutable del inventario del usuario
async function cargarInventarioInicial() {
    try {
        // CORREGIDO: Cambiado 'Coleccion_Usuario' por 'album_usuario'
const { data, error } = await supabaseClient.from('album_usuario')
    .select('id_carta, cantidad')
    .eq('id_usuario', idUsuarioTelegram);
    } catch (err) {
        console.error("Error al sincronizar inventario inicial:", err);
    }
}

// Función central: Dibuja los 25 cuadros fijos con sus identificadores
async function renderizarLibro(pagina) {
    if (!grillaCartas) return;
    grillaCartas.innerHTML = "<p style='color:#00ff66;font-size:8px;grid-column:span 5;text-align:center;'>ABRIENDO PÁGINA...</p>";
    
    const inicioRango = (pagina - 1) * cartasPorPagina + 1;
    const finRango = pagina * cartasPorPagina;

    // Control dinámico de las Eras en base al ID de carta
    let eraTexto = "ERA 1: COTIDIANOS 🐾";
    if (inicioRango > 500)  eraTexto = "ERA 2: SILVESTRES 🦅";
    if (inicioRango > 1000) eraTexto = "ERA 3: EXTINTOS 🦖";
    if (inicioRango > 1500) eraTexto = "ERA 4: MITOLÓGICOS 🔮";
    
    if (tituloBloque) tituloBloque.innerText = eraTexto;
    if (indicadorPagina) indicadorPagina.innerText = `PÁGINA ${pagina}/${totalPaginas}`;

    try {
        // Consultar el catálogo de cartas vigentes para este rango de la página
        const { data: catalogoCartas, error: errCartas } = await supabaseClient.from('Cartas')
            .select('*')
            .gte('id_carta', inicioRango)
            .lte('id_carta', finRango);

        if (errCartas) throw errCartas;
        const mapaCatalogo = new Map(catalogoCartas.map(c => [c.id_carta, c]));
        
        // Actualizar contadores de cabecera
        if (contadorProgreso) {
            contadorProgreso.innerText = `PÁG. ${pagina} | RESTRICCIÓN: #${inicioRango}-#${finRango}`;
        }
        grillaCartas.innerHTML = "";

        // 🚀 EL BUCLE SUPREMO DE 25 REPETICIONES EXACTAS
        for (let idCarta = inicioRango; idCarta <= finRango; idCarta++) {
            const slot = document.createElement('div');
            slot.classList.add('miniatura-slot');

            const datosCarta = mapaCatalogo.get(idCarta);
            const jugadorLaPosee = inventarioUsuarioCache.has(idCarta);

            if (datosCarta && jugadorLaPosee) {
                // CASO 1: Desbloqueada y comprada. Se muestra la criatura a color
                slot.innerHTML = `<img src="${datosCarta.url_imagen}" alt="Card">`;
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    desplegarCarta3D(datosCarta);
                });
            } else {
                // CASO 2: Ranura vacía/bloqueada. Muestra el número correspondiente del slot (Ej: 1, 2, 26, 27...)
                slot.classList.add('bloqueada');
                slot.innerHTML = `<span>${idCarta}</span>`;
            }

            grillaCartas.appendChild(slot);
        }

    } catch (error) {
        console.error("Error crítico en grilla:", error);
        grillaCartas.innerHTML = "<p style='color:#ff3333;font-size:8px;grid-column:span 5;text-align:center;'>ERROR DE CONEXIÓN</p>";
    }
}

// Despliegue 3D elástico con metadatos de Supabase
function desplegarCarta3D(carta) {
    if (!contenidoFrontal || !modalVisor) return;
    
    const numeroEstrellas = Math.min(Math.max(Math.floor(carta.poder / 100), 1), 5);
    let estrellasHtml = "";
    for (let i = 0; i < numeroEstrellas; i++) estrellasHtml += "<span class='estrella-oro'>★</span>";

    let claseMarco = `marco-${carta.tipo.trim().toLowerCase()}`;
    if (carta.rareza.toLowerCase() === 'mitológica') claseMarco = 'marco-mitologica';

    contenidoFrontal.innerHTML = `
        <div class="carta-tcg ${claseMarco}">
            <div class="carta-encabezado">
                <span class="nombre-texto">${carta.nombre.toUpperCase()}</span>
                <div class="estrellas-contenedor">${estrellasHtml}</div>
            </div>
            <div class="arte-cuadro"><img src="${carta.url_imagen}" alt="Criatura"></div>
            <div class="bloque-stats">
                <p>HÁBITAT: ${carta.habitat.toUpperCase()}</p>
                <p>ATAQUE: ⚔️ ${carta.ataque_nombre.toUpperCase()}</p>
                <div class="fila-valores"><span>HP: ${carta.salud}</span><span>ATK: ${carta.poder}</span></div>
                <p class="texto-lore">"${carta.lore}"</p>
            </div>
            <div class="pie-carta"><span>#${String(carta.id_carta).padStart(4, '0')}</span><span>${carta.rareza.toUpperCase()}</span></div>
        </div>
    `;

    modalVisor.style.display = 'flex';
    setTimeout(() => { if (cartaAnimada) cartaAnimada.classList.add('girar-y-ampliar'); }, 30);
}

// Escucha en tiempo real para actualizaciones automáticas al procesarse el pago
function activarEscuchaColeccionEnVivo() {
    // CORREGIDO: Cambiado 'Coleccion_Usuario' por 'album_usuario'
supabaseClient
    .channel('cambios-album-en-vivo')
    .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'album_usuario', // Nombre real de tu tabla en Supabase
        filter: `id_usuario=eq.${idUsuarioTelegram}` 
    }, (payload) => {

            const nuevaCarta = payload.new;
            inventarioUsuarioCache.set(nuevaCarta.id_carta, nuevaCarta.cantidad);

            const inicioRango = (paginaActual - 1) * cartasPorPagina + 1;
            const finRango = paginaActual * cartasPorPagina;

            if (nuevaCarta.id_carta >= inicioRango && nuevaCarta.id_carta <= finRango) {
                renderizarLibro(paginaActual);
            }
        })
        .subscribe();
}
