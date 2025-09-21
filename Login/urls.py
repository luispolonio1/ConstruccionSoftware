from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('signup/', views.signup, name='signup'),
    path('buscar_usuarios/', views.buscar_usuarios, name='buscar_usuarios'),
    path("enviar_solicitud/<int:user_id>/", views.enviar_solicitud, name="enviar_solicitud"),
    path("aceptar_solicitud/<int:solicitud_id>/", views.aceptar_solicitud, name="aceptar_solicitud"),
    path("rechazar_solicitud/<int:solicitud_id>/", views.rechazar_solicitud, name="rechazar_solicitud"),
]