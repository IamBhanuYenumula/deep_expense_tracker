// ExpenseForm — a controlled form for adding a new expense.
// "Controlled" means React state is the source of truth for every input's value.

import { useState } from 'react';
import { createExpense } from '../api';

// Props:
//   onAdd — callback: onAdd(newExpense) tells App to add the item to state
function ExpenseForm({ onAdd }) {
  // Each input field has its own piece of state
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [date,        setDate]        = useState('');
  const [submitting,  setSubmitting]  = useState(false); // prevents double-submit
  const [error,       setError]       = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();        // IMPORTANT: stops the browser from reloading the page
    setSubmitting(true);
    setError(null);

    try {
      const newExpense = await createExpense({
        description,
        amount: Number(amount), // HTML inputs always return strings — convert to number
        date,
      });

      onAdd(newExpense);   // tell App about the new expense so it can update the list

      // Clear the form for the next entry
      setDescription('');
      setAmount('');
      setDate('');
    } catch (err) {
      setError(err.message);
    } finally {
      // finally always runs — whether createExpense succeeded or threw
      setSubmitting(false);
    }
  }

  return (
    <section className="form-section">
      <h2>Add Expense</h2>

      {/* onSubmit fires when the user clicks the submit button or presses Enter */}
      <form onSubmit={handleSubmit}>

        {/* Controlled input: value comes FROM state, onChange pushes back TO state */}
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
          {submitting ? 'Adding…' : 'Add Expense'}
        </button>

        {error && <p className="status error">{error}</p>}

      </form>
    </section>
  );
}

export default ExpenseForm;
