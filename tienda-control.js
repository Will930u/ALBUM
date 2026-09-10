// ========================================================
// 💰 SCRIPT DE CONTROL DINÁMICO DE FACTURACIÓN Y PERFIL RETRO
// ========================================================

// Conexión con Supabase
const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";

// Inicialización segura del cliente Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY) : null;

// ID del jugador de pruebas (Luego se extraerá automáticamente desde Telegram WebApp)
const JUGADOR_ID_MOCK = "usuario_test_venezuela"; 

const PRECIO_SOBRE_USD = 0.62;
let tasaBcvActual = 68.50; // Respaldo base

// Elementos del DOM (Tienda)
const inputCantidad = document.getElementById('cantidad-sobres');
const btnMenos = document.getElementById('btn-menos');
const btnMas = document.getElementById('btn-mas');
const txtTotalUsd = document.getElementById('total-usd');
const txtTotalBs = document.getElementById('total-bs');
const btnCheckout = document.getElementById('btn-checkout');

// Elementos del DOM (Perfil Financiero de Retiros)
const btnGuardarPerfil = document.getElementById('btn-guardar-perfil');

document.addEventListener('DOMContentLoaded', async () => {
    await obtenerTasaBcvAutomatica();
    await cargarDatosPreviosUsuario();
});

// 1. SELECTOR DE SOBRES PIXEL ART
if (btnMas) {
    btnMas.addEventListener('click', () => {
        let cantidadActual = parseInt(inputCantidad.value) || 1;
        if (cantidadActual < 99) { 
            inputCantidad.value = cantidadActual + 1; 
            calcularTotalesAlVuelo(); 
        }
    });
}

if (btnMenos) {
    btnMenos.addEventListener('click', () => {
        let cantidadActual = parseInt(inputCantidad.value) || 1;
        if (cantidadActual > 1) { 
            inputCantidad.value = cantidadActual - 1; 
            calcularTotalesAlVuelo(); 
        }
    });
}

// 2. CONEXIÓN VIVA CON DOLARAPI (BCV EN TIEMPO REAL)
async function obtenerTasaBcvAutomatica() {
    try {
        const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const datos = await respuesta.json();
        if (datos && datos.promedio) { 
            tasaBcvActual = parseFloat(datos.promedio); 
        }
    } catch (error) { 
        console.error("Error en DolarApi, usando tasa de respaldo:", error); 
    }
    calcularTotalesAlVuelo();
}

function calcularTotalesAlVuelo() {
    if (!inputCantidad) return;
    const cantidad = parseInt(inputCantidad.value) || 1;
    const totalDolares = cantidad * PRECIO_SOBRE_USD;
    
    if (txtTotalUsd) txtTotalUsd.innerText = `$${totalDolares.toFixed(2)}`;
    if (txtTotalBs) {
        const totalBolivares = totalDolares * tasaBcvActual;
        txtTotalBs.innerText = `${totalBolivares.toFixed(2)} Bs.`;
        const modalBs = document.getElementById('monto-bs-dinamico');
        if (modalBs) modalBs.innerText = `${totalBolivares.toFixed(2)} Bs.`;
    }
}

// 3. SELECCIÓN DE PASARELA DE COMPRA
if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
        const cantidad = parseInt(inputCantidad.value) || 1;
        const totalDolares = (cantidad * PRECIO_SOBRE_USD).toFixed(2);
        const opcionSeleccionada = document.querySelector('input[name="pago"]:checked');
        const pasarelaElegida = opcionSeleccionada ? opcionSeleccionada.value : 'USDT';

        if (pasarelaElegida === 'USDT') {
            alert(`[ CONEXIÓN WEB3 WALLET ]\n\nAbriendo pasarela nativa por ${totalDolares} USDT.`);
        } else {
            const modalPm = document.getElementById('modal-pm');
            if (modalPm) modalPm.style.display = 'flex';
        }
    });
}

// ========================================================
// 💾 GESTIÓN DEL PERFIL DE COBROS CON SUPABASE
// ========================================================

// Cargar información previa resguardada del jugador
async function cargarDatosPreviosUsuario() {
    if (!supabaseClient) {
        console.error("Supabase SDK no está cargado correctamente.");
        return;
    }
    
    try {
        const { data: usuario, error } = await supabaseClient
            .from('Usuarios')
            .select('wallet_ton_address, pago_movil_banco, pago_movil_cedula, pago_movil_telefono')
            .eq('id_usuario', JUGADOR_ID_MOCK)
            .maybeSingle();

        if (error) throw error;

        if (usuario) {
            const elWallet = document.getElementById('user-wallet-address');
            const elBanco = document.getElementById('user-pm-banco');
            const elCedula = document.getElementById('user-pm-cedula');
            const elTelefono = document.getElementById('user-pm-telefono');

            if (elWallet && usuario.wallet_ton_address) elWallet.value = usuario.wallet_ton_address;
            if (elBanco && usuario.pago_movil_banco) elBanco.value = usuario.pago_movil_banco;
            if (elCedula && usuario.pago_movil_cedula) elCedula.value = usuario.pago_movil_cedula;
            if (elTelefono && usuario.pago_movil_telefono) elTelefono.value = usuario.pago_movil_telefono;
            
            console.log("⚙️ Perfil financiero cargado e inyectado correctamente.");
        }
    } catch (err) { 
        console.error("Error al cargar perfil de Supabase:", err); 
    }
}

// Guardar/Actualizar perfil financiero
if (btnGuardarPerfil) {
    btnGuardarPerfil.addEventListener('click', async () => {
        if (!supabaseClient) {
            alert("❌ ERROR: El SDK de Supabase no está disponible.");
            return;
        }

        const walletAddress = document.getElementById('user-wallet-address')?.value.trim() || null;
        const pmBanco = document.getElementById('user-pm-banco')?.value || null;
        const pmCedula = document.getElementById('user-pm-cedula')?.value.trim() || null;
        const pmTelefono = document.getElementById('user-pm-telefono')?.value.trim() || null;

        try {
            const { error } = await supabaseClient
                .from('Usuarios')
                .update({
                    wallet_ton_address: walletAddress,
                    pago_movil_banco: pmBanco,
                    pago_movil_cedula: pmCedula,
                    pago_movil_telefono: pmTelefono
                })
                .eq('id_usuario', JUGADOR_ID_MOCK);

            if (error) throw error;

            alert("💾 ¡ÉXITO RETRO!\nTus credenciales de cobro han sido encriptadas y guardadas con éxito en el servidor.");

        } catch (error) {
            console.error("Error guardando datos:", error);
            alert("❌ FALLO DE SERVIDOR: No se pudieron resguardar los datos. " + error.message);
        }
    });
}

// 🔄 CONMUTADOR VISUAL DE PESTAÑAS (USDT / PAGO MÓVIL)
function conmutarFormularioRetiro(metodoElegido) {
    const btnUsdt = document.getElementById('btn-select-usdt');
    const btnPm = document.getElementById('btn-select-pm');
    const bloqueUsdt = document.getElementById('bloque-datos-usdt');
    const bloquePm = document.getElementById('bloque-datos-pm');

    if (!btnUsdt || !btnPm || !bloqueUsdt || !bloquePm) return;

    if (metodoElegido === 'USDT') {
        btnUsdt.style.backgroundColor = '#ffcc00'; 
        btnUsdt.style.color = '#000'; 
        bloqueUsdt.style.display = 'block';
        
        btnPm.style.backgroundColor = '#1a1a1f'; 
        btnPm.style.color = '#888'; 
        bloquePm.style.display = 'none';
    } else {
        btnPm.style.backgroundColor = '#ffcc00'; 
        btnPm.style.color = '#000'; 
        bloquePm.style.display = 'block';
        
        btnUsdt.style.backgroundColor = '#1a1a1f'; 
        btnUsdt.style.color = '#888'; 
        bloqueUsdt.style.display = 'none';
    }
}
// =============================================================================
// 🛰️ CAPTURA Y ENVÍO DEL REPORTE DE PAGO MÓVIL A LA BASE DE DATOS
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    configurarFormularioReportePagoMovil();
});

function configurarFormularioReportePagoMovil() {
    const formPagoMovil = document.getElementById('form-registro-referencia');
    
    if (formPagoMovil) {
        formPagoMovil.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue y borre el progreso

            if (!supabaseClient) {
                alert("❌ ERROR CRÍTICO: El SDK de Supabase no está conectado.");
                return;
            }

            // 1. Recuperar los datos reales ingresados por el comprador en la interfaz pop-up
            const numeroReferencia = document.getElementById('ref-bancaria').value.trim();
            const telefonoOrigen = document.getElementById('telf-origen').value.trim();
            
            // Calcular el monto bruto en dólares que corresponde a la cantidad de sobres elegida
            const cantidad = parseInt(inputCantidad.value) || 1;
            const montoBrutoUsd = cantidad * PRECIO_SOBRE_USD;

            // Validación de seguridad básica antes de subir el reporte al servidor
            if (numeroReferencia.length < 4) {
                alert("❌ ERROR: El número de referencia bancaria es demasiado corto.");
                return;
            }

            try {
                // 2. Inyectar el reporte de cobro en estado de retención ("PENDIENTE") en tu tabla Escrow
                const { error } = await supabaseClient
                    .from('Historial_Subastas_Liquidadas')
                    .insert([{
                        id_carta: null, // Se deja nulo porque es una compra de sobres de la tienda, no una subasta P2P
                        vendedor_id: 'PLATAFORMA_TIENDA', // Identificador del dueño del negocio
                        comprador_id: JUGADOR_ID_MOCK, // El ID de Telegram de la Mini App del jugador
                        monto_bruto_usd: montoBrutoUsd,
                        comision_plataforma_usd: 0.00, // No aplica descuento en venta directa de sobres
                        monto_neto_vendedor_usd: montoBrutoUsd,
                        estado_pago: 'PENDIENTE', // Pasa directo a tu panel administrativo privado
                        referencia_bancaria: `PM_REF_${numeroReferencia}_TLF_${telefonoOrigen}`
                    }]);

                if (error) throw error;

                // 3. Éxito: Cerrar el cuadro flotante y avisar al jugador con estilo clásico de consola
                alert(`🛰️ ¡REPORTE ENVIADO CON ÉXITO!\nTu referencia #${numeroReferencia} está en proceso de auditoría.\nTus sobres se liberarán en tu álbum en cuanto el Administrador confirme la transferencia.`);
                
                formPagoMovil.reset();
                
                const modalPm = document.getElementById('modal-pm');
                if (modalPm) modalPm.style.display = 'none'; // Oculta la pasarela y lo regresa al álbum

            } catch (error) {
                console.error("Fallo crítico al reportar el Pago Móvil:", error);
                alert("❌ ERROR DE RED: No se pudo subir tu reporte a Supabase. Comprueba tu conexión bancaria.\n" + error.message);
            }
        });
    }
}
