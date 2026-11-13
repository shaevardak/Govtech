from django.urls import path
from monitoring import views

urlpatterns = [
    path('api/auth/register/', views.auth_register),
    path('api/auth/login/', views.auth_login),
    path('api/auth/me/', views.auth_me),
    path('api/auth/logout/', views.auth_logout),
    path('api/stores/', views.stores),
    path('api/products/', views.products),
    path('api/price-reports/', views.price_reports),
    path('api/complaints/', views.complaints),
    path('api/complaints/<int:complaint_id>/', views.complaint_detail),
]
