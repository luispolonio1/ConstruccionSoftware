import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotifyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope["user"].username if self.scope["user"].is_authenticated else "Anónimo"
        self.room_group_name = "notify"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "call_request":
            # enviar invitación al grupo
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "notify_message",
                    "message": {
                        "type": "incoming_call",
                        "from": self.username,
                        "room_name": data.get("room_name")
                    },
                    "sender_channel": self.channel_name
                }
            )
        elif msg_type in ["call_accepted", "call_rejected"]:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "notify_message",
                    "message": {
                        "type": msg_type,
                        "from": self.username,
                        "room_name": data.get("room_name")
                    },
                    "sender_channel": self.channel_name
                }
            )

    async def notify_message(self, event):
        if self.channel_name != event.get("sender_channel"):
            await self.send(text_data=json.dumps(event["message"]))
