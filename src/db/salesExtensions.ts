
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
  remainingAmount?: number
}

const PAYMENT_METHODS = [
  'نقدی',
  'کارت‌به‌کارت',
  'کارت‌خوان',
  'واریز بانکی',
  'سایر'
]

function validateMoney(value: number, allowZero = false): void {
  if (
    !Number.isFinite(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new Error('مبلغ واردشده معتبر نیست.')
  }
}

// ======================================
// ایجاد جدول‌های تکمیلی
// ======================================

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

// ======================================
// مدیریت مشاوره‌ها
// ======================================

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

  validateMoney(data.purchaseAmount, true)

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

  if (!['pending', 'purchased', 'not_purchased'].includes(data.result)) {
    throw new Error('نتیجه مشاوره معتبر نیست.')
  }

  validateMoney(data.purchaseAmount, true)

  await db.run(
    `UPDATE consultations
     SET name = ?,
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

// ======================================
// دریافت فهرست اقساط
// ======================================

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
      i.created_at AS createdAt,
      CASE
        WHEN i.amount - i.paid_amount < 0 THEN 0
        ELSE i.amount - i.paid_amount
      END AS remainingAmount
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
    remainingAmount: Number(row.remainingAmount || 0),
    notes: row.notes || ''
  })) as InstallmentRecord[]
}

// ======================================
// ثبت قسط جدید
// ======================================

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

  validateMoney(data.amount)

  if (!data.dueDate) {
    throw new Error('تاریخ سررسید قسط را وارد کنید.')
  }

  const orderResult = await db.query(
    `SELECT id, customer_id, final_total, status
     FROM orders
     WHERE id = ?`,
    [data.orderId]
  )

  const order = orderResult.values?.[0]

  if (!order) {
    throw new Error('سفارش موردنظر پیدا نشد.')
  }

  if (Number(order.customer_id) !== data.customerId) {
    throw new Error('این سفارش متعلق به مشتری انتخاب‌شده نیست.')
  }

  if (order.status === 'لغو شده') {
    throw new Error('برای سفارش لغوشده نمی‌توان قسط ثبت کرد.')
  }
  
const existingInstallmentsResult = await db.query(
  `SELECT COALESCE(SUM(amount), 0) AS totalAmount
   FROM installments
   WHERE order_id = ?`,
  [data.orderId]
)

const existingInstallments = Number(
  existingInstallmentsResult.values?.[0]?.totalAmount || 0
)

if (existingInstallments + data.amount > Number(order.final_total)) {
  throw new Error('مجموع اقساط نمی‌تواند از مبلغ سفارش بیشتر باشد.')
}
  
  const customerResult = await db.query(
    'SELECT id FROM customers WHERE id = ?',
    [data.customerId]
  )

  if (!customerResult.values?.length) {
    throw new Error('مشتری موردنظر پیدا نشد.')
  }

  await db.run(
    `INSERT INTO installments
     (customer_id, order_id, amount, paid_amount, due_date, status, notes)
     VALUES (?, ?, ?, 0, ?, 'pending', ?)`,
    [
      data.customerId,
      data.orderId,
      data.amount,
      data.dueDate,
      data.notes.trim() || null
    ]
  )
}

// ======================================
// ویرایش قسط
// ======================================

export async function updateInstallment(
  id: number,
  data: {
    amount: number
    dueDate: string
    notes: string
  }
): Promise<void> {
  const db = await initializeDatabase()

  validateMoney(data.amount)

  if (!data.dueDate) {
    throw new Error('تاریخ سررسید قسط را وارد کنید.')
  }

  const result = await db.query(
  `SELECT amount, paid_amount, order_id
   FROM installments
   WHERE id = ?`,
  [id]
)

  const installment = result.values?.[0]

  if (!installment) {
    throw new Error('قسط موردنظر پیدا نشد.')
  }
  
const orderResult = await db.query(
  'SELECT final_total, status FROM orders WHERE id = ?',
  [installment.order_id]
)

if (!orderResult.values?.length) {
  throw new Error('سفارش مربوط به این قسط پیدا نشد.')
}

if (orderResult.values[0].status === 'لغو شده') {
  throw new Error('قسط سفارش لغوشده قابل ویرایش نیست.')
}

const orderTotal = Number(orderResult.values[0].final_total || 0)
  
const otherInstallmentsResult = await db.query(
  `SELECT COALESCE(SUM(amount), 0) AS totalAmount
   FROM installments
   WHERE order_id = ? AND id != ?`,
  [installment.order_id, id]
)

const otherInstallments = Number(
  otherInstallmentsResult.values?.[0]?.totalAmount || 0
)

if (otherInstallments + data.amount > orderTotal) {
  throw new Error('مجموع اقساط نمی‌تواند از مبلغ سفارش بیشتر باشد.')
}
  
  const paidAmount = Number(installment.paid_amount || 0)

  if (data.amount < paidAmount) {
    throw new Error('مبلغ قسط نمی‌تواند کمتر از مبلغ دریافت‌شده باشد.')
  }

  const status = paidAmount >= data.amount ? 'paid' :
    paidAmount > 0 ? 'partial' : 'pending'

  await db.run(
    `UPDATE installments
     SET amount = ?,
         due_date = ?,
         notes = ?,
         status = ?
     WHERE id = ?`,
    [
      data.amount,
      data.dueDate,
      data.notes.trim() || null,
      status,
      id
    ]
  )
}

// ======================================
// حذف قسط
// ======================================

export async function deleteInstallment(id: number): Promise<void> {
  const db = await initializeDatabase()

  const result = await db.query(
    `SELECT paid_amount
     FROM installments
     WHERE id = ?`,
    [id]
  )

  const installment = result.values?.[0]

  if (!installment) {
    throw new Error('قسط موردنظر پیدا نشد.')
  }
const orderResult = await db.query(
  'SELECT status FROM orders WHERE id = ?',
  [installment.order_id]
)

if (!orderResult.values?.length) {
  throw new Error('سفارش مربوط به این قسط پیدا نشد.')
}

if (orderResult.values[0].status === 'لغو شده') {
  throw new Error('برای سفارش لغوشده نمی‌توان وجه قسط دریافت کرد.')
}
  
  if (Number(installment.paid_amount || 0) > 0) {
    throw new Error(
      'این قسط دریافت وجه دارد. برای حفظ سوابق مالی، حذف آن مجاز نیست.'
    )
  }

  await db.run('DELETE FROM installments WHERE id = ?', [id])
}

// ======================================
// ثبت دریافت واقعی بابت یک قسط
// ======================================

export async function recordInstallmentPayment(
  installmentId: number,
  amount: number,
  method: string,
  notes: string
): Promise<void> {
  const db = await initializeDatabase()

  validateMoney(amount)

  if (!PAYMENT_METHODS.includes(method)) {
    throw new Error('روش پرداخت معتبر نیست.')
  }

  let transactionStarted = false

  try {
    await db.beginTransaction()
    transactionStarted = true

    const installmentResult = await db.query(
      `SELECT
        id,
        customer_id,
        order_id,
        amount,
        paid_amount,
        status
       FROM installments
       WHERE id = ?`,
      [installmentId]
    )

    const installment = installmentResult.values?.[0]

    if (!installment) {
      throw new Error('قسط موردنظر پیدا نشد.')
    }

    const customerId = Number(installment.customer_id)
    const installmentAmount = Number(installment.amount || 0)
    const paidAmount = Number(installment.paid_amount || 0)
    const remainingInstallment = installmentAmount - paidAmount

    if (remainingInstallment <= 0) {
      throw new Error('این قسط قبلاً به‌طور کامل تسویه شده است.')
    }

    if (amount > remainingInstallment) {
      throw new Error(
        `مبلغ دریافت بیشتر از مانده قسط است. مانده قسط: ${Math.floor(remainingInstallment)} تومان`
      )
    }
    
    const newPaidAmount = paidAmount + amount

    const newStatus =
      newPaidAmount >= installmentAmount
        ? 'paid'
        : 'partial'

    await db.run(
      `INSERT INTO payments
       (customer_id, amount, method, notes)
       VALUES (?, ?, ?, ?)`,
      [
        customerId,
        amount,
        method,
        notes.trim()
          ? `دریافت بابت قسط شماره ${installmentId} - ${notes.trim()}`
          : `دریافت بابت قسط شماره ${installmentId}`
      ],
      false
    )

    await db.run(
      `UPDATE installments
       SET paid_amount = ?,
           status = ?
       WHERE id = ?`,
      [
        newPaidAmount,
        newStatus,
        installmentId
      ],
      false
    )

    await db.commitTransaction()
    transactionStarted = false

  } catch (error) {
    if (transactionStarted) {
      try {
        await db.rollbackTransaction()
      } catch {
        // حفظ خطای اصلی
      }
    }

    throw error
  }
}
