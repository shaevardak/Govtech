import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowDownUp, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, CircleHelp, Clock3, MapPin, Menu, MessageSquareWarning, Minus, Plus, Search, ShieldCheck, Store as StoreIcon, X } from 'lucide-react'
import { products } from './data/products'
import { topics } from './data/demo'
import { api, authToken, median } from './services/api'
import CityMap from './components/CityMap.jsx'

const money = new Intl.NumberFormat('ru-RU')

function useData(user) {
  const [priceReports, setPriceReports] = useState({})
  const [complaints, setComplaints] = useState([])
  const [storeList, setStoreList] = useState([])
  useEffect(() => {
    if (!user) {
      setPriceReports({})
      setComplaints([])
      setStoreList([])
      return
    }
    api.stores().then(rows => setStoreList(rows.filter(row => row.latitude && row.longitude).map(row => ({
      ...row,
      position: [Number(row.latitude), Number(row.longitude)],
      mapUrl: row.source_url || undefined,
      from2gis: Boolean(row.source_url),
    })))).catch(() => {})
    api.products().then(() => {}).catch(() => {})
    if (user.is_staff) api.complaints().then(rows => setComplaints(rows.map(c => ({ ...c, store: c.store_name || c.store, createdAt: c.created_at || c.createdAt })))).catch(() => {})
    const refreshPrices = () => api.priceReports().then(rows => {
      const grouped = {}
      rows.forEach(row => { grouped[`${row.store}:${row.product}`] = { median: row.median, count: row.observations } })
      setPriceReports(current => ({ ...current, ...grouped }))
    }).catch(() => {})
    refreshPrices()
    const timer = window.setInterval(refreshPrices, 10000)
    return () => window.clearInterval(timer)
  }, [user?.id, user?.is_staff])
  const addPrice = (storeId, productId, price) => {
    const key = `${storeId}:${productId}`
    setPriceReports(prev => ({ ...prev, [key]: [...(prev[key] || []), Number(price)] }))
    api.reportPrice({ store: storeId, product: productId, price: Number(price) }).then(row => {
      setPriceReports(prev => ({ ...prev, [key]: { median: row.median, count: row.observations } }))
    }).catch(() => {})
  }
  const addComplaint = payload => {
    const local = { ...payload, id: Date.now(), status: 'pending', createdAt: 'Только что', store: storeList.find(s => s.id === Number(payload.storeId))?.name }
    setComplaints(prev => [local, ...prev])
    api.submitComplaint({ store: payload.storeId, topic: payload.topic, product_name: payload.product, comment: payload.comment }).catch(() => {})
  }
  const setStatus = (id, status) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    api.updateComplaint(id, status).catch(() => {})
  }
  return { priceReports, complaints, stores: storeList, addPrice, addComplaint, setStatus }
}

function Header({ user, onLogout }) {
  return <header className="topbar"><div className="brand"><div className="brand-mark"><span>Б</span></div><div><b>баға</b><small>КЫЗЫЛОРДА</small></div></div><nav className="top-nav"><span className="role-label">{user.is_staff ? <><ShieldCheck size={17}/> Кабинет администратора</> : <><MapPin size={17}/> Карта магазинов</>}</span></nav><div className="profile"><span>{user.full_name || user.username}</span><div className="avatar">{(user.full_name || user.username).slice(0, 1).toUpperCase()}</div><button className="logout-button" onClick={onLogout}>Выйти</button></div><button className="mobile-menu" onClick={onLogout}>Выйти</button></header>
}

function AuthPage({ initialMode, onAuthenticated, onNavigate }) {
  const [mode, setMode] = useState(initialMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'
  const switchMode = next => { setMode(next); setError(''); onNavigate(next === 'register' ? '/register' : '/login') }
  const submit = async event => {
    event.preventDefault()
    setError('')
    if (isRegister && password !== confirmation) return setError('Пароли не совпадают')
    setBusy(true)
    try {
      const result = isRegister
        ? await api.register({ username, email, full_name: fullName, password })
        : await api.login({ login: username, password })
      onAuthenticated(result)
    } catch (err) {
      setError(err.message || 'Не удалось выполнить запрос')
    } finally {
      setBusy(false)
    }
  }
  return <main className="auth-page"><div className="auth-card"><div className="auth-brand"><div className="brand-mark"><span>Б</span></div><div><b>баға</b><small>КЫЗЫЛОРДА</small></div></div><div className="eyebrow">МОНИТОРИНГ ЦЕН · КЫЗЫЛОРДА</div><h1>{isRegister ? 'Создать аккаунт' : 'С возвращением'}</h1><p>{isRegister ? 'Зарегистрируйтесь, чтобы сообщать цены и оставлять обращения.' : 'Войдите, чтобы продолжить работу с мониторингом цен.'}</p><div className="auth-tabs"><button className={!isRegister ? 'active' : ''} onClick={() => switchMode('login')}>Войти</button><button className={isRegister ? 'active' : ''} onClick={() => switchMode('register')}>Регистрация</button></div><form onSubmit={submit}>
    {isRegister && <><label className="field-label">Имя пользователя<input required minLength="3" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Например, aigerim"/></label><label className="field-label">Электронная почта<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/></label><label className="field-label">Ваше имя <span className="optional">необязательно</span><input autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Как к вам обращаться"/></label></>}
    {!isRegister && <label className="field-label">Имя пользователя или e-mail<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ваш логин или e-mail"/></label>}
    <label className="field-label">Пароль<input required type="password" minLength={isRegister ? 8 : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isRegister ? 'Не менее 8 символов' : 'Введите пароль'}/></label>
    {isRegister && <label className="field-label">Повторите пароль<input required type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Ещё раз пароль"/></label>}
    {error && <div className="auth-error">{error}</div>}<button className="primary-button full auth-submit" disabled={busy}>{busy ? 'Подождите…' : isRegister ? 'Создать аккаунт' : 'Войти'} <ArrowRight size={17}/></button>
  </form><div className="auth-footnote">{isRegister ? 'Регистрация создаёт обычный пользовательский аккаунт.' : 'Для администратора войдите под учётной записью Django staff.'}</div></div><div className="auth-background-note">Открытые цены. Надёжные наблюдения.</div></main>
}

function ProductRows({ store, priceReports, onReport }) {
  const [category, setCategory] = useState('Все товары')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(false)
  const [modalProduct, setModalProduct] = useState(null)
  const categories = ['Все товары', ...new Set(products.map(p => p.category))]
  const rows = useMemo(() => products.filter(p => (category === 'Все товары' || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort ? a.name.localeCompare(b.name, 'ru') : a.id - b.id), [category, search, sort])
  return <section className="products-panel"><div className="section-heading"><div><div className="eyebrow">АССОРТИМЕНТ</div><h2>Социально значимые товары <span className="count-badge">31</span></h2></div><button className="quiet-button" onClick={() => setSort(!sort)}><ArrowDownUp size={15}/> По названию</button></div><div className="product-toolbar"><div className="category-tabs">{categories.map(c => <button key={c} className={category === c ? 'chosen' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><label className="search-field compact"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти товар"/></label></div><div className="product-list">{rows.map(p => { const entry = priceReports[`${store.id}:${p.id}`]; const values = Array.isArray(entry) ? entry : []; const current = Array.isArray(entry) ? median(values) : entry?.median; const count = Array.isArray(entry) ? values.length : (entry?.count || 0); return <div className="product-row" key={p.id}><div className="product-icon">{p.category === 'Овощи и фрукты' ? '🥬' : p.category === 'Мясо и рыба' ? '🥩' : p.category === 'Молочные продукты' ? '🥛' : p.category === 'Хлеб и выпечка' ? '🍞' : '🌾'}</div><div className="product-name"><b>{p.name}</b><small>{p.category}</small></div><div className="price-cell">{current ? <><b>{money.format(current)} ₸</b><small>медиана · {count} {count === 1 ? 'цена' : 'цены'}</small></> : <><span className="no-price">Пока нет данных</span><small>Добавьте наблюдение</small></>}</div><button className="add-price" onClick={() => setModalProduct(p)}><Plus size={16}/><span>Указать цену</span></button></div>})}{!rows.length && <div className="empty-state">Товары не найдены</div>}</div>{modalProduct && <PriceModal product={modalProduct} store={store} onClose={() => setModalProduct(null)} onSubmit={price => { onReport(store.id, modalProduct.id, price); setModalProduct(null) }}/>}</section>
}

function PriceModal({ product, store, onClose, onSubmit }) {
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState('')
  const submit = e => { e.preventDefault(); if (!price || Number(price) <= 0) return setError('Введите цену больше нуля'); if (!quantity || Number(quantity) <= 0) return setError('Укажите количество товара'); onSubmit(Math.round(Number(price) / Number(quantity))) }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={submit}><button type="button" className="modal-close" onClick={onClose}><X/></button><div className="eyebrow">НАБЛЮДЕНИЕ ЦЕНЫ</div><h2>Укажите цену покупки</h2><p className="modal-copy">{product.name} · в каталоге за {product.unit}<br/>Магазин «{store.name}»</p><label className="field-label">Сумма покупки<div className="price-input"><input autoFocus type="number" min="1" step="1" placeholder="0" value={price} onChange={e => setPrice(e.target.value)}/><span>₸</span></div></label><label className="field-label">Количество в покупке ({product.unit})<input type="number" min="0.001" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)}/></label>{price && Number(quantity) > 0 && <div className="normalized-preview">Цена за {product.unit}: <b>{money.format(Math.round(Number(price) / Number(quantity)))} ₸</b></div>}{error && <div className="form-error">{error}</div>}<div className="modal-hint"><CircleHelp size={15}/> Например, 450 ₸ за 0,9 кг будет учтено как 500 ₸/кг. Медиана рассчитывается по наблюдениям покупателей.</div><button className="primary-button full" type="submit">Отправить цену <ArrowRight size={17}/></button></form></div>
}

function ComplaintModal({ store, onClose, onSubmit }) {
  const [topic, setTopic] = useState(''); const [product, setProduct] = useState(''); const [comment, setComment] = useState(''); const [sent, setSent] = useState(false)
  const submit = e => { e.preventDefault(); if (!topic) return; onSubmit({ storeId: String(store.id), topic, product, comment }); setSent(true) }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={submit}><button type="button" className="modal-close" onClick={onClose}><X/></button>{sent ? <div className="success-state"><div className="success-icon"><Check/></div><div className="eyebrow">ОБРАЩЕНИЕ ОТПРАВЛЕНО</div><h2>Спасибо за сигнал</h2><p>Администратор рассмотрит жалобу и обновит её статус.</p><button type="button" className="primary-button full" onClick={onClose}>Готово <ArrowRight size={17}/></button></div> : <><div className="eyebrow">ОБРАТНАЯ СВЯЗЬ</div><h2>Жалоба на магазин</h2><p className="modal-copy">«{store.name}» · {store.address}</p><label className="field-label">На что хотите пожаловаться?<select required value={topic} onChange={e => setTopic(e.target.value)}><option value="">Выберите причину</option>{topics.map(t => <option key={t}>{t}</option>)}</select></label><label className="field-label">Товар <span className="optional">необязательно</span><select value={product} onChange={e => setProduct(e.target.value)}><option value="">Не выбран</option>{products.map(p => <option key={p.id}>{p.name}</option>)}</select></label><label className="field-label">Комментарий <span className="optional">необязательно</span><textarea rows="3" maxLength="1000" placeholder="Расскажите подробнее" value={comment} onChange={e => setComment(e.target.value)}/></label><button className="primary-button full" type="submit">Отправить жалобу <ArrowRight size={17}/></button></>}</form></div>
}

function StoreDetails({ store, data, onBack }) {
  const [complaintOpen, setComplaintOpen] = useState(false)
  return <><div className="detail-top"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/> К карте</button><span className="store-status"><span className="online-dot"/>Открыто</span></div><div className="store-hero"><div className="store-avatar"><StoreIcon size={26}/></div><div className="store-title"><div className="eyebrow">ПРОДУКТОВЫЙ МАГАЗИН</div><h1>{store.name}</h1><p><MapPin size={15}/>{store.address} <span>·</span> {store.district}</p></div><button className="complaint-button" onClick={() => setComplaintOpen(true)}><MessageSquareWarning size={16}/> Пожаловаться</button></div><div className="store-meta"><div><span>АДРЕС</span><b>{store.address}, Кызылорда</b></div><div><span>РАЙОН</span><b>{store.district}</b></div><div><span>ТОВАРОВ В СПИСКЕ</span><b>31 позиция</b></div><div><span>ОБНОВЛЕНИЕ</span><b><Clock3 size={14}/>Цены от покупателей</b></div></div><ProductRows store={store} priceReports={data.priceReports} onReport={data.addPrice}/>{complaintOpen && <ComplaintModal store={store} onClose={() => setComplaintOpen(false)} onSubmit={data.addComplaint}/>}</>
}

function MapPage({ data }) {
  const [selected, setSelected] = useState(null); const [query, setQuery] = useState('')
  const storeList = data.stores
  return <main className="page-wrap"><div className="page-intro"><div><div className="eyebrow"><span className="live-dot"/> МОНИТОРИНГ ЦЕН · КЫЗЫЛОРДА</div><h1>Цены рядом с вами</h1><p>Сверяйте цены и делитесь тем, что увидели в магазине</p></div><div className="intro-chip"><span className="chip-symbol">₸</span><div><b>31 товар</b><small>социально значимых</small></div></div></div><div className="map-layout"><section className="map-frame"><div className="map-header"><div><div className="eyebrow">ИНТЕРАКТИВНАЯ КАРТА</div><h2>Магазины города <span>· {storeList.length}</span></h2></div><label className="search-field"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск магазина"/></label></div><CityMap stores={storeList} selected={selected} onSelect={setSelected} query={query}/></section><aside className="store-frame">{selected ? <StoreDetails store={selected} data={data} onBack={() => setSelected(null)}/> : <><div className="store-frame-heading"><div><div className="eyebrow">ТОРГОВЫЕ ТОЧКИ</div><h2>Выберите магазин</h2></div><button className="icon-button"><ArrowDownUp size={17}/></button></div><p className="sidebar-subtitle">Нажмите на точку на карте или выберите магазин из списка</p><div className="store-list">{storeList.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.address.toLowerCase().includes(query.toLowerCase())).map(s => <button key={s.id} className="store-card" onClick={() => setSelected(s)}><span className="store-mini"><StoreIcon size={18}/></span><span className="store-card-copy"><b>{s.name}</b><small><MapPin size={12}/>{s.address}</small><small>{s.district}</small></span><ChevronDown size={16} className="store-chevron"/></button>)}</div>{!storeList.length && <div className="empty-state">Точки магазинов пока не загружены</div>}<div className="sidebar-note"><AlertCircle size={16}/><span>Цены собираются от покупателей. Проверьте цену в магазине перед покупкой.</span></div></>}</aside></div><section className="how-section"><div><div className="eyebrow">КАК ЭТО РАБОТАЕТ</div><h2>Цены становятся точнее вместе</h2><p>Каждое наблюдение помогает видеть более объективную стоимость товара в городе.</p></div><div className="steps"><div><span>01</span><b>Выберите магазин</b><small>Найдите точку на карте</small></div><ArrowRight/><div><span>02</span><b>Укажите цену покупки</b><small>Введите чековую цену</small></div><ArrowRight/><div><span>03</span><b>Смотрите медиану</b><small>Устойчивая цена по городу</small></div></div></section><footer className="footer"><span>баға · Кызылорда</span><span>Данные о ценах предоставляют пользователи</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Наверх ↑</button></footer></main>
}

function ComplaintDetail({ complaint: c, setStatus, onClose }) {
  return <div className="complaint-detail">
    <div className="detail-banner"><div><div className="eyebrow">ДЕТАЛИ ОБРАЩЕНИЯ · #{c.id}</div><h3>{c.topic}</h3></div><button className="icon-button" onClick={onClose}><X size={17}/></button></div>
    <div className="detail-grid"><div><span>МАГАЗИН</span><b>{c.store}</b></div><div><span>ТОВАР</span><b>{c.product || 'Не указан'}</b></div><div><span>ПОЛУЧЕНО</span><b>{c.createdAt}</b></div></div>
    <div className="comment-box"><span>КОММЕНТАРИЙ ПОЛЬЗОВАТЕЛЯ</span><p>{c.comment || 'Пользователь не добавил комментарий.'}</p></div>
    <div className="detail-actions"><span className={`status-pill ${c.status}`}>{c.status === 'pending' ? 'Ожидает' : 'Рассмотрена'}</span>{c.status === 'pending' ? <button className="primary-button" onClick={() => { setStatus(c.id, 'reviewed'); onClose() }}><Check size={16}/>Отметить рассмотренной</button> : <button className="secondary-button" onClick={() => { setStatus(c.id, 'pending'); onClose() }}><Clock3 size={15}/>Вернуть в ожидание</button>}</div>
  </div>
}

function AdminPage({ complaints, setStatus, storeCount }) {
  const [filter, setFilter] = useState('all'); const [active, setActive] = useState(null); const [search, setSearch] = useState('')
  const sorted = [...complaints].filter(c => (filter === 'all' || c.status === filter) && `${c.topic} ${c.store} ${c.product} ${c.comment}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1))
  const pending = complaints.filter(c => c.status === 'pending').length
  return <main className="admin-wrap"><div className="admin-heading"><div><div className="eyebrow"><ShieldCheck size={14}/> РАБОЧЕЕ ПРОСТРАНСТВО</div><h1>Панель администратора</h1><p>Управление обращениями жителей и обратной связью</p></div><div className="admin-user"><div className="avatar admin-avatar">А</div><span><b>Администратор</b><small>Модератор системы</small></span><ChevronDown size={16}/></div></div><div className="stat-grid"><div className="stat-card"><div className="stat-icon blue"><MessageSquareWarning/></div><span>ВСЕ ОБРАЩЕНИЯ</span><b>{complaints.length}</b><small>за всё время</small></div><div className="stat-card"><div className="stat-icon amber"><Clock3/></div><span>ОЖИДАЮТ РАССМОТРЕНИЯ</span><b>{pending}</b><small>{pending ? 'Требуют вашего внимания' : 'Очередь пуста'}</small></div><div className="stat-card"><div className="stat-icon green"><Check/></div><span>РАССМОТРЕНО</span><b>{complaints.length - pending}</b><small>Обработано обращений</small></div><div className="stat-card"><div className="stat-icon purple"><StoreIcon/></div><span>ТОРГОВЫЕ ТОЧКИ</span><b>{storeCount}</b><small>в городе Кызылорда</small></div></div><section className="complaints-frame"><div className="complaints-header"><div><div className="eyebrow">ВХОДЯЩИЕ</div><h2>Жалобы пользователей <span className="count-badge">{complaints.length}</span></h2></div><label className="search-field"><Search size={17}/><input placeholder="Поиск по обращениям" value={search} onChange={e => { setSearch(e.target.value); setActive(null) }}/></label></div><div className="complaint-tabs"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>Все <span>{complaints.length}</span></button><button className={filter === 'pending' ? 'selected' : ''} onClick={() => setFilter('pending')}>Ожидают <span>{pending}</span></button><button className={filter === 'reviewed' ? 'selected' : ''} onClick={() => setFilter('reviewed')}>Рассмотрены <span>{complaints.length - pending}</span></button></div><div className="complaint-table"><div className="table-head"><span>ОБРАЩЕНИЕ</span><span>МАГАЗИН</span><span>ДАТА</span><span>СТАТУС</span><span></span></div>{sorted.map(c => <button className={`complaint-row ${active === c.id ? 'row-active' : ''}`} key={c.id} onClick={() => setActive(active === c.id ? null : c.id)}><span className="complaint-main"><span className="complaint-symbol"><MessageSquareWarning size={16}/></span><span><b>{c.topic}</b><small>{c.product || 'Без указания товара'}</small></span></span><span className="table-store"><StoreIcon size={15}/>{c.store}</span><span className="table-date">{c.createdAt}</span><span><i className={`status-pill ${c.status}`}>{c.status === 'pending' ? <><span/>Ожидает</> : <><Check size={12}/>Рассмотрена</>}</i></span><ArrowRight size={16} className="row-arrow"/></button>)}{!sorted.length && <div className="empty-state">Обращений в этой категории пока нет</div>}</div>{active && <ComplaintDetail complaint={complaints.find(item => item.id === active)} setStatus={setStatus} onClose={() => setActive(null)}/>}</section><footer className="footer"><span>баға · Администрирование</span><span>Панель обработки обращений</span><button>Поддержка <CircleHelp size={14}/></button></footer></main>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const data = useData(user)
  const navigate = nextPath => {
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    if (!authToken.get()) setLoading(false)
    else api.me().then(setUser).catch(() => authToken.clear()).finally(() => setLoading(false))
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (loading || !user) return
    const correctPath = user.is_staff ? '/admin' : '/'
    if (path !== correctPath) {
      window.history.replaceState({}, '', correctPath)
      setPath(correctPath)
    }
  }, [loading, user, path])

  const handleAuthenticated = result => {
    authToken.set(result.token)
    setUser(result.user)
    navigate(result.user.is_staff ? '/admin' : '/')
  }
  const logout = async () => {
    try { await api.logout() } catch {}
    authToken.clear()
    setUser(null)
    navigate('/login')
  }

  if (loading) return <div className="auth-loading">Проверяем сессию…</div>
  if (!user) return <AuthPage key={path === '/register' ? 'register' : 'login'} initialMode={path === '/register' ? 'register' : 'login'} onAuthenticated={handleAuthenticated} onNavigate={navigate}/>
  return <div className="app-shell"><Header user={user} onLogout={logout}/>{user.is_staff ? <AdminPage complaints={data.complaints} setStatus={data.setStatus} storeCount={data.stores.length}/> : <MapPage data={data}/>}</div>
}
