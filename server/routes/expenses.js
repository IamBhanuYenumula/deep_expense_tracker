const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const sql = `
    SELECT e.*, c.name AS category_name
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    ORDER BY e.date DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const sql = `
    SELECT e.*, c.name AS category_name
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.id = ?
  `;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Expense not found' });
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const { description, amount, category_id, date, notes } = req.body;
  // Use explicit null/undefined check so amount=0 is accepted, not treated as missing
  if (!description || amount == null || amount === '' || !date) {
    return res.status(400).json({ error: 'description, amount, and date are required' });
  }
  if (Number(amount) < 0) {
    return res.status(400).json({ error: 'amount must be non-negative' });
  }
  const sql = `
    INSERT INTO expenses (description, amount, category_id, date, notes)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(sql, [description, amount, category_id || null, date, notes || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    // Re-read the full row so the response shape matches GET (includes created_at, category_name)
    const fetchSql = `
      SELECT e.*, c.name AS category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `;
    db.get(fetchSql, [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(row);
    });
  });
});

router.put('/:id', (req, res) => {
  const { description, amount, category_id, date, notes } = req.body;
  if (!description || amount == null || amount === '' || !date) {
    return res.status(400).json({ error: 'description, amount, and date are required' });
  }
  if (Number(amount) < 0) {
    return res.status(400).json({ error: 'amount must be non-negative' });
  }
  const sql = `
    UPDATE expenses
    SET description = ?, amount = ?, category_id = ?, date = ?, notes = ?
    WHERE id = ?
  `;
  db.run(sql, [description, amount, category_id || null, date, notes || null, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Expense not found' });
    // Re-read the full row so the response shape matches GET (includes category_name, created_at)
    const fetchSql = `
      SELECT e.*, c.name AS category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `;
    db.get(fetchSql, [req.params.id], (fetchErr, row) => {
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      res.json(row);
    });
  });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM expenses WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ deleted: Number(req.params.id) });
  });
});

module.exports = router;
