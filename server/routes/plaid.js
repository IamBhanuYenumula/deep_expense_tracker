// routes/plaid.js — Plaid Link + webhook integration.
//
// Four endpoints:
//   POST /plaid/create-link-token  — returns a short-lived token the browser uses to open Plaid Link
//   POST /plaid/exchange-token     — trades the one-time public_token for a permanent access_token
//   GET  /plaid/accounts           — lists all connected bank accounts
//   POST /plaid/webhook            — receives transaction events from Plaid's servers
//
// Flow:
//   1. Frontend calls /create-link-token, gets a link_token
//   2. Plaid Link opens in the browser (react-plaid-link)
//   3. User picks their bank, logs in — Plaid returns a public_token to the frontend
//   4. Frontend sends public_token to /exchange-token; server stores the access_token
//   5. Plaid sends TRANSACTIONS.SYNC_UPDATES_AVAILABLE webhooks to /plaid/webhook
//   6. Server fetches new transactions, saves them as expenses, broadcasts via SSE

const express = require('express');
const router = express.Router();
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');
const db = require('../db');
const { broadcast } = require('../events');

// ── Plaid client setup ───────────────────────────────────────────────────────

const PLAID_ENV  = process.env.PLAID_ENV  || 'sandbox';
const CLIENT_ID  = process.env.PLAID_CLIENT_ID;
const SECRET     = process.env.PLAID_SECRET;

// PlaidEnvironments maps 'sandbox' | 'production' to the correct base URL
const plaidClient = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': CLIENT_ID,
      'PLAID-SECRET':    SECRET,
    },
  },
}));

// Guard — return 503 on every request if credentials aren't configured
function requirePlaidConfig(req, res, next) {
  if (!CLIENT_ID || !SECRET) {
    return res.status(503).json({
      error: 'Plaid credentials not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to server/.env',
    });
  }
  next();
}

router.use(requirePlaidConfig);

// ── Helper — fetch an expense row with its category JOIN ──────────────────────
function fetchExpenseById(id, cb) {
  db.get(
    `SELECT e.*, c.name AS category_name
     FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.id = ?`,
    [id],
    cb
  );
}

// ── POST /plaid/create-link-token ─────────────────────────────────────────────
// The link_token is a short-lived token (30 min) that initialises Plaid Link
// in the browser. It embeds which products and countries are enabled.
router.post('/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'local-user' },
      client_name: 'Deep Expense Tracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Plaid will POST to this URL when transactions arrive.
      // Use ngrok in local dev: set PLAID_WEBHOOK_URL=https://<ngrok-id>.ngrok.io/plaid/webhook
      webhook: process.env.PLAID_WEBHOOK_URL,
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid linkTokenCreate error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// ── POST /plaid/exchange-token ────────────────────────────────────────────────
// Plaid Link calls onSuccess with a one-time public_token.
// This endpoint trades it for a permanent access_token and saves it to the DB.
// The access_token must stay server-side — never send it to the browser.
router.post('/exchange-token', async (req, res) => {
  const { public_token, institution } = req.body;
  if (!public_token) {
    return res.status(400).json({ error: 'public_token is required' });
  }
  try {
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeRes.data;
    const institutionName = institution?.name ?? 'Unknown bank';

    db.run(
      `INSERT OR REPLACE INTO plaid_items (item_id, access_token, institution_name)
       VALUES (?, ?, ?)`,
      [item_id, access_token, institutionName],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT id, item_id, institution_name, created_at FROM plaid_items WHERE id = ?',
          [this.lastID],
          (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json(row); // never return access_token to the client
          }
        );
      }
    );
  } catch (err) {
    console.error('Plaid exchangeToken error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// ── GET /plaid/accounts ───────────────────────────────────────────────────────
// Lists connected banks (no sensitive fields).
router.get('/accounts', (req, res) => {
  db.all(
    'SELECT id, item_id, institution_name, created_at FROM plaid_items ORDER BY created_at ASC',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── POST /plaid/webhook ───────────────────────────────────────────────────────
// Plaid calls this URL when new transaction data is available.
// We use the modern transactionsSync API with a cursor so we only fetch deltas.
//
// Production note: verify the webhook signature using plaidClient.webhookVerificationKeyGet()
// and a JWT library before trusting the payload. Skipped here for sandbox simplicity.
router.post('/webhook', async (req, res) => {
  const { webhook_type, webhook_code, item_id } = req.body;
  console.log(`Plaid webhook: ${webhook_type}.${webhook_code} for item ${item_id}`);

  // Acknowledge immediately — Plaid expects a 200 within a few seconds
  res.json({ ok: true });

  // Only process transaction sync events
  if (webhook_type !== 'TRANSACTIONS' || webhook_code !== 'SYNC_UPDATES_AVAILABLE') return;

  db.get('SELECT * FROM plaid_items WHERE item_id = ?', [item_id], async (err, item) => {
    if (err || !item) {
      return console.error('Plaid webhook: item not found for', item_id);
    }

    try {
      // transactionsSync is paginated — loop until has_more is false
      let cursor = item.cursor || undefined;
      let addedTransactions = [];
      let hasMore = true;

      while (hasMore) {
        const syncRes = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
        });
        const { added, next_cursor, has_more } = syncRes.data;
        addedTransactions = addedTransactions.concat(added);
        cursor  = next_cursor;
        hasMore = has_more;
      }

      // Persist the new cursor so next sync starts from where we left off
      db.run('UPDATE plaid_items SET cursor = ? WHERE item_id = ?', [cursor, item_id]);

      // Insert each new transaction as an expense
      for (const txn of addedTransactions) {
        // Skip pending transactions — they're not yet settled
        if (txn.pending) continue;
        // Plaid: positive amount = money leaving the account (spending).
        // Skip credits (refunds, income) — they have negative amounts.
        if (txn.amount <= 0) continue;

        const description = txn.merchant_name || txn.name;
        const amount      = txn.amount;
        const date        = txn.date;           // 'YYYY-MM-DD'
        const txnId       = txn.transaction_id;

        // Check for duplicate before inserting (webhook may fire more than once)
        db.get(
          'SELECT id FROM expenses WHERE plaid_transaction_id = ?',
          [txnId],
          (err, existing) => {
            if (existing) return; // already imported

            db.run(
              'INSERT INTO expenses (description, amount, date, plaid_transaction_id) VALUES (?, ?, ?, ?)',
              [description, amount, date, txnId],
              function (err) {
                if (err) return console.error('Insert expense error:', err.message);
                // Push the new expense to every open browser tab via SSE
                fetchExpenseById(this.lastID, (err, row) => {
                  if (!err && row) broadcast('expense', row);
                });
              }
            );
          }
        );
      }

      console.log(`Plaid sync: ${addedTransactions.length} transactions processed for ${item.institution_name}`);
    } catch (err) {
      console.error('Plaid transactionsSync error:', err.response?.data || err.message);
    }
  });
});

module.exports = router;
