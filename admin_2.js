// =============================================================================
// 💻 CONTROLADOR DE ADMINISTRACIÓN, GENERADOR PROCEDURAL / IA Y SERVIDOR (admin_2.js)
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let modoRenderActual = 'canvas'; // 'canvas' o 'ia'
let canalRealtimeColeccion = null;

// Mapa de Paletas y Colores por Era
const PALETAS_ERA = {
    cyber: { fondo: '#0d0f18', borde: '#00ffcc', acento: '#ff007f', texto: '#00ffcc' },
    cotidianos: { fondo: '#1f1b24', borde: '#ffb703', acento: '#fb8500', texto: '#fff' },
    espacial: { fondo: '#0b091a', borde: '#8a2be2', acento: '#00ffff', texto: '#e0e0ff' },
    antiguo: { fondo: '#1c120c', borde: '#d4af37', acento: '#ff4500', texto: '#f3e5ab' }
};

// 2. INICIALIZACIÓN DE COMPONENTES AL CARGAR
document.addEventListener('DOMContentLoaded', async () => {
    logEstado("Inicializando Panel de Mando...");
    
    configurarEventosUI();
    escucharDibujoCanvas();
    await cargarMetricasServidor();
    await cargarCatálogoCartas();
    
    // Iniciar escucha Realtime en la colección de usuarios
    iniciarSuscripcionRealtimeAlbum();
});

// 3. NAVEGACIÓN Y CAMBIO DE PESTAÑAS (SPA)
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(el => el.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('activo'));

    const pestanaDestino = document.getElementById(idPestana);
    if (pestanaDestino) pestanaDestino.classList.add('activa');

    const botonActivo = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.getAttribute('onclick')?.includes(idPestana)
    );
    if (botonActivo) botonActivo.classList.add('activo');
}

function seleccionarModoRender(modo) {
    modoRenderActual = modo;
    const btnCanvas = document.getElementById('btn-modo-canvas');
    const btnIa = document.getElementById('btn-modo-ia');
    const canvas = document.getElementById('canvasCartaGenerada');
    const imgIa = document.getElementById('imgPollinationsPreview');
    const panelIa = document.getElementById('panel-opciones-ia');
    const btnGenerarIa = document.getElementById('btn-generar-ia');
    const labelModo = document.getElementById('label-modo-previa');

    if (modo === 'canvas') {
        btnCanvas.classList.add('activo');
        btnIa.classList.remove('activo');
        canvas.style.display = 'block';
        imgIa.style.display = 'none';
        panelIa.style.display = 'none';
        btnGenerarIa.style.display = 'none';
        labelModo.textContent = "EN VIVO: RENDERIZADO CANVAS MATEMÁTICO";
        dibujarCartaCanvas();
    } else {
        btnIa.classList.add('activo');
        btnCanvas.classList.remove('activo');
        canvas.style.display = 'none';
        imgIa.style.display = 'block';
        panelIa.style.display = 'block';
        btnGenerarIa.style.display = 'block';
        labelModo.textContent = "EN VIVO: MOTOR GENERATIVO POLLINATIONS IA";
    }
}

// 4. SUSCRIPCIÓN EN TIEMPO REAL (REALTIME) PARA ACTUALIZACIÓN INMEDIATA DEL ÁLBUM
function iniciarSuscripcionRealtimeAlbum() {
    if (canalRealtimeColeccion) return;

    canalRealtimeColeccion = supabaseClient
        .channel('public:Coleccion_Usuario')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Coleccion_Usuario' },
            (payload) => {
                logEstado(`⚡ Cambio detectado en colección (${payload.eventType}). Actualizando álbum...`);
                // Disparar evento global de actualización para la interfaz del usuario/álbum
                window.dispatchEvent(new CustomEvent('actualizarAlbumRealtime', { detail: payload }));
                
                // Si la pestaña de catálogo está visible, recargar
                cargarCatálogoCartas();
                cargarMetricasServidor();
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                logEstado("🟢 Suscripción Realtime activa: El álbum se actualizará instantáneamente.");
            }
        });
}

// 5. ASIGNAR / REGALAR / COMPRAR CARTA
async function regalarCartaAUsuario() {
    const targetUser = document.getElementById('target-user')?.value?.trim();
    const idCarta = parseInt(document.getElementById('target-carta-id')?.value);
    const cantidadAñadir = parseInt(document.getElementById('target-cantidad')?.value) || 1;

    if (!targetUser || !idCarta || isNaN(idCarta)) {
        alert("Ingresa un usuario válido y un ID numérico de carta.");
        return;
    }

    const idLimpio = targetUser.replace(/^@/, '').trim().toLowerCase();

    logEstado(`Verificando existencia de Carta #${idCarta}...`);

    // 1. Verificar si la carta existe en la tabla 'Cartas'
    const { data: cartaExistente, error: errCarta } = await supabaseClient
        .from('Cartas')
        .select('id, nombre, rareza, era')
        .eq('id', idCarta)
        .maybeSingle();

    if (errCarta || !cartaExistente) {
        alert(`❌ La Carta #${idCarta} no existe en la BD. Créala primero en "CREAR CARTA".`);
        logEstado(`❌ Asignación cancelada: La Carta #${idCarta} no existe.`);
        return;
    }

    logEstado(`Procesando Carta #${idCarta} (${cartaExistente.nombre}) x${cantidadAñadir} para @${idLimpio}...`);

    // 2. Verificar si el usuario ya posee la carta en 'Coleccion_Usuario'
    const { data: registroExistente, error: errConsulta } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('id, cantidad')
        .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`)
        .eq('carta_id', idCarta)
        .maybeSingle();

    let errorRespuesta = null;

    if (registroExistente) {
        // Incrementar la cantidad si ya existe
        const nuevaCantidad = (Number(registroExistente.cantidad) || 0) + cantidadAñadir;
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: nuevaCantidad })
            .eq('id', registroExistente.id);
        errorRespuesta = error;
    } else {
        // Insertar nuevo registro con los atributos de relación
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{
                usuario_id: idLimpio,
                carta_id: idCarta,
                cantidad: cantidadAñadir
            }]);
        errorRespuesta = error;
    }

    if (errorRespuesta) {
        alert("Error al asignar carta: " + errorRespuesta.message);
        logEstado(`❌ Error en Supabase: ${errorRespuesta.message}`);
    } else {
        alert(`🎉 Carta #${idCarta} (${cartaExistente.nombre}) entregada exitosamente a @${idLimpio}.`);
        logEstado(`✅ Asignación completada: Carta #${idCarta} -> @${idLimpio}`);
    }
}

// 6. CREACIÓN Y PUBLICACIÓN DE CARTA CON EFECTOS Y COLORES
async function guardarCartaBD() {
    const id = parseInt(document.getElementById('carta-id').value);
    const nombre = document.getElementById('carta-nombre').value.trim();
    const era = document.getElementById('carta-era').value;
    const rareza = document.getElementById('carta-rareza').value;
    const simbolo = document.getElementById('carta-simbolo').value.trim();
    const lore = document.getElementById('carta-lore').value.trim();

    if (!id || !nombre) {
        alert("Por favor completa el ID y el Nombre de la carta.");
        return;
    }

    logEstado(`Guardando receta de Carta #${id} (${nombre})...`);

    let imagenUrl = "";
    if (modoRenderActual === 'canvas') {
        const canvas = document.getElementById('canvasCartaGenerada');
        imagenUrl = canvas.toDataURL("image/png");
    } else {
        const imgIa = document.getElementById('imgPollinationsPreview');
        imagenUrl = imgIa.src;
    }

    const payloadCarta = {
        id: id,
        nombre: nombre,
        era: era,
        rareza: rareza,
        simbolo: simbolo,
        lore: lore,
        imagen_url: imagenUrl,
        efectos_css: `era-${era} rareza-${rareza.toLowerCase()}`
    };

    const { error } = await supabaseClient
        .from('Cartas')
        .upsert([payloadCarta]);

    if (error) {
        alert("Error al publicar carta: " + error.message);
        logEstado(`❌ Error guardando Carta #${id}: ${error.message}`);
    } else {
        alert(`✅ Carta #${id} "${nombre}" publicada con exito.`);
        logEstado(`✅ Carta #${id} guardada correctamente.`);
        cargarCatálogoCartas();
    }
}

// 7. RENDERIZADO DEL CATÁLOGO DE CARTAS CON EFECTOS ESPECIALES
async function cargarCatálogoCartas() {
    const grid = document.getElementById('grid-catalogo-admin');
    if (!grid) return;

    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        grid.innerHTML = `<div style="color:#ef4444; font-size:9px;">Error al cargar catálogo: ${error.message}</div>`;
        return;
    }

    if (!cartas || cartas.length === 0) {
        grid.innerHTML = `<div style="color:#888; font-size:9px;">No hay cartas creadas aún.</div>`;
        return;
    }

    grid.innerHTML = cartas.map(carta => renderizarHTMLCarta(carta)).join('');
}

// Función Generadora del Maquetado con Efectos, Borde y Paleta de Colores
function renderizarHTMLCarta(carta) {
    const paleta = PALETAS_ERA[carta.era] || PALETAS_ERA.cyber;
    const rarezaClase = `rareza-${(carta.rareza || 'Común').toLowerCase()}`;
    const eraClase = `era-${carta.era || 'cyber'}`;

    return `
        <div class="tarjeta-carta ${rarezaClase} ${eraClase}" 
             data-era="${carta.era}" 
             data-rareza="${carta.rareza}"
             style="background: ${paleta.fondo}; border: 2px solid ${paleta.borde}; color: ${paleta.texto}; box-shadow: 0 0 10px ${paleta.acento}44; border-radius: 8px; padding: 10px; position: relative; overflow: hidden;">
            
            <div class="efecto-brillo-holografico"></div>

            <div style="display:flex; justify-content:space-between; font-size:8px; border-bottom:1px solid ${paleta.borde}; padding-bottom:4px; margin-bottom:6px;">
                <span style="font-weight:bold;">#${carta.id} ${carta.nombre}</span>
                <span class="badge-rareza" style="color:${paleta.acento};">${carta.rareza}</span>
            </div>

            <div style="text-align:center; margin:8px 0; background:rgba(0,0,0,0.3); border-radius:4px; padding:8px;">
                ${carta.imagen_url ? `<img src="${carta.imagen_url}" style="max-width:100%; height:100px; object-fit:contain;">` : `<span style="font-size:32px;">${carta.simbolo || '👾'}</span>`}
            </div>

            <div style="font-size:7px; font-style:italic; line-height:1.2; color:#ccc; min-height:24px;">
                "${carta.lore || 'Sin historia registrada.'}"
            </div>

            <div style="margin-top:6px; font-size:6px; text-transform:uppercase; color:${paleta.acento}; text-align:right;">
                ERA: ${carta.era}
            </div>
        </div>
    `;
}

// 8. GENERADOR CANVAS EN VIVO
function escucharDibujoCanvas() {
    ['carta-nombre', 'carta-era', 'carta-rareza', 'carta-simbolo'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (modoRenderActual === 'canvas') dibujarCartaCanvas();
        });
    });

    document.getElementById('btn-randomizar')?.addEventListener('click', () => {
        const simbolos = ['👾', '👽', '🤖', '🐲', '⚡', '🔥', '🔮', '⚔️'];
        document.getElementById('carta-simbolo').value = simbolos[Math.floor(Math.random() * simbolos.length)];
        const eras = ['cyber', 'cotidianos', 'espacial', 'antiguo'];
        document.getElementById('carta-era').value = eras[Math.floor(Math.random() * eras.length)];
        dibujarCartaCanvas();
    });

    document.getElementById('btn-guardar-carta')?.addEventListener('click', guardarCartaBD);
    document.getElementById('btn-regalar-carta')?.addEventListener('click', regalarCartaAUsuario);
}

function dibujarCartaCanvas() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const nombre = document.getElementById('carta-nombre').value || "Carta Misteriosa";
    const era = document.getElementById('carta-era').value;
    const simbolo = document.getElementById('carta-simbolo').value || "👾";
    const paleta = PALETAS_ERA[era] || PALETAS_ERA.cyber;

    // Fondo
    ctx.fillStyle = paleta.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Marco
    ctx.strokeStyle = paleta.borde;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Símbolo Central
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, canvas.width / 2, canvas.height / 2 - 10);

    // Nombre
    ctx.fillStyle = paleta.texto;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(nombre.substring(0, 14), canvas.width / 2, canvas.height - 30);

    // Actualizar etiqueta de semilla/era
    const infoBox = document.getElementById('info-semilla');
    if (infoBox) infoBox.textContent = `Era: ${era.toUpperCase()} | Símbolo: ${simbolo}`;
}

// 9. MOTOR POLLINATIONS IA
async function generarImagenPollinationsDirecta() {
    const promptCustom = document.getElementById('prompt-ia-custom')?.value?.trim();
    const nombre = document.getElementById('carta-nombre')?.value || "creature";
    const spinner = document.getElementById('spinnerIA');
    const imgIa = document.getElementById('imgPollinationsPreview');

    const promptFinal = promptCustom || `trading card art of ${nombre}, digital art, highly detailed, vibrant background`;
    const urlIa = `https://pollinations.ai/p/${encodeURIComponent(promptFinal)}?width=220&height=308&seed=${Math.floor(Math.random() * 99999)}&nologo=true`;

    if (spinner) spinner.style.display = 'block';

    imgIa.onload = () => {
        if (spinner) spinner.style.display = 'none';
        logEstado("⚡ Imagen IA generada con éxito.");
    };

    imgIa.src = urlIa;
}

// 10. DIAGNÓSTICO Y MÉTRICAS DEL SERVIDOR
async function cargarMetricasServidor() {
    const statusSupabase = document.getElementById('status-supabase');
    const totalCartasEl = document.getElementById('total-cartas-count');
    const pingEl = document.getElementById('ping-supabase');

    const inicio = Date.now();
    const { count, error } = await supabaseClient
        .from('Cartas')
        .select('*', { count: 'exact', head: true });

    const latencia = Date.now() - inicio;

    if (error) {
        if (statusSupabase) {
            statusSupabase.textContent = "● ERROR CONEXIÓN";
            statusSupabase.style.color = "#ef4444";
        }
    } else {
        if (statusSupabase) {
            statusSupabase.textContent = "● CONECTADO";
            statusSupabase.style.color = "#00ff66";
        }
        if (totalCartasEl) totalCartasEl.textContent = count || 0;
        if (pingEl) pingEl.textContent = `${latencia} ms`;
    }
}

function logEstado(mensaje) {
    const logBox = document.getElementById('status-log');
    const logServidor = document.getElementById('servidor-log-output');
    const timestamp = new Date().toLocaleTimeString();

    if (logBox) logBox.textContent = `[${timestamp}] ${mensaje}`;
    if (logServidor) {
        logServidor.innerHTML += `<br>[${timestamp}] ${mensaje}`;
        logServidor.scrollTop = logServidor.scrollHeight;
    }
}

function configurarEventosUI() {
    document.getElementById('btn-procesar-plantillas')?.addEventListener('click', () => {
        alert("Procesando plantillas masivas...");
    });
}
