# =============================================================================
# 🤖 BOT CEREBRO CENTRAL - PROCESADOR DE PAGO MÓVIL Y ALERTAS DE RECOMPENSAS
# =============================================================================
import os
import time
import threading
import random
from flask import Flask, request, jsonify
import telebot
from telebot import types
from supabase import create_client, Client

app = Flask(__name__)

# =============================================================================
# 🔐 CONFIGURACIÓN SEGURA: VARIABLES DE ENTORNO EN RENDER
# =============================================================================
SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co"

SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ID_CANAL_ALERTAS = os.environ.get("ID_CANAL_ALERTAS")  # ID de tu chat admin o canal

# Inicialización segura
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

print("🚀 El Bot Cerebro de Recompensas está listo y escuchando peticiones...")

# =============================================================================
# 🏠 RUTA DE BIENVENIDA (Para Keep-Alive de Render)
# =============================================================================
@app.route('/', methods=['GET'])
def verificar_servidor_activo():
    return "<h1>💻 Servidor del Bot de Barajitas en Línea (24/7)</h1>", 200

# =============================================================================
# 📡 RUTA DE RECEPCIÓN DE RECLAMOS DE PAGO MÓVIL ($200 USD)
# =============================================================================
@app.route('/webhook_payout', methods=['POST'])
def recibir_alerta_payout_supabase():
    try:
        datos_recibidos = request.json
        print("📨 Datos de reclamo recibidos:", datos_recibidos)

        nueva_fila = datos_recibidos.get('record', datos_recibidos)
        if not nueva_fila:
            return jsonify({"status": "error", "message": "No se encontraron datos del registro"}), 400

        # Extraer variables del reclamo
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

        # Construir mensaje para el Administrador
        mensaje_admin = (
            f"🏆 *¡NUEVO RECLAMO DE RECOMPENSA!* 🏆\n\n"
            f"👤 *Usuario:* @{username} (ID: `{user_id}`)\n"
            f"🎯 *Hito Completado:* Nivel {hito} ({cant_barajitas} Barajitas)\n"
            f"💵 *Monto a Pagar:* ${monto:.2f} USD\n"
            f"🔑 *Código Ticket:* `{codigo_hash}`\n\n"
            f"📌 *DATOS PARA PAGO MÓVIL:*\n"
            f"📱 *Teléfono:* `{telefono}`\n"
            f"🏦 *Banco:* {banco}\n"
            f"𝟌 *Cédula:* `{cedula}`"
        )

        # Crear botón inline interactivo
        markup = types.InlineKeyboardMarkup()
        btn_aprobar = types.InlineKeyboardButton(
            text="✅ Recompensa Procesada (Revisar Cuenta)", 
            callback_data=f"aprobar_{id_reclamo}"
        )
        markup.add(btn_aprobar)

        # Enviar notificación al administrador por Telegram
        bot.send_message(ID_CANAL_ALERTAS, mensaje_admin, parse_mode="Markdown", reply_markup=markup)

        return jsonify({"status": "solicitud_notificada_exitosamente"}), 200

    except Exception as e:
        print("❌ Fallo crítico en el procesador del Webhook:", str(e))
        return jsonify({"status": "error_interno", "error": str(e)}), 500

# =============================================================================
# 💳 RUTA DE APROBACIÓN DE PAGOS DE SOBRES (Desde el Panel Web Admin)
# =============================================================================
@app.route('/api/aprobar-pago', methods=['POST'])
def aprobar_pago_sobres():
    try:
        datos = request.json
        print("📨 Petición de aprobación de pago recibida:", datos)

        id_pago = datos.get('idPago')
        usuario_id = datos.get('usuarioId')
        cantidad_sobres = int(datos.get('cantidadSobres', 1))
        
        # Nuevos parámetros para ubicar el mensaje original en Telegram
        telegram_chat_id = datos.get('telegramChatId', ID_CANAL_ALERTAS)
        telegram_message_id = datos.get('telegramMessageId')

        if not id_pago:
            return jsonify({"success": False, "error": "Falta el ID del pago"}), 400

        # 1. Actualizar el estado del pago a 'aprobado' en Supabase
        supabase.table("pagos_pendientes").update({
            "estado": "aprobado"
        }).eq("id", id_pago).execute()

        # 2. Asignar las barajitas al álbum del usuario si está identificado
        if usuario_id and str(usuario_id).lower() not in ['anonimo', 'undefined', 'null']:
            id_limpio = str(usuario_id).replace('@', '').strip().lower()

            # Consultar cartas disponibles en el catálogo
            res_cartas = supabase.table("Cartas").select("id").limit(200).execute()
            cartas_catalogo = res_cartas.data if res_cartas.data else []

            if cartas_catalogo:
                barajitas_a_asignar = []
                for _ in range(cantidad_sobres):
                    carta_aleatoria = random.choice(cartas_catalogo)
                    if carta_aleatoria:
                        barajitas_a_asignar.append(int(carta_aleatoria['id']))

                # Procesar inserción o actualización en la colección del usuario
                for c_id in barajitas_a_asignar:
                    inv_res = supabase.table("Coleccion_Usuario").select("cantidad").eq("usuario_id", id_limpio).eq("carta_id", c_id).execute()
                    
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

        # 3. Editar o actualizar el mensaje original en Telegram si se cuenta con el message_id
        if TELEGRAM_BOT_TOKEN and telegram_chat_id and telegram_message_id:
            try:
                texto_actualizado = (
                    f"🛒 *[PAGO APROBADO MANUALMENTE DESDE ADMIN]*\n\n"
                    f"👤 *Usuario:* @{usuario_id or 'Anónimo'}\n"
                    f"📦 *Sobres acreditados:* {cantidad_sobres}\n"
                    f"🟢 *Estado:* APROBADO ✅\n\n"
                    f"_Pago verificado y barajitas asignadas exitosamente._"
                )
                bot.edit_message_text(
                    chat_id=telegram_chat_id,
                    message_id=int(telegram_message_id),
                    text=texto_actualizado,
                    parse_mode="Markdown",
                    reply_markup=None
                )
            except Exception as e_tg:
                print(f"⚠️ No se pudo editar el mensaje de Telegram (posible mensaje muy antiguo o ID inválido): {e_tg}")
                # Fallback: Enviar mensaje nuevo si falla la edición
                mensaje_telegram = (
                    f"✅ *PAGO VERIFICADO Y APROBADO*\n\n"
                    f"👤 *Usuario:* @{usuario_id or 'Anónimo'}\n"
                    f"📦 *Sobres acreditados:* {cantidad_sobres}\n\n"
                    f"_Su pago ha sido verificado gracias por su participación_"
                )
                bot.send_message(ID_CANAL_ALERTAS, mensaje_telegram, parse_mode="Markdown")
        elif TELEGRAM_BOT_TOKEN and ID_CANAL_ALERTAS:
            # Comportamiento anterior por respaldo si no se envían los IDs
            mensaje_telegram = (
                f"✅ *PAGO VERIFICADO Y APROBADO*\n\n"
                f"👤 *Usuario:* @{usuario_id or 'Anónimo'}\n"
                f"📦 *Sobres acreditados:* {cantidad_sobres}\n\n"
                f"_Su pago ha sido verificado gracias por su participación_"
            )
            bot.send_message(ID_CANAL_ALERTAS, mensaje_telegram, parse_mode="Markdown")

        return jsonify({"success": True, "message": "Pago aprobado, barajitas asignadas y Telegram actualizado."}), 200

    except Exception as e:
        print("❌ Error al procesar la aprobación del pago de sobres:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

# =============================================================================
# 🔘 MANEJADOR DEL BOTÓN INLINE DE TELEGRAM (APROBACIÓN DE RECOMPENSA)
# =============================================================================
@bot.callback_query_handler(func=lambda call: call.data.startswith('aprobar_'))
def procesar_confirmacion_pago(call):
    try:
        id_reclamo = call.data.replace('aprobar_', '')
        admin_username = call.from_user.username or call.from_user.first_name

        # 1. Consultar estado actual del reclamo en Supabase
        res = supabase.table("reclamaciones_premios").select("*").eq("id", id_reclamo).execute()
        if not res.data:
            bot.answer_callback_query(call.id, "❌ Error: El reclamo no existe en la base de datos.", show_alert=True)
            return

        reclamo = res.data[0]

        if reclamo.get("estado") == "PROCESADO":
            bot.answer_callback_query(call.id, "⚠️ Este premio ya fue procesado anteriormente.", show_alert=True)
            return

        # 2. Actualizar estado a PROCESADO en Supabase
        supabase.table("reclamaciones_premios").update({
            "estado": "PROCESADO"
        }).eq("id", id_reclamo).execute()

        # 3. Notificar al usuario ganador por mensaje privado en Telegram
        user_telegram_id = reclamo.get("user_id")
        monto = reclamo.get("monto_recompensa", 200.00)
        hito = reclamo.get("hito_nivel", 1)

        mensaje_usuario = (
            f"🎉 *¡RECOMPENSA PROCESADA CON ÉXITO!* 🎉\n\n"
            f"Hola, tu pago correspondiente al *Hito Nivel {hito} (${monto:.2f} USD)* "
            f"ha sido transferido a tus datos de Pago Móvil.\n\n"
            f"¡Revisa tu cuenta bancaria y sigue completando el álbum! 🚀"
        )

        try:
            bot.send_message(user_telegram_id, mensaje_usuario, parse_mode="Markdown")
        except Exception as e_user:
            print(f"⚠️ No se pudo enviar mensaje directo al usuario ({user_telegram_id}): {e_user}")

        # 4. Actualizar el mensaje original en el chat del administrador
        texto_actualizado = (
            f"{call.message.text}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"✅ *PAGO PROCESADO Y APROBADO*\n"
            f"👤 *Procesado por:* @{admin_username}\n"
            f"STATUS: PREMIO_ENTREGADO"
        )
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text=texto_actualizado,
            parse_mode="Markdown",
            reply_markup=None
        )

        bot.answer_callback_query(call.id, "✅ Pago marcado como procesado exitosamente.")

    except Exception as e:
        print("❌ Error al procesar el callback:", str(e))
        bot.answer_callback_query(call.id, f"❌ Error: {str(e)}", show_alert=True)

# =============================================================================
# ⚙️ ARRANQUE MULTITHREADING CON REINTENTO SEGURO
# =============================================================================
def iniciar_bot_polling():
    while True:
        try:
            bot.remove_webhook()
            bot.infinity_polling(skip_pending=True)
        except Exception as e:
            print(f"⚠️ Reiniciando polling de Telegram por conflicto: {e}")
            time.sleep(5)

if __name__ == "__main__":
    hilo_bot = threading.Thread(target=iniciar_bot_polling)
    hilo_bot.daemon = True
    hilo_bot.start()

    puerto_servidor = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto_servidor)
