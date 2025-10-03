import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.shortcuts import get_object_or_404
from channels.db import database_sync_to_async

from Login.models import Usuario

class NotifyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope["user"].username if self.scope["user"].is_authenticated else "Anónimo"
        self.user_id = self.scope["user"].id if self.scope["user"].is_authenticated else None
        self.room_group_name = "notify"
        
        # Grupo individual para notificaciones personales
        if self.user_id:
            self.user_group_name = f"user_{self.user_id}"
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )

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
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        user = data.get("room_name")[0:-1]
        to_user = await database_sync_to_async(get_object_or_404)(Usuario, username=user)

        if msg_type == "call_request":
            # enviar invitación al grupo
            #print(data.get("room_name"))
            #print(to_user.id)
            
            await self.channel_layer.group_send(
                f"user_{to_user.id}",
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
            from_user = await database_sync_to_async(get_object_or_404)(Usuario, username=data.get("from"))
            #print(f'De: {data.get("from")}')
            #print(f'Para: {to_user.id}')
            await self.channel_layer.group_send(
                f"user_{from_user.id}",
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
            
            
    async def nueva_solicitud(self, event):
        await self.send(text_data=json.dumps({
            'type': 'nueva_solicitud',
            'solicitud': event['solicitud']
        }))
        
        
    async def nuevo_amigo(self, event):
        await self.send(text_data=json.dumps({
            'type': 'nuevo_amigo',
            'amigo': event['amigo']
        }))