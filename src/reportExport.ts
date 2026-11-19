
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { OrderRecord, ExpenseRecord } from './db/database'

const csvCell = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

const money = (value: number) =>
  Math.round(Number(value) || 0).toString()

export async function exportFinancialReport(
  orders: OrderRecord[],
  expenses: ExpenseRecord[]
) {
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

  for (const order of orders) {
    if (order.status === 'لغو شده') continue

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

  for (const expense of expenses) {
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
    `CRM-Financial-Report-${new Date().toISOString().slice(0, 10)}.csv`

  const file = await Filesystem.writeFile({
    path: fileName,
    data: csv,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  })

  await Share.share({
    title: 'گزارش مالی CRM',
    text: 'گزارش فروش، سود سفارش‌ها و هزینه‌ها',
    url: file.uri,
    dialogTitle: 'ذخیره یا ارسال گزارش مالی'
  })
}
