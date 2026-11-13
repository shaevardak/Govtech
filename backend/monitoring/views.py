import json
from datetime import timezone as dt_timezone
from statistics import median

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Complaint, PriceObservation, Product, Store

def serialized_complaint(row):
    return {'id': row.id, 'store': row.store_id, 'store_name': row.store.name,
            'topic': row.topic, 'product': row.product_name, 'product_name': row.product_name,
            'comment': row.comment, 'status': row.status,
            'created_at': timezone.localtime(row.created_at).strftime('%d.%m.%Y, %H:%M')}

@require_http_methods(['GET'])
def stores(request):
    rows = Store.objects.filter(is_active=True)
    return JsonResponse([{'id': s.id, 'name': s.name, 'address': s.address, 'district': s.district,
        'latitude': s.latitude, 'longitude': s.longitude} for s in rows], safe=False)

@require_http_methods(['GET'])
def products(request):
    rows = Product.objects.filter(is_active=True)
    result = []
    for p in rows:
        result.append({'id': p.id, 'name': p.name, 'unit': p.unit, 'category': p.category})
    return JsonResponse(result, safe=False)

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def price_reports(request):
    if request.method == 'GET':
        grouped = {}
        for row in PriceObservation.objects.all().only('store_id', 'product_id', 'price'):
            key = (row.store_id, row.product_id)
            grouped.setdefault(key, []).append(row.price)
        return JsonResponse([{'store': store_id, 'product': product_id, 'median': median(values), 'observations': len(values)}
            for (store_id, product_id), values in grouped.items()], safe=False)
    try:
        data = json.loads(request.body)
        price = int(data.get('price', 0))
        if price <= 0:
            return JsonResponse({'error': 'Цена должна быть больше нуля'}, status=400)
        row = PriceObservation.objects.create(store_id=int(data['store']), product_id=int(data['product']), price=price)
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return JsonResponse({'error': 'Некорректные данные наблюдения'}, status=400)
    values = list(PriceObservation.objects.filter(store=row.store, product=row.product).values_list('price', flat=True))
    return JsonResponse({'id': row.id, 'store': row.store_id, 'product': row.product_id,
        'price': row.price, 'median': median(values), 'observations': len(values), 'created_at': row.created_at.isoformat()}, status=201)

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def complaints(request):
    if request.method == 'GET':
        return JsonResponse([serialized_complaint(row) for row in Complaint.objects.select_related('store')], safe=False)
    try:
        data = json.loads(request.body)
        row = Complaint.objects.create(store_id=int(data['store']), topic=str(data['topic'])[:180],
            product_name=str(data.get('product_name', ''))[:240], comment=str(data.get('comment', ''))[:1000])
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return JsonResponse({'error': 'Некорректные данные жалобы'}, status=400)
    return JsonResponse(serialized_complaint(row), status=201)

@csrf_exempt
@require_http_methods(['PATCH'])
def complaint_detail(request, complaint_id):
    row = get_object_or_404(Complaint.objects.select_related('store'), id=complaint_id)
    try:
        status = json.loads(request.body).get('status')
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({'error': 'Некорректные данные'}, status=400)
    if status not in (Complaint.PENDING, Complaint.REVIEWED):
        return JsonResponse({'error': 'Неизвестный статус'}, status=400)
    row.status = status
    row.save(update_fields=['status'])
    return JsonResponse(serialized_complaint(row))
