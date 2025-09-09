# Create your views here.
from django.shortcuts import render
from django.shortcuts import redirect
from django.contrib.auth.models import User
import random
import string

def room(request, room_name):
    return render(request, "videocall/room.html", {
        "room_name": room_name
        ,"users": User.objects.all()
    })


def home(request):
    sala = ''.join(random.choices(string.ascii_letters + string.digits, k=7))
    return redirect("room", room_name=sala)  # redirige a /room/sala1/
