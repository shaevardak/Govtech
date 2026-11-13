export const stores = [
  { id: 1, name: 'Дәмді Market', address: 'ул. Айтеке би, 32', district: 'Центр', x: 53, y: 37, open: true },
  { id: 2, name: 'Ақмешіт супермаркет', address: 'пр. Абая, 81', district: 'Центр', x: 68, y: 54, open: true },
  { id: 3, name: 'Сырдария дүкені', address: 'ул. Желтоксан, 14', district: 'Сырдария', x: 34, y: 48, open: true },
  { id: 4, name: 'Береке', address: 'ул. Казыбек би, 106', district: 'Тасбөгет', x: 76, y: 31, open: true },
  { id: 5, name: 'Үй жанындағы дүкен', address: 'ул. Жургенова, 55', district: 'Центр', x: 46, y: 68, open: true },
]

export const initialComplaints = [
  { id: 1, storeId: 2, store: 'Ақмешіт супермаркет', topic: 'Цена на товар не соответствует на кассе', product: 'Масло подсолнечное', comment: 'На полке указана одна цена, на кассе пробили дороже.', status: 'pending', createdAt: 'Сегодня, 10:42' },
  { id: 2, storeId: 4, store: 'Береке', topic: 'Товара нет в наличии', product: 'Сахар-песок', comment: 'В приложении отмечен товар, но на витрине его нет.', status: 'pending', createdAt: 'Сегодня, 09:18' },
  { id: 3, storeId: 1, store: 'Дәмді Market', topic: 'Некорректная цена', product: 'Картофель', comment: 'Похоже, ошиблись с единицей измерения.', status: 'reviewed', createdAt: 'Вчера, 18:05' },
]

export const topics = ['Цена на полке отличается от цены на кассе', 'Цена выглядит некорректной', 'Товар отсутствует в продаже', 'Неверная информация о товаре', 'Другое']
