require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./db');
const expensesRouter   = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/expenses',   expensesRouter);
app.use('/categories', categoriesRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
