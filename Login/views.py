from django.shortcuts import render,redirect
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import login, authenticate
from Login.models import Usuario, FriendRequest
from django.shortcuts import get_object_or_404
from django.contrib.auth.forms import UserCreationForm
from django.http import JsonResponse
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
# Create your views here.


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home') 
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password")
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect("home")  # redirige donde quieras después del login
        else:
            return render(request, "Login.html", {"form": form, "error": "Usuario o contraseña incorrectos"})
    else:
        form = AuthenticationForm()
    return render(request, "Login.html", {"form": form})


def signup(request):
    if request.method == "GET":
        return render (request, "signup.html", {"form": UserCreationForm()})
    else:
        if request.POST["password1"] == request.POST["password2"]:
            try:
                user = Usuario.objects.create_user(
                    username=request.POST["username"], password=request.POST["password1"]
                )
                user.save()
                login(request, user)
                return redirect("home")
            except:
                return render(request,"signup.html",{"form": UserCreationForm(),"error": "El usuario ya existe"})
        return render(request,"signup.html",{"form": UserCreationForm(),"error": "Las contraseñas no coinciden"})
    

def buscar_usuarios(request):
    query = request.GET.get("q", "")
    results = []
    if len(query) >= 2:  # mínimo 4 letras
        users = Usuario.objects.filter(username__icontains=query)[:10]  # límite 10 resultados
        results = [{"id": u.id, "username": u.username} for u in users]
    return JsonResponse(results, safe=False)


def enviar_solicitud(request, user_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "No autenticado"}, status=401)

    to_user = get_object_or_404(Usuario, id=user_id)

    # Evitar duplicados
    fr, created = FriendRequest.objects.get_or_create(
        from_user=request.user,
        to_user=to_user,
        defaults={"status": "pending"}
    )
    
    if not created:
        return JsonResponse({"message": "Solicitud ya existe", "status": fr.status}, status=400)
    #print("Solicitud enviada")
    channel_layer = get_channel_layer()
    #print(to_user.username)
    async_to_sync(channel_layer.group_send)(
        f'user_{to_user.id}',
        {
            'type': 'nueva_solicitud',
            'solicitud': {
                'id': fr.id,
                'from_user_username': request.user.username,
            }
        }
    )
    return JsonResponse({"message": "Solicitud enviada", "status": fr.status})


def aceptar_solicitud(request, solicitud_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "No autenticado"}, status=401)

    solicitud = get_object_or_404(FriendRequest, id=solicitud_id, to_user=request.user)

    if solicitud.status != "pending":
        return JsonResponse({"error": "Solicitud no está pendiente"}, status=400)

    solicitud.status = "accepted"
    solicitud.save()

    # Añadir a la lista de amigos
    request.user.amigo.add(solicitud.from_user)
    solicitud.from_user.amigo.add(request.user)
    
    channel_layer = get_channel_layer()
    #print(f"Channel {channel_layer}")
    
    async_to_sync(channel_layer.group_send)(
        f'user_{request.user.id}',
        {
            'type': 'nuevo_amigo',
            'amigo': {
                'id': solicitud.from_user.id,
                'username': solicitud.from_user.username,
            }
        }
    )
    async_to_sync(channel_layer.group_send)(
        f'user_{solicitud.from_user.id}',
        {
            'type': 'nuevo_amigo',
            'amigo': {
                'id': request.user.id,
                'username': request.user.username,
            }
        }
    )
    
    return JsonResponse({"message": "Solicitud aceptada"})


def rechazar_solicitud(request, solicitud_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "No autenticado"}, status=401)

    solicitud = get_object_or_404(FriendRequest, id=solicitud_id, to_user=request.user)

    if solicitud.status != "pending":
        return JsonResponse({"error": "Solicitud no está pendiente"}, status=400)

    solicitud.status = "rejected"
    solicitud.save()

    return JsonResponse({"message": "Solicitud rechazada"})