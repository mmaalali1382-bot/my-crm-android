import { initializeDatabase } from './database'

export async function addCustomOrder(
  customerId: number,
  productName: string,
  quantity: number,
  unitPrice: number,
  unitCost: number,
  notes: string
): Promise<void> {
  const d = await initializeDatabase()

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error('مشتری معتبر نیست.')
  }

  if (!productName.trim()) {
    throw new Error('نام پک یا محصول را وارد کن.')
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('تعداد باید حداقل یک باشد.')
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error('قیمت هر عدد معتبر نیست.')
  }

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error('بهای تمام‌شده معتبر نیست.')
  }

  const customer = await d.query(
    'SELECT id FROM customers WHERE id = ?',
    [customerId]
  )

  if (!customer.values?.length) {
    throw new Error('مشتری پیدا نشد.')
  }

  const total = quantity * unitPrice
  let transactionStarted = false

  try {
    await d.beginTransaction()
    transactionStarted = true

    const orderResult = await d.run(
      `INSERT INTO orders
       (customer_id,total,discount,final_total,status,notes)
       VALUES(?,?,?,?,?,?)`,
      [
        customerId,
        total,
        0,
        total,
        'ثبت شده',
        notes.trim() || 'سفارش پک یا محصول متفرقه'
      ],
      false
    )

    const orderId = orderResult.changes?.lastId

    if (!orderId) {
      throw new Error('ثبت سفارش انجام نشد.')
    }

    await d.run(
      `INSERT INTO order_items
       (order_id,product_id,product_name,quantity,unit_price,unit_cost)
       VALUES(?,?,?,?,?,?)`,
      [
        orderId,
        0,
        productName.trim(),
        quantity,
        unitPrice,
        unitCost
      ],
      false
    )

    await d.commitTransaction()
    transactionStarted = false
  } catch (error) {
    if (transactionStarted) {
      try {
        await d.rollbackTransaction()
      } catch {
        // حفظ خطای اصلی
      }
    }

    throw error
  }
}
