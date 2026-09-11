// =============================================================================
// 💻 CONSOLA ADMINISTRATIVA CON PREVISUALIZADOR TCG EN VIVO Y ÁLBUM GLOBAL
// =============================================================================

const SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeG1qcGdud3F4eXpdam5ud2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTk4MzIsImV4cCI6MjEwNDE5NTgzMn0.5ZLVDAUHXpITQs2GpDhtGAXTphZUZ7gaE4ElIHPsaAo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let rawImageSrc = "https://via.placeholder.com/400x300/1e293b/f59e0b?text=Subir+Imagen";

document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventosVistaPrevia();
    configurarFormularioCargaCartas();
    configurarBotonRegalosManuales();
    await cargarAlbumGlobalAdmin();
    await cargarTransaccionesPendientesEscrow();
});

// NAVEGACIÓN SPA
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const objetivo = document.getElementById(idPestana);
    if (objetivo) objetivo.classList.add('activa');

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('activo');
    }
}

function conmutarCamposFormulario(modo) {
    const bloqueEstadisticas = document.getElementById('bloque-estadisticas-manuales');
    if (!bloqueEstadisticas) return;
    bloqueEstadisticas.style.display = (modo === "LISTA") ? "none" : "block";
}

// BINDING DE PREVISUALIZACIÓN EN TIEMPO REAL
function inicializarEventosVistaPrevia() {
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

    inputNombre?.addEventListener('input', e => document.getElementById('preview-nombre').textContent = e.target.value || 'Nombre');
    inputTipo?.addEventListener('input', e => document.getElementById('preview-tipo').textContent = e.target.value || '[ Tipo ]');
    inputAtk?.addEventListener('input', e => document.getElementById('preview-atk').textContent = e.target.value || '0');
    inputSalud?.addEventListener('input', e => document.getElementById('preview-def').textContent = e.target.value || '0');
    inputLore?.addEventListener('input', e => document.getElementById('preview-lore').textContent = e.target.value || 'Lore...');
    
    inputColor?.addEventListener('change', e => {
        const contenedor = document.getElementById('cardContainer');
        contenedor.className = `tcg-card card-theme-${e.target.value}`;
    });

    inputRareza?.addEventListener('change', e => {
        const estrellasMap = { "Común": "⭐", "Rara": "⭐⭐", "Épica": "⭐⭐⭐", "Mitológica": "⭐⭐⭐⭐⭐" };
        document.getElementById('preview-rareza').textContent = estrellasMap[e.target.value] || "⭐";
    });

    inputArchivo?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = evt => {
                rawImageSrc = evt.target.result;
                aplicarFiltroPixelArt();
            };
            reader.readAsDataURL(file);
        }
    });

    togglePixel?.addEventListener('change', e => {
        document.getElementById('pixelControls').style.display = e.target.checked ? "grid" : "none";
        aplicarFiltroPixelArt();
    });

    selectPixelRes?.addEventListener('change', aplicarFiltroPixelArt);
}

function aplicarFiltroPixelArt() {
    const toggle = document.getElementById('togglePixel');
    const previewImg = document.getElementById('preview-imagen');
    const resSel = document.getElementById('selectPixelRes');

    if (!toggle || !toggle.checked) {
        previewImg.src = rawImageSrc;
        previewImg.classList.remove('pixelated');
        return;
    }

    previewImg.classList.add('pixelated');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = parseInt(resSel.value);
        const ratio = img.height / img.width;

        canvas.width = targetWidth;
        canvas.height = Math.round(targetWidth * ratio);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        previewImg.src = canvas.toDataURL();
    };
    img.src = rawImageSrc;
}

// SUBIDA A SUPABASE Y RENDERIZADO COMPLETO
function configurarFormularioCargaCartas() {
    const formCarga = document.getElementById('form-subir-carta');
    if (!formCarga) return;

    formCarga.addEventListener('submit', async (e) => {
        e.preventDefault();

        const previewImg = document.getElementById('preview-imagen');
        const modoCarga = document.getElementById('modo-diseno-carta').value;

        try {
            alert("🛰️ Transmitiendo carta e ilustración a Supabase...");

            let blobFinal;
            if (document.getElementById('togglePixel').checked) {
                const resp = await fetch(previewImg.src);
                blobFinal = await resp.blob();
            } else {
                const inputArchivo = document.getElementById('carta-archivo-jpg');
                if (!inputArchivo.files[0]) return alert("❌ Selecciona una imagen.");
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
                nombre: document.getElementById('carta-nombre').value.trim(),
                rareza: document.getElementById('carta-rareza').value,
                imagen_url: urlPublica.publicUrl
            };

            if (modoCarga === "NORMAL") {
                datosCarta.tipo = document.getElementById('carta-tipo-etiqueta').value.trim();
                datosCarta.poder = parseInt(document.getElementById('carta-poder').value) || 0;
                datosCarta.salud = parseInt(document.getElementById('carta-salud').value) || 0;
                datosCarta.lore = document.getElementById('carta-lore').value.trim();
                datosCarta.ataque = "Golpe Directo";
                datosCarta.habitat = "Desconocido";
            } else {
                datosCarta.tipo = "Diseño Externo";
                datosCarta.poder = 0;
                datosCarta.salud = 0;
                datosCarta.lore = "Imagen renderizada externamente.";
            }

            const { data: res, error: errInsert } = await supabaseClient.from('Cartas').insert([datosCarta]).select();
            if (errInsert) throw errInsert;

            alert(`✅ ¡CARTA CREADA EXITOSAMENTE!\nID Asignado: #${res[0].id}`);
            await cargarAlbumGlobalAdmin();
            formCarga.reset();

        } catch (error) {
            console.error("Error al publicar:", error);
            alert("❌ ERROR: " + error.message);
        }
    });
}

// ÁLBUM ADMINISTRATIVO DE TODAS LAS CARTAS
async function cargarAlbumGlobalAdmin() {
    const grid = document.getElementById('grid-coleccion-admin');
    if (!grid) return;

    grid.innerHTML = `<p style="font-size:7px; color:#00ff66;">CARGANDO COLECCIÓN...</p>`;

    try {
        const { data: cartas, error } = await supabaseClient
            .from('Cartas')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        grid.innerHTML = "";

        if (!cartas || cartas.length === 0) {
            grid.innerHTML = `<p style="font-size:7px; color:#888;">NO HAY CARTAS EN LA BASE DE DATOS.</p>`;
            return;
        }

        cartas.forEach(carta => {
            const cardItem = document.createElement('div');
            cardItem.className = 'tarjeta-admin-item';
            cardItem.innerHTML = `
                <img src="${carta.imagen_url || 'https://via.placeholder.com/150'}" alt="Carta">
                <div class="info-admin-card">
                    <strong>#${carta.id} ${carta.nombre}</strong>
                    <span>${carta.rareza}</span>
                </div>
                <div class="acciones-card-admin">
                    <button class="btn-mini-admin btn-mini-drop" onclick="prepararRegaloDirecto(${carta.id})">🎁</button>
                    <button class="btn-mini-admin btn-mini-del" onclick="destruirCartaPorIdDirecto(${carta.id})">🗑️</button>
                </div>
            `;
            grid.appendChild(cardItem);
        });

    } catch (err) {
        console.error("Error cargando álbum admin:", err);
        grid.innerHTML = `<p style="font-size:7px; color:#ff3333;">ERROR AL CÁRTAR EL ÁLBUM.</p>`;
    }
}

function prepararRegaloDirecto(idCarta) {
    cambiarPestana('seccion-regalos');
    document.getElementById('regalo-tipo-seleccion').value = "ESPECIFICA";
    document.getElementById('regalo-carta-id').value = idCarta;
}

async function destruirCartaPorIdDirecto(idCarta) {
    if (!confirm(`¿Destruir definitivamente la Carta #${idCarta}?`)) return;
    document.getElementById('id-carta-borrar').value = idCarta;
    await window.destruirCartaYMultimediaGlobal();
    await cargarAlbumGlobalAdmin();
}

// DROPS Y REGALOS
function configurarBotonRegalosManuales() {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    if (!btnRegalo) return;

    btnRegalo.addEventListener('click', async () => {
        const idUsuario = document.getElementById('regalo-usuario-id').value.trim();
        const tipoRegalo = document.getElementById('regalo-tipo-seleccion').value;
        const idCarta = parseInt(document.getElementById('regalo-carta-id').value);
        const cantidad = parseInt(document.getElementById('regalo-cantidad').value) || 1;

        if (!idUsuario) return alert("❌ Ingresa el ID del usuario.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (isNaN(idCarta)) return alert("❌ Especifica un ID numérico de carta.");
                await procesarAsignacionEnInventario(idUsuario, idCarta, cantidad);
                alert(`🎁 Drop enviado: ${cantidad} copia(s) a [${idUsuario}].`);
            } else {
                const { data: pool } = await supabaseClient.from('Cartas').select('id');
                if (!pool || pool.length === 0) return alert("❌ No hay cartas disponibles.");

                for (let i = 0; i < cantidad; i++) {
                    const rIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[rIdx].id, 1);
                }
                alert(`🎁 Drop sorpresa de ${cantidad} cartas enviado.`);
            }
        } catch (error) {
            console.error("Error en drop:", error);
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

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#00ff66;text-align:center;">CARGANDO...</td></tr>`;

    try {
        const { data: registros, error } = await supabaseClient
            .from('Pagos_Pendientes')
            .select('*')
            .eq('estatus', 'PENDIENTE')
            .order('id', { ascending: false });

        if (error) throw error;
        tablaCuerpo.innerHTML = "";

        if (!registros || registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">NO HAY PAGOS PENDIENTES</td></tr>`;
            return;
        }

        registros.forEach(pago => {
            const fila = document.createElement('tr');
            const bruto = parseFloat(pago.monto_usd);
            const comision = bruto * 0.10;
            const neto = bruto - comision;

            fila.innerHTML = `
                <td>#${pago.id}</td>
                <td style="color:#00ff66;">$${bruto.toFixed(2)}</td>
                <td style="color:#ffcc00;">$${comision.toFixed(2)}</td>
                <td>$${neto.toFixed(2)}</td>
                <td>
                    <button class="btn-aprobar-p2p" onclick="validarYEntregarSobresBancarios(${pago.id}, '${pago.usuario_id}', ${bruto})">VALIDAR</button>
                </td>
            `;
            tablaCuerpo.appendChild(fila);
        });
    } catch (err) {
        console.error("Error escrow:", err);
        tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#ff3333;text-align:center;">ERROR AL CONECTAR</td></tr>`;
    }
}

async function validarYEntregarSobresBancarios(pagoId, idJugador, montoUsd) {
    if (!confirm(`¿Confirmas la recepción del pago #${pagoId}?`)) return;

    try {
        const { error: errUpdate } = await supabaseClient
            .from('Pagos_Pendientes')
            .update({ estatus: 'APROBADO' })
            .eq('id', pagoId);

        if (errUpdate) throw errUpdate;

        const cantidadSobres = Math.max(Math.floor(montoUsd / 0.62), 1);
        const { data: pool } = await supabaseClient.from('Cartas').select('id');
        
        if (pool && pool.length > 0) {
            for (let i = 0; i < (cantidadSobres * 3); i++) {
                const rIdx = Math.floor(Math.random() * pool.length);
                await procesarAsignacionEnInventario(idJugador, pool[rIdx].id, 1);
            }
        }

        alert(`💰 ¡REPORTADO APROBADO!\nInyectados sobres al usuario [${idJugador}].`);
        await cargarTransaccionesPendientesEscrow();

    } catch (error) {
        console.error("Error aprobando:", error);
        alert("❌ FALLO: " + error.message);
    }
}

// DESTRUCTOR GLOBAL
window.destruirCartaYMultimediaGlobal = async function() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Ingresa un ID válido.");

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
