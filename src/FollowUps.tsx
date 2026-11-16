
import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react'
import { initializeDatabase, getCustomers } from './db/database'
import type { CustomerRecord } from './db/database'

type FollowUpRecord = {
  id: number
  customerId: number
  customerName: string
  topic: string
  dueDate: string
  status: string
}

const today = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const faNumber = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value)

export default function FollowUps() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [items, setItems] = useState<FollowUpRecord[]>([])
  const [customerId, setCustomerId] = useState('')
  const [topic, setTopic] = useState('')
  const [dueDate, setDueDate] = useState(today())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    try {
      const db = await initializeDatabase()

      await db.execute(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          topic TEXT NOT NULL,
          due_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
      `)

      const [customerList, result] = await Promise.all([
        getCustomers(),
        db.query(`
          SELECT
            f.id,
            f.customer_id AS customerId,
            c.name AS customerName,
            f.topic,
            f.due_date AS dueDate,
            f.status
          FROM follow_ups f
          LEFT JOIN customers c ON c.id = f.customer_id
          ORDER BY
            CASE WHEN f.status = 'pending' THEN 0 ELSE 1 END,
            f.due_date ASC,
            f.id DESC
        `)
      ])

      setCustomers(customerList)
      setItems((result.values || []) as FollowUpRecord[])
    } catch (e) {
      console.error(e)
      setError('دریافت اطلاعات پیگیری‌ها انجام نشد.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function addFollowUp() {
    if (!customerId || !topic.trim() || !dueDate || saving) {
      setError('مشتری، موضوع و تاریخ پیگیری را کامل کن.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const db = await initializeDatabase()

      await db.run(
        `INSERT INTO follow_ups (customer_id, topic, due_date)
         VALUES (?, ?, ?)`,
        [Number(customerId), topic.trim(), dueDate]
      )

      setCustomerId('')
      setTopic('')
      setDueDate(today())
      await loadData()
    } catch (e) {
      console.error(e)
      setError('ثبت پیگیری انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function markDone(id: number) {
    try {
      const db = await initializeDatabase()
      await db.run(
        `UPDATE follow_ups SET status = 'done' WHERE id = ?`,
        [id]
      )
      await loadData()
    } catch (e) {
      console.error(e)
      setError('تغییر وضعیت پیگیری انجام نشد.')
    }
  }

  async function removeFollowUp(id: number) {
    if (!window.confirm('این پیگیری حذف شود؟')) return

    try {
      const db = await initializeDatabase()
      await db.run('DELETE FROM follow_ups WHERE id = ?', [id])
      await loadData()
    } catch (e) {
      console.error(e)
      setError('حذف پیگیری انجام نشد.')
    }
  }

  const pending = items.filter(item => item.status === 'pending')
  const completed = items.filter(item => item.status === 'done')
  const overdue = pending.filter(item => item.dueDate < today())
  const dueToday = pending.filter(item => item.dueDate === today())

  function dateLabel(date: string) {
    if (date < today()) return 'عقب‌افتاده'
    if (date === today()) return 'امروز'
    return new Date(`${date}T12:00:00`).toLocaleDateString('fa-IR')
  }

  return (
    <main style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          مدیریت ارتباط با مشتریان
        </div>
        <h2 style={{ margin: '5px 0' }}>پیگیری مشتری‌ها</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          هیچ فرصت فروشی را فراموش نکن.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 8,
        marginBottom: 20
      }}>
        {[
          { label: 'عقب‌افتاده', value: overdue.length, color: '#b42318' },
          { label: 'امروز', value: dueToday.length, color: '#b7791f' },
          { label: 'انجام‌شده', value: completed.length, color: '#16804a' }
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#fff',
            border: '1px solid #e5eaf2',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center'
          }}>
            <strong style={{ display: 'block', fontSize: 22, color: stat.color }}>
              {faNumber(stat.value)}
            </strong>
            <small style={{ color: '#64748b' }}>{stat.label}</small>
          </div>
        ))}
      </div>

      <section style={{
        background: '#fff',
        border: '1px solid #e5eaf2',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20
      }}>
        <h3 style={{ marginTop: 0 }}>ثبت پیگیری جدید</h3>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 6 }}>انتخاب مشتری</span>
          <select
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            style={{
              width: '100%', padding: 12, borderRadius: 9,
              border: '1px solid #d5dce8', background: '#fff'
            }}
          >
            <option value="">انتخاب مشتری...</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name} - {customer.phone}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ display: 'block', marginBottom: 6 }}>موضوع پیگیری</span>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="مثلاً تماس برای نهایی کردن خرید"
            style={{
              width: '100%', padding: 12, borderRadius: 9,
              border: '1px solid #d5dce8', boxSizing: 'border-box'
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ display: 'block', marginBottom: 6 }}>تاریخ پیگیری</span>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{
              width: '100%', padding: 12, borderRadius: 9,
              border: '1px solid #d5dce8', boxSizing: 'border-box'
            }}
          />
        </label>

        <button
          onClick={addFollowUp}
          disabled={saving || !customers.length}
          style={{
            width: '100%', padding: 13, border: 0, borderRadius: 10,
            background: '#17345f', color: '#fff', fontWeight: 600
          }}
        >
          <Plus size={17} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
          {saving ? 'در حال ثبت...' : 'ثبت پیگیری'}
        </button>
      </section>

      {error && (
        <p style={{ color: '#b42318', fontSize: 13 }}>{error}</p>
      )}

      {loading ? (
        <p>در حال دریافت اطلاعات...</p>
      ) : (
        <>
          <h3>پیگیری‌های باز ({faNumber(pending.length)})</h3>

          {!pending.length && (
            <p style={{ color: '#64748b', fontSize: 13 }}>
              پیگیری بازی وجود ندارد.
            </p>
          )}

          {pending.map(item => (
            <article key={item.id} style={{
              background: '#fff',
              border: '1px solid #e5eaf2',
              borderRadius: 12,
              padding: 13,
              marginBottom: 10
            }}>
              <strong>{item.customerName || 'مشتری حذف‌شده'}</strong>
              <p style={{ margin: '7px 0', fontSize: 14 }}>{item.topic}</p>
              <small style={{
                color: item.dueDate < today() ? '#b42318' :
                  item.dueDate === today() ? '#b7791f' : '#64748b'
              }}>
                <CalendarDays size={14} style={{ verticalAlign: 'middle', marginLeft: 5 }} />
                {dateLabel(item.dueDate)}
              </small>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => markDone(item.id)}
                  style={{
                    flex: 1, padding: 9, border: 0, borderRadius: 8,
                    background: '#e8f5ed', color: '#16804a'
                  }}
                >
                  <CheckCircle size={15} style={{ verticalAlign: 'middle', marginLeft: 5 }} />
                  انجام شد
                </button>
                <button
                  onClick={() => removeFollowUp(item.id)}
                  style={{
                    padding: 9, border: 0, borderRadius: 8,
                    background: '#fff0f0', color: '#b42318'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}

          <h3 style={{ marginTop: 24 }}>پیگیری‌های انجام‌شده</h3>

          {!completed.length && (
            <p style={{ color: '#64748b', fontSize: 13 }}>
              هنوز پیگیری‌ای تکمیل نشده است.
            </p>
          )}

          {completed.map(item => (
            <article key={item.id} style={{
              background: '#f5f8f6',
              border: '1px solid #dcebe0',
              borderRadius: 12,
              padding: 13,
              marginBottom: 9
            }}>
              <strong>{item.customerName || 'مشتری حذف‌شده'}</strong>
              <p style={{ margin: '6px 0', fontSize: 14 }}>{item.topic}</p>
              <small style={{ color: '#16804a' }}>
                <CheckCircle size={14} style={{ verticalAlign: 'middle', marginLeft: 5 }} />
                انجام‌شده
              </small>
              <button
                onClick={() => removeFollowUp(item.id)}
                style={{
                  float: 'left', border: 0, background: 'transparent',
                  color: '#b42318'
                }}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </>
      )}
    </main>
  )
}
