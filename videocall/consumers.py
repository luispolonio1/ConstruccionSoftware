import json
from channels.generic.websocket import AsyncWebsocketConsumer
from groq import Groq
from dotenv import load_dotenv
import os


load_dotenv()


class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"
        self.username = (
            self.scope["user"].username
            if self.scope["user"].is_authenticated
            else "Anónimo"
        )

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

        # Avisar a los demás que alguien entró
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": {
                    "joined": True,
                    "Mensaje": f"🔔 {self.username} se ha unido a la llamada",
                },
                "sender_channel": self.channel_name,
            },
        )

    async def disconnect(self, close_code):
        # Avisar a los demás que alguien salió
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": {
                    "left": True,
                    "Informacion": f"❌ {self.username} ha salido de la llamada",
                },
                "sender_channel": self.channel_name,
            },
        )
        # salir del grupo
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        # Mensajes especiales
        if msg_type in ["prediccion", "translation"]:
            # print(f"Mensaje recibido ({msg_type}): {data}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_message",
                    "message": data,
                    "sender_channel": self.channel_name,
                },
            )
        elif msg_type == "prediccion_final":
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            user_text = (
                (data or {}).get("traduccion") if isinstance(data, dict) else data
            )

            if not isinstance(user_text, str) or not user_text.strip():
                await self.send(
                    text_data=json.dumps(
                        {
                            "kind": "error",
                            "detail": "Falta campo 'traduccion' como string",
                        }
                    )
                )
                return

            chat_completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Eres un traductor que convierte palabras o frases provenientes de ASL al español. "
                            "Sigue estas reglas: "
                            "respeta los pronombres"
                            "1. Si solo hay una palabra, Si es un sustantivo, solo agrega artículo si es necesario (ej: 'casa' -> 'la casa'). "
                            "2. No inventes contexto"
                            "3. Si hay varias palabras, ordénalas y genera UNA sola oración corta, natural y correctamente conjugada. "
                            "4. Sigue este ejemplo si solo ves un adjetivo 'triste' -> 'me siento triste' "
                            "No quiero que des explicaciones de nada"
                        ),
                    },
                    {"role": "user", "content": user_text},
                ],
                temperature=0.2,
            )

            traduccion = chat_completion.choices[0].message.content.strip()
            print(f"Traduccion: {traduccion}")

            await self.send(
                text_data=json.dumps(
                    {
                        "kind": "ack",
                        "detail": "Predicción recibida",
                        "traduccion": traduccion,
                    }
                )
            )

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_message",
                    "message": {"type": "prediccion", "text": traduccion},
                    "sender_channel": self.channel_name,
                },
            )

        elif msg_type == "call_request":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": {"type": "incoming_call", "from": self.username},
                    "sender_channel": self.channel_name,
                },
            )

        elif msg_type == "call_accepted":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": {"type": "call_accepted", "from": self.username},
                    "sender_channel": self.channel_name,
                },
            )

        elif msg_type == "call_rejected":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": {"type": "call_rejected", "from": self.username},
                    "sender_channel": self.channel_name,
                },
            )

        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": data,
                    "sender_channel": self.channel_name,
                },
            )

    async def signal_message(self, event):
        if self.channel_name != event.get("sender_channel"):
            await self.send(text_data=json.dumps(event["message"]))

    async def broadcast_message(self, event):
        if self.channel_name == event.get("sender_channel"):
            return
        await self.send(
            text_data=json.dumps(
                {
                    "type": "broadcast_message",
                    "message": event["message"],
                }
            )
        )
