// All communication with the Express API lives here.
// Components import these functions — they never write raw fetch() calls.

const BASE_URL = 'http://localhost:3000';

// GET /expenses — returns an array of all expense objects
export async function fetchExpenses() {
  const res = await fetch(`${BASE_URL}/expenses`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

// POST /expenses — sends a new expense, returns the saved object (with its new id)
export async function createExpense(expense) {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // tell the server we're sending JSON
    body: JSON.stringify(expense),                    // convert JS object → JSON string
  });
  if (!res.ok) throw new Error('Failed to create expense');
  return res.json();
}

// DELETE /expenses/:id — removes one expense by id
export async function deleteExpense(id) {
  const res = await fetch(`${BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  return res.json();
}
