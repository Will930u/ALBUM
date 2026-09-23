// Configuración de la aplicación y ciclo de vida del Canvas
const CONFIG = {
    TOTAL_CARTAS: 2000,
    CARTAS_POR_PAGINA: 25,
    ANCHO_CANVAS_BASE: 240,
    ALTO_CANVAS_BASE: 320
};

let paginaActual = 1;
const totalPaginas = Math.ceil(CONFIG.TOTAL_CARTAS / CONFIG.CARTAS_POR_PAGINA);

function iniciarApp() {
    const portada = document.getElementById('pantalla-portada');
    if (portada) {
        portada.classList.add('oculto');
    }
    inicializarTelegramUser();
    renderizarPagina(paginaActual);
}

function inicializarTelegramUser() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        const user = tg.initDataUnsafe?.user;
        if (user) {
            document.getElementById('user-username').textContent = user.username ? `@${user.username}` : '@Anonimo';
            document.getElementById('user-fullname').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Jugador';
            if (user.photo_url) {
                document.getElementById('user-avatar').src = user.photo_url;
            }
        }
    }
}

/**
 * Genera un dataURL de imagen en Pixel Art asegurando que el suavizado esté desactivado
 * tanto al crear como al exportar.
 */
function generarBarajitaCanvas(idCarta, esPoseida) {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.ANCHO_CANVAS_BASE;
    canvas.height = CONFIG.ALTO_CANVAS_BASE;
    const ctx = canvas.getContext('2d');

    // REGLA CRÍTICA: Desactivar suavizado para evitar pixelado borroso al guardar o renderizar
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Fondo
    ctx.fillStyle = esPoseida ? '#090a14' : '#030408';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde Neón
    ctx.strokeStyle = esPoseida ? '#00f3ff' : '#1e293b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    // Arte Pixel Art interno básico
    const seed = idCarta * 12345;
    const colorPrimario = esPoseida ? `hsl(${seed % 360}, 100%, 50%)` : '#334155';
    ctx.fillStyle = colorPrimario;

    const tamanoPixel = 16;
    for (let x = 30; x < canvas.width - 30; x += tamanoPixel) {
        for (let y = 40; y < canvas.height - 80; y += tamanoPixel) {
            if ((x + y + seed) % 3 === 0) {
                ctx.fillRect(x, y, tamanoPixel, tamanoPixel);
            }
        }
    }

    // Texto de ID
    ctx.fillStyle = esPoseida ? '#ffffff' : '#64748b';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Nº ${String(idCarta).padStart(4, '0')}`, canvas.width / 2, canvas.height - 30);

    return canvas.toDataURL('image/png');
}

function renderizarPagina(pagina) {
    const grilla = document.getElementById('grilla-cartas');
    if (!grilla) return;

    grilla.innerHTML = '';
    const inicio = (pagina - 1) * CONFIG.CARTAS_POR_PAGINA + 1;
    const fin = Math.min(pagina * CONFIG.CARTAS_POR_PAGINA, CONFIG.TOTAL_CARTAS);

    for (let i = inicio; i <= fin; i++) {
        // Ejemplo: Simular poseídas las cartas pares para pruebas
        const esPoseida = i % 2 === 0;
        const slot = document.createElement('div');
        slot.className = `miniatura-slot ${esPoseida ? 'poseida' : ''}`;

        if (esPoseida) {
            const imgData = generarBarajitaCanvas(i, true);
            const img = document.createElement('img');
            img.src = imgData;
            img.alt = `Carta ${i}`;
            
            const badge = document.createElement('div');
            badge.className = 'badge-cantidad';
            badge.textContent = 'x1';

            slot.appendChild(img);
            slot.appendChild(badge);
            slot.onclick = () => abrirVisor(i, imgData);
        } else {
            slot.textContent = String(i).padStart(4, '0');
        }

        grilla.appendChild(slot);
    }

    document.getElementById('indicador-pagina').textContent = `PÁGINA ${pagina}/${totalPaginas}`;
}

function abrirVisor(idCarta, imgSrc) {
    const modal = document.getElementById('modal-visor');
    const contenedor = document.getElementById('contenido-carta-frontal');
    
    contenedor.innerHTML = `
        <img src="${imgSrc}" style="width: 100%; height: auto; display: block; border-radius: 6px;">
        <div style="margin-top: 10px; text-align: center;">
            <p style="font-size: 8px; color: #00f3ff; margin-bottom: 8px;">CARTA #${String(idCarta).padStart(4, '0')}</p>
            <button class="btn-retro" onclick="cerrarVisor()">CERRAR</button>
        </div>
    `;
    modal.style.display = 'flex';
}

function cerrarVisor() {
    document.getElementById('modal-visor').style.display = 'none';
}

document.getElementById('btn-anterior')?.addEventListener('click', () => {
    if (paginaActual > 1) {
        paginaActual--;
        renderizarPagina(paginaActual);
    }
});

document.getElementById('btn-siguiente')?.addEventListener('click', () => {
    if (paginaActual < totalPaginas) {
        paginaActual++;
        renderizarPagina(paginaActual);
    }
});
