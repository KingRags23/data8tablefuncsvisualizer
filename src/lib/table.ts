export type CellValue = string | number;

export interface TableData {
  labels: string[];
  columns: Record<string, CellValue[]>;
}

export function numRows(table: TableData): number {
  const first = table.labels[0];
  return first ? table.columns[first].length : 0;
}

export function cloneTable(table: TableData): TableData {
  const columns: Record<string, CellValue[]> = {};
  for (const label of table.labels) {
    columns[label] = [...table.columns[label]];
  }
  return { labels: [...table.labels], columns };
}

export function rowAt(table: TableData, index: number): Record<string, CellValue> {
  const row: Record<string, CellValue> = {};
  for (const label of table.labels) {
    row[label] = table.columns[label][index];
  }
  return row;
}

export function rowsOf(table: TableData): Record<string, CellValue>[] {
  return Array.from({ length: numRows(table) }, (_, i) => rowAt(table, i));
}

export function tableFromRows(
  labels: string[],
  rows: Record<string, CellValue>[],
): TableData {
  const columns: Record<string, CellValue[]> = {};
  for (const label of labels) {
    columns[label] = rows.map((row) => row[label]);
  }
  return { labels, columns };
}

export function resolveColumn(table: TableData, column: string | number): string {
  if (typeof column === "number") {
    const label = table.labels[column];
    if (label === undefined) {
      throw new Error(`Column index ${column} is out of range.`);
    }
    return label;
  }
  if (!table.labels.includes(column)) {
    throw new Error(`Column "${column}" is not in the table.`);
  }
  return column;
}

export function formatValue(value: CellValue): string {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 100) / 100);
  }
  return String(value);
}

export function formatPythonValue(value: CellValue): string {
  if (typeof value === "number") {
    return String(value);
  }
  return `"${value}"`;
}

export function formatPythonArray(values: CellValue[]): string {
  return `array([${values.map(formatPythonValue).join(", ")}])`;
}
