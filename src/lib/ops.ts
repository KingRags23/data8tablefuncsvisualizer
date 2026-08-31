import type { Query } from "./functions";
import { evaluatePredicate, type PredicateSpec } from "./predicates";
import { sampleIndices } from "./rng";
import {
  cloneTable,
  numRows,
  resolveColumn,
  type CellValue,
  type TableData,
} from "./table";

export type QueryResult =
  | { kind: "table"; table: TableData }
  | { kind: "tables"; first: TableData; second: TableData }
  | { kind: "array"; values: CellValue[] }
  | { kind: "scalar"; value: number }
  | { kind: "display"; table: TableData; n: number | null }
  | { kind: "none" };

function takeRows(table: TableData, indices: number[]): TableData {
  return {
    labels: [...table.labels],
    columns: Object.fromEntries(
      table.labels.map((label) => [
        label,
        indices.map((i) => table.columns[label][i]),
      ]),
    ),
  };
}

export function selectColumns(
  table: TableData,
  columns: (string | number)[],
): TableData {
  const labels = columns.map((column) => resolveColumn(table, column));
  return {
    labels,
    columns: Object.fromEntries(
      labels.map((label) => [label, [...table.columns[label]]]),
    ),
  };
}

export function dropColumns(
  table: TableData,
  columns: (string | number)[],
): TableData {
  const drop = new Set(columns.map((column) => resolveColumn(table, column)));
  const labels = table.labels.filter((label) => !drop.has(label));
  return {
    labels,
    columns: Object.fromEntries(
      labels.map((label) => [label, [...table.columns[label]]]),
    ),
  };
}

export function sortTable(
  table: TableData,
  column: string | number,
  descending: boolean,
): { table: TableData; order: number[] } {
  const label = resolveColumn(table, column);
  const n = numRows(table);
  const order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => {
    const va = table.columns[label][a];
    const vb = table.columns[label][b];
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb));
    }
    if (cmp === 0) return a - b;
    return descending ? -cmp : cmp;
  });
  return { table: takeRows(table, order), order };
}

export function whereMask(
  table: TableData,
  column: string | number,
  predicate: PredicateSpec,
): boolean[] {
  const label = resolveColumn(table, column);
  return table.columns[label].map((value) => evaluatePredicate(predicate, value));
}

export function applyQuery(
  table: TableData,
  query: Query,
  rng: () => number,
): QueryResult {
  switch (query.fn) {
    case "num_rows":
      return { kind: "scalar", value: numRows(table) };
    case "num_columns":
      return { kind: "scalar", value: table.labels.length };
    case "labels":
      return { kind: "array", values: [...table.labels] };
    case "split": {
      const picked = sampleIndices(rng, numRows(table), query.n, false);
      const pickedSet = new Set(picked);
      const rest = Array.from({ length: numRows(table) }, (_, i) => i).filter(
        (i) => !pickedSet.has(i),
      );
      return {
        kind: "tables",
        first: takeRows(table, picked),
        second: takeRows(table, rest),
      };
    }
    case "show":
      return { kind: "display", table: cloneTable(table), n: query.n };
    case "column": {
      const label = resolveColumn(table, query.column);
      return { kind: "array", values: [...table.columns[label]] };
    }
    case "select":
      return { kind: "table", table: selectColumns(table, query.columns) };
    case "drop":
      return { kind: "table", table: dropColumns(table, query.columns) };
    case "relabeled": {
      const next = cloneTable(table);
      const idx = next.labels.indexOf(query.oldLabel);
      next.labels[idx] = query.newLabel;
      next.columns[query.newLabel] = next.columns[query.oldLabel];
      if (query.newLabel !== query.oldLabel) {
        delete next.columns[query.oldLabel];
      }
      return { kind: "table", table: next };
    }
    case "where": {
      const mask = whereMask(table, query.column, query.predicate);
      const indices = mask
        .map((keep, i) => (keep ? i : -1))
        .filter((i) => i >= 0);
      return { kind: "table", table: takeRows(table, indices) };
    }
    case "take":
      return { kind: "table", table: takeRows(table, query.indices) };
    case "sort":
      return {
        kind: "table",
        table: sortTable(table, query.column, query.descending).table,
      };
    case "sample": {
      const picked = sampleIndices(
        rng,
        numRows(table),
        query.k,
        query.withReplacement,
      );
      return { kind: "table", table: takeRows(table, picked) };
    }
  }
}

export function sampledIndexSequence(
  table: TableData,
  k: number,
  withReplacement: boolean,
  rng: () => number,
): number[] {
  return sampleIndices(rng, numRows(table), k, withReplacement);
}

export { takeRows };
