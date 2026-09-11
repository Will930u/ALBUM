// =============================================================================
// 🎮 TIENDA Y RETIROS RETRO ARCADE - CONTROLADOR JS (TASA DINÁMICA)
// =============================================================================

// Constantes de configuración
const PRECIO_SOBRE_USD = 0.62;
const API_TASA_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
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

    // --- REGISTRO REPORTE PAGO MÓVIL ---
    if (formReportePm) {
        formReportePm.addEventListener('submit', (e) => {
            e.preventDefault();
            const ref = document.getElementById('ref-bancaria')?.value.trim();
            const telf = document.getElementById('telf-origen')?.value.trim();

            if (ref && telf) {
                alert(`Reporte enviado con éxito.\nReferencia: ${ref}\nTeléfono: ${telf}`);
                if (modalPm) modalPm.style.display = 'none';
                formReportePm.reset();
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
        if (bloquePm) bloquePm.style.display = 'block';
        if (btnPm) btnPm.classList.add('activo');
        if (btnUsdt) btnUsdt.classList.remove('activo');
    }
}
