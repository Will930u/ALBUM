// ========================================================
// 💰 SCRIPT DE CONTROL DINÁMICO DE FACTURACIÓN RETRO (AUTOMÁTICO)
// ========================================================

// Precio fijo por cada sobre en dólares
const PRECIO_SOBRE_USD = 0.62;

// Variable global para la tasa. Inicia en un valor de respaldo por seguridad
let tasaBcvActual = 68.50; 

// Elementos de la interfaz recuperados del DOM
const inputCantidad = document.getElementById('cantidad-sobres');
const btnMenos = document.getElementById('btn-menos');
const btnMas = document.getElementById('btn-mas');
const txtTotalUsd = document.getElementById('total-usd');
const txtTotalBs = document.getElementById('total-bs');
const btnCheckout = document.getElementById('btn-checkout');

// Inicializar la carga automática del BCV apenas cargue la página
document.addEventListener('DOMContentLoaded', async () => {
    await obtenerTasaBcvAutomatica();
});

// 1. EVENTOS DE INCREMENTO Y DECREMENTO PIXEL ART
btnMas.addEventListener('click', () => {
    let cantidadActual = parseInt(inputCantidad.value);
    if (cantidadActual < 99) { 
        inputCantidad.value = cantidadActual + 1;
        calcularTotalesAlVuelo();
    }
});

btnMenos.addEventListener('click', () => {
    let cantidadActual = parseInt(inputCantidad.value);
    if (cantidadActual > 1) { 
        inputCantidad.value = cantidadActual - 1;
        calcularTotalesAlVuelo();
    }
});

// 2. FUNCIÓN DE CONEXIÓN CON DOLARAPI (CONSULTA EN VIVO)
async function obtenerTasaBcvAutomatica() {
    try {
        // Consultar la API del dólar oficial en tiempo real
        const respuesta = await fetch('https://dolarapi.com');
        const datos = await respuesta.json();
        
        // Extraer el promedio oficial asignado por el BCV
        if (datos && datos.promedio) {
            tasaBcvActual = parseFloat(datos.promedio);
            console.log("🚀 Tasa oficial BCV sincronizada automáticamente: " + tasaBcvActual + " Bs.");
        }
    } catch (error) {
        console.error("❌ Fallo de red en DolarApi, utilizando tasa de respaldo:", error);
    }
    // Ejecutar el cálculo en pantalla después de definir la tasa
    calcularTotalesAlVuelo();
}

// 3. CALCULADORA MATEMÁTICA EN TIEMPO REAL
function calcularTotalesAlVuelo() {
    const cantidad = parseInt(inputCantidad.value);
    
    // Total en Dólares
    const totalDolares = cantidad * PRECIO_SOBRE_USD;
    txtTotalUsd.innerText = `$${totalDolares.toFixed(2)}`;

    // Total en Bolívares con la tasa viva del BCV
    const totalBolivares = totalDolares * tasaBcvActual;
    txtTotalBs.innerText = `${totalBolivares.toFixed(2)} Bs.`;

    // ACTUALIZACIÓN DE LA VENTANA DE PAGO MÓVIL:
    // Si el cuadro de texto flotante de Pago Móvil existe en tu HTML, le inyecta el monto al vuelo
    const textoMontoModalPm = document.getElementById('monto-bs-dinamico');
    if (textoMontoModalPm) {
        textoMontoModalPm.innerText = `${totalBolivares.toFixed(2)} Bs.`;
    }
}

// 4. PASARELA DE CHECKOUT DUAL
btnCheckout.addEventListener('click', () => {
    const cantidad = parseInt(inputCantidad.value);
    const totalDolares = (cantidad * PRECIO_SOBRE_USD).toFixed(2);
    const totalBolivares = (totalDolares * tasaBcvActual).toFixed(2);
    
    const pasarelaElegida = document.querySelector('input[name="pago"]:checked').value;

    if (pasarelaElegida === 'USDT') {
        alert(`[ CONEXIÓN WEB3 WALLET ]\n\nAbriendo interfaz de pago en Telegram.\nMonto: ${totalDolares} USDT.\n\nConfirma la transacción en tu billetera para recibir tus sobres.`);
    } else if (pasarelaElegida === 'PM') {
        // En lugar de un alert simple, esto activará visualmente tu cuadro flotante maquetado
        const modalPagoMovil = document.getElementById('modal-pm');
        if (modalPagoMovil) {
            modalPagoMovil.style.display = 'flex'; // Abre la pasarela retro en pantalla
        } else {
            alert(`[ DATOS DE PAGO MÓVIL ]\n\n• Banco: Banco de Venezuela\n• Monto Exacto: ${totalBolivares} Bs.\n• Tasa Oficial BCV: ${tasaBcvActual} Bs/USD\n\nPor favor, transfiere e introduce la referencia.`);
        }
    }
});

// ========================================================
// 🔄 PESTAÑAS DE RETIRO (USDT / PAGO MÓVIL)
// ========================================================
function conmutarFormularioRetiro(metodoElegido) {
    const btnUsdt = document.getElementById('btn-select-usdt');
    const btnPm = document.getElementById('btn-select-pm');
    const bloqueUsdt = document.getElementById('bloque-datos-usdt');
    const bloquePm = document.getElementById('bloque-datos-pm');

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

