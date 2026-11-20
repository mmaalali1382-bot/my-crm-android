
import { useEffect, useState } from 'react'
import { Coins, CheckCircle } from 'lucide-react'
import {
  getCustomerBalances,
  type CustomerBalanceRecord
} from './db/database'
import {
  getCustomerCredits,
  useCustomerCredit,
  type CustomerCreditRecord
} from './db/refunds'

const money = (n: number) =>
  new Intl.NumberFormat('fa-IR').format(Math.round(n || 0))

type Props = {
  onSaved: () => Promise<void>
}

export default function CustomerCreditUsage({ onSaved }: Props) {
  const [balances, setBalances] = useState<CustomerBalanceRecord[]>([])
  const [credits, setCredits] = useState<CustomerCreditRecord[]>([])
  const [customerId, setCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      const [b, c] = await Promise.all([
        getCustomerBalances(),
        getCustomerCredits()
      ])
      setBalances(b)
      setCredits(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'دریافت اطلاعات ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const eligibleCustomers = balances.filter(customer => {
    const credit = credits
      .filter(item => item.customerId === customer.customerId)
      .reduce((sum, item) => sum + item.remainingAmount, 0)

    return customer.balance > 0 && credit > 0
  })

  const selected = balances.find(
    item => item.customerId === Number(customerId)
  )

  const availableCredit = credits
    .filter(item => item.customerId === Number(customerId))
    .reduce((sum, item) => sum + item.remainingAmount, 0)

  async function submit() {
    const value = Number(amount)

    if (!customerId) {
      setError('مشتری را انتخاب کن.')
      return
    }

    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('مبلغ باید عدد صحیح و بیشتر از صفر باشد.')
      return
    }

    if (value > availableCredit) {
      setError('مبلغ از اعتبار قابل استفاده بیشتر است.')
      return
    }

    if (selected && value > selected.balance) {
      setError('مبلغ از بدهی مشتری بیشتر است.')
      return
    }

    if (!window.confirm(
      `مصرف اعتبار ثبت شود؟\n\n` +
      `مشتری: ${selected?.customerName}\n` +
      `مبلغ: ${money(value)} تومان\n` +
      `اعتبار باقی‌مانده: ${money(availableCredit - value)} تومان`
    )) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await useCustomerCredit(
        Number(customerId),
        value,
        notes
      )

      setAmount('')
      setNotes('')
      setCustomerId('')

      await loadData()
      await onSaved()

      setSuccess('مصرف اعتبار با موفقیت ثبت شد.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'مصرف اعتبار انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="assistant" style={{ marginBottom: 16 }}>
      <div className="assistant-head">
        <Coins />
        <b>استفاده از اعتبار مشتری</b>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.9, color: '#536b9a' }}>
        اعتبار ثبت‌شده مشتری را برای کاهش بدهی او استفاده کن.
        این عملیات دریافت وجه نقد محسوب نمی‌شود.
      </p>

      {error && (
        <p role="alert" style={{ color: '#a33c48', fontSize: 13 }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: '#16834b', fontSize: 13 }}>
          {success}
        </p>
      )}

      <label style={{ display: 'block', marginTop: 12 }}>
        انتخاب مشتری

        <select
          value={customerId}
          onChange={e => {
            setCustomerId(e.target.value)
            setAmount('')
            setError('')
          }}
          style={{
            width: '100%',
            padding: 12,
            marginTop: 6,
            borderRadius: 10,
            border: '1px solid #ccc'
          }}
        >
          <option value="">انتخاب مشتری...</option>
          {eligibleCustomers.map(item => (
            <option key={item.customerId} value={item.customerId}>
              {item.customerName}
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: '#f4f6fb',
          borderRadius: 10,
          display: 'grid',
          gap: 7
        }}>
          <small>بدهی فعلی: {money(selected.balance)} تومان</small>
          <small>اعتبار قابل استفاده: {money(availableCredit)} تومان</small>
        </div>
      )}

      <label style={{ display: 'block', marginTop: 12 }}>
        مبلغ مصرف اعتبار (تومان)

        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="مبلغ موردنظر"
          style={{
            width: '100%',
            padding: 12,
            marginTop: 6,
            borderRadius: 10,
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        توضیحات (اختیاری)

        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="توضیحات مصرف اعتبار..."
          style={{
            width: '100%',
            padding: 12,
            marginTop: 6,
            borderRadius: 10,
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </label>

      <button
        className="primary full"
        onClick={submit}
        disabled={saving || loading || !customerId || !amount}
        style={{ marginTop: 14 }}
      >
        <CheckCircle size={17} />
        {saving ? 'در حال ثبت...' : 'تأیید و مصرف اعتبار'}
      </button>

      {!loading && eligibleCustomers.length === 0 && (
        <p className="empty">
          مشتری دارای بدهی و اعتبار قابل استفاده وجود ندارد.
        </p>
      )}
    </section>
  )
}
