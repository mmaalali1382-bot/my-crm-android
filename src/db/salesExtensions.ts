
import { initializeDatabase } from './database'

export type ConsultationResult =
  | 'pending'
  | 'purchased'
  | 'not_purchased'

export type ConsultationRecord = {
  id: number
  name: string
  phone: string
  topic: string
  notes: string
  result: ConsultationResult
  purchaseAmount: number
  followUpDate: string
  createdAt: string
}

export type InstallmentRecord = {
  id: number
  customerId: number
  customerName: string
  orderId: number
  amount: number
  paidAmount: number
  dueDate: string
  status: string
  notes: string
  createdAt: string
}

export async function ensureSalesExtensionsSchema(): Promise<void> {
  const db = await initializeDatabase()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      notes TEXT,
      result TEXT NOT NULL DEFAULT 'pending',
      purchase_amount REAL NOT NULL DEFAULT 0,
      follow_up_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
  `)
}

export async function getConsultations(): Promise<ConsultationRecord[]> {
  const db = await initializeDatabase()

  const result = await db.query(`
    SELECT
      id,
      name,
      phone,
      topic,
      notes,
      result,
      purchase_amount AS purchaseAmount,
      follow_up_date AS followUpDate,
      created_at AS createdAt
    FROM consultations
    ORDER BY id DESC
  `)

  return (result.values || []).map((row: any) => ({
    ...row,
    name: row.name || '',
    topic: row.topic || '',
    notes: row.notes || '',
    result: row.result || 'pending',
    purchaseAmount: Number(row.purchaseAmount || 0),
    followUpDate: row.followUpDate || ''
  })) as ConsultationRecord[]
}

export async function addConsultation(data: {
  name: string
  phone: string
  topic: string
  notes: string
  result: ConsultationResult
  purchaseAmount: number
  followUpDate: string
}): Promise<void> {
  const db = await initializeDatabase()

  const phone = data.phone.trim()

  if (!phone) {
    throw new Error('شماره تماس را وارد کنید.')
  }

  if (!['pending', 'purchased', 'not_purchased'].includes(data.result)) {
    throw new Error('نتیجه مشاوره معتبر نیست.')
  }

  if (
    !Number.isFinite(data.purchaseAmount) ||
    data.purchaseAmount < 0
  ) {
    throw new Error('مبلغ خرید معتبر نیست.')
  }

  await db.run(
    `INSERT INTO consultations
     (name, phone, topic, notes, result, purchase_amount, follow_up_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name.trim(),
      phone,
      data.topic.trim(),
      data.notes.trim() || null,
      data.result,
      data.purchaseAmount,
      data.followUpDate || null
    ]
  )
}

export async function updateConsultation(
  id: number,
  data: {
    name: string
    phone: string
    topic: string
    notes: string
    result: ConsultationResult
    purchaseAmount: number
    followUpDate: string
  }
): Promise<void> {
  const db = await initializeDatabase()

  if (!data.phone.trim()) {
    throw new Error('شماره تماس را وارد کنید.')
  }

  if (
    !Number.isFinite(data.purchaseAmount) ||
    data.purchaseAmount < 0
  ) {
    throw new Error('مبلغ خرید معتبر نیست.')
  }

  await db.run(
    `UPDATE consultations SET
      name = ?,
      phone = ?,
      topic = ?,
      notes = ?,
      result = ?,
      purchase_amount = ?,
      follow_up_date = ?
     WHERE id = ?`,
    [
      data.name.trim(),
      data.phone.trim(),
      data.topic.trim(),
      data.notes.trim() || null,
      data.result,
      data.purchaseAmount,
      data.followUpDate || null,
      id
    ]
  )
}

export async function deleteConsultation(id: number): Promise<void> {
  const db = await initializeDatabase()
  await db.run('DELETE FROM consultations WHERE id = ?', [id])
}

export async function getInstallments(): Promise<InstallmentRecord[]> {
  const db = await initializeDatabase()

  const result = await db.query(`
    SELECT
      i.id,
      i.customer_id AS customerId,
      c.name AS customerName,
      i.order_id AS orderId,
      i.amount,
      i.paid_amount AS paidAmount,
      i.due_date AS dueDate,
      i.status,
      i.notes,
      i.created_at AS createdAt
    FROM installments i
    LEFT JOIN customers c ON c.id = i.customer_id
    ORDER BY
      CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END,
      i.due_date ASC,
      i.id DESC
  `)

  return (result.values || []).map((row: any) => ({
    ...row,
    customerName: row.customerName || 'مشتری حذف‌شده',
    amount: Number(row.amount || 0),
    paidAmount: Number(row.paidAmount || 0),
    notes: row.notes || ''
  })) as InstallmentRecord[]
}

export async function addInstallment(data: {
  customerId: number
  orderId: number
  amount: number
  dueDate: string
  notes: string
}): Promise<void> {
  const db = await initializeDatabase()

  if (
    !Number.isInteger(data.customerId) ||
    data.customerId <= 0 ||
    !Number.isInteger(data.orderId) ||
    data.orderId <= 0
  ) {
    throw new Error('مشتری یا سفارش معتبر نیست.')
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('مبلغ قسط باید بیشتر از صفر باشد.')
  }

  if (!data.dueDate) {
    throw new Error('تاریخ سررسید قسط را وارد کنید.')
  }

  await db.run(
    `INSERT INTO installments
     (customer_id, order_id, amount, due_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.customerId,
      data.orderId,
      data.amount,
      data.dueDate,
      data.notes.trim() || null
    ]
  )
}
