// All communication with the Express API lives here.
// Components import these functions — they never write raw fetch() calls.

// Read the API URL from the Vite environment (set VITE_API_URL in client/.env).
// Falls back to localhost:3000 so local dev works without a .env file.
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

// ── Plaid ────────────────────────────────────────────────────────────────────

// POST /plaid/create-link-token — returns the token that initialises Plaid Link in the browser
export async function createLinkToken() {
  const res = await fetch(`${BASE_URL}/plaid/create-link-token`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to create link token');
  }
  return res.json(); // { link_token }
}

// POST /plaid/exchange-token — sends the one-time public_token; server stores the access_token
export async function exchangeToken(publicToken, institution) {
  const res = await fetch(`${BASE_URL}/plaid/exchange-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_token: publicToken, institution }),
  });
  if (!res.ok) throw new Error('Failed to exchange token');
  return res.json(); // { id, item_id, institution_name, created_at }
}

// GET /plaid/accounts — lists connected banks (no sensitive fields)
export async function fetchPlaidAccounts() {
  const res = await fetch(`${BASE_URL}/plaid/accounts`);
  if (!res.ok) throw new Error('Failed to fetch connected accounts');
  return res.json();
}

// ── Recurring expenses ───────────────────────────────────────────────────────

// GET /recurring — returns all recurring expense templates
export async function fetchRecurring() {
  const res = await fetch(`${BASE_URL}/recurring`);
  if (!res.ok) throw new Error('Failed to fetch recurring expenses');
  return res.json();
}

// POST /recurring — creates a recurring template, returns the saved object
export async function createRecurring(item) {
  const res = await fetch(`${BASE_URL}/recurring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to create recurring expense');
  return res.json();
}

// PUT /recurring/:id — updates a recurring template, returns the saved object
export async function updateRecurring(id, item) {
  const res = await fetch(`${BASE_URL}/recurring/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to update recurring expense');
  return res.json();
}

// DELETE /recurring/:id
export async function deleteRecurring(id) {
  const res = await fetch(`${BASE_URL}/recurring/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete recurring expense');
  return res.status !== 204 ? res.json() : null;
}

// POST /recurring/:id/log — records an expense for today and advances next_due.
// Returns { expense, recurring } — both updated rows in one round-trip.
export async function logRecurring(id) {
  const res = await fetch(`${BASE_URL}/recurring/${id}/log`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to log recurring expense');
  return res.json();
}

// ── Categories ───────────────────────────────────────────────────────────────

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
