from django.urls import path
from monitoring import views

urlpatterns = [
    path('api/stores/', views.stores),
    path('api/products/', views.products),
    path('api/price-reports/', views.price_reports),
    path('api/complaints/', views.complaints),
    path('api/complaints/<int:complaint_id>/', views.complaint_detail),
]
