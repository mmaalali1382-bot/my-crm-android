
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

export async function initializeDatabase(): Promise<SQLiteDBConnection> {
  if (db) return db;

  const consistency = await sqlite.checkConnectionsConsistency();
  const connection = await sqlite.isConnection(DB_NAME, false);

  if (consistency.result && connection.result) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
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
  `);

  return db;
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  const d = await initializeDatabase();
  const r = await d.query(
    'SELECT id,name,phone,company,stage,notes FROM customers ORDER BY id DESC'
  );
  return (r.values || []) as CustomerRecord[];
}

export async function addCustomer(name: string, phone: string): Promise<void> {
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
    [name.trim(), phone.trim(), company.trim() || null, notes.trim() || null, id]
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
    [name.trim(), code.trim(), category.trim() || null, cost, price, stock, minStock]
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
    [name.trim(), code.trim(), category.trim() || null, cost, price, stock, minStock, id]
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

  if (!items.length) throw new Error('سفارش باید حداقل یک محصول داشته باشد.');
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

  if (!customer.values?.length) throw new Error('مشتری پیدا نشد.');

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

    if (!product) throw new Error('یکی از محصولات پیدا نشد.');
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

  await d.run('PRAGMA foreign_keys = ON');

  try {
    await d.run('BEGIN TRANSACTION');

    const orderResult = await d.run(
      `INSERT INTO orders
       (customer_id,total,discount,final_total,status,notes)
       VALUES(?,?,?,?,?,?)`,
      [customerId, total, discount, finalTotal, 'ثبت شده', notes.trim() || null]
    );

    const orderId = orderResult.changes?.lastId;

    if (!orderId) throw new Error('ثبت سفارش انجام نشد.');

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
        ]
      );

      await d.run(
        'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    await d.run('COMMIT');
  } catch (error) {
    await d.run('ROLLBACK');
    throw error;
  }
}

export async function updateOrderStatus(
  id: number,
  status: string
): Promise<void> {
  const allowed = ['ثبت شده', 'در حال آماده‌سازی', 'ارسال شده', 'تحویل شده', 'لغو شده'];

  if (!allowed.includes(status)) {
    throw new Error('وضعیت سفارش معتبر نیست.');
  }

  const d = await initializeDatabase();
  await d.run('UPDATE orders SET status=? WHERE id=?', [status, id]);
}
