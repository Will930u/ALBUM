// =============================================================================
// 💻 PANEL DE CONTROL SUPREMO CENTRALIZADO - LOGICA DE OPERACIONES (ADMIN)
// =============================================================================

// Credenciales de conexión (Asegúrate de cambiar esto por tus datos reales de Supabase)
const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
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
// 🎛️ 1. CONTROLADOR SPA: CAMBIO INTERACTIVO DE PESTAÑAS
// =============================================================================
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(seccion => {
        seccion.classList.remove('activa');
    });
    document.querySelectorAll('.tab-btn').forEach(boton => {
        boton.classList.remove('activo');
    });

    document.getElementById(idPestana).classList.add('activa');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('activo');
    }
}

// 📤 LÓGICA DE CARGA AUTOMATIZADA CON SUBIDA DE IMÁGENES JPG/PNG DIRECTAS
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
        // Inventar un nombre de archivo único para que no se machaquen las fotos en la nube
        const nombreArchivoUnico = `${Date.now()}_${archivoFoto.name.replace(/\s+/g, '_')}`;

        try {
            alert("🛰️ Subiendo imagen a la nube de Supabase... Por favor espera.");

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

            // 4. Armar el objeto final inyectándole la URL generada automáticamente
            const datosCarta = {
                nombre: document.getElementById('carta-nombre').value.trim(),
                tipo: document.getElementById('carta-tipo').value,
                salud: parseInt(document.getElementById('carta-salud').value) || 100,
                poder: parseInt(document.getElementById('carta-poder').value) || 50,
                ataque_nombre: document.getElementById('carta-ataque').value.trim(),
                habitat: document.getElementById('carta-habitat').value.trim(),
                rareza: document.getElementById('carta-rareza').value,
                lore: document.getElementById('carta-lore').value.trim(),
                url_imagen: urlFinalDeLaImagen // Se guarda el enlace generado solo
            };

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
        try {
            const { data, error } = await supabaseClient
                .from('Cartas')
                .insert([datosCarta])
                .select();

            if (error) throw error;

            alert(`✅ ¡ÉXITO CRÍTICO!\nCarta publicada en el catálogo global.\nID Asignado: #${data[0].id_carta}`);
            formCarga.reset();

        } catch (error) {
            console.error(error);
            alert("❌ ERROR DE INYECCIÓN: " + error.message);
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
            document.getElementById('regalo-carta-id').value = "";
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
// ⚖️ 4. NUEVA LOGICA: AUDITORÍA ESCROW Y APROBACIÓN DE PAGO MÓVIL (BOLÍVARES)
// =============================================================================
async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#00ff66;text-align:center;">REVISANDO REPORTES BANCARIOS...</td></tr>`;

    try {
        // Consultar de Supabase los registros de subastas/compras que estén en estado PENDIENTE
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

        // Dibujar las filas de la tabla de auditoría con estilo retro
        registros.forEach(lote => {
            const fila = document.createElement('tr');
            
            // Cálculos automáticos de comisiones en base al bruto recibido
            const bruto = parseFloat(lote.monto_bruto_usd);
            const comision = bruto * 0.10; // Tu regla fija del 10% de ganancia retenida
            const neto = bruto - comision;

            fila.innerHTML = `
                <td>#${lote.id_lote}</td>
                <td class="txt-verde">$${bruto.toFixed(2)}</td>
                <td class="txt-oro">$${comision.toFixed(2)}</td>
                <td>$${neto.toFixed(2)}</td>
                <td>
                    <button class="btn-aprobar-p2p" onclick="validarYEntregarSobresBancarios(${lote.id_lote}, '${lote.vendedor_id}', ${bruto})">VALIDAR</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });

    } catch (err) {
        console.error(err);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#ff3333;text-align:center;">ERROR DE CONEXIÓN</td></tr>`;
    }
}

// Función asociada al botón verde 'VALIDAR' de tu tabla
async function validarYEntregarSobresBancarios(idLote, idJugador, montoUsd) {
    // Ventana de confirmación técnica
    const confirmar = confirm(`¿Confirmas que el Pago Móvil del lote #${idLote} ya está disponible en tu cuenta bancaria?`);
    if (!confirmar) return;

    try {
        // 1. Cambiar el estado del pago en Supabase de 'PENDIENTE' a 'VERIFICADO'
        const { error: errUpdate } = await supabaseClient
            .from('Historial_Subastas_Liquidadas')
            .update({ estado_pago: 'VERIFICADO' })
            .eq('id_lote', idLote);

        if (errUpdate) throw errUpdate;

        // 2. Ejecutar el sorteo automático (lotería) para entregarle las cartas sorpresa al jugador
        // Convertimos el monto de dólares a cantidad aproximada de sobres ($0.62 por sobre)
        const cantidadSobresComprados = Math.max(Math.floor(montoUsd / 0.62), 1);
        
        // Llamar a la función del abridor de sobres que creamos en el paso previo
        await ejecutarAperturaSobresSorpresa(idJugador, cantidadSobresComprados, 'Común');

        alert(`💰 ¡LOTE DE PAGO MÓVIL # ${idLote} VALIDADO EXITOSAMENTE!\nSe han procesado ${cantidadSobresComprados} sobre(s) al azar directo al álbum de [${idJugador}].`);
        
        // 3. Recargar la tabla en vivo para borrar el registro aprobado de la lista
        await cargarTransaccionesPendientesEscrow();

    } catch (error) {
        console.error(error);
        alert("❌ Error al liquidar la transacción: " + error.message);
    }
}
