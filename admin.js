// =============================================================================
// 💻 CONTROLADOR ADMINISTRATIVO ALGORÍTMICO Y RENDERIZADOR CANVAS ANIMADO
// =============================================================================//
const SUPABASE_URL = "https://ddbdemxrntjqncetyrnr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmRlbXhybnRqcW5jZXR5cm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MDYyNzQsImV4cCI6MjEwNDE4MjI3NH0.caXUy6CeiEMIcS4cQoRjZ0QEOaq7-EuIOP9UepXHALs";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// BANCO DE RECURSOS EN SVG/CANVAS DINÁMICOS
const BANCO_RECURSOS = {
    fondos: {
        COTIDIANO: ["#1e293b", "#0f172a", "#334155"],
        SALVAJE: ["#064e3b", "#14532d", "#022c22"],
        RARO: ["#581c87", "#3b0764", "#4c1d95"],
        MITOLOGICO: ["#831843", "#701a75", "#450a0a"]
    },
    marcos: {
        COTIDIANO: "#64748b",
        SALVAJE: "#22c55e",
        RARO: "#a855f7",
        MITOLOGICO: "#eab308"
    },
    personajes: [
        { id: 1, nombre: "Fénix", sim: "🔥" },
        { id: 2, nombre: "Dragón", sim: "🐉" },
        { id: 3, nombre: "Bestia", sim: "🐺" },
        { id: 4, nombre: "Espectro", sim: "👻" },
        { id: 5, nombre: "Robot", sim: "🤖" },
        { id: 6, nombre: "Alien", sim: "👾" },
        { id: 7, nombre: "Mago", sim: "🧙" },
        { id: 8, nombre: "Guerrero", sim: "⚔️" }
    ]
};

let combinacionActual = {
    etapa: "COTIDIANO",
    fondoIdx: 0,
    personajeIdx: 0,
    marcoColor: "#64748b",
    simbolo: "🔥"
};

let animFrameId = null;
let tiempoAnimacion = 0;

document.addEventListener('DOMContentLoaded', async () => {
    configurarSelectorEtapa();
    generarCombinacionAleatoria();
    iniciarBucleAnimacion();
    configurarFormularioGenerador();
    configurarBotonRegalosManuales();
    await cargarAlbumGlobalAdmin();
    await cargarTransaccionesPendientesEscrow();
});

// CAMBIO DE PESTAÑAS SPA
function cambiarPestana(idPestana) {
    document.querySelectorAll('.contenido-pestana').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));

    const objetivo = document.getElementById(idPestana);
    if (objetivo) objetivo.classList.add('activa');

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('activo');
    }
}

// CONFIGURACIÓN DEL SELECTOR DE ETAPA
function configurarSelectorEtapa() {
    const selEtapa = document.getElementById('gen-etapa-rareza');
    selEtapa?.addEventListener('change', () => {
        generarCombinacionAleatoria();
    });
}

// GENERACIÓN ALEATORIA SEGÚN ETAPA SELECCIONADA
function generarCombinacionAleatoria() {
    const etapa = document.getElementById('gen-etapa-rareza')?.value || "COTIDIANO";
    const fondosDisponibles = BANCO_RECURSOS.fondos[etapa];
    const marco = BANCO_RECURSOS.marcos[etapa];
    
    const rFondo = Math.floor(Math.random() * fondosDisponibles.length);
    const rPersonaje = Math.floor(Math.random() * BANCO_RECURSOS.personajes.length);
    const pObj = BANCO_RECURSOS.personajes[rPersonaje];

    combinacionActual = {
        etapa: etapa,
        fondoColor: fondosDisponibles[rFondo],
        fondoIdx: rFondo,
        personajeIdx: rPersonaje,
        personajeNombre: pObj.nombre,
        simbolo: pObj.sim,
        marcoColor: marco
    };

    const inputNombre = document.getElementById('gen-carta-nombre');
    if (inputNombre) inputNombre.value = `${pObj.nombre} ${etapa.charAt(0) + etapa.slice(1).toLowerCase()}`;

    const txtSemilla = document.getElementById('txt-semilla-json');
    if (txtSemilla) {
        txtSemilla.innerText = JSON.stringify({
            etapa: combinacionActual.etapa,
            f: combinacionActual.fondoIdx,
            p: combinacionActual.personajeIdx
        });
    }
}

// BUCLE DE ANIMACIÓN EN CANVAS HTML5
function iniciarBucleAnimacion() {
    const canvas = document.getElementById('canvasCartaGenerada');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function renderFrame() {
        tiempoAnimacion += 0.05;
        
        ctx.fillStyle = combinacionActual.fondoColor || "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        for (let i = 0; i < 5; i++) {
            let px = (Math.sin(tiempoAnimacion + i) * 100) + 150;
            let py = (Math.cos(tiempoAnimacion * 0.5 + i) * 150) + 210;
            ctx.beginPath();
            ctx.arc(px, py, 4 + i, 0, Math.PI * 2);
            ctx.fill();
        }

        let offsetY = Math.sin(tiempoAnimacion * 2) * 12;
        let escala = 1 + (Math.cos(tiempoAnimacion * 1.5) * 0.04);

        ctx.save();
        ctx.translate(canvas.width / 2, (canvas.height / 2) - 20 + offsetY);
        ctx.scale(escala, escala);
        ctx.font = "70px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(combinacionActual.simbolo || "👾", 0, 0);
        ctx.restore();

        ctx.strokeStyle = combinacionActual.marcoColor || "#64748b";
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

        ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
        ctx.fillRect(15, canvas.height - 55, canvas.width - 30, 40);
        ctx.strokeStyle = combinacionActual.marcoColor;
        ctx.strokeRect(15, canvas.height - 55, canvas.width - 30, 40);

        const nombreTxt = document.getElementById('gen-carta-nombre')?.value || "CARTA";
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText(nombreTxt.substring(0, 14), canvas.width / 2, canvas.height - 30);

        animFrameId = requestAnimationFrame(renderFrame);
    }

    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderFrame();
}

// GUARDADO DE LA RECETA EN SUPABASE
function configurarFormularioGenerador() {
    const form = document.getElementById('form-generador-algoritmico');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const temporada = document.getElementById('gen-temporada-nombre')?.value.trim();
        const nombre = document.getElementById('gen-carta-nombre')?.value.trim();

        if (!temporada || !nombre) return alert("❌ Completa los campos requeridos.");

        const datosReceta = {
            nombre: nombre,
            rareza: combinacionActual.etapa,
            tipo: "Algorítmica Canvas",
            lore: `Carta de la ${temporada}. Generada algorítmicamente.`,
            imagen_url: JSON.stringify({
                etapa: combinacionActual.etapa,
                fondoColor: combinacionActual.fondoColor,
                marcoColor: combinacionActual.marcoColor,
                simbolo: combinacionActual.simbolo,
                temporada: temporada
            })
        };

        try {
            const { data: res, error } = await supabaseClient
                .from('Cartas')
                .insert([datosReceta])
                .select();

            if (error) throw error;

            alert(`✅ RECETA PUBLICADA CON ÉXITO!\nID Asignado: #${res[0].id}`);
            await cargarAlbumGlobalAdmin();

        } catch (err) {
            console.error("Error guardando receta:", err);
            alert("❌ ERROR: " + err.message);
        }
    });
}

// CARGA DEL ÁLBUM DE RECETAS EN EL PANEL ADMIN
async function cargarAlbumGlobalAdmin() {
    const grid = document.getElementById('grid-coleccion-admin');
    const selectDrop = document.getElementById('regalo-carta-id-select');
    if (!grid) return;

    grid.innerHTML = `<p style="font-size:7px; color:#00ff66;">CARGANDO RECETAS...</p>`;
    if (selectDrop) selectDrop.innerHTML = `<option value="">-- Selecciona una Carta --</option>`;

    try {
        const { data: cartas, error } = await supabaseClient
            .from('Cartas')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        grid.innerHTML = "";

        if (!cartas || cartas.length === 0) {
            grid.innerHTML = `<p style="font-size:7px; color:#888;">SIN CARTAS REGISTRADAS.</p>`;
            return;
        }

        cartas.forEach(carta => {
            if (selectDrop) {
                const opt = document.createElement('option');
                opt.value = carta.id;
                opt.textContent = `#${carta.id} - ${carta.nombre} (${carta.rareza})`;
                selectDrop.appendChild(opt);
            }

            let receta = {};
            try { receta = JSON.parse(carta.imagen_url); } catch(e){}

            const cardItem = document.createElement('div');
            cardItem.className = 'tarjeta-admin-item';
            cardItem.innerHTML = `
                <div style="width:100px; height:130px; background:${receta.fondoColor || '#000'}; border:2px solid ${receta.marcoColor || '#333'}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:35px;">
                    ${receta.simbolo || '👾'}
                </div>
                <div class="info-admin-card">
                    <strong>#${carta.id} ${carta.nombre || 'Sin Nombre'}</strong>
                    <span>${carta.rareza || 'COTIDIANO'}</span>
                </div>
                <div class="acciones-card-admin">
                    <button class="btn-mini-admin btn-mini-drop" onclick="prepararRegaloDirecto(${carta.id})">🎁</button>
                    <button class="btn-mini-admin btn-mini-del" onclick="destruirCartaPorIdDirecto(${carta.id})">🗑️</button>
                </div>
            `;
            grid.appendChild(cardItem);
        });

    } catch (err) {
        console.error("Error cargando recetas:", err);
        grid.innerHTML = `<p style="font-size:7px; color:#ef4444;">ERROR: ${err.message}</p>`;
    }
}

function prepararRegaloDirecto(idCarta) {
    cambiarPestana('seccion-regalos');
    const regaloTipo = document.getElementById('regalo-tipo-seleccion');
    const regaloIdSelect = document.getElementById('regalo-carta-id-select');
    if (regaloTipo) regaloTipo.value = "ESPECIFICA";
    if (regaloIdSelect) regaloIdSelect.value = idCarta;
}

async function destruirCartaPorIdDirecto(idCarta) {
    if (!confirm(`¿Destruir carta #${idCarta}?`)) return;
    const inputBorrar = document.getElementById('id-carta-borrar');
    if (inputBorrar) inputBorrar.value = idCarta;
    await window.destruirCartaYMultimediaGlobal();
}

// INYECCIÓN DE DROPS / REGALOS AL INVENTARIO (NORMALIZACIÓN DE ID Y MANEJO ASÍNCRONO)
function configurarBotonRegalosManuales() {
    const btnRegalo = document.getElementById('btn-enviar-regalo');
    if (!btnRegalo) return;

    btnRegalo.addEventListener('click', async () => {
        let idUsuario = (document.getElementById('regalo-usuario-id')?.value || '').trim();
        
        // Normalización: remueve el símbolo '@' si el admin lo incluye manualmente
        if (idUsuario.startsWith('@')) {
            idUsuario = idUsuario.substring(1).trim();
        }

        const tipoRegalo = document.getElementById('regalo-tipo-seleccion')?.value;
        const idCarta = parseInt(document.getElementById('regalo-carta-id-select')?.value);
        const cantidad = parseInt(document.getElementById('regalo-cantidad')?.value) || 1;

        if (!idUsuario) return alert("❌ Ingresa el ID del usuario.");

        try {
            if (tipoRegalo === "ESPECIFICA") {
                if (isNaN(idCarta)) return alert("❌ Selecciona una carta de la lista.");
                await procesarAsignacionEnInventario(idUsuario, idCarta, cantidad);
                alert(`🎁 Drop enviado: ${cantidad} copia(s) a [${idUsuario}].`);
            } else {
                const { data: pool, error: errPool } = await supabaseClient.from('Cartas').select('id');
                if (errPool) throw errPool;
                if (!pool || pool.length === 0) return alert("❌ No hay cartas en la base de datos.");

                // Procesa cada carta en serie esperando el resultado de la promesa
                for (let i = 0; i < cantidad; i++) {
                    const rIdx = Math.floor(Math.random() * pool.length);
                    await procesarAsignacionEnInventario(idUsuario, pool[rIdx].id, 1);
                }
                alert(`🎁 Drop al azar de ${cantidad} carta(s) enviado exitosamente a [${idUsuario}].`);
            }
        } catch (error) {
            console.error("Error en drop:", error);
            alert("❌ ERROR AL INYECTAR DROP: " + error.message);
        }
    });
}

async function procesarAsignacionEnInventario(idUser, idCard, cant) {
    const { data: existente, error: errConsulta } = await supabaseClient
        .from('Coleccion_Usuario')
        .select('*')
        .eq('usuario_id', idUser)
        .eq('carta_id', idCard)
        .maybeSingle();

    if (errConsulta) throw errConsulta;

    if (existente) {
        const { error: errUpdate } = await supabaseClient
            .from('Coleccion_Usuario')
            .update({ cantidad: existente.cantidad + cant })
            .eq('id', existente.id);
        if (errUpdate) throw errUpdate;
    } else {
        const { error: errInsert } = await supabaseClient
            .from('Coleccion_Usuario')
            .insert([{ usuario_id: idUser, carta_id: idCard, cantidad: cant }]);
        if (errInsert) throw errInsert;
    }
}

// TABLA DE TRANSACCIONES ESCROW
async function cargarTransaccionesPendientesEscrow() {
    const tablaCuerpo = document.getElementById('tabla-escrow-cuerpo');
    if (!tablaCuerpo) return;

    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="color:#888;text-align:center;">SIN PAGOS PENDIENTES</td></tr>`;
}

// DESTRUCTOR GLOBAL
window.destruirCartaYMultimediaGlobal = async function() {
    const inputId = document.getElementById('id-carta-borrar');
    if (!inputId) return;
    const idCarta = parseInt(inputId.value);

    if (isNaN(idCarta)) return alert("❌ Ingresa un ID numérico.");

    try {
        const { error: errDelete } = await supabaseClient.from('Cartas').delete().eq('id', idCarta);
        if (errDelete) throw errDelete;

        alert(`🗑️ Receta #${idCarta} eliminada.`);
        inputId.value = "";
        await cargarAlbumGlobalAdmin();

    } catch (error) {
        console.error("Error destruyendo:", error);
        alert("❌ ERROR: " + error.message);
    }
};
