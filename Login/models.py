from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

# Create your models here.

class Usuario(AbstractUser):
    amigo = models.ManyToManyField('self',symmetrical=True, blank=True)

class FriendRequest(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name="sent_requests", 
        on_delete=models.CASCADE
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name="received_requests", 
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("accepted", "Aceptada"),
        ("rejected", "Rechazada"),
    ]
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending"
    )

    class Meta:
        unique_together = ("from_user", "to_user")  # evita solicitudes duplicadas

    def __str__(self):
        return f"{self.from_user} → {self.to_user} ({self.status})"
