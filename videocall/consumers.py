import json
from channels.generic.websocket import AsyncWebsocketConsumer

class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Avisar solo a los demás que alguien entró (no al que se conecta ahora)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": {"joined": True,"Mensaje":f"Se a unido a la llamada {self.channel_name}"},
                "sender_channel": self.channel_name
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_send(
        self.room_group_name,
        {
                "type": "signal_message",
                "message": {"left": True,"Informacion":f"{self.channel_name} ha salido de la llamada"},
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

        # retransmitir la señal al grupo, pero excluyendo al que la envió
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "signal_message",
                "message": data,
                "sender_channel": self.channel_name
            }
        )

    async def signal_message(self, event):
        # Evitar enviar el mensaje al que lo originó
        if self.channel_name != event.get("sender_channel"):
            await self.send(text_data=json.dumps(event["message"]))



