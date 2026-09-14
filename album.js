// CONFIGURACIÓN DE CONEXIÓN CON TU SERVIDOR DE SUPABASE
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID del jugador de pruebas (En la Fase 4 lo tomaremos automáticamente desde el Telegram ID)
const USUARIO_ID_MOCK = "usuario_test_venezuela";

let paginaActual = 1;
const cartasPorPagina = 50;

// Caché global en memoria para optimizar la red de Venezuela (Evita lag de carga)
let inventarioUsuarioCache = new Map();

// Vinculación con los objetos de la interfaz
const grillaCartas = document.getElementById('grilla-cartas');
const contadorProgreso = document.getElementById('contador-progreso');
const tituloBloque = document.getElementById('titulo-bloque');
const modalVisor = document.getElementById('modal-visor');
const cartaAnimada = document.getElementById('carta-animada');
const contenidoFrontal = document.getElementById('contenido-carta-frontal');

document.addEventListener("DOMContentLoaded", async () => {
    // 🚀 MEJORA: Descargamos el inventario del usuario UNA SOLA VEZ al abrir la app
    await cargarInventarioInicial();
    
    // Renderizar la primera página con los slots fijos
    renderizarLibro(paginaActual);

    // Navegación interactiva de las páginas del libro
    document.getElementById('btn-anterior').addEventListener('click', () => {
        if (paginaActual > 1) { paginaActual--; renderizarLibro(paginaActual); }
    });
    document.getElementById('btn-siguiente').addEventListener('click', () => {
        if (paginaActual < 40) { paginaActual++; renderizarLibro(paginaActual); } // 40 páginas × 50 = 2000 cartas
    });

    // Cerrar el visor 3D al tocar cualquier parte de la pantalla oscura
    modalVisor.addEventListener('click', () => {
        cartaAnimada.classList.remove('girar-y-ampliar');
        setTimeout(() => { modalVisor.style.display = 'none'; }, 250);
    });
});

// Función para descargar las posesiones del jugador al iniciar
async function cargarInventarioInicial() {
    try {
        const { data, error } = await supabaseClient.from('Coleccion_Usuario')
            .select('id_carta, cantidad')
            .eq('id_usuario', USUARIO_ID_MOCK);
        
        if (error) throw error;
        // Guardamos el mapa en memoria de forma global
        inventarioUsuarioCache = new Map(data.map(i => [i.id_carta, i.cantidad]));
    } catch (err) {
        console.error("Error al cargar inventario del jugador:", err);
    }
}

// Función central dinámica optimizada para grillas de 50 fijas
async function renderizarLibro(pagina) {
    grillaCartas.innerHTML = "<p style='color:#00ff66;font-size:8px;grid-column:span 5;text-align:center;'>ABRIENDO LIBRO...</p>";
    
    const inicioRango = (pagina - 1) * cartasPorPagina + 1;
    const finRango = pagina * cartasPorPagina;

    // Calcular el bloque/era correspondiente para el letrero arcade
    let eraTexto = "ERA 1: COTIDIANOS 🐾";
    if (inicioRango > 500)  eraTexto = "ERA 2: SILVESTRES 🦅";
    if (inicioRango > 1000) eraTexto = "ERA 3: EXTINTOS 🦖";
    if (inicioRango > 1500) eraTexto = "ERA 4: MITOLÓGICOS 🔮";
    tituloBloque.innerText = eraTexto;

    try {
        // Consultar a Supabase ÚNICAMENTE el catálogo de cartas de esta página
        const { data: catalogoCartas, error: errCartas } = await supabaseClient.from('Cartas')
            .select('*')
            .gte('id_carta', inicioRango)
            .lte('id_carta', finRango);

        if (errCartas) throw errCartas;

        // Convertimos el catálogo obtenido en un mapa de consulta rápida
        const mapaCatalogo = new Map(catalogoCartas.map(c => [c.id_carta, c]));
        
        // Actualizar contadores de cabecera
        contadorProgreso.innerText = `PÁG. ${pagina} | RESTRICCIÓN: #${inicioRango}-#${finRango}`;
        grillaCartas.innerHTML = "";

        // 🚀 EL PASO MAESTRO: Forzamos un ciclo rígido de 50 repeticiones exactas por página
        for (let idCarta = inicioRango; idCarta <= finRango; idCarta++) {
            const slot = document.createElement('div');
            slot.classList.add('miniatura-slot');

            // 1. Buscamos si el catálogo de Supabase tiene cargada esta carta
            const datosCarta = mapaCatalogo.get(idCarta);

            // 2. Buscamos si el usuario posee esta carta en su inventario en caché
            const jugadorLaPosee = inventarioUsuarioCache.has(idCarta);

            if (datosCarta && jugadorLaPosee) {
                // CASO A: La carta existe en el juego Y el jugador ya la compró
                slot.innerHTML = `<img src="${datosCarta.url_imagen}" alt="Card">`;
                
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    desplegarCarta3D(datosCarta);
                });
            } else {
                // CASO B: El jugador no la tiene (o la carta aún no se ha creado en la Base de Datos)
                // Se dibuja el slot vacío con el signo "?" respetando la grilla arcade
                slot.classList.add('bloqueada');
                slot.innerHTML = `<span>?</span>`;
            }

            grillaCartas.appendChild(slot);
        }

    } catch (error) {
        console.error("Error crítico de renderizado:", error);
        grillaCartas.innerHTML = "<p style='color:#ff3333;font-size:8px;grid-column:span 5;text-align:center;'>ERROR DE CONEXIÓN</p>";
    }
}

// Mecánica visual adictiva: Fusión de Capas, Marcos y Estrellas Doradas
function desplegarCarta3D(carta) {
    const numeroEstrellas = Math.min(Math.max(Math.floor(carta.poder / 100), 1), 5);
    let estrellasHtml = "";
    for (let i = 0; i < numeroEstrellas; i++) {
        estrellasHtml += "<span class='estrella-oro'>★</span>";
    }

    let claseMarco = `marco-${carta.tipo.trim().toLowerCase()}`;
    if (carta.rareza.toLowerCase() === 'mitológica') {
        claseMarco = 'marco-mitologica'; // Activa el filtro arcoíris animado
    }

    contenidoFrontal.innerHTML = `
        <div class="carta-tcg ${claseMarco}">
            <div class="carta-encabezado">
                <span class="nombre-texto">${carta.nombre.toUpperCase()}</span>
                <div class="estrellas-contenedor">${estrellasHtml}</div>
            </div>
            
            <div class="arte-cuadro">
                <img src="${carta.url_imagen}" alt="Criatura">
            </div>

            <div class="bloque-stats">
                <p>HÁBITAT: ${carta.habitat.toUpperCase()}</p>
                <p>ATAQUE: ⚔️ ${carta.ataque_nombre.toUpperCase()}</p>
                <div class="fila-valores">
                    <span>HP: ${carta.salud}</span>
                    <span>ATK: ${carta.poder}</span>
                </div>
                <p class="texto-lore">"${carta.lore}"</p>
            </div>
            
            <div class="pie-carta">
                <span>#${String(carta.id_carta).padStart(4, '0')}</span>
                <span>${carta.rareza.toUpperCase()}</span>
            </div>
        </div>
    `;

    modalVisor.style.display = 'flex';
    setTimeout(() => {
        cartaAnimada.classList.add('girar-y-ampliar');
    }, 30);
}
// =============================================================================
// 🛰️ MOTOR EN TIEMPO REAL: ACTUALIZACIÓN AUTOMÁTICA AL APROBARSE EL PAGO
// =============================================================================

function activarEscuchaColeccionEnVivo() {
    console.log("📡 Sincronizando canal de escucha en tiempo real con Supabase...");

    // Nos suscribimos a los cambios de la tabla 'Coleccion_Usuario' para este jugador
    supabaseClient
        .channel('cambios-album-en-vivo')
        .on(
            'postgres_changes', 
            { 
                event: 'INSERT', // Escucha solo cuando se añade una nueva barajita comprada
                schema: 'public', 
                table: 'Coleccion_Usuario',
                filter: `id_usuario=eq.${USUARIO_ID_MOCK}` // Filtra para que solo afecte a este jugador
            }, 
            (payload) => {
                // 1. Extraemos los datos de la barajita recién aprobada
                const nuevaCarta = payload.new;
                console.log(`🎁 ¡Nueva barajita detectada en tu cuenta! ID: ${nuevaCarta.id_carta}`);

                // 2. Inyectamos la carta en nuestra lista en memoria para que el sistema sepa que ya la posee
                inventarioUsuarioCache.set(nuevaCarta.id_carta, nuevaCarta.cantidad);

                // 3. Verificamos si la barajita pertenece a la página que el usuario está viendo actualmente
                const inicioRango = (paginaActual - 1) * cartasPorPagina + 1;
                const finRango = paginaActual * cartasPorPagina;

                if (nuevaCarta.id_carta >= inicioRango && nuevaCarta.id_carta <= finRango) {
                    // 🚀 ¡La carta está en esta página! Forzamos el rediseño instantáneo de la grilla
                    console.log("✨ Actualizando ranura visual en la cuadrícula...");
                    renderizarLibro(paginaActual);
                }
                
                // Opcional: Actualizar el marcador de progreso global aquí si lo deseas
            }
        )
        .subscribe();
}

// 🎯 ACTIVACIÓN AUTOMÁTICA AL INICIAR EL JUEGO
// Modifica tu bloque 'DOMContentLoaded' existente para que llame a esta función al final:
document.addEventListener("DOMContentLoaded", async () => {
    await cargarInventarioInicial();
    renderizarLibro(paginaActual);
    
    // ENCENDEMOS EL MOTOR EN VIVO:
    activarEscuchaColeccionEnVivo();

    // (Tus códigos de escucha de botones btn-anterior y btn-siguiente se mantienen igual)
});
