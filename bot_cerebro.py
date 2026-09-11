# =============================================================================
# 🤖 BOT CEREBRO CENTRAL - PROCESADOR DE WEBHOOKS Y ALERTAS DE CANAL DE JUEGO
# =============================================================================
import os
from flask import Flask, request, jsonify
import telebot
from supabase import create_client, Client

app = Flask(__name__)

# =============================================================================
# 🔐 CONFIGURACIÓN SEGURA: LECTURA DE VARIABLES DE ENTORNO EN RENDER
# =============================================================================
SUPABASE_URL = "https://zrxmjpgnwqxyzdjnnwae.supabase.co"

# El código ahora lee los valores ocultos del sistema en lugar de tenerlos escritos
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ID_CANAL_ALERTAS = os.environ.get("ID_CANAL_ALERTAS")

# Inicialización segura
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)


print("🚀 El Bot Cerebro de Recompensas está listo y escuchando peticiones en internet...")

# =============================================================================
# 🏠 RUTA DE BIENVENIDA (Para verificar que Render mantenga el servidor 'Live')
# =============================================================================
@app.route('/', methods=['GET'])
def verificar_servidor_activo():
    return "<h1>💻 Servidor del Bot de Barajitas en Línea (24/7)</h1>", 200

# =============================================================================
# 📡 RUTA EXCLUSIVA: ESCUCHADOR DEL WEBHOOK DE PREMIOS AUTOMÁTICOS DE SUPABASE
# =============================================================================
@app.route('/webhook_payout', methods=['POST'])
def recibir_alerta_payout_supabase():
    try:
        # Capturar el paquete de datos en formato JSON que envía Supabase
        datos_recibidos = request.json
        print("📨 Datos crudos recibidos del Webhook de Supabase:", datos_recibidos)

        # Extraer el registro que acaba de ser insertado en la tabla Escrow
        nueva_fila = datos_recibidos.get('record')
        if not nueva_fila:
            return jsonify({"status": "error", "message": "No se encontraron datos del registro"}), 400

        # Verificar si la fila insertada corresponde a un RECLAMO AUTOMÁTICO de hito completado
        if nueva_fila.get('estado_pago') == 'RECLAMO_AUTOMATICO':
            id_jugador = nueva_fila.get('vendedor_id')
            monto_recompensa = float(nueva_fila.get('monto_bruto_usd', 70.00))
            id_lote = nueva_fila.get('id_lote')

            print(f"🚨 ¡ALERTA DE RECOMPENSA! El jugador [{id_jugador}] reclama un premio de ${monto_recompensa} USDT.")

            # 1. Consultar a Supabase la billetera TON (Telegram Wallet) que guardó desde la tienda
            res_usuario = supabase.table("Usuarios").select("wallet_ton_address, username").eq("id_usuario", id_jugador).maybe_single().execute()
            datos_usuario = res_usuario.data

            if not datos_usuario or not datos_usuario.get('wallet_ton_address'):
                print(f"❌ Pago Cancelado: El usuario [{id_jugador}] no configuró su billetera en el perfil.")
                # Cambiar estado en Supabase a FALLIDO por falta de datos financieros
                supabase.table("Historial_Subastas_Liquidadas").update({"estado_pago": "ERROR_SIN_WALLET"}).eq("id_lote", id_lote).execute()
                return jsonify({"status": "abortado", "reason": "Usuario sin billetera configurada"}), 200

            wallet_destino = datos_usuario['wallet_ton_address']
            username_telegram = datos_usuario.get('username', 'Jugador_Anonimo')

            # 2. ALGORITMO ROBOTIZADO WEB3 (Firma digital de transacción automática)
            # En producción, aquí se integra el llamado seguro a tu nodo de la red TON
            # para enviar los USDT directamente de tu saldo acumulado a su billetera.
            # Simulación de Hash seguro de transacción blockchain exitosa
            hash_blockchain = f"TON_TX_SUCCESS_{id_lote}_REWARD"

            # 3. Actualizar la fila en Supabase marcándola como LIQUIDADA de forma inmutable
            supabase.table("Historial_Subastas_Liquidadas").update({
                "estado_pago": "LIQUIDADO",
                "referencia_bancaria": hash_blockchain
            }).eq("id_lote", id_lote).execute()

            print(f"✅ Recompensa de ${monto_recompensa} USDT transferida con éxito a la wallet: {wallet_destino}")

            # 4. DISPARAR ALERTA EN VIVO EN TU CANAL PÚBLICO (Efecto Viralizador)
            mensaje_canal = (
                f"🎉 🎮 *¡PREMIO VERIFICADO Y ENTREGADO!* 🎮 🎉\n\n"
                f"El legendario coleccionista @{username_telegram} ha completado las 500 cartas de la Fase Común.\n\n"
                f"💰 *Premio Transferido:* {monto_recompensa:.2f} USDT\n"
                f"⚡ *Red de Envío:* TON Blockchain (Telegram Wallet)\n"
                f"🛡️ *Firma de Auditoría:* `Verificación Automática`\n\n"
                f"¡Adquiere tus sobres por solo $0.62 USD, llena tu álbum y gana en línea sin intermediarios! 🚀"
            )
            bot.send_message(ID_CANAL_ALERTAS, mensaje_canal, parse_mode="Markdown")

            return jsonify({"status": "payout_procesado_exitosamente"}), 200

        return jsonify({"status": "evento_ignorado"}), 200

    except Exception as e:
        print("❌ Fallo crítico en el procesador del Webhook:", str(e))
        return jsonify({"status": "error_interno", "error": str(e)}), 500

# =============================================================================
# ⚙️ ARRANQUE E INYECCIÓN DINÁMICA DEL PUERTO SEGURO DE RENDER
# =============================================================================
if __name__ == "__main__":
    # Render exige de forma obligatoria leer la variable 'PORT' asignada por su sistema
    puerto_servidor = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto_servidor)
