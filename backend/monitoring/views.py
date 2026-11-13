import json
import hashlib
import secrets
from statistics import median
from datetime import timedelta
from functools import wraps

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Complaint, PriceObservation, Product, Store, UserSession

User = get_user_model()

def serialize_user(user):
    return {'id': user.id, 'username': user.username, 'email': user.email, 'full_name': user.first_name, 'is_staff': user.is_staff}

def issue_session(user):
    token = secrets.token_urlsafe(36)
    UserSession.objects.create(user=user, token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=timezone.now() + timedelta(days=30))
    return token

def get_api_user(request):
    authorization = request.headers.get('Authorization', '')
    if not authorization.startswith('Bearer '):
        return None
    token = authorization[7:].strip()
    if not token:
        return None
    try:
        session = UserSession.objects.select_related('user').get(token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at__gt=timezone.now())
        return session.user
    except UserSession.DoesNotExist:
        return None

def login_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        user = get_api_user(request)
        if not user:
            return JsonResponse({'error': 'Войдите в аккаунт, чтобы продолжить'}, status=401)
        request.api_user = user
        return view(request, *args, **kwargs)
    return wrapped

def admin_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        user = get_api_user(request)
        if not user:
            return JsonResponse({'error': 'Требуется авторизация'}, status=401)
        if not user.is_staff:
            return JsonResponse({'error': 'Доступ только для администратора'}, status=403)
        request.api_user = user
        return view(request, *args, **kwargs)
    return wrapped

@csrf_exempt
@require_http_methods(['POST'])
def auth_register(request):
    try:
        data = json.loads(request.body)
        username = str(data.get('username', '')).strip()
        email = str(data.get('email', '')).strip().lower()
        full_name = str(data.get('full_name', '')).strip()
        password = str(data.get('password', ''))
        if not username or not email or not password:
            return JsonResponse({'error': 'Заполните имя пользователя, e-mail и пароль'}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({'error': 'Это имя пользователя уже занято'}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({'error': 'Этот e-mail уже зарегистрирован'}, status=400)
        try:
            validate_password(password)
        except ValidationError as error:
            return JsonResponse({'error': ' '.join(error.messages)}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password, first_name=full_name)
        return JsonResponse({'token': issue_session(user), 'user': serialize_user(user)}, status=201)
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({'error': 'Некорректные данные регистрации'}, status=400)

@csrf_exempt
@require_http_methods(['POST'])
def auth_login(request):
    try:
        data = json.loads(request.body)
        identifier = str(data.get('login', '')).strip()
        password = str(data.get('password', ''))
        username = User.objects.filter(email__iexact=identifier).values_list('username', flat=True).first() or identifier
        user = authenticate(request, username=username, password=password)
        if not user:
            return JsonResponse({'error': 'Неверный логин или пароль'}, status=401)
        return JsonResponse({'token': issue_session(user), 'user': serialize_user(user)})
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({'error': 'Некорректные данные входа'}, status=400)

@login_required
@require_http_methods(['GET'])
def auth_me(request):
    return JsonResponse(serialize_user(request.api_user))

@csrf_exempt
@login_required
@require_http_methods(['POST'])
def auth_logout(request):
    authorization = request.headers.get('Authorization', '')
    token = authorization[7:].strip()
    UserSession.objects.filter(token_hash=hashlib.sha256(token.encode()).hexdigest()).delete()
    return JsonResponse({'ok': True})

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
    user = get_api_user(request)
    if not user:
        return JsonResponse({'error': 'Войдите, чтобы отправить цену'}, status=401)
    try:
        data = json.loads(request.body)
        price = int(data.get('price', 0))
        if price <= 0:
            return JsonResponse({'error': 'Цена должна быть больше нуля'}, status=400)
        row = PriceObservation.objects.create(store_id=int(data['store']), product_id=int(data['product']), price=price, reported_by=user)
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return JsonResponse({'error': 'Некорректные данные наблюдения'}, status=400)
    values = list(PriceObservation.objects.filter(store=row.store, product=row.product).values_list('price', flat=True))
    return JsonResponse({'id': row.id, 'store': row.store_id, 'product': row.product_id,
        'price': row.price, 'median': median(values), 'observations': len(values), 'created_at': row.created_at.isoformat()}, status=201)

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def complaints(request):
    if request.method == 'GET':
        user = get_api_user(request)
        if not user:
            return JsonResponse({'error': 'Требуется авторизация'}, status=401)
        if not user.is_staff:
            return JsonResponse({'error': 'Доступ только для администратора'}, status=403)
        return JsonResponse([serialized_complaint(row) for row in Complaint.objects.select_related('store')], safe=False)
    user = get_api_user(request)
    if not user:
        return JsonResponse({'error': 'Войдите, чтобы отправить жалобу'}, status=401)
    try:
        data = json.loads(request.body)
        row = Complaint.objects.create(store_id=int(data['store']), reported_by=user, topic=str(data['topic'])[:180],
            product_name=str(data.get('product_name', ''))[:240], comment=str(data.get('comment', ''))[:1000])
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        return JsonResponse({'error': 'Некорректные данные жалобы'}, status=400)
    return JsonResponse(serialized_complaint(row), status=201)

@csrf_exempt
@require_http_methods(['PATCH'])
@admin_required
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
