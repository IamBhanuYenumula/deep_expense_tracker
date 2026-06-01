// RecurringSection — manages recurring expense templates.
// A recurring expense is a template: it stores description, amount, frequency, and
// next_due date. Clicking "Log" creates a real expense row for today and advances next_due.
//
// Layout: add/edit form card on top, list card below (same visual pattern as the rest of the app).
//
// Props:
//   recurring      — array of recurring objects from App state
//   categories     — array of {id, name} for the category dropdown
//   onAdd          — called with the new recurring object after POST
//   onDelete       — called with the deleted id after DELETE
//   onUpdate       — called with the updated recurring object after PUT
//   onLog          — called with { expense, recurring } after POST /log
//   onCategoryAdd  — called when a new category is created inline

import { useState } from 'react';
import { createRecurring, updateRecurring, deleteRecurring, logRecurring, createCategory } from '../api';

// Returns today as YYYY-MM-DD using local time (not UTC).
// Used both for the form default and for comparing next_due.
function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// ── RecurringForm ────────────────────────────────────────────────────────────
// Defined at module level (outside RecurringSection) so React sees a stable
// component reference — never recreate a component inside another component's body.
//
// Receives `key` from its parent via editingItem?.id ?? 'new', so useState
// initial values always reflect the correct item without a useEffect sync.
function RecurringForm({ editingItem, categories, onAdd, onUpdate, onCancelEdit, onCategoryAdd }) {
  const [description,     setDescription]     = useState(editingItem?.description ?? '');
  const [amount,          setAmount]          = useState(editingItem ? String(editingItem.amount) : '');
  const [categoryId,      setCategoryId]      = useState(
    editingItem?.category_id ? String(editingItem.category_id) : ''
  );
  const [frequency,       setFrequency]       = useState(editingItem?.frequency ?? 'monthly');
  const [nextDue,         setNextDue]         = useState(editingItem?.next_due ?? todayISO());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState(null);

  const isEditing = Boolean(editingItem);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Resolve category — create it first if "Add new…" was chosen
      let resolvedCategoryId = categoryId === '' || categoryId === 'new' ? null : Number(categoryId);
      if (categoryId === 'new') {
        if (!newCategoryName.trim()) {
          setError('Enter a name for the new category.');
          setSubmitting(false);
          return;
        }
        const created = await createCategory(newCategoryName.trim());
        onCategoryAdd(created);
        resolvedCategoryId = created.id;
      }

      const payload = {
        description,
        amount: Number(amount),
        category_id: resolvedCategoryId,
        frequency,
        next_due: nextDue,
      };

      if (isEditing) {
        const updated = await updateRecurring(editingItem.id, payload);
        onUpdate(updated);
      } else {
        const created = await createRecurring(payload);
        onAdd(created);
        // Clear for the next entry
        setDescription('');
        setAmount('');
        setCategoryId('');
        setFrequency('monthly');
        setNextDue(todayISO());
        setNewCategoryName('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-section">
      <h2>{isEditing ? 'Edit Recurring' : 'Add Recurring Expense'}</h2>

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

        <select
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value); setNewCategoryName(''); }}
        >
          <option value="">No category</option>
          {categories.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
          <option value="new">+ Add new…</option>
        </select>

        {categoryId === 'new' && (
          <input
            type="text"
            className="new-category"
            placeholder="Category name"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
          />
        )}

        {/* Frequency — how often this repeats */}
        <select
          value={frequency}
          onChange={e => setFrequency(e.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {/* next_due — the first (or next) date this should be logged */}
        <input
          type="date"
          value={nextDue}
          onChange={e => setNextDue(e.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting
            ? (isEditing ? 'Saving…'   : 'Adding…')
            : (isEditing ? 'Save'      : 'Add')}
        </button>

        {isEditing && (
          <button type="button" className="cancel" onClick={onCancelEdit}>
            Cancel
          </button>
        )}

        {error && <p className="status error">{error}</p>}
      </form>
    </div>
  );
}

// ── RecurringSection (exported) ──────────────────────────────────────────────
function RecurringSection({ recurring, categories, onAdd, onDelete, onUpdate, onLog, onCategoryAdd }) {
  const [editingItem, setEditingItem] = useState(null);
  const [deleting,    setDeleting]    = useState(new Set());
  const [logging,     setLogging]     = useState(new Set());
  const [error,       setError]       = useState(null);

  const today = todayISO();

  async function handleDelete(id) {
    if (deleting.has(id)) return;
    setDeleting(prev => new Set(prev).add(id));
    setError(null);
    try {
      await deleteRecurring(id);
      onDelete(id);
      if (editingItem?.id === id) setEditingItem(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleLog(id) {
    if (logging.has(id)) return;
    setLogging(prev => new Set(prev).add(id));
    setError(null);
    try {
      const result = await logRecurring(id);  // { expense, recurring }
      onLog(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogging(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function handleUpdate(updated) {
    onUpdate(updated);
    setEditingItem(null);
  }

  return (
    <div className="recurring-section">

      {/* Form — key changes whenever editingItem changes, so form always reflects the right item */}
      <RecurringForm
        key={editingItem?.id ?? 'new'}
        editingItem={editingItem}
        categories={categories}
        onAdd={onAdd}
        onUpdate={handleUpdate}
        onCancelEdit={() => setEditingItem(null)}
        onCategoryAdd={onCategoryAdd}
      />

      {/* List */}
      <div className="recurring-list">
        <h2>Recurring Expenses</h2>

        {error && <p className="status error">{error}</p>}

        {recurring.length === 0 ? (
          <p className="status">No recurring expenses yet. Add one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Category</th>
                <th>Next Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recurring.map(item => {
                const isDue = item.next_due <= today;
                return (
                  <tr key={item.id} className={editingItem?.id === item.id ? 'editing' : ''}>
                    <td>{item.description}</td>
                    <td className="amount">${Number(item.amount).toFixed(2)}</td>
                    <td className="frequency">{item.frequency}</td>
                    <td className="category">{item.category_name ?? '—'}</td>
                    <td>
                      <span className={isDue ? 'due-date overdue' : 'due-date'}>{item.next_due}</span>
                      {isDue && <span className="due-badge">Due</span>}
                    </td>
                    <td className="actions">
                      <button
                        className={isDue ? 'log-btn due' : 'log-btn'}
                        onClick={() => handleLog(item.id)}
                        disabled={logging.has(item.id) || deleting.has(item.id)}
                      >
                        {logging.has(item.id) ? 'Logging…' : 'Log'}
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => setEditingItem(item)}
                        disabled={logging.has(item.id) || deleting.has(item.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleDelete(item.id)}
                        disabled={logging.has(item.id) || deleting.has(item.id)}
                      >
                        {deleting.has(item.id) ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RecurringSection;
