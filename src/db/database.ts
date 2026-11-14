
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'my_crm';

const sqlite = new SQLiteConnection(CapacitorSQLite);

let db: SQLiteDBConnection | null = null;

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
      stage TEXT DEFAULT 'new',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}
