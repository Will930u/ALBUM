# =============================================================================
# 🤖 BOT CEREBRO CENTRAL - PROCESADOR DE PAGO MÓVIL Y ALERTAS DE RECOMPENSAS
# =============================================================================
import os
import threading
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
# 🔘 MANEJADOR DEL BOTÓN INLINE DE TELEGRAM (APROBACIÓN DE PAGO)
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
# ⚙️ ARRANQUE MULTITHREADING (FLASK + TELEGRAM POLLING) EN RENDER
# =============================================================================
def iniciar_bot_polling():
    # Elimina webhooks previos para evitar conflictos con Long Polling
    bot.remove_webhook()
    bot.infinity_polling(skip_pending=True)

if __name__ == "__main__":
    # Iniciar el proceso de lectura de botones de Telegram en un hilo secundario
    hilo_bot = threading.Thread(target=iniciar_bot_polling)
    hilo_bot.daemon = True
    hilo_bot.start()

    # Arrancar el servidor Flask en el puerto asignado por Render
    puerto_servidor = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto_servidor)
