# Create your views here.
from django.shortcuts import render
from django.shortcuts import redirect
from Login.models import Usuario, FriendRequest
from django.contrib.auth.decorators import login_required
import random
import string

@login_required(login_url='login')
def room(request, room_name):
    return render(request, "videocall/llamada.html", {
        "room_name": room_name
    })

@login_required(login_url='login')
def home(request):
    amigos = Usuario.objects.filter(amigo=request.user)
    solicitudes = FriendRequest.objects.filter(to_user=request.user, status="pending")
    return render(request,"videocall/home.html",{"users": amigos,"solicitudes": solicitudes})


def createRoom(request):
    room_name = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    return redirect('room', room_name=room_name)
