// =============================================================================
// 💻 CONSOLA DE MANDO Y GESTIÓN DE VERIFICACIÓN DE PAGOS
// =============================================================================

const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";

let supabaseAdminClient = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (typeof supabase !== 'undefined') {
        supabaseAdminClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("❌ Error crítico: El SDK de Supabase no está disponible en el panel.");
    }

    const btnConsultar = document.getElementById('btn-consultar-pagos') || document.querySelector('.btn-consultar-pagos');
    if (btnConsultar) {
        btnConsultar.addEventListener('click', consultarPagosPendientesAdmin);
    }

    // Cargar automáticamente al iniciar la consola de verificación
    await consultarPagosPendientesAdmin();
});

async function consultarPagosPendientesAdmin() {
    try {
        if (!supabaseAdminClient) return;

        const contenedorTabla = document.getElementById('tabla-verificacion-cuerpo') || document.querySelector('.grilla-verificacion') || document.querySelector('table');
        
        // Consultar todas las compras pendientes o el historial reciente en Supabase
        let { data: compras, error } = await supabaseAdminClient
            .from('compras_barajitas')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.error("❌ Error al consultar pagos en Supabase:", error.message);
            alert("No se pudieron cargar los pagos pendientes.");
            return;
        }

        renderizarTablaAdminPagos(compras);

    } catch (e) {
        console.error("Excepción en consultarPagosPendientesAdmin:", e);
    }
}

function renderizarTablaAdminPagos(compras) {
    // Buscamos o creamos el contenedor de la grilla administrativa
    let contenedor = document.getElementById('contenedor-lista-pagos');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'contenedor-lista-pagos';
        document.body.appendChild(contenedor);
    }

    // Si ya existe la estructura visual en el HTML proporcionada por la interfaz visual:
    console.log("Pagos obtenidos para auditoría:", compras);
}

// Función robusta para aprobar el pago y sincronizar directamente con la Colección del Usuario
async function aprobarPagoYAsignarBarajita(idCompra) {
    try {
        if (!supabaseAdminClient) {
            alert("Cliente de Supabase no inicializado.");
            return;
        }

        // 1. Obtener los detalles de la compra específica
        const { data: compra, error: errCompra } = await supabaseAdminClient
            .from('compras_barajitas')
            .select('*')
            .eq('id', idCompra)
            .single();

        if (errCompra || !compra) {
            alert("No se encontró la información de esta compra.");
            return;
        }

        const usuarioIdLimpio = String(compra.user_id || "").trim().toLowerCase();
        const idBarajitaNum = Number(compra.barajita_id);
        const cantidadComprada = Number(compra.cantidad) || 1;

        if (!usuarioIdLimpio || isNaN(idBarajitaNum)) {
            alert("Error: Datos de usuario o barajita inválidos en el registro.");
            return;
        }

        // 2. Actualizar el estado de la compra a 'aprobado'
        const { error: errUpdate } = await supabaseAdminClient
            .from('compras_barajitas')
            .update({ estado: 'aprobado' })
            .eq('id', idCompra);

        if (errUpdate) {
            alert("Error al actualizar el estado de la compra en la base de datos.");
            return;
        }

        // 3. Verificar si el usuario ya posee la barajita en su Coleccion_Usuario
        let { data: existente, error: errCol } = await supabaseAdminClient
            .from('Coleccion_Usuario')
            .select('*')
            .eq('usuario_id', usuarioIdLimpio)
            .eq('carta_id', idBarajitaNum)
            .maybeSingle();

        let nuevaCantidad = cantidadComprada;

        if (existente) {
            nuevaCantidad = (Number(existente.cantidad) || 1) + cantidadComprada;
            // Actualizar registro existente sumando las cantidades
            const { error: errUpsert } = await supabaseAdminClient
                .from('Coleccion_Usuario')
                .update({ cantidad: nuevaCantidad })
                .eq('usuario_id', usuarioIdLimpio)
                .eq('carta_id', idBarajitaNum);

            if (errUpsert) {
                console.error("Error al actualizar la cantidad en la colección:", errUpsert.message);
            }
        } else {
            // Insertar nuevo registro en la colección del usuario
            const { error: errInsert } = await supabaseAdminClient
                .from('Coleccion_Usuario')
                .insert([
                    {
                        usuario_id: usuarioIdLimpio,
                        carta_id: idBarajitaNum,
                        cantidad: cantidadComprada
                    }
                ]);

            if (errInsert) {
                console.error("Error al insertar la barajita en la colección:", errInsert.message);
            }
        }

        alert(`¡Pago Aprobado con Éxito! Se han acreditado ${cantidadComprada} barajita(s) #${idBarajitaNum} al usuario @${usuarioIdLimpio}.`);
        await consultarPagosPendientesAdmin();

    } catch (e) {
        console.error("Excepción crítica al aprobar el pago:", e);
        alert("Ocurrió un error inesperado al procesar la aprobación.");
    }
}

async function rechazarPagoAdmin(idCompra) {
    try {
        if (!supabaseAdminClient) return;

        const { error } = await supabaseAdminClient
            .from('compras_barajitas')
            .update({ estado: 'rechazado' })
            .eq('id', idCompra);

        if (error) {
            alert("No se pudo rechazar el pago.");
            return;
        }

        alert("Pago marcado como rechazado.");
        await consultarPagosPendientesAdmin();

    } catch (e) {
        console.error("Error en rechazarPagoAdmin:", e);
    }
}
