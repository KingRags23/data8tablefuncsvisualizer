import { formatQuery } from "./code";
import { describePredicate, formatPredicate } from "./predicates";
import type { Query } from "./functions";
import { resolveColumn, type TableData } from "./table";

export interface QueryBriefing {
  title: string;
  summary: string;
  arguments: { name: string; text: string }[];
  nextHint: string;
}

function colText(column: string | number): string {
  return typeof column === "number" ? `index ${column}` : `"${column}"`;
}

export function briefQuery(table: TableData, query: Query): QueryBriefing {
  const code = formatQuery(query);
  switch (query.fn) {
    case "num_rows":
      return {
        title: "What this call does",
        summary: `${code} is a property. It counts how many rows are in students and returns that integer.`,
        arguments: [],
        nextHint: "Press Next to watch the visualizer count each row.",
      };
    case "num_columns":
      return {
        title: "What this call does",
        summary: `${code} is a property. It counts how many columns (labels) the table has.`,
        arguments: [],
        nextHint: "Press Next to watch the visualizer count each column header.",
      };
    case "labels":
      return {
        title: "What this call does",
        summary: `${code} is a property. It returns an array of the column names, from left to right.`,
        arguments: [],
        nextHint: "Press Next to watch each label get collected into an array.",
      };
    case "split":
      return {
        title: "What this call does",
        summary: `${code} randomly samples ${query.n} rows without replacement into a first table, and puts the leftover rows into a second table. It returns a tuple of those two tables.`,
        arguments: [
          {
            name: "n",
            text: `${query.n} — the number of rows in the first table. The second table gets the remaining ${table.columns[table.labels[0]].length - query.n} rows.`,
          },
        ],
        nextHint: "Press Next to watch the random draw and the split into two tables.",
      };
    case "show":
      return {
        title: "What this call does",
        summary:
          query.n === null
            ? `${code} displays the entire table. It does not return a new table; the notebook output is None.`
            : `${code} displays the first ${query.n} rows. The other rows are still in the table; they are just not shown. The output is None.`,
        arguments:
          query.n === null
            ? []
            : [{ name: "n", text: `${query.n} — how many rows to display, starting at index 0.` }],
        nextHint: "Press Next to see which rows are displayed.",
      };
    case "column": {
      const label = resolveColumn(table, query.column);
      return {
        title: "What this call does",
        summary: `${code} extracts the "${label}" column as an array, in row order. The result is not a table.`,
        arguments: [
          {
            name: "column_name_or_index",
            text: `${colText(query.column)} refers to the column "${label}".`,
          },
        ],
        nextHint: "Press Next to watch each value get copied into an array.",
      };
    }
    case "select": {
      const labels = query.columns.map((c) => resolveColumn(table, c));
      return {
        title: "What this call does",
        summary: `${code} returns a copy of the table that keeps only ${labels.map((l) => `"${l}"`).join(", ")}, in that order. Rows do not change.`,
        arguments: query.columns.map((column, i) => ({
          name: `col${i + 1}`,
          text: `${colText(column)} — keep "${labels[i]}" as column ${i} in the result.`,
        })),
        nextHint: "Press Next to watch the unselected columns drop away.",
      };
    }
    case "drop": {
      const labels = query.columns.map((c) => resolveColumn(table, c));
      return {
        title: "What this call does",
        summary: `${code} returns a copy of the table with ${labels.map((l) => `"${l}"`).join(", ")} removed. Remaining columns keep their original order.`,
        arguments: query.columns.map((column, i) => ({
          name: `col${i + 1}`,
          text: `${colText(column)} — remove "${labels[i]}".`,
        })),
        nextHint: "Press Next to watch those columns fade out.",
      };
    }
    case "relabeled":
      return {
        title: "What this call does",
        summary: `${code} returns a new table where the column "${query.oldLabel}" is renamed "${query.newLabel}". The data values do not change, and students itself is left alone.`,
        arguments: [
          { name: "old_label", text: `"${query.oldLabel}" — the current name.` },
          { name: "new_label", text: `"${query.newLabel}" — the replacement name.` },
        ],
        nextHint: "Press Next to watch the header rename.",
      };
    case "where": {
      const label = resolveColumn(table, query.column);
      return {
        title: "What this call does",
        summary: `${code} keeps only the rows whose value in "${label}" satisfies the predicate. Rows that fail are dropped; the rest stay in their original order.`,
        arguments: [
          {
            name: "column",
            text: `${colText(query.column)} — every row's value in "${label}" will be tested.`,
          },
          {
            name: "predicate",
            text: `${formatPredicate(query.predicate)} — ${describePredicate(query.predicate, label)}`,
          },
        ],
        nextHint: "Press Next to watch the visualizer walk down that column, keeping or dropping each row.",
      };
    }
    case "take":
      return {
        title: "What this call does",
        summary: `${code} keeps rows by position, not by value. Indices start at 0. The result has those rows in the order listed.`,
        arguments: [
          {
            name: "row_indices",
            text: `${query.indices.join(", ")} — copy these original rows, in this order.`,
          },
        ],
        nextHint: "Press Next to watch those rows get taken.",
      };
    case "sort": {
      const label = resolveColumn(table, query.column);
      return {
        title: "What this call does",
        summary: `${code} returns a copy of the table ordered by "${label}" (${query.descending ? "descending" : "ascending"}). Whole rows move together.`,
        arguments: [
          {
            name: "column_name_or_index",
            text: `${colText(query.column)} — sort using the values in "${label}".`,
          },
          ...(query.descending
            ? [{ name: "descending", text: "True — largest values (or reverse alphabetical) first." }]
            : []),
        ],
        nextHint: "Press Next to watch the rows rearrange.",
      };
    }
    case "sample":
      return {
        title: "What this call does",
        summary: `${code} draws ${query.k} rows at random ${query.withReplacement ? "with" : "without"} replacement and returns a new table with those rows, in the order they were drawn.`,
        arguments: [
          { name: "k", text: `${query.k} — the sample size.` },
          {
            name: "with_replacement",
            text: query.withReplacement
              ? "True (default) — a row can be drawn more than once."
              : "False — each row can be drawn at most once.",
          },
        ],
        nextHint: "Press Next to watch the random draws.",
      };
  }
}
