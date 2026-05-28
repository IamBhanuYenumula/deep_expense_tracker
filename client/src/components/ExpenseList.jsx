// ExpenseList — receives the expenses array and renders it as a table.
// It does NOT fetch data. The parent (App) fetches and passes data down as props.

import { useState } from 'react';
import { deleteExpense } from '../api';

// Props:
//   expenses  — array of expense objects from the database
//   onDelete  — callback function: onDelete(id) tells App to remove the item from state
function ExpenseList({ expenses, onDelete }) {
  // A Set of IDs currently being deleted — prevents double-clicks from firing two requests
  const [deleting, setDeleting] = useState(new Set());
  const [error,    setError]    = useState(null);

  // Called when the user clicks Delete on a row
  async function handleDelete(id) {
    if (deleting.has(id)) return;  // already in flight — ignore the second click

    setDeleting(prev => new Set(prev).add(id));
    setError(null);
    try {
      await deleteExpense(id);
      onDelete(id);              // tell App to remove it from state (re-renders the table)
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

  // If there are no expenses yet, show a friendly message
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {/* For each expense, create one table row.
              key={exp.id} is required — React uses it to track changes efficiently. */}
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.description}</td>
              <td>${Number(exp.amount).toFixed(2)}</td>
              <td>{exp.date}</td>
              <td>
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
