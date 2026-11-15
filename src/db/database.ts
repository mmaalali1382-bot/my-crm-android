import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'my_crm';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;

export type CustomerRecord = {
  id: number;
  name: string;
  phone: string;
  company: string | null;
  stage: string;
  notes: string | null;
};

export type ProductRecord = {
  id: number;
  name: string;
  code: string;
  category: string | null;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
};

export type OrderItemRecord = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type OrderRecord = {
  id: number;
  customerId: number;
  customerName: string;
  total: number;
  discount: number;
  finalTotal: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items: OrderItemRecord[];
};

export type PaymentRecord = {
  id: number;
  customerId: number;
  customerName: string;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
};

export type CustomerBalanceRecord = {
  customerId: number;
  customerName: string;
  phone: string;
  totalOrders: number;
  totalPaid: number;
  balance: number;
};

export type AccountRecord = {
  id: number;
  name: string;
  type: string;
  openingBalance: number;
  notes: string | null;
};

export type ExpenseRecord = {
  id: number;
  accountId: number | null;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes: string | null;
};

export async function initializeDatabase(): Promise<SQLiteDBConnection> {
  if (db) return db;

  const consistency = await sqlite.checkConnectionsConsistency();
  const connection = await sqlite.isConnection(DB_NAME, false);

  if (consistency.result && connection.result) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      1,
      false
    );
  }

  await db.open();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      company TEXT,
      stage TEXT DEFAULT 'مشتری جدید',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      category TEXT,
      cost REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      final_total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ثبت شده',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'نقدی',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'نقدی',
      opening_balance REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'سایر',
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
  `);

  await db.execute('PRAGMA foreign_keys = ON');

  return db;
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  const d = await initializeDatabase();

  const r = await d.query(
    'SELECT id,name,phone,company,stage,notes FROM customers ORDER BY id DESC'
  );

  return (r.values || []) as CustomerRecord[];
}

export async function addCustomer(
  name: string,
  phone: string
): Promise<void> {
  const d = await initializeDatabase();

  await d.run(
    'INSERT INTO customers(name,phone,stage) VALUES(?,?,?)',
    [name.trim(), phone.trim(), 'مشتری جدید']
  );
}

export async function updateCustomer(
  id: number,
  name: string,
  phone: string,
  company: string,
  notes: string
): Promise<void> {
  const d = await initializeDatabase();

  await d.run(
    'UPDATE customers SET name=?,phone=?,company=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [
      name.trim(),
      phone.trim(),
      company.trim() || null,
      notes.trim() || null,
      id
    ]
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  const d = await initializeDatabase();

  await d.run('DELETE FROM customers WHERE id=?', [id]);
}

export async function getProducts(): Promise<ProductRecord[]> {
  const d = await initializeDatabase();

  const r = await d.query(
    'SELECT id,name,code,category,cost,price,stock,min_stock AS minStock FROM products ORDER BY id DESC'
  );

  return (r.values || []) as ProductRecord[];
}

export async function addProduct(
  name: string,
  code: string,
  category: string,
  cost: number,
  price: number,
  stock: number,
  minStock: number
): Promise<void> {
  const d = await initializeDatabase();

  await d.run(
    'INSERT INTO products(name,code,category,cost,price,stock,min_stock) VALUES(?,?,?,?,?,?,?)',
    [
      name.trim(),
      code.trim(),
      category.trim() || null,
      cost,
      price,
      stock,
      minStock
    ]
  );
}

export async function updateProduct(
  id: number,
  name: string,
  code: string,
  category: string,
  cost: number,
  price: number,
  stock: number,
  minStock: number
): Promise<void> {
  const d = await initializeDatabase();

  await d.run(
    'UPDATE products SET name=?,code=?,category=?,cost=?,price=?,stock=?,min_stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [
      name.trim(),
      code.trim(),
      category.trim() || null,
      cost,
      price,
      stock,
      minStock,
      id
    ]
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const d = await initializeDatabase();

  await d.run('DELETE FROM products WHERE id=?', [id]);
}

export async function getOrders(): Promise<OrderRecord[]> {
  const d = await initializeDatabase();

  const result = await d.query(`
    SELECT
      o.id,
      o.customer_id AS customerId,
      c.name AS customerName,
      o.total,
      o.discount,
      o.final_total AS finalTotal,
      o.status,
      o.notes,
      o.created_at AS createdAt
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.id DESC
  `);

  const orders = (result.values || []) as Omit<OrderRecord, 'items'>[];
  const output: OrderRecord[] = [];

  for (const order of orders) {
    const itemsResult = await d.query(
      `SELECT
        id,
        product_id AS productId,
        product_name AS productName,
        quantity,
        unit_price AS unitPrice,
        unit_cost AS unitCost
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC`,
      [order.id]
    );

    output.push({
      ...order,
      customerName: order.customerName || 'مشتری حذف‌شده',
      items: (itemsResult.values || []) as OrderItemRecord[]
    });
  }

  return output;
}

export async function addOrder(
  customerId: number,
  items: { productId: number; quantity: number }[],
  discount: number,
  notes: string
): Promise<void> {
  const d = await initializeDatabase();

  if (!items.length) {
    throw new Error('سفارش باید حداقل یک محصول داشته باشد.');
  }

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error('مشتری معتبر نیست.');
  }

  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error('مبلغ تخفیف معتبر نیست.');
  }

  const customer = await d.query(
    'SELECT id FROM customers WHERE id = ?',
    [customerId]
  );

  if (!customer.values?.length) {
    throw new Error('مشتری پیدا نشد.');
  }

  const preparedItems: {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
  }[] = [];

  let total = 0;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('تعداد محصول باید عدد صحیح و بیشتر از صفر باشد.');
    }

    const result = await d.query(
      'SELECT id,name,price,cost,stock FROM products WHERE id = ?',
      [item.productId]
    );

    const product = result.values?.[0] as {
      id: number;
      name: string;
      price: number;
      cost: number;
      stock: number;
    } | undefined;

    if (!product) {
      throw new Error('یکی از محصولات پیدا نشد.');
    }

    if (product.stock < item.quantity) {
      throw new Error(`موجودی محصول ${product.name} کافی نیست.`);
    }

    preparedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      unitCost: product.cost
    });

    total += product.price * item.quantity;
  }

  if (discount > total) {
    throw new Error('تخفیف نمی‌تواند بیشتر از مبلغ سفارش باشد.');
  }

  const finalTotal = total - discount;
  let transactionStarted = false;

  try {
    await d.beginTransaction();
    transactionStarted = true;

    const orderResult = await d.run(
      `INSERT INTO orders
       (customer_id,total,discount,final_total,status,notes)
       VALUES(?,?,?,?,?,?)`,
      [
        customerId,
        total,
        discount,
        finalTotal,
        'ثبت شده',
        notes.trim() || null
      ],
      false
    );

    const orderId = orderResult.changes?.lastId;

    if (!orderId) {
      throw new Error('ثبت سفارش انجام نشد.');
    }

    for (const item of preparedItems) {
      await d.run(
        `INSERT INTO order_items
         (order_id,product_id,product_name,quantity,unit_price,unit_cost)
         VALUES(?,?,?,?,?,?)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.unitCost
        ],
        false
      );

      const stockUpdate = await d.run(
        `UPDATE products
         SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stock >= ?`,
        [item.quantity, item.productId, item.quantity],
        false
      );

      if (stockUpdate.changes?.changes !== 1) {
        throw new Error(`موجودی محصول ${item.productName} کافی نیست.`);
      }
    }

    await d.commitTransaction();
    transactionStarted = false;

  } catch (error) {
    if (transactionStarted) {
      try {
        await d.rollbackTransaction();
      } catch {
        // حفظ خطای اصلی
      }
    }

    throw error;
  }
}

export async function updateOrderStatus(
  id: number,
  status: string
): Promise<void> {
  const allowed = [
    'ثبت شده',
    'در حال آماده‌سازی',
    'ارسال شده',
    'تحویل شده',
    'لغو شده'
  ];

  if (!allowed.includes(status)) {
    throw new Error('وضعیت سفارش معتبر نیست.');
  }

  const d = await initializeDatabase();

  await d.run(
    'UPDATE orders SET status=? WHERE id=?',
    [status, id]
  );
}

// محاسبه مانده حساب هر مشتری
export async function getCustomerBalances(): Promise<CustomerBalanceRecord[]> {
  const d = await initializeDatabase();

  const result = await d.query(`
    SELECT
      c.id AS customerId,
      c.name AS customerName,
      c.phone AS phone,
      COALESCE(o.totalOrders, 0) AS totalOrders,
      COALESCE(p.totalPaid, 0) AS totalPaid,
      COALESCE(o.totalOrders, 0) - COALESCE(p.totalPaid, 0) AS balance
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, SUM(final_total) AS totalOrders
      FROM orders
      WHERE status != 'لغو شده'
      GROUP BY customer_id
    ) o ON o.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, SUM(amount) AS totalPaid
      FROM payments
      GROUP BY customer_id
    ) p ON p.customer_id = c.id
    ORDER BY balance DESC, c.name ASC
  `);

  return (result.values || []) as CustomerBalanceRecord[];
}

// دریافت فهرست پرداخت‌ها
export async function getPayments(): Promise<PaymentRecord[]> {
  const d = await initializeDatabase();

  const result = await d.query(`
    SELECT
      p.id,
      p.customer_id AS customerId,
      c.name AS customerName,
      p.amount,
      p.method,
      p.notes,
      p.created_at AS createdAt
    FROM payments p
    LEFT JOIN customers c ON c.id = p.customer_id
    ORDER BY p.id DESC
  `);

  return (result.values || []) as PaymentRecord[];
}

// ثبت پرداخت با کنترل مانده بدهی
export async function addPayment(
  customerId: number,
  amount: number,
  method: string,
  notes: string
): Promise<void> {
  const d = await initializeDatabase();

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error('مشتری معتبر نیست.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('مبلغ پرداخت باید بیشتر از صفر باشد.');
  }

  const allowedMethods = [
    'نقدی',
    'کارت‌به‌کارت',
    'کارت‌خوان',
    'واریز بانکی',
    'سایر'
  ];

  if (!allowedMethods.includes(method)) {
    throw new Error('روش پرداخت معتبر نیست.');
  }

  let transactionStarted = false;

  try {
    await d.beginTransaction();
    transactionStarted = true;

    const customer = await d.query(
      'SELECT id FROM customers WHERE id = ?',
      [customerId]
    );

    if (!customer.values?.length) {
      throw new Error('مشتری پیدا نشد.');
    }

    const balanceResult = await d.query(
      `SELECT
        COALESCE((
          SELECT SUM(final_total)
          FROM orders
          WHERE customer_id = ? AND status != 'لغو شده'
        ), 0) -
        COALESCE((
          SELECT SUM(amount)
          FROM payments
          WHERE customer_id = ?
        ), 0) AS balance`,
      [customerId, customerId]
    );

    const balance = Number(balanceResult.values?.[0]?.balance || 0);

    if (balance <= 0) {
      throw new Error('این مشتری بدهی پرداخت‌نشده ندارد.');
    }

    if (amount > balance) {
      throw new Error(
        `مبلغ پرداخت از مانده بدهی بیشتر است. مانده فعلی: ${Math.floor(balance)} تومان`
      );
    }

    await d.run(
      `INSERT INTO payments(customer_id,amount,method,notes)
       VALUES(?,?,?,?)`,
      [
        customerId,
        amount,
        method,
        notes.trim() || null
      ],
      false
    );

    await d.commitTransaction();
    transactionStarted = false;

  } catch (error) {
    if (transactionStarted) {
      try {
        await d.rollbackTransaction();
      } catch {
        // حفظ خطای اصلی
      }
    }

    throw error;
  }
}

// ================================
// مدیریت حساب‌ها
// ================================

export async function getAccounts(): Promise<AccountRecord[]> {
  const d = await initializeDatabase();

  const result = await d.query(`
    SELECT
      id,
      name,
      type,
      opening_balance AS openingBalance,
      notes
    FROM accounts
    ORDER BY id DESC
  `);

  return (result.values || []) as AccountRecord[];
}

export async function addAccount(
  name: string,
  type: string,
  openingBalance: number,
  notes: string
): Promise<void> {
  const d = await initializeDatabase();

  if (!name.trim()) {
    throw new Error('نام حساب را وارد کنید.');
  }

  if (!Number.isFinite(openingBalance)) {
    throw new Error('موجودی اولیه معتبر نیست.');
  }

  await d.run(
    `INSERT INTO accounts
     (name,type,opening_balance,notes)
     VALUES(?,?,?,?)`,
    [
      name.trim(),
      type.trim() || 'نقدی',
      openingBalance,
      notes.trim() || null
    ]
  );
}

export async function updateAccount(
  id: number,
  name: string,
  type: string,
  openingBalance: number,
  notes: string
): Promise<void> {
  const d = await initializeDatabase();

  if (!name.trim()) {
    throw new Error('نام حساب را وارد کنید.');
  }

  if (!Number.isFinite(openingBalance)) {
    throw new Error('موجودی اولیه معتبر نیست.');
  }

  await d.run(
    `UPDATE accounts
     SET name=?,type=?,opening_balance=?,notes=?
     WHERE id=?`,
    [
      name.trim(),
      type.trim() || 'نقدی',
      openingBalance,
      notes.trim() || null,
      id
    ]
  );
}

export async function deleteAccount(id: number): Promise<void> {
  const d = await initializeDatabase();

  const expenses = await d.query(
    'SELECT id FROM expenses WHERE account_id=? LIMIT 1',
    [id]
  );

  if (expenses.values?.length) {
    throw new Error('این حساب دارای هزینه ثبت‌شده است و فعلاً قابل حذف نیست.');
  }

  await d.run('DELETE FROM accounts WHERE id=?', [id]);
}

// ================================
// مدیریت هزینه‌ها
// ================================

export async function getExpenses(): Promise<ExpenseRecord[]> {
  const d = await initializeDatabase();

  const result = await d.query(`
    SELECT
      id,
      account_id AS accountId,
      title,
      category,
      amount,
      expense_date AS expenseDate,
      notes
    FROM expenses
    ORDER BY expense_date DESC, id DESC
  `);

  return (result.values || []) as ExpenseRecord[];
}

export async function addExpense(
  accountId: number | null,
  title: string,
  category: string,
  amount: number,
  expenseDate: string,
  notes: string
): Promise<void> {
  const d = await initializeDatabase();

  if (!title.trim()) {
    throw new Error('عنوان هزینه را وارد کنید.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('مبلغ هزینه باید بیشتر از صفر باشد.');
  }

  if (accountId !== null) {
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new Error('حساب انتخاب‌شده معتبر نیست.');
    }

    const account = await d.query(
      'SELECT id FROM accounts WHERE id=?',
      [accountId]
    );

    if (!account.values?.length) {
      throw new Error('حساب انتخاب‌شده پیدا نشد.');
    }
  }

  await d.run(
    `INSERT INTO expenses
     (account_id,title,category,amount,expense_date,notes)
     VALUES(?,?,?,?,?,?)`,
    [
      accountId,
      title.trim(),
      category.trim() || 'سایر',
      amount,
      expenseDate.trim() || new Date().toISOString().slice(0, 10),
      notes.trim() || null
    ]
  );
}

export async function deleteExpense(id: number): Promise<void> {
  const d = await initializeDatabase();

  await d.run('DELETE FROM expenses WHERE id=?', [id]);
}
