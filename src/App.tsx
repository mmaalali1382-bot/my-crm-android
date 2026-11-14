import { useEffect, useMemo, useState } from 'react'
import {
  Users, Package, ClipboardList, Wallet, Plus, Search, Sparkles,
  Bell, ChevronLeft, Pencil, Trash2, X, Save, FileText, Building2
} from 'lucide-react'
import {
  initializeDatabase, getCustomers, addCustomer as addCustomerToDb,
  updateCustomer, deleteCustomer
} from './db/database'

type Customer = {
  id: number
  name: string
  mobile: string
  company: string
  stage: string
  notes: string
}

const money = (n: number) => new Intl.NumberFormat('fa-IR').format(n)

export default function App() {
  const [tab, setTab] = useState('خانه')
  const [customers, setCustomers] = useState<Customer[]>([])
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

  useEffect(() => {
    async function start() {
      try {
        await initializeDatabase()
        await loadCustomers()
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
          await updateCustomer(
            created.id, created.name, created.phone, company, notes
          )
        }
      }

      await loadCustomers()
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      setError('ذخیره اطلاعات انجام نشد. دوباره تلاش کن.')
    } finally {
      setSaving(false)
    }
  }

  async function removeCustomer(c: Customer) {
    const confirmed = window.confirm(
      `مشتری «${c.name}» حذف شود؟ این کار قابل بازگشت نیست.`
    )

    if (!confirmed) return

    try {
      await deleteCustomer(c.id)
      await loadCustomers()
    } catch (err) {
      console.error(err)
      setError('حذف مشتری انجام نشد.')
    }
  }

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
              <p>همه چیز برای مدیریت مشتری‌ها آماده است.</p>
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
            <article><Package/><strong>۰</strong><small>محصول</small></article>
          </div>

          <section className="assistant">
            <div className="assistant-head">
              <Sparkles/><b>دستیار CRM</b><span>نسخه اولیه</span>
            </div>
            <p>اطلاعات مشتری‌ها در دیتابیس برنامه ذخیره می‌شن.</p>
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
              <Package/> محصولات <ChevronLeft/>
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
          <div className="eyebrow">کالا و موجودی</div>
          <h2>محصولات</h2>
          <div className="empty-card">
            <Package/>
            <b>هنوز محصولی ثبت نشده</b>
            <p>بخش ثبت محصولات در مرحله بعدی تکمیل می‌شود.</p>
          </div>
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
              <button onClick={() => !saving && setShowForm(false)}>
                <X/>
              </button>
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
    </div>
  )
}
