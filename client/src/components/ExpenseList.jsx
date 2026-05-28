// ExpenseList — receives the expenses array and renders it as a table.
// It does NOT fetch data. The parent (App) fetches and passes data down as props.

import { deleteExpense } from '../api';

// Props:
//   expenses  — array of expense objects from the database
//   onDelete  — callback function: onDelete(id) tells App to remove the item from state
function ExpenseList({ expenses, onDelete }) {

  // Called when the user clicks Delete on a row
  async function handleDelete(id) {
    await deleteExpense(id);   // 1. tell the server to delete it
    onDelete(id);              // 2. tell App to remove it from state (re-renders the table)
  }

  // If there are no expenses yet, show a friendly message
  if (expenses.length === 0) {
    return <p className="status">No expenses yet. Add one above!</p>;
  }

  return (
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
                onClick={() => handleDelete(exp.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ExpenseList;
