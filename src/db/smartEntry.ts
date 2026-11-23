
import { initializeDatabase } from './database'
import { ensureCustomerDetailsSchema } from './customerDetails'

type SmartEntryInput = {
  name: string
  phone: string
  address: string
  productId: number | null
  customName: string
  customPrice: number
  customCost: number
  quantity: number
  paid: number
  method: string
  notes: string
}

export async function addSmartEntry(
  input: SmartEntryInput
): Promise<void> {
  const d = await initializeDatabase()

  await ensureCustomerDetailsSchema()

  const phone = input.phone.trim()
  const name = input.name.trim()
  const quantity = input.quantity
  const payment = input.paid

  if (!/^09\d{9}$/.test(phone)) {
    throw new Error('شماره موبایل معتبر نیست.')
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('تعداد معتبر نیست.')
  }

  const methods = [
    'نقدی',
    'کارت‌به‌کارت',
    'کارت‌خوان',
    'واریز بانکی',
    'سایر'
  ]

  if (!methods.includes(input.method)) {
    throw new Error('روش پرداخت معتبر نیست.')
  }

  let transactionStarted = false

  try {
    await d.beginTransaction()
    transactionStarted = true

    let customerResult = await d.query(
      'SELECT id FROM customers WHERE phone = ? LIMIT 1',
      [phone]
    )

    let customerId: number

    if (customerResult.values?.length) {
      customerId = Number(customerResult.values[0].id)
    } else {
      if (!name) {
        throw new Error('نام مشتری را وارد کن.')
      }

      const inserted = await d.run(
        `INSERT INTO customers(name,phone,stage)
         VALUES(?,?,?)`,
        [name, phone, 'مشتری جدید'],
        false
      )

      customerId = Number(inserted.changes?.lastId || 0)

      if (!customerId) {
        throw new Error('ثبت مشتری انجام نشد.')
      }
    }

    if (input.address.trim()) {
      await d.run(
        `UPDATE customers
         SET address = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [input.address.trim(), customerId],
        false
      )
    }

    let productName = ''
    let unitPrice = 0
    let unitCost = 0
    let stockProductId = 0

    if (input.productId === null) {
      productName = input.customName.trim()
      unitPrice = input.customPrice
      unitCost = input.customCost

      if (!productName) {
        throw new Error('نام پک یا محصول را وارد کن.')
      }

      if (unitPrice <= 0 || unitCost < 0) {
        throw new Error('قیمت محصول معتبر نیست.')
      }
    } else {
      const productResult = await d.query(
        `SELECT id,name,price,cost,stock
         FROM products WHERE id = ?`,
        [input.productId]
      )

      const product = productResult.values?.[0] as
        | {
            id: number
            name: string
            price: number
            cost: number
            stock: number
          }
        | undefined

      if (!product) {
        throw new Error('محصول پیدا نشد.')
      }

      if (Number(product.stock) < quantity) {
        throw new Error('موجودی محصول کافی نیست.')
      }

      productName = product.name
      unitPrice = Number(product.price)
      unitCost = Number(product.cost)
      stockProductId = Number(product.id)
    }

    const total = unitPrice * quantity

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error('مبلغ سفارش معتبر نیست.')
    }

    if (
      !Number.isFinite(payment) ||
      payment < 0 ||
      payment > total
    ) {
      throw new Error('مبلغ پرداخت معتبر نیست.')
    }

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
        input.notes.trim() || null
      ],
      false
    )

    const orderId = Number(orderResult.changes?.lastId || 0)

    if (!orderId) {
      throw new Error('ثبت سفارش انجام نشد.')
    }

    await d.run(
      `INSERT INTO order_items
       (order_id,product_id,product_name,quantity,unit_price,unit_cost)
       VALUES(?,?,?,?,?,?)`,
      [
        orderId,
        stockProductId,
        productName,
        quantity,
        unitPrice,
        unitCost
      ],
      false
    )

    if (stockProductId > 0) {
      const stockUpdate = await d.run(
        `UPDATE products
         SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stock >= ?`,
        [quantity, stockProductId, quantity],
        false
      )

      if (stockUpdate.changes?.changes !== 1) {
        throw new Error('کسر موجودی انجام نشد.')
      }
    }

    if (payment > 0) {
      await d.run(
        `INSERT INTO payments
         (customer_id,amount,method,notes)
         VALUES(?,?,?,?)`,
        [
          customerId,
          payment,
          input.method,
          'پرداخت ثبت‌شده از دستیار ورود'
        ],
        false
      )
    }

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
