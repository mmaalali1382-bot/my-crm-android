
export async function deleteCustomer(id: number): Promise<void> {
  const d = await initializeDatabase()
  let transactionStarted = false

  try {
    await d.beginTransaction()
    transactionStarted = true

    const customer = await d.query(
      'SELECT id FROM customers WHERE id = ?',
      [id]
    )

    if (!customer.values?.length) {
      throw new Error('مشتری پیدا نشد.')
    }

    const activeOrders = await d.query(
      `SELECT id FROM orders
       WHERE customer_id = ? AND status != 'لغو شده'`,
      [id]
    )

    for (const order of activeOrders.values || []) {
      const items = await d.query(
        `SELECT product_id AS productId, quantity
         FROM order_items WHERE order_id = ?`,
        [Number(order.id)]
      )

      for (const item of items.values || []) {
        const productId = Number(item.productId || 0)
        const quantity = Number(item.quantity || 0)

        if (productId > 0 && quantity > 0) {
          await d.run(
            `UPDATE products
             SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [quantity, productId],
            false
          )
        }
      }
    }

    const tableExists = async (name: string): Promise<boolean> => {
      const result = await d.query(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name = ?`,
        [name]
      )
      return !!result.values?.length
    }

    const hasFollowUps = await tableExists('follow_ups')
    const hasInstallments = await tableExists('installments')
    const hasRefunds = await tableExists('refunds')
    const hasCredits = await tableExists('customer_credits')
    const hasSettlements = await tableExists('cancellation_settlements')

    if (hasFollowUps) {
      await d.run(
        'DELETE FROM follow_ups WHERE customer_id = ?',
        [id],
        false
      )
    }

    if (hasInstallments) {
      await d.run(
        `DELETE FROM installments
         WHERE customer_id = ?
         OR order_id IN (
           SELECT id FROM orders WHERE customer_id = ?
         )`,
        [id, id],
        false
      )
    }

    if (hasRefunds) {
      await d.run(
        `DELETE FROM refunds
         WHERE customer_id = ?
         OR order_id IN (
           SELECT id FROM orders WHERE customer_id = ?
         )`,
        [id, id],
        false
      )
    }

    if (hasCredits) {
      await d.run(
        `DELETE FROM customer_credits
         WHERE customer_id = ?
         OR order_id IN (
           SELECT id FROM orders WHERE customer_id = ?
         )`,
        [id, id],
        false
      )
    }

    if (hasSettlements) {
      await d.run(
        `DELETE FROM cancellation_settlements
         WHERE customer_id = ?
         OR order_id IN (
           SELECT id FROM orders WHERE customer_id = ?
         )`,
        [id, id],
        false
      )
    }

    await d.run(
      'DELETE FROM payments WHERE customer_id = ?',
      [id],
      false
    )

    await d.run(
      `DELETE FROM order_items
       WHERE order_id IN (
         SELECT id FROM orders WHERE customer_id = ?
       )`,
      [id],
      false
    )

    await d.run(
      'DELETE FROM orders WHERE customer_id = ?',
      [id],
      false
    )

    await d.run(
      'DELETE FROM customers WHERE id = ?',
      [id],
      false
    )

    await d.commitTransaction()
    transactionStarted = false
  } catch (error) {
    if (transactionStarted) {
      try {
        await d.rollbackTransaction()
      } catch {}
    }

    throw error
  }
}
