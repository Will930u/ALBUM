// =============================================================================
// 💻 CONSOLA DE ADMINISTRACIÓN Y CONTROL CENTRALIZADO (TELEGRAM MINI APP)
// =============================================================================

// 1. CONFIGURACIÓN DE CONEXIÓN CON SUPABASE
const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicialización de componentes al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
    configurarFormularioCargaCartas();
    configurarBotonRegalosManuales();
    await cargarTransaccionesPendientesEscrow();
});

// =============================================================================
// 🎛️ 1. NAVEGACIÓN Y CONTROLADORES DE INTERFAZ (SPA)
// =============================================================================

function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(seccion => {
        seccion.classList.remove('activa');
    });
    document.querySelectorAll('.tab-btn').forEach(boton => {
        boton.classList.remove('activo');
    });

    const pestanaObjetivo = document.getElementById(idPestana);
    if (pestanaObjetivo) {
        pestanaObjetivo.classList.add('activa');
    }

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('activo');
    }
}

function conmutarCamposFormulario(modo) {
    const bloqueEstadisticas = document.getElementById('bloque-estadisticas-manuales');
    if (!bloqueEstadisticas) return;
    
    if (modo === "LISTA") {
        bloqueEstadisticas.style.display = "none";
    } else {
        bloqueEstadisticas.style.display = "block";
    }
}

// =============================================================================
// 📤 2. PUBLICACIÓN DE CARTAS Y GESTIÓN MULTIMEDIA EN LA NUBE
// =============================================================================

function configurarFormularioCargaCartas() {
    const formCarga = document.getElementById('form-subir-carta');
    if (!formCarga) return;

    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputArchivo = document.getElementById('carta-archivo-jpg');
        if (!inputArchivo || inputArchivo.files.length === 0) {
            alert("❌ Debes seleccionar un archivo de imagen JPG o PNG para la criatura.");
            return;
        }

        const archivoFoto = inputArchivo.files[0];
        const modoCarga = document.getElementById('modo-diseno-carta') ? document.getElementById('modo-diseno-carta').value : "NORMAL";
        const nombreArchivoUnico = `${Date.now()}_${archivoFoto.name.replace(/\s+/g, '_')}`;

        try {
            alert("🛰️ Transmitiendo imagen a la nube de Supabase...");

            // Subida de imagen al Bucket 'imagenes_cartas'
            const { data: datosSubida, error: errorSubida } = await supabaseClient
                .storage
                .from('imagenes_cartas')
                .upload(nombreArchivoUnico, archivoFoto, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (errorSubida) throw errorSubida;

            // Obtención de URL Pública
            const { data: urlPublica } = supabaseClient
                .storage
                .from('imagenes_cartas')
                .getPublicUrl(nombreArchivoUnico);

            const urlFinalDeLaImagen = urlPublica.publicUrl;

            // Estructuración de datos
            let datosCarta = {
                nombre: document.getElementById('carta-nombre').value.trim(),
                rareza: document.getElementById('carta-rareza').value,
                imagen_url: urlFinalDeLaImagen
            };

            if (modoCarga === "NORMAL") {
                datosCarta.tipo = document.getElementById('carta-tipo').value;
                datosCarta.salud = parseInt(document.getElementById('carta-salud').value) || 100;
                datosCarta.poder = parseInt(document.getElementById('carta-poder').value) || 50;
                datosCarta.ataque = document.getElementById('carta-ataque').value.trim();
                datosCarta.habitat = document.getElementById('carta-habitat').value.trim();
                datosCarta.lore = document.getElementById('carta-lore').value.trim();
            } else {
                datosCarta.tipo = "azul";
                datosCarta.salud = 0;
                datosCarta.poder = 0;
                datosCarta.ataque = "Diseño Externo";
                datosCarta.habitat = "Render Global";
                datosCarta.lore = "Imagen completa renderizada de forma externa.";
            }

            // Inserción en catálogo de la base de datos
            const { data: registroInsertado, error: errorInsertar } = await supabaseClient
                .from('Cartas')
                .insert([datosCarta])
                .select();

            if (errorInsertar) throw errorInsertar;

            alert(`✅ ¡CRIATURA PUBLICADA!\nImagen guardada en la nube con éxito.\nID Asignado: #${registroInsertado[0].id}`);
            formCarga.reset();

        } catch (error) {
            console.error("Error en carga multimedia:", error);
            alert("❌ ERROR AL SUBIR MULTIMEDIA: " + error.message);
        }
    });
}

// =============================================================================
// 🎁 3. INYECCIÓN MANUAL Y DROPS DE CARTAS A USUARIOS (TELEGRAM ID)
// =============================================================================

function configurarBotonRegalosManuales() {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    if (!btnRegalo) return;

    btnRegalo.addEventListener('click', async () => {
        const idUsuario = document.getElementById('regalo-usuario-id').value.trim();
        const tipoRegalo = document.getElementById('regalo-tipo-seleccion').value;
        const idCarta = parseInt(document.getElementById('regalo-carta-id').value);
        const cantidad = parseInt(document.getElementById('regalo-cantidad').value) || 1;

        if (!idUsuario) return alert("❌ Introduce el ID de Telegram del jugador.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (isNaN(idCarta)) return alert("❌ Especifica un ID de carta válido.");
                
                await procesarAsignacionEnInventario(idUsuario, idCarta, cantidad);
                alert(`🎁 Drop exitoso: ${cantidad} copia(s) de la carta #${idCarta} enviadas a [${idUsuario}].`);
            } else {
                const { data: pool } = await supabaseClient.from('Cartas').select('id');
                if (!pool || pool.length === 0) return alert("❌ Catálogo de cartas vacío.");

                for (let i = 0; i < cantidad; i++) {
                    const randomIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[randomIdx].id, 1);
                }
                alert(`🎁 Drop sorpresa exitoso: ${cantidad} carta(s) al azar inyectadas a [${idUsuario}].`);
            }

            if (document.getElementById('regalo-carta-id')) {
                document.getElementById('regalo-carta-id').value = "";
            }
        } catch (error) {
            console.error("Error en asignación manual:", error);
            alert("❌ ERROR EN DROP: " + error.message);
        }
    });
}

async function procesarAsignacionEnInventario(idUser, idCard, cant) {
    const { data: existente } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('usuario_id', idUser)
        .eq('carta_id', idCard)
        .maybeSingle();

    if (existente) {
        await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: existente.cantidad + cant })
            .eq('id', existente.id);
    } else {
        await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ usuario_id: idUser, carta_id: idCard, cantidad: cant }]);
    }
}

// =============================================================================
// ⚖️ 4. VERIFICACIÓN BANCARIA ESCROW Y VERIFICACIÓN DE PAGOS
// =============================================================================

async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#00ff66;text-align:center;">REVISANDO REPORTES BANCARIOS...</td></tr>`;

    try {
        const { data: registros, error } = await supabaseClient
            .from('Pagos_Pendientes')
            .select('*')
            .eq('estatus', 'PENDIENTE')
            .order('id', { ascending: false });

        if (error) throw error;

        tablaCuerpo.innerHTML = "";

        if (!registros || registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">NO HAY PAGOS PENDIENTES DE REVISIÓN</td></tr>`;
            return;
        }

        registros.forEach(pago => {
            const fila = document.createElement('tr');
            const bruto = parseFloat(pago.monto_usd);
            const comision = bruto * 0.10;
            const neto = bruto - comision;

            fila.innerHTML = `
                <td>#${pago.id}</td>
                <td style="color:#00ff66;">$${bruto.toFixed(2)}</td>
                <td style="color:#ffcc00;">$${comision.toFixed(2)}</td>
                <td>$${neto.toFixed(2)}</td>
                <td>
                    <button class="btn-aprobar-p2p" onclick="validarYEntregarSobresBancarios(${pago.id}, '${pago.usuario_id}', ${bruto})">VALIDAR</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });

    } catch (err) {
        console.error("Error cargando transacciones:", err);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#ff3333;text-align:center;">ERROR CONECTANDO CON EL SERVIDOR</td></tr>`;
    }
}

async function validarYEntregarSobresBancarios(pagoId, idJugador, montoUsd) {
    if (!confirm(`¿Confirmas que el Pago Móvil del reporte #${pagoId} fue verificado en tu banco?`)) return;

    try {
        // 1. Actualizar estatus en Pagos_Pendientes
        const { error: errUpdate } = await supabaseClient
            .from('Pagos_Pendientes')
            .update({ estatus: 'APROBADO' })
            .eq('id', pagoId);

        if (errUpdate) throw errUpdate;

        // 2. Calcular entrega de sobres
        const cantidadSobresComprados = Math.max(Math.floor(montoUsd / 0.62), 1);
        
        const { data: pool } = await supabaseClient.from('Cartas').select('id');
        if (pool && pool.length > 0) {
            for (let i = 0; i < (cantidadSobresComprados * 3); i++) {
                const rIdx = Math.floor(Math.random() * pool.length);
                await procesarAsignacionEnInventario(idJugador, pool[rIdx].id, 1);
            }
        }

        alert(`💰 ¡REPORTE #${pagoId} APROBADO CON ÉXITO!\nSe inyectaron ${cantidadSobresComprados * 3} cartas en el inventario de [${idJugador}].`);
        await cargarTransaccionesPendientesEscrow();

    } catch (error) {
        console.error("Error aprobando pago:", error);
        alert("❌ Error procesando aprobación: " + error.message);
    }
}

// =============================================================================
// 🗑️ 5. ELIMINACIÓN PERMANENTE DE CARTAS Y ARCHIVOS EN LA NUBE
// =============================================================================

async function destruirCartaYMultimediaGlobal() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Introduce un ID numérico válido.");

    if (!confirm(`⚠ ATENCIÓN ⚠\n¿Confirmas la eliminación permanente de la carta #${idCarta} y su archivo en la nube?`)) return;

    try {
        const { data: carta, error: errGet } = await supabaseClient
            .from('Cartas')
            .select('imagen_url')
            .eq('id', idCarta)
            .maybeSingle();

        if (errGet) throw errGet;
        if (!carta) return alert("❌ Esa carta no existe en la base de datos.");

        // Limpieza de imagen en Storage
        if (carta.imagen_url) {
            const partesUrl = carta.imagen_url.split('/imagenes_cartas/');
            if (partesUrl.length > 1) {
                const nombreArchivoNube = partesUrl[1];
                await supabaseClient.storage.from('imagenes_cartas').remove([nombreArchivoNube]);
            }
        }

        // Eliminación de registro en BD
        const { error: errDelete } = await supabaseClient
            .from('Cartas')
            .delete()
            .eq('id', idCarta);

        if (errDelete) throw errDelete;

        alert(`🗑️ Carta #${idCarta} y su archivo multimedia eliminados correctamente.`);
        inputId.value = "";

    } catch (error) {
        console.error("Error en eliminación:", error);
        alert("❌ FALLO EN ELIMINACIÓN: " + error.message);
    }
}
