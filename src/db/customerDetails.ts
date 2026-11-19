
import { initializeDatabase } from './database'

export type CustomerDetails = {
  alternatePhone: string
  city: string
  job: string
  customerType: string
  leadSource: string
  preferredContact: string
  interests: string
  productsWanted: string
  budget: number
  lastContact: string
  negotiationResult: string
  priority: string
  followUpDate: string
}

const columns: Record<string, string> = {
  alternate_phone: 'TEXT',
  city: 'TEXT',
  job: 'TEXT',
  customer_type: "TEXT DEFAULT 'عادی'",
  lead_source: 'TEXT',
  preferred_contact: 'TEXT',
  interests: 'TEXT',
  products_wanted: 'TEXT',
  budget: 'REAL DEFAULT 0',
  last_contact: 'TEXT',
  negotiation_result: 'TEXT',
  priority: "TEXT DEFAULT 'متوسط'",
  follow_up_date: 'TEXT'
}

// افزودن ستون‌های جدید بدون حذف اطلاعات قبلی
export async function ensureCustomerDetailsSchema(): Promise<void> {
  const db = await initializeDatabase()

  const result = await db.query('PRAGMA table_info(customers)')
  const existingColumns = new Set(
    (result.values || []).map((column: any) => column.name)
  )

  for (const [name, definition] of Object.entries(columns)) {
    if (!existingColumns.has(name)) {
      await db.execute(
        `ALTER TABLE customers ADD COLUMN ${name} ${definition}`
      )
    }
  }
}

// آماده‌سازی جدول پیگیری‌ها و ستون تشخیص پیگیری خودکار
async function ensureFollowUpSchema(): Promise<void> {
  const db = await initializeDatabase()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
  `)

  const result = await db.query('PRAGMA table_info(follow_ups)')
  const existingColumns = new Set(
    (result.values || []).map((column: any) => column.name)
  )

  if (!existingColumns.has('source')) {
    await db.execute(
      "ALTER TABLE follow_ups ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'"
    )
  }
}

// هماهنگ‌سازی خودکار تاریخ پیگیری مشتری با بخش پیگیری‌ها
async function syncCustomerFollowUp(
  customerId: number,
  followUpDate: string
): Promise<void> {
  const db = await initializeDatabase()

  await ensureFollowUpSchema()

  const existing = await db.query(
    `SELECT id, due_date AS dueDate
     FROM follow_ups
     WHERE customer_id = ?
       AND source = 'customer'
       AND status = 'pending'
     ORDER BY id DESC`,
    [customerId]
  )

  const pendingItems = existing.values || []

  // اگر تاریخ پیگیری پاک شده باشد، پیگیری خودکارِ باز حذف می‌شود
  if (!followUpDate) {
    await db.run(
      `DELETE FROM follow_ups
       WHERE customer_id = ?
         AND source = 'customer'
         AND status = 'pending'`,
      [customerId]
    )
    return
  }

  // اگر قبلاً پیگیری خودکار باز وجود داشته باشد، همان را به‌روزرسانی می‌کنیم
  if (pendingItems.length > 0) {
    const mainId = Number(pendingItems[0].id)

    await db.run(
      `UPDATE follow_ups
       SET due_date = ?, topic = ?
       WHERE id = ?`,
      [
        followUpDate,
        'پیگیری خودکار از فرم مشتری',
        mainId
      ]
    )

    // پاک‌سازی موارد خودکار تکراریِ باز، بدون دست‌زدن به پیگیری‌های دستی
    for (const item of pendingItems.slice(1)) {
      await db.run(
        `DELETE FROM follow_ups
         WHERE id = ? AND source = 'customer'`,
        [Number(item.id)]
      )
    }

    return
  }

  // اگر همین پیگیری قبلاً انجام شده، دوباره ساخته نشود
  const completed = await db.query(
    `SELECT id
     FROM follow_ups
     WHERE customer_id = ?
       AND source = 'customer'
       AND due_date = ?
       AND status = 'done'
     LIMIT 1`,
    [customerId, followUpDate]
  )

  if (completed.values?.length) return

  // ایجاد پیگیری جدید به‌صورت خودکار
  await db.run(
    `INSERT INTO follow_ups
     (customer_id, topic, due_date, status, source)
     VALUES (?, ?, ?, 'pending', 'customer')`,
    [
      customerId,
      'پیگیری خودکار از فرم مشتری',
      followUpDate
    ]
  )
}

// دریافت اطلاعات تکمیلی یک مشتری
export async function getCustomerDetails(
  customerId: number
): Promise<CustomerDetails | null> {
  const db = await initializeDatabase()

  const result = await db.query(
    `SELECT
      alternate_phone AS alternatePhone,
      city,
      job,
      customer_type AS customerType,
      lead_source AS leadSource,
      preferred_contact AS preferredContact,
      interests,
      products_wanted AS productsWanted,
      budget,
      last_contact AS lastContact,
      negotiation_result AS negotiationResult,
      priority,
      follow_up_date AS followUpDate
    FROM customers
    WHERE id = ?`,
    [customerId]
  )

  if (!result.values?.length) return null

  const row = result.values[0] as CustomerDetails

  return {
    alternatePhone: row.alternatePhone || '',
    city: row.city || '',
    job: row.job || '',
    customerType: row.customerType || 'عادی',
    leadSource: row.leadSource || '',
    preferredContact: row.preferredContact || '',
    interests: row.interests || '',
    productsWanted: row.productsWanted || '',
    budget: Number(row.budget || 0),
    lastContact: row.lastContact || '',
    negotiationResult: row.negotiationResult || '',
    priority: row.priority || 'متوسط',
    followUpDate: row.followUpDate || ''
  }
}

// ذخیره اطلاعات مشتری و هماهنگ‌سازی خودکار پیگیری
export async function saveCustomerDetails(
  customerId: number,
  details: CustomerDetails
): Promise<void> {
  const db = await initializeDatabase()

  if (!Number.isFinite(details.budget) || details.budget < 0) {
    throw new Error('بودجه مشتری معتبر نیست.')
  }

  await db.run(
    `UPDATE customers SET
      alternate_phone = ?,
      city = ?,
      job = ?,
      customer_type = ?,
      lead_source = ?,
      preferred_contact = ?,
      interests = ?,
      products_wanted = ?,
      budget = ?,
      last_contact = ?,
      negotiation_result = ?,
      priority = ?,
      follow_up_date = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      details.alternatePhone.trim() || null,
      details.city.trim() || null,
      details.job.trim() || null,
      details.customerType || 'عادی',
      details.leadSource.trim() || null,
      details.preferredContact || null,
      details.interests.trim() || null,
      details.productsWanted.trim() || null,
      details.budget,
      details.lastContact || null,
      details.negotiationResult.trim() || null,
      details.priority || 'متوسط',
      details.followUpDate || null,
      customerId
    ]
  )

  await syncCustomerFollowUp(customerId, details.followUpDate)
}
