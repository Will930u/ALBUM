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

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# =============================================================================
# 🔐 CONFIGURACIÓN SEGURA: VARIABLES DE ENTORNO EN RENDER
# =============================================================================
SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co"

SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ID_CANAL_ALERTAS = os.environ.get("ID_CANAL_ALERTAS")

# Inicialización segura
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN) if TELEGRAM_BOT_TOKEN else None

print("🚀 El Bot Cerebro de Recompensas está listo y escuchando peticiones...")

@app.route('/', methods=['GET'])
def verificar_servidor_activo():
    return "<h1>💻 Servidor del Bot de Barajitas en Línea (24/7)</h1>", 200

@app.route('/webhook_payout', methods=['POST'])
def recibir_alerta_payout_supabase():
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
            f"📌 *PAGO MÓVIL:*\n📱 *Teléfono:* `{telefono}`\n🏦 *Banco:* {banco}\n𝟌 *Cédula:* `{cedula}`"
        )

        markup = types.InlineKeyboardMarkup()
        btn_aprobar = types.InlineKeyboardButton(
            text="✅ Recompensa Procesada", 
            callback_data=f"aprobar_{id_reclamo}"
        )
        markup.add(btn_aprobar)

        if bot and ID_CANAL_ALERTAS:
            bot.send_message(ID_CANAL_ALERTAS, mensaje_admin, parse_mode="Markdown", reply_markup=markup)

        return jsonify({"status": "solicitud_notificada_exitosamente"}), 200
    except Exception as e:
        print("❌ Error en Webhook payout:", str(e))
        return jsonify({"status": "error_interno", "error": str(e)}), 500

@app.route('/api/aprobar-pago', methods=['POST', 'OPTIONS'])
def aprobar_pago_sobres():
    if request.method == 'OPTIONS':
        return jsonify({"status": "OK"}), 200

    try:
        datos = request.json or {}
        print("📨 Petición de aprobación recibida:", datos)

        id_pago = datos.get('idPago')
        usuario_id = datos.get('usuarioId')
        cantidad_sobres = int(datos.get('cantidadSobres', 1))
        telegram_chat_id = datos.get('telegramChatId', ID_CANAL_ALERTAS)
        telegram_message_id = datos.get('telegramMessageId')

        if not id_pago:
            return jsonify({"success": False, "error": "Falta el ID del pago"}), 400

        # 1. Actualizar estado en Supabase
        supabase.table("pagos_pendientes").update({
            "estado": "aprobado"
        }).eq("id", id_pago).execute()

        # 2. Asignar barajitas
        if usuario_id and str(usuario_id).lower() not in ['anonimo', 'undefined', 'null']:
            id_limpio = str(usuario_id).replace('@', '').strip().lower()
            res_cartas = supabase.table("Cartas").select("id").limit(200).execute()
            cartas_catalogo = res_cartas.data if res_cartas.data else []

            if cartas_catalogo:
                for _ in range(cantidad_sobres):
                    carta_aleatoria = random.choice(cartas_catalogo)
                    c_id = int(carta_aleatoria['id'])
                    
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

        # 3. Notificación Telegram opcional segura
        if bot and TELEGRAM_BOT_TOKEN:
            try:
                if telegram_chat_id and telegram_message_id:
                    texto_actualizado = (
                        f"🛒 *[PAGO APROBADO MANUALMENTE]*\n\n"
                        f"👤 *Usuario:* @{usuario_id or 'Anónimo'}\n"
                        f"📦 *Sobres:* {cantidad_sobres}\n"
                        f"🟢 *Estado:* APROBADO ✅"
                    )
                    bot.edit_message_text(
                        chat_id=telegram_chat_id,
                        message_id=int(telegram_message_id),
                        text=texto_actualizado,
                        parse_mode="Markdown",
                        reply_markup=None
                    )
                elif ID_CANAL_ALERTAS:
                    mensaje_telegram = (
                        f"✅ *PAGO VERIFICADO Y APROBADO*\n\n"
                        f"👤 *Usuario:* @{usuario_id or 'Anónimo'}\n"
                        f"📦 *Sobres:* {cantidad_sobres}"
                    )
                    bot.send_message(ID_CANAL_ALERTAS, mensaje_telegram, parse_mode="Markdown")
            except Exception as e_tg:
                print(f"⚠️ Aviso Telegram secundario: {e_tg}")

        return jsonify({"success": True, "message": "Pago aprobado y procesado correctamente."}), 200

    except Exception as e:
        print("❌ Error crítico en aprobar_pago_sobres:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    puerto_servidor = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto_servidor)
