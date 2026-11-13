from django.conf import settings
from django.db import models

class Store(models.Model):
    name = models.CharField(max_length=180)
    address = models.CharField(max_length=240)
    district = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=240, unique=True)
    unit = models.CharField(max_length=20)
    category = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class PriceObservation(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='price_observations')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_observations')
    price = models.PositiveIntegerField()
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='price_observations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class Complaint(models.Model):
    PENDING = 'pending'
    REVIEWED = 'reviewed'
    STATUS_CHOICES = [(PENDING, 'Ожидает'), (REVIEWED, 'Рассмотрена')]
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='complaints')
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    topic = models.CharField(max_length=180)
    product_name = models.CharField(max_length=240, blank=True)
    comment = models.TextField(blank=True, max_length=1000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['status', '-created_at']

class UserSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_sessions')
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
