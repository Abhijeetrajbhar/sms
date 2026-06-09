function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n');
  downloadFile(filename, csv, 'text/csv;charset=utf-8');
}

export function downloadMarksheet(filename, row) {
  const content = [
    'CampusOryx Marksheet',
    '====================',
    `Student: ${row.student}`,
    `Rank: ${row.rank}`,
    `Math: ${row.math}`,
    `Physics: ${row.physics}`,
    `English: ${row.english}`,
    `Chemistry: ${row.chemistry}`,
    `Biology: ${row.biology}`,
    `Total: ${row.total}`,
    `Grade: ${row.grade}`,
    '',
    'This is a system-generated marksheet.',
  ].join('\n');

  downloadFile(filename, content, 'text/plain;charset=utf-8');
}
