// App — the root component. It owns all shared state and wires the UI together.
// Think of it as the "main function" of the frontend.

import { useState, useEffect } from 'react';
import { fetchExpenses } from './api';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import './App.css';

function App() {
  // --- State ---
  // These three variables cover every possible state when loading remote data:
  // loading: are we still waiting for the server?
  // error:   did something go wrong?
  // expenses: the actual data once it arrives
  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // --- Fetch on mount ---
  // useEffect with [] runs once, after the component first appears on screen.
  // This is where we load initial data from the API.
  useEffect(() => {
    fetchExpenses()
      .then(data => {
        setExpenses(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // --- Event handlers ---
  // Called by ExpenseForm after a successful POST.
  // Prepends the new expense to the top of the list.
  function handleAdd(newExpense) {
    // "prev =>" is the functional update form — always use this when new state
    // depends on the previous state. Avoids subtle bugs with stale closures.
    setExpenses(prev => [newExpense, ...prev]);
  }

  // Called by ExpenseList after a successful DELETE.
  // Removes the expense with the matching id from state.
  function handleDelete(id) {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
    // .filter() returns a NEW array — we never mutate the existing one directly.
  }

  // --- Render ---
  return (
    <div className="app">
      <header>
        <h1>Deep Expense Tracker</h1>
      </header>

      <main>
        <ExpenseForm onAdd={handleAdd} />

        <section className="list-section">
          <h2>All Expenses</h2>

          {/* Handle the three possible states: loading, error, data */}
          {loading && <p className="status">Loading expenses…</p>}
          {error   && <p className="status error">Error: {error}</p>}
          {!loading && !error && (
            <ExpenseList
              expenses={expenses}
              onDelete={handleDelete}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
