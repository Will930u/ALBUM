// ========================================================
// 💰 SCRIPT DE CONTROL DINÁMICO DE FACTURACIÓN RETRO
// ========================================================

// Constantes base fijadas en tu modelo de negocio
const PRECIO_SOBRE_USD = 0.62;
const TASA_MANUAL_ADMIN = 68.50; // Configurada directamente desde tu Panel de Control

// Elementos de la interfaz recuperados del DOM
const inputCantidad = document.getElementById('cantidad-sobres');
const btnMenos = document.getElementById('btn-menos');
const btnMas = document.getElementById('btn-mas');
const txtTotalUsd = document.getElementById('total-usd');
const txtTotalBs = document.getElementById('total-bs');
const btnCheckout = document.getElementById('btn-checkout');

// Inicializar cálculos electrónicos en pantalla al cargar
document.addEventListener('DOMContentLoaded', () => {
    calcularTotalesAlVuelo();
});

// 1. Evento para Incrementar Cantidad (+)
btnMas.addEventListener('click', () => {
    let cantidadActual = parseInt(inputCantidad.value);
    if (cantidadActual < 99) { // Límite técnico superior seguro
        inputCantidad.value = cantidadActual + 1;
        calcularTotalesAlVuelo();
    }
});

// 2. Evento para Decrementar Cantidad (-)
btnMenos.addEventListener('click', () => {
    let cantidadActual = parseInt(inputCantidad.value);
    if (cantidadActual > 1) { // Bloqueo inferior obligatorio
        inputCantidad.value = cantidadActual - 1;
        calcularTotalesAlVuelo();
    }
});

// 3. Función Matemática de Conversión Dinámica en Espejo
function calcularTotalesAlVuelo() {
    const cantidad = parseInt(inputCantidad.value);
    
    // Cálculo de Dólares
    const totalDolares = cantidad * PRECIO_SOBRE_USD;
    txtTotalUsd.innerText = `$${totalDolares.toFixed(2)}`;

    // Conversión a Bolívares usando la regla de tu arquitectura
    const totalBolivares = totalDolares * TASA_MANUAL_ADMIN;
    txtTotalBs.innerText = `${totalBolivares.toFixed(2)} Bs.`;
}

// 4. Procesamiento de Salida Pasarela (Checkout)
btnCheckout.addEventListener('click', () => {
    const cantidad = parseInt(inputCantidad.value);
    const totalDolares = (cantidad * PRECIO_SOBRE_USD).toFixed(2);
    const totalBolivares = (totalDolares * TASA_MANUAL_ADMIN).toFixed(2);
    
    // Detectar cuál pasarela de pago seleccionó el jugador
    const pasarelaElegida = document.querySelector('input[name="pago"]:checked').value;

    if (pasarelaElegida === 'USDT') {
        // RUTA CRIPTO WEB3: Generación de Factura Nativa de Telegram Wallet
        alert(`[ CONEXIÓN WEB3 WALLET ]\n\nAbriendo interfaz de pago en Telegram.\nMonto: ${totalDolares} USDT.\n\nConfirma la transacción en tu billetera para recibir tus sobres.`);
        
        // Aquí se inyectará más adelante el link dinámico de la API oficial comercial
        // window.location.href = `tg://wallet?orderId=...`;

    } else if (pasarelaElegida === 'PM') {
        // RUTA BOLÍVARES P2P: Pasarela Semiautomática de Pago Móvil venezolano
        alert(`[ DATOS DE PAGO MÓVIL ]\n\nPor favor, realiza la transferencia a la Plataforma:\n\n• Banco: Banco de Venezuela\n• Monto Exacto: ${totalBolivares} Bs.\n• Tasa del día: ${TASA_MANUAL_ADMIN} Bs/USD\n\nAl finalizar, ingresa el número de referencia en el panel.`);
        
        // Aquí abrirás el formulario para capturar el número de referencia que revisarás en tu panel
    }
});
// ========================================================
// 🔄 FUNCIÓN PARA ALTERNAR FORMULARIOS DE RETIRO (USDT / PAGO MÓVIL)
// ========================================================
function conmutarFormularioRetiro(metodoElegido) {
    const btnUsdt = document.getElementById('btn-select-usdt');
    const btnPm = document.getElementById('btn-select-pm');
    const bloqueUsdt = document.getElementById('bloque-datos-usdt');
    const bloquePm = document.getElementById('bloque-datos-pm');

    if (metodoElegido === 'USDT') {
        // Encender visualmente USDT
        btnUsdt.style.backgroundColor = '#ffcc00';
        btnUsdt.style.color = '#000';
        bloqueUsdt.style.display = 'block';

        // Apagar visualmente Pago Móvil
        btnPm.style.backgroundColor = '#1a1a1f';
        btnPm.style.color = '#888';
        bloquePm.style.display = 'none';
    } else {
        // Encender visualmente Pago Móvil
        btnPm.style.backgroundColor = '#ffcc00';
        btnPm.style.color = '#000';
        bloquePm.style.display = 'block';

        // Apagar visualmente USDT
        btnUsdt.style.backgroundColor = '#1a1a1f';
        btnUsdt.style.color = '#888';
        bloqueUsdt.style.display = 'none';
    }
}

