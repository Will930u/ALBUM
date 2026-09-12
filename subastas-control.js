// ========================================================
// 🔨 CONTROLADOR MAESTRO DE SUBASTAS ESCROW (10% COMISIÓN)
// ========================================================

// Credenciales de Supabase (Sincronizadas con tus otros archivos)
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Datos del lote activo simulados (Luego se leerán en bucle desde tu base de datos)
let loteActivo = {
    id_lote: 101,
    id_carta: 1501,
    vendedor_id: "usuario_vendedor_test",
    ultimo_postulante: "usuario_test_venezuela",
    oferta_actual_usd: 5.50,
    tiempo_restante_segundos: 25, // Tiempo de prueba corto para ver el cierre elástico
    comision_porcentaje: 0.10 // Tu regla fija del 10% de ganancia
};

let tasaBcvSubasta = 68.50; // Respaldo por defecto
let cronometroSubasta;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sincronizar la tasa oficial del BCV antes de renderizar los precios
    await obtenerTasaBcvSubastas();
    
    // 2. Iniciar la cuenta regresiva en reversa (cada 1 segundo)
    cronometroSubasta = setInterval(() => {
        if (loteActivo.tiempo_restante_segundos > 0) {
            loteActivo.tiempo_restante_segundos--;
            actualizarRelojRetro();
        } else {
            // ¡EL TIEMPO TERMINÓ! Ejecutar el algoritmo de liquidación
            clearInterval(cronometroSubasta);
            ejecutarCierreLoteEscrow();
        }
    }, 1000);
});

/// 🌐 CONEXIÓN VIVA CON DOLARAPI CORREGIDA
async function obtenerTasaBcvSubastas() {
    try {
       // CAMBIO EXACTO PARA LA LÍNEA 45 DE SUBASTAS-CONTROL.JS
        const respuesta = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const datos = await respuesta.json();
        if (datos && datos.promedio) {
            tasaBcvSubasta = parseFloat(datos.promedio);
        }
    } catch (e) {
        console.error("Fallo de red en DolarApi, usando respaldo.", e);
    }
    actualizarVisualLote();
}

// ⏱️ RELOJ EN REVERSA PARPADEANTE
function actualizarRelojRetro() {
    const txtTimer = document.getElementById('timer-1');
    if (!txtTimer) return;

    let horas = Math.floor(loteActivo.tiempo_restante_segundos / 3600);
    let minutos = Math.floor((loteActivo.tiempo_restante_segundos % 3600) / 60);
    let segundos = loteActivo.tiempo_restante_segundos % 60;

    txtTimer.innerText = `${String(horas).padStart(2,'0')}h : ${String(minutos).padStart(2,'0')}m : ${String(segundos).padStart(2,'0')}s`;
}

// 📊 CONTROLADOR DE MONEDA AL VUELO
function actualizarVisualLote() {
    const txtUsd = document.getElementById('oferta-usd-1');
    const txtBs = document.getElementById('oferta-bs-1');
    
    if (txtUsd) txtUsd.innerText = `$${loteActivo.oferta_actual_usd.toFixed(2)} USDT`;
    if (txtBs) {
        const totalBs = loteActivo.oferta_actual_usd * tasaBcvSubasta;
        txtBs.innerText = `~ ${totalBs.toFixed(2)} Bs.`;
    }
}

// 🏛️ ALGORITMO FINANCIERO ESCROW (CIERRE AUTOMÁTICO)
async function ejecutarCierreLoteEscrow() {
    const txtTimer = document.getElementById('timer-1');
    if (txtTimer) {
        txtTimer.innerText = "¡PUJA CERRADA EN AUDITORÍA!";
        txtTimer.style.color = "#ffcc00";
    }

    // Desactivar las entradas del lote para congelar el sistema de inmediato
    const inputPuja = document.getElementById('monto-pujar-1');
    const btnPujar = document.querySelector('.btn-pujar');
    if (inputPuja) inputPuja.disabled = true;
    if (btnPujar) {
        btnPujar.disabled = true;
        btnPujar.style.backgroundColor = '#555';
    }

    // --- REGLA MATEMÁTICA ESTABLECIDA POR EL PROPIETARIO ---
    const montoBrutoFinal = loteActivo.oferta_actual_usd;
    
    // 1. Calcular tu 10% limpio de comisión por mediar
    const comisionPlataforma = montoBrutoFinal * loteActivo.comision_porcentaje;
    
    // 2. Calcular el 90% neto sobrante que se le acreditará al vendedor
    const netoParaElVendedor = montoBrutoFinal - comisionPlataforma;

    console.log("💰 LIQUIDACIÓN: Bruto $" + montoBrutoFinal + " | Tu Comisión: $" + comisionPlataforma.toFixed(2) + " | Neto Vendedor: $" + netoParaElVendedor.toFixed(2));

    try {
       // SOLUCIÓN EXACTA PARA TU SCRIPT DE SUBASTAS:
const { error: errInsert } = await supabaseClient
    .from('Historial_Subastas_Liquidadas') // TODO PEGADO, SIN ESPACIOS NI GUIONES BAJOS ADICIONALES
    .insert([{
        id_carta: idCartaActual, // Revisa que este nombre coincida con tu variable
        vendedor_id: vendedorIdActual,
        comprador_id: compradorIdActual,
        monto_bruto_usd: liquidacionBruto,
        comision_plataforma_usd: liquidacionComision,
        monto_neto_vendedor_usd: liquidacionNeto,
        estado_pago: 'PENDIENTE',
        referencia_bancaria: 'ESPERANDO_P2P'
    }]);

if (errInsert) throw errInsert;

        if (error) throw error;
        alert(`🚨 ¡LOTE FINALIZADO!\nLa oferta ganadora fue de $${montoBrutoFinal} USDT.\nSe ha calculado tu 10% de comisión.`);

    } catch (err) {
        console.error("Error al asentar el cierre financiero en las tablas:", err);
    }
}
