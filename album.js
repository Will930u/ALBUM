// =============================================================================
// 💻 CONTROLADOR DEL ÁLBUM DIGITAL - RENDERIZADO DE CARTAS Y ADMIN
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const GAS_BACKEND_URL = "https://script.google.com/macros/s/AKfycbyi8o0jE_x_xY/exec";

// =============================================================================
// 🚀 CONTROL DE PANTALLA DE PORTADA (SPLASH SCREEN)
// =============================================================================

function iniciarApp() {
    const portada = document.getElementById('pantalla-portada');
    if (portada) {
        portada.classList.add('oculto');
    }
}

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
const TOTAL_CARTAS = 2000;

let inventarioUsuarioCache = new Map();
let canvasAnimados = []; // Registro activo de Canvas con bucles de animación

// Constantes de valor por barajita (con el 31.8% de descuento ya aplicado)
const VALOR_UNITARIO_BS = 341;
const VALOR_UNITARIO_USD = 0.4223;

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

    // Iniciar bucle global de animación Canvas
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
        verificarYCelebrarCompletado(inventarioUsuarioCache.size);

    } catch (err) {
        console.error("Excepción en cargarInventarioInicial:", err);
    }
}

function verificarYCelebrarCompletado(totalCartasPoseidas) {
    if (totalCartasPoseidas >= TOTAL_CARTAS) {
        const modalCompletado = document.getElementById('modal-album-completado');
        if (modalCompletado) {
            modalCompletado.style.display = 'flex';
        }
    }
}

async function reiniciarAlbumUsuario() {
    try {
        const modalCompletado = document.getElementById('modal-album-completado');
        if (modalCompletado) modalCompletado.style.display = 'none';

        if (!supabaseClient || !idUsuarioTelegram) return;

        const idLimpio = idUsuarioTelegram.replace(/^@/, '').trim().toLowerCase();

        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .delete()
            .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`);

        if (error) {
            console.error("Error al reiniciar álbum en Supabase:", error.message);
            alert("Ocurrió un error al reiniciar la matriz de colección.");
            return;
        }

        inventarioUsuarioCache.clear();
        paginaActual = 1;
        renderizarLibro(paginaActual);

        alert("¡Matriz Reiniciada Exitosamente! Un nuevo comienzo ha iniciado.");
    } catch (e) {
        console.error("Error en reiniciarAlbumUsuario:", e);
        alert("Ocurrió un fallo en la conexión al intentar reiniciar.");
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
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
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
        console.warn("Aviso de red durante el envío:", e);
        alert("¡Solicitud enviada a la matriz! Si la información es correcta, tu pago será procesado pronto.");
        document.getElementById('modal-ganador-premio').style.display = 'none';
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

    const elUsd = document.getElementById('valor-usd');
    const elBs = document.getElementById('valor-bs');
    if (elUsd) elUsd.innerText = `USD: $${(poseidasTotales * VALOR_UNITARIO_USD).toFixed(2)}`;
    if (elBs) elBs.innerText = `BS: ${(poseidasTotales * VALOR_UNITARIO_BS).toLocaleString('es-VE')}`;

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
// 🎨 MOTOR DE EXTRACCIÓN Y GENERACIÓN PROCEDURAL COMPLETA
// =============================================================================

function generarPersonajeProceduralAutomatico(idCarta) {
    // Alternancia estricta de género: Cartas pares femeninas, impares masculinas
    const esFemenino = (Number(idCarta) % 2 === 0);

    const fondos = ['cyberpunk', 'matrix', 'sunset', 'neon_grid', 'deep_space', 'city_night'];
    const ojosColores = ['#00f3ff', '#ff007f', '#a855f7', '#22c55e', '#eab308', '#3b82f6'];
    
    const cabellosColores = [
        { base: '#3b82f6', shadow: '#1d4ed8', highlight: '#93c5fd' },
        { base: '#ec4899', shadow: '#be185d', highlight: '#fbcfe8' },
        { base: '#a855f7', shadow: '#6b21a8', highlight: '#e9d5ff' },
        { base: '#10b981', shadow: '#047857', highlight: '#a7f3d0' },
        { base: '#f59e0b', shadow: '#b45309', highlight: '#fde68a' },
        { base: '#64748b', shadow: '#334155', highlight: '#cbd5e1' }
    ];

    // Vestuarios
    const trajesFemeninos = ['dress_cyber', 'top_skirt', 'kimono'];
    const trajesMasculinos = ['cyber_suit', 'casual_jacket', 'sport_hoodie', 'sport_sleeveless'];

    // Peinados Femeninos (Juveniles) y Masculinos
    const peinadosFemeninos = ['twin_buns', 'single_bun', 'long_hair'];
    const peinadosMasculinos = ['spiky', 'short_crop', 'undercut'];

    // Decoraciones (Corazones/Estrellas para femeninas, destellos/ninguno para masculinos)
    const decoracionesFemeninas = ['hearts', 'stars', 'sparks'];
    const decoracionesMasculinas = ['sparks', 'none'];

    const bgType = fondos[idCarta % fondos.length];
    const eyeColor = ojosColores[idCarta % ojosColores.length];
    const hair = cabellosColores[idCarta % cabellosColores.length];

    const clothType = esFemenino 
        ? trajesFemeninos[idCarta % trajesFemeninos.length] 
        : trajesMasculinos[idCarta % trajesMasculinos.length];

    const hairStyle = esFemenino 
        ? peinadosFemeninos[idCarta % peinadosFemeninos.length] 
        : peinadosMasculinos[idCarta % peinadosMasculinos.length];

    const decor = esFemenino 
        ? decoracionesFemeninas[idCarta % decoracionesFemeninas.length] 
        : decoracionesMasculinas[idCarta % decoracionesMasculinas.length];

    // Expresión: Risas, sonrisas o serio
    const expresion = (idCarta % 3 === 0) ? 'laughing' : ((idCarta % 2 === 0) ? 'smiling' : 'serious');

    return {
        gender: esFemenino ? 'female' : 'male',
        bgType: bgType,
        eyeColor: eyeColor,
        hair: hair,
        hairStyle: hairStyle,
        skin: { base: esFemenino ? '#ffe4e1' : '#ffe0bd', shadow: esFemenino ? '#f3a6a1' : '#d4a373' },
        clothType: clothType,
        clothColor: esFemenino ? '#831843' : '#1e1b4b',
        clothDetail: esFemenino ? '#ff007f' : '#00f3ff',
        expression: expresion,
        decoration: decor,
        accessory: (idCarta % 5 === 0) ? 'glasses' : 'none'
    };
}

function extraerAtributosCarta(datosCarta, idCarta = 1) {
    let config = {};
    let urlImagen = "";
    let personajeData = null;

    if (!datosCarta) {
        return { 
            config, 
            urlImagen: "", 
            personajeData: generarPersonajeProceduralAutomatico(idCarta), 
            fondoColor: "#090a14", 
            marcoColor: "#00f3ff" 
        };
    }

    const rawImagen = datosCarta.imagen_url || datosCarta.imagen_base64 || datosCarta.imagen || "";

    if (typeof rawImagen === 'object' && rawImagen !== null) {
        config = rawImagen;
        personajeData = config.personajeData || config.personaje || null;
        urlImagen = config.imagen_base64 || config.imagen_url || config.imagen || config.src || "";
    } else if (typeof rawImagen === 'string') {
        const str = rawImagen.trim();

        if (str.startsWith('{')) {
            try {
                config = JSON.parse(str);
                personajeData = config.personajeData || config.personaje || null;
                urlImagen = config.imagen_base64 || config.imagen_url || config.imagen || config.src || "";
            } catch (e) {
                config = {};
            }
        } else if (str.startsWith('http') || str.startsWith('data:image')) {
            urlImagen = str;
        } else if (str.length > 30) {
            urlImagen = `data:image/png;base64,${str}`;
        }
    }

    if (urlImagen && !urlImagen.startsWith('http') && !urlImagen.startsWith('data:image')) {
        urlImagen = `data:image/png;base64,${urlImagen}`;
    }

    // Forzar la regeneración procedural si el objeto carece de datos válidos de personaje
    if (!personajeData || typeof personajeData !== 'object' || !personajeData.gender) {
        personajeData = generarPersonajeProceduralAutomatico(idCarta);
    }

    return {
        config: config,
        urlImagen: urlImagen,
        personajeData: personajeData,
        fondoColor: config.fondoColor || config.colorFondo || datosCarta.fondoColor || "#090a14",
        marcoColor: config.marcoColor || config.colorPrimario || datosCarta.marcoColor || "#00f3ff"
    };
}

// =============================================================================
// 👾 MOTOR PROCEDURAL DE PIXEL ART AVANZADO (EXPRESIONES, PEINADOS Y DECORACIÓN)
// =============================================================================

function drawAnimeBackground(ctx, bgType, width = 32, height = 32) {
    if (bgType === 'cyberpunk') {
        let grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f051d');
        grad.addColorStop(0.6, '#290a59');
        grad.addColorStop(1, '#ff0055');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
        for (let i = 0; i < width; i += 4) {
            ctx.fillRect(i, 0, 1, height);
        }
    } else if (bgType === 'matrix') {
        ctx.fillStyle = '#020d08';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#00ff66';
        for (let i = 0; i < 12; i++) {
            let rx = Math.floor((Math.sin(i * 99) * 0.5 + 0.5) * width);
            let ry = Math.floor((Math.cos(i * 33) * 0.5 + 0.5) * height);
            ctx.globalAlpha = (i % 3 === 0) ? 0.8 : 0.3;
            ctx.fillRect(rx, ry, 1, 2);
        }
        ctx.globalAlpha = 1.0;
    } else if (bgType === 'sunset') {
        let grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#2d0b3f');
        grad.addColorStop(0.5, '#7b1e5a');
        grad.addColorStop(0.8, '#e65c40');
        grad.addColorStop(1, '#f7b05b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'neon_grid') {
        ctx.fillStyle = '#050515';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ff007f';
        for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
        ctx.fillStyle = '#00f3ff';
        for (let x = 0; x < width; x += 4) ctx.fillRect(x, 0, 1, height);
    } else if (bgType === 'deep_space') {
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 15; i++) {
            let sx = (i * 7) % width;
            let sy = (i * 13) % height;
            ctx.fillRect(sx, sy, 1, 1);
        }
    } else {
        let grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#111827');
        grad.addColorStop(1, '#1f2937');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }
}

function renderAnimeCharacterPixelArt(ctx, data, time, blinking) {
    if (!ctx || !data) return;

    const gender = data.gender || 'male';
    const bgType = data.bgType || 'cyberpunk';
    drawAnimeBackground(ctx, bgType, 32, 32);

    const skinBase = data.skin?.base || (gender === 'female' ? '#ffe4e1' : '#ffe0bd');
    const skinShadow = data.skin?.shadow || (gender === 'female' ? '#f3a6a1' : '#d4a373');
    const hairBase = data.hair?.base || '#3b82f6';
    const hairHighlight = data.hair?.highlight || '#93c5fd';
    const eyeColor = data.eyeColor || '#2563eb';
    const clothBase = data.clothColor || '#1e1b4b';
    const clothDetail = data.clothDetail || '#3b82f6';
    const clothType = data.clothType || (gender === 'female' ? 'dress_cyber' : 'cyber_suit');
    const hairStyle = data.hairStyle || (gender === 'female' ? 'twin_buns' : 'spiky');
    const expression = data.expression || 'smiling';
    const decoration = data.decoration || 'none';

    // 1. DECORACIONES DE FONDO (CORAZONES / ESTRELLAS / SPARKS)
    if (decoration === 'hearts' && gender === 'female') {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(3, 4, 3, 2); ctx.fillRect(2, 5, 5, 2); ctx.fillRect(3, 7, 3, 1); ctx.fillRect(4, 8, 1, 1);
        ctx.fillRect(25, 6, 3, 2); ctx.fillRect(24, 7, 5, 2); ctx.fillRect(25, 9, 3, 1); ctx.fillRect(26, 10, 1, 1);
    } else if (decoration === 'stars' && gender === 'female') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(4, 5, 1, 3); ctx.fillRect(3, 6, 3, 1);
        ctx.fillRect(26, 8, 1, 3); ctx.fillRect(25, 9, 3, 1);
    } else if (decoration === 'sparks') {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(5, 5, 1, 1); ctx.fillRect(26, 6, 1, 1); ctx.fillRect(4, 18, 1, 1);
    }

    // 2. VESTUARIO EXCLUSIVO SEGÚN GÉNERO
    ctx.fillStyle = clothBase;
    ctx.fillRect(8, 22, 16, 10);

    if (gender === 'female') {
        if (clothType === 'dress_cyber') {
            ctx.fillStyle = clothDetail;
            ctx.fillRect(10, 22, 12, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(13, 22, 6, 2);
        } else if (clothType === 'top_skirt') {
            ctx.fillStyle = clothDetail;
            ctx.fillRect(11, 22, 10, 4);
            ctx.fillStyle = '#111827';
            ctx.fillRect(10, 26, 12, 6);
        } else {
            ctx.fillStyle = clothDetail;
            ctx.fillRect(10, 22, 12, 10);
            ctx.fillRect(14, 22, 4, 3);
        }
    } else {
        if (clothType === 'cyber_suit') {
            ctx.fillStyle = clothDetail;
            ctx.fillRect(11, 22, 10, 10);
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(15, 23, 2, 8);
        } else if (clothType === 'sport_hoodie') {
            ctx.fillStyle = clothDetail;
            ctx.fillRect(9, 22, 14, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(12, 22, 8, 4);
        } else if (clothType === 'sport_sleeveless') {
            ctx.fillStyle = skinBase;
            ctx.fillRect(8, 22, 3, 10); ctx.fillRect(21, 22, 3, 10);
            ctx.fillStyle = clothDetail;
            ctx.fillRect(11, 22, 10, 10);
        } else {
            ctx.fillStyle = clothDetail;
            ctx.fillRect(10, 22, 12, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(14, 22, 4, 4);
        }
    }

    // 3. CUELLO Y ROSTRO (Femenino más estilizado / Masculino más firme)
    ctx.fillStyle = skinShadow;
    ctx.fillRect(13, 19, 6, 3);

    ctx.fillStyle = skinBase;
    ctx.fillRect(11, 10, 10, 10);

    if (gender === 'female') {
        ctx.fillStyle = skinShadow;
        ctx.fillRect(11, 19, 1, 1); ctx.fillRect(20, 19, 1, 1);
        ctx.fillRect(13, 20, 6, 1);
    } else {
        ctx.fillStyle = skinShadow;
        ctx.fillRect(10, 18, 1, 3); ctx.fillRect(21, 18, 1, 3);
        ctx.fillRect(12, 20, 8, 1);
    }

    // 4. OJOS Y EXPRESIONES
    if (!blinking) {
        if (expression === 'laughing') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(12, 13, 3, 1); ctx.fillRect(11, 14, 1, 1); ctx.fillRect(15, 14, 1, 1);
            ctx.fillRect(17, 13, 3, 1); ctx.fillRect(16, 14, 1, 1); ctx.fillRect(20, 14, 1, 1);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(12, 13, 3, 4); ctx.fillRect(17, 13, 3, 4);

            ctx.fillStyle = eyeColor;
            ctx.fillRect(13, 14, 2, 3); ctx.fillRect(17, 14, 2, 3);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(14, 13, 1, 1); ctx.fillRect(18, 13, 1, 1);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(12, 13, 3, 1); ctx.fillRect(17, 13, 3, 1);

            if (gender === 'female') {
                ctx.fillRect(11, 13, 1, 2); ctx.fillRect(20, 13, 1, 2);
            }
        }
    } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, 15, 3, 1); ctx.fillRect(17, 15, 3, 1);
    }

    // BOCA Y RISA
    if (expression === 'laughing') {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(14, 17, 4, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 17, 4, 1);
    } else if (expression === 'smiling') {
        ctx.fillStyle = gender === 'female' ? '#ff0055' : '#b91c1c';
        ctx.fillRect(14, 18, 4, 1); ctx.fillRect(13, 17, 1, 1); ctx.fillRect(18, 17, 1, 1);
    } else {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(14, 18, 4, 1);
    }

    // 5. PEINADOS POR GÉNERO
    ctx.fillStyle = hairBase;

    if (gender === 'female') {
        if (hairStyle === 'twin_buns') {
            ctx.fillRect(6, 4, 5, 5); ctx.fillRect(21, 4, 5, 5);
            ctx.fillRect(9, 6, 14, 5);
            ctx.fillRect(8, 10, 3, 10); ctx.fillRect(21, 10, 3, 10);
        } else if (hairStyle === 'single_bun') {
            ctx.fillRect(13, 3, 6, 5);
            ctx.fillRect(9, 7, 14, 5);
            ctx.fillRect(8, 10, 3, 8); ctx.fillRect(21, 10, 3, 8);
        } else {
            ctx.fillRect(8, 6, 16, 6);
            ctx.fillRect(7, 11, 4, 11); ctx.fillRect(21, 11, 4, 11);
        }
    } else {
        if (hairStyle === 'spiky') {
            ctx.fillRect(9, 6, 14, 5); ctx.fillRect(11, 4, 3, 3); ctx.fillRect(17, 4, 3, 3);
            ctx.fillRect(8, 10, 3, 7); ctx.fillRect(21, 10, 3, 7);
        } else if (hairStyle === 'short_crop') {
            ctx.fillRect(9, 7, 14, 5);
            ctx.fillRect(9, 10, 2, 5); ctx.fillRect(21, 10, 2, 5);
        } else {
            ctx.fillRect(8, 6, 16, 6);
            ctx.fillRect(8, 10, 3, 6); ctx.fillRect(21, 10, 3, 6);
        }
    }

    ctx.fillStyle = hairHighlight;
    ctx.fillRect(11, 7, 4, 1); ctx.fillRect(17, 7, 4, 1);

    // 6. ACCESORIOS
    if (data.accessory === 'glasses') {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(11, 13, 4, 3); ctx.fillRect(17, 13, 4, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 14, 1, 1); ctx.fillRect(18, 14, 1, 1);
    }
}

function dibujarBarajitaAlgoritmicaSlot(contenedor, datosCarta, idCarta) {
    const infoExtraida = extraerAtributosCarta(datosCarta, idCarta);

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.borderRadius = "4px";

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const registro = {
        canvas: canvas,
        ctx: ctx,
        datosCarta: datosCarta,
        idCarta: idCarta,
        config: infoExtraida.config,
        personajeData: infoExtraida.personajeData,
        fondoColor: infoExtraida.fondoColor,
        img: null,
        esImagen: false
    };

    if (infoExtraida.urlImagen && (infoExtraida.urlImagen.startsWith('data:image') || infoExtraida.urlImagen.startsWith('http'))) {
        const imgObj = new Image();
        imgObj.crossOrigin = "anonymous";
        imgObj.onload = () => {
            registro.img = imgObj;
            registro.esImagen = true;
        };
        imgObj.onerror = () => {
            console.warn(`Error al cargar imagen de carta #${idCarta}`);
        };
        imgObj.src = infoExtraida.urlImagen;
    }

    canvasAnimados.push(registro);
    contenedor.appendChild(canvas);
}

function iniciarBucleAnimacionGlobal() {
    function animar(timestamp) {
        const t = timestamp * 0.0025;

        canvasAnimados.forEach(item => {
            const { canvas, ctx, datosCarta, idCarta, config, personajeData, esImagen, img } = item;
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            ctx.fillStyle = config.fondoColor || config.colorFondo || "#090a14";
            ctx.fillRect(0, 0, w, h);

            if (esImagen && img && img.complete) {
                ctx.save();

                const anguloGiro = Math.sin(t * 0.8 + idCarta) * 0.05; 
                const traslacionX = Math.cos(t * 0.5 + idCarta) * 2;
                const traslacionY = Math.sin(t * 1.2 + idCarta) * 2;

                ctx.translate(w / 2 + traslacionX, h / 2 + traslacionY);
                ctx.rotate(anguloGiro);

                ctx.drawImage(img, 0, 0, img.width, img.height, -w / 2, -h / 2, w, h);

                const tiempoParpadeo = (t * 1.5 + idCarta) % 4;
                let escalaOjoY = 1;
                if (tiempoParpadeo > 3.7) { 
                    escalaOjoY = Math.abs(Math.cos((tiempoParpadeo - 3.7) * Math.PI * 16.6)); 
                }

                if (escalaOjoY < 0.95) {
                    const ojoSrcY = img.height * 0.30;
                    const ojoSrcH = img.height * 0.15;
                    const ojoDestY = -h / 2 + h * 0.30;
                    const ojoDestH = h * 0.15;

                    ctx.save();
                    ctx.translate(0, ojoDestY + ojoDestH / 2);
                    ctx.scale(1, escalaOjoY);
                    ctx.drawImage(
                        img, 
                        0, ojoSrcY, img.width, ojoSrcH, 
                        -w / 2, -ojoDestH / 2, w, ojoDestH
                    );
                    ctx.restore();
                }

                const aperturaBoca = Math.sin(t * 3.5 + idCarta) * 0.12;
                if (aperturaBoca > 0.02) {
                    const bocaSrcY = img.height * 0.52;
                    const bocaSrcH = img.height * 0.16;
                    const bocaDestY = -h / 2 + h * 0.52;
                    const bocaDestH = h * 0.16;

                    ctx.save();
                    ctx.translate(0, bocaDestY + bocaDestH / 2);
                    ctx.scale(1 + aperturaBoca * 0.2, 1 + aperturaBoca);
                    ctx.drawImage(
                        img, 
                        0, bocaSrcY, img.width, bocaSrcH, 
                        -w / 2, -bocaDestH / 2, w, bocaDestH
                    );
                    ctx.restore();
                }

                ctx.restore();

                const holoGradient = ctx.createLinearGradient(0, (t * 50) % (h * 2) - h, w, (t * 50) % (h * 2));
                holoGradient.addColorStop(0, "rgba(255,0,127,0)");
                holoGradient.addColorStop(0.5, "rgba(0,243,255,0.2)");
                holoGradient.addColorStop(1, "rgba(255,0,127,0)");
                
                ctx.fillStyle = holoGradient;
                ctx.fillRect(0, 0, w, h);

            } else if (personajeData) {
                ctx.save();
                const offCanvas = document.createElement('canvas');
                offCanvas.width = 32;
                offCanvas.height = 32;
                const offCtx = offCanvas.getContext('2d');

                const tiempoParpadeo = (t * 1.5 + idCarta) % 4;
                const estaParpadeando = tiempoParpadeo > 3.7;

                renderAnimeCharacterPixelArt(offCtx, personajeData, t, estaParpadeando);

                const targetSize = Math.min(w, h) - 20;
                const targetX = (w - targetSize) / 2;
                const targetY = (h - targetSize) / 2 - 10;

                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(offCanvas, targetX, targetY, targetSize, targetSize);
                ctx.restore();
            } else {
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

            ctx.strokeStyle = config.marcoColor || config.colorPrimario || "#00f3ff";
            ctx.lineWidth = 4 + Math.sin(t * 2 + idCarta) * 2;
            ctx.strokeRect(2, 2, w - 4, h - 4);

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

    const info = extraerAtributosCarta(datosCarta, idCarta);
    const simbolo = info.config.simbolo || '👾';

    let elementoVisual = "";
    if (info.urlImagen) {
        elementoVisual = `<img src="${info.urlImagen}" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" />`;
    } else if (info.personajeData) {
        elementoVisual = `<canvas id="canvas-visor-${idCarta}" width="160" height="160" style="width:100%; height:100%; image-rendering:pixelated;"></canvas>`;
    } else {
        elementoVisual = `<span style="font-size:70px;">${simbolo}</span>`;
    }

    contenidoFrontal.innerHTML = `
        <div style="text-align:center;">
            <h3 style="font-size:10px; color:${info.marcoColor}; margin-bottom:8px; text-shadow:0 0 5px ${info.marcoColor};">${nombre.toUpperCase()}</h3>
            <div style="width:180px; height:230px; margin: 0 auto 10px auto; background:${info.fondoColor}; border:3px solid ${info.marcoColor}; border-radius:8px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px ${info.marcoColor}; overflow:hidden;">
                ${elementoVisual}
            </div>
            <p style="font-size:7px; color:#ff007f; margin-bottom:4px; text-shadow:0 0 3px #ff007f;">Rareza: ${rareza} | Copias: ${cantidad}</p>
            <p style="font-size:6px; color:#a5b4fc; margin-bottom:8px; line-height:1.3;">${lore}</p>
            <p style="font-size:7px; color:#64748b;">#${String(idCarta).padStart(4, '0')}</p>
        </div>
    `;

    if (info.personajeData && !info.urlImagen) {
        setTimeout(() => {
            const canvasVisor = document.getElementById(`canvas-visor-${idCarta}`);
            if (canvasVisor) {
                const ctxV = canvasVisor.getContext('2d');
                ctxV.imageSmoothingEnabled = false;
                renderAnimeCharacterPixelArt(ctxV, info.personajeData, 0, false);
            }
        }, 50);
    }

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
