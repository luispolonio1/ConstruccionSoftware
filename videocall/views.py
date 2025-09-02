
# Create your views here.
from django.shortcuts import render
from django.shortcuts import redirect
from django.contrib.auth.models import User

def room(request, room_name):
    return render(request, "videocall/room.html", {
        "room_name": room_name
        ,"users": User.objects.all()
    })


def home(request):
    return redirect("room", room_name="sala1")  # redirige a /room/sala1/
