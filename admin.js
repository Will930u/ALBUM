// =============================================================================
// 💻 CONTROLADOR ADMINISTRATIVO CON PREVISUALIZADOR Y DUAL-MODE (PARTE 1)
// =============================================================================

const SUPABASE_URL = "https://supabase.co";
// Mantenemos tu clave pública anon segura vinculada por políticas RLS
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// SVG Inline Seguro de respaldo técnico
let rawImageSrc = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%231a1a24'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2300ff66' font-size='16' font-family='sans-serif'>SELECCIONA+UNA+IMAGEN</text></svg>";

document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventosVistaPrevia();
    configurarFormularioCargaCartas();
    configurarBotonRegalosManuales();
    await cargarAlbumGlobalAdmin();
    await cargarTransaccionesPendientesEscrow();
});

// CONTROLADOR SPA: INTERCAMBIO DE SECCIONES EN INTERFAZ RETRO
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const objetivo = document.getElementById(idPestana);
    if (objetivo) objetivo.classList.add('activa');

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('activo');
    }
}

// CAPTADORES EN VIVO PARA PINTAR TEXTOS EN LA CARTA TEMPLATE
function inicializarEventosVistaPrevia() {
    const selectorModo = document.getElementById('modo-diseno-carta');
    const inputNombre = document.getElementById('carta-nombre');
    const inputColor = document.getElementById('carta-tema-color');
    const inputRareza = document.getElementById('carta-rareza');
    const inputTipo = document.getElementById('carta-tipo'); // Corregido de carta-tipo-etiqueta a tu id real
    const inputAtk = document.getElementById('carta-poder');
    const inputSalud = document.getElementById('carta-salud');
    const inputLore = document.getElementById('carta-lore');
    const inputArchivo = document.getElementById('carta-archivo-jpg');
    const togglePixel = document.getElementById('togglePixel');
    const selectPixelRes = document.getElementById('selectPixelRes');

    // Conmutador interactivo (Ficha técnica por código vs Imagen externa terminada)
    selectorModo?.addEventListener('change', (e) => {
        const esLista = (e.target.value === "LISTA");
        
        const bloqueStats = document.getElementById('bloque-estadisticas-manuales');
        if (bloqueStats) bloqueStats.style.display = esLista ? "none" : "block";
        
        const bloqueTcg = document.getElementById('bloque-opciones-tcg');
        if (bloqueTcg) bloqueTcg.style.display = esLista ? "none" : "grid";
        
        const wrapperTcg = document.getElementById('wrapper-tcg-completo');
        if (wrapperTcg) wrapperTcg.style.display = esLista ? "none" : "block";
        
        const wrapperLista = document.getElementById('wrapper-imagen-lista');
        if (wrapperLista) wrapperLista.style.display = esLista ? "block" : "none";

        const cardContainer = document.getElementById('cardContainer');
        if (cardContainer) {
            if (esLista) {
                cardContainer.style.background = "#000000";
            } else {
                const temaActual = inputColor ? inputColor.value : "arcoiris";
                cardContainer.className = `tcg-card card-theme-${temaActual}`;
            }
        }
    });

    // Inyección de cadenas de texto dinámicas en vivo
    inputNombre?.addEventListener('input', e => {
        const preview = document.getElementById('preview-nombre');
        if (preview) preview.textContent = e.target.value || 'Nombre';
    });
    inputTipo?.addEventListener('input', e => {
        const preview = document.getElementById('preview-tipo');
        if (preview) preview.textContent = e.target.value || '[ Tipo ]';
    });
    inputAtk?.addEventListener('input', e => {
        const preview = document.getElementById('preview-atk');
        if (preview) preview.textContent = e.target.value || '0';
    });
    inputSalud?.addEventListener('input', e => {
        const preview = document.getElementById('preview-def');
        if (preview) preview.textContent = e.target.value || '0';
    });
    inputLore?.addEventListener('input', e => {
        const preview = document.getElementById('preview-lore');
        if (preview) preview.textContent = e.target.value || 'Lore...';
    });
    
    inputColor?.addEventListener('change', e => {
        const cardContainer = document.getElementById('cardContainer');
        if (cardContainer) cardContainer.className = `tcg-card card-theme-${e.target.value}`;
    });

    inputRareza?.addEventListener('change', e => {
        const estrellasMap = { "Común": "⭐", "Rara": "⭐⭐", "Épica": "⭐⭐⭐", "Mitológica": "⭐⭐⭐⭐⭐" };
        const preview = document.getElementById('preview-rareza');
        if (preview) preview.textContent = estrellasMap[e.target.value] || "⭐";
    });

    inputArchivo?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = evt => {
                rawImageSrc = evt.target.result;
                const previewLista = document.getElementById('preview-imagen-lista');
                if (previewLista) previewLista.src = rawImageSrc;
                aplicarFiltroPixelArt();
            };
            reader.readAsDataURL(file);
        }
    });

    togglePixel?.addEventListener('change', e => {
        const pixelCtrl = document.getElementById('pixelControls');
        if (pixelCtrl) pixelCtrl.style.display = e.target.checked ? "grid" : "none";
        aplicarFiltroPixelArt();
    });

    selectPixelRes?.addEventListener('change', aplicarFiltroPixelArt);
}
// =============================================================================
// 🎨 PROCESAMIENTO GRÁFICO DE FILTROS PIXEL-ART (8-BITS) EN CANVAS (PARTE 2)
// =============================================================================
function aplicarFiltroPixelArt() {
    const toggle = document.getElementById('togglePixel');
    const previewImg = document.getElementById('preview-imagen');
    const previewListaImg = document.getElementById('preview-imagen-lista');
    const resSel = document.getElementById('selectPixelRes');

    if (!toggle || !toggle.checked) {
        if (previewImg) {
            previewImg.src = rawImageSrc;
            previewImg.classList.remove('pixelated');
        }
        if (previewListaImg) {
            previewListaImg.src = rawImageSrc;
            previewListaImg.classList.remove('pixelated');
        }
        return;
    }

    if (previewImg) previewImg.classList.add('pixelated');
    if (previewListaImg) previewListaImg.classList.add('pixelated');

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = parseInt(resSel ? resSel.value : 64) || 64;
        const ratio = img.height / img.width;

        canvas.width = targetWidth;
        canvas.height = Math.round(targetWidth * ratio);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataPixel = canvas.toDataURL();
        if (previewImg) previewImg.src = dataPixel;
        if (previewListaImg) previewListaImg.src = dataPixel;
    };
    img.src = rawImageSrc;
}

// =============================================================================
// 📤 SUBIDA AUTOMATIZADA COMPLETA AL STORAGE Y CATÁLOGO GLOBAL
// =============================================================================
function configurarFormularioCargaCartas() {
    const formCarga = document.getElementById('form-subir-carta');
    if (!formCarga) return;

    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        const previewImg = document.getElementById('preview-imagen');
        const modoCargaElem = document.getElementById('modo-diseno-carta');
        const modoCarga = modoCargaElem ? modoCargaElem.value : "NORMAL";

        try {
            alert("🛰️ Transmitiendo multimedia al Storage de Supabase... Por favor espera.");

            let blobFinal;
            const togglePixel = document.getElementById('togglePixel');
            
            // Si el administrador activó el filtro pixel-art, extrae la imagen procesada del Canvas
            if (togglePixel && togglePixel.checked && previewImg) {
                const resp = await fetch(previewImg.src);
                blobFinal = await resp.blob();
            } else {
                const inputArchivo = document.getElementById('carta-archivo-jpg');
                if (!inputArchivo || !inputArchivo.files[0]) return alert("❌ ERROR: Selecciona un archivo de imagen JPG o PNG.");
                blobFinal = inputArchivo.files[0];
            }

            // Crear un identificador único basado en tiempo para el archivo de imagen en la nube
            const nombreArchivoUnico = `${Date.now()}_carta.png`;
            
            // Subir el archivo multimedia físico de forma libre al disco duro de tu Storage
            const { data: uploadData, error: errUpload } = await supabaseClient
                .storage
                .from('imagenes_cartas')
                .upload(nombreArchivoUnico, blobFinal, { cacheControl: '3600', upsert: false });

            if (errUpload) throw errUpload;

            // Recuperar la URL pública generada automáticamente por tu servidor en la nube
            const { data: urlPublica } = supabaseClient.storage.from('imagenes_cartas').getPublicUrl(nombreArchivoUnico);

            // Mapeo exacto de las columnas de tu tabla SQL oficial de la Fase 1
            let datosCarta = {
                nombre: (document.getElementById('carta-nombre')?.value || '').trim(),
                rareza: document.getElementById('carta-rareza')?.value || 'Común',
                url_imagen: urlPublica.publicUrl // Sincronizado de imagen_url a tu columna real url_imagen
            };

            if (modoCarga === "NORMAL") {
                datosCarta.tipo = (document.getElementById('carta-tipo')?.value || 'Tierra').trim(); // Mapeado a id 'carta-tipo'
                datosCarta.poder = parseInt(document.getElementById('carta-poder')?.value) || 0;
                datosCarta.salud = parseInt(document.getElementById('carta-salud')?.value) || 0;
                datosCarta.lore = (document.getElementById('carta-lore')?.value || '').trim();
                datosCarta.ataque_nombre = "Golpe Directo"; // Sincronizado de ataque a ataque_nombre
                datosCarta.habitat = "Desconocido";
            } else {
                datosCarta.tipo = "ArteFinal"; // Flag condicional elástico para el visor de cartas
                datosCarta.poder = 0;
                datosCarta.salud = 0;
                datosCarta.ataque_nombre = "DiseñoExterno";
                datosCarta.habitat = "Galaxia_Render";
                datosCarta.lore = "Imagen completa renderizada por el Administrador de forma externa.";
            }

            // Inserción inmutable dentro de tu catálogo global en Supabase
            const { data: res, error: errInsert } = await supabaseClient.from('Cartas').insert([datosCarta]).select();
            if (errInsert) throw errInsert;

            alert(`✅ ¡ÉXITO MAESTRO!\nCarta publicada en la base de datos global.\nID Asignado en catálogo: #${res[0].id_carta}`); // Corregido de res[0].id a res[0].id_carta
            formCarga.reset();
            
            // Forzar recarga inmediata de la vitrina para reflejar la criatura nueva
            await cargarAlbumGlobalAdmin();

        } catch (error) {
            console.error("Fallo crítico en el motor de subida:", error);
            alert("❌ ERROR AL PUBLICAR: " + error.message);
        }
    });
}
// =============================================================================
// 📖 3. VITRINA DEL CATÁLOGO GLOBAL Y CONTROL DE PREMIOS DIRECTOS (PARTE 3)
// =============================================================================
async function cargarAlbumGlobalAdmin() {
    const grid = document.getElementById('grid-coleccion-admin');
    if (!grid) return;

    grid.innerHTML = `<p style="font-size:7px; color:#00ff66;">REVISANDO CATÁLOGO CENTRAL...</p>`;

    try {
        // Consulta exacta ordenando por tu identificador oficial de la Fase 1: id_carta
        const { data: cartas, error } = await supabaseClient
            .from('Cartas')
            .select('*')
            .order('id_carta', { ascending: false }); // Corregido de 'id' a 'id_carta'

        if (error) {
            console.error("Error al cargar el álbum:", error);
            grid.innerHTML = `<p style="font-size:7px; color:#ff3333;">ERROR AL OBTENER DATOS (${error.message || '400'})</p>`;
            return;
        }

        grid.innerHTML = "";

        if (!cartas || cartas.length === 0) {
            grid.innerHTML = `<p style="font-size:7px; color:#888;">CATÁLOGO VACÍO en Supabase.</p>`;
            return;
        }

        // Renderizado clásico retro de las miniaturas en tu panel de control
        cartas.forEach(carta => {
            const cardItem = document.createElement('div');
            cardItem.className = 'tarjeta-admin-item';
            cardItem.innerHTML = `
                <img src="${carta.url_imagen || 'https://placeholder.com'}" alt="Carta">
                <div class="info-admin-card">
                    <strong>#${carta.id_carta} ${carta.nombre || 'Sin Nombre'}</strong>
                    <span>${carta.rareza || 'Común'}</span>
                </div>
                <div class="acciones-card-admin">
                    <button class="btn-mini-admin btn-mini-drop" onclick="prepararRegaloDirecto(${carta.id_carta})">🎁</button>
                    <button class="btn-mini-admin btn-mini-del" onclick="destruirCartaPorIdDirecto(${carta.id_carta})">🗑️</button>
                </div>
            `;
            grid.appendChild(cardItem);
        });

    } catch (err) {
        console.error("Error inesperado en álbum admin:", err);
    }
}

function prepararRegaloDirecto(idCarta) {
    cambiarPestana('pestana-drops'); // Cambiado de 'seccion-regalos' a tu ID real del HTML 'pestana-drops'
    const regaloTipo = document.getElementById('regalo-tipo-seleccion');
    const regaloId = document.getElementById('regalo-carta-id');
    if (regaloTipo) regaloTipo.value = "ESPECIFICA";
    if (regaloId) regaloId.value = idCarta;
}

async function destruirCartaPorIdDirecto(idCarta) {
    if (!confirm(`¿Destruir de forma definitiva la carta #${idCarta}?`)) return;
    const inputBorrar = document.getElementById('id-carta-borrar');
    if (inputBorrar) inputBorrar.value = idCarta;
    await window.destruirCartaYMultimediaGlobal();
}

// =============================================================================
// 🎁 4. LÓGICA DE REGALOS: INYECCIÓN MANUAL POR TELEGRAM ID
// =============================================================================
function configurarBotonRegalosManuales() {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    if (!btnRegalo) return;

    btnRegalo.addEventListener('click', async () => {
        const idUsuario = (document.getElementById('regalo-usuario-id')?.value || '').trim();
        const tipoRegalo = document.getElementById('regalo-tipo-seleccion')?.value;
        const idCarta = parseInt(document.getElementById('regalo-carta-id')?.value);
        const cantidad = parseInt(document.getElementById('regalo-cantidad')?.value) || 1;

        if (!idUsuario) return alert("❌ Introduce el ID de Telegram del jugador destino.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (isNaN(idCarta)) return alert("❌ Especifica un ID de carta válido.");
                await procesarAsignacionEnInventario(idUsuario, idCarta, cantidad);
                alert(`🎁 Drop exitoso: ${cantidad} copia(s) enviadas al usuario [${idUsuario}].`);
            } else {
                // Modo Paquete al Azar: Consulta el pool real indexado por id_carta
                const { data: pool, error: errPool } = await supabaseClient.from('Cartas').select('id_carta'); // Corregido de 'id' a 'id_carta'
                if (errPool) throw errPool;
                if (!pool || pool.length === 0) return alert("❌ No hay cartas en el catálogo central.");

                for (let i = 0; i < cantidad; i++) {
                    const rIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[rIdx].id_carta, 1);
                }
                alert(`🎁 Drop sorpresa completado: ${cantidad} carta(s) inyectadas al azar.`);
            }
            if (document.getElementById('regalo-carta-id')) document.getElementById('regalo-carta-id').value = "";
        } catch (error) {
            console.error("Error drop:", error);
            alert("❌ ERROR EN ENVÍO: " + error.message);
        }
    });
}

async function procesarAsignacionEnInventario(idUser, idCard, cant) {
    // Sincronizado estricto con las columnas de tu tabla 'Coleccion_Usuario' de la Fase 1
    const { data: existente } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('id_usuario', idUser) // Corregido de usuario_id a id_usuario
        .eq('id_carta', idCard)    // Corregido de carta_id a id_carta
        .maybeSingle();

    if (existente) {
        await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: existente.cantidad + cant })
            .eq('id_registro', existente.id_registro); // Corregido de 'id' a 'id_registro'
    } else {
        await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ id_usuario: idUser, id_carta: idCard, cantidad: cant }]);
    }
}

// =============================================================================
// ⚖️ 5. AUDITORÍA ESCROW DE PAGO MÓVIL EN VIVO
// =============================================================================
async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#00ff66;text-align:center;">REVISANDO REPORTES BANCARIOS...</td></tr>`;

    try {
        const { data: registros, error } = await supabaseClient
            .from('Historial_Subastas_Liquidadas')
            .select('*')
            .eq('estado_pago', 'PENDIENTE')
            .order('id_lote', { ascending: false });

        if (error) throw error;

        tablaCuerpo.innerHTML = "";

        if (!registros || registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">NO HAY TRANSACCIONES PENDIENTES</td></tr>`;
            return;
        }

        registros.forEach(lote => {
            const fila = document.createElement('tr');
            const bruto = parseFloat(lote.monto_bruto_usd);
            const comision = bruto * 0.10;
            const neto = bruto - comision;

            fila.innerHTML = `
                <td>#${lote.id_lote}</td>
                <td class="txt-verde">$${bruto.toFixed(2)}</td>
                <td class="txt-oro">$${comision.toFixed(2)}</td>
                <td>$${neto.toFixed(2)}</td>
                <td>
                    <button class="btn-aprobar-p2p" onclick="validarYEntregarSobresBancarios(${lote.id_lote}, '${lote.comprador_id}', ${bruto})">VALIDAR</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });

    } catch (err) {
        console.error(err);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#ff3333;text-align:center;">ERROR DE RED</td></tr>`;
    }
}

// =============================================================================
// 🗑️ 6. DESTRUCTOR SUPREMO POR ID: PURGA DE REGISTROS Y ELIMINACIÓN DE IMÁGENES
// =============================================================================
window.destruirCartaYMultimediaGlobal = async function() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Por favor introduce un ID de carta numérico válido.");

    try {
        // 1. Consultar la url de la imagen en Supabase utilizando la columna indexada id_carta
        const { data: carta, error: errGet } = await supabaseClient
            .from('Cartas')
            .select('url_imagen') // Corregido de imagen_url a url_imagen
            .eq('id_carta', idCarta) // Corregido de id a id_carta
            .maybeSingle();

        if (errGet) throw errGet;
        if (!carta) return alert("❌ ERROR: El ID de carta especificado no existe en el catálogo.");

        // 2. Extraer el nombre de archivo exacto y purgarlo de la carpeta de almacenamiento en la nube
        if (carta.url_imagen) {
            const partesUrl = carta.url_imagen.split('/imagenes_cartas/');
            if (partesUrl.length > 1) {
                const nombreArchivoNube = partesUrl[1];
                console.log("🗑️ Extrayendo y borrando del Storage:", nombreArchivoNube);
                await supabaseClient.storage.from('imagenes_cartas').remove([nombreArchivoNube]);
            }
        }

        // 3. Destruir la fila de forma definitiva de tu tabla 'Cartas'
        const { error: errDelete } = await supabaseClient.from('Cartas').delete().eq('id_carta', idCarta); // Corregido de id a id_carta
        if (errDelete) throw errDelete;

        alert(`🗑️ ¡OPERACIÓN DESTRUCCIÓN COMPLETADA!\nLa carta #${idCarta} y su archivo físico han sido erradicados.`);
        alert(`🗑️ ¡OPERACIÓN DESTRUCCIÓN COMPLETADA!\nLa carta #${idCarta} y su archivo físico han sido erradicados.`);
        inputId.value = "";
        
        // Refrescar inmediatamente el catálogo visual del panel de administración
        await cargarAlbumGlobalAdmin();

    } catch (error) {
        console.error("Fallo crítico en el destructor:", error);
        alert("❌ ERROR DE PURGA: " + error.message);
    }
};
