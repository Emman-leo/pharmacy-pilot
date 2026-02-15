export function downloadCSV(filename, rows, columns) {
  const header = columns.map((c) => (typeof c === 'string' ? c : c.header)).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const key = typeof col === 'string' ? col : col.key;
          let val = row[key];
          if (val == null) return '';
          if (typeof val === 'number') return val;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
