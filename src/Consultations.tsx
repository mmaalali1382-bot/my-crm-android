
import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Copy, Pencil, Trash2, X, Save,
  MessageCircle, Phone, CalendarDays
} from 'lucide-react'
import {
  addConsultation,
  updateConsultation,
  deleteConsultation,
  getConsultations,
  type ConsultationRecord,
  type ConsultationResult
} from './db/salesExtensions'

const money = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value)

const emptyForm = {
  name: '',
  phone: '',
  topic: '',
  notes: '',
  result: 'pending' as ConsultationResult,
  purchaseAmount: 0,
  followUpDate: ''
}

export default function Consultations() {
  const [items, setItems] = useState<ConsultationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ConsultationRecord | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  async function loadData() {
    try {
      setLoading(true)
      const records = await getConsultations()
      setItems(records)
      setError('')
    } catch (err) {
      console.error(err)
      setError('دریافت اطلاعات مشاوره‌ها انجام نشد.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesQuery =
        `${item.name} ${item.phone} ${item.topic}`
          .toLowerCase()
          .includes(query.toLowerCase())

      const matchesFilter =
        filter === 'all' || item.result === filter

      return matchesQuery && matchesFilter
    })
  }, [items, query, filter])

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm })
    setError('')
    setShowForm(true)
  }

  function openEdit(item: ConsultationRecord) {
    setEditing(item)
    setForm({
      name: item.name,
      phone: item.phone,
      topic: item.topic,
      notes: item.notes,
      result: item.result,
      purchaseAmount: item.purchaseAmount,
      followUpDate: item.followUpDate
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    if (!form.phone.trim() || saving) return

    try {
      setSaving(true)
      setError('')

      if (editing) {
        await updateConsultation(editing.id, form)
      } else {
        await addConsultation(form)
      }

      setShowForm(false)
      setEditing(null)
      setForm({ ...emptyForm })
      await loadData()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'ذخیره مشاوره انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(item: ConsultationRecord) {
    const confirmed = window.confirm(
      `مشاوره مربوط به شماره ${item.phone} حذف شود؟`
    )

    if (!confirmed) return

    try {
      await deleteConsultation(item.id)
      await loadData()
    } catch (err) {
      console.error(err)
      setError('حذف مشاوره انجام نشد.')
    }
  }

  async function copyNumbers() {
    const numbers = filtered
      .map(item => item.phone.trim())
      .filter(Boolean)

    if (!numbers.length) {
      setError('شماره‌ای برای کپی وجود ندارد.')
      return
    }

    const text = [...new Set(numbers)].join('\n')

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(area)

        if (!copied) throw new Error('copy failed')
      }

      setError(`تعداد ${numbers.length} شماره کپی شد.`)
    } catch (err) {
      console.error(err)
      setError('کپی شماره‌ها انجام نشد. دوباره تلاش کن.')
    }
  }

  function resultLabel(result: ConsultationResult) {
    if (result === 'purchased') return 'خرید کرده'
    if (result === 'not_purchased') return 'خرید نکرده'
    return 'در انتظار تصمیم'
  }

  function resultClass(result: ConsultationResult) {
    if (result === 'purchased') return 'consultation-result purchased'
    if (result === 'not_purchased') return 'consultation-result not-purchased'
    return 'consultation-result pending'
  }

  return (
    <main className="consultations-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ثبت و مدیریت تماس‌های مشاوره</div>
          <h2>مشاوره‌ها</h2>
        </div>

        <button className="primary compact" onClick={openNew}>
          <Plus size={17} /> مشاوره جدید
        </button>
      </div>

      <div className="stats">
        <article>
          <MessageCircle />
          <strong>{money(items.length)}</strong>
          <small>کل مشاوره‌ها</small>
        </article>
        <article>
          <Phone />
          <strong>
            {money(items.filter(x => x.result === 'purchased').length)}
          </strong>
          <small>منجر به خرید</small>
        </article>
        <article>
          <CalendarDays />
          <strong>
            {money(items.filter(x => x.result === 'pending').length)}
          </strong>
          <small>در انتظار تصمیم</small>
        </article>
      </div>

      <button
        className="secondary full consultation-copy"
        onClick={copyNumbers}
        disabled={!filtered.length}
      >
        <Copy size={17} />
        کپی همه شماره‌ها
        {filter !== 'all' ? 'ی این فیلتر' : ''}
      </button>

      <label className="search">
        <Search size={18} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="جستجوی نام، شماره یا موضوع مشاوره..."
        />
      </label>

      <div className="consultation-filters">
        {[
          { value: 'all', label: 'همه' },
          { value: 'pending', label: 'در انتظار' },
          { value: 'purchased', label: 'خرید کرده' },
          { value: 'not_purchased', label: 'خرید نکرده' }
        ].map(option => (
          <button
            key={option.value}
            className={filter === option.value ? 'active' : ''}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="consultation-message">{error}</p>
      )}

      {loading && <p className="empty">در حال دریافت مشاوره‌ها...</p>}

      {!loading && filtered.map(item => (
        <article className="customer customer-expanded" key={item.id}>
          <div className="customer-main">
            <div className="avatar">
              <Phone size={19} />
            </div>

            <div className="customer-info">
              <b>{item.name || 'بدون نام'}</b>
              <a href={`tel:${item.phone}`} dir="ltr">
                {item.phone}
              </a>
              {item.topic && <small>موضوع: {item.topic}</small>}
              {item.notes && <small>نتیجه مشاوره: {item.notes}</small>}
              <span className={resultClass(item.result)}>
                {resultLabel(item.result)}
              </span>
              {item.purchaseAmount > 0 && (
                <small>
                  مبلغ خرید: {money(item.purchaseAmount)} تومان
                </small>
              )}
              {item.followUpDate && (
                <small>پیگیری بعدی: {item.followUpDate}</small>
              )}
            </div>
          </div>

          <div className="customer-actions">
            <button onClick={() => openEdit(item)}>
              <Pencil size={16} /> ویرایش
            </button>
            <button onClick={() => remove(item)}>
              <Trash2 size={16} /> حذف
            </button>
          </div>
        </article>
      ))}

      {!loading && !filtered.length && (
        <div className="empty-card">
          <MessageCircle />
          <b>مشاوره‌ای پیدا نشد</b>
          <p>شماره‌های جدیدی که از مشتری‌ها به دست می‌آوری اینجا ثبت کن.</p>
          <button className="primary" onClick={openNew}>
            <Plus size={17} /> ثبت اولین مشاوره
          </button>
        </div>
      )}

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setShowForm(false)}
        >
          <section
            className="modal customer-form"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">
              <h3>{editing ? 'ویرایش مشاوره' : 'ثبت مشاوره جدید'}</h3>
              <button onClick={() => !saving && setShowForm(false)}>
                <X />
              </button>
            </div>

            <label>
              نام مشتری (اختیاری)
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="نام مشتری"
              />
            </label>

            <label>
              شماره موبایل
              <input
                inputMode="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="09xxxxxxxxx"
              />
            </label>

            <label>
              موضوع مشاوره
              <input
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                placeholder="مثلاً معرفی محصولات مراقبت پوست"
              />
            </label>

            <label>
              توضیحات و نتیجه صحبت
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="چه مشاوره‌ای داده شد و نتیجه چه بود؟"
              />
            </label>

            <label>
              نتیجه مشاوره
              <select
                value={form.result}
                onChange={e => setForm({
                  ...form,
                  result: e.target.value as ConsultationResult
                })}
              >
                <option value="pending">هنوز تصمیم نگرفته</option>
                <option value="purchased">خرید کرده</option>
                <option value="not_purchased">خرید نکرده</option>
              </select>
            </label>

            {form.result === 'purchased' && (
              <label>
                مبلغ خرید (تومان)
                <input
                  type="number"
                  min="0"
                  value={form.purchaseAmount}
                  onChange={e => setForm({
                    ...form,
                    purchaseAmount: Math.max(0, Number(e.target.value) || 0)
                  })}
                />
              </label>
            )}

            <label>
              تاریخ پیگیری بعدی (اختیاری)
              <input
                type="date"
                value={form.followUpDate}
                onChange={e => setForm({
                  ...form,
                  followUpDate: e.target.value
                })}
              />
            </label>

            {error && <p className="consultation-message">{error}</p>}

            <button
              className="primary full"
              onClick={save}
              disabled={!form.phone.trim() || saving}
            >
              <Save size={17} />
              {saving ? 'در حال ذخیره...' : 'ذخیره مشاوره'}
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
