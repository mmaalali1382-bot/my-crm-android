
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

// ذخیره یا ویرایش اطلاعات تکمیلی مشتری
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
}
