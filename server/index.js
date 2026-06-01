require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./db');
const { addClient, removeClient } = require('./events');
const expensesRouter   = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
const recurringRouter  = require('./routes/recurring');
const plaidRouter      = require('./routes/plaid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/expenses',   expensesRouter);
app.use('/categories', categoriesRouter);
app.use('/recurring',  recurringRouter);
app.use('/plaid',      plaidRouter);

// GET /events — Server-Sent Events stream.
// Each browser tab that opens this connection gets real-time expense pushes
// when a Plaid webhook creates new transactions.
// SSE uses a plain HTTP response kept open indefinitely — no WebSocket needed.
app.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders(); // send headers immediately so the browser knows the stream is open

  addClient(res);
  // Clean up when the tab closes or navigates away
  req.on('close', () => removeClient(res));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
