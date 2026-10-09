export type ExcelCell = string | number | boolean | Date | null | undefined;

export async function exportRowsToXlsx(filename: string, sheetName: string, rows: ExcelCell[][]) {
  const { Workbook } = await import('exceljs');
  const normalizedRows = rows.map((row) => row.map((cell) => cell ?? ''));

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  worksheet.columns = buildColumnWidths(normalizedRows);
  worksheet.addRows(normalizedRows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildColumnWidths(rows: ExcelCell[][]) {
  const columnCount = Math.max(...rows.map((row) => row.length), 1);

  return Array.from({ length: columnCount }, (_, index) => {
    const width = rows.reduce((max, row) => {
      const value = row[index];
      return Math.max(max, String(value ?? '').length);
    }, 10);

    return { width: Math.min(Math.max(width + 2, 12), 36) };
  });
}

function sanitizeSheetName(value: string) {
  return value.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Reporte';
}
