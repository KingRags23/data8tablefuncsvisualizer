import type { Query } from "./functions";
import { formatPredicate } from "./predicates";

function colArg(column: string | number): string {
  return typeof column === "number" ? String(column) : `"${column}"`;
}

function colList(columns: (string | number)[]): string {
  return columns.map(colArg).join(", ");
}

export function formatTakeArg(indices: number[]): string {
  if (indices.length === 1) return String(indices[0]);
  const sequential = indices.every((value, i) => i === 0 || value === indices[i - 1] + 1);
  if (sequential && indices[0] === 0) {
    return `np.arange(${indices.length})`;
  }
  if (sequential) {
    return `np.arange(${indices[0]}, ${indices[indices.length - 1] + 1})`;
  }
  return `make_array(${indices.join(", ")})`;
}

export function formatQuery(query: Query): string {
  switch (query.fn) {
    case "num_rows":
      return "students.num_rows";
    case "num_columns":
      return "students.num_columns";
    case "labels":
      return "students.labels";
    case "split":
      return `students.split(${query.n})`;
    case "show":
      return query.n === null ? "students.show()" : `students.show(${query.n})`;
    case "column":
      return `students.column(${colArg(query.column)})`;
    case "select":
      return `students.select(${colList(query.columns)})`;
    case "drop":
      return `students.drop(${colList(query.columns)})`;
    case "relabeled":
      return `students.relabeled("${query.oldLabel}", "${query.newLabel}")`;
    case "where":
      return `students.where(${colArg(query.column)}, ${formatPredicate(query.predicate)})`;
    case "take":
      return `students.take(${formatTakeArg(query.indices)})`;
    case "sort":
      return query.descending
        ? `students.sort(${colArg(query.column)}, descending=True)`
        : `students.sort(${colArg(query.column)})`;
    case "sample": {
      const kDefault = query.k === 100;
      if (kDefault && query.withReplacement) return "students.sample()";
      if (query.withReplacement) return `students.sample(${query.k})`;
      if (kDefault) return "students.sample(with_replacement=False)";
      return `students.sample(${query.k}, with_replacement=False)`;
    }
  }
}

export interface CodeSegment {
  text: string;
  argIndex?: number;
}

export function codeSegments(query: Query): CodeSegment[] {
  switch (query.fn) {
    case "num_rows":
      return [{ text: "students.num_rows" }];
    case "num_columns":
      return [{ text: "students.num_columns" }];
    case "labels":
      return [{ text: "students.labels" }];
    case "split":
      return [
        { text: "students.split(" },
        { text: String(query.n), argIndex: 0 },
        { text: ")" },
      ];
    case "show":
      return query.n === null
        ? [{ text: "students.show()" }]
        : [
            { text: "students.show(" },
            { text: String(query.n), argIndex: 0 },
            { text: ")" },
          ];
    case "column":
      return [
        { text: "students.column(" },
        { text: colArg(query.column), argIndex: 0 },
        { text: ")" },
      ];
    case "select":
      return [
        { text: "students.select(" },
        { text: colList(query.columns), argIndex: 0 },
        { text: ")" },
      ];
    case "drop":
      return [
        { text: "students.drop(" },
        { text: colList(query.columns), argIndex: 0 },
        { text: ")" },
      ];
    case "relabeled":
      return [
        { text: "students.relabeled(" },
        { text: `"${query.oldLabel}"`, argIndex: 0 },
        { text: ", " },
        { text: `"${query.newLabel}"`, argIndex: 1 },
        { text: ")" },
      ];
    case "where":
      return [
        { text: "students.where(" },
        { text: colArg(query.column), argIndex: 0 },
        { text: ", " },
        { text: formatPredicate(query.predicate), argIndex: 1 },
        { text: ")" },
      ];
    case "take":
      return [
        { text: "students.take(" },
        { text: formatTakeArg(query.indices), argIndex: 0 },
        { text: ")" },
      ];
    case "sort":
      return query.descending
        ? [
            { text: "students.sort(" },
            { text: colArg(query.column), argIndex: 0 },
            { text: ", " },
            { text: "descending=True", argIndex: 1 },
            { text: ")" },
          ]
        : [
            { text: "students.sort(" },
            { text: colArg(query.column), argIndex: 0 },
            { text: ")" },
          ];
    case "sample": {
      if (query.k === 100 && query.withReplacement) {
        return [{ text: "students.sample()" }];
      }
      if (query.withReplacement) {
        return [
          { text: "students.sample(" },
          { text: String(query.k), argIndex: 0 },
          { text: ")" },
        ];
      }
      if (query.k === 100) {
        return [
          { text: "students.sample(" },
          { text: "with_replacement=False", argIndex: 1 },
          { text: ")" },
        ];
      }
      return [
        { text: "students.sample(" },
        { text: String(query.k), argIndex: 0 },
        { text: ", " },
        { text: "with_replacement=False", argIndex: 1 },
        { text: ")" },
      ];
    }
  }
}
