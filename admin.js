// =============================================================================
// 💻 PANEL DE CONTROL SUPREMO CENTRALIZADO - LOGICA DE OPERACIONES (ADMIN)
// =============================================================================

// Credenciales de conexión oficiales sincronizadas
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Escuchar el evento de carga de cartas nuevas
    configurarFormularioCargaCartas();
    
    // Escuchar el evento de drops y regalos manuales
    configurarBotonRegalosManuales();
    
    // Cargar en vivo la lista de pagos de Pago Móvil pendientes de la pestaña ESCROW
    await cargarTransaccionesPendientesEscrow();
});

// =============================================================================
// 🎛️ 1. CONTROLADOR SPA: CAMBIO INTERACTIVO DE PESTAÑAS Y INTERRUPTOR DE MODO
// =============================================================================
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(seccion => {
        seccion.classList.remove('activa');
    });
    document.querySelectorAll('.tab-btn').forEach(boton => {
        boton.classList.remove('activo');
    });

    document.getElementById(idPestana).classList.add('activa');
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('activo');
    }
}

function conmutarCamposFormulario(modo) {
    const bloqueEstadisticas = document.getElementById('bloque-estadisticas-manuales');
    if (!bloqueEstadisticas) return;
    
    if (modo === "LISTA") {
        bloqueEstadisticas.style.display = "none"; // Oculta HP, ATK y Lore si subes el diseño externo final
    } else {
        bloqueEstadisticas.style.display = "block"; // Muestra los campos para estructurar por código
    }
}
// =============================================================================
// 📤 2. LÓGICA DE CARGA: PUBLICAR NUEVAS CRIATURAS (DUAL: MANUAL O ARTE FINAL)
// =============================================================================
function configurarFormularioCargaCartas() {
    const formCarga = document.getElementById('form-subir-carta');
    if (!formCarga) return;

    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Recuperar el archivo físico seleccionado por el administrador
        const inputArchivo = document.getElementById('carta-archivo-jpg');
        if (!inputArchivo || inputArchivo.files.length === 0) {
            alert("❌ ERROR: Debes seleccionar un archivo de imagen JPG o PNG para la criatura.");
            return;
        }

        const archivoFoto = inputArchivo.files[0];
        const modoCarga = document.getElementById('modo-diseno-carta') ? document.getElementById('modo-diseno-carta').value : "NORMAL";
        
        // Inventar un nombre de archivo único para que no se machaquen las fotos en la nube
        const nombreArchivoUnico = `${Date.now()}_${archivoFoto.name.replace(/\s+/g, '_')}`;

        try {
            alert("🛰️ Transmitiendo imagen a la nube de Supabase... Por favor espera.");

            // 2. Subir el archivo JPG/PNG al Storage de Supabase de forma directa
            const { data: datosSubida, error: errorSubida } = await supabaseClient
                .storage
                .from('imagenes_cartas')
                .upload(nombreArchivoUnico, archivoFoto, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (errorSubida) throw errorSubida;

            // 3. Obtener la URL pública que generó el servidor para esa foto
            const { data: urlPublica } = supabaseClient
                .storage
                .from('imagenes_cartas')
                .getPublicUrl(nombreArchivoUnico);

            const urlFinalDeLaImagen = urlPublica.publicUrl;
            console.log("🔗 Imagen guardada con éxito en la nube. URL pública:", urlFinalDeLaImagen);

            // 4. Evaluar el modo seleccionado para estructurar el registro final de datos
            let datosCarta = {
                nombre: document.getElementById('carta-nombre').value.trim(),
                rareza: document.getElementById('carta-rareza').value,
                url_imagen: urlFinalDeLaImagen
            };

            if (modoCarga === "NORMAL") {
                // Modo Ficha Técnica: Mantiene los textos e inyecta las estadísticas mapeadas
                datosCarta.tipo = document.getElementById('carta-tipo').value;
                datosCarta.salud = parseInt(document.getElementById('carta-salud').value) || 100;
                datosCarta.poder = parseInt(document.getElementById('carta-poder').value) || 50;
                datosCarta.ataque_nombre = document.getElementById('carta-ataque').value.trim();
                datosCarta.habitat = document.getElementById('carta-habitat').value.trim();
                datosCarta.lore = document.getElementById('carta-lore').value.trim();
            } else {
                // Modo Imagen Lista: Configura flags especiales para saltarse los textos sobrepuestos
                datosCarta.tipo = "ArteFinal";
                datosCarta.salud = 0;
                datosCarta.poder = 0;
                datosCarta.ataque_nombre = "DiseñoExterno";
                datosCarta.habitat = "Galaxia_Render";
                datosCarta.lore = "Imagen completa renderizada por el Administrador de forma externa.";
            }

            // 5. Insertar la criatura en el catálogo global de tu tabla de Supabase
            const { data: registroInsertado, error: errorInsertar } = await supabaseClient
                .from('Cartas')
                .insert([datosCarta])
                .select();

            if (errorInsertar) throw errorInsertar;

            alert(`✅ ¡ÉXITO MAESTRO!\nLa imagen se subió a la nube y la criatura fue publicada con éxito.\nID Asignado: #${registroInsertado[0].id_carta}`);
            formCarga.reset();

        } catch (error) {
            console.error("Fallo crítico en el cargador multimedia:", error);
            alert("❌ ERROR AL SUBIR MULTIMEDIA: " + error.message);
        }
    });
}

// =============================================================================
// 🎁 3. LÓGICA DE REGALOS: DROPS MANUALES Y SORPRESAS POR TELEGRAM ID
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
                // Modo Aleatorio: Elegir cartas al azar del pool disponible
                const { data: pool } = await supabaseClient.from('Cartas').select('id_carta');
                if (!pool || pool.length === 0) return alert("❌ Catálogo vacío.");

                for (let i = 0; i < cantidad; i++) {
                    const randomIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[randomIdx].id_carta, 1);
                }
                alert(`🎁 Drop sorpresa exitoso: ${cantidad} cartas al azar inyectadas a [${idUsuario}].`);
            }
            if (document.getElementById('regalo-carta-id')) document.getElementById('regalo-carta-id').value = "";
        } catch (error) {
            console.error(error);
            alert("❌ ERROR EN DROP: " + error.message);
        }
    });
}

async function procesarAsignacionEnInventario(idUser, idCard, cant) {
    const { data: existente } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('id_usuario', idUser)
        .eq('id_carta', idCard)
        .maybeSingle();

    if (existente) {
        await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: existente.cantidad + cant })
            .eq('id_registro', existente.id_registro);
    } else {
        await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ id_usuario: idUser, id_carta: idCard, cantidad: cant }]);
    }
}
// =============================================================================
// ⚖️ 4. LOGICA: AUDITORÍA ESCROW Y APROBACIÓN DE PAGO MÓVIL (BOLÍVARES)
// =============================================================================
async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#00ff66;text-align:center;">REVISANDO REPORTES BANCARIOS...</td></tr>`;

    try {
        const { data: registros, error } = await supabaseClient
            .from('Historial_Subastas_Liquidadas')
            .select('*')
            .eq('estado_pago', 'PENDIENTE')
            .order('id_lote', { ascending: false });

        if (error) throw error;

        tablaCuerpo.innerHTML = "";

        if (!registros || registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">NO HAY PAGOS PENDIENTES EN EL BANCO</td></tr>`;
            return;
        }

        registros.forEach(lote => {
            const fila = document.createElement('tr');
            const bruto = parseFloat(lote.monto_bruto_usd);
            const comision = bruto * 0.10;
            const neto = bruto - comision;

            fila.innerHTML = `
                <td>#${lote.id_lote}</td>
                <td class="txt-verde">$${bruto.toFixed(2)}</td>
                <td class="txt-oro">$${comision.toFixed(2)}</td>
                <td>$${neto.toFixed(2)}</td>
                <td>
                    <button class="btn-aprobar-p2p" onclick="validarYEntregarSobresBancarios(${lote.id_lote}, '${lote.comprador_id}', ${bruto})">VALIDAR</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });

    } catch (err) {
        console.error(err);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#ff3333;text-align:center;">ERROR DE CONEXIÓN</td></tr>`;
    }
}

async function validarYEntregarSobresBancarios(idLote, idJugador, montoUsd) {
    const confirmar = confirm(`¿Confirmas que el Pago Móvil del lote #${idLote} ya está disponible en tu cuenta bancaria?`);
    if (!confirmar) return;

    try {
        // 1. Cambiar el estado del pago en Supabase de 'PENDIENTE' a 'VERIFICADO'
        const { error: errUpdate } = await supabaseClient
            .from('Historial_Subastas_Liquidadas')
            .update({ estado_pago: 'VERIFICADO' })
            .eq('id_lote', idLote);

        if (errUpdate) throw errUpdate;

        // 2. Calcular los sobres ganados ($0.62 por unidad) y ejecutar la apertura sorpresa
        const cantidadSobresComprados = Math.max(Math.floor(montoUsd / 0.62), 1);
        
        // Ejecuta el abridor de sobres inyectando las barajitas al azar directo a su inventario
        if (typeof ejecutarAperturaSobresSorpresa === 'function') {
            await ejecutarAperturaSobresSorpresa(idJugador, cantidadSobresComprados, 'Común');
        } else {
            // Drop de respaldo básico por si la librería no ha cargado
            const { data: pool } = await supabaseClient.from('Cartas').select('id_carta');
            if (pool && pool.length > 0) {
                for (let i = 0; i < (cantidadSobresComprados * 3); i++) {
                    const rIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idJugador, pool[rIdx].id_carta, 1);
                }
            }
        }

        alert(`💰 ¡LOTE DE PAGO MÓVIL #${idLote} VALIDADO EXITOSAMENTE!\nSe han procesado ${cantidadSobresComprados} sobre(s) al azar directo al álbum de [${idJugador}].`);
        await cargarTransaccionesPendientesEscrow();

    } catch (error) {
        console.error(error);
        alert("❌ Error al liquidar la transacción: " + error.message);
    }
}

// =============================================================================
// 🗑️ 5. LÓGICA DE DESTRUCTOR DE ACTIVOS GLOBAL (BORRA DE TABLA Y STORAGE)
// =============================================================================
async function destruirCartaYMultimediaGlobal() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Introduce un ID numérico de carta válido.");

    const confirmar = confirm(`⚠ ALERTA CRÍTICA ⚠\n¿Estás completamente seguro de borrar la carta #${idCarta} del catálogo?\nEsto eliminará su registro de Supabase y destruirá su imagen en la nube para siempre.`);
    if (!confirmar) return;

    try {
        // 1. Consultar la carta para obtener el nombre exacto de su archivo en la nube
        const { data: carta, error: errGet } = await supabaseClient
            .from('Cartas')
            .select('url_imagen')
            .eq('id_carta', idCarta)
            .maybeSingle();

        if (errGet) throw errGet;
        if (!carta) return alert("❌ ERROR: Ese ID de carta no existe en tu catálogo.");

        // Extraer el nombre relativo del archivo del enlace público
        const partesUrl = carta.url_imagen.split('/imagenes_cartas/');
        if (partesUrl.length > 1) {
            const nombreArchivoNube = partesUrl[1];
            console.log("🗑️ Borrando del Storage:", nombreArchivoNube);
            
            // Eliminar el archivo del Storage bucket de forma definitiva
            await supabaseClient.storage.from('imagenes_cartas').remove([nombreArchivoNube]);
        }

        // 2. Eliminar el registro de la tabla 'Cartas'
        const { error: errDelete } = await supabaseClient
            .from('Cartas')
            .delete()
            .eq('id_carta', idCarta);

        if (errDelete) throw errDelete;

        alert(`🗑️ ¡DEMOLICIÓN EXITOSA!\nLa carta #${idCarta} y su archivo multimedia han sido purgados por completo.`);
        inputId.value = "";

    } catch (error) {
        console.error(error);
        alert("❌ FALLO EN LA CONSOLA DE DESTRUCCIÓN: " + error.message);
    }
}
