
import { useEffect, useState } from 'react'
import { Wallet, Plus, RefreshCw, History, Users } from 'lucide-react'
import {
  getCustomerBalances,
  getPayments,
  addPayment,
  type CustomerBalanceRecord,
  type PaymentRecord
} from './db/database'

const money = (n: number) =>
  new Intl.NumberFormat('fa-IR').format(n)

const methods = ['نقدی', 'کارت‌به‌کارت', 'کارت‌خوان', 'واریز بانکی', 'سایر']

export default function Payments() {
  const [balances, setBalances] = useState<CustomerBalanceRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('نقدی')
  const [notes, setNotes] = useState('')

  async function refresh() {
    try {
      setLoading(true)
      const [b, p] = await Promise.all([
        getCustomerBalances(),
        getPayments()
      ])
      setBalances(b)
      setPayments(p)
    } catch (e) {
      setError('دریافت اطلاعات حساب‌ها انجام نشد.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const selected = balances.find(x => x.customerId === Number(customerId))

  async function submitPayment() {
    const value = Number(amount)
    if (!customerId) {
      setError('ابتدا مشتری را انتخاب کن.')
      return
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('مبلغ باید عدد صحیح و بیشتر از صفر باشد.')
      return
    }
    if (!selected || value > selected.balance) {
      setError('مبلغ پرداخت از مانده بدهی بیشتر است.')
      return
    }

    const confirmText =
      `ثبت پرداخت؟\n\nمشتری: ${selected.customerName}\n` +
      `مبلغ: ${money(value)} تومان\nروش: ${method}\n` +
      `مانده پس از پرداخت: ${money(selected.balance - value)} تومان`

    if (!window.confirm(confirmText)) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      await addPayment(Number(customerId), value, method, notes)
      setAmount('')
      setNotes('')
      await refresh()
      setSuccess('پرداخت با موفقیت ثبت شد.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت پرداخت انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  const totalDebt = balances.reduce((s, x) => s + Math.max(0, x.balance), 0)
  const totalPaid = balances.reduce((s, x) => s + x.totalPaid, 0)

  return (
    <main style={{ paddingBottom: 24 }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">دریافت وجه و حساب مشتریان</div>
          <h2>پرداخت‌ها و مانده‌حساب</h2>
        </div>
        <button className="icon-btn" onClick={refresh} aria-label="به‌روزرسانی">
          <RefreshCw size={19}/>
        </button>
      </div>

      {error && (
        <div className="empty" role="alert" style={{ color: '#a33c48' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginRight: 8 }}>×</button>
        </div>
      )}
      {success && (
        <div className="empty" style={{ color: '#16834b' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ marginRight: 8 }}>×</button>
        </div>
      )}

      <div className="stats">
        <article>
          <Wallet/>
          <strong>{money(totalDebt)}</strong>
          <small>مانده بدهی مشتریان (تومان)</small>
        </article>
        <article>
          <History/>
          <strong>{money(totalPaid)}</strong>
          <small>مجموع پرداختی‌ها (تومان)</small>
        </article>
      </div>

      <section className="assistant" style={{ marginBottom: 16 }}>
        <div className="assistant-head">
          <Plus/><b>ثبت دریافت جدید</b>
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          انتخاب مشتری
          <select
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #ccc' }}
          >
            <option value="">انتخاب مشتری...</option>
            {balances.filter(x => x.balance > 0).map(x => (
              <option key={x.customerId} value={x.customerId}>
                {x.customerName} - مانده: {money(x.balance)} تومان
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <p style={{ fontSize: 13, color: '#315da8' }}>
            مانده فعلی: {money(selected.balance)} تومان
          </p>
        )}

        <label style={{ display: 'block', marginTop: 12 }}>
          مبلغ پرداخت (تومان)
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="مثلاً ۱۰۰۰۰۰"
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          روش پرداخت
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #ccc' }}
          >
            {methods.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          یادداشت (اختیاری)
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="توضیحات پرداخت..."
            style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </label>

        <button
          className="primary full"
          onClick={submitPayment}
          disabled={saving || !customerId || !amount}
          style={{ marginTop: 14 }}
        >
          <Wallet size={17}/>
          {saving ? 'در حال ثبت...' : 'تأیید و ثبت پرداخت'}
        </button>
      </section>

      <div className="section-title">
        <h3><Users size={18}/> مانده حساب مشتریان</h3>
      </div>

      {loading && <p className="empty">در حال دریافت اطلاعات...</p>}

      {!loading && balances.map(x => (
        <article className="customer customer-expanded" key={x.customerId}>
          <div className="customer-main">
            <div className="avatar"><Wallet size={19}/></div>
            <div className="customer-info">
              <b>{x.customerName}</b>
              <small>{x.phone}</small>
              <small>مجموع سفارش‌ها: {money(x.totalOrders)} تومان</small>
              <small>پرداخت‌شده: {money(x.totalPaid)} تومان</small>
              <b style={{ color: x.balance > 0 ? '#a33c48' : '#16834b' }}>
                {x.balance > 0
                  ? `بدهی: ${money(x.balance)} تومان`
                  : x.balance < 0
                    ? `بستانکاری: ${money(Math.abs(x.balance))} تومان`
                    : 'تسویه شده'}
              </b>
            </div>
          </div>
        </article>
      ))}

      {!loading && !balances.length && (
        <p className="empty">هنوز مشتری‌ای ثبت نشده است.</p>
      )}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3><History size={18}/> تاریخچه پرداخت‌ها</h3>
      </div>

      {payments.map(p => (
        <article className="customer customer-expanded" key={p.id}>
          <div className="customer-main">
            <div className="avatar"><Wallet size={19}/></div>
            <div className="customer-info">
              <b>{p.customerName}</b>
              <strong style={{ color: '#16834b' }}>
                {money(p.amount)} تومان
              </strong>
              <small>روش: {p.method}</small>
              <small>تاریخ: {p.createdAt}</small>
              {p.notes && <small>یادداشت: {p.notes}</small>}
            </div>
          </div>
        </article>
      ))}

      {!loading && !payments.length && (
        <p className="empty">هنوز پرداختی ثبت نشده است.</p>
      )}
    </main>
  )
}
