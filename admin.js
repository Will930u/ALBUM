// ========================================================
// 💻 CORE DE OPERACIONES DE ADMINISTRACIÓN CENTRALIZADA
// ========================================================
const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. CONTROLADOR DE CAMBIO DE PESTAÑAS (SPA INTERNA)
function cambiarPestana(idPestana) {
    // Desactivar todas las pestañas visualmente
    document.querySelectorAll('.contenido-pestana').forEach(seccion => {
        seccion.classList.remove('activa');
    });
    document.querySelectorAll('.tab-btn').forEach(boton => {
        boton.classList.remove('activo');
    });

    // Activar la pestaña seleccionada
    document.getElementById(idPestana).classList.add('activa');
    event.currentTarget.classList.add('activo');
}

// 2. LÓGICA DE CARGA AUTOMÁTICA DE CARTAS EN LA BASE DE DATOS
const formCarga = document.getElementById('form-subir-carta');
if (formCarga) {
    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('carta-nombre').value;
        const tipo = document.getElementById('carta-tipo').value;
        const salud = parseInt(document.getElementById('carta-salud').value);
        const poder = parseInt(document.getElementById('carta-poder').value);
        const ataque = document.getElementById('carta-ataque').value;
        const habitat = document.getElementById('carta-habitat').value;
        const rareza = document.getElementById('carta-rareza').value;
        const lore = document.getElementById('carta-lore').value;
        const urlImagen = document.getElementById('carta-url-manual').value;

        try {
            const { data, error } = await supabaseClient
                .from('Cartas')
                .insert([{
                    nombre: nombre,
                    tipo: tipo,
                    salud: salud,
                    poder: poder,
                    ataque_nombre: ataque,
                    habitat: habitat,
                    rareza: rareza,
                    url_imagen: urlImagen
                }])
                .select();

            if (error) throw error;

            alert(`¡ÉXITO CRÍTICO!\nCarta publicada en el catálogo.\nID Asignado: #${data[0].id_carta}`);
            formCarga.reset();

        } catch (error) {
            console.error(error);
            alert("Error de inyección: " + error.message);
        }
    });
}

// ========================================================
// 🎁 CONTROLADOR DINÁMICO PARA LA PESTAÑA DE REGALOS (DROPS)
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    
    if (btnRegalo) {
        btnRegalo.addEventListener('click', async () => {
            // 1. Capturar los inputs de la interfaz pixel art
            const usuarioDestino = document.getElementById('regalo-usuario-id').value.trim();
            const tipoRegalo = document.getElementById('regalo-tipo-seleccion').value; // SORPRESA o ESPECIFICA
            const idCartaEspecifica = parseInt(document.getElementById('regalo-carta-id').value);
            const cantidad = parseInt(document.getElementById('regalo-cantidad').value) || 1;

            // Validación de seguridad básica en el cliente
            if (!usuarioDestino) {
                alert("❌ ERROR: Introduce el ID de Telegram del jugador destino.");
                return;
            }

            try {
                if (tipoRegalo === "ESPECIFICA") {
                    // ----------------------------------------------------
                    // MODO A: INYECTAR UNA CARTA EXACTA DEL CATÁLOGO
                    // ----------------------------------------------------
                    if (isNaN(idCartaEspecifica)) {
                        alert("❌ ERROR: Para este modo debes ingresar un ID de carta válido.");
                        return;
                    }

                    // Verificar primero si la carta que quieres regalar existe en el catálogo global
                    const { data: cartaExiste } = await supabaseClient
                        .from('Cartas')
                        .select('id_carta')
                        .eq('id_carta', idCartaEspecifica)
                        .maybeSingle();

                    if (!cartaExiste) {
                        alert(`❌ ERROR: La carta ID #${idCartaEspecifica} no existe en el catálogo global.`);
                        return;
                    }

                    // Ejecutar la inyección en el inventario
                    await registrarCartaEnInventario(usuarioDestino, idCartaEspecifica, cantidad);
                    alert(`🎁 ¡ÉXITO! Se han inyectado ${cantidad} copia(s) de la carta #${idCartaEspecifica} a [${usuarioDestino}].`);

                } else {
                    // ----------------------------------------------------
                    // MODO B: PAQUETE DE CARTAS AL AZAR (DROP SORPRESA)
                    // ----------------------------------------------------
                    // 1. Descargar todos los IDs de cartas que has publicado hasta el momento
                    const { data: catalogoPool, error: errPool } = await supabaseClient
                        .from('Cartas')
                        .select('id_carta');

                    if (errPool) throw errPool;
                    if (!catalogoPool || catalogoPool.length === 0) {
                        alert("❌ ERROR: No puedes dar regalos sorpresa porque no hay cartas publicadas en el catálogo.");
                        return;
                    }

                    // 2. Ejecutar un bucle matemático para elegir cartas al azar del pool disponible
                    for (let i = 0; i < cantidad; i++) {
                        const indiceAleatorio = Math.floor(Math.random() * catalogoPool.length);
                        const idCartaAzar = catalogoPool[indiceAleatorio].id_carta;
                        
                        // Registrar cada carta sorpresa una por una
                        await registrarCartaEnInventario(usuarioDestino, idCartaAzar, 1);
                    }

                    alert(`🎁 ¡ÉXITO! Se ha inyectado un paquete de ${cantidad} cartas al azar al jugador [${usuarioDestino}].`);
                }

                // 3. Limpiar los campos del formulario tras la inyección exitosa
                document.getElementById('regalo-carta-id').value = "";
                document.getElementById('regalo-cantidad').value = "1";

            } catch (error) {
                console.error("Fallo crítico en el bloque de regalos:", error);
                alert("❌ ERROR DE RED: No se pudo conectar con Supabase. " + error.message);
            }
        });
    }
});

// ========================================================
// 🗄️ FUNCIÓN AUXILIAR: LOGICA ESCROW PARA EVITAR DUPLICADOS
// ========================================================
async function registrarCartaEnInventario(idUsuario, idCarta, cantidadAAgregar) {
    // 1. Comprobar si el usuario ya posee previamente esta barajita en su libro
    const { data: registroExistente, error: errConsulta } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('id_usuario', idUsuario)
        .eq('id_carta', idCarta)
        .maybeSingle(); // Devuelve la fila o null de forma limpia

    if (errConsulta) throw errConsulta;

    if (registroExistente) {
        // CASO 1: Si ya la tiene, hacemos un UPDATE matemático sumando las copias repetidas
        const { error: errUpdate } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: registroExistente.cantidad + cantidadAAgregar })
            .eq('id_registro', registroExistente.id_registro);

        if (errUpdate) throw errUpdate;
    } else {
        // CASO 2: Si es una carta completamente nueva para él, hacemos un INSERT creando el slot
        const { error: errInsert } = await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{
                id_usuario: idUsuario,
                id_carta: idCarta,
                cantidad: cantidadAAgregar
            }]);

        if (errInsert) throw errInsert;
    }
}
