
import { useEffect, useMemo, useState } from 'react'
import {
  Users, Package, ClipboardList, Wallet, Plus, Search, Sparkles,
  Bell, ChevronLeft, Pencil, Trash2, X, Save, FileText, Building2,
  AlertTriangle, Boxes, ShoppingCart, Minus, CheckCircle, CalendarDays
} from 'lucide-react'
import {
  initializeDatabase, getCustomers, addCustomer as addCustomerToDb,
  updateCustomer, deleteCustomer, getProducts, addProduct,
  updateProduct, deleteProduct, getOrders, addOrder, updateOrderStatus,
  type OrderRecord
} from './db/database'
import {
  ensureCustomerDetailsSchema,
  getCustomerDetails,
  saveCustomerDetails,
  type CustomerDetails
} from './db/customerDetails'
import { ensureSalesExtensionsSchema } from './db/salesExtensions'
import CustomerDetailsForm from './CustomerDetailsForm'
import Payments from './Payments'
import Backup from './Backup'
import FollowUps from './FollowUps'
import Consultations from './Consultations'
import NavigationDrawer from './NavigationDrawer'
import CustomerManagement from './CustomerManagement'

const emptyCustomerDetails: CustomerDetails = {
  alternatePhone: '',
  city: '',
  job: '',
  customerType: 'عادی',
  leadSource: '',
  preferredContact: '',
  interests: '',
  productsWanted: '',
  budget: 0,
  lastContact: '',
  negotiationResult: '',
  priority: 'متوسط',
  followUpDate: ''
}

type Customer = {
  id: number
  name: string
  mobile: string
  company: string
  stage: string
  notes: string
}

type Product = {
  id: number
  name: string
  code: string
  category: string
  cost: number
  price: number
  stock: number
  minStock: number
}

type CartItem = {
  productId: number
  quantity: number
}

const money = (n: number) =>
  new Intl.NumberFormat('fa-IR').format(n)

const statuses = [
  'ثبت شده',
  'در حال آماده‌سازی',
  'ارسال شده',
  'تحویل شده',
  'لغو شده'
]

export default function App() {
  const [tab, setTab] = useState('خانه')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [customerDetails, setCustomerDetails] =
    useState<CustomerDetails>({ ...emptyCustomerDetails })
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productCost, setProductCost] = useState('0')
  const [productPrice, setProductPrice] = useState('0')
  const [productStock, setProductStock] = useState('0')
  const [productMinStock, setProductMinStock] = useState('0')

  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderCustomer, setOrderCustomer] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderDiscount, setOrderDiscount] = useState('0')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderSearch, setOrderSearch] = useState('')

  async function loadCustomers() {
    const records = await getCustomers()
    setCustomers(records.map(c => ({
      id: c.id,
      name: c.name,
      mobile: c.phone,
      company: c.company || '',
      stage: c.stage,
      notes: c.notes || ''
    })))
  }

  async function loadProducts() {
    const records = await getProducts()
    setProducts(records.map(p => ({
      ...p,
      category: p.category || ''
    })))
  }

  async function loadOrders() {
    setOrders(await getOrders())
  }

  async function refreshAll() {
    await Promise.all([loadCustomers(), loadProducts(), loadOrders()])
  }

  useEffect(() => {
    async function start() {
      try {
        await initializeDatabase()
        await ensureCustomerDetailsSchema()
        await ensureSalesExtensionsSchema()
        await refreshAll()
      } catch (err) {
        console.error(err)
        setError('اتصال به دیتابیس انجام نشد.')
      } finally {
        setLoading(false)
      }
    }
    start()
  }, [])

  const filtered = useMemo(() => customers.filter(c =>
    (c.name + c.mobile + c.company).toLowerCase().includes(query.toLowerCase())
  ), [customers, query])

  const filteredProducts = useMemo(() => products.filter(p =>
    (p.name + p.code + p.category).toLowerCase().includes(productQuery.toLowerCase())
  ), [products, productQuery])

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length

  const cartTotal = cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.productId)
    return sum + (p ? p.price * item.quantity : 0)
  }, 0)

  const discountValue = Math.max(0, Number(orderDiscount) || 0)
  const finalTotal = Math.max(0, cartTotal - discountValue)

  const selectedCustomer = customers.find(c => c.id === Number(orderCustomer))

  function openNewForm() {
    setEditing(null)
    setName('')
    setMobile('')
    setCompany('')
    setNotes('')
    setCustomerDetails({ ...emptyCustomerDetails })
    setDetailsLoading(false)
    setShowForm(true)
  }

  async function openEditForm(c: Customer) {
    setEditing(c)
    setName(c.name)
    setMobile(c.mobile)
    setCompany(c.company)
    setNotes(c.notes)
    setCustomerDetails({ ...emptyCustomerDetails })
    setDetailsLoading(true)
    setShowForm(true)

    try {
      const details = await getCustomerDetails(c.id)
      if (details) setCustomerDetails(details)
    } catch (err) {
      console.error(err)
      setError('دریافت اطلاعات تکمیلی مشتری انجام نشد.')
    } finally {
      setDetailsLoading(false)
    }
  }

  async function saveCustomer() {
    if (!name.trim() || !mobile.trim() || saving || detailsLoading) return

    try {
      setSaving(true)
      setError('')

      let customerId: number

      if (editing) {
        customerId = editing.id
        await updateCustomer(customerId, name, mobile, company, notes)
      } else {
        await addCustomerToDb(name, mobile)

        const updated = await getCustomers()
        const created = updated[0]

        if (!created) {
          throw new Error('مشتری جدید در دیتابیس پیدا نشد.')
        }

        customerId = created.id

        await updateCustomer(
          customerId,
          created.name,
          created.phone,
          company,
          notes
        )
      }

      await saveCustomerDetails(customerId, customerDetails)
      await loadCustomers()

      setShowForm(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      setError('ذخیره اطلاعات مشتری انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function removeCustomer(c: Customer) {
    if (!window.confirm(`مشتری «${c.name}» حذف شود؟`)) return

    try {
      await deleteCustomer(c.id)
      await loadCustomers()
    } catch (err) {
      console.error(err)
      setError('حذف مشتری انجام نشد.')
    }
  }

  function openNewProductForm() {
    setEditingProduct(null)
    setProductName('')
    setProductCode('')
    setProductCategory('')
    setProductCost('0')
    setProductPrice('0')
    setProductStock('0')
    setProductMinStock('0')
    setShowProductForm(true)
  }

  function openEditProductForm(p: Product) {
    setEditingProduct(p)
    setProductName(p.name)
    setProductCode(p.code)
    setProductCategory(p.category)
    setProductCost(String(p.cost))
    setProductPrice(String(p.price))
    setProductStock(String(p.stock))
    setProductMinStock(String(p.minStock))
    setShowProductForm(true)
  }

  async function saveProduct() {
    if (!productName.trim() || saving) return

    const cost = Number(productCost)
    const price = Number(productPrice)
    const stock = Number(productStock)
    const minStock = Number(productMinStock)

    if (
      ![cost, price, stock, minStock].every(Number.isFinite) ||
      cost < 0 || price < 0 || stock < 0 || minStock < 0 ||
      !Number.isInteger(stock) || !Number.isInteger(minStock)
    ) {
      setError('مقادیر عددی محصول معتبر نیستند.')
      return
    }

    try {
      setSaving(true)
      setError('')

      if (editingProduct) {
        await updateProduct(
          editingProduct.id,
          productName,
          productCode,
          productCategory,
          cost,
          price,
          stock,
          minStock
        )
      } else {
        await addProduct(
          productName,
          productCode,
          productCategory,
          cost,
          price,
          stock,
          minStock
        )
      }

      await loadProducts()
      setShowProductForm(false)
      setEditingProduct(null)
    } catch (err) {
      console.error(err)
      setError('ذخیره محصول انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function removeProduct(p: Product) {
    if (!window.confirm(`محصول «${p.name}» حذف شود؟`)) return

    try {
      await deleteProduct(p.id)
      await loadProducts()
    } catch (err) {
      console.error(err)
      setError('حذف محصول انجام نشد.')
    }
  }

  function openNewOrderForm() {
    setOrderCustomer('')
    setCart([])
    setOrderDiscount('0')
    setOrderNotes('')
    setOrderSearch('')
    setError('')
    setShowOrderForm(true)
  }

  function changeCart(productId: number, amount: number) {
    setCart(current => {
      const existing = current.find(x => x.productId === productId)
      const product = products.find(x => x.id === productId)

      if (!product) return current

      const oldQuantity = existing?.quantity || 0
      const nextQuantity = oldQuantity + amount

      if (nextQuantity > product.stock) {
        setError(`موجودی ${product.name} کافی نیست.`)
        return current
      }

      setError('')

      if (nextQuantity <= 0) {
        return current.filter(x => x.productId !== productId)
      }

      if (existing) {
        return current.map(x =>
          x.productId === productId
            ? { ...x, quantity: nextQuantity }
            : x
        )
      }

      return [...current, { productId, quantity: nextQuantity }]
    })
  }

  async function saveOrder() {
    if (saving) return

    if (!orderCustomer) {
      setError('ابتدا مشتری سفارش را انتخاب کن.')
      return
    }

    if (!cart.length) {
      setError('حداقل یک محصول به سفارش اضافه کن.')
      return
    }

    if (!Number.isFinite(discountValue) || discountValue > cartTotal) {
      setError('مبلغ تخفیف معتبر نیست.')
      return
    }

    const customer = selectedCustomer

    const summary = cart.map(item => {
      const p = products.find(x => x.id === item.productId)
      return p ? `${p.name} × ${money(item.quantity)}` : ''
    }).filter(Boolean).join('\n')

    const confirmed = window.confirm(
      `پیش‌نمایش سفارش\n\n` +
      `مشتری: ${customer?.name || ''}\n\n` +
      `محصولات:\n${summary}\n\n` +
      `مبلغ کل: ${money(cartTotal)} تومان\n` +
      `تخفیف: ${money(discountValue)} تومان\n` +
      `مبلغ نهایی: ${money(finalTotal)} تومان\n\n` +
      `سفارش ثبت شود و موجودی انبار کسر شود؟`
    )

    if (!confirmed) return

    try {
      setSaving(true)
      setError('')

      await addOrder(
        Number(orderCustomer),
        cart,
        discountValue,
        orderNotes
      )

      await refreshAll()
      setShowOrderForm(false)
      setCart([])
      setTab('سفارش‌ها')
      setError('')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'ثبت سفارش انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(order: OrderRecord, status: string) {
    if (order.status === status) return

    if (status === 'لغو شده') {
      const ok = window.confirm(
        `وضعیت سفارش شماره ${money(order.id)} لغو شود؟\n` +
        `توجه: موجودی انبار به‌صورت خودکار برگردانده نمی‌شود.`
      )

      if (!ok) return
    }

    try {
      await updateOrderStatus(order.id, status)
      await loadOrders()
    } catch (err) {
      console.error(err)
      setError('تغییر وضعیت سفارش انجام نشد.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavigationDrawer
          activeTab={tab}
          onNavigate={setTab}
        />

        <div style={{ flex: 1 }}>
          <div className="eyebrow">مدیریت هوشمند ارتباط با مشتری</div>
          <h1>CRM شخصی</h1>
        </div>

        <button className="icon-btn" aria-label="اعلان‌ها">
          <Bell size={21} />
        </button>
      </header>

      {error && (
        <div className="empty" role="alert" style={{ color: '#a33c48' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginRight: 10 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {tab === 'خانه' && (
        <main>
          <section className="welcome">
            <div className="welcome-icon"><Sparkles /></div>
            <div>
              <div className="eyebrow light">داشبورد شما</div>
              <h2>سلام، خوش اومدی!</h2>
              <p>مدیریت مشتری‌ها، محصولات و سفارش‌ها.</p>
            </div>
          </section>

          <div className="section-title">
            <h3>نمای کلی</h3>
            <span>امروز</span>
          </div>

          <div className="stats">
            <article>
              <Users />
              <strong>{loading ? '...' : money(customers.length)}</strong>
              <small>مشتری ثبت‌شده</small>
            </article>
            <article>
              <ClipboardList />
              <strong>{loading ? '...' : money(orders.length)}</strong>
              <small>تعداد سفارش‌ها</small>
            </article>
            <article>
              <Wallet />
              <strong>
                {money(orders.filter(o => o.status !== 'لغو شده').reduce((s, o) => s + o.finalTotal, 0))}
              </strong>
              <small>مجموع سفارش‌ها (تومان)</small>
            </article>
            <article>
              <Package />
              <strong>{loading ? '...' : money(products.length)}</strong>
              <small>محصول ثبت‌شده</small>
            </article>
          </div>

          {lowStockCount > 0 && (
            <div className="empty" style={{ color: '#a36b20' }}>
              <AlertTriangle size={17} />
              {money(lowStockCount)} محصول نیاز به بررسی موجودی دارد.
            </div>
          )}

          <section className="assistant">
            <div className="assistant-head">
              <Sparkles /><b>دستیار CRM</b><span>نسخه اولیه</span>
            </div>
            <p>مشتری‌ها، محصولات و سفارش‌ها در دیتابیس برنامه ذخیره می‌شوند.</p>
            <button className="primary" onClick={openNewForm}>
              <Plus size={18} /> افزودن مشتری
            </button>
            <button className="primary" style={{ marginRight: 8 }} onClick={openNewOrderForm}>
              <ShoppingCart size={18} /> ثبت سفارش
            </button>
          </section>

          <section className="quick">
            <h3>دسترسی سریع</h3>
            <button onClick={() => setTab('مشتریان')}>
              <Users /> مشتریان <ChevronLeft />
            </button>
            <button onClick={() => setTab('محصولات')}>
              <Package /> محصولات و انبار <ChevronLeft />
            </button>
            <button onClick={() => setTab('سفارش‌ها')}>
              <ClipboardList /> سفارش‌ها <ChevronLeft />
            </button>
            <button onClick={() => setTab('پیگیری‌ها')}>
              <CalendarDays /> پیگیری مشتریان <ChevronLeft />
            </button>
            <button onClick={() => setTab('مشاوره‌ها')}>
              <MessageCircle /> مشاوره‌ها <ChevronLeft />
            </button>
          </section>
        </main>
      )}

      {tab === 'مشتریان' && (
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">ارتباط با مشتریان</div>
              <h2>مشتریان</h2>
            </div>
            <button className="primary compact" onClick={openNewForm}>
              <Plus size={17} /> جدید
            </button>
          </div>

          {loading ? (
            <p className="empty">در حال دریافت مشتری‌ها...</p>
          ) : (
            <CustomerManagement
              customers={customers}
              query={query}
              onQueryChange={setQuery}
              onEdit={openEditForm}
              onDelete={removeCustomer}
            />
          )}
        </main>
      )}

      {tab === 'محصولات' && (
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">کالا و موجودی انبار</div>
              <h2>محصولات</h2>
            </div>
            <button className="primary compact" onClick={openNewProductForm}>
              <Plus size={17} /> محصول جدید
            </button>
          </div>

          <div className="stats">
            <article>
              <Boxes />
              <strong>{money(products.length)}</strong>
              <small>تعداد محصولات</small>
            </article>
            <article>
              <AlertTriangle />
              <strong>{money(lowStockCount)}</strong>
              <small>موجودی کم</small>
            </article>
          </div>

          <label className="search">
            <Search size={18} />
            <input
              value={productQuery}
              onChange={e => setProductQuery(e.target.value)}
              placeholder="جستجوی نام، کد یا دسته‌بندی محصول"
            />
          </label>

          {loading && <p className="empty">در حال دریافت محصولات...</p>}

          {!loading && filteredProducts.map(p => {
            const low = p.stock <= p.minStock

            return (
              <article className="customer customer-expanded" key={p.id}>
                <div className="customer-main">
                  <div className="avatar"><Package size={19} /></div>
                  <div className="customer-info">
                    <b>{p.name}</b>
                    {p.code && <small>کد: {p.code}</small>}
                    {p.category && <small>دسته‌بندی: {p.category}</small>}
                    <small>قیمت فروش: {money(p.price)} تومان</small>
                    <small>قیمت خرید: {money(p.cost)} تومان</small>
                  </div>
                  <span style={low ? { color: '#a33c48', background: '#fff0f1' } : {}}>
                    {low ? 'موجودی کم' : 'موجود'}
                  </span>
                </div>
                <div className="customer-actions" style={{ justifyContent: 'space-between' }}>
                  <small style={{ color: low ? '#a33c48' : '#536b9a' }}>
                    موجودی: {money(p.stock)} عدد | حداقل: {money(p.minStock)}
                  </small>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEditProductForm(p)}>
                      <Pencil size={16} /> ویرایش
                    </button>
                    <button onClick={() => removeProduct(p)}>
                      <Trash2 size={16} /> حذف
                    </button>
                  </div>
                </div>
              </article>
            )
          })}

          {!loading && !filteredProducts.length && (
            <div className="empty-card">
              <Package />
              <b>محصولی پیدا نشد</b>
              <p>برای شروع، محصول جدید ثبت کن.</p>
            </div>
          )}
        </main>
      )}

      {tab === 'سفارش‌ها' && (
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">فروش و پیگیری</div>
              <h2>سفارش‌ها</h2>
            </div>
            <button className="primary compact" onClick={openNewOrderForm}>
              <Plus size={17} /> سفارش جدید
            </button>
          </div>

          <div className="stats">
            <article>
              <ClipboardList />
              <strong>{money(orders.length)}</strong>
              <small>کل سفارش‌ها</small>
            </article>
            <article>
              <Wallet />
              <strong>
                {money(orders.filter(o => o.status !== 'لغو شده').reduce((s, o) => s + o.finalTotal, 0))}
              </strong>
              <small>مجموع فروش (تومان)</small>
            </article>
          </div>

          {loading && <p className="empty">در حال دریافت سفارش‌ها...</p>}

          {!loading && orders.map(order => (
            <article className="customer customer-expanded" key={order.id}>
              <div className="customer-main">
                <div className="avatar"><ShoppingCart size={19} /></div>
                <div className="customer-info">
                  <b>سفارش شماره {money(order.id)}</b>
                  <small>مشتری: {order.customerName}</small>
                  <small>تاریخ ثبت: {order.createdAt}</small>
                  <small>تعداد اقلام: {money(order.items.reduce((s, i) => s + i.quantity, 0))}</small>
                  <small>مبلغ کل: {money(order.total)} تومان</small>
                  <small>تخفیف: {money(order.discount)} تومان</small>
                  <b style={{ color: '#315da8' }}>مبلغ نهایی: {money(order.finalTotal)} تومان</b>
                  {order.items.map(item => (
                    <small key={item.id}>
                      {item.productName} × {money(item.quantity)}
                    </small>
                  ))}
                  {order.notes && <small>یادداشت: {order.notes}</small>}
                </div>
              </div>
              <div className="customer-actions" style={{ flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  وضعیت سفارش:
                  <select
                    value={order.status}
                    onChange={e => changeStatus(order, e.target.value)}
                    style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc', maxWidth: 170 }}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </article>
          ))}

          {!loading && !orders.length && (
            <div className="empty-card">
              <ClipboardList />
              <b>هنوز سفارشی ثبت نشده</b>
              <p>برای شروع، سفارش جدید ثبت کن.</p>
              <button className="primary" onClick={openNewOrderForm}>
                <Plus size={17} /> ثبت اولین سفارش
              </button>
            </div>
          )}
        </main>
      )}

      {tab === 'پیگیری‌ها' && <FollowUps />}

      {tab === 'مشاوره‌ها' && <Consultations />}

      {tab === 'پرداخت‌ها' && <Payments />}

      {tab === 'پشتیبان‌گیری' && <Backup />}

      {showForm && (
        <div className="modal-backdrop" onClick={() => !saving && setShowForm(false)}>
          <section className="modal customer-form" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h3>{editing ? 'ویرایش اطلاعات مشتری' : 'مشتری جدید'}</h3>
              <button onClick={() => !saving && setShowForm(false)}><X /></button>
            </div>

            <label>
              نام و نام خانوادگی
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثلاً علی رضایی"
              />
            </label>

            <label>
              شماره موبایل
              <input
                inputMode="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="09xxxxxxxxx"
              />
            </label>

            <label>
              نام شرکت (اختیاری)
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="نام شرکت یا فروشگاه"
              />
            </label>

            <label>
              یادداشت مشتری (اختیاری)
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="نیازها و نکات مشاوره..."
              />
            </label>

            {detailsLoading && (
              <p className="empty">در حال دریافت اطلاعات تکمیلی مشتری...</p>
            )}

            <CustomerDetailsForm
              value={customerDetails}
              onChange={setCustomerDetails}
              disabled={saving || detailsLoading}
            />

            <button
              className="primary full"
              onClick={saveCustomer}
              disabled={!name.trim() || !mobile.trim() || saving || detailsLoading}
            >
              <Save size={17} />
              {saving
                ? 'در حال ذخیره...'
                : editing
                  ? 'ذخیره تغییرات'
                  : 'ثبت مشتری'}
            </button>
          </section>
        </div>
      )}

      {showProductForm && (
        <div className="modal-backdrop" onClick={() => !saving && setShowProductForm(false)}>
          <section className="modal customer-form" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h3>{editingProduct ? 'ویرایش محصول' : 'ثبت محصول جدید'}</h3>
              <button onClick={() => !saving && setShowProductForm(false)}><X /></button>
            </div>

            <label>
              نام محصول
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="مثلاً روغن رزماری"
              />
            </label>

            <label>
              کد محصول (اختیاری)
              <input
                value={productCode}
                onChange={e => setProductCode(e.target.value)}
                placeholder="کد کالا"
              />
            </label>

            <label>
              دسته‌بندی (اختیاری)
              <input
                value={productCategory}
                onChange={e => setProductCategory(e.target.value)}
                placeholder="مثلاً مراقبت مو"
              />
            </label>

            <label>
              قیمت خرید (تومان)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={productCost}
                onChange={e => setProductCost(e.target.value)}
              />
            </label>

            <label>
              قیمت فروش (تومان)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={productPrice}
                onChange={e => setProductPrice(e.target.value)}
              />
            </label>

            <label>
              موجودی فعلی (عدد)
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={productStock}
                onChange={e => setProductStock(e.target.value)}
              />
            </label>

            <label>
              هشدار وقتی موجودی به این عدد رسید
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={productMinStock}
                onChange={e => setProductMinStock(e.target.value)}
              />
            </label>

            <button
              className="primary full"
              onClick={saveProduct}
              disabled={!productName.trim() || saving}
            >
              <Save size={17} />
              {saving ? 'در حال ذخیره...' : editingProduct ? 'ذخیره تغییرات' : 'ثبت محصول'}
            </button>
          </section>
        </div>
      )}

      {showOrderForm && (
        <div className="modal-backdrop" onClick={() => !saving && setShowOrderForm(false)}>
          <section className="modal customer-form" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h3>ثبت سفارش جدید</h3>
              <button onClick={() => !saving && setShowOrderForm(false)}><X /></button>
            </div>

            <label>
              انتخاب مشتری
              <select
                value={orderCustomer}
                onChange={e => setOrderCustomer(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #ccc' }}
              >
                <option value="">انتخاب مشتری...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>
                ))}
              </select>
            </label>

            <div className="section-title">
              <h3>انتخاب محصولات</h3>
              <span>{money(cart.length)} قلم</span>
            </div>

            <label className="search">
              <Search size={18} />
              <input
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="جستجوی محصول..."
              />
            </label>

            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {products.filter(p =>
                (p.name + p.code).toLowerCase().includes(orderSearch.toLowerCase())
              ).map(p => {
                const item = cart.find(x => x.productId === p.id)
                const quantity = item?.quantity || 0

                return (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: 10,
                    marginBottom: 8,
                    border: '1px solid #e0e4ed',
                    borderRadius: 10
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <b>{p.name}</b>
                      <small style={{ display: 'block', color: '#667085' }}>
                        {money(p.price)} تومان | موجودی: {money(p.stock)}
                      </small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => changeCart(p.id, -1)}
                        disabled={quantity === 0}
                        style={{ padding: 6 }}
                      >
                        <Minus size={17} />
                      </button>
                      <b>{money(quantity)}</b>
                      <button
                        onClick={() => changeCart(p.id, 1)}
                        disabled={quantity >= p.stock || p.stock <= 0}
                        style={{ padding: 6 }}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: 12, background: '#f4f6fb', borderRadius: 12, marginTop: 12 }}>
                <b>اقلام انتخاب‌شده</b>
                {cart.map(item => {
                  const p = products.find(x => x.id === item.productId)
                  if (!p) return null

                  return (
                    <div key={item.productId} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 8
                    }}>
                      <small>{p.name} × {money(item.quantity)}</small>
                      <small>{money(p.price * item.quantity)} تومان</small>
                    </div>
                  )
                })}
              </div>
            )}

            <label>
              تخفیف (تومان)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={orderDiscount}
                onChange={e => setOrderDiscount(e.target.value)}
              />
            </label>

            <label>
              توضیحات سفارش (اختیاری)
              <textarea
                rows={2}
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="توضیحات..."
              />
            </label>

            <div style={{
              padding: 14,
              background: '#f4f6fb',
              borderRadius: 12,
              display: 'grid',
              gap: 8,
              marginTop: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>مبلغ کل</span><b>{money(cartTotal)} تومان</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>تخفیف</span><b>{money(discountValue)} تومان</b>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #d8deeb',
                paddingTop: 10
              }}>
                <b>مبلغ نهایی</b>
                <b style={{ color: '#315da8' }}>{money(finalTotal)} تومان</b>
              </div>
            </div>

            <button
              className="primary full"
              onClick={saveOrder}
              disabled={!orderCustomer || !cart.length || saving || discountValue > cartTotal}
              style={{ marginTop: 14 }}
            >
              <CheckCircle size={18} />
              {saving ? 'در حال ثبت سفارش...' : 'تأیید و ثبت سفارش'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
