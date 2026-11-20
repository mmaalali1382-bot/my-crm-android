
import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  RefreshCw,
  History,
  Users,
  CalendarDays,
  Pencil,
  Trash2,
  CheckCircle,
  X,
  Coins,
  RotateCcw
} from 'lucide-react'

import {
  getCustomerBalances,
  getPayments,
  addPayment,
  getOrders,
  type CustomerBalanceRecord,
  type PaymentRecord,
  type OrderRecord
} from './db/database'

import {
  getInstallments,
  addInstallment,
  updateInstallment,
  deleteInstallment,
  recordInstallmentPayment,
  type InstallmentRecord
} from './db/salesExtensions'

import {
  getRefunds,
  getCustomerCredits,
  settleCanceledOrder,
  type RefundRecord,
  type CustomerCreditRecord
} from './db/refunds'

const money = (n: number) =>
  new Intl.NumberFormat('fa-IR').format(Math.round(n || 0))

const methods = [
  'نقدی',
  'کارت‌به‌کارت',
  'کارت‌خوان',
  'واریز بانکی',
  'سایر'
]

const today = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const statusText = (status: string, dueDate: string) => {
  if (status === 'paid') return 'تسویه شده'
  if (status === 'partial') return 'پرداخت ناقص'
  if (dueDate && dueDate < today()) return 'سررسید گذشته'
  return 'در انتظار پرداخت'
}

const statusColor = (status: string, dueDate: string) => {
  if (status === 'paid') return '#16834b'
  if (status === 'partial') return '#b7791f'
  if (dueDate && dueDate < today()) return '#b33b48'
  return '#315da8'
}

export default function Payments() {
  const [balances, setBalances] = useState<CustomerBalanceRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [installments, setInstallments] = useState<InstallmentRecord[]>([])
  const [refunds, setRefunds] = useState<RefundRecord[]>([])
  const [credits, setCredits] = useState<CustomerCreditRecord[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // دریافت عادی از مشتری
  const [customerId, setCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('نقدی')
  const [notes, setNotes] = useState('')

  // تسویه سفارش لغوشده
  const [settlementOrderId, setSettlementOrderId] = useState('')
  const [settlementPaidAmount, setSettlementPaidAmount] = useState('')
  const [settlementRefundAmount, setSettlementRefundAmount] = useState('')
  const [settlementCreditAmount, setSettlementCreditAmount] = useState('')
  const [settlementMethod, setSettlementMethod] = useState('نقدی')
  const [settlementNotes, setSettlementNotes] = useState('')

  // ثبت و ویرایش قسط
  const [installmentCustomerId, setInstallmentCustomerId] = useState('')
  const [installmentOrderId, setInstallmentOrderId] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [installmentDate, setInstallmentDate] = useState('')
  const [installmentNotes, setInstallmentNotes] = useState('')
  const [editingInstallmentId, setEditingInstallmentId] = useState<number | null>(null)

  // ثبت دریافت بابت قسط
  const [activePaymentId, setActivePaymentId] = useState<number | null>(null)
  const [installmentPaymentAmount, setInstallmentPaymentAmount] = useState('')
  const [installmentPaymentMethod, setInstallmentPaymentMethod] = useState('نقدی')
  const [installmentPaymentNotes, setInstallmentPaymentNotes] = useState('')

  async function refresh() {
    try {
      setLoading(true)

      const [
        b,
        p,
        o,
        i,
        r,
        c
      ] = await Promise.all([
        getCustomerBalances(),
        getPayments(),
        getOrders(),
        getInstallments(),
        getRefunds(),
        getCustomerCredits()
      ])

      setBalances(b)
      setPayments(p)
      setOrders(o)
      setInstallments(i)
      setRefunds(r)
      setCredits(c)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'دریافت اطلاعات حساب‌ها انجام نشد.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const selected = balances.find(
    x => x.customerId === Number(customerId)
  )

  const installmentSelectedCustomer = balances.find(
    x => x.customerId === Number(installmentCustomerId)
  )

  const availableOrders = useMemo(() => {
    return orders.filter(
      x =>
        x.customerId === Number(installmentCustomerId) &&
        x.status !== 'لغو شده'
    )
  }, [orders, installmentCustomerId])

  const selectedInstallmentOrder = orders.find(
    x => x.id === Number(installmentOrderId)
  )

  const canceledOrders = useMemo(
    () => orders.filter(x => x.status === 'لغو شده'),
    [orders]
  )

  const selectedSettlementOrder = orders.find(
    x => x.id === Number(settlementOrderId)
  )

  const settlementCustomerPayments = selectedSettlementOrder
    ? payments
        .filter(p => p.customerId === selectedSettlementOrder.customerId)
        .reduce((sum, p) => sum + p.amount, 0)
    : 0

  const settlementPaidValue = Number(settlementPaidAmount) || 0
  const settlementRefundValue = Number(settlementRefundAmount) || 0
  const settlementCreditValue = Number(settlementCreditAmount) || 0

  const settlementDifference =
    settlementPaidValue -
    settlementRefundValue -
    settlementCreditValue

  const totalDebt = balances.reduce(
    (s, x) => s + Math.max(0, x.balance),
    0
  )

  const totalPaid = balances.reduce(
    (s, x) => s + x.totalPaid,
    0
  )

  const totalInstallmentRemaining = installments.reduce(
    (s, x) => s + Math.max(0, x.amount - x.paidAmount),
    0
  )

  const openInstallments = installments.filter(
    x => x.status !== 'paid'
  )

  const totalRefunded = refunds.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  const totalAvailableCredit = credits.reduce(
    (sum, item) => sum + item.remainingAmount,
    0
  )

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

      await addPayment(
        Number(customerId),
        value,
        method,
        notes
      )

      setAmount('')
      setNotes('')

      await refresh()
      setSuccess('پرداخت با موفقیت ثبت شد.')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'ثبت پرداخت انجام نشد.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function submitSettlement() {
    if (!selectedSettlementOrder) {
      setError('ابتدا سفارش لغوشده را انتخاب کن.')
      return
    }

    if (selectedSettlementOrder.status !== 'لغو شده') {
      setError('این سفارش لغو نشده است.')
      return
    }

    const paid = Number(settlementPaidAmount)
    const refund = Number(settlementRefundAmount || 0)
    const credit = Number(settlementCreditAmount || 0)

    if (
      !Number.isSafeInteger(paid) ||
      !Number.isSafeInteger(refund) ||
      !Number.isSafeInteger(credit) ||
      paid < 0 ||
      refund < 0 ||
      credit < 0
    ) {
      setError('مبالغ باید عدد صحیح و صفر یا بیشتر باشند.')
      return
    }

    if (refund + credit !== paid) {
      setError(
        'مجموع بازپرداخت نقدی و اعتبار باید دقیقاً برابر مبلغ پرداخت‌شده باشد.'
      )
      return
    }

    if (refund > 0 && !settlementMethod.trim()) {
      setError('روش بازپرداخت را انتخاب کن.')
      return
    }

    if (paid > settlementCustomerPayments) {
      setError(
        'مبلغ واردشده از مجموع پرداخت‌های ثبت‌شده این مشتری بیشتر است. فقط مبلغ مربوط به همین سفارش را وارد کن.'
      )
      return
    }

    const customerName = selectedSettlementOrder.customerName

    const confirmed = window.confirm(
      `تأیید تسویه سفارش لغوشده؟\n\n` +
      `شماره سفارش: ${money(selectedSettlementOrder.id)}\n` +
      `مشتری: ${customerName}\n` +
      `مبلغ پرداخت‌شده مربوط به این سفارش: ${money(paid)} تومان\n` +
      `بازپرداخت نقدی: ${money(refund)} تومان\n` +
      `اعتبار مشتری: ${money(credit)} تومان\n\n` +
      `این عملیات فقط یک‌بار برای هر سفارش قابل ثبت است.`
    )

    if (!confirmed) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await settleCanceledOrder({
        customerId: selectedSettlementOrder.customerId,
        orderId: selectedSettlementOrder.id,
        paidAmount: paid,
        refundAmount: refund,
        creditAmount: credit,
        refundMethod: settlementMethod,
        notes: settlementNotes
      })

      setSettlementOrderId('')
      setSettlementPaidAmount('')
      setSettlementRefundAmount('')
      setSettlementCreditAmount('')
      setSettlementMethod('نقدی')
      setSettlementNotes('')

      await refresh()
      setSuccess('تسویه سفارش لغوشده با موفقیت ثبت شد.')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'ثبت تسویه انجام نشد.'
      )
    } finally {
      setSaving(false)
    }
  }

  function resetInstallmentForm() {
    setEditingInstallmentId(null)
    setInstallmentCustomerId('')
    setInstallmentOrderId('')
    setInstallmentAmount('')
    setInstallmentDate('')
    setInstallmentNotes('')
  }

  async function submitInstallment() {
    const value = Number(installmentAmount)

    if (!installmentCustomerId) {
      setError('برای ثبت قسط، مشتری را انتخاب کن.')
      return
    }

    if (!installmentOrderId) {
      setError('سفارش مربوط به قسط را انتخاب کن.')
      return
    }

    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('مبلغ قسط باید عدد صحیح و بیشتر از صفر باشد.')
      return
    }

    if (!installmentDate) {
      setError('تاریخ سررسید قسط را وارد کن.')
      return
    }

    if (!editingInstallmentId && !selectedInstallmentOrder) {
      setError('سفارش انتخاب‌شده معتبر نیست.')
      return
    }

    const confirmText = editingInstallmentId
      ? `ویرایش قسط به مبلغ ${money(value)} تومان انجام شود؟`
      : `قسط جدید به مبلغ ${money(value)} تومان برای ${installmentSelectedCustomer?.customerName} ثبت شود؟`

    if (!window.confirm(confirmText)) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (editingInstallmentId) {
        await updateInstallment(editingInstallmentId, {
          amount: value,
          dueDate: installmentDate,
          notes: installmentNotes
        })
        setSuccess('اطلاعات قسط ویرایش شد.')
      } else {
        await addInstallment({
          customerId: Number(installmentCustomerId),
          orderId: Number(installmentOrderId),
          amount: value,
          dueDate: installmentDate,
          notes: installmentNotes
        })
        setSuccess('قسط جدید با موفقیت ثبت شد.')
      }

      resetInstallmentForm()
      await refresh()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'ثبت اطلاعات قسط انجام نشد.'
      )
    } finally {
      setSaving(false)
    }
  }

  function startEditInstallment(item: InstallmentRecord) {
    const order = orders.find(x => x.id === item.orderId)

    setEditingInstallmentId(item.id)
    setInstallmentCustomerId(String(item.customerId))
    setInstallmentOrderId(String(item.orderId))
    setInstallmentAmount(String(item.amount))
    setInstallmentDate(item.dueDate)
    setInstallmentNotes(item.notes || '')

    if (!order) {
      setError('سفارش مربوط به این قسط پیدا نشد.')
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function removeInstallment(item: InstallmentRecord) {
    if (
      !window.confirm(
        `قسط ${money(item.amount)} تومانی ${item.customerName} حذف شود؟`
      )
    ) {
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await deleteInstallment(item.id)
      await refresh()

      setSuccess('قسط حذف شد.')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'حذف قسط انجام نشد.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function submitInstallmentPayment(item: InstallmentRecord) {
    const value = Number(installmentPaymentAmount)
    const remaining = Math.max(0, item.amount - item.paidAmount)

    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('مبلغ دریافتی باید عدد صحیح و بیشتر از صفر باشد.')
      return
    }

    if (value > remaining) {
      setError(
        `مبلغ واردشده بیشتر از مانده قسط است. مانده: ${money(remaining)} تومان`
      )
      return
    }

    const confirmText =
      `ثبت دریافت بابت قسط؟\n\n` +
      `مشتری: ${item.customerName}\n` +
      `مبلغ دریافت: ${money(value)} تومان\n` +
      `مانده قسط پس از دریافت: ${money(remaining - value)} تومان\n` +
      `روش پرداخت: ${installmentPaymentMethod}`

    if (!window.confirm(confirmText)) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await recordInstallmentPayment(
        item.id,
        value,
        installmentPaymentMethod,
        installmentPaymentNotes
      )

      setActivePaymentId(null)
      setInstallmentPaymentAmount('')
      setInstallmentPaymentNotes('')

      await refresh()
      setSuccess('دریافت وجه ثبت شد و مانده قسط به‌روزرسانی شد.')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'ثبت دریافت قسط انجام نشد.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ paddingBottom: 24 }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">دریافت وجه و حساب مشتریان</div>
          <h2>پرداخت‌ها و مانده‌حساب</h2>
        </div>

        <button
          className="icon-btn"
          onClick={refresh}
          aria-label="به‌روزرسانی"
          disabled={loading}
        >
          <RefreshCw size={19}/>
        </button>
      </div>

      {error && (
        <div
          className="empty"
          role="alert"
          style={{ color: '#a33c48' }}
        >
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginRight: 8 }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          className="empty"
          style={{ color: '#16834b' }}
        >
          {success}
          <button
            onClick={() => setSuccess('')}
            style={{ marginRight: 8 }}
          >
            ×
          </button>
        </div>
      )}

      {loading && (
        <p className="empty">در حال دریافت اطلاعات...</p>
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

        <article>
          <RotateCcw/>
          <strong>{money(totalRefunded)}</strong>
          <small>مجموع بازپرداخت‌ها (تومان)</small>
        </article>

        <article>
          <Coins/>
          <strong>{money(totalAvailableCredit)}</strong>
          <small>اعتبار استفاده‌نشده مشتریان (تومان)</small>
        </article>
      </div>

      {/* دریافت عادی وجه */}

      <section className="assistant" style={{ marginBottom: 16 }}>
        <div className="assistant-head">
          <Plus/>
          <b>ثبت دریافت جدید</b>
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          انتخاب مشتری

          <select
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: '1px solid #ccc'
            }}
          >
            <option value="">انتخاب مشتری...</option>

            {balances
              .filter(x => x.balance > 0)
              .map(x => (
                <option
                  key={x.customerId}
                  value={x.customerId}
                >
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
          روش پرداخت

          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: '1px solid #ccc'
            }}
          >
            {methods.map(x => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          یادداشت (اختیاری)

          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="توضیحات پرداخت..."
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
          onClick={submitPayment}
          disabled={saving || !customerId || !amount}
          style={{ marginTop: 14 }}
        >
          <Wallet size={17}/>
          {saving ? 'در حال ثبت...' : 'تأیید و ثبت پرداخت'}
        </button>
      </section>

      {/* تسویه سفارش لغوشده */}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3>
          <RotateCcw size={18}/>
          بازپرداخت و اعتبار مشتری
        </h3>
      </div>

      <section className="assistant" style={{ marginBottom: 16 }}>
        <div className="assistant-head">
          <Coins/>
          <b>تسویه سفارش لغوشده</b>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.9, color: '#536b9a' }}>
          سفارش لغوشده را انتخاب کن. سپس مشخص کن چه مقدار از پرداخت‌های مشتری مربوط به همین سفارش بوده و آن مبلغ را بین بازپرداخت نقدی و اعتبار مشتری تقسیم کن.
        </p>

        <label style={{ display: 'block', marginTop: 12 }}>
          انتخاب سفارش لغوشده

          <select
            value={settlementOrderId}
            onChange={e => {
              setSettlementOrderId(e.target.value)
              setSettlementPaidAmount('')
              setSettlementRefundAmount('')
              setSettlementCreditAmount('')
              setSettlementNotes('')
            }}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: '1px solid #ccc'
            }}
          >
            <option value="">انتخاب سفارش...</option>

            {canceledOrders.map(x => (
              <option key={x.id} value={x.id}>
                سفارش #{money(x.id)} - {x.customerName} - {money(x.finalTotal)} تومان
              </option>
            ))}
          </select>
        </label>

        {selectedSettlementOrder && (
          <>
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: '#f4f6fb',
                borderRadius: 10,
                display: 'grid',
                gap: 7
              }}
            >
              <b>{selectedSettlementOrder.customerName}</b>
              <small>
                مبلغ نهایی سفارش: {money(selectedSettlementOrder.finalTotal)} تومان
              </small>
              <small>
                مجموع پرداخت‌های ثبت‌شده این مشتری: {money(settlementCustomerPayments)} تومان
              </small>
              <small style={{ color: '#a36b20', lineHeight: 1.8 }}>
                چون پرداخت‌های قبلی به سفارش خاصی متصل نیستند، مبلغ مربوط به این سفارش را خودت مشخص کن. مبلغ واردشده نباید از پرداخت‌های ثبت‌شده مشتری بیشتر باشد.
              </small>
            </div>

            <label style={{ display: 'block', marginTop: 12 }}>
              مبلغ پرداخت‌شده مربوط به این سفارش (تومان)

              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={settlementPaidAmount}
                onChange={e => setSettlementPaidAmount(e.target.value)}
                placeholder="مبلغی که مشتری قبلاً پرداخت کرده"
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
              مبلغ بازپرداخت نقدی (تومان)

              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={settlementRefundAmount}
                onChange={e => setSettlementRefundAmount(e.target.value)}
                placeholder="مثلاً ۵۰۰۰۰۰"
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

            {settlementRefundValue > 0 && (
              <label style={{ display: 'block', marginTop: 12 }}>
                روش بازپرداخت

                <select
                  value={settlementMethod}
                  onChange={e => setSettlementMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    marginTop: 6,
                    borderRadius: 10,
                    border: '1px solid #ccc'
                  }}
                >
                  {methods.map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
            )}

            <label style={{ display: 'block', marginTop: 12 }}>
              مبلغ اعتبار مشتری (تومان)

              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={settlementCreditAmount}
                onChange={e => setSettlementCreditAmount(e.target.value)}
                placeholder="مبلغی که برای خرید بعدی می‌ماند"
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

            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: '#f4f6fb',
                borderRadius: 10,
                display: 'grid',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>مبلغ پرداخت‌شده</span>
                <b>{money(settlementPaidValue)} تومان</b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>بازپرداخت نقدی</span>
                <b>{money(settlementRefundValue)} تومان</b>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>اعتبار مشتری</span>
                <b>{money(settlementCreditValue)} تومان</b>
              </div>

              <div
                style={{
                  borderTop: '1px solid #d8deeb',
                  paddingTop: 9,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <b>اختلاف مبالغ</b>
                <b style={{
                  color: settlementDifference === 0 ? '#16834b' : '#a33c48'
                }}>
                  {money(settlementDifference)} تومان
                </b>
              </div>
            </div>

            <label style={{ display: 'block', marginTop: 12 }}>
              توضیحات (اختیاری)

              <textarea
                rows={2}
                value={settlementNotes}
                onChange={e => setSettlementNotes(e.target.value)}
                placeholder="توضیحات تسویه..."
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
              onClick={submitSettlement}
              disabled={
                saving ||
                !settlementPaidAmount ||
                !settlementRefundAmount &&
                  !settlementCreditAmount ||
                settlementDifference !== 0
              }
              style={{ marginTop: 14 }}
            >
              <CheckCircle size={17}/>
              {saving ? 'در حال ثبت تسویه...' : 'تأیید و ثبت تسویه'}
            </button>
          </>
        )}

        {!canceledOrders.length && (
          <p className="empty">
            در حال حاضر سفارش لغوشده‌ای برای تسویه وجود ندارد.
          </p>
        )}
      </section>

      {/* مدیریت اقساط */}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3>
          <CalendarDays size={18}/>
          مدیریت اقساط
        </h3>
      </div>

      <div className="stats">
        <article>
          <Coins/>
          <strong>{money(totalInstallmentRemaining)}</strong>
          <small>مانده کل اقساط (تومان)</small>
        </article>

        <article>
          <CalendarDays/>
          <strong>{money(openInstallments.length)}</strong>
          <small>تعداد اقساط تسویه‌نشده</small>
        </article>
      </div>

      <section className="assistant" style={{ marginBottom: 16 }}>
        <div className="assistant-head">
          {editingInstallmentId ? <Pencil/> : <Plus/>}
          <b>
            {editingInstallmentId ? 'ویرایش قسط' : 'ثبت قسط جدید'}
          </b>
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          انتخاب مشتری

          <select
            value={installmentCustomerId}
            disabled={editingInstallmentId !== null}
            onChange={e => {
              setInstallmentCustomerId(e.target.value)
              setInstallmentOrderId('')
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

            {balances.map(x => (
              <option
                key={x.customerId}
                value={x.customerId}
              >
                {x.customerName}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          انتخاب سفارش

          <select
            value={installmentOrderId}
            disabled={editingInstallmentId !== null || !installmentCustomerId}
            onChange={e => setInstallmentOrderId(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: '1px solid #ccc'
            }}
          >
            <option value="">انتخاب سفارش...</option>

            {availableOrders.map(x => (
              <option key={x.id} value={x.id}>
                سفارش #{x.id} - {money(x.finalTotal)} تومان
              </option>
            ))}
          </select>
        </label>

        {selectedInstallmentOrder && (
          <p style={{ fontSize: 13, color: '#315da8' }}>
            مبلغ سفارش: {money(selectedInstallmentOrder.finalTotal)} تومان
          </p>
        )}

        <label style={{ display: 'block', marginTop: 12 }}>
          مبلغ قسط (تومان)

          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={installmentAmount}
            onChange={e => setInstallmentAmount(e.target.value)}
            placeholder="مبلغ قسط"
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
          تاریخ سررسید

          <input
            type="date"
            value={installmentDate}
            onChange={e => setInstallmentDate(e.target.value)}
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
          توضیحات قسط (اختیاری)

          <textarea
            rows={2}
            value={installmentNotes}
            onChange={e => setInstallmentNotes(e.target.value)}
            placeholder="توضیحات..."
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
          onClick={submitInstallment}
          disabled={
            saving ||
            !installmentCustomerId ||
            !installmentOrderId ||
            !installmentAmount ||
            !installmentDate
          }
          style={{ marginTop: 14 }}
        >
          {editingInstallmentId ? <CheckCircle size={17}/> : <Plus size={17}/>}
          {saving
            ? 'در حال ثبت...'
            : editingInstallmentId
              ? 'ذخیره ویرایش قسط'
              : 'ثبت قسط'}
        </button>

        {editingInstallmentId !== null && (
          <button
            className="secondary full"
            onClick={resetInstallmentForm}
            style={{ marginTop: 8 }}
          >
            <X size={17}/>
            انصراف از ویرایش
          </button>
        )}
      </section>

      {/* فهرست اقساط */}

      <div className="section-title">
        <h3>
          <CalendarDays size={18}/>
          فهرست اقساط
        </h3>
      </div>

      {!loading && installments.map(item => {
        const remaining = Math.max(0, item.amount - item.paidAmount)
        const status = statusText(item.status, item.dueDate)
        const color = statusColor(item.status, item.dueDate)

        return (
          <article
            className="customer customer-expanded"
            key={item.id}
            style={{ marginBottom: 12 }}
          >
            <div className="customer-main">
              <div className="avatar">
                <Coins size={19}/>
              </div>

              <div className="customer-info">
                <b>{item.customerName}</b>

                <small>شماره قسط: {money(item.id)}</small>
                <small>شماره سفارش: {money(item.orderId)}</small>
                <small>مبلغ قسط: {money(item.amount)} تومان</small>
                <small>پرداخت‌شده: {money(item.paidAmount)} تومان</small>

                <b style={{ color }}>
                  مانده قسط: {money(remaining)} تومان
                </b>

                <small>سررسید: {item.dueDate}</small>

                <b style={{ color }}>
                  وضعیت: {status}
                </b>

                {item.notes && (
                  <small>توضیحات: {item.notes}</small>
                )}
              </div>
            </div>

            {remaining > 0 && (
              <button
                className="primary full"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setActivePaymentId(
                    activePaymentId === item.id ? null : item.id
                  )
                  setInstallmentPaymentAmount('')
                  setInstallmentPaymentNotes('')
                }}
              >
                <Wallet size={17}/>
                ثبت دریافت بابت این قسط
              </button>
            )}

            {activePaymentId === item.id && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 12
                }}
              >
                <b>ثبت دریافت واقعی</b>

                <p style={{ fontSize: 13, color: '#315da8' }}>
                  مانده قابل دریافت: {money(remaining)} تومان
                </p>

                <label style={{ display: 'block', marginTop: 10 }}>
                  مبلغ دریافتی

                  <input
                    type="number"
                    min="1"
                    max={remaining}
                    step="1"
                    inputMode="numeric"
                    value={installmentPaymentAmount}
                    onChange={e => setInstallmentPaymentAmount(e.target.value)}
                    placeholder="مبلغ دریافتی"
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

                <label style={{ display: 'block', marginTop: 10 }}>
                  روش دریافت

                  <select
                    value={installmentPaymentMethod}
                    onChange={e => setInstallmentPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      marginTop: 6,
                      borderRadius: 10,
                      border: '1px solid #ccc'
                    }}
                  >
                    {methods.map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'block', marginTop: 10 }}>
                  توضیحات

                  <textarea
                    rows={2}
                    value={installmentPaymentNotes}
                    onChange={e => setInstallmentPaymentNotes(e.target.value)}
                    placeholder="توضیحات دریافت..."
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
                  onClick={() => submitInstallmentPayment(item)}
                  disabled={saving || !installmentPaymentAmount}
                  style={{ marginTop: 12 }}
                >
                  <CheckCircle size={17}/>
                  {saving ? 'در حال ثبت...' : 'تأیید و ثبت دریافت'}
                </button>

                <button
                  className="secondary full"
                  onClick={() => setActivePaymentId(null)}
                  style={{ marginTop: 8 }}
                >
                  انصراف
                </button>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 12,
                flexWrap: 'wrap'
              }}
            >
              <button
                className="secondary"
                onClick={() => startEditInstallment(item)}
                disabled={saving}
              >
                <Pencil size={16}/>
                ویرایش
              </button>

              <button
                className="secondary"
                onClick={() => removeInstallment(item)}
                disabled={saving || item.paidAmount > 0}
                title={
                  item.paidAmount > 0
                    ? 'قسط دارای دریافت وجه قابل حذف نیست'
                    : 'حذف قسط'
                }
              >
                <Trash2 size={16}/>
                حذف
              </button>
            </div>
          </article>
        )
      })}

      {!loading && !installments.length && (
        <p className="empty">
          هنوز قسطی ثبت نشده است.
        </p>
      )}

      {/* مانده حساب مشتریان */}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3>
          <Users size={18}/>
          مانده حساب مشتریان
        </h3>
      </div>

      {!loading && balances.map(x => {
        const customerCredit = credits
          .filter(item => item.customerId === x.customerId)
          .reduce((sum, item) => sum + item.remainingAmount, 0)

        return (
          <article
            className="customer customer-expanded"
            key={x.customerId}
          >
            <div className="customer-main">
              <div className="avatar">
                <Wallet size={19}/>
              </div>

              <div className="customer-info">
                <b>{x.customerName}</b>
                <small>{x.phone}</small>
                <small>
                  مجموع سفارش‌ها: {money(x.totalOrders)} تومان
                </small>
                <small>
                  پرداخت‌شده: {money(x.totalPaid)} تومان
                </small>

                <b
                  style={{
                    color: x.balance > 0
                      ? '#a33c48'
                      : '#16834b'
                  }}
                >
                  {x.balance > 0
                    ? `بدهی: ${money(x.balance)} تومان`
                    : x.balance < 0
                      ? `بستانکاری: ${money(Math.abs(x.balance))} تومان`
                      : 'تسویه شده'}
                </b>

                {customerCredit > 0 && (
                  <b style={{ color: '#315da8' }}>
                    اعتبار قابل استفاده: {money(customerCredit)} تومان
                  </b>
                )}
              </div>
            </div>
          </article>
        )
      })}

      {!loading && !balances.length && (
        <p className="empty">
          هنوز مشتری‌ای ثبت نشده است.
        </p>
      )}

      {/* تاریخچه بازپرداخت‌ها */}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3>
          <RotateCcw size={18}/>
          تاریخچه بازپرداخت‌ها
        </h3>
      </div>

      {refunds.map(item => {
        const customer = balances.find(
          x => x.customerId === item.customerId
        )

        return (
          <article
            className="customer customer-expanded"
            key={item.id}
          >
            <div className="customer-main">
              <div className="avatar">
                <RotateCcw size={19}/>
              </div>

              <div className="customer-info">
                <b>{customer?.customerName || `مشتری ${money(item.customerId)}`}</b>
                <strong style={{ color: '#a33c48' }}>
                  {money(item.amount)} تومان
                </strong>
                <small>شماره سفارش: {item.orderId ? money(item.orderId) : '—'}</small>
                <small>روش بازپرداخت: {item.method}</small>
                <small>تاریخ: {item.createdAt}</small>
                {item.notes && <small>توضیحات: {item.notes}</small>}
              </div>
            </div>
          </article>
        )
      })}

      {!loading && !refunds.length && (
        <p className="empty">
          هنوز بازپرداختی ثبت نشده است.
        </p>
      )}

      {/* تاریخچه اعتبار مشتریان */}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3>
          <Coins size={18}/>
          اعتبار مشتریان
        </h3>
      </div>

      {credits.map(item => {
        const customer = balances.find(
          x => x.customerId === item.customerId
        )

        return (
          <article
            className="customer customer-expanded"
            key={item.id}
          >
            <div className="customer-main">
              <div className="avatar">
                <Coins size={19}/>
              </div>

              <div className="customer-info">
                <b>{customer?.customerName || `مشتری ${money(item.customerId)}`}</b>
                <small>اعتبار اولیه: {money(item.amount)} تومان</small>
                <small>مصرف‌شده: {money(item.usedAmount)} تومان</small>
                <b style={{ color: '#315da8' }}>
                  اعتبار باقی‌مانده: {money(item.remainingAmount)} تومان
                </b>
                <small>شماره سفارش مبدأ: {item.orderId ? money(item.orderId) : '—'}</small>
                <small>تاریخ ثبت: {item.createdAt}</small>
                {item.notes && <small>توضیحات: {item.notes}</small>}
              </div>
            </div>
          </article>
        )
      })}

      {!loading && !credits.length && (
        <p className="empty">
          هنوز اعتباری برای مشتریان ثبت نشده است.
        </p>
      )}

      {/* تاریخچه پرداخت‌ها */}

      <div className="section-title" style={{ marginTop: 24 }}>
        <h3>
          <History size={18}/>
          تاریخچه پرداخت‌ها
        </h3>
      </div>

      {payments.map(p => (
        <article
          className="customer customer-expanded"
          key={p.id}
        >
          <div className="customer-main">
            <div className="avatar">
              <Wallet size={19}/>
            </div>

            <div className="customer-info">
              <b>{p.customerName}</b>

              <strong style={{ color: '#16834b' }}>
                {money(p.amount)} تومان
              </strong>

              <small>روش: {p.method}</small>
              <small>تاریخ: {p.createdAt}</small>

              {p.notes && (
                <small>یادداشت: {p.notes}</small>
              )}
            </div>
          </div>
        </article>
      ))}

      {!loading && !payments.length && (
        <p className="empty">
          هنوز پرداختی ثبت نشده است.
        </p>
      )}
    </main>
  )
}
