// =============================================================================
// 🎮 TIENDA Y RETIROS RETRO ARCADE - CONTROLADOR JS (TASA DINÁMICA & SUPABASE)
// =============================================================================

// Instanciación del cliente de base de datos para la conexión con el juego
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ID de control del jugador de pruebas (Se acopla al Telegram ID del usuario de forma nativa)
const USUARIO_ID_MOCK = "usuario_test_venezuela";

// Constantes de configuración
const PRECIO_SOBRE_USD = 0.62;
const API_TASA_URL = 'https://dolarapi.com';
let TASA_BCV = 833.00; // Valor de respaldo por si falla la conexión a la API

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- REFERENCIAS AL DOM ---
    const btnMenos = document.getElementById('btn-menos');
    const btnMas = document.getElementById('btn-mas');
    const inputCantidad = document.getElementById('cantidad-sobres');
    const txtTotalUsd = document.getElementById('total-usd');
    const txtTotalBs = document.getElementById('total-bs');
    const txtMontoBsDinamico = document.getElementById('monto-bs-dinamico');
    const btnCheckout = document.getElementById('btn-checkout');
    const modalPm = document.getElementById('modal-pm');
    const btnGuardarPerfil = document.getElementById('btn-guardar-perfil');
    const formReportePm = document.getElementById('form-registro-referencia');

    // --- CÁLCULO Y ACTUALIZACIÓN DE PRECIOS ---
    function actualizarTotales() {
        let cantidad = parseInt(inputCantidad.value) || 1;
        
        // Validar rango permitido (1 a 99)
        if (cantidad < 1) cantidad = 1;
        if (cantidad > 99) cantidad = 99;
        inputCantidad.value = cantidad;

        const totalUsd = cantidad * PRECIO_SOBRE_USD;
        const totalBs = totalUsd * TASA_BCV;

        if (txtTotalUsd) txtTotalUsd.innerText = `$${totalUsd.toFixed(2)}`;
        if (txtTotalBs) txtTotalBs.innerText = `${totalBs.toFixed(2)} Bs.`;
        if (txtMontoBsDinamico) txtMontoBsDinamico.innerText = `${totalBs.toFixed(2)} Bs.`;
    }

    // --- OBTENCIÓN DE TASA OFICIAL EN TIEMPO REAL DESDE DOLARAPI ---
    async function obtenerTasaOficial() {
        try {
            const respuesta = await fetch(API_TASA_URL);
            if (!respuesta.ok) throw new Error('Error en la respuesta de la red');
            
            const data = await respuesta.json();
            
            if (data && data.promedio) {
                TASA_BCV = parseFloat(data.promedio);
                console.log(`[DolarApi] Tasa Oficial obtenida con éxito: ${TASA_BCV} Bs.`);
            }
        } catch (error) {
            console.warn('[DolarApi] No se pudo obtener la tasa en tiempo real, usando tasa de respaldo:', error);
        } finally {
            actualizarTotales();
        }
    }

    // --- EVENTOS DEL SELECTOR DE CANTIDAD (+ / -) ---
    if (btnMenos) {
        btnMenos.addEventListener('click', () => {
            let actual = parseInt(inputCantidad.value) || 1;
            if (actual > 1) {
                inputCantidad.value = actual - 1;
                actualizarTotales();
            }
        });
    }

    if (btnMas) {
        btnMas.addEventListener('click', () => {
            let actual = parseInt(inputCantidad.value) || 1;
            if (actual < 99) {
                inputCantidad.value = actual + 1;
                actualizarTotales();
            }
        });
    }

    // --- ACCIÓN DEL BOTÓN COMPRAR ---
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const metodoSeleccionado = document.querySelector('input[name="pago"]:checked')?.value;
            
            if (metodoSeleccionado === 'PM') {
                if (modalPm) modalPm.style.display = 'flex';
            } else if (metodoSeleccionado === 'USDT') {
                alert('Redirigiendo a la pasarela de Telegram Wallet (USDT)...');
            }
        });
    }

    // Cerrar modal al hacer clic fuera de la caja
    if (modalPm) {
        modalPm.addEventListener('click', (e) => {
            if (e.target === modalPm) {
                modalPm.style.display = 'none';
            }
        });
    }

    // --- GUARDAR DATOS DE PERFIL FINANCIERO ---
    if (btnGuardarPerfil) {
        btnGuardarPerfil.addEventListener('click', () => {
            const walletTON = document.getElementById('user-wallet-address')?.value.trim();
            const banco = document.getElementById('user-pm-banco')?.value;
            const cedula = document.getElementById('user-pm-cedula')?.value.trim();
            const telefono = document.getElementById('user-pm-telefono')?.value.trim();

            const datosRetiro = { walletTON, banco, cedula, telefono };
            localStorage.setItem('vylon_perfil_retiro', JSON.stringify(datosRetiro));

            alert('¡Datos de cobro guardados correctamente!');
        });
    }

    // --- 🚀 REGISTRO REPORTE PAGO MÓVIL (CONEXIÓN EN VIVO A SUPABASE) ---
    if (formReportePm) {
        formReportePm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const ref = document.getElementById('ref-bancaria')?.value.trim();
            const telf = document.getElementById('telf-origen')?.value.trim();
            const cantidadSobres = parseInt(inputCantidad.value) || 1;
            
            // Calculamos el valor exacto en bolívares en base a la cantidad de la pantalla
            const totalBsCalculado = parseFloat((cantidadSobres * PRECIO_SOBRE_USD * TASA_BCV).toFixed(2));

            if (ref && telf) {
                try {
                    console.log(`📡 Registrando reporte de ${cantidadSobres} sobre(s) en Supabase...`);
                    
                    // Inyectamos el récord en la tabla que lee tu cuenta de Gmail
                    const { error } = await supabaseClient
                        .from('pagos_pendientes')
                        .insert([{
                            usuario_id: USUARIO_ID_MOCK,
                            referencia: ref,             // Admite formatos elásticos de 6 a 14 números
                            monto_bs: totalBsCalculado,  // Envía el monto exacto escalado
                            telefono_origen: telf,
                            banco_origen: "0134",        // Marcado por defecto como Banesco
                            estado: "pendiente",
                            cantidad_sobres: cantidadSobres,
                            created_at: new Date().toISOString()
                        }]);

                    if (error) throw error;

                    alert(`🛰️ ¡REPORTE ENVIADO CON ÉXITO!\n\nReferencia: ${ref}\nTotal: ${totalBsCalculado} Bs.\n\nTu saldo se actualizará automáticamente apenas el banco procese la transacción.`);
                    
                    if (modalPm) modalPm.style.display = 'none';
                    formReportePm.reset();

                } catch (errSupabase) {
                    console.error("Error al asentar pago en Supabase:", errSupabase);
                    alert("❌ ERROR AL ENVIAR REPORTE: Revisa la conexión de tu Mini App.");
                }
            }
        });
    }

    // Ejecutar la consulta de tasa inmediatamente
    await obtenerTasaOficial();
});

// =============================================================================
// 🔄 FUNCIÓN GLOBAL DE CONMUTACIÓN DE PESTAÑAS (Formulario USDT / PM)
// =============================================================================
function conmutarFormularioRetiro(metodo) {
    const bloqueUsdt = document.getElementById('bloque-datos-usdt');
    const bloquePm = document.getElementById('bloque-datos-pm');
    const btnUsdt = document.getElementById('btn-select-usdt');
    const btnPm = document.getElementById('btn-select-pm');

    if (metodo === 'USDT') {
        if (bloqueUsdt) bloqueUsdt.style.display = 'block';
        if (bloquePm) bloquePm.style.display = 'none';
        if (btnUsdt) btnUsdt.classList.add('activo');
        if (btnPm) btnPm.classList.remove('activo');
    } else if (metodo === 'PM') {
        if (bloqueUsdt) bloqueUsdt.style.display = 'none';
        if (bloquePm) blockePm.style.display = 'block';
        if (btnPm) btnPm.classList.add('activo');
        if (btnUsdt) btnUsdt.classList.remove('activo');
    }
}
