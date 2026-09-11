// =============================================================================
// 💻 CONSOLA DE ADMINISTRACIÓN Y CONTROL CENTRALIZADO
// =============================================================================

const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpdam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    configurarFormularioCargaCartas();
    configurarBotonRegalosManuales();
    await cargarTransaccionesPendientesEscrow();
});

// NAVEGACIÓN SPA DE PESTAÑAS
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
    
    bloqueEstadisticas.style.display = (modo === "LISTA") ? "none" : "block";
}

// INYECCIÓN Y SUBIDA DE IMÁGENES
function configurarFormularioCargaCartas() {
    const formCarga = document.getElementById('form-subir-carta');
    if (!formCarga) return;

    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputArchivo = document.getElementById('carta-archivo-jpg');
        if (!inputArchivo || inputArchivo.files.length === 0) {
            alert("❌ Debes seleccionar una imagen para la carta.");
            return;
        }

        const archivoFoto = inputArchivo.files[0];
        const modoCarga = document.getElementById('modo-diseno-carta')?.value || "NORMAL";
        const nombreArchivoUnico = `${Date.now()}_${archivoFoto.name.replace(/\s+/g, '_')}`;

        try {
            alert("🛰️ Transmitiendo imagen a Supabase Storage...");

            const { data: datosSubida, error: errorSubida } = await supabaseClient
                .storage
                .from('imagenes_cartas')
                .upload(nombreArchivoUnico, archivoFoto, { cacheControl: '3600', upsert: false });

            if (errorSubida) throw errorSubida;

            const { data: urlPublica } = supabaseClient
                .storage
                .from('imagenes_cartas')
                .getPublicUrl(nombreArchivoUnico);

            let datosCarta = {
                nombre: document.getElementById('carta-nombre').value.trim(),
                rareza: document.getElementById('carta-rareza').value,
                imagen_url: urlPublica.publicUrl
            };

            if (modoCarga === "NORMAL") {
                datosCarta.tipo = document.getElementById('carta-tipo').value;
                datosCarta.salud = parseInt(document.getElementById('carta-salud').value) || 100;
                datosCarta.poder = parseInt(document.getElementById('carta-poder').value) || 50;
                datosCarta.ataque = document.getElementById('carta-ataque').value.trim();
                datosCarta.habitat = document.getElementById('carta-habitat').value.trim();
                datosCarta.lore = document.getElementById('carta-lore').value.trim();
            } else {
                datosCarta.tipo = "Tierra";
                datosCarta.salud = 0;
                datosCarta.poder = 0;
                datosCarta.ataque = "Diseño Externo";
                datosCarta.habitat = "Render Global";
                datosCarta.lore = "Imagen renderizada externamente.";
            }

            const { data: registroInsertado, error: errorInsertar } = await supabaseClient
                .from('Cartas')
                .insert([datosCarta])
                .select();

            if (errorInsertar) throw errorInsertar;

            alert(`✅ ¡CRIATURA PUBLICADA CON ÉXITO!\nID Asignado: #${registroInsertado[0].id}`);
            formCarga.reset();

        } catch (error) {
            console.error("Error en carga:", error);
            alert("❌ ERROR AL PUBLICAR: " + error.message);
        }
    });
}

// INYECCIÓN DE DROPS Y PREMIOS MANUALES
function configurarBotonRegalosManuales() {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    if (!btnRegalo) return;

    btnRegalo.addEventListener('click', async () => {
        const idUsuario = document.getElementById('regalo-usuario-id').value.trim();
        const tipoRegalo = document.getElementById('regalo-tipo-seleccion').value;
        const idCarta = parseInt(document.getElementById('regalo-carta-id').value);
        const cantidad = parseInt(document.getElementById('regalo-cantidad').value) || 1;

        if (!idUsuario) return alert("❌ Ingresa el ID del usuario.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (isNaN(idCarta)) return alert("❌ Especifica un ID numérico de carta válido.");
                await procesarAsignacionEnInventario(idUsuario, idCarta, cantidad);
                alert(`🎁 Drop exitoso: ${cantidad} copia(s) enviada(s) a [${idUsuario}].`);
            } else {
                const { data: pool } = await supabaseClient.from('Cartas').select('id');
                if (!pool || pool.length === 0) return alert("❌ No hay cartas en el catálogo.");

                for (let i = 0; i < cantidad; i++) {
                    const rIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[rIdx].id, 1);
                }
                alert(`🎁 Drop sorpresa completado: ${cantidad} carta(s) inyectada(s).`);
            }
        } catch (error) {
            console.error("Error en drop:", error);
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

// GESTIÓN Y VALIDACIÓN ESCROW BANCARIA
async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#00ff66;text-align:center;">CARGANDO REGISTROS...</td></tr>`;

    try {
        const { data: registros, error } = await supabaseClient
            .from('Pagos_Pendientes')
            .select('*')
            .eq('estatus', 'PENDIENTE')
            .order('id', { ascending: false });

        if (error) throw error;
        tablaCuerpo.innerHTML = "";

        if (!registros || registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">NO HAY PAGOS PENDIENTES</td></tr>`;
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
        console.error("Error cargando registros:", err);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#ff3333;text-align:center;">ERROR AL CONECTAR BBDD</td></tr>`;
    }
}

async function validarYEntregarSobresBancarios(pagoId, idJugador, montoUsd) {
    if (!confirm(`¿Confirmas la recepción en tu cuenta bancaria del Pago Móvil #${pagoId}?`)) return;

    try {
        const { error: errUpdate } = await supabaseClient
            .from('Pagos_Pendientes')
            .update({ estatus: 'APROBADO' })
            .eq('id', pagoId);

        if (errUpdate) throw errUpdate;

        const cantidadSobres = Math.max(Math.floor(montoUsd / 0.62), 1);
        const { data: pool } = await supabaseClient.from('Cartas').select('id');
        
        if (pool && pool.length > 0) {
            for (let i = 0; i < (cantidadSobres * 3); i++) {
                const rIdx = Math.floor(Math.random() * pool.length);
                await procesarAsignacionEnInventario(idJugador, pool[rIdx].id, 1);
            }
        }

        alert(`💰 ¡REPORTE #${pagoId} APROBADO!\nAsignadas ${cantidadSobres * 3} cartas al jugador [${idJugador}].`);
        await cargarTransaccionesPendientesEscrow();

    } catch (error) {
        console.error("Error al validar:", error);
        alert("❌ FALLO AL APROBAR: " + error.message);
    }
}

// FUNCIÓN GLOBAL DEL MÓDULO DESTRUCTOR DE ACTIVOS
window.destruirCartaYMultimediaGlobal = async function() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Introduce un ID numérico válido.");
    if (!confirm(`⚠ ELIMINACIÓN PERMANENTE ⚠\n¿Deseas destruir la carta #${idCarta} y su archivo asociado en la nube?`)) return;

    try {
        const { data: carta, error: errGet } = await supabaseClient
            .from('Cartas')
            .select('imagen_url')
            .eq('id', idCarta)
            .maybeSingle();

        if (errGet) throw errGet;
        if (!carta) return alert("❌ La carta no existe en la base de datos.");

        if (carta.imagen_url) {
            const partesUrl = carta.imagen_url.split('/imagenes_cartas/');
            if (partesUrl.length > 1) {
                const nombreArchivo = partesUrl[1];
                await supabaseClient.storage.from('imagenes_cartas').remove([nombreArchivo]);
            }
        }

        const { error: errDelete } = await supabaseClient
            .from('Cartas')
            .delete()
            .eq('id', idCarta);

        if (errDelete) throw errDelete;

        alert(`🗑️ Carta #${idCarta} y su archivo eliminado con éxito.`);
        inputId.value = "";

    } catch (error) {
        console.error("Error en eliminación:", error);
        alert("❌ ERROR EN ELIMINACIÓN: " + error.message);
    }
};
