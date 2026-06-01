// ExpenseList — receives the expenses array and renders it as a table.
// It does NOT fetch data. The parent (App) fetches and passes data down as props.

import { useState } from 'react';
import { deleteExpense } from '../api';

// Props:
//   expenses  — array of expense objects from the database
//   onDelete  — callback: onDelete(id) tells App to remove the item from state
//   onEdit    — callback: onEdit(expense) tells App to set editingExpense (fills the form)
//   editingId — the id of the expense currently being edited (used to highlight that row)
function ExpenseList({ expenses, onDelete, onEdit, editingId }) {
  const [deleting, setDeleting] = useState(new Set());
  const [error,    setError]    = useState(null);

  async function handleDelete(id) {
    if (deleting.has(id)) return;

    setDeleting(prev => new Set(prev).add(id));
    setError(null);
    try {
      await deleteExpense(id);
      onDelete(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (expenses.length === 0) {
    return <p className="status">No expenses yet. Add one above!</p>;
  }

  return (
    <>
      {error && <p className="status error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Category</th>
            <th></th>{/* action buttons column */}
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            // className "editing" applies a yellow highlight when this row is being edited.
            // exp.id === editingId is true for at most one row at a time.
            <tr key={exp.id} className={exp.id === editingId ? 'editing' : ''}>
              <td>{exp.description}</td>
              <td className="amount">${Number(exp.amount).toFixed(2)}</td>
              <td>{exp.date}</td>
              <td className="category">{exp.category_name ?? '—'}</td>
              <td className="actions">
                {/* Disable Edit while a delete is in flight on this row */}
                <button
                  className="edit-btn"
                  onClick={() => onEdit(exp)}
                  disabled={deleting.has(exp.id)}
                >
                  Edit
                </button>
                <button
                  className="danger"
                  disabled={deleting.has(exp.id)}
                  onClick={() => handleDelete(exp.id)}
                >
                  {deleting.has(exp.id) ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default ExpenseList;
