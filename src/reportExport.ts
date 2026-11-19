import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { OrderRecord, ExpenseRecord } from './db/database'

type ReportPeriod = 'today' | 'week' | 'month' | 'all'

const csvCell = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

const money = (value: number) =>
  Math.round(Number(value) || 0).toString()

const dateKey = (value: string) =>
  String(value || '').slice(0, 10).replace(/\//g, '-')

const localDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')

const getPeriodDates = (period: ReportPeriod) => {
  const now = new Date()
  const today = localDateKey(now)

  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const day = weekStart.getDay()
  weekStart.setDate(
    weekStart.getDate() - (day === 0 ? 6 : day - 1)
  )

  const monthStart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    '01'
  ].join('-')

  if (period === 'today') {
    return { start: today, end: today }
  }

  if (period === 'week') {
    return { start: localDateKey(weekStart), end: today }
  }

  if (period === 'month') {
    return { start: monthStart, end: today }
  }

  return { start: '', end: '' }
}

const periodLabels: Record<ReportPeriod, string> = {
  today: 'Today',
  week: 'This-Week',
  month: 'This-Month',
  all: 'All-Time'
}

export async function exportFinancialReport(
  orders: OrderRecord[],
  expenses: ExpenseRecord[],
  period: ReportPeriod
) {
  const { start, end } = getPeriodDates(period)

  const isInPeriod = (value: string) => {
    const date = dateKey(value)
    if (!date) return false
    if (period === 'all') return true
    return date >= start && date <= end
  }

  const selectedOrders = orders.filter(order => {
    if (order.status === 'لغو شده') return false
    return isInPeriod(order.createdAt)
  })

  const selectedExpenses = expenses.filter(expense =>
    isInPeriod(expense.expenseDate || '')
  )

  const rows: string[][] = [
    [
      'نوع رکورد',
      'شماره سفارش',
      'نام مشتری یا هزینه',
      'تاریخ',
      'وضعیت',
      'مبلغ فروش',
      'تخفیف',
      'بهای تمام شده',
      'سود سفارش',
      'مبلغ هزینه',
      'توضیحات'
    ]
  ]

  for (const order of selectedOrders) {
    const cost = order.items.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    )

    rows.push([
      'سفارش',
      String(order.id),
      order.customerName,
      order.createdAt,
      order.status,
      money(order.finalTotal),
      money(order.discount),
      money(cost),
      money(Number(order.finalTotal || 0) - cost),
      '0',
      order.notes || ''
    ])
  }

  for (const expense of selectedExpenses) {
    rows.push([
      'هزینه',
      '',
      expense.title,
      expense.expenseDate,
      expense.category,
      '0',
      '0',
      '0',
      '0',
      money(expense.amount),
      expense.notes || ''
    ])
  }

  const csv = '\uFEFF' + rows
    .map(row => row.map(csvCell).join(','))
    .join('\r\n')

  const fileName =
    `CRM-Financial-Report-${periodLabels[period]}-${localDateKey(new Date())}.csv`

  const file = await Filesystem.writeFile({
    path: fileName,
    data: csv,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  })

  await Share.share({
    title: 'گزارش مالی CRM',
    text: `گزارش فروش، سود سفارش‌ها و هزینه‌ها - ${periodLabels[period]}`,
    url: file.uri,
    dialogTitle: 'ذخیره یا ارسال گزارش مالی'
  })
}
