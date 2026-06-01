// ExpenseForm — a controlled form that handles both adding a new expense and editing an existing one.
//
// Two modes:
//   Add mode  — editingExpense prop is null; submit calls POST
//   Edit mode — editingExpense prop is an expense object; submit calls PUT
//
// How field pre-fill works:
//   The parent (App) passes key={editingExpense?.id ?? 'new'}.
//   When key changes, React unmounts the old form and mounts a fresh one,
//   so useState(initial) picks up the new editingExpense values automatically.
//   This avoids the need for a useEffect to sync prop → state.

import { useState } from 'react';
import { createExpense, updateExpense } from '../api';

// Props:
//   onAdd          — callback: onAdd(newExpense) tells App to prepend the item to state
//   editingExpense — the expense object being edited, or null when in add mode
//   onUpdate       — callback: onUpdate(updatedExpense) tells App to replace the row in state
//   onCancelEdit   — callback: tells App to clear editingExpense (returns form to add mode)
function ExpenseForm({ onAdd, editingExpense, onUpdate, onCancelEdit }) {
  // Initialize each field from editingExpense if it exists, otherwise blank.
  // Because App gives this component a unique key per expense, these initial values
  // are always correct — no extra sync logic needed.
  const [description, setDescription] = useState(editingExpense?.description ?? '');
  const [amount,      setAmount]      = useState(editingExpense ? String(editingExpense.amount) : '');
  const [date,        setDate]        = useState(editingExpense?.date ?? '');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  const isEditing = Boolean(editingExpense);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        // Edit mode — call PUT /expenses/:id
        const updated = await updateExpense(editingExpense.id, {
          description,
          amount: Number(amount),
          date,
        });
        onUpdate(updated); // tell App to replace the row; App also clears editingExpense
      } else {
        // Add mode — call POST /expenses
        const newExpense = await createExpense({
          description,
          amount: Number(amount),
          date,
        });
        onAdd(newExpense);
        // Clear the form for the next entry
        setDescription('');
        setAmount('');
        setDate('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-section">
      <h2>{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>

      <form onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Amount"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
        />

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting
            ? (isEditing ? 'Saving…'      : 'Adding…')
            : (isEditing ? 'Save Changes' : 'Add Expense')}
        </button>

        {/* Cancel only appears in edit mode — clicking it returns to add mode */}
        {isEditing && (
          <button type="button" className="cancel" onClick={onCancelEdit}>
            Cancel
          </button>
        )}

        {error && <p className="status error">{error}</p>}

      </form>
    </section>
  );
}

export default ExpenseForm;
