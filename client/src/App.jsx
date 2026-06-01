// App — the root component. It owns all shared state and wires the UI together.
// Think of it as the "main function" of the frontend.

import { useState, useEffect } from 'react';
import { fetchExpenses, fetchCategories } from './api';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Charts from './components/Charts';
import './App.css';

function App() {
  // --- State ---
  // These three variables cover every possible state when loading remote data:
  // loading: are we still waiting for the server?
  // error:   did something go wrong?
  // expenses: the actual data once it arrives
  const [expenses,       setExpenses]       = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  // null = form is in "add" mode; an expense object = form is in "edit" mode
  const [editingExpense, setEditingExpense] = useState(null);

  // --- Fetch on mount ---
  // Promise.all fires both requests simultaneously (like asyncio.gather in Python)
  // and waits until both resolve before setting state.
  useEffect(() => {
    Promise.all([fetchExpenses(), fetchCategories()])
      .then(([expenseData, categoryData]) => {
        setExpenses(expenseData);
        setCategories(categoryData);
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

  // Called by ExpenseList when the user clicks Edit on a row.
  // Lifts the selected expense object into state — the form reads this to pre-fill its fields.
  function handleStartEdit(expense) {
    setEditingExpense(expense);
  }

  // Called by ExpenseForm after a successful PUT.
  // Replaces the matching row in the array; every other row is unchanged.
  // Python equivalent: [updated if e['id'] == id else e for e in expenses]
  function handleUpdate(updatedExpense) {
    setExpenses(prev =>
      prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp)
    );
    setEditingExpense(null); // return form to add mode
  }

  // Called by ExpenseForm when the user clicks Cancel.
  function handleCancelEdit() {
    setEditingExpense(null);
  }

  // Called by ExpenseForm after a new category is created inline.
  // Inserts it into the sorted categories list so the dropdown stays alphabetical.
  function handleCategoryAdd(newCategory) {
    setCategories(prev =>
      [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  // --- Render ---
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="app">
      <header>
        <h1>Deep Expense Tracker</h1>
        <p className="header-total">Total <span>${total.toFixed(2)}</span></p>
      </header>

      <main>
        {/* key tells React to fully remount ExpenseForm when the editing target changes,
            so useState initial values always reflect the current editingExpense */}
        <ExpenseForm
          key={editingExpense?.id ?? 'new'}
          onAdd={handleAdd}
          editingExpense={editingExpense}
          onUpdate={handleUpdate}
          onCancelEdit={handleCancelEdit}
          categories={categories}
          onCategoryAdd={handleCategoryAdd}
        />

        <section className="list-section">
          <h2>All Expenses</h2>

          {/* Handle the three possible states: loading, error, data */}
          {loading && <p className="status">Loading expenses…</p>}
          {error   && <p className="status error">Error: {error}</p>}
          {!loading && !error && (
            <ExpenseList
              expenses={expenses}
              onDelete={handleDelete}
              onEdit={handleStartEdit}
              editingId={editingExpense?.id}
            />
          )}
        </section>

        {!loading && !error && <Charts expenses={expenses} />}
      </main>
    </div>
  );
}

export default App;
