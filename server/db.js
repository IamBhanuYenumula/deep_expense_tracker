const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'expenses.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      date        TEXT NOT NULL,
      notes       TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      frequency   TEXT NOT NULL,
      next_due    TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `);

  // plaid_items — one row per connected bank account.
  // access_token is the long-lived credential Plaid gives after the user
  // completes the Link flow; cursor tracks the position in transactionsSync.
  db.run(`
    CREATE TABLE IF NOT EXISTS plaid_items (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id          TEXT NOT NULL UNIQUE,
      access_token     TEXT NOT NULL,
      institution_name TEXT,
      cursor           TEXT,
      created_at       TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add plaid_transaction_id to expenses so webhook-imported
  // transactions can be de-duplicated. SQLite's ALTER TABLE errors if the
  // column already exists, so we swallow that specific error.
  db.run('ALTER TABLE expenses ADD COLUMN plaid_transaction_id TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Migration error:', err.message);
    }
  });
});

module.exports = db;
