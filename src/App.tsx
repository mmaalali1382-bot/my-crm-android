
import { useEffect, useMemo, useState } from 'react'
import {
  Users, Package, ClipboardList, Wallet,
  Plus, Search, Sparkles, Bell, ChevronLeft
} from 'lucide-react'
import {
  initializeDatabase,
  getCustomers,
  addCustomer as addCustomerToDb
} from './db/database'

type Customer = {
  id: number
  name: string
  mobile: string
  stage: string
}

const money = (n: number) =>
  new Intl.NumberFormat('fa-IR').format(n)

export default function App() {
  const [tab, setTab] = useState('خانه')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadCustomers() {
    const records = await getCustomers()
    setCustomers(records.map(c => ({
      id: c.id,
      name: c.name,
      mobile: c.phone,
      stage: c.stage
    })))
  }

  useEffect(() => {
    async function start() {
      try {
        await initializeDatabase()
        await loadCustomers()
        setError('')
      } catch (err) {
        console.error(err)
        setError('اتصال به دیتابیس انجام نشد. لطفاً نسخه جدید برنامه را بررسی کن.')
      } finally {
        setLoading(false)
      }
    }

    start()
  }, [])

  const filtered = useMemo(
    () => customers.filter(c =>
      (c.name + c.mobile).includes(query)
    ),
    [customers, query]
  )

  async function addCustomer() {
    if (!name.trim() || !mobile.trim() || saving) return

    try {
      setSaving(true)
      setError('')

      await addCustomerToDb(name, mobile)
      await loadCustomers()

      setName('')
      setMobile('')
      setShowAdd(false)
      setTab('مشتریان')
    } catch (err) {
      console.error(err)
      setError('ثبت مشتری انجام نشد. دوباره تلاش کن.')
    } finally {
      setSaving(false)
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

      {error && (
        <div className="empty" role="alert">{error}</div>
      )}

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
            <article>
              <ClipboardList/>
              <strong>۰</strong>
              <small>پیگیری باز</small>
            </article>
            <article>
              <Wallet/>
              <strong>۰</strong>
              <small>فروش امروز (تومان)</small>
            </article>
            <article>
              <Package/>
              <strong>۰</strong>
              <small>محصول</small>
            </article>
          </div>

          <section className="assistant">
            <div className="assistant-head">
              <Sparkles/>
              <b>دستیار CRM</b>
              <span>نسخه اولیه</span>
            </div>
            <p>
              مشتری‌ها در دیتابیس برنامه ذخیره می‌شن.
              قابلیت‌های صوتی و هوشمند در مراحل بعدی تکمیل می‌شن.
            </p>
            <button className="primary" onClick={() => setShowAdd(true)}>
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
            <button
              className="primary compact"
              onClick={() => setShowAdd(true)}
            >
              <Plus size={17}/> جدید
            </button>
          </div>

          <label className="search">
            <Search size={18}/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="جستجوی نام یا شماره موبایل"
            />
          </label>

          {loading && <p className="empty">در حال دریافت مشتری‌ها...</p>}

          {!loading && filtered.map(c => (
            <article className="customer" key={c.id}>
              <div className="avatar">{c.name.slice(0, 1)}</div>
              <div>
                <b>{c.name}</b>
                <small>{c.mobile}</small>
              </div>
              <span>{c.stage}</span>
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
        {[
          ['خانه', Sparkles],
          ['مشتریان', Users],
          ['محصولات', Package],
          ['سفارش‌ها', ClipboardList]
        ].map(([label, Icon]: any) => (
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

      {showAdd && (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setShowAdd(false)}
        >
          <section
            className="modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">
              <h3>مشتری جدید</h3>
              <button onClick={() => !saving && setShowAdd(false)}>✕</button>
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

            <button
              className="primary full"
              onClick={addCustomer}
              disabled={!name.trim() || !mobile.trim() || saving}
            >
              {saving ? 'در حال ثبت...' : 'ثبت مشتری'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
