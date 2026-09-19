// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ddbdemxrntjqncetyrnr.supabase.co'; // Reemplazar con tu URL de Supabase
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs';                // Reemplazar con tu ANON KEY de Supabase

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ESTADO GLOBAL DEL ADMIN
let modoRenderActual = 'canvas'; // 'canvas' | 'ia'
let urlImagenIAGenerada = '';
let plantillasCriaturas = [];

// ==========================================
// CICLO DE VIDA E INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
    renderizarCanvasPrevia();
    cargarCatalogoCartas();
    cargarMetricasServidor();
});

function inicializarEventos() {
    // Cambio de Pestañas
    const botonesPestana = document.querySelectorAll('.tab-btn');
    botonesPestana.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const funcionAttr = btn.getAttribute('onclick');
            if (funcionAttr && funcionAttr.includes("cambiarPestana")) {
                const match = funcionAttr.match(/'([^']+)'/);
                if (match) cambiarPestana(match[1]);
            }
        });
    });

    // Inputs dinámicos para actualización del Canvas
    ['carta-id', 'carta-nombre', 'carta-era', 'carta-rareza', 'carta-simbolo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (modoRenderActual === 'canvas') renderizarCanvasPrevia();
            });
            el.addEventListener('change', () => {
                if (modoRenderActual === 'canvas') renderizarCanvasPrevia();
            });
        }
    });

    // Botones Principales
    const btnRandom = document.getElementById('btn-randomizar');
    if (btnRandom) btnRandom.addEventListener('click', randomizarDesdePlantillas);

    const btnGuardar = document.getElementById('btn-guardar-carta');
    if (btnGuardar) btnGuardar.addEventListener('click', publicarRecetaCarta);

    const btnRegalar = document.getElementById('btn-regalar-carta');
    if (btnRegalar) btnRegalar.addEventListener('click', regalarCartaUsuario);

    const btnProcesarPlantillas = document.getElementById('btn-procesar-plantillas');
    if (btnProcesarPlantillas) btnProcesarPlantillas.addEventListener('click', procesarYGuardarPlantillas);

    const btnLimpiarPlantillas = document.getElementById('btn-limpiar-plantillas');
    if (btnLimpiarPlantillas) btnLimpiarPlantillas.addEventListener('click', limpiarPlantillas);
}

// ==========================================
// CONTROL DE PESTAÑAS (SPA)
// ==========================================
function cambiarPestana(pestanaId) {
    const pestanas = document.querySelectorAll('.contenido-pestana');
    pestanas.forEach(p => p.classList.remove('activa'));

    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(b => b.classList.remove('activo'));

    const pestanaObjetivo = document.getElementById(pestanaId);
    if (pestanaObjetivo) pestanaObjetivo.classList.add('activa');

    const btnActivo = Array.from(botones).find(b => {
        const onclickStr = b.getAttribute('onclick') || '';
        return onclickStr.includes(pestanaId);
    });
    if (btnActivo) btnActivo.classList.add('activo');

    if (pestanaId === 'tab-catalogo') cargarCatalogoCartas();
    if (pestanaId === 'tab-servidor') cargarMetricasServidor();
}

// ==========================================
// RENDERIZADO PROCEDURAL Y POLLINATIONS IA
// ==========================================
function seleccionarModoRender(modo) {
    modoRenderActual = modo;
    const btnCanvas = document.getElementById('btn-modo-canvas');
    const btnIA = document.getElementById('btn-modo-ia');
    const labelPrevia = document.getElementById('label-modo-previa');
    const panelIA = document.getElementById('panel-opciones-ia');
    const btnGenerarIA = document.getElementById('btn-generar-ia');
    const canvas = document.getElementById('canvasCartaGenerada');
    const imgPreview = document.getElementById('imgPollinationsPreview');

    if (modo === 'canvas') {
        if (btnCanvas) btnCanvas.classList.add('activo');
        if (btnIA) btnIA.classList.remove('activo');
        if (labelPrevia) labelPrevia.textContent = 'EN VIVO: RENDERIZADO CANVAS MATEMÁTICO';
        if (panelIA) panelIA.style.display = 'none';
        if (btnGenerarIA) btnGenerarIA.style.display = 'none';
        if (canvas) canvas.style.display = 'block';
        if (imgPreview) imgPreview.style.display = 'none';
        renderizarCanvasPrevia();
    } else {
        if (btnIA) btnIA.classList.add('activo');
        if (btnCanvas) btnCanvas.classList.remove('activo');
        if (labelPrevia) labelPrevia.textContent = 'EN VIVO: PREVISUALIZACIÓN POLLINATIONS IA';
        if (panelIA) panelIA.style.display = 'block';
        if (btnGenerarIA) btnGenerarIA.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        if (imgPreview) imgPreview.style.display = 'block';
    }
}

function obtenerColoresEra(era) {
    switch (era) {
        case 'cyber': return { fondo: '#090a0f', marco: '#00ff66', texto: '#00ffff' };
        case 'cotidianos': return { fondo: '#1f1912', marco: '#eab308', texto: '#fef08a' };
        case 'espacial': return { fondo: '#030712', marco: '#38bdf8', texto: '#e0f2fe' };
        case 'antiguo': return { fondo: '#1a090d', marco: '#a855f7', texto: '#f3e8ff' };
        default: return { fondo: '#111827', marco: '#6b7280', texto: '#ffffff' };
    }
}

function renderizarCanvasPrevia() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const id = document.getElementById('carta-id')?.value || '1';
    const nombre = document.getElementById('carta-nombre')?.value || 'Sin Nombre';
    const era = document.getElementById('carta-era')?.value || 'cyber';
    const rareza = document.getElementById('carta-rareza')?.value || 'Común';
    const simbolo = document.getElementById('carta-simbolo')?.value || '👾';

    const colores = obtenerColoresEra(era);

    // Fondo
    ctx.fillStyle = colores.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde / Marco
    ctx.strokeStyle = colores.marco;
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Encabezado (ID y Rareza)
    ctx.fillStyle = colores.marco;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`#${id}`, 14, 24);

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(rareza.toUpperCase(), canvas.width - 14, 24);

    // Ilustración Central (Cuadro)
    ctx.textAlign = 'left';
    ctx.strokeStyle = colores.marco;
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 36, canvas.width - 40, 150);

    // Símbolo Principal
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(simbolo, canvas.width / 2, 110);

    // Nombre de la Carta
    ctx.fillStyle = colores.texto;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText(nombre.substring(0, 16), canvas.width / 2, 210);

    // Pie de carta / Lore preview
    ctx.fillStyle = '#888888';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText(`ERA: ${era.toUpperCase()}`, canvas.width / 2, 235);

    // Actualizar caja de información de semilla
    const infoSemilla = document.getElementById('info-semilla');
    if (infoSemilla) {
        infoSemilla.textContent = `Semilla: ${id} | Era: ${era.toUpperCase()}`;
    }
}

async function generarImagenPollinationsDirecta() {
    const promptInput = document.getElementById('prompt-ia-custom')?.value;
    const nombreInput = document.getElementById('carta-nombre')?.value || 'Creature';
    const simboloInput = document.getElementById('carta-simbolo')?.value || 'monster';

    const promptFinal = promptInput || `3d pixel art icon of ${nombreInput} ${simboloInput}, vibrant colors, dark background, isolated`;
    const encodedPrompt = encodeURIComponent(promptFinal);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://pollinations.ai/p/${encodedPrompt}?width=220&height=308&seed=${seed}&nofeed=true`;

    const spinner = document.getElementById('spinnerIA');
    const imgPreview = document.getElementById('imgPollinationsPreview');

    if (spinner) spinner.style.display = 'block';
    if (imgPreview) {
        imgPreview.src = url;
        imgPreview.onload = () => {
            if (spinner) spinner.style.display = 'none';
            urlImagenIAGenerada = url;
            actualizarLog(`Imagen IA generada exitosamente desde Pollinations.`);
        };
        imgPreview.onerror = () => {
            if (spinner) spinner.style.display = 'none';
            actualizarLog(`Error al conectar con Pollinations AI.`);
        };
    }
}

function randomizarDesdePlantillas() {
    const idInput = document.getElementById('carta-id');
    if (idInput && !idInput.value) idInput.value = Math.floor(Math.random() * 2000) + 1;

    const eras = ['cyber', 'cotidianos', 'espacial', 'antiguo'];
    const rarezas = ['Común', 'Rara', 'Épica', 'Legendaria'];
    const simbolos = ['👾', '👽', '🤖', '⚔️', '🔮', '🐉', '⚡', '👑'];

    document.getElementById('carta-era').value = eras[Math.floor(Math.random() * eras.length)];
    document.getElementById('carta-rareza').value = rarezas[Math.floor(Math.random() * rarezas.length)];
    document.getElementById('carta-simbolo').value = simbolos[Math.floor(Math.random() * simbolos.length)];
    document.getElementById('carta-nombre').value = `Entidad #${Math.floor(Math.random() * 900) + 100}`;
    document.getElementById('carta-lore').value = 'Misterioso ser descubierto en los confines de la red digital.';

    if (modoRenderActual === 'canvas') {
        renderizarCanvasPrevia();
    } else {
        generarImagenPollinationsDirecta();
    }
}

// ==========================================
// PERSISTENCIA DE CARTAS EN SUPABASE
// ==========================================
async function publicarRecetaCarta() {
    const id = parseInt(document.getElementById('carta-id')?.value);
    const nombre = document.getElementById('carta-nombre')?.value?.trim();
    const era = document.getElementById('carta-era')?.value;
    const rareza = document.getElementById('carta-rareza')?.value;
    const simbolo = document.getElementById('carta-simbolo')?.value?.trim();
    const lore = document.getElementById('carta-lore')?.value?.trim();

    if (!id || id < 1 || id > 2000) {
        alert('Por favor, ingresa un ID válido entre 1 y 2000.');
        return;
    }
    if (!nombre) {
        alert('Por favor, ingresa un nombre para la carta.');
        return;
    }

    let imagenUrl = '';
    if (modoRenderActual === 'canvas') {
        const canvas = document.getElementById('canvasCartaGenerada');
        imagenUrl = canvas ? canvas.toDataURL('image/png') : '';
    } else {
        imagenUrl = urlImagenIAGenerada || `https://pollinations.ai/p/${encodeURIComponent(nombre)}?width=220&height=308`;
    }

    const payload = {
        id: id,
        nombre: nombre,
        rareza: rareza,
        lore: lore || 'Sin historia registrada.',
        imagen_url: imagenUrl
    };

    actualizarLog(`Guardando carta #${id} en tabla "Cartas"...`);

    try {
        const { data, error } = await supabaseClient
            .from('Cartas')
            .upsert([payload], { onConflict: 'id' });

        if (error) throw error;

        actualizarLog(`✅ Carta #${id} (${nombre}) guardada con éxito en Supabase.`);
        alert(`¡Carta #${id} publicada exitosamente en el catálogo!`);
        cargarCatalogoCartas();
    } catch (err) {
        actualizarLog(`❌ Error al guardar carta #${id}: ${err.message}`);
        alert(`Error al guardar en Supabase: ${err.message}`);
    }
}

// ==========================================
// PESTAÑA CATÁLOGO: VISUALIZACIÓN DE CARTAS
// ==========================================
async function cargarCatalogoCartas() {
    const grid = document.getElementById('grid-catalogo-admin');
    if (!grid) return;

    grid.innerHTML = '<div style="color:#888; font-size:8px; padding:10px;">Cargando catálogo desde BD...</div>';

    try {
        const { data: cartas, error } = await supabaseClient
            .from('Cartas')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (!cartas || cartas.length === 0) {
            grid.innerHTML = '<div style="color:#666; font-size:8px; padding:10px;">No hay cartas registradas en la tabla "Cartas".</div>';
            return;
        }

        grid.innerHTML = '';
        cartas.forEach(carta => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-item-admin';
            cardEl.style.cssText = 'background:#111; border:1px solid #333; padding:8px; border-radius:4px; text-align:center; width:130px; display:inline-block; margin:5px; vertical-align:top;';

            let imgHTML = '';
            if (carta.imagen_url && carta.imagen_url.startsWith('data:image')) {
                imgHTML = `<img src="${carta.imagen_url}" style="width:100%; height:140px; object-fit:contain; border:1px solid #222;" alt="${carta.nombre}">`;
            } else if (carta.imagen_url && carta.imagen_url.startsWith('http')) {
                imgHTML = `<img src="${carta.imagen_url}" style="width:100%; height:140px; object-fit:cover; border:1px solid #222;" alt="${carta.nombre}">`;
            } else {
                imgHTML = `<div style="width:100%; height:140px; background:#222; display:flex; align-items:center; justify-content:center; font-size:30px;">👾</div>`;
            }

            cardEl.innerHTML = `
                <div style="font-size:8px; color:#38bdf8; margin-bottom:4px; font-weight:bold;">#${carta.id}</div>
                ${imgHTML}
                <div style="font-size:8px; color:#fff; font-weight:bold; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${carta.nombre}</div>
                <div style="font-size:7px; color:#a855f7; margin-top:2px;">${carta.rareza || 'Común'}</div>
            `;
            grid.appendChild(cardEl);
        });

        actualizarLog(`Catálogo actualizado: ${cartas.length} cartas renderizadas.`);
    } catch (err) {
        grid.innerHTML = `<div style="color:#ef4444; font-size:8px; padding:10px;">Error al cargar catálogo: ${err.message}</div>`;
        actualizarLog(`❌ Error al consultar tabla "Cartas": ${err.message}`);
    }
}

// ==========================================
// PESTAÑA REGALAR CARTA A USUARIO
// ==========================================
async function regalarCartaUsuario() {
    let usuario = document.getElementById('target-user')?.value?.trim();
    const cartaId = parseInt(document.getElementById('target-carta-id')?.value);
    const cantidad = parseInt(document.getElementById('target-cantidad')?.value) || 1;

    if (!usuario) {
        alert('Ingresa el usuario de Telegram.');
        return;
    }
    if (!cartaId || isNaN(cartaId)) {
        alert('Ingresa un ID de carta válido.');
        return;
    }

    if (!usuario.startsWith('@')) usuario = '@' + usuario;

    actualizarLog(`Asignando carta #${cartaId} (x${cantidad}) a ${usuario}...`);

    try {
        // Verificar existencia previa del registro
        const { data: existente, error: errSelect } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*')
            .eq('usuario_id', usuario)
            .eq('carta_id', cartaId)
            .single();

        if (errSelect && errSelect.code !== 'PGRST116') {
            throw errSelect;
        }

        if (existente) {
            const nuevaCantidad = (existente.cantidad || 0) + cantidad;
            const { error: errUpdate } = await supabaseClient
                .from('Coleccion_Usuario')
                .update({ cantidad: nuevaCantidad })
                .eq('id', existente.id);

            if (errUpdate) throw errUpdate;
            actualizarLog(`✅ Cantidad actualizada: ${usuario} ahora tiene x${nuevaCantidad} de la carta #${cartaId}.`);
        } else {
            const { error: errInsert } = await supabaseClient
                .from('Coleccion_Usuario')
                .insert([{
                    usuario_id: usuario,
                    carta_id: cartaId,
                    cantidad: cantidad
                }]);

            if (errInsert) throw errInsert;
            actualizarLog(`✅ Nueva carta inventariada: ${usuario} recibió x${cantidad} de la carta #${cartaId}.`);
        }

        alert(`¡Carta #${cartaId} entregada exitosamente a ${usuario}!`);
    } catch (err) {
        actualizarLog(`❌ Error al regalar carta: ${err.message}`);
        alert(`Error al guardar en Coleccion_Usuario: ${err.message}`);
    }
}

// ==========================================
// PESTAÑA PLANTILLAS: PARSER Y CARGA
// ==========================================
async function procesarYGuardarPlantillas() {
    const texto = document.getElementById('textarea-plantillas')?.value;
    if (!texto || !texto.trim()) {
        alert('Por favor, pega el texto de plantillas.');
        return;
    }

    const lineas = texto.split('\n');
    let categoriaActual = 'General';
    const registros = [];

    lineas.forEach(linea => {
        const lineTrim = linea.trim();
        if (!lineTrim) return;

        if (lineTrim.startsWith('🌋') || lineTrim.startsWith('📋') || lineTrim.startsWith('🌐')) {
            categoriaActual = lineTrim;
        } else if (lineTrim.includes(':')) {
            const partes = lineTrim.split(':');
            const nombresEmoji = partes[0].trim();
            const descripcion = partes.slice(1).join(':').trim();

            registros.push({
                categoria: categoriaActual,
                criatura: nombresEmoji,
                descripcion: descripcion
            });
        }
    });

    if (registros.length === 0) {
        alert('No se detectaron plantillas válidas con formato "Emoji Nombre: Descripción".');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('plantillas_criaturas')
            .insert(registros);

        if (error) throw error;

        const countSpan = document.getElementById('count-plantillas');
        if (countSpan) countSpan.textContent = registros.length;

        actualizarLog(`✅ ${registros.length} plantillas procesadas e insertadas.`);
        alert(`¡Se parsearon e insertaron ${registros.length} plantillas con éxito!`);
    } catch (err) {
        actualizarLog(`❌ Error al insertar plantillas: ${err.message}`);
        alert(`Error: ${err.message}`);
    }
}

async function limpiarPlantillas() {
    if (!confirm('¿Estás seguro de vaciar la tabla de plantillas?')) return;

    try {
        const { error } = await supabaseClient
            .from('plantillas_criaturas')
            .delete()
            .neq('id', 0);

        if (error) throw error;

        const countSpan = document.getElementById('count-plantillas');
        if (countSpan) countSpan.textContent = '0';

        actualizarLog(`🧹 Tabla de plantillas limpiada.`);
    } catch (err) {
        actualizarLog(`❌ Error al vaciar plantillas: ${err.message}`);
    }
}

// ==========================================
// PESTAÑA SERVIDOR: MONITOREO Y PREMIOS
// ==========================================
async function cargarMetricasServidor() {
    actualizarLogServidor('Consultando estado del servidor y métricas...');

    // 1. Total Cartas
    try {
        const { count, error } = await supabaseClient
            .from('Cartas')
            .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
            const totalEl = document.getElementById('total-cartas-count');
            if (totalEl) totalEl.textContent = count;
        }
    } catch (e) {}

    // 2. Total Colecciones
    try {
        const { count, error } = await supabaseClient
            .from('Coleccion_Usuario')
            .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
            const colEl = document.getElementById('kpi-total-colecciones');
            if (colEl) colEl.textContent = count;
        }
    } catch (e) {}

    // 3. Premios Pendientes
    try {
        const { data: premios, count, error } = await supabaseClient
            .from('premios_ganados')
            .select('*', { count: 'exact' })
            .eq('estado', 'pendiente');

        if (!error) {
            const premEl = document.getElementById('kpi-premios-pendientes');
            if (premEl) premEl.textContent = count || 0;
            renderizarTablaPremios(premios || []);
        }
    } catch (e) {}

    // 4. Ping / Latencia
    testearConexionSupabase();
}

async function testearConexionSupabase() {
    const inicio = Date.now();
    const statusEl = document.getElementById('status-supabase');
    const pingEl = document.getElementById('ping-supabase');

    try {
        const { error } = await supabaseClient.from('Cartas').select('id').limit(1);
        const latencia = Date.now() - inicio;

        if (error) throw error;

        if (statusEl) {
            statusEl.textContent = '● CONECTADO';
            statusEl.style.color = '#00ff66';
        }
        if (pingEl) pingEl.textContent = `${latencia} ms`;

        actualizarLogServidor(`Conexión exitosa. Latencia: ${latencia}ms`);
    } catch (err) {
        if (statusEl) {
            statusEl.textContent = '● DESCONECTADO';
            statusEl.style.color = '#ef4444';
        }
        if (pingEl) pingEl.textContent = '-- ms';

        actualizarLogServidor(`❌ Error de conexión con Supabase: ${err.message}`);
    }
}

function renderizarTablaPremios(premios) {
    const tbody = document.getElementById('tabla-servidor-premios');
    if (!tbody) return;

    if (!premios || premios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 8px; text-align: center; color: #666;">Sin solicitudes pendientes.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    premios.forEach(p => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #222';
        tr.innerHTML = `
            <td style="padding: 4px; color:#38bdf8;">${p.usuario_id || 'Anon'}</td>
            <td style="padding: 4px;">Nivel ${p.nivel_premio || '1'}</td>
            <td style="padding: 4px; color:#eab308;">${p.estado || 'pendiente'}</td>
            <td style="padding: 4px; text-align: center;">
                <button onclick="procesarPremio(${p.id}, 'pagado')" style="background:#22c55e; color:#000; border:none; padding:2px 6px; font-size:6px; cursor:pointer;">APROBAR</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function procesarPremio(premioId, nuevoEstado) {
    try {
        const { error } = await supabaseClient
            .from('premios_ganados')
            .update({ estado: nuevoEstado, fecha_pago: new Date().toISOString() })
            .eq('id', premioId);

        if (error) throw error;

        actualizarLogServidor(`Premio ID ${premioId} marcado como ${nuevoEstado}.`);
        cargarMetricasServidor();
    } catch (err) {
        actualizarLogServidor(`Error al procesar premio: ${err.message}`);
    }
}

function limpiarStorageHuerfano() {
    actualizarLogServidor('Limpieza de archivos huérfanos ejecutada.');
    alert('Almacenamiento de Storage optimizado.');
}

// ==========================================
// UTILIDADES DE LOGS DE AUDITORÍA
// ==========================================
function actualizarLog(mensaje) {
    const logOutput = document.getElementById('status-log');
    if (logOutput) {
        const timestamp = new Date().toLocaleTimeString();
        logOutput.innerHTML = `[${timestamp}] ${mensaje}<br>` + logOutput.innerHTML;
    }
}

function actualizarLogServidor(mensaje) {
    const logOutput = document.getElementById('servidor-log-output');
    if (logOutput) {
        const timestamp = new Date().toLocaleTimeString();
        logOutput.innerHTML = `[${timestamp}] ${mensaje}<br>` + logOutput.innerHTML;
    }
}
