
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
      name TEXT NOT NULL, phone TEXT NOT NULL, company TEXT,
      stage TEXT DEFAULT 'مشتری جدید', notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, code TEXT NOT NULL DEFAULT '',
      category TEXT, cost REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  const d = await initializeDatabase();
  const r = await d.query('SELECT id,name,phone,company,stage,notes FROM customers ORDER BY id DESC');
  return (r.values || []) as CustomerRecord[];
}

export async function addCustomer(name: string, phone: string): Promise<void> {
  const d = await initializeDatabase();
  await d.run('INSERT INTO customers(name,phone,stage) VALUES(?,?,?)',
    [name.trim(), phone.trim(), 'مشتری جدید']);
}

export async function updateCustomer(id: number, name: string, phone: string, company: string, notes: string): Promise<void> {
  const d = await initializeDatabase();
  await d.run('UPDATE customers SET name=?,phone=?,company=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [name.trim(), phone.trim(), company.trim() || null, notes.trim() || null, id]);
}

export async function deleteCustomer(id: number): Promise<void> {
  const d = await initializeDatabase();
  await d.run('DELETE FROM customers WHERE id=?', [id]);
}

export async function getProducts(): Promise<ProductRecord[]> {
  const d = await initializeDatabase();
  const r = await d.query('SELECT id,name,code,category,cost,price,stock,min_stock AS minStock FROM products ORDER BY id DESC');
  return (r.values || []) as ProductRecord[];
}

export async function addProduct(name: string, code: string, category: string, cost: number, price: number, stock: number, minStock: number): Promise<void> {
  const d = await initializeDatabase();
  await d.run('INSERT INTO products(name,code,category,cost,price,stock,min_stock) VALUES(?,?,?,?,?,?,?)',
    [name.trim(), code.trim(), category.trim() || null, cost, price, stock, minStock]);
}

export async function updateProduct(id: number, name: string, code: string, category: string, cost: number, price: number, stock: number, minStock: number): Promise<void> {
  const d = await initializeDatabase();
  await d.run('UPDATE products SET name=?,code=?,category=?,cost=?,price=?,stock=?,min_stock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [name.trim(), code.trim(), category.trim() || null, cost, price, stock, minStock, id]);
}

export async function deleteProduct(id: number): Promise<void> {
  const d = await initializeDatabase();
  await d.run('DELETE FROM products WHERE id=?', [id]);
}
