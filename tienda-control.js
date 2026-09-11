/* =============================================================================
   🎮 TIENDA RETRO ARCADE - ESTILOS OFICIALES PARA TELEGRAM MINI APP
   ============================================================================= */

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background-color: #0b0c10;
    color: #ffffff;
    font-family: 'Press Start 2P', monospace;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 15px 10px 90px 10px;
}

/* Contenedor tipo Consola */
.consola-tienda {
    background-color: #121317;
    border: 4px solid #1f2833;
    box-shadow: 0px 0px 20px rgba(0, 255, 102, 0.15), inset 0px 0px 10px #000;
    padding: 20px 15px;
    max-width: 480px;
    width: 100%;
    border-radius: 8px;
    text-align: center;
}

.titulo-tienda {
    font-size: 13px;
    color: #00ff66;
    text-shadow: 2px 2px 0px #000;
    margin-bottom: 12px;
}

.titulo-retiros {
    color: #ffcc00;
}

.precio-unidad {
    font-size: 8px;
    color: #aaaaaa;
    margin-bottom: 20px;
}

.resaltado-verde {
    color: #00ff66;
    font-weight: bold;
}

.resaltado-oro {
    color: #ffcc00;
    font-weight: bold;
}

/* Selector de Cantidad */
.control-cantidad {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
}

.btn-cantidad {
    background-color: #1f2833;
    color: #66fcf1;
    border: 3px solid #45a29e;
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    width: 45px;
    height: 45px;
    cursor: pointer;
    box-shadow: 3px 3px 0px #000;
}

.btn-cantidad:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px #000;
}

#cantidad-sobres {
    width: 70px;
    height: 45px;
    background-color: #000000;
    border: 3px solid #45a29e;
    color: #00ff66;
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
    text-align: center;
    outline: none;
}

/* Pantalla LCD Totales */
.pantalla-totales {
    background-color: #050505;
    border: 3px solid #1f2833;
    padding: 12px 15px;
    margin-bottom: 20px;
    border-radius: 4px;
}

.fila-total {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    margin-bottom: 8px;
}

.fila-total:last-child {
    margin-bottom: 0;
}

/* Radio buttons personalizados */
.opciones-pago {
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
    margin-bottom: 20px;
}

.opcion-contenedor {
    display: flex;
    align-items: center;
    font-size: 8px;
    color: #c5c6c7;
    cursor: pointer;
    background-color: #0b0c10;
    padding: 10px;
    border: 2px solid #1f2833;
}

.opcion-contenedor input {
    margin-right: 10px;
    accent-color: #00ff66;
}

/* Botón principal de compra */
.btn-comprar-final {
    background-color: #00ff66;
    color: #000000;
    border: 3px solid #000000;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    font-weight: bold;
    padding: 14px;
    width: 100%;
    cursor: pointer;
    box-shadow: 4px 4px 0px #009944;
}

.btn-comprar-final:active {
    transform: translate(3px, 3px);
    box-shadow: 1px 1px 0px #000;
}

/* Sección de Retiro de Premios */
.consola-retiros-retro {
    margin-top: 30px;
    border-top: 3px dashed #1f2833;
    padding-top: 20px;
}

.selector-metodos-pago {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.btn-metodo-tab {
    flex: 1;
    background-color: #1f2833;
    color: #888888;
    border: 2px solid #000000;
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    padding: 10px 5px;
    cursor: pointer;
}

.btn-metodo-tab.activo {
    background-color: #ffcc00;
    color: #000000;
    font-weight: bold;
    box-shadow: 3px 3px 0px #b38f00;
}

/* Formularios Retro */
.bloque-metodo {
    margin-bottom: 15px;
    text-align: left;
}

.label-retro {
    font-size: 7px;
    color: #aaaaaa;
    display: block;
    margin-bottom: 6px;
}

.input-retro, .select-retro {
    width: 100%;
    background-color: #000000;
    border: 2px solid #1f2833;
    color: #ffffff;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    padding: 10px;
    outline: none;
    margin-bottom: 5px;
}

.input-retro:focus, .select-retro:focus {
    border-color: #00ff66;
}

.txt-verde-input {
    color: #00ff66;
}

.nota-verde {
    font-size: 6px;
    color: #00ff66;
    margin-top: 4px;
    line-height: 1.4;
}

.input-pm-grupo {
    display: flex;
    flex-direction: column;
    text-align: left;
    margin-bottom: 12px;
}

.btn-guardar-perfil {
    background-color: #ffcc00;
    color: #000000;
    border: 3px solid #000000;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    font-weight: bold;
    padding: 12px;
    width: 100%;
    cursor: pointer;
    box-shadow: 4px 4px 0px #b38f00;
}

.btn-guardar-perfil:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px #000;
}

/* Modal Flotante (Pago Móvil P2P) */
.modal-pago-movil {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.88);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
    padding: 15px;
}

.caja-pago-retro {
    background-color: #121317;
    border: 4px solid #ff3333;
    padding: 20px;
    max-width: 380px;
    width: 100%;
    box-shadow: 0px 0px 15px rgba(255, 51, 51, 0.3);
    text-align: center;
}

.titulo-pm {
    font-size: 10px;
    color: #ff3333;
    margin-bottom: 15px;
    text-shadow: 1px 1px 0px #000;
}

.datos-plataforma-box {
    background-color: #000000;
    border: 2px solid #333333;
    padding: 10px;
    text-align: left;
    font-size: 7px;
    line-height: 1.6;
    margin-bottom: 15px;
}

.txt-oro { color: #ffcc00; }
.txt-verde { color: #00ff66; font-size: 9px; font-weight: bold; }

.btn-confirmar-pm {
    background-color: #ff3333;
    color: #ffffff;
    border: 3px solid #000000;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    font-weight: bold;
    padding: 12px;
    width: 100%;
    cursor: pointer;
    box-shadow: 3px 3px 0px #801a1a;
}

.btn-confirmar-pm:active {
    transform: translate(2px, 2px);
    box-shadow: 0px 0px 0px transparent;
}

/* Menú Navegación Fijo Inferior */
.menu-navegacion-fijo {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #0b0c10;
    border-top: 3px solid #1f2833;
    display: flex;
    justify-content: space-around;
    padding: 8px 5px;
    z-index: 100;
}

.btn-nav {
    background-color: #1f2833;
    color: #ffffff;
    border: 2px solid #45a29e;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    padding: 8px 10px;
    cursor: pointer;
    flex: 1;
    margin: 0 3px;
    max-width: 120px;
}

.btn-nav.activo {
    background-color: #66fcf1;
    color: #000000;
    font-weight: bold;
    border-color: #00ff66;
}
