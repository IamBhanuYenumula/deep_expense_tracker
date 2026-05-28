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
  if (!description || !amount || !date) {
    return res.status(400).json({ error: 'description, amount, and date are required' });
  }
  const sql = `
    INSERT INTO expenses (description, amount, category_id, date, notes)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(sql, [description, amount, category_id || null, date, notes || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, description, amount, category_id, date, notes });
  });
});

router.put('/:id', (req, res) => {
  const { description, amount, category_id, date, notes } = req.body;
  if (!description || !amount || !date) {
    return res.status(400).json({ error: 'description, amount, and date are required' });
  }
  const sql = `
    UPDATE expenses
    SET description = ?, amount = ?, category_id = ?, date = ?, notes = ?
    WHERE id = ?
  `;
  db.run(sql, [description, amount, category_id || null, date, notes || null, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ id: Number(req.params.id), description, amount, category_id, date, notes });
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
