// =============================================================================
// 💻 CONTROLADOR ADMINISTRATIVO CON PREVISUALIZADOR Y DUAL-MODE
// =============================================================================

const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpkam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// SVG Inline Seguro que nunca falla por red
let rawImageSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%231a1a24'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2300ff66' font-size='16' font-family='sans-serif'>SELECCIONA+UNA+IMAGEN</text></svg>";

document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventosVistaPrevia();
    configurarFormularioCargaCartas();
    configurarBotonRegalosManuales();
    await cargarAlbumGlobalAdmin();
    await cargarTransaccionesPendientesEscrow();
});

// CAMBIO DE PESTAÑAS
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const objetivo = document.getElementById(idPestana);
    if (objetivo) objetivo.classList.add('activa');

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('activo');
    }
}

// BINDINGS EN VIVO
function inicializarEventosVistaPrevia() {
    const selectorModo = document.getElementById('modo-diseno-carta');
    const inputNombre = document.getElementById('carta-nombre');
    const inputColor = document.getElementById('carta-tema-color');
    const inputRareza = document.getElementById('carta-rareza');
    const inputTipo = document.getElementById('carta-tipo-etiqueta');
    const inputAtk = document.getElementById('carta-poder');
    const inputSalud = document.getElementById('carta-salud');
    const inputLore = document.getElementById('carta-lore');
    const inputArchivo = document.getElementById('carta-archivo-jpg');
    const togglePixel = document.getElementById('togglePixel');
    const selectPixelRes = document.getElementById('selectPixelRes');

    // Conmutador del modo de diseño (Ficha vs Imagen Completa)
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

    // Cambio de Texto en Vivo
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
    
    // Cambio de Color de Fondo en Vivo
    inputColor?.addEventListener('change', e => {
        const cardContainer = document.getElementById('cardContainer');
        if (cardContainer) cardContainer.className = `tcg-card card-theme-${e.target.value}`;
    });

    // Cambio de Estrellas de Rareza
    inputRareza?.addEventListener('change', e => {
        const estrellasMap = { "Común": "⭐", "Rara": "⭐⭐", "Épica": "⭐⭐⭐", "Mitológica": "⭐⭐⭐⭐⭐" };
        const preview = document.getElementById('preview-rareza');
        if (preview) preview.textContent = estrellasMap[e.target.value] || "⭐";
    });

    // Carga e Inyección de Imagen
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

    // Opciones Pixel Art
    togglePixel?.addEventListener('change', e => {
        const pixelCtrl = document.getElementById('pixelControls');
        if (pixelCtrl) pixelCtrl.style.display = e.target.checked ? "grid" : "none";
        aplicarFiltroPixelArt();
    });

    selectPixelRes?.addEventListener('change', aplicarFiltroPixelArt);
}

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

// SUBIDA Y GUARDADO EN DATABASE
function configurarFormularioCargaCartas() {
    const formCarga = document.getElementById('form-subir-carta');
    if (!formCarga) return;

    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        const previewImg = document.getElementById('preview-imagen');
        const modoCargaElem = document.getElementById('modo-diseno-carta');
        const modoCarga = modoCargaElem ? modoCargaElem.value : "NORMAL";

        try {
            alert("🛰️ Guardando colección...");

            let blobFinal;
            const togglePixel = document.getElementById('togglePixel');
            if (togglePixel && togglePixel.checked && previewImg) {
                const resp = await fetch(previewImg.src);
                blobFinal = await resp.blob();
            } else {
                const inputArchivo = document.getElementById('carta-archivo-jpg');
                if (!inputArchivo || !inputArchivo.files[0]) return alert("❌ Selecciona un archivo de imagen.");
                blobFinal = inputArchivo.files[0];
            }

            const nombreArchivo = `${Date.now()}_carta.png`;
            const { data: uploadData, error: errUpload } = await supabaseClient
                .storage
                .from('imagenes_cartas')
                .upload(nombreArchivo, blobFinal, { cacheControl: '3600', upsert: false });

            if (errUpload) throw errUpload;

            const { data: urlPublica } = supabaseClient.storage.from('imagenes_cartas').getPublicUrl(nombreArchivo);

            let datosCarta = {
                nombre: (document.getElementById('carta-nombre')?.value || '').trim(),
                rareza: document.getElementById('carta-rareza')?.value || 'Común',
                imagen_url: urlPublica.publicUrl
            };

            if (modoCarga === "NORMAL") {
                datosCarta.tipo = (document.getElementById('carta-tipo-etiqueta')?.value || '').trim();
                datosCarta.poder = parseInt(document.getElementById('carta-poder')?.value) || 0;
                datosCarta.salud = parseInt(document.getElementById('carta-salud')?.value) || 0;
                datosCarta.lore = (document.getElementById('carta-lore')?.value || '').trim();
                datosCarta.ataque = "Golpe Directo";
                datosCarta.habitat = "Desconocido";
            } else {
                datosCarta.tipo = "Diseño Externo";
                datosCarta.poder = 0;
                datosCarta.salud = 0;
                datosCarta.lore = "Diseño externo importado.";
            }

            const { data: res, error: errInsert } = await supabaseClient.from('Cartas').insert([datosCarta]).select();
            if (errInsert) throw errInsert;

            alert(`✅ CARTA PUBLICADA!\nID Asignado: #${res[0].id}`);
            await cargarAlbumGlobalAdmin();

        } catch (error) {
            console.error("Error al publicar:", error);
            alert("❌ ERROR: " + error.message);
        }
    });
}

// ÁLBUM DEL ADMIN
async function cargarAlbumGlobalAdmin() {
    const grid = document.getElementById('grid-coleccion-admin');
    if (!grid) return;

    grid.innerHTML = `<p style="font-size:7px; color:#00ff66;">CARGANDO...</p>`;

    try {
        const { data: cartas, error } = await supabaseClient
            .from('Cartas')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.error("Error al cargar el álbum:", error);
            grid.innerHTML = `<p style="font-size:7px; color:#ff3333;">ERROR AL OBTENER DATOS (${error.message || '400'})</p>`;
            return;
        }

        grid.innerHTML = "";

        if (!cartas || cartas.length === 0) {
            grid.innerHTML = `<p style="font-size:7px; color:#888;">COLECCIÓN VACÍA.</p>`;
            return;
        }

        cartas.forEach(carta => {
            const cardItem = document.createElement('div');
            cardItem.className = 'tarjeta-admin-item';
            cardItem.innerHTML = `
                <img src="${carta.imagen_url || 'https://via.placeholder.com/150'}" alt="Carta">
                <div class="info-admin-card">
                    <strong>#${carta.id} ${carta.nombre || 'Sin Nombre'}</strong>
                    <span>${carta.rareza || 'Común'}</span>
                </div>
                <div class="acciones-card-admin">
                    <button class="btn-mini-admin btn-mini-drop" onclick="prepararRegaloDirecto(${carta.id})">🎁</button>
                    <button class="btn-mini-admin btn-mini-del" onclick="destruirCartaPorIdDirecto(${carta.id})">🗑️</button>
                </div>
            `;
            grid.appendChild(cardItem);
        });

    } catch (err) {
        console.error("Error inesperado en álbum admin:", err);
    }
}

function prepararRegaloDirecto(idCarta) {
    cambiarPestana('seccion-regalos');
    const regaloTipo = document.getElementById('regalo-tipo-seleccion');
    const regaloId = document.getElementById('regalo-carta-id');
    if (regaloTipo) regaloTipo.value = "ESPECIFICA";
    if (regaloId) regaloId.value = idCarta;
}

async function destruirCartaPorIdDirecto(idCarta) {
    if (!confirm(`¿Destruir carta #${idCarta}?`)) return;
    const inputBorrar = document.getElementById('id-carta-borrar');
    if (inputBorrar) inputBorrar.value = idCarta;
    await window.destruirCartaYMultimediaGlobal();
    await cargarAlbumGlobalAdmin();
}

// REGALOS / DROPS
function configurarBotonRegalosManuales() {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    if (!btnRegalo) return;

    btnRegalo.addEventListener('click', async () => {
        const idUsuario = (document.getElementById('regalo-usuario-id')?.value || '').trim();
        const tipoRegalo = document.getElementById('regalo-tipo-seleccion')?.value;
        const idCarta = parseInt(document.getElementById('regalo-carta-id')?.value);
        const cantidad = parseInt(document.getElementById('regalo-cantidad')?.value) || 1;

        if (!idUsuario) return alert("❌ Ingresa el ID del usuario.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (isNaN(idCarta)) return alert("❌ Ingresa un ID válido.");
                await procesarAsignacionEnInventario(idUsuario, idCarta, cantidad);
                alert(`🎁 Drop enviado: ${cantidad} copia(s) a [${idUsuario}].`);
            } else {
                const { data: pool, error: errPool } = await supabaseClient.from('Cartas').select('id');
                if (errPool) throw errPool;
                if (!pool || pool.length === 0) return alert("❌ No hay cartas.");

                for (let i = 0; i < cantidad; i++) {
                    const rIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[rIdx].id, 1);
                }
                alert(`🎁 Drop al azar de ${cantidad} carta(s) enviado.`);
            }
        } catch (error) {
            console.error("Error drop:", error);
            alert("❌ ERROR: " + error.message);
        }
    });
}

async function procesarAsignacionEnInventario(idUser, idCard, cant) {
    const { data: existente } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('usuario_id', idUser)
        .eq('carta_id', idCard)
        .maybeSingle();

    if (existente) {
        await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: existente.cantidad + cant })
            .eq('id', existente.id);
    } else {
        await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ usuario_id: idUser, carta_id: idCard, cantidad: cant }]);
    }
}

// ESCROW
async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">SIN PAGOS PENDIENTES</td></tr>`;
}

// DESTRUCTOR GLOBAL DE CARTAS
window.destruirCartaYMultimediaGlobal = async function() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Ingresa un ID numérico.");

    try {
        const { data: carta, error: errGet } = await supabaseClient
            .from('Cartas')
            .select('imagen_url')
            .eq('id', idCarta)
            .maybeSingle();

        if (errGet) throw errGet;
        if (!carta) return alert("❌ La carta no existe.");

        if (carta.imagen_url) {
            const partesUrl = carta.imagen_url.split('/imagenes_cartas/');
            if (partesUrl.length > 1) {
                await supabaseClient.storage.from('imagenes_cartas').remove([partesUrl[1]]);
            }
        }

        const { error: errDelete } = await supabaseClient.from('Cartas').delete().eq('id', idCarta);
        if (errDelete) throw errDelete;

        alert(`🗑️ Carta #${idCarta} eliminada.`);
        inputId.value = "";
        await cargarAlbumGlobalAdmin();

    } catch (error) {
        console.error("Error destruyendo:", error);
        alert("❌ ERROR: " + error.message);
    }
};
