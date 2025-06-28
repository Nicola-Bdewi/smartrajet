// /src/utils/db.ts
import * as SQLite from 'expo-sqlite';

// open the database (sync)
export const db = SQLite.openDatabaseSync('addresses.db');

// run your initial schema creation
export async function initDb() {
    // NOTE: execAsync is available on the object returned by openDatabaseSync
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_addrs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      lon REAL NOT NULL,
      lat REAL NOT NULL
    );
  `);
    console.log('✅ DB initialized');
}
