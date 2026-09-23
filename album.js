// =============================================================================
// 💻 CONTROLADOR DEL ÁLBUM DIGITAL - ANIMACIONES FACIALES Y CORPORALES AVANZADAS
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const GAS_BACKEND_URL = "https://script.google.com/macros/s/AKfycbyi8o0jE_x_xY/exec";

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

let paginaActual = 1;
const cartasPorPagina = 25;
const totalPaginas = 80;

let inventarioUsuarioCache = new Map();
let canvasAnimados = []; // Registro activo de Canvas con bucles de animación

// Rangos Oficiales de Premios
const RANGOS_PREMIOS = [
    { nivel: 1, inicio: 1, fin: 500, nombre: "1er Premio ($200 Tasa BCV)" },
    { nivel: 2, inicio: 501, fin: 1000, nombre: "2do Premio ($200 Tasa BCV)" },
    { nivel: 3, inicio: 1001, fin: 1500, nombre: "3er Premio ($200 Tasa BCV)" },
    { nivel: 4, inicio: 1501, fin: 2000, nombre: "4to Premio ($200 Tasa BCV)" }
];

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

    // Iniciar bucle global de animación Canvas avanzado
    iniciarBucleAnimacionGlobal();
});

function inicializarUsuarioTelegram() {
    const uName = document.getElementById('user-username');
    const fName = document.getElementById('user-fullname');
    const avatar = document.getElementById('user-avatar');

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        idUsuarioTelegram = user.username 
            ? user.username.replace(/^@/, '').trim().toLowerCase() 
            : (user.id ? user.id.toString().trim() : "utrera930");

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

async function cargarInventarioInicial() {
    try {
        if (!supabaseClient || !idUsuarioTelegram) return;

        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase();
        
        let { data: coleccion, error: errColeccion } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`);

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
                            datosCarta: infoCarta || { id: idCartaNum, nombre: `Cyber # ${idCartaNum}` }
                        });
                    }
                }
            });
        }

        renderizarLibro(paginaActual);
        
        await verificarProgresoHitosPremios();
        await consultarEstadoPremiosYComprobantes();

    } catch (err) {
        console.error("Excepción en cargarInventarioInicial:", err);
    }
}

async function verificarProgresoHitosPremios() {
    if (!supabaseClient || inventarioUsuarioCache.size === 0) return;

    try {
        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase();

        const { data: reclamados, error } = await supabaseClient
            .from('premios_ganados')
            .select('nivel_premio')
            .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`);

        if (error) {
            console.error("Error verificando premios reclamados:", error.message);
            return;
        }

        const nivelesReclamados = new Set(reclamados ? reclamados.map(r => Number(r.nivel_premio)) : []);

        for (const rango of RANGOS_PREMIOS) {
            if (nivelesReclamados.has(rango.nivel)) continue;

            let incompleto = false;
            for (let id = rango.inicio; id <= rango.fin; id++) {
                if (!inventarioUsuarioCache.has(id)) {
                    incompleto = true;
                    break;
                }
            }

            if (!incompleto) {
                desplegarModalGanadorPremio(rango);
                break;
            }
        }
    } catch (e) {
        console.error("Error evaluando hitos de premios:", e);
    }
}

function desplegarModalGanadorPremio(rango) {
    const modalPremio = document.getElementById('modal-ganador-premio');
    if (!modalPremio) return;

    document.getElementById('premio-titulo-nivel').innerText = rango.nombre;
    document.getElementById('premio-rango-cartas').innerText = `Matriz Completa: Barajita #${rango.inicio} a la #${rango.fin}`;
    document.getElementById('input-premio-nivel').value = rango.nivel;

    modalPremio.style.display = 'flex';
}

async function enviarSolicitudPremio() {
    const nivel = document.getElementById('input-premio-nivel').value;
    const cedula = document.getElementById('input-premio-cedula').value.trim();
    const telefono = document.getElementById('input-premio-telefono').value.trim();
    const banco = document.getElementById('input-premio-banco').value.trim();
    const btnEnviar = document.getElementById('btn-enviar-premio');

    if (!cedula || !telefono || !banco) {
        alert("Por favor completa todos tus datos bancarios (Cédula, Teléfono y Banco).");
        return;
    }

    try {
        btnEnviar.disabled = true;
        btnEnviar.innerText = "PROCESANDO...";

        const payload = {
            action: "claim_milestone_reward",
            usuarioId: idUsuarioTelegram,
            nivelPremio: nivel,
            cedula: cedula,
            telefono: telefono,
            banco: banco
        };

        const res = await fetch(GAS_BACKEND_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            alert("¡Transmisión Exitosa! Tu información de pago se ha enviado correctamente.");
            document.getElementById('modal-ganador-premio').style.display = 'none';
            await cargarInventarioInicial();
        } else {
            alert("Atención: " + data.message);
        }
    } catch (e) {
        alert("Error de comunicación: " + e.toString());
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerText = "ENVIAR Y RECLAMAR PREMIO";
    }
}

async function consultarEstadoPremiosYComprobantes() {
    try {
        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase();

        const { data: premios, error } = await supabaseClient
            .from('premios_ganados')
            .select('*')
            .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`)
            .eq('estado', 'pagado');

        if (error || !premios || premios.length === 0) return;

        const ultimoPagado = premios[premios.length - 1];
        if (ultimoPagado && ultimoPagado.referencia_pago) {
            mostrarComprobantePagoMiniApp(ultimoPagado);
        }
    } catch (e) {
        console.error("Error consultando comprobantes de pago:", e);
    }
}

function mostrarComprobantePagoMiniApp(datosPremio) {
    const modalComprobante = document.getElementById('modal-comprobante-pago');
    if (!modalComprobante) return;

    const rInfo = RANGOS_PREMIOS.find(r => r.nivel === Number(datosPremio.nivel_premio));
    const nombrePremio = rInfo ? rInfo.nombre : `Premio Nivel #${datosPremio.nivel_premio}`;

    document.getElementById('comp-nombre-premio').innerText = nombrePremio;
    document.getElementById('comp-monto-bs').innerText = `${datosPremio.monto_bs || '0.00'} Bs.`;
    document.getElementById('comp-referencia').innerText = datosPremio.referencia_pago || 'N/A';
    document.getElementById('comp-fecha').innerText = datosPremio.fecha_pago ? new Date(datosPremio.fecha_pago).toLocaleString() : 'Recientemente';

    const vistoKey = `premio_visto_${datosPremio.id}_${datosPremio.referencia_pago}`;
    if (!localStorage.getItem(vistoKey)) {
        modalComprobante.style.display = 'flex';
        localStorage.setItem(vistoKey, "true");
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

    canvasAnimados = [];

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

// =============================================================================
// 🎨 MOTOR AVANZADO DE ANIMACIÓN FACIAL Y CORPORAL (DEFORMACIÓN & PARPADEO 2D)
// =============================================================================
function dibujarBarajitaAlgoritmicaSlot(contenedor, datosCarta, idCarta) {
    let config = {};
    let urlImagenReal = "";

    // 1. Extraer la URL / Base64 real de la imagen guardada en la BD
    if (datosCarta?.imagen_base64) {
        urlImagenReal = datosCarta.imagen_base64;
    } else if (typeof datosCarta?.imagen_url === 'string') {
        if (datosCarta.imagen_url.startsWith('data:image') || datosCarta.imagen_url.startsWith('http')) {
            urlImagenReal = datosCarta.imagen_url;
        } else {
            try {
                config = JSON.parse(datosCarta.imagen_url);
                if (config.imagen_base64) urlImagenReal = config.imagen_base64;
                else if (config.imagen_url) urlImagenReal = config.imagen_url;
            } catch (e) {
                config = {};
            }
        }
    } else if (typeof datosCarta?.imagen_url === 'object' && datosCarta?.imagen_url !== null) {
        config = datosCarta.imagen_url;
        urlImagenReal = config.imagen_base64 || config.imagen_url || "";
    }

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.borderRadius = "4px";

    const ctx = canvas.getContext('2d');
    
    let objetoImagen = null;
    let esImagen = false;

    // 2. Si detecta la cadena de la imagen, la carga para renderizar los movimientos
    if (urlImagenReal && (urlImagenReal.startsWith('data:image') || urlImagenReal.startsWith('http'))) {
        esImagen = true;
        objetoImagen = new Image();
        objetoImagen.crossOrigin = "anonymous";
        objetoImagen.src = urlImagenReal;
    }

    canvasAnimados.push({
        canvas: canvas,
        ctx: ctx,
        datosCarta: datosCarta,
        idCarta: idCarta,
        config: config,
        esImagen: esImagen,
        img: objetoImagen
    });

    contenedor.appendChild(canvas);
}
function iniciarBucleAnimacionGlobal() {
    function animar(timestamp) {
        const t = timestamp * 0.0025; // Control de tiempo general

        canvasAnimados.forEach(item => {
            const { canvas, ctx, datosCarta, idCarta, config, esImagen, img } = item;
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Fondo base Neón
            ctx.fillStyle = config.fondoColor || config.colorFondo || "#090a14";
            ctx.fillRect(0, 0, w, h);

            if (esImagen && img && img.complete) {
                ctx.save();

                // 1. GIRO DE CABEZA / INCLINACIÓN CORPORAL (Eje central)
                const anguloGiro = Math.sin(t * 0.8 + idCarta) * 0.05; 
                const traslacionX = Math.cos(t * 0.5 + idCarta) * 2;
                const traslacionY = Math.sin(t * 1.2 + idCarta) * 2;

                ctx.translate(w / 2 + traslacionX, h / 2 + traslacionY);
                ctx.rotate(anguloGiro);

                // Dibujar Cuerpo Principal / Fondo de Personaje
                ctx.drawImage(img, 0, 0, img.width, img.height, -w / 2, -h / 2, w, h);

                // 2. PARPADEO DE OJOS (Recorte y escala vertical acelerada)
                // Se genera un pulso de parpadeo cada cierto intervalo usando senos de alta frecuencia
                const tiempoParpadeo = (t * 1.5 + idCarta) % 4;
                let escalaOjoY = 1;
                if (tiempoParpadeo > 3.7) { 
                    escalaOjoY = Math.abs(Math.cos((tiempoParpadeo - 3.7) * Math.PI * 16.6)); 
                }

                if (escalaOjoY < 0.95) {
                    // Region del ojo (30% a 45% de la altura de la imagen)
                    const ojoSrcY = img.height * 0.30;
                    const ojoSrcH = img.height * 0.15;
                    const ojoDestY = -h / 2 + h * 0.30;
                    const ojoDestH = h * 0.15;

                    ctx.save();
                    ctx.translate(0, ojoDestY + ojoDestH / 2);
                    ctx.scale(1, escalaOjoY); // Compresión Y para cerrar párpado
                    ctx.drawImage(
                        img, 
                        0, ojoSrcY, img.width, ojoSrcH, 
                        -w / 2, -ojoDestH / 2, w, ojoDestH
                    );
                    ctx.restore();
                }

                // 3. MOVIMIENTO DE BOCA (Gesticulación / Habla)
                // Recorte de región bucal (52% a 68% de la altura de la imagen)
                const aperturaBoca = Math.sin(t * 3.5 + idCarta) * 0.12;
                if (aperturaBoca > 0.02) {
                    const bocaSrcY = img.height * 0.52;
                    const bocaSrcH = img.height * 0.16;
                    const bocaDestY = -h / 2 + h * 0.52;
                    const bocaDestH = h * 0.16;

                    ctx.save();
                    ctx.translate(0, bocaDestY + bocaDestH / 2);
                    ctx.scale(1 + aperturaBoca * 0.2, 1 + aperturaBoca); // Deformación rítmica
                    ctx.drawImage(
                        img, 
                        0, bocaSrcY, img.width, bocaSrcH, 
                        -w / 2, -bocaDestH / 2, w, bocaDestH
                    );
                    ctx.restore();
                }

                ctx.restore();

                // Efecto Barrido Holográfico Neón
                const holoGradient = ctx.createLinearGradient(0, (t * 50) % (h * 2) - h, w, (t * 50) % (h * 2));
                holoGradient.addColorStop(0, "rgba(255,0,127,0)");
                holoGradient.addColorStop(0.5, "rgba(0,243,255,0.2)");
                holoGradient.addColorStop(1, "rgba(255,0,127,0)");
                
                ctx.fillStyle = holoGradient;
                ctx.fillRect(0, 0, w, h);

            } else {
                // ANIMACIÓN PIXEL ART: Flotación + Cierre de ojos Pixel
                ctx.save();
                
                const offsetY = Math.sin(t * 1.5 + idCarta) * 4;
                const rotacionPixel = Math.cos(t * 0.8 + idCarta) * 0.08;

                ctx.translate(w / 2, h / 2 - 10 + offsetY);
                ctx.rotate(rotacionPixel);

                ctx.font = "38px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.shadowColor = config.marcoColor || config.colorPrimario || "#00f3ff";
                ctx.shadowBlur = 10 + Math.sin(t * 2) * 5;

                ctx.fillText(config.simbolo || "👾", 0, 0);
                ctx.restore();
            }

            // MARCO NEÓN CON PULSACIÓN DE BORDE
            ctx.strokeStyle = config.marcoColor || config.colorPrimario || "#00f3ff";
            ctx.lineWidth = 4 + Math.sin(t * 2 + idCarta) * 2;
            ctx.strokeRect(2, 2, w - 4, h - 4);

            // ZÓCALO DE IDENTIFICACIÓN CYBER
            ctx.fillStyle = "rgba(5, 5, 12, 0.85)";
            ctx.fillRect(4, h - 26, w - 8, 22);

            ctx.fillStyle = "#00f3ff";
            ctx.font = "6px 'Press Start 2P', monospace";
            ctx.textAlign = "center";
            const nombreVisual = datosCarta?.nombre || `CYBER #${idCarta}`;
            ctx.fillText(nombreVisual.substring(0, 10), w / 2, h - 12);
        });

        requestAnimationFrame(animar);
    }

    requestAnimationFrame(animar);
}

function desplegarVisor(datosCarta, idCarta, cantidad) {
    const modalVisor = document.getElementById('modal-visor');
    const contenidoFrontal = document.getElementById('contenido-carta-frontal');
    if (!modalVisor || !contenidoFrontal) return;

    const nombre = datosCarta?.nombre || `CYBER #${idCarta}`;
    const rareza = datosCarta?.rareza || 'Común';
    const lore = datosCarta?.lore || 'Sin datos de archivos disponibles.';

    let config = {};
    try {
        config = typeof datosCarta?.imagen_url === 'string' ? JSON.parse(datosCarta.imagen_url) : (datosCarta?.imagen_url || {});
    } catch(e){}

    const colorFondo = config.fondoColor || config.colorFondo || '#090a14';
    const colorMarco = config.marcoColor || config.colorPrimario || '#00f3ff';
    const simbolo = config.simbolo || '👾';

    // Obtener imagen guardada
    const imagenSrc = datosCarta?.imagen_base64 || config.imagen_base64 || (typeof datosCarta?.imagen_url === 'string' && datosCarta.imagen_url.startsWith('data:') ? datosCarta.imagen_url : null);

    const elementoVisual = imagenSrc 
        ? `<img src="${imagenSrc}" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" />` 
        : simbolo;

    contenidoFrontal.innerHTML = `
        <div style="text-align:center;">
            <h3 style="font-size:10px; color:#00f3ff; margin-bottom:8px; text-shadow:0 0 5px #00f3ff;">${nombre.toUpperCase()}</h3>
            <div style="width:180px; height:230px; margin: 0 auto 10px auto; background:${colorFondo}; border:3px solid ${colorMarco}; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:70px; box-shadow:0 0 15px ${colorMarco}; overflow:hidden;">
                ${elementoVisual}
            </div>
            <p style="font-size:7px; color:#ff007f; margin-bottom:4px; text-shadow:0 0 3px #ff007f;">Rareza: ${rareza} | Copias: ${cantidad}</p>
            <p style="font-size:6px; color:#a5b4fc; margin-bottom:8px; line-height:1.3;">${lore}</p>
            <p style="font-size:7px; color:#64748b;">#${String(idCarta).padStart(4, '0')}</p>
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

                const esMio = uId === usuarioLimpio || uId === `@${usuarioLimpio}`;

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
        background: #00f3ff;
        color: #000;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 0 15px #00f3ff;
        z-index: 9999;
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
    `;
    toast.innerText = `🎉 ¡DATOS RECIBIDOS! (ID: #${datosNuevos?.carta_id || ''})`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}
