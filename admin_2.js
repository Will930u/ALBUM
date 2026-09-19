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
                logEstado(` Cambio detectado en colección (${payload.eventType}). Actualizando álbum...`);
                window.dispatchEvent(new CustomEvent('actualizarAlbumRealtime', { detail: payload }));
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

    const { data: registroExistente, error: errConsulta } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('id, cantidad')
        .or(`usuario_id.ilike.${idLimpio},usuario_id.ilike.@${idLimpio}`)
        .eq('carta_id', idCarta)
        .maybeSingle();

    let errorRespuesta = null;
    if (registroExistente) {
        const nuevaCantidad = (Number(registroExistente.cantidad) || 0) + cantidadAñadir;
        const { error } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: nuevaCantidad })
            .eq('id', registroExistente.id);
        errorRespuesta = error;
    } else {
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

// 6. CREACIÓN Y PUBLICACIÓN DE CARTA
async function guardarCartaBD() {
    const id = parseInt(document.getElementById('carta-id').value);
    const nombre = document.getElementById('carta-nombre').value.trim();
    const era = document.getElementById('carta-era').value.toLowerCase().trim();
    const rareza = document.getElementById('carta-rareza').value.trim();
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

    // Limpiar caracteres no deseados en la URL
    imagenUrl = imagenUrl.replace(/^\{|\}$/g, '').trim();

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
        alert(`✅ Carta #${id} "${nombre}" publicada con éxito.`);
        logEstado(`✅ Carta #${id} guardada correctamente.`);
        cargarCatálogoCartas();
    }
}

// 7. RENDERIZADO DEL CATÁLOGO DE CARTAS
async function cargarCatálogoCartas() {
    const grid = document.getElementById('grid-catalogo-admin');
    if (!grid) return;

    console.log('🔄 Cargando catálogo de cartas desde Supabase...');

    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('❌ Error al cargar cartas:', error);
        grid.innerHTML = `<div style="color:#ef4444; font-size:9px;">Error al cargar catálogo: ${error.message}</div>`;
        return;
    }

    if (!cartas || cartas.length === 0) {
        console.log('⚠️ No hay cartas en la base de datos');
        grid.innerHTML = `<div style="color:#888; font-size:9px;">No hay cartas creadas aún.</div>`;
        return;
    }

    console.log(`✅ ${cartas.length} cartas cargadas correctamente.`);
    // CORRECCIÓN: Se cambió renderizarHTMLCarta por renderizarCartaDesdeBD
    grid.innerHTML = cartas.map(carta => renderizarCartaDesdeBD(carta)).join('');
}

// Función para renderizar una carta recuperada de la base de datos (CORREGIDA)
function renderizarCartaDesdeBD(carta) {
    // 1. Normalización de Era y Rareza
    const eraClave = (carta.era || 'cyber').toString().toLowerCase().trim();
    const rarezaTexto = (carta.rareza || 'Común').toString().trim();
    const rarezaClase = `rareza-${rarezaTexto.toLowerCase()}`;

    // 2. Obtener paleta de colores según la Era
    const paleta = (typeof PALETAS_ERA !== 'undefined' && PALETAS_ERA[eraClave]) 
        ? PALETAS_ERA[eraClave] 
        : { fondo: '#1a0033', borde: '#00ff66', texto: '#ffffff', acento: '#00ff66' };

    // 3. Procesamiento de la imagen
    let imgSrc = '';
    let esConfiguracionGenerador = false;
    let configGenerador = null;
    
    if (carta.imagen_url) {
        const urlLimpia = String(carta.imagen_url).trim();
        
        // Verificar si es un JSON de configuración del generador
        if (urlLimpia.startsWith('{') && urlLimpia.endsWith('}')) {
            try {
                configGenerador = JSON.parse(urlLimpia);
                esConfiguracionGenerador = true;
                console.log(`🎨 Carta #${carta.id} tiene configuración de generador:`, configGenerador);
            } catch (e) {
                console.warn(`⚠️ Carta #${carta.id} tiene JSON inválido`);
            }
        } else {
            // Es una URL o Base64 normal
            imgSrc = urlLimpia.replace(/^['"{}]+|['"{}]+$/g, '');
            
            // Si es una ruta relativa de Supabase Storage
            if (imgSrc.startsWith('/storage/v1/object/public/')) {
                imgSrc = SUPABASE_URL + imgSrc;
            }
        }
    }

    // Comprobación de validez de imagen (HTTP/HTTPS o Data URI Base64)
    const tieneImagenValida = imgSrc.length > 20 && 
        (imgSrc.startsWith('http://') || 
         imgSrc.startsWith('https://') || 
         imgSrc.startsWith('data:image/'));

    // 4. Renderizado del HTML
    // Si es configuración del generador, usamos el símbolo y colores de la config
    const simbolo = configGenerador?.simbolo || carta.simbolo || '👾';
    const colorFondo = configGenerador?.fondoColor || paleta.fondo;
    
    return `
        <div class="tarjeta-carta ${rarezaClase} era-${eraClave}" 
             data-id="${carta.id || ''}"
             data-era="${eraClave}" 
             data-rareza="${rarezaTexto}"
             data-config='${JSON.stringify(configGenerador || {})}'
             style="background: ${colorFondo}; border: 2px solid ${paleta.borde}; color: ${paleta.texto}; box-shadow: 0 0 12px ${paleta.acento}66; border-radius: 8px; padding: 10px; position: relative; overflow: hidden;">
            <!-- CAPAS DE EFECTOS MÓVILES Y HOLOGRÁFICOS -->
            <div class="fondo-movil-animado"></div>
            <div class="efecto-brillo-holografico"></div>
            <!-- ENCABEZADO -->
            <div style="display:flex; justify-content:space-between; font-size:8px; border-bottom:1px solid ${paleta.borde}; padding-bottom:4px; margin-bottom:6px; position:relative; z-index:2;">
                <span style="font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">#${carta.id || '?'} ${carta.nombre || 'Sin nombre'}</span>
                <span class="badge-rareza" style="color:${paleta.acento}; font-weight:bold;">${rarezaTexto}</span>
            </div>
            <!-- CONTENEDOR VISUAL DE LA IMAGEN -->
            <div class="contenedor-imagen-carta" style="text-align:center; margin:8px 0; background:rgba(0,0,0,0.5); border: 1px solid ${paleta.borde}44; border-radius:4px; padding:4px; height:110px; display:flex; align-items:center; justify-content:center; position:relative; z-index:2; overflow:hidden;">
                ${tieneImagenValida 
                    ? `<img src="${imgSrc}" 
                            alt="${carta.nombre || 'Carta'}" 
                            style="max-width:100%; max-height:100%; object-fit:contain; filter: drop-shadow(0 0 4px rgba(0,0,0,0.8));" 
                            onerror="console.error('Error cargando imagen carta #${carta.id}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="fallback-simbolo" style="display:none; flex-direction:column; align-items:center; gap:4px;">
                         <span style="font-size:36px;">${simbolo}</span>
                       </div>` 
                    : `<div class="fallback-simbolo" style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                         <span style="font-size:36px;">${simbolo}</span>
                         ${esConfiguracionGenerador ? '<span style="font-size:6px; color:#666;">Algorítmica</span>' : '<span style="font-size:6px; color:#666;">Sin imagen</span>'}
                       </div>`
                }
            </div>
            <!-- DESCRIPCIÓN Y LORE -->
            <div style="font-size:7px; font-style:italic; line-height:1.2; color:#eee; height:28px; overflow:hidden; position:relative; z-index:2; text-shadow: 1px 1px 2px #000; margin-bottom:4px;">
                "${carta.lore || 'Sin descripción disponible.'}"
            </div>
            <!-- PIE DE CARTA -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:6px; text-transform:uppercase; color:${paleta.acento}; font-weight:bold; position:relative; z-index:2; border-top:1px solid ${paleta.borde}33; padding-top:4px;">
                <span>ATQ: ${carta.ataque || 0} | DEF: ${carta.defensa || 0}</span>
                <span>${eraClave}</span>
            </div>
        </div>
    `;
}

// Función para regenerar imágenes de cartas algorítmicas después de renderizar
function regenerarImagenesAlgoritmicas() {
    const tarjetas = document.querySelectorAll('.tarjeta-carta[data-config]');
    
    tarjetas.forEach(tarjeta => {
        const configStr = tarjeta.getAttribute('data-config');
        if (!configStr || configStr === '{}') return;
        
        try {
            const config = JSON.parse(configStr);
            if (!config.procedural) return; // Solo regenerar si es procedural
            
            const contenedorImg = tarjeta.querySelector('.contenedor-imagen-carta');
            const fallback = tarjeta.querySelector('.fallback-simbolo');
            
            if (!contenedorImg || !fallback) return;
            
            // Crear canvas temporal para regenerar la imagen
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 140;
            const ctx = canvas.getContext('2d');
            
            // Dibujar fondo
            ctx.fillStyle = config.fondoColor || '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Dibujar símbolo
            const simbolo = config.simbolo || '👾';
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(simbolo, canvas.width / 2, canvas.height / 2);
            
            // Convertir a Base64 y mostrar
            const dataURL = canvas.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = dataURL;
            img.alt = 'Carta algorítmica';
            img.style.cssText = 'max-width:100%; max-height:100%; object-fit:contain;';
            
            // Reemplazar el fallback con la imagen regenerada
            fallback.style.display = 'none';
            contenedorImg.insertBefore(img, fallback);
            
            console.log(`✅ Imagen regenerada para carta con config:`, config);
        } catch (e) {
            console.error('Error regenerando imagen:', e);
        }
    });
}

// Modificar cargarCatálogoCartas para llamar a regenerarImagenesAlgoritmicas
async function cargarCatálogoCartas() {
    const grid = document.getElementById('grid-catalogo-admin');
    if (!grid) return;

    console.log('🔄 Cargando catálogo de cartas...');

    const { data: cartas, error } = await supabaseClient
        .from('Cartas')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('❌ Error al cargar cartas:', error);
        grid.innerHTML = `<div style="color:#ef4444; font-size:9px;">Error al cargar catálogo: ${error.message}</div>`;
        return;
    }

    if (!cartas || cartas.length === 0) {
        console.log('⚠️ No hay cartas en la base de datos');
        grid.innerHTML = `<div style="color:#888; font-size:9px;">No hay cartas creadas aún.</div>`;
        return;
    }

    console.log(`✅ ${cartas.length} cartas cargadas`);
    
    // CORRECCIÓN: Usar renderizarCartaDesdeBD en lugar de renderizarHTMLCarta
    grid.innerHTML = cartas.map(carta => renderizarCartaDesdeBD(carta)).join('');
    
    // Regenerar imágenes de cartas algorítmicas después de renderizar
    setTimeout(regenerarImagenesAlgoritmicas, 100);
}
// 8. GENERADOR CANVAS EN VIVO
function escucharDibujoCanvas() {
    ['carta-nombre', 'carta-era', 'carta-rareza', 'carta-simbolo'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (modoRenderActual === 'canvas') dibujarCartaCanvas();
        });
    });

    document.getElementById('btn-randomizar')?.addEventListener('click', () => {
        const simbolos = ['', '👽', '🤖', '🐲', '⚡', '🔥', '🔮', '️'];
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
    const simbolo = document.getElementById('carta-simbolo').value || "";
    const paleta = PALETAS_ERA[era] || PALETAS_ERA.cyber;

    ctx.fillStyle = paleta.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = paleta.borde;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, canvas.width / 2, canvas.height / 2 - 10);

    ctx.fillStyle = paleta.texto;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(nombre.substring(0, 14), canvas.width / 2, canvas.height - 30);

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
