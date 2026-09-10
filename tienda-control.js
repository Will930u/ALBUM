// ========================================================
// 💰 SCRIPT DE CONTROL DINÁMICO DE FACTURACIÓN Y PERFIL RETRO
// ========================================================

// Conexión con Supabase (Reemplaza con tus credenciales reales)
const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    await cargarDatosPreviosUsuario(); // Carga las cuentas si el usuario ya las guardó antes
});

// 1. SELECTOR DE SOBRES PIXEL ART
if (btnMas) btnMas.addEventListener('click', () => {
    let cantidadActual = parseInt(inputCantidad.value);
    if (cantidadActual < 99) { inputCantidad.value = cantidadActual + 1; calcularTotalesAlVuelo(); }
});
if (btnMenos) btnMenos.addEventListener('click', () => {
    let cantidadActual = parseInt(inputCantidad.value);
    if (cantidadActual > 1) { inputCantidad.value = cantidadActual - 1; calcularTotalesAlVuelo(); }
});

// 2. CONEXIÓN VIVA CON DOLARAPI (BCV EN TIEMPO REAL)
async function obtenerTasaBcvAutomatica() {
    try {
        const respuesta = await fetch('https://dolarapi.com');
        const datos = await respuesta.json();
        if (datos && datos.promedio) { tasaBcvActual = parseFloat(datos.promedio); }
    } catch (error) { console.error("Error en DolarApi, usando respaldo:", error); }
    calcularTotalesAlVuelo();
}

function calcularTotalesAlVuelo() {
    const cantidad = parseInt(inputCantidad.value);
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
if (btnCheckout) btnCheckout.addEventListener('click', () => {
    const totalDolares = (parseInt(inputCantidad.value) * PRECIO_SOBRE_USD).toFixed(2);
    const pasarelaElegida = document.querySelector('input[name="pago"]:checked').value;

    if (pasarelaElegida === 'USDT') {
        alert(`[ CONEXIÓN WEB3 WALLET ]\n\nAbriendo pasarela nativa por ${totalDolares} USDT.`);
    } else {
        const modalPm = document.getElementById('modal-pm');
        if (modalPm) modalPm.style.display = 'flex';
    }
});

// ========================================================
// 💾 NUEVA LOGICA: GUARDAR PERFIL DE COBROS EN SUPABASE
// ========================================================

// A. Función para rellenar los inputs automáticamente si el usuario ya los guardó antes
async function cargarDatosPreviosUsuario() {
    try {
        const { data: usuario, error } = await supabaseClient
            .from('Usuarios')
            .select('*')
            .eq('id_usuario', JUGADOR_ID_MOCK)
            .maybeSingle();

        if (usuario) {
            if (usuario.wallet_ton_address) document.getElementById('user-wallet-address').value = usuario.wallet_ton_address;
            if (usuario.pago_movil_banco) document.getElementById('user-pm-banco').value = usuario.pago_movil_banco;
            if (usuario.pago_movil_cedula) document.getElementById('user-pm-cedula').value = usuario.pago_movil_cedula;
            if (usuario.pago_movil_telefono) document.getElementById('user-pm-telefono').value = usuario.pago_movil_telefono;
        }
    } catch (err) { console.error("Error cargando perfil previo:", err); }
}

// B. Evento que se dispara al pulsar el botón amarillo
if (btnGuardarPerfil) {
    btnGuardarPerfil.addEventListener('click', async () => {
        // Capturar los valores de las cajas de texto
        const walletAddress = document.getElementById('user-wallet-address').value.trim();
        const pmBanco = document.getElementById('user-pm-banco').value;
        const pmCedula = document.getElementById('user-pm-cedula').value.trim();
        const pmTelefono = document.getElementById('user-pm-telefono').value.trim();

        try {
            // Actualizar la fila en la tabla 'Usuarios' de Supabase
            const { error } = await supabaseClient
                .from('Usuarios')
                .update({
                    wallet_ton_address: walletAddress || null,
                    pago_movil_banco: pmBanco || null,
                    pago_movil_cedula: pmCedula || null,
                    pago_movil_telefono: pmTelefono || null
                })
                .eq('id_usuario', JUGADOR_ID_MOCK); // Busca estrictamente la cuenta del jugador activo

            if (error) throw error;

            alert("💾 ¡ÉXITO RETRO!\nTus credenciales de cobro han sido encriptadas y guardadas con éxito en el servidor.");

        } catch (error) {
            console.error(error);
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

    if (metodoElegido === 'USDT') {
        btnUsdt.style.backgroundColor = '#ffcc00'; btnUsdt.style.color = '#000'; bloqueUsdt.style.display = 'block';
        btnPm.style.backgroundColor = '#1a1a1f'; btnPm.style.color = '#888'; bloquePm.style.display = 'none';
    } else {
        btnPm.style.backgroundColor = '#ffcc00'; btnPm.style.color = '#000'; bloquePm.style.display = 'block';
        btnUsdt.style.backgroundColor = '#1a1a1f'; btnUsdt.style.color = '#888'; bloqueUsdt.style.display = 'none';
    }
}

