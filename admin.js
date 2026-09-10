// ========================================================
// 💻 CORE DE OPERACIONES DE ADMINISTRACIÓN CENTRALIZADA
// ========================================================
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "tu-anon-key-real-de-supabase";
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

// 3. LÓGICA DE ENVÍO DE REGALOS / PREMIOS MANUALES (DROPS DIRECTOS)
const btnRegalo = document.getElementById('btn-enviar-regalo');
if (btnRegalo) {
    btnRegalo.addEventListener('click', async () => {
        const usuarioDestino = document.getElementById('regalo-usuario-id').value.trim();
        const tipoRegalo = document.getElementById('regalo-tipo-seleccion').value;
        const cantidad = parseInt(document.getElementById('regalo-cantidad').value) || 1;
        const idCartaEspecifica = document.getElementById('regalo-carta-id').value;

        if (!usuarioDestino) return alert("Escribe el ID del jugador.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (!idCartaEspecifica) return alert("Escribe el ID de la carta.");
                await ejecutarAsignacionRegalo(usuarioDestino, idCartaEspecifica, cantidad);
                alert(`🎁 Drop completado: ${cantidad} copia(s) de la carta #${idCartaEspecifica} inyectadas.`);
            } else {
                // Sacar un lote al azar de las cartas creadas en el sistema
                const { data: pool } = await supabaseClient.from('Cartas').select('id_carta');
                if (!pool || pool.length === 0) return alert("No hay cartas en el catálogo.");

                for (let i = 0; i < cantidad; i++) {
                    const randomIndex = Math.floor(Math.random() * pool.length);
                    await ejecutarAsignacionRegalo(usuarioDestino, pool[randomIndex].id_carta, 1);
                }
                alert(`🎁 Drop sorpresa completado: ${cantidad} cartas enviadas al libro.`);
            }
        } catch (error) {
            console.error(error);
            alert("Fallo en la inyección de regalos: " + error.message);
        }
    });
}

// Función auxiliar para insertar o acumular cartas duplicadas
async function ejecutarAsignacionRegalo(idUser, idCard, cant) {
    const { data: record } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('id_usuario', idUser)
        .eq('id_carta', idCard)
        .maybeSingle();

    if (record) {
        await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: record.cantidad + cant })
            .eq('id_registro', record.id_registro);
    } else {
        await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ id_usuario: idUser, id_carta: idCard, cantidad: cant }]);
    }
}
