const express = require('express');
const router = express.Router();
const db = require('../db');

// Advance a YYYY-MM-DD string by one frequency interval.
// JavaScript's Date constructor handles month-end roll-over (e.g. Jan 31 + 1 month → Mar 2/3).
// This is acceptable for a personal finance tracker.
function advanceDate(dateStr, frequency) {
  const [y, m, d] = dateStr.split('-').map(Number);
  let next;
  if (frequency === 'weekly')  next = new Date(y, m - 1, d + 7);
  if (frequency === 'monthly') next = new Date(y, m,     d);      // m (0-indexed) is already next month
  if (frequency === 'yearly')  next = new Date(y + 1, m - 1, d);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-');
}

// Re-usable SELECT with category JOIN (same shape used by all read operations)
const SELECT_WITH_CATEGORY = `
  SELECT r.*, c.name AS category_name
  FROM recurring r
  LEFT JOIN categories c ON r.category_id = c.id
`;

function fetchById(id, cb) {
  db.get(`${SELECT_WITH_CATEGORY} WHERE r.id = ?`, [id], cb);
}

// GET /recurring — list all, soonest due first
router.get('/', (req, res) => {
  db.all(`${SELECT_WITH_CATEGORY} ORDER BY r.next_due ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /recurring — create a new recurring expense template
router.post('/', (req, res) => {
  const { description, amount, category_id, frequency, next_due } = req.body;
  const VALID_FREQ = ['weekly', 'monthly', 'yearly'];

  if (!description || amount == null || amount === '' || !frequency || !next_due) {
    return res.status(400).json({ error: 'description, amount, frequency, and next_due are required' });
  }
  if (!VALID_FREQ.includes(frequency)) {
    return res.status(400).json({ error: 'frequency must be weekly, monthly, or yearly' });
  }
  if (Number(amount) < 0) {
    return res.status(400).json({ error: 'amount must be non-negative' });
  }

  db.run(
    'INSERT INTO recurring (description, amount, category_id, frequency, next_due) VALUES (?, ?, ?, ?, ?)',
    [description, amount, category_id || null, frequency, next_due],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      fetchById(this.lastID, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(row);
      });
    }
  );
});

// PUT /recurring/:id — update description, amount, category, frequency, or next_due
router.put('/:id', (req, res) => {
  const { description, amount, category_id, frequency, next_due } = req.body;
  const VALID_FREQ = ['weekly', 'monthly', 'yearly'];

  if (!description || amount == null || amount === '' || !frequency || !next_due) {
    return res.status(400).json({ error: 'description, amount, frequency, and next_due are required' });
  }
  if (!VALID_FREQ.includes(frequency)) {
    return res.status(400).json({ error: 'frequency must be weekly, monthly, or yearly' });
  }

  db.run(
    'UPDATE recurring SET description=?, amount=?, category_id=?, frequency=?, next_due=? WHERE id=?',
    [description, amount, category_id || null, frequency, next_due, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Recurring expense not found' });
      fetchById(req.params.id, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

// DELETE /recurring/:id
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM recurring WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Recurring expense not found' });
    res.json({ deleted: Number(req.params.id) });
  });
});

// POST /recurring/:id/log
// Creates a real expense entry for today and advances next_due by one interval.
// Returns { expense, recurring } so the client can update both lists in one round-trip.
router.post('/:id/log', (req, res) => {
  db.get('SELECT * FROM recurring WHERE id = ?', [req.params.id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!item) return res.status(404).json({ error: 'Recurring expense not found' });

    // Today in local time as YYYY-MM-DD
    const now = new Date();
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    const newNextDue = advanceDate(item.next_due, item.frequency);

    // Step 1 — insert into expenses
    db.run(
      'INSERT INTO expenses (description, amount, category_id, date) VALUES (?, ?, ?, ?)',
      [item.description, item.amount, item.category_id, todayStr],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const expenseId = this.lastID;

        // Step 2 — advance next_due on the recurring row
        db.run('UPDATE recurring SET next_due = ? WHERE id = ?', [newNextDue, item.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Fetch both updated rows and return them together
          const fetchExpSql = `
            SELECT e.*, c.name AS category_name
            FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.id = ?
          `;
          db.get(fetchExpSql, [expenseId], (err, expense) => {
            if (err) return res.status(500).json({ error: err.message });
            fetchById(item.id, (err, recurring) => {
              if (err) return res.status(500).json({ error: err.message });
              res.status(201).json({ expense, recurring });
            });
          });
        });
      }
    );
  });
});

module.exports = router;
