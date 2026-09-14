// ========================================================
// 🔨 CONTROLADOR MAESTRO DE SUBASTAS ESCROW (10% COMISIÓN)
// ========================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let loteActivo = {
    id_lote: 101,
    id_carta: 1501,
    vendedor_id: "usuario_vendedor_test",
    ultimo_postulante: "usuario_test_venezuela",
    oferta_actual_usd: 5.50,
    tiempo_restante_segundos: 25,
    comision_porcentaje: 0.10
};

let tasaBcvSubasta = 832.48;
let cronometroSubasta;

document.addEventListener('DOMContentLoaded', async () => {
    await obtenerTasaBcvSubastas();
    
    cronometroSubasta = setInterval(() => {
        if (loteActivo.tiempo_restante_segundos > 0) {
            loteActivo.tiempo_restante_segundos--;
            actualizarRelojRetro();
        } else {
            clearInterval(cronometroSubasta);
            ejecutarCierreLoteEscrow();
        }
    }, 1000);
});

async function obtenerTasaBcvSubastas() {
    try {
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

function actualizarRelojRetro() {
    const txtTimer = document.getElementById('timer-1');
    if (!txtTimer) return;

    let horas = Math.floor(loteActivo.tiempo_restante_segundos / 3600);
    let minutos = Math.floor((loteActivo.tiempo_restante_segundos % 3600) / 60);
    let segundos = loteActivo.tiempo_restante_segundos % 60;

    txtTimer.innerText = `${String(horas).padStart(2,'0')}h : ${String(minutos).padStart(2,'0')}m : ${String(segundos).padStart(2,'0')}s`;
}

function actualizarVisualLote() {
    const txtUsd = document.getElementById('oferta-usd-1');
    const txtBs = document.getElementById('oferta-bs-1');
    
    if (txtUsd) txtUsd.innerText = `$${loteActivo.oferta_actual_usd.toFixed(2)} USDT`;
    if (txtBs) {
        const totalBs = loteActivo.oferta_actual_usd * tasaBcvSubasta;
        txtBs.innerText = `~ ${totalBs.toFixed(2)} Bs.`;
    }
}

async function ejecutarCierreLoteEscrow() {
    const txtTimer = document.getElementById('timer-1');
    if (txtTimer) {
        txtTimer.innerText = "¡PUJA CERRADA EN AUDITORÍA!";
        txtTimer.style.color = "#eab308";
    }

    const inputPuja = document.getElementById('monto-pujar-1');
    const btnPujar = document.querySelector('.btn-pujar');
    if (inputPuja) inputPuja.disabled = true;
    if (btnPujar) {
        btnPujar.disabled = true;
        btnPujar.style.backgroundColor = '#334155';
        btnPujar.style.color = '#94a3b8';
        btnPujar.style.boxShadow = 'none';
    }

    const montoBrutoFinal = loteActivo.oferta_actual_usd;
    const comisionPlataforma = montoBrutoFinal * loteActivo.comision_porcentaje;
    const netoParaElVendedor = montoBrutoFinal - comisionPlataforma;

    console.log(`💰 LIQUIDACIÓN: Bruto $${montoBrutoFinal} | Comisión 10%: $${comisionPlataforma.toFixed(2)} | Neto Vendedor: $${netoParaElVendedor.toFixed(2)}`);

    try {
        const { error: errInsert } = await supabaseClient
            .from('Historial_Subastas_Liquidadas') 
            .insert([{
                id_carta: loteActivo.id_carta, 
                vendedor_id: loteActivo.vendedor_id,
                comprador_id: loteActivo.ultimo_postulante, 
                monto_bruto_usd: montoBrutoFinal,
                comision_plataforma_usd: comisionPlataforma,
                monto_neto_vendedor_usd: netoParaElVendedor,
                estado_pago: 'PENDIENTE',
                referencia_bancaria: 'ESPERANDO_P2P'
            }]);

        if (errInsert) throw errInsert;
        alert(`🚨 ¡LOTE FINALIZADO!\nLa oferta ganadora fue de $${montoBrutoFinal.toFixed(2)} USDT.\nSe ha retenido el 10% ($${comisionPlataforma.toFixed(2)} USDT).`);

    } catch (err) {
        console.error("Error al asentar la liquidación en Supabase:", err);
    }
}

function ejecutarPujaInteractiva(idLote) {
    const inputMonto = document.getElementById(`monto-pujar-${idLote}`);
    if (!inputMonto) return;
    
    const nuevoMonto = parseFloat(inputMonto.value);
    if (nuevoMonto > loteActivo.oferta_actual_usd) {
        loteActivo.oferta_actual_usd = nuevoMonto;
        loteActivo.ultimo_postulante = "usuario_local";
        actualizarVisualLote();
        alert(`✅ Puja registrada por $${nuevoMonto.toFixed(2)} USDT.`);
    } else {
        alert("⚠️ La oferta debe ser superior al monto actual.");
    }
}
