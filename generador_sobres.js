// =============================================================================
// 🎰 ALGORITMO ALEATORIO DE LOTERÍA: APERTURA DE SOBRES DINÁMICOS
// =============================================================================

/**
 * Función central para abrir sobres y repartir cartas al azar
 * @param {string} idUsuario - ID de Telegram del jugador receptor
 * @param {number} cantidadSobres - Cuántos sobres de $0.62 compró
 * @param {string} rarezaHitoFiltro - 'Común', 'Rara', 'Épica' o 'Mitológica' (Fase de la era activa)
 */
async function ejecutarAperturaSobresSorpresa(idUsuario, cantidadSobres, rarezaHitoFiltro = 'Común') {
    // Regla de juego: Cada sobre contiene exactamente 3 cartas sorpresa
    const TOTAL_CARTAS_A_ENTREGAR = cantidadSobres * 3;
    console.log(`🎰 Iniciando sorteo de ${TOTAL_CARTAS_A_ENTREGAR} cartas para el usuario [${idUsuario}]...`);

    try {
        // 1. Descargar desde Supabase el catálogo de cartas que correspondan AL HITO ACTIVO de tu colección
        const { data: poolCartasDisponibles, error: errPool } = await supabaseClient
            .from('Cartas')
            .select('id_carta, rareza')
            .eq('rareza', rarezaHitoFiltro); // Filtra para que no salgan mitológicas antes de tiempo

        if (errPool) throw errPool;

        if (!poolCartasDisponibles || poolCartasDisponibles.length === 0) {
            console.error("❌ Error: No hay cartas publicadas en la base de datos para este Hito/Rareza.");
            return;
        }

        // 2. Ejecutar el bucle de la lotería matemática en la memoria del servidor
        const cartasGanadasIds = [];
        for (let i = 0; i < TOTAL_CARTAS_A_ENTREGAR; i++) {
            // Elige un índice al azar usando el tamaño del catálogo disponible
            const indiceAleatorio = Math.floor(Math.random() * poolCartasDisponibles.length);
            const cartaSorteadaId = poolCartasDisponibles[indiceAleatorio].id_carta;
            
            cartasGanadasIds.push(cartaSorteadaId);
        }

        console.log("🎲 IDs de cartas ganadas en el sorteo:", cartasGanadasIds);

        // 3. Inyectar de forma segura las cartas ganadas en el álbum del usuario (Coleccion_Usuario)
        for (const idCarta of cartasGanadasIds) {
            await guardarCartaEnColeccionUsuario(idUsuario, idCarta);
        }

        console.log(`✅ ¡Éxito! Álbum del usuario [${idUsuario}] actualizado con sus nuevas criaturas.`);
        return cartasGanadasIds; // Devuelve la lista para que la Mini App las haga girar en la pantalla

    } catch (error) {
        console.error("❌ Fallo crítico en el algoritmo de la lotería de sobres:", error);
    }
}

// LÓGICA AUXILIAR: Evita crear filas infinitas en Supabase, incrementando la cantidad si ya la tiene repetida
async function guardarCartaEnColeccionUsuario(idUsuario, idCarta) {
    // Verificar si el jugador ya posee al menos una copia previa de esa criatura exacta
    const { data: registroExistente, error: errConsulta } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('id_usuario', idUsuario)
        .eq('id_carta', idCarta)
        .maybeSingle();

    if (errConsulta) throw errConsulta;

    if (registroExistente) {
        // CASO A: Si ya la tiene, hacemos un UPDATE sumando +1 a sus cartas repetidas (para que pueda subastarla)
        await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: registroExistente.cantidad + 1 })
            .eq('id_registro', registroExistente.id_registro);
    } else {
        // CASO B: Si es la primera vez que le sale, hacemos un INSERT creando el slot en su libro
        await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{
                id_usuario: idUsuario,
                id_carta: idCarta,
                cantidad: 1
            }]);
    }
}
