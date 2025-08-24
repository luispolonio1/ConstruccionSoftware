
# Create your views here.
from django.shortcuts import render

def room(request, room_name):
    return render(request, "videocall/room.html", {
        "room_name": room_name
    })

from django.shortcuts import redirect

def home(request):
    return redirect("room", room_name="sala1")  # redirige a /room/sala1/
