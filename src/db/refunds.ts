
import { initializeDatabase } from './database';

export type RefundRecord = {
  id: number;
  customerId: number;
  orderId: number | null;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
};

export type CustomerCreditRecord = {
  id: number;
  customerId: number;
  orderId: number | null;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  notes: string | null;
  createdAt: string;
};

export type CancellationSettlement = {
  customerId: number;
  orderId: number;
  paidAmount: number;
  refundAmount: number;
  creditAmount: number;
  refundMethod: string;
  notes?: string;
};

export async function ensureRefundSchema(): Promise<void> {
  const db = await initializeDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      order_id INTEGER,
      amount REAL NOT NULL CHECK(amount > 0),
      method TEXT NOT NULL DEFAULT 'نقدی',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS customer_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      order_id INTEGER,
      amount REAL NOT NULL CHECK(amount > 0),
      used_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS cancellation_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL UNIQUE,
      paid_amount REAL NOT NULL DEFAULT 0,
      refund_amount REAL NOT NULL DEFAULT 0,
      credit_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
  `);
}

export async function settleCanceledOrder(
  data: CancellationSettlement
): Promise<void> {
  const db = await initializeDatabase();
  await ensureRefundSchema();

  const {
    customerId,
    orderId,
    paidAmount,
    refundAmount,
    creditAmount,
    refundMethod,
    notes = ''
  } = data;

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0 ||
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    throw new Error('مشتری یا سفارش معتبر نیست.');
  }

  if (
    !Number.isFinite(paidAmount) ||
    !Number.isFinite(refundAmount) ||
    !Number.isFinite(creditAmount) ||
    paidAmount < 0 ||
    refundAmount < 0 ||
    creditAmount < 0
  ) {
    throw new Error('مبالغ واردشده معتبر نیستند.');
  }

  if (Math.abs(refundAmount + creditAmount - paidAmount) > 0.001) {
    throw new Error(
      'مجموع مبلغ بازپرداخت و اعتبار باید دقیقاً برابر مبلغ پرداخت‌شده باشد.'
    );
  }

  if (refundAmount > 0 && !refundMethod.trim()) {
    throw new Error('روش بازپرداخت را مشخص کنید.');
  }

  let transactionStarted = false;

  try {
    await db.beginTransaction();
    transactionStarted = true;

    const orderResult = await db.query(
      `SELECT id, customer_id AS customerId, status
       FROM orders WHERE id = ?`,
      [orderId]
    );

    const order = orderResult.values?.[0] as
      | { id: number; customerId: number; status: string }
      | undefined;

    if (!order) throw new Error('سفارش پیدا نشد.');
    if (Number(order.customerId) !== customerId) {
      throw new Error('این سفارش متعلق به مشتری انتخاب‌شده نیست.');
    }
    if (order.status !== 'لغو شده') {
      throw new Error('ابتدا باید سفارش لغو شده باشد.');
    }

    const existing = await db.query(
      'SELECT id FROM cancellation_settlements WHERE order_id = ?',
      [orderId]
    );

    if (existing.values?.length) {
      throw new Error('تسویه این سفارش قبلاً ثبت شده است.');
    }

    const paymentsResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalPaid
       FROM payments
       WHERE customer_id = ?
       AND method != 'اعتبار مشتری'`,
      [customerId]
    );

    const settlementsResult = await db.query(
      `SELECT COALESCE(SUM(paid_amount), 0) AS alreadySettled
       FROM cancellation_settlements
       WHERE customer_id = ?`,
      [customerId]
    );

    const totalPaid = Number(paymentsResult.values?.[0]?.totalPaid || 0);
    const alreadySettled = Number(
      settlementsResult.values?.[0]?.alreadySettled || 0
    );

    const availablePaidAmount = Math.max(0, totalPaid - alreadySettled);

    if (paidAmount > availablePaidAmount + 0.001) {
      throw new Error(
        `مبلغ قابل تسویه بیشتر از پرداخت‌های واقعی ثبت‌شده نیست. مبلغ قابل تخصیص: ${Math.floor(availablePaidAmount)} تومان`
      );
    }

    await db.run(
      `INSERT INTO cancellation_settlements
       (customer_id, order_id, paid_amount, refund_amount, credit_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        orderId,
        paidAmount,
        refundAmount,
        creditAmount,
        notes.trim() || null
      ],
      false
    );

    if (refundAmount > 0) {
      await db.run(
        `INSERT INTO refunds
         (customer_id, order_id, amount, method, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          customerId,
          orderId,
          refundAmount,
          refundMethod.trim(),
          notes.trim() || null
        ],
        false
      );
    }

    if (creditAmount > 0) {
      await db.run(
        `INSERT INTO customer_credits
         (customer_id, order_id, amount, used_amount, notes)
         VALUES (?, ?, ?, 0, ?)`,
        [customerId, orderId, creditAmount, notes.trim() || null],
        false
      );
    }

    await db.commitTransaction();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.rollbackTransaction();
      } catch {}
    }
    throw error;
  }
}

/**
 * مصرف اعتبار مشتری برای کاهش بدهی حساب او.
 * اعتبارها به ترتیب قدیمی‌ترین تاریخ و شناسه مصرف می‌شوند.
 */
export async function useCustomerCredit(
  customerId: number,
  amount: number,
  notes = ''
): Promise<void> {
  const db = await initializeDatabase();
  await ensureRefundSchema();

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error('مشتری معتبر نیست.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('مبلغ مصرف اعتبار باید بیشتر از صفر باشد.');
  }

  let transactionStarted = false;

  try {
    await db.beginTransaction();
    transactionStarted = true;

    const customerResult = await db.query(
      'SELECT id FROM customers WHERE id = ?',
      [customerId]
    );

    if (!customerResult.values?.length) {
      throw new Error('مشتری پیدا نشد.');
    }

    const balanceResult = await db.query(
      `SELECT
        COALESCE((
          SELECT SUM(final_total)
          FROM orders
          WHERE customer_id = ? AND status != 'لغو شده'
        ), 0) -
        MAX(
          0,
          COALESCE((
            SELECT SUM(amount)
            FROM payments
            WHERE customer_id = ?
          ), 0) -
          COALESCE((
            SELECT SUM(paid_amount)
            FROM cancellation_settlements
            WHERE customer_id = ?
          ), 0)
        ) AS balance`,
      [customerId, customerId, customerId]
    );

    const debt = Number(balanceResult.values?.[0]?.balance || 0);

    if (debt <= 0) {
      throw new Error('این مشتری بدهی پرداخت‌نشده ندارد.');
    }

    if (amount > debt + 0.001) {
      throw new Error(
        `مبلغ مصرف اعتبار از بدهی مشتری بیشتر است. بدهی فعلی: ${Math.floor(debt)} تومان`
      );
    }

    const creditsResult = await db.query(
      `SELECT id, amount, used_amount AS usedAmount
       FROM customer_credits
       WHERE customer_id = ?
       AND amount > used_amount
       ORDER BY created_at ASC, id ASC`,
      [customerId]
    );

    const creditRows = (creditsResult.values || []) as {
      id: number;
      amount: number;
      usedAmount: number;
    }[];

    const availableCredit = creditRows.reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.amount) - Number(item.usedAmount)),
      0
    );

    if (amount > availableCredit + 0.001) {
      throw new Error(
        `اعتبار کافی نیست. اعتبار قابل استفاده: ${Math.floor(availableCredit)} تومان`
      );
    }

    let remaining = amount;

    for (const credit of creditRows) {
      if (remaining <= 0.001) break;

      const available = Math.max(
        0,
        Number(credit.amount) - Number(credit.usedAmount)
      );

      if (available <= 0) continue;

      const used = Math.min(available, remaining);

      await db.run(
        `UPDATE customer_credits
         SET used_amount = used_amount + ?
         WHERE id = ?
         AND used_amount + ? <= amount + 0.001`,
        [used, credit.id, used],
        false
      );

      remaining -= used;
    }

    if (remaining > 0.001) {
      throw new Error('مصرف اعتبار کامل انجام نشد. دوباره تلاش کنید.');
    }

    await db.run(
      `INSERT INTO payments(customer_id, amount, method, notes)
       VALUES (?, ?, 'اعتبار مشتری', ?)`,
      [
        customerId,
        amount,
        notes.trim() || 'مصرف اعتبار مشتری'
      ],
      false
    );

    await db.commitTransaction();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.rollbackTransaction();
      } catch {}
    }
    throw error;
  }
}

export async function getRefunds(): Promise<RefundRecord[]> {
  const db = await initializeDatabase();
  await ensureRefundSchema();

  const result = await db.query(`
    SELECT
      id,
      customer_id AS customerId,
      order_id AS orderId,
      amount,
      method,
      notes,
      created_at AS createdAt
    FROM refunds
    ORDER BY id DESC
  `);

  return (result.values || []) as RefundRecord[];
}

export async function getCustomerCredits(
  customerId?: number
): Promise<CustomerCreditRecord[]> {
  const db = await initializeDatabase();
  await ensureRefundSchema();

  const result = customerId
    ? await db.query(
        `SELECT
          id,
          customer_id AS customerId,
          order_id AS orderId,
          amount,
          used_amount AS usedAmount,
          amount - used_amount AS remainingAmount,
          notes,
          created_at AS createdAt
         FROM customer_credits
         WHERE customer_id = ?
         ORDER BY id DESC`,
        [customerId]
      )
    : await db.query(`
        SELECT
          id,
          customer_id AS customerId,
          order_id AS orderId,
          amount,
          used_amount AS usedAmount,
          amount - used_amount AS remainingAmount,
          notes,
          created_at AS createdAt
        FROM customer_credits
        ORDER BY id DESC
      `);

  return (result.values || []) as CustomerCreditRecord[];
}

export async function getCustomerCreditBalance(
  customerId: number
): Promise<number> {
  const db = await initializeDatabase();
  await ensureRefundSchema();

  const result = await db.query(
    `SELECT COALESCE(SUM(amount - used_amount), 0) AS balance
     FROM customer_credits
     WHERE customer_id = ?`,
    [customerId]
  );

  return Number(result.values?.[0]?.balance || 0);
}
