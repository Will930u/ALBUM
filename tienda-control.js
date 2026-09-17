// =============================================================================
// 🎮 TIENDA Y RETIROS RETRO ARCADE - CONTROLADOR JS (TASA DINÁMICA & APPS SCRIPT)
// =============================================================================

// URL oficial de tu aplicación web en Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyDOleGg11pEqPwnpSrBvO4U6kIOyRh1D_WGnZ9BJXkMFfKDTxbzFbecFTG58cCBV6M/exec";

const PRECIO_SOBRE_USD = 0.62;
const API_TASA_URL = 'https://dolarapi.com/v1/dolares/oficial';
let TASA_BCV = 833.00;

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
                alert("⚠️ Por favor ingresa al menos los últimos 6 dígitos de la referencia.");
                return;
            }

            if (!telf) {
                alert("⚠️ Por favor ingresa el número de teléfono desde donde realizaste el pago.");
                return;
            }

            // Capturar ID dinámico de Telegram
            const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            const usuarioId = telegramUser ? String(telegramUser.id) : "usuario_test_venezuela";

            const payload = {
                action: "send_payment",
                usuarioId: usuarioId,
                referencia: ref,
                telfOrigen: telf,
                totalBS: totalBsCalculado,
                qty: cantidadSobres
            };

            try {
                console.log("📡 Enviando reporte de pago a Google Apps Script...", payload);

                const response = await fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    redirect: "follow",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify(payload)
                });

                const res = await response.json();

                if (res.success) {
                    alert(`🛰️ ¡REPORTE ENVIADO CON ÉXITO!\n\nReferencia: ${ref}\nTotal: ${totalBsCalculado} Bs.\n\nTu compra se acreditará automáticamente apenas el banco confirme la transacción.`);
                    
                    if (modalPm) modalPm.style.display = 'none';
                    formReportePm.reset();
                } else {
                    alert(`❌ ERROR EN EL SERVIDOR: ${res.message || "No se pudo procesar el reporte."}`);
                }

            } catch (err) {
                console.error("Error al enviar reporte a Apps Script:", err);
                alert("❌ ERROR AL ENVIAR REPORTE: Revisa la URL de Apps Script o tu conexión de red.");
            }
        });
    }

    await obtenerTasaOficial();
});

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
        if (bloquePm) bloquePm.style.display = 'block';
        if (btnPm) btnPm.classList.add('activo');
        if (btnUsdt) btnUsdt.classList.remove('activo');
    }
}
