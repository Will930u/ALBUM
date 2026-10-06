// =============================================================================
// 🎮 TIENDA Y RETIROS RETRO ARCADE - CONTROLADOR JS (TASA DINÁMICA & SUPABASE DIRECTO)
// =============================================================================

const PRECIO_SOBRE_USD = 0.62;
const API_TASA_URL = 'https://dolarapi.com/v1/dolares/oficial';
const RENDER_SERVER_URL = 'https://juego-barajitas.onrender.com';
let TASA_BCV = 833.00;

/**
 * Captura de forma dinámica y robusta el ID del usuario de Telegram.
 */
function obtenerTelegramUserId() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            
            // 1. Prioridad: Intentar obtener el username de Telegram
            if (user && user.username) {
                return String(user.username).replace(/^@/, '').trim().toLowerCase();
            }
            
            // Si el usuario no tiene username público, usar su ID numérico
            if (user && user.id) {
                return String(user.id);
            }
            
            // 2. Reintento extrayendo initData si no viene parseado
            const initData = window.Telegram.WebApp.initData;
            if (initData) {
                const searchParams = new URLSearchParams(initData);
                const userParam = searchParams.get('user');
                if (userParam) {
                    const parsedUser = JSON.parse(decodeURIComponent(userParam));
                    if (parsedUser && parsedUser.username) {
                        return String(parsedUser.username).replace(/^@/, '').trim().toLowerCase();
                    }
                    if (parsedUser && parsedUser.id) {
                        return String(parsedUser.id);
                    }
                }
            }
        }
        
        // 3. Búsqueda en parámetros URL si la WebApp está dentro de un iframe
        const urlParams = new URLSearchParams(window.location.search);
        const tgData = urlParams.get('tgWebAppData');
        if (tgData) {
            const searchParams = new URLSearchParams(decodeURIComponent(tgData));
            const userParam = searchParams.get('user');
            if (userParam) {
                const parsedUser = JSON.parse(userParam);
                if (parsedUser && parsedUser.username) {
                    return String(parsedUser.username).replace(/^@/, '').trim().toLowerCase();
                }
                if (parsedUser && parsedUser.id) {
                    return String(parsedUser.id);
                }
            }
        }
    } catch (e) {
        console.warn("⚠️ Error extrayendo ID de Telegram:", e);
    }

    // Fallback estándar en entorno web de desarrollo fuera de Telegram
    return "utrera930";
}

document.addEventListener('DOMContentLoaded', async () => {
    
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

    function actualizarTotales() {
        let cantidad = parseInt(inputCantidad?.value) || 1;
        
        if (cantidad < 1) cantidad = 1;
        if (cantidad > 99) cantidad = 99;
        if (inputCantidad) inputCantidad.value = cantidad;

        const totalUsd = cantidad * PRECIO_SOBRE_USD;
        const totalBs = totalUsd * TASA_BCV;

        if (txtTotalUsd) txtTotalUsd.innerText = `$${totalUsd.toFixed(2)}`;
        if (txtTotalBs) txtTotalBs.innerText = `${totalBs.toFixed(2)} Bs.`;
        if (txtMontoBsDinamico) txtMontoBsDinamico.innerText = `${totalBs.toFixed(2)} Bs.`;
    }

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

    if (modalPm) {
        modalPm.addEventListener('click', (e) => {
            if (e.target === modalPm) {
                modalPm.style.display = 'none';
            }
        });
    }

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

    if (formReportePm) {
        formReportePm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const ref = document.getElementById('ref-bancaria')?.value.trim();
            const telf = document.getElementById('telf-origen')?.value.trim();
            const cantidadSobres = parseInt(inputCantidad?.value) || 1;
            const totalBsCalculado = parseFloat((cantidadSobres * PRECIO_SOBRE_USD * TASA_BCV).toFixed(2));

            if (!ref || ref.length < 6) {
                alert("⚠️️ Por favor ingresa al menos los últimos 6 dígitos de la referencia.");
                return;
            }

            if (!telf) {
                alert("⚠️ Por favor ingresa el número de teléfono desde donde realizaste el pago.");
                return;
            }

            // Capturar ID dinámico real
            const usuarioId = obtenerTelegramUserId();

            try {
                console.log("📡 Guardando pago en Supabase (pagos_pendientes)...");

                // Inserción directa en la tabla de Supabase
                const { data, error } = await supabase
                    .from('pagos_pendientes')
                    .insert([
                        {
                            usuario_id: usuarioId,
                            referencia: ref,
                            monto: totalBsCalculado,
                            cantidad_sobres: cantidadSobres,
                            telefono_origen: telf,
                            tipo: 'tienda',
                            estado: 'pendiente'
                        }
                    ])
                    .select();

                if (error) {
                    throw error;
                }

                // Obtener ID insertado para coordinar la aprobación interactiva
                const pagoRegistrado = data && data.length > 0 ? data[0] : null;
                const pagoId = pagoRegistrado ? pagoRegistrado.id : null;

                // Notificar reporte de compra al bot de Telegram a través de Render para aprobación
                try {
                    console.log("📡 Enviando reporte de compra con solicitud de aprobación al servidor Render/Telegram...");
                    await fetch(`${RENDER_SERVER_URL}/api/notificar-compra`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            pagoId: pagoId,
                            usuarioId: usuarioId,
                            referencia: ref,
                            monto: totalBsCalculado,
                            cantidadSobres: cantidadSobres,
                            telefonoOrigen: telf
                        })
                    });
                } catch (errNotif) {
                    console.warn("⚠️ No se pudo enviar la notificación de aprobación a Telegram mediante Render:", errNotif);
                }

                alert(`🚀 ¡REPORTE ENVIADO CON ÉXITO!\n\nReferencia: ${ref}\nTotal: ${totalBsCalculado} Bs.\n\nTu pago ha sido registrado y está en espera de revisión por el administrador.`);
                
                if (modalPm) modalPm.style.display = 'none';
                formReportePm.reset();
                if (inputCantidad) inputCantidad.value = 1;
                actualizarTotales();

            } catch (err) {
                console.error("Error al registrar pago en Supabase:", err);
                alert("❌ ERROR AL REGISTRAR EL PAGO: Inténtalo de nuevo o verifica tu conexión.");
            }
        });
    }

    await obtenerTasaOficial();
});

function conmutarFormularioRetiro(metodo) {
    const bloqueUsdt = document.getElementById('bloque-datos-usdt');
    const bloquePm = document.getElementById('bloque-datos-pm');
    const btnSelectUsdt = document.getElementById('btn-select-usdt');
    const btnSelectPm = document.getElementById('btn-select-pm');

    if (metodo === 'USDT') {
        if (bloqueUsdt) bloqueUsdt.style.display = 'block';
        if (bloquePm) bloquePm.style.display = 'none';
        if (btnSelectUsdt) btnSelectUsdt.classList.add('activo');
        if (btnSelectPm) btnSelectPm.classList.remove('activo');
    } else if (metodo === 'PM') {
        if (bloqueUsdt) bloqueUsdt.style.display = 'none';
        if (bloquePm) bloquePm.style.display = 'block';
        if (btnSelectPm) btnSelectPm.classList.add('activo');
        if (btnSelectUsdt) btnSelectUsdt.classList.remove('activo');
    }
}
