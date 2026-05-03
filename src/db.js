const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "trading-agent.db");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      chain TEXT,
      token_in TEXT,
      token_out TEXT,
      amount TEXT,
      amount_human TEXT,
      tx_hash TEXT,
      status TEXT NOT NULL,
      error TEXT,
      payload_json TEXT,
      response_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

async function logTradeEvent({
  action,
  chain = null,
  tokenIn = null,
  tokenOut = null,
  amount = null,
  amountHuman = null,
  txHash = null,
  status,
  error = null,
  payload = null,
  response = null,
}) {
  return run(
    `INSERT INTO trades
      (action, chain, token_in, token_out, amount, amount_human, tx_hash, status, error, payload_json, response_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      action,
      chain,
      tokenIn,
      tokenOut,
      amount,
      amountHuman,
      txHash,
      status,
      error,
      payload ? JSON.stringify(payload) : null,
      response ? JSON.stringify(response) : null,
    ]
  );
}

async function getTradeHistory(limit = 25) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 200);
  return all(
    `SELECT id, action, chain, token_in, token_out, amount, amount_human, tx_hash, status, error, created_at
     FROM trades
     ORDER BY id DESC
     LIMIT ?`,
    [safeLimit]
  );
}

module.exports = {
  dbPath,
  initDb,
  logTradeEvent,
  getTradeHistory,
};
