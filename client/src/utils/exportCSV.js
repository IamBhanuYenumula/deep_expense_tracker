// exportToCSV — builds a CSV file from the expenses array and triggers a browser download.
// No server involved: the file is generated entirely in the browser using the Blob API.
//
// Python analogy: like writing to a StringIO buffer and calling response.write() —
// except here the "response" is the browser's download mechanism.

// Wrap a field in double-quotes if it contains commas, quotes, or newlines.
// Internal double-quotes are escaped by doubling them — that is the CSV spec (RFC 4180).
function escapeField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportToCSV(expenses) {
  const headers = ['Date', 'Description', 'Amount', 'Category'];

  // Sort oldest-first — more natural for a spreadsheet reader than newest-first.
  // [...expenses] spreads into a new array so we don't mutate the React state array.
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map(exp => [
    escapeField(exp.date),
    escapeField(exp.description),
    escapeField(Number(exp.amount).toFixed(2)),
    escapeField(exp.category_name ?? ''),
  ]);

  // ﻿ is a UTF-8 BOM (byte order mark). Excel uses it to detect UTF-8 encoding
  // and display special characters (accents, symbols) correctly without garbling them.
  const csv = '﻿' + [headers, ...rows].map(row => row.join(',')).join('\n');

  // Build a Blob (in-memory binary data) with the CSV content
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // createObjectURL generates a temporary URL pointing to the Blob in browser memory.
  // It acts like a short-lived file:// URL but for in-memory data.
  const url = URL.createObjectURL(blob);

  // Create a hidden <a> and click it programmatically to trigger the Save dialog.
  // Appending to the DOM first ensures Safari triggers the download correctly.
  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Release the object URL — the browser no longer needs it once the download starts.
  URL.revokeObjectURL(url);
}
