const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /categories — list all categories, sorted alphabetically
router.get('/', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /categories — create a new category; returns the saved row
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  db.run('INSERT INTO categories (name) VALUES (?)', [name.trim()], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: `Category "${name.trim()}" already exists — select it from the dropdown` });
      }
      return res.status(500).json({ error: err.message });
    }
    db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(row);
    });
  });
});

module.exports = router;
