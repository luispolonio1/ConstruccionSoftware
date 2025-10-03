import json
from channels.generic.websocket import AsyncWebsocketConsumer

class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"
        self.username = self.scope["user"].username if self.scope["user"].is_authenticated else "Anónimo"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Avisar a los demás que alguien entró
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": {
                    "joined": True,
                    "Mensaje": f"🔔 {self.username} se ha unido a la llamada"
                },
                "sender_channel": self.channel_name
            }
        )

    async def disconnect(self, close_code):
        # Avisar a los demás que alguien salió
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": {
                    "left": True,
                    "Informacion": f"❌ {self.username} ha salido de la llamada"
                },
                "sender_channel": self.channel_name
            }
        )
        # salir del grupo
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        #Mensajes especiales (predicción, traducción, etc.)
        if msg_type in ["prediccion", "translation"]:
            print(f"Mensaje recibido ({msg_type}): {data}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_message",
                    "message": data,
                    "sender_channel": self.channel_name
                }
            )

        # 🔹 Solicitud de llamada
        elif msg_type == "call_request":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": {
                        "type": "incoming_call",
                        "from": self.username
                    },
                    "sender_channel": self.channel_name
                }
            )

        # 🔹 Aceptar llamada
        elif msg_type == "call_accepted":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": {
                        "type": "call_accepted",
                        "from": self.username
                    },
                    "sender_channel": self.channel_name
                }
            )

        # 🔹 Rechazar llamada
        elif msg_type == "call_rejected":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": {
                        "type": "call_rejected",
                        "from": self.username
                    },
                    "sender_channel": self.channel_name
                }
            )

        # 🔹 Señalización WebRTC normal (offer/answer/ice)
        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "signal_message",
                    "message": data,
                    "sender_channel": self.channel_name
                }
            )

    async def signal_message(self, event):
        if self.channel_name != event.get("sender_channel"):
            await self.send(text_data=json.dumps(event["message"]))

    async def broadcast_message(self, event):
        if self.channel_name == event.get("sender_channel"):
            return
        await self.send(text_data=json.dumps({
            "type": "broadcast_message",
            "message": event["message"],
        }))
