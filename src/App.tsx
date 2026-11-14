
import { useEffect, useMemo, useState } from 'react'
import {
  Users, Package, ClipboardList, Wallet, Plus, Search, Sparkles,
  Bell, ChevronLeft, Pencil, Trash2, X, Save, FileText, Building2,
  AlertTriangle, Boxes
} from 'lucide-react'
import {
  initializeDatabase, getCustomers, addCustomer as addCustomerToDb,
  updateCustomer, deleteCustomer, getProducts, addProduct,
  updateProduct, deleteProduct
} from './db/database'

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

const money = (n: number) => new Intl.NumberFormat('fa-IR').format(n)

export default function App() {
  const [tab, setTab] = useState('خانه')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productCost, setProductCost] = useState('0')
  const [productPrice, setProductPrice] = useState('0')
  const [productStock, setProductStock] = useState('0')
  const [productMinStock, setProductMinStock] = useState('0')
  const [productQuery, setProductQuery] = useState('')

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

  useEffect(() => {
    async function start() {
      try {
        await initializeDatabase()
        await loadCustomers()
        await loadProducts()
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

  function openNewForm() {
    setEditing(null)
    setName('')
    setMobile('')
    setCompany('')
    setNotes('')
    setShowForm(true)
  }

  function openEditForm(c: Customer) {
    setEditing(c)
    setName(c.name)
    setMobile(c.mobile)
    setCompany(c.company)
    setNotes(c.notes)
    setShowForm(true)
  }

  async function saveCustomer() {
    if (!name.trim() || !mobile.trim() || saving) return
    try {
      setSaving(true)
      setError('')
      if (editing) {
        await updateCustomer(editing.id, name, mobile, company, notes)
      } else {
        await addCustomerToDb(name, mobile)
        const updated = await getCustomers()
        const created = updated[0]
        if (created && (company.trim() || notes.trim())) {
          await updateCustomer(created.id, created.name, created.phone, company, notes)
        }
      }
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

    if (![cost, price, stock, minStock].every(Number.isFinite) ||
        cost < 0 || price < 0 || stock < 0 || minStock < 0) {
      setError('مقادیر عددی محصول معتبر نیستند.')
      return
    }

    try {
      setSaving(true)
      setError('')
      if (editingProduct) {
        await updateProduct(
          editingProduct.id, productName, productCode, productCategory,
          cost, price, stock, minStock
        )
      } else {
        await addProduct(
          productName, productCode, productCategory,
          cost, price, stock, minStock
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
    if (!window.confirm(`محصول «${p.name}» حذف شود؟ این کار قابل بازگشت نیست.`)) return
    try {
      await deleteProduct(p.id)
      await loadProducts()
    } catch (err) {
      console.error(err)
      setError('حذف محصول انجام نشد.')
    }
  }

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">مدیریت هوشمند ارتباط با مشتری</div>
          <h1>CRM شخصی</h1>
        </div>
        <button className="icon-btn" aria-label="اعلان‌ها">
          <Bell size={21}/>
        </button>
      </header>

      {error && <div className="empty" role="alert">{error}</div>}

      {tab === 'خانه' && (
        <main>
          <section className="welcome">
            <div className="welcome-icon"><Sparkles/></div>
            <div>
              <div className="eyebrow light">داشبورد شما</div>
              <h2>سلام، خوش اومدی!</h2>
              <p>مدیریت مشتری‌ها و محصولات در یک جا.</p>
            </div>
          </section>

          <div className="section-title">
            <h3>نمای کلی</h3>
            <span>امروز</span>
          </div>

          <div className="stats">
            <article>
              <Users/>
              <strong>{loading ? '...' : money(customers.length)}</strong>
              <small>مشتری ثبت‌شده</small>
            </article>
            <article><ClipboardList/><strong>۰</strong><small>پیگیری باز</small></article>
            <article><Wallet/><strong>۰</strong><small>فروش امروز (تومان)</small></article>
            <article>
              <Package/>
              <strong>{loading ? '...' : money(products.length)}</strong>
              <small>محصول ثبت‌شده</small>
            </article>
          </div>

          {lowStockCount > 0 && (
            <div className="empty" style={{color: '#a36b20'}}>
              <AlertTriangle size={17}/>
              {money(lowStockCount)} محصول نیاز به بررسی موجودی دارد.
            </div>
          )}

          <section className="assistant">
            <div className="assistant-head">
              <Sparkles/><b>دستیار CRM</b><span>نسخه اولیه</span>
            </div>
            <p>اطلاعات مشتری‌ها و محصولات در دیتابیس برنامه ذخیره می‌شوند.</p>
            <button className="primary" onClick={openNewForm}>
              <Plus size={18}/> افزودن مشتری
            </button>
          </section>

          <section className="quick">
            <h3>دسترسی سریع</h3>
            <button onClick={() => setTab('مشتریان')}>
              <Users/> مشتریان <ChevronLeft/>
            </button>
            <button onClick={() => setTab('محصولات')}>
              <Package/> محصولات و انبار <ChevronLeft/>
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
              <Plus size={17}/> جدید
            </button>
          </div>

          <label className="search">
            <Search size={18}/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="جستجوی نام، موبایل یا شرکت"
            />
          </label>

          {loading && <p className="empty">در حال دریافت مشتری‌ها...</p>}

          {!loading && filtered.map(c => (
            <article className="customer customer-expanded" key={c.id}>
              <button className="customer-main" onClick={() => openEditForm(c)}>
                <div className="avatar">{c.name.slice(0, 1)}</div>
                <div className="customer-info">
                  <b>{c.name}</b>
                  <small>{c.mobile}</small>
                  {c.company && <small><Building2 size={12}/> {c.company}</small>}
                  {c.notes && <small className="note-preview"><FileText size={12}/> {c.notes}</small>}
                </div>
                <span>{c.stage}</span>
              </button>
              <div className="customer-actions">
                <button onClick={() => openEditForm(c)}>
                  <Pencil size={16}/> ویرایش
                </button>
                <button onClick={() => removeCustomer(c)}>
                  <Trash2 size={16}/> حذف
                </button>
              </div>
            </article>
          ))}

          {!loading && !filtered.length && (
            <p className="empty">مشتری‌ای پیدا نشد.</p>
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
              <Plus size={17}/> محصول جدید
            </button>
          </div>

          <div className="stats">
            <article>
              <Boxes/>
              <strong>{money(products.length)}</strong>
              <small>تعداد محصولات</small>
            </article>
            <article>
              <AlertTriangle/>
              <strong>{money(lowStockCount)}</strong>
              <small>موجودی کم</small>
            </article>
          </div>

          <label className="search">
            <Search size={18}/>
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
                  <div className="avatar"><Package size={19}/></div>
                  <div className="customer-info">
                    <b>{p.name}</b>
                    {p.code && <small>کد: {p.code}</small>}
                    {p.category && <small>دسته‌بندی: {p.category}</small>}
                    <small>قیمت فروش: {money(p.price)} تومان</small>
                    <small>قیمت خرید: {money(p.cost)} تومان</small>
                  </div>
                  <span style={low ? {color:'#a33c48',background:'#fff0f1'} : {}}>
                    {low ? 'موجودی کم' : 'موجود'}
                  </span>
                </div>

                <div className="customer-actions" style={{justifyContent:'space-between'}}>
                  <small style={{color: low ? '#a33c48' : '#536b9a'}}>
                    موجودی: {money(p.stock)} عدد | حداقل: {money(p.minStock)}
                  </small>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={() => openEditProductForm(p)}>
                      <Pencil size={16}/> ویرایش
                    </button>
                    <button onClick={() => removeProduct(p)}>
                      <Trash2 size={16}/> حذف
                    </button>
                  </div>
                </div>
              </article>
            )
          })}

          {!loading && !filteredProducts.length && (
            <div className="empty-card">
              <Package/>
              <b>محصولی پیدا نشد</b>
              <p>برای شروع، محصول جدید ثبت کن.</p>
            </div>
          )}
        </main>
      )}

      {tab === 'سفارش‌ها' && (
        <main>
          <div className="eyebrow">فروش و پیگیری</div>
          <h2>سفارش‌ها</h2>
          <div className="empty-card">
            <ClipboardList/>
            <b>هنوز سفارشی ثبت نشده</b>
            <p>ثبت سفارش و پرداخت در مراحل بعدی اضافه می‌شود.</p>
          </div>
        </main>
      )}

      <nav className="bottom-nav">
        {([
          ['خانه', Sparkles],
          ['مشتریان', Users],
          ['محصولات', Package],
          ['سفارش‌ها', ClipboardList]
        ] as const).map(([label, Icon]) => (
          <button
            key={label}
            className={tab === label ? 'active' : ''}
            onClick={() => setTab(label)}
          >
            <Icon size={20}/>
            <small>{label}</small>
          </button>
        ))}
      </nav>

      {showForm && (
        <div className="modal-backdrop" onClick={() => !saving && setShowForm(false)}>
          <section className="modal customer-form" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h3>{editing ? 'ویرایش اطلاعات مشتری' : 'مشتری جدید'}</h3>
              <button onClick={() => !saving && setShowForm(false)}><X/></button>
            </div>

            <label>
              نام و نام خانوادگی
              <input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً علی رضایی"/>
            </label>
            <label>
              شماره موبایل
              <input inputMode="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="09xxxxxxxxx"/>
            </label>
            <label>
              نام شرکت (اختیاری)
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="نام شرکت یا فروشگاه"/>
            </label>
            <label>
              یادداشت مشتری (اختیاری)
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="نیازها و نکات مشاوره..."/>
            </label>
            <button className="primary full" onClick={saveCustomer} disabled={!name.trim() || !mobile.trim() || saving}>
              <Save size={17}/>
              {saving ? 'در حال ذخیره...' : editing ? 'ذخیره تغییرات' : 'ثبت مشتری'}
            </button>
          </section>
        </div>
      )}

      {showProductForm && (
        <div className="modal-backdrop" onClick={() => !saving && setShowProductForm(false)}>
          <section className="modal customer-form" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <h3>{editingProduct ? 'ویرایش محصول' : 'ثبت محصول جدید'}</h3>
              <button onClick={() => !saving && setShowProductForm(false)}><X/></button>
            </div>

            <label>
              نام محصول
              <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="مثلاً روغن رزماری"/>
            </label>
            <label>
              کد محصول (اختیاری)
              <input value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="کد کالا"/>
            </label>
            <label>
              دسته‌بندی (اختیاری)
              <input value={productCategory} onChange={e => setProductCategory(e.target.value)} placeholder="مثلاً مراقبت مو"/>
            </label>
            <label>
              قیمت خرید (تومان)
              <input type="number" min="0" inputMode="numeric" value={productCost} onChange={e => setProductCost(e.target.value)}/>
            </label>
            <label>
              قیمت فروش (تومان)
              <input type="number" min="0" inputMode="numeric" value={productPrice} onChange={e => setProductPrice(e.target.value)}/>
            </label>
            <label>
              موجودی فعلی (عدد)
              <input type="number" min="0" step="1" inputMode="numeric" value={productStock} onChange={e => setProductStock(e.target.value)}/>
            </label>
            <label>
              هشدار وقتی موجودی به این عدد رسید
              <input type="number" min="0" step="1" inputMode="numeric" value={productMinStock} onChange={e => setProductMinStock(e.target.value)}/>
            </label>

            <button className="primary full" onClick={saveProduct} disabled={!productName.trim() || saving}>
              <Save size={17}/>
              {saving ? 'در حال ذخیره...' : editingProduct ? 'ذخیره تغییرات' : 'ثبت محصول'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
