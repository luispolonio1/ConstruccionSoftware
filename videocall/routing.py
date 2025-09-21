from django.urls import re_path
from . import consumers
from . import consumer_noti

websocket_urlpatterns = [
    re_path(r"ws/call/(?P<room_name>\w+)/$", consumers.VideoCallConsumer.as_asgi()),
    re_path(r"ws/notify/$", consumer_noti.NotifyConsumer.as_asgi()),
]
