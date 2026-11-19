
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import * as XLSX from 'xlsx'
// @ts-ignore - html2pdf.js does not provide TypeScript declarations
import html2pdf from 'html2pdf.js'
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
  today: 'امروز',
  week: 'این هفته',
  month: 'این ماه',
  all: 'تمام مدت'
}

const filePeriodLabels: Record<ReportPeriod, string> = {
  today: 'Today',
  week: 'This-Week',
  month: 'This-Month',
  all: 'All-Time'
}

const buildReportRows = (
  orders: OrderRecord[],
  expenses: ExpenseRecord[],
  period: ReportPeriod
): string[][] => {
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

  return rows
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export async function exportFinancialReport(
  orders: OrderRecord[],
  expenses: ExpenseRecord[],
  period: ReportPeriod
) {
  const rows = buildReportRows(orders, expenses, period)

  const csv = '\uFEFF' + rows
    .map(row => row.map(csvCell).join(','))
    .join('\r\n')

  const fileName =
    `CRM-Financial-Report-${filePeriodLabels[period]}-${localDateKey(new Date())}.csv`

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

export async function exportFinancialReportExcel(
  orders: OrderRecord[],
  expenses: ExpenseRecord[],
  period: ReportPeriod
) {
  const rows = buildReportRows(orders, expenses, period)

  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 25 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'گزارش مالی'
  )

  const excelBase64 = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'base64'
  })

  const fileName =
    `CRM-Financial-Report-${filePeriodLabels[period]}-${localDateKey(new Date())}.xlsx`

  const file = await Filesystem.writeFile({
    path: fileName,
    data: excelBase64,
    directory: Directory.Cache
  })

  await Share.share({
    title: 'گزارش مالی اکسل CRM',
    text: `گزارش اکسل فروش، سود سفارش‌ها و هزینه‌ها - ${periodLabels[period]}`,
    url: file.uri,
    dialogTitle: 'ذخیره یا ارسال فایل اکسل'
  })
}

export async function exportFinancialReportPDF(
  orders: OrderRecord[],
  expenses: ExpenseRecord[],
  period: ReportPeriod
) {
  const rows = buildReportRows(orders, expenses, period)

  const selectedOrders = orders.filter(order => {
    if (order.status === 'لغو شده') return false
    const date = dateKey(order.createdAt)
    const { start, end } = getPeriodDates(period)
    return !!date && (
      period === 'all' || (date >= start && date <= end)
    )
  })

  const selectedExpenses = expenses.filter(expense => {
    const date = dateKey(expense.expenseDate || '')
    const { start, end } = getPeriodDates(period)
    return !!date && (
      period === 'all' || (date >= start && date <= end)
    )
  })

  const revenue = selectedOrders.reduce(
    (sum, order) => sum + Number(order.finalTotal || 0),
    0
  )

  const cost = selectedOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce(
        (itemSum, item) =>
          itemSum +
          Number(item.quantity || 0) * Number(item.unitCost || 0),
        0
      ),
    0
  )

  const expenseTotal = selectedExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  )

  const grossProfit = revenue - cost
  const netProfit = grossProfit - expenseTotal

  const container = document.createElement('div')

  container.dir = 'rtl'
  container.style.cssText = [
    'width: 100%',
    'box-sizing: border-box',
    'padding: 24px',
    'background: #ffffff',
    'color: #17233e',
    'font-family: Tahoma, Arial, sans-serif',
    'direction: rtl',
    'text-align: right'
  ].join(';')

  const tableHeaders = rows[0]
  const tableRows = rows.slice(1)

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:9px;direction:rtl;text-align:right;">
      <thead>
        <tr>
          ${tableHeaders.map(header =>
            `<th style="background:#243b63;color:#fff;border:1px solid #d5dbe5;padding:8px;text-align:right;">${escapeHtml(header)}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows.length
          ? tableRows.map((row, index) => `
            <tr style="background:${index % 2 === 0 ? '#f5f7fb' : '#ffffff'};">
              ${row.map(cell =>
                `<td style="border:1px solid #d5dbe5;padding:7px;text-align:right;vertical-align:top;word-break:break-word;">${escapeHtml(cell)}</td>`
              ).join('')}
            </tr>
          `).join('')
          : `<tr><td colspan="${tableHeaders.length}" style="border:1px solid #d5dbe5;padding:15px;text-align:center;">در این بازه اطلاعاتی ثبت نشده است.</td></tr>`
        }
      </tbody>
    </table>
  `

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="font-size:22px;margin:0 0 8px;color:#243b63;">گزارش مالی CRM</h1>
      <div style="font-size:13px;color:#596579;">
        بازه گزارش: ${escapeHtml(periodLabels[period])}
      </div>
      <div style="font-size:10px;color:#7b8493;margin-top:6px;">
        تاریخ تهیه گزارش: ${escapeHtml(new Intl.DateTimeFormat('fa-IR').format(new Date()))}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:18px;">
      ${[
        ['فروش ثبت‌شده', revenue],
        ['بهای تمام‌شده', cost],
        ['سود ناخالص', grossProfit],
        ['هزینه‌ها', expenseTotal],
        ['سود خالص', netProfit]
      ].map(([label, amount]) => `
        <div style="border:1px solid #d5dbe5;border-radius:8px;padding:10px;background:#f7f9fc;">
          <div style="font-size:10px;color:#667085;margin-bottom:6px;">${label}</div>
          <strong style="font-size:14px;color:#243b63;">${new Intl.NumberFormat('fa-IR').format(Number(amount))} تومان</strong>
        </div>
      `).join('')}
    </div>

    <h2 style="font-size:15px;color:#243b63;margin:18px 0 10px;">جزئیات سفارش‌ها و هزینه‌ها</h2>
    ${tableHtml}

    <div style="font-size:9px;color:#7b8493;margin-top:16px;line-height:1.8;">
      فروش بر اساس مبلغ نهایی سفارش‌های غیرلغوشده محاسبه شده است.
      سود خالص برابر سود ناخالص منهای هزینه‌های ثبت‌شده است.
      مبالغ به تومان هستند.
    </div>
  `

  document.body.appendChild(container)

  try {
    const pdfDataUri = await html2pdf()
      .set({
        margin: [8, 6, 8, 6],
        filename: 'financial-report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape'
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['tr', 'th']
        }
      })
      .from(container)
      .outputPdf('datauristring')

    const base64 = String(pdfDataUri).split(',')[1]

    if (!base64) {
      throw new Error('ساخت فایل PDF ناموفق بود.')
    }

    const fileName =
      `CRM-Financial-Report-${filePeriodLabels[period]}-${localDateKey(new Date())}.pdf`

    const file = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache
    })

    await Share.share({
      title: 'گزارش مالی PDF',
      text: `گزارش PDF فروش، سود و هزینه‌ها - ${periodLabels[period]}`,
      url: file.uri,
      dialogTitle: 'ذخیره یا ارسال گزارش PDF'
    })
  } finally {
    document.body.removeChild(container)
  }
}
