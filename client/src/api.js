// All communication with the Express API lives here.
// Components import these functions — they never write raw fetch() calls.

// Read the API URL from the Vite environment (set VITE_API_URL in client/.env).
// Falls back to localhost:3000 so local dev works without a .env file.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

// PUT /expenses/:id — updates an existing expense, returns the saved object
// Same shape as createExpense but method is 'PUT' and the id goes in the URL path
export async function updateExpense(id, expense) {
  const res = await fetch(`${BASE_URL}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) throw new Error('Failed to update expense');
  return res.json();
}

// DELETE /expenses/:id — removes one expense by id
export async function deleteExpense(id) {
  const res = await fetch(`${BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  // 204 No Content has no body — guard before calling .json() to avoid a parse error
  return res.status !== 204 ? res.json() : null;
}

// GET /categories — returns an array of all category objects
export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

// POST /categories — creates a new category, returns the saved object (with its new id)
// Surfaces the server's error message so "already exists" is shown to the user clearly.
export async function createCategory(name) {
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to create category');
  }
  return res.json();
}
