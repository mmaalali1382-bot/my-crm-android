
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  RefreshCw,
  CalendarDays,
  Target,
  Receipt,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react'

import {
  getOrders,
  getExpenses,
  type OrderRecord,
  type ExpenseRecord
} from './db/database'

import {
  exportFinancialReport,
  exportFinancialReportExcel,
  exportFinancialReportPDF
} from './reportExport'

type Period = 'today' | 'week' | 'month' | 'all'

const MONTHLY_TARGET = 500_000_000

const money = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(Math.round(value || 0))

const todayString = () => {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

const dateKey = (value: string) => {
  if (!value) return ''
  return value.slice(0, 10).replace(/\//g, '-')
}

const orderDate = (value: string) => dateKey(value || '')

const displayDate = (value: string) => {
  const key = orderDate(value)
  if (!key) return 'نامشخص'

  const [year, month, day] = key.split('-').map(Number)
  if (!year || !month || !day) return key

  return new Intl.DateTimeFormat('fa-IR').format(
    new Date(year, month - 1, day)
  )
}

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  result.setHours(0, 0, 0, 0)
  return result
}

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 1
  }).format(value)}٪`

export default function Reports() {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([])

  async function refresh() {
    try {
      setLoading(true)
      setError('')

      const [orderRows, expenseRows] = await Promise.all([
        getOrders(),
        getExpenses()
      ])

      setOrders(orderRows)
      setExpenses(expenseRows)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'دریافت گزارش‌های مالی انجام نشد.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const report = useMemo(() => {
    const now = new Date()
    const today = todayString()
    const weekStart = startOfWeek(now)
    const weekStartKey = [
      weekStart.getFullYear(),
      String(weekStart.getMonth() + 1).padStart(2, '0'),
      String(weekStart.getDate()).padStart(2, '0')
    ].join('-')

    const monthStart = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-01`

    const selectedOrders = orders.filter(order => {
      if (order.status === 'لغو شده') return false

      const date = orderDate(order.createdAt)
      if (!date) return false

      if (period === 'today') return date === today
      if (period === 'week') return date >= weekStartKey && date <= today
      if (period === 'month') return date >= monthStart && date <= today

      return true
    })

    const selectedExpenses = expenses.filter(expense => {
      const date = dateKey(expense.expenseDate || '')
      if (!date) return false

      if (period === 'today') return date === today
      if (period === 'week') return date >= weekStartKey && date <= today
      if (period === 'month') return date >= monthStart && date <= today

      return true
    })

    const revenue = selectedOrders.reduce(
      (sum, order) => sum + Number(order.finalTotal || 0),
      0
    )

    const cost = selectedOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) =>
            itemSum +
            Number(item.quantity || 0) * Number(item.unitCost || 0),
          0
        ),
      0
    )

    const grossProfit = revenue - cost

    const expenseTotal = selectedExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    )

    const netProfit = grossProfit - expenseTotal

    const productMap = new Map<
      number,
      {
        name: string
        quantity: number
        revenue: number
        cost: number
        profit: number
      }
    >()

    selectedOrders.forEach(order => {
      order.items.forEach(item => {
        const quantity = Number(item.quantity || 0)
        const itemRevenue = quantity * Number(item.unitPrice || 0)
        const orderTotal = Number(order.total || 0)
        const discountShare = orderTotal > 0
          ? Number(order.discount || 0) * (itemRevenue / orderTotal)
          : 0
        const netItemRevenue = itemRevenue - discountShare

        const current = productMap.get(item.productId) || {
          name: item.productName,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        }

        current.quantity += quantity
        current.revenue += netItemRevenue
        current.cost += quantity * Number(item.unitCost || 0)
        current.profit = current.revenue - current.cost

        productMap.set(item.productId, current)
      })
    })

    const products = Array.from(productMap.values()).sort(
      (a, b) => b.profit - a.profit
    )

    const orderDetails = selectedOrders.map(order => {
      const orderCost = order.items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) * Number(item.unitCost || 0),
        0
      )

      const orderProfit = Number(order.finalTotal || 0) - orderCost
      const orderTotal = Number(order.total || 0)
      const orderDiscount = Number(order.discount || 0)

      const itemsWithProfit = order.items.map(item => {
        const quantity = Number(item.quantity || 0)
        const itemRevenue = quantity * Number(item.unitPrice || 0)
        const itemCost = quantity * Number(item.unitCost || 0)
        const discountShare = orderTotal > 0
          ? orderDiscount * (itemRevenue / orderTotal)
          : 0

        return {
          ...item,
          netRevenue: itemRevenue - discountShare,
          profitAfterDiscount: itemRevenue - discountShare - itemCost
        }
      })

      return {
        ...order,
        orderCost,
        orderProfit,
        items: itemsWithProfit
      }
    })

    const monthOrders = orders.filter(order => {
      if (order.status === 'لغو شده') return false
      const date = orderDate(order.createdAt)
      return date >= monthStart && date <= today
    })

    const monthSales = monthOrders.reduce(
      (sum, order) => sum + Number(order.finalTotal || 0),
      0
    )

    const targetPercent = Math.min(
      100,
      Math.max(0, (monthSales / MONTHLY_TARGET) * 100)
    )

    return {
      revenue,
      cost,
      grossProfit,
      expenseTotal,
      netProfit,
      orderCount: selectedOrders.length,
      expenseCount: selectedExpenses.length,
      products,
      orderDetails,
      monthSales,
      targetPercent
    }
  }, [orders, expenses, period])

  const periodLabel: Record<Period, string> = {
    today: 'امروز',
    week: 'این هفته',
    month: 'این ماه',
    all: 'تمام مدت'
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg, #fff)',
    border: '1px solid var(--border, #e7eaf0)',
    borderRadius: 14,
    padding: 15,
    minWidth: 0
  }

  const labelStyle: React.CSSProperties = {
    color: 'var(--muted, #667085)',
    fontSize: 12,
    display: 'block',
    marginTop: 7
  }

  const valueStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 18,
    fontWeight: 800,
    overflowWrap: 'anywhere',
    marginTop: 8
  }

  async function runExport(
    exporter: () => Promise<unknown>,
    fallbackMessage: string
  ) {
    try {
      setError('')
      await exporter()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : fallbackMessage
      )
    }
  }

  return (
    <main style={{ paddingBottom: 28 }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">تحلیل عملکرد کسب‌وکار</div>
          <h2>گزارش‌های مالی و سود</h2>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}
        >
          <button
            className="primary compact"
            onClick={() => runExport(
              () => exportFinancialReport(orders, expenses, period),
              'خروجی CSV انجام نشد.'
            )}
            disabled={loading}
          >
            خروجی CSV
          </button>

          <button
            className="primary compact"
            onClick={() => runExport(
              () => exportFinancialReportExcel(orders, expenses, period),
              'خروجی اکسل انجام نشد.'
            )}
            disabled={loading}
          >
            خروجی Excel
          </button>

          <button
            className="primary compact"
            onClick={() => runExport(
              () => exportFinancialReportPDF(orders, expenses, period),
              'ساخت فایل PDF انجام نشد.'
            )}
            disabled={loading}
          >
            <FileText size={16} style={{ verticalAlign: 'middle', marginLeft: 5 }} />
            خروجی PDF
          </button>

          <button
            className="icon-btn"
            onClick={refresh}
            disabled={loading}
            aria-label="به‌روزرسانی گزارش"
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </div>

      {error && (
        <div className="empty" role="alert" style={{ color: '#a33c48' }}>
          {error}
        </div>
      )}

      <section
        style={{
          ...cardStyle,
          marginBottom: 16,
          background: 'var(--card-bg, #fff)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={19} />
          <b>بازه گزارش</b>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 7,
            marginTop: 13
          }}
        >
          {([
            ['today', 'امروز'],
            ['week', 'هفته'],
            ['month', 'ماه'],
            ['all', 'کل']
          ] as [Period, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              style={{
                border: period === value
                  ? '2px solid #294675'
                  : '1px solid var(--border, #ddd)',
                borderRadius: 9,
                padding: '10px 3px',
                background: period === value
                  ? 'var(--drawer-active, #eaf0fa)'
                  : 'transparent',
                color: 'var(--text, inherit)',
                font: 'inherit',
                fontSize: 12,
                fontWeight: period === value ? 800 : 500
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="empty">در حال محاسبه گزارش‌ها...</p>
      ) : (
        <>
          <div className="section-title">
            <h3>
              <BarChart3 size={19} />
              خلاصه {periodLabel[period]}
            </h3>
            <span>مبالغ به تومان</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10
            }}
          >
            <article style={cardStyle}>
              <TrendingUp size={21} color="#16834b" />
              <span style={labelStyle}>فروش ثبت‌شده</span>
              <strong style={valueStyle}>{money(report.revenue)}</strong>
              <small style={labelStyle}>
                {money(report.orderCount)} سفارش
              </small>
            </article>

            <article style={cardStyle}>
              <Package size={21} color="#315da8" />
              <span style={labelStyle}>بهای تمام‌شده کالا</span>
              <strong style={valueStyle}>{money(report.cost)}</strong>
              <small style={labelStyle}>
                بر اساس قیمت خرید ذخیره‌شده در سفارش
              </small>
            </article>

            <article style={cardStyle}>
              <TrendingUp size={21} color="#16834b" />
              <span style={labelStyle}>سود ناخالص</span>
              <strong
                style={{
                  ...valueStyle,
                  color: report.grossProfit >= 0 ? '#16834b' : '#b33b48'
                }}
              >
                {money(report.grossProfit)}
              </strong>
              <small style={labelStyle}>فروش منهای بهای تمام‌شده</small>
            </article>

            <article style={cardStyle}>
              <Receipt size={21} color="#b7791f" />
              <span style={labelStyle}>هزینه‌های ثبت‌شده</span>
              <strong style={valueStyle}>
                {money(report.expenseTotal)}
              </strong>
              <small style={labelStyle}>
                {money(report.expenseCount)} هزینه
              </small>
            </article>
          </div>

          <section
            style={{
              ...cardStyle,
              marginTop: 12,
              border: '1px solid #b8d8c4'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {report.netProfit >= 0
                ? <TrendingUp color="#16834b" />
                : <TrendingDown color="#b33b48" />}
              <b>سود خالص {periodLabel[period]}</b>
            </div>

            <strong
              style={{
                display: 'block',
                fontSize: 25,
                fontWeight: 900,
                marginTop: 12,
                color: report.netProfit >= 0 ? '#16834b' : '#b33b48'
              }}
            >
              {money(report.netProfit)} تومان
            </strong>

            <small style={labelStyle}>
              سود ناخالص منهای هزینه‌های ثبت‌شده در همین بازه
            </small>
          </section>

          <section style={{ ...cardStyle, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Target size={20} />
              <b>هدف فروش ماهانه</b>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 14,
                fontSize: 13
              }}
            >
              <span>فروش این ماه</span>
              <b>{money(report.monthSales)} تومان</b>
            </div>

            <div
              style={{
                height: 12,
                borderRadius: 20,
                background: 'var(--border, #e7eaf0)',
                overflow: 'hidden',
                marginTop: 10
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${report.targetPercent}%`,
                  background: '#315da8',
                  borderRadius: 20,
                  transition: 'width .25s ease'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 9,
                fontSize: 12
              }}
            >
              <b>{formatPercent(report.targetPercent)} از هدف</b>
              <span style={{ color: 'var(--muted, #667085)' }}>
                هدف: {money(MONTHLY_TARGET)}
              </span>
            </div>

            <small style={labelStyle}>
              {report.monthSales >= MONTHLY_TARGET
                ? 'هدف فروش ماهانه محقق شده است.'
                : `تا رسیدن به هدف، ${money(MONTHLY_TARGET - report.monthSales)} تومان باقی مانده است.`}
            </small>
          </section>

          <div className="section-title" style={{ marginTop: 24 }}>
            <h3>
              <Package size={19} />
              سود محصولات
            </h3>
          </div>

          {report.products.map((product, index) => (
            <article
              className="customer customer-expanded"
              key={`${product.name}-${index}`}
              style={{ marginBottom: 10 }}
            >
              <div className="customer-main">
                <div className="avatar">
                  <Package size={19} />
                </div>

                <div className="customer-info">
                  <b>{product.name}</b>
                  <small>تعداد فروش: {money(product.quantity)}</small>
                  <small>
                    مبلغ فروش پس از تخفیف: {money(product.revenue)} تومان
                  </small>
                  <small>
                    بهای تمام‌شده: {money(product.cost)} تومان
                  </small>
                  <b
                    style={{
                      color: product.profit >= 0 ? '#16834b' : '#b33b48'
                    }}
                  >
                    سود محصول: {money(product.profit)} تومان
                  </b>
                </div>
              </div>
            </article>
          ))}

          {!report.products.length && (
            <p className="empty">
              در این بازه هنوز فروشی برای نمایش وجود ندارد.
            </p>
          )}

          <div className="section-title" style={{ marginTop: 24 }}>
            <h3>
              <Receipt size={19} />
              سود و جزئیات هر سفارش
            </h3>
            <span>{money(report.orderDetails.length)} سفارش</span>
          </div>

          {report.orderDetails.map(order => {
            const expanded = expandedOrderIds.includes(order.id)

            return (
              <article
                key={order.id}
                style={{ ...cardStyle, marginBottom: 10 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <b>{order.customerName}</b>
                    <small style={labelStyle}>
                      سفارش شماره {money(order.id)}
                    </small>
                    <small style={labelStyle}>
                      تاریخ: {displayDate(order.createdAt)}
                    </small>
                    <small style={labelStyle}>وضعیت: {order.status}</small>
                  </div>

                  <button
                    onClick={() => setExpandedOrderIds(current =>
                      current.includes(order.id)
                        ? current.filter(id => id !== order.id)
                        : [...current, order.id]
                    )}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      border: '1px solid var(--border, #ddd)',
                      borderRadius: 9,
                      padding: '8px 10px',
                      background: 'transparent',
                      color: 'var(--text, inherit)',
                      font: 'inherit',
                      fontSize: 12,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {expanded ? 'بستن جزئیات' : 'جزئیات'}
                    {expanded
                      ? <ChevronUp size={16} />
                      : <ChevronDown size={16} />}
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 9,
                    marginTop: 14
                  }}
                >
                  <div>
                    <small style={labelStyle}>فروش نهایی</small>
                    <b style={{ display: 'block', marginTop: 4 }}>
                      {money(order.finalTotal)} تومان
                    </b>
                  </div>
                  <div>
                    <small style={labelStyle}>بهای تمام‌شده</small>
                    <b style={{ display: 'block', marginTop: 4 }}>
                      {money(order.orderCost)} تومان
                    </b>
                  </div>
                  <div>
                    <small style={labelStyle}>سود سفارش</small>
                    <b
                      style={{
                        display: 'block',
                        marginTop: 4,
                        color: order.orderProfit >= 0 ? '#16834b' : '#b33b48'
                      }}
                    >
                      {money(order.orderProfit)} تومان
                    </b>
                  </div>
                  <div>
                    <small style={labelStyle}>تخفیف</small>
                    <b style={{ display: 'block', marginTop: 4 }}>
                      {money(order.discount)} تومان
                    </b>
                  </div>
                </div>

                {expanded && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border, #e7eaf0)'
                    }}
                  >
                    <b style={{ fontSize: 13 }}>اقلام سفارش</b>

                    {order.items.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border, #edf0f4)'
                        }}
                      >
                        <b style={{ fontSize: 13 }}>{item.productName}</b>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 6,
                            marginTop: 5
                          }}
                        >
                          <small style={labelStyle}>
                            تعداد: {money(item.quantity)}
                          </small>
                          <small style={labelStyle}>
                            قیمت فروش واحد: {money(item.unitPrice)}
                          </small>
                          <small style={labelStyle}>
                            قیمت خرید واحد: {money(item.unitCost)}
                          </small>
                          <small style={labelStyle}>
                            فروش پس از سهم تخفیف: {money(item.netRevenue)}
                          </small>
                          <small style={labelStyle}>
                            سود ردیف پس از تخفیف: {money(item.profitAfterDiscount)}
                          </small>
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 12
                      }}
                    >
                      <span style={{ fontSize: 12 }}>
                        جمع اقلام قبل از تخفیف
                      </span>
                      <b>{money(order.total)} تومان</b>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 7
                      }}
                    >
                      <span style={{ fontSize: 12 }}>مبلغ تخفیف</span>
                      <b>{money(order.discount)} تومان</b>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 7
                      }}
                    >
                      <span style={{ fontSize: 12 }}>مبلغ نهایی سفارش</span>
                      <b>{money(order.finalTotal)} تومان</b>
                    </div>

                    {order.notes && (
                      <small style={{ ...labelStyle, lineHeight: 1.8 }}>
                        توضیحات: {order.notes}
                      </small>
                    )}
                  </div>
                )}
              </article>
            )
          })}

          {!report.orderDetails.length && (
            <p className="empty">
              در این بازه سفارشی برای نمایش وجود ندارد.
            </p>
          )}

          <section
            style={{
              ...cardStyle,
              marginTop: 18,
              fontSize: 12,
              lineHeight: 2,
              color: 'var(--muted, #667085)'
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Wallet size={18} />
              <b style={{ color: 'var(--text, #17233e)' }}>
                نکته مهم درباره محاسبه سود
              </b>
            </div>
            فروش بر اساس مبلغ نهایی سفارش محاسبه می‌شود، نه مبلغ دریافتی از مشتری.
            بهای تمام‌شده از قیمت خرید ذخیره‌شده برای اقلام همان سفارش محاسبه
            می‌شود. هزینه‌ها نیز از بخش هزینه‌های ثبت‌شده خوانده می‌شوند.
            بنابراین ثبت‌نکردن هزینه‌ها باعث می‌شود سود خالص واقعی نباشد.
          </section>
        </>
      )}
    </main>
  )
}
