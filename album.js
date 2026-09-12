// CONFIGURACIÓN DE CONEXIÓN CON TU SERVIDOR DE SUPABASE
const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "SUPABASE_SERVICE_ROLE_KEY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID del jugador de pruebas (En la Fase 4 lo tomaremos automáticamente desde el Telegram ID)
const USUARIO_ID_MOCK = "usuario_test_venezuela";

let paginaActual = 1;
const cartasPorPagina = 50;

// Vinculación con los objetos de la interfaz
const grillaCartas = document.getElementById('grilla-cartas');
const contadorProgreso = document.getElementById('contador-progreso');
const tituloBloque = document.getElementById('titulo-bloque');
const modalVisor = document.getElementById('modal-visor');
const cartaAnimada = document.getElementById('carta-animada');
const contenidoFrontal = document.getElementById('contenido-carta-frontal');

document.addEventListener("DOMContentLoaded", () => {
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

// Función central dinámica
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
        // 1. Consultar a Supabase las 50 cartas que corresponden a esta página del libro
       const { data: catalogoCartas, error: errCartas } = await supabaseClient.from('Cartas')
            .select('*')
            .gte('id_carta', inicioRango)
            .lte('id_carta', finRango)
            .order('id_carta', { ascending: true });

        if (errCartas) throw errCartas;

       // 2. Consultar cuáles de esas cartas posee el usuario actual en su cuenta
       const { data: inventarioUsuario, error: errInventario } = await supabaseClient.from('Coleccion_Usuario')
            .select('id_carta, cantidad')
            .eq('id_usuario', USUARIO_ID_MOCK);
       
        if (errInventario) throw errInventario;

        // Crear una estructura de mapa rápido en memoria para cruzar los datos en un milisegundo
        const mapaPosesiones = new Map(inventarioUsuario.map(i => [i.id_carta, i.cantidad]));
        
        // Actualizar contadores de cabecera
        contadorProgreso.innerText = `PÁG. ${pagina} | RESTRICCIÓN: #${inicioRango}-#${finRango}`;
        grillaCartas.innerHTML = "";

        // 3. Pintar los 50 slots uno a uno
        catalogoCartas.forEach(carta => {
            const slot = document.createElement('div');
            slot.classList.add('miniatura-slot');

            if (mapaPosesiones.has(carta.id_carta)) {
                // EL JUGADOR LA TIENE: Se inyecta la imagen a color
                slot.innerHTML = `<img src="${carta.url_imagen}" alt="Card">`;
                
                // Al tocar la miniatura, se dispara el visor 3D elástico
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    desplegarCarta3D(carta);
                });
            } else {
                // SHADOW LOCK: El jugador no la tiene. Silueta negra con incógnita
                slot.classList.add('bloqueada');
                slot.innerHTML = `<span>?</span>`;
            }

            grillaCartas.appendChild(slot);
        });

    } catch (error) {
        console.error("Error crítico de renderizado:", error);
        grillaCartas.innerHTML = "<p style='color:#ff3333;font-size:8px;grid-column:span 5;text-align:center;'>ERROR DE CONEXIÓN</p>";
    }
}

// 4. Mecánica visual adictiva: Fusión de Capas, Marcos y Estrellas Doradas
function desplegarCarta3D(carta) {
    // Calcular estrellas dinámicamente según su poder de ataque (1 estrella por cada 100 ptos, máx 5)
    const numeroEstrellas = Math.min(Math.max(Math.floor(carta.poder / 100), 1), 5);
    let estrellasHtml = "";
    for (let i = 0; i < numeroEstrellas; i++) {
        estrellasHtml += "<span class='estrella-oro'>★</span>";
    }

    // Determinar qué clase de marco aplicar según el tipo/rareza de tu diseño P2P
    let claseMarco = `marco-${carta.tipo.trim().toLowerCase()}`;
    if (carta.rareza.toLowerCase() === 'mitológica') {
        claseMarco = 'marco-mitologica'; // Activa el filtro arcoíris animado
    }

    // Maquetar la cara frontal cruzando los datos de Supabase con tus estilos de capas
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

    // Abrir modal y disparar la animación elástica
    modalVisor.style.display = 'flex';
    setTimeout(() => {
        cartaAnimada.classList.add('girar-y-ampliar');
    }, 30);
}
