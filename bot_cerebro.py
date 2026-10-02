# =============================================================================
# 🤖 BOT CEREBRO CENTRAL - PROCESADOR DE PAGO MÓVIL Y ALERTAS DE RECOMPENSAS
# =============================================================================
import os
import time
import threading
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
import telebot
from telebot import types
from supabase import create_client, Client

# =============================================================================
# 🔧 CONFIGURACIÓN DE LA APLICACIÓN
# =============================================================================
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# =============================================================================
# 🔐 CONFIGURACIÓN SEGURA: VARIABLES DE ENTORNO EN RENDER
# =============================================================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ddbdemxrntjqncetyrnr.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ID_CANAL_ALERTAS = os.environ.get("ID_CANAL_ALERTAS")

# =============================================================================
# ⚙️ INICIALIZACIÓN DE SERVICIOS
# =============================================================================
def inicializar_servicios():
    """Inicializa Supabase y Telegram con validación"""
    global supabase, bot
    
    if not SUPABASE_KEY:
        print("⚠️️ ADVERTENCIA: SUPABASE_SERVICE_ROLE_KEY no está configurada")
    if not TELEGRAM_BOT_TOKEN:
        print("⚠️ ADVERTENCIA: TELEGRAM_BOT_TOKEN no está configurada")
    if not ID_CANAL_ALERTAS:
        print("⚠️ ADVERTENCIA: ID_CANAL_ALERTAS no está configurada")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"✅ Supabase conectado a: {SUPABASE_URL}")
    except Exception as e:
        print(f"❌ Error al conectar con Supabase: {e}")
        supabase = None
    
    try:
        if TELEGRAM_BOT_TOKEN:
            bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
            print("✅ Telegram Bot inicializado")
        else:
            bot = None
            print("⚠️ Telegram Bot no inicializado (falta token)")
    except Exception as e:
        print(f"❌ Error al inicializar Telegram Bot: {e}")
        bot = None

inicializar_servicios()

print("🚀 El Bot Cerebro de Recompensas está listo y escuchando peticiones...")

# =============================================================================
# 🏥 ENDPOINT DE VERIFICACIÓN DE SALUD
# =============================================================================
@app.route('/', methods=['GET'])
def verificar_servidor_activo():
    """Endpoint para verificar que el servidor está activo"""
    return jsonify({
        "status": "online",
        "servicio": "Bot Cerebro de Barajitas",
        "supabase_conectado": supabase is not None,
        "telegram_conectado": bot is not None
    }), 200

# =============================================================================
# 🛒 WEBHOOK: NUEVO PAGO PENDIENTE (Envía la alerta inicial a Telegram y guarda IDs)
# =============================================================================
@app.route('/webhook_pago_pendiente', methods=['POST'])
def recibir_nuevo_pago_pendiente():
    """Recibe nuevos registros de pagos pendientes, los notifica a Telegram y guarda su message_id"""
    try:
        datos_recibidos = request.json
        nueva_fila = datos_recibidos.get('record', datos_recibidos)
        
        if not nueva_fila:
            return jsonify({"status": "error", "message": "No se encontraron datos"}), 400
        
        id_pago = nueva_fila.get('id')
        usuario_id = nueva_fila.get('usuario_id', 'Anónimo')
        referencia = nueva_fila.get('referencia', 'N/A')
        telefono = nueva_fila.get('telefono', 'N/A')
        monto = nueva_fila.get('monto', 0.0)
        cantidad_sobres = nueva_fila.get('cantidad_sobres', 1)
        
        mensaje_admin = (
            f"🛒 *[PAGO PENDIENTE DE VALIDACIÓN BANCARIA]*\n\n"
            f"👤 *Usuario:* @{usuario_id}\n"
            f"🔢 *Ref (6 dígitos):* `{referencia}`\n"
            f"📱 *Teléfono:* `{telefono}`\n"
            f"💵 *Monto:* {monto} Bs.\n"
            f"📦 *Sobres:* {cantidad_sobres}\n\n"
            f"⏳ *Guardado en cola de espera. Se conciliará manualmente o al entrar el correo del banco.*"
        )
        
        markup = types.InlineKeyboardMarkup()
        btn_aprobar = types.InlineKeyboardButton(
            text="✅ Aprobar Pago", 
            callback_data=f"aprobar_{id_pago}"
        )
        markup.add(btn_aprobar)
        
        if bot and ID_CANAL_ALERTAS:
            sent_msg = bot.send_message(
                ID_CANAL_ALERTAS, 
                mensaje_admin, 
                parse_mode="Markdown", 
                reply_markup=markup
            )
            print(f"✅ Alerta de pago pendiente #{id_pago} enviada a Telegram")
            
            # Guardamos el message_id y chat_id exactos en la tabla pagos_pendientes
            if supabase and sent_msg:
                try:
                    supabase.table("pagos_pendientes").update({
                        "telegram_message_id": sent_msg.message_id,
                        "telegram_chat_id": sent_msg.chat.id
                    }).eq("id", id_pago).execute()
                    print(f"📌 IDs de Telegram guardados para el pago #{id_pago}")
                except Exception as db_err:
                    print(f"⚠️ Nota: Asegúrate de tener las columnas telegram_message_id y telegram_chat_id en pagos_pendientes: {db_err}")
        
        return jsonify({"status": "alerta_enviada_exitosamente"}), 200
        
    except Exception as e:
        print(f"❌ Error en Webhook pago pendiente: {str(e)}")
        return jsonify({"status": "error_interno", "error": str(e)}), 500

# =============================================================================
# 🏆 WEBHOOK DE PAYOUTS (Reclamos de Recompensas)
# =============================================================================
@app.route('/webhook_payout', methods=['POST'])
def recibir_alerta_payout_supabase():
    """Recibe notificaciones de nuevos reclamos de recompensas y guarda los IDs de Telegram"""
    try:
        datos_recibidos = request.json
        nueva_fila = datos_recibidos.get('record', datos_recibidos)
        
        if not nueva_fila:
            return jsonify({"status": "error", "message": "No se encontraron datos"}), 400
        
        id_reclamo = nueva_fila.get('id')
        user_id = nueva_fila.get('user_id')
        username = nueva_fila.get('username_telegram', 'Jugador_Anonimo')
        hito = nueva_fila.get('hito_nivel', 1)
        cant_barajitas = nueva_fila.get('barajitas_requeridas', hito * 500)
        monto = nueva_fila.get('monto_recompensa', 200.00)
        codigo_hash = nueva_fila.get('codigo_hash', 'SIN_CODIGO')
        telefono = nueva_fila.get('telefono', 'N/A')
        banco = nueva_fila.get('banco', 'N/A')
        cedula = nueva_fila.get('cedula', 'N/A')
        
        mensaje_admin = (
            f"🏆 *¡NUEVO RECLAMO DE RECOMPENSA!* 🏆\n\n"
            f"👤 *Usuario:* @{username} (ID: `{user_id}`)\n"
            f"🎯 *Hito:* Nivel {hito} ({cant_barajitas} Barajitas)\n"
            f"💵 *Monto:* ${monto:.2f} USD\n"
            f"🔑 *Código:* `{codigo_hash}`\n\n"
            f"📌 *PAGO MÓVIL:*\n"
            f"📱 *Teléfono:* `{telefono}`\n"
            f"🏦 *Banco:* {banco}\n"
            f"🆔 *Cédula:* `{cedula}`"
        )
        
        markup = types.InlineKeyboardMarkup()
        btn_aprobar = types.InlineKeyboardButton(
            text="✅ Aprobar y Procesar Pago", 
            callback_data=f"aprobar_{id_reclamo}"
        )
        markup.add(btn_aprobar)
        
        if bot and ID_CANAL_ALERTAS:
            sent_msg = bot.send_message(
                ID_CANAL_ALERTAS, 
                mensaje_admin, 
                parse_mode="Markdown", 
                reply_markup=markup
            )
            print(f"✅ Notificación de reclamo #{id_reclamo} enviada a Telegram")
            
            if supabase and sent_msg:
                try:
                    supabase.table("pagos_pendientes").update({
                        "telegram_message_id": sent_msg.message_id,
                        "telegram_chat_id": sent_msg.chat.id
                    }).eq("id", id_reclamo).execute()
                except Exception as db_err:
                    print(f"⚠️ Error al guardar IDs de Telegram: {db_err}")
        
        return jsonify({"status": "solicitud_notificada_exitosamente"}), 200
        
    except Exception as e:
        print(f"❌ Error en Webhook payout: {str(e)}")
        return jsonify({"status": "error_interno", "error": str(e)}), 500

# =============================================================================
# 🔘 MANEJADOR DE CLICS EN LOS BOTONES DE TELEGRAM (CALLBACK QUERY)
# =============================================================================
if bot:
    @bot.callback_query_handler(func=lambda call: True)
    def manejar_botones_telegram(call):
        """Atrapa cuando el administrador presiona el botón interactivo en Telegram y RESPONDE al mensaje específico"""
        try:
            data = call.data
            msg = call.message
            
            if data.startswith("aprobar_"):
                id_pago = data.replace("aprobar_", "").strip()
                
                # Consultar datos del pago en Supabase
                pago_info = supabase.table("pagos_pendientes").select("*").eq("id", id_pago).execute()
                
                if not pago_info.data:
                    bot.answer_callback_query(call.id, "⚠️ El pago no existe o ya fue procesado.", show_alert=True)
                    return
                
                pago = pago_info.data[0]
                usuario_id = pago.get('usuario_id', pago.get('username_telegram', 'Anónimo'))
                referencia = pago.get('referencia', 'N/A')
                
                try:
                    cantidad_sobres = int(pago.get('cantidad_sobres', 1))
                    if cantidad_sobres < 1:
                        cantidad_sobres = 1
                except:
                    cantidad_sobres = 1

                # 1. Actualizar estado en pagos_pendientes
                supabase.table("pagos_pendientes").update({
                    "estado": "aprobado"
                }).eq("id", id_pago).execute()
                
                # 2. Asignar barajitas
                if usuario_id and str(usuario_id).lower() not in ['anonimo', 'undefined', 'null', '']:
                    id_limpio = str(usuario_id).replace('@', '').strip().lower()
                    res_cartas = supabase.table("Cartas").select("id").limit(500).execute()
                    cartas_catalogo = res_cartas.data if res_cartas and res_cartas.data else []
                    
                    if cartas_catalogo:
                        for i in range(cantidad_sobres):
                            carta_aleatoria = random.choice(cartas_catalogo)
                            c_id = int(carta_aleatoria['id'])
                            
                            inv_res = supabase.table("Coleccion_Usuario").select("cantidad").eq(
                                "usuario_id", id_limpio
                            ).eq("carta_id", c_id).execute()
                            
                            if inv_res.data and len(inv_res.data) > 0:
                                cant_actual = int(inv_res.data[0].get('cantidad', 0))
                                supabase.table("Coleccion_Usuario").update({
                                    "cantidad": cant_actual + 1
                                }).eq("usuario_id", id_limpio).eq("carta_id", c_id).execute()
                            else:
                                supabase.table("Coleccion_Usuario").insert({
                                    "usuario_id", id_limpio,
                                    "carta_id": c_id,
                                    "cantidad": 1
                                }).execute()

                # 3. RESPONDER EN HILO al mensaje original usando reply_to_message_id
                texto_respuesta = (
                    f"✅ *¡PAGO VERIFICADO Y APROBADO!*\n"
                    f"🔢 Ref: `{referencia}`\n"
                    f"📦 Sobres asignados: {cantidad_sobres}\n"
                    f"📌 Estado: **COMPLETADO**"
                )
                
                bot.send_message(
                    chat_id=msg.chat.id,
                    text=texto_respuesta,
                    parse_mode="Markdown",
                    reply_to_message_id=msg.message_id  # <--- ESTO RESPONDE DIRECTAMENTE AL MENSAJE ESPECÍFICO
                )
                
                # Quitar el botón del mensaje original para que no se vuelva a presionar
                try:
                    bot.edit_message_reply_markup(chat_id=msg.chat.id, message_id=msg.message_id, reply_markup=None)
                except:
                    pass
                
                bot.answer_callback_query(call.id, "✅ ¡Pago aprobado y respondido con éxito!")
                print(f"✅ Pago #{id_pago} aprobado y respondido en hilo de Telegram")
                
        except Exception as e:
            print(f"❌ Error en callback_query de Telegram: {e}")
            try:
                bot.answer_callback_query(call.id, "❌ Ocurrió un error al procesar el pago.", show_alert=True)
            except:
                pass

# =============================================================================
# 💳 ENDPOINT PRINCIPAL: APROBAR PAGOS DESDE LA CONSOLA WEB
# =============================================================================
@app.route('/api/aprobar-pago', methods=['POST', 'OPTIONS'])
def aprobar_pago_sobres():
    """
    Aprueba un pago desde la web, asigna barajitas y RESPONDE al mensaje específico en Telegram.
    """
    
    if request.method == 'OPTIONS':
        return jsonify({"status": "OK"}), 200
    
    max_reintentos = 3
    ultimo_error = None
    
    for intento in range(1, max_reintentos + 1):
        try:
            print(f"\n{'='*60}")
            print(f"🔄 INTENTO {intento}/{max_reintentos}")
            print(f"{'='*60}")
            
            datos = request.get_json(force=True, silent=True) or {}
            print(f"📨 Datos recibidos: {datos}")
            
            id_pago_raw = datos.get('idPago')
            usuario_id = datos.get('usuarioId')
            
            try:
                cantidad_sobres = int(datos.get('cantidadSobres', 1))
                if cantidad_sobres < 1:
                    cantidad_sobres = 1
            except (ValueError, TypeError):
                cantidad_sobres = 1
            
            telegram_chat_id = datos.get('telegramChatId')
            telegram_message_id = datos.get('telegramMessageId')
            
            if not id_pago_raw:
                return jsonify({"success": False, "error": "Falta el ID del pago"}), 400
            
            id_pago = str(id_pago_raw).strip()
            if id_pago.isdigit():
                id_pago = int(id_pago)
            
            print(f"🔍 Procesando pago ID: {id_pago}")
            
            # Consultar siempre los datos reales en Supabase para asegurar referencia y message_id
            referencia = "N/A"
            try:
                pago_db = supabase.table("pagos_pendientes").select("*").eq("id", id_pago).execute()
                if pago_db.data and len(pago_db.data) > 0:
                    fila_db = pago_db.data[0]
                    referencia = fila_db.get('referencia', 'N/A')
                    telegram_message_id = telegram_message_id or fila_db.get('telegram_message_id')
                    telegram_chat_id = telegram_chat_id or fila_db.get('telegram_chat_id')
                    usuario_id = usuario_id or fila_db.get('usuario_id')
            except Exception as db_ex:
                print(f"⚠️ Error consultando detalles en Supabase: {db_ex}")
            
            # =================================================================
            # PASO 1: ACTUALIZAR ESTADO EN SUPABASE
            # =================================================================
            supabase.table("pagos_pendientes").update({
                "estado": "aprobado"
            }).eq("id", id_pago).execute()
            
            print(f"✅ Pago #{id_pago} marcado como 'aprobado'")
            
            # =================================================================
            # PASO 2: ASIGNAR BARAJITAS
            # =================================================================
            if usuario_id and str(usuario_id).lower() not in ['anonimo', 'undefined', 'null', '']:
                id_limpio = str(usuario_id).replace('@', '').strip().lower()
                res_cartas = supabase.table("Cartas").select("id").limit(500).execute()
                cartas_catalogo = res_cartas.data if res_cartas and res_cartas.data else []
                
                if cartas_catalogo:
                    for i in range(cantidad_sobres):
                        carta_aleatoria = random.choice(cartas_catalogo)
                        c_id = int(carta_aleatoria['id'])
                        
                        inv_res = supabase.table("Coleccion_Usuario").select("cantidad").eq(
                            "usuario_id", id_limpio
                        ).eq("carta_id", c_id).execute()
                        
                        if inv_res.data and len(inv_res.data) > 0:
                            cant_actual = int(inv_res.data[0].get('cantidad', 0))
                            supabase.table("Coleccion_Usuario").update({
                                "cantidad": cant_actual + 1
                            }).eq("usuario_id", id_limpio).eq("carta_id", c_id).execute()
                        else:
                            supabase.table("Coleccion_Usuario").insert({
                                "usuario_id": id_limpio,
                                "carta_id": c_id,
                                "cantidad": 1
                            }).execute()
            
            # =================================================================
            # PASO 3: RESPONDER AL MENSAJE ESPECÍFICO EN TELEGRAM (REPLY)
            # =================================================================
            if bot and TELEGRAM_BOT_TOKEN:
                try:
                    chat_objetivo = telegram_chat_id if telegram_chat_id else ID_CANAL_ALERTAS
                    if isinstance(chat_objetivo, str):
                        chat_objetivo = chat_objetivo.strip()

                    if chat_objetivo and telegram_message_id and str(telegram_message_id).strip() not in ['', 'undefined', 'null']:
                        texto_respuesta = (
                            f"✅ *¡PAGO VERIFICADO Y APROBADO DESDE LA WEB!*\n"
                            f"🔢 Ref: `{referencia}`\n"
                            f"📦 Sobres asignados: {cantidad_sobres}\n"
                            f"📌 Estado: **COMPLETADO**"
                        )
                        bot.send_message(
                            chat_id=chat_objetivo,
                            text=texto_respuesta,
                            parse_mode="Markdown",
                            reply_to_message_id=int(telegram_message_id) # <--- RESPONDE AL MENSAJE EXACTO
                        )
                        
                        # Limpiar botones del mensaje original
                        try:
                            bot.edit_message_reply_markup(chat_id=chat_objetivo, message_id=int(telegram_message_id), reply_markup=None)
                        except:
                            pass
                            
                        print(f"✅ Respuesta enviada en hilo al mensaje ID: {telegram_message_id}")
                    elif chat_objetivo:
                        bot.send_message(
                            chat_objetivo, 
                            f"✅ *PAGO VERIFICADO (Ref: {referencia}) - APROBADO*", 
                            parse_mode="Markdown"
                        )
                except Exception as e_tg:
                    print(f"⚠️ Error secundario en Telegram: {e_tg}")
            
            return jsonify({
                "success": True, 
                "message": "Pago aprobado y respondido en Telegram correctamente",
                "detalles": {
                    "id_pago": id_pago,
                    "usuario": usuario_id,
                    "referencia": referencia
                }
            }), 200
            
        except Exception as e:
            import traceback
            error_msg = str(e)
            ultimo_error = error_msg
            print(f"\n❌ ERROR EN INTENTO {intento}/{max_reintentos}: {error_msg}")
            traceback.print_exc()
            
            if "Name or service not known" in error_msg or "getaddrinfo" in error_msg:
                if intento < max_reintentos:
                    time.sleep(5 * intento)
                    continue
            break
    
    return jsonify({
        "success": False, 
        "error": f"Error al procesar el pago: {ultimo_error}"
    }), 500

# =============================================================================
# 🚀 INICIALIZACIÓN DEL SERVIDOR
# =============================================================================
if __name__ == "__main__":
    puerto_servidor = int(os.environ.get("PORT", 5000))
    print(f"\n{'='*60}")
    print(f"🚀 INICIANDO SERVIDOR EN PUERTO: {puerto_servidor}")
    print(f"{'='*60}\n")
    
    app.run(host="0.0.0.0", port=puerto_servidor, debug=False)
