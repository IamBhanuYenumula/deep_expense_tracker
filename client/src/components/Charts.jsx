// Charts — renders a donut chart (spending by category) and a bar chart (monthly trend).
// Receives the expenses array as a prop — no fetching here.
// All data is derived from what App already loaded.

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip,
} from 'recharts';

// Apple system color palette — cycles if there are more categories than colors
const COLORS = ['#007AFF', '#34C759', '#FF9F0A', '#FF375F', '#AF52DE', '#5856D6', '#32ADE6', '#FF6961'];

// ── Custom tooltip for the donut chart ─────────────────────────────────────
// Recharts passes `active`, `payload` — we only render when the user is hovering.
function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{name}</span>
      <span className="chart-tooltip-value">${value.toFixed(2)}</span>
    </div>
  );
}

// ── Custom tooltip for the bar chart ───────────────────────────────────────
function MonthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>
      <span className="chart-tooltip-value">${payload[0].value.toFixed(2)}</span>
    </div>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────
// expenses — array of expense objects (each has amount, category_name, date)
function Charts({ expenses }) {

  // Group expenses by category and sum amounts.
  // Python equivalent: dict comprehension + itertools.groupby
  const categoryData = useMemo(() => {
    const totals = {};
    for (const exp of expenses) {
      const name = exp.category_name ?? 'Uncategorised';
      totals[name] = (totals[name] || 0) + Number(exp.amount);
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value); // largest slice first
  }, [expenses]);

  // Group expenses by year-month and sum amounts.
  // date is 'YYYY-MM-DD' — .slice(0,7) gives 'YYYY-MM' for grouping.
  const monthlyData = useMemo(() => {
    const totals = {};
    for (const exp of expenses) {
      const key = exp.date.slice(0, 7); // 'YYYY-MM'
      totals[key] = (totals[key] || 0) + Number(exp.amount);
    }
    return Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b)) // chronological order
      .map(([key, total]) => {
        // Build a Date using the local-time constructor to avoid UTC-offset day-shift
        const [year, mon] = key.split('-').map(Number);
        const label = new Date(year, mon - 1, 1)
          .toLocaleString('default', { month: 'short', year: '2-digit' });
        return { month: label, total: Number(total.toFixed(2)) };
      });
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <section className="charts-section">
        <h2>Reports</h2>
        <p className="status">Add expenses to see charts.</p>
      </section>
    );
  }

  return (
    <section className="charts-section">
      <h2>Reports</h2>
      <div className="charts-grid">

        {/* ── Donut: spending by category ───────────────── */}
        <div className="chart-card">
          <h3>By Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={2}
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 13, color: '#6E6E73' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Bar: monthly spending trend ───────────────── */}
        <div className="chart-card">
          <h3>Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C6C6C8" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6E6E73' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fontSize: 12, fill: '#6E6E73' }}
                axisLine={false}
                tickLine={false}
                width={58}
              />
              <Tooltip content={<MonthTooltip />} />
              <Bar dataKey="total" fill="#007AFF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </section>
  );
}

export default Charts;
