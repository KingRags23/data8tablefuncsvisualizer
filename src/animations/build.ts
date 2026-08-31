import {
  compareExpression,
  describePredicate,
  evaluatePredicate,
  formatPredicate,
} from "../lib/predicates";
import type { Query } from "../lib/functions";
import { sampledIndexSequence, sortTable, takeRows } from "../lib/ops";
import { mulberry32 } from "../lib/rng";
import {
  formatPythonArray,
  formatValue,
  numRows,
  resolveColumn,
  type TableData,
} from "../lib/table";
import { emptyMarks, type Animation, type RowMark, type VizFrame } from "./types";

const EXPLAIN = 2400;
const EXECUTE = 120;
const SETTLE = 900;
const RESULT = 0;

function base(
  table: TableData,
  partial: Partial<VizFrame> & Pick<VizFrame, "title" | "body" | "phase">,
): VizFrame {
  const n = numRows(table);
  return {
    durationMs: partial.phase === "explain" ? EXPLAIN : partial.phase === "execute" ? EXECUTE : RESULT,
    originalIndices: Array.from({ length: n }, (_, i) => i),
    focusColumns: [],
    fadeColumns: [],
    rowMarks: emptyMarks(n),
    table,
    ...partial,
  };
}

function colName(table: TableData, column: string | number): string {
  return resolveColumn(table, column);
}

function describeColumnArg(table: TableData, column: string | number): string {
  if (typeof column === "number") {
    return `The first argument is ${column}, a column index. Counting from 0 on the left, index ${column} is the column "${table.labels[column]}".`;
  }
  return `The first argument is "${column}", a column label. The visualizer highlights that entire column.`;
}

export function buildAnimation(table: TableData, query: Query, seed = 42): Animation {
  const rng = mulberry32(seed);
  const n = numRows(table);
  const frames: VizFrame[] = [];

  const push = (frame: VizFrame) => {
    frames.push(frame);
  };

  switch (query.fn) {
    case "num_rows": {
      push(
        base(table, {
          phase: "explain",
          title: "A property, not a method",
          body: "num_rows has no parentheses and no arguments. It simply counts how many rows are in the table.",
        }),
      );
      for (let i = 0; i < n; i++) {
        const marks: Record<number, RowMark> = emptyMarks(n);
        for (let j = 0; j <= i; j++) marks[j] = "keep";
        marks[i] = "current";
        push(
          base(table, {
            phase: "execute",
            title: `Counting row ${i}`,
            body: `Row indices start at 0, so this is row ${i}. The running count is now ${i + 1}.`,
            currentRow: i,
            rowMarks: marks,
            counter: { label: "num_rows", value: i + 1, caption: `Counted ${i + 1} of ${n} rows` },
            durationMs: i < 8 || i >= n - 3 ? 160 : 45,
          }),
        );
      }
      push(
        base(table, {
          phase: "result",
          title: "Result",
          body: `students.num_rows evaluates to ${n}. That is an integer, not a table.`,
          scalarPreview: { label: "int", value: n, display: String(n) },
          counter: { label: "num_rows", value: n },
          rowMarks: Object.fromEntries(Array.from({ length: n }, (_, i) => [i, "keep"])),
        }),
      );
      break;
    }

    case "num_columns": {
      push(
        base(table, {
          phase: "explain",
          title: "Count columns, not rows",
          body: "num_columns is also a property. It counts labels across the top of the table.",
        }),
      );
      for (let i = 0; i < table.labels.length; i++) {
        const focus = table.labels.slice(0, i + 1);
        push(
          base(table, {
            phase: "explain",
            title: `Column ${i}: "${table.labels[i]}"`,
            body: `Index ${i} is "${table.labels[i]}". Running count: ${i + 1}.`,
            focusColumns: focus,
            argFocus: undefined,
            counter: { label: "num_columns", value: i + 1, caption: `Counted ${i + 1} of ${table.labels.length} columns` },
            durationMs: 700,
          }),
        );
      }
      push(
        base(table, {
          phase: "result",
          title: "Result",
          body: `students.num_columns evaluates to ${table.labels.length}.`,
          scalarPreview: { label: "int", value: table.labels.length, display: String(table.labels.length) },
          focusColumns: [...table.labels],
          counter: { label: "num_columns", value: table.labels.length },
        }),
      );
      break;
    }

    case "labels": {
      push(
        base(table, {
          phase: "explain",
          title: "Collect the column names",
          body: "labels returns an array of strings — one name per column, in left-to-right order. It does not return a table.",
        }),
      );
      for (let i = 0; i < table.labels.length; i++) {
        push(
          base(table, {
            phase: "explain",
            title: `Read header ${i}`,
            body: `The next label is "${table.labels[i]}". It is appended to the array.`,
            focusColumns: [table.labels[i]],
            arrayPreview: {
              title: "labels",
              values: table.labels,
              filled: i + 1,
            },
            durationMs: 750,
          }),
        );
      }
      push(
        base(table, {
          phase: "result",
          title: "Result",
          body: `students.labels is ${formatPythonArray(table.labels)}.`,
          arrayPreview: { title: "array of str", values: table.labels, filled: table.labels.length },
          focusColumns: [...table.labels],
        }),
      );
      break;
    }

    case "split": {
      const picked = sampledIndexSequence(table, query.n, false, rng);
      const pickedSet = new Set(picked);
      const rest = Array.from({ length: n }, (_, i) => i).filter((i) => !pickedSet.has(i));
      push(
        base(table, {
          phase: "explain",
          title: "Argument n",
          body: `n = ${query.n} means the first table will contain ${query.n} rows, chosen uniformly at random without replacement. n must be between 1 and ${n - 1}.`,
          argFocus: 0,
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: "Two tables, one split",
          body: "Rows that are not sampled go into the second table. No row appears in both. The original table is not modified.",
          argFocus: 0,
        }),
      );
      const running: number[] = [];
      picked.forEach((rowIndex, draw) => {
        running.push(rowIndex);
        const marks = emptyMarks(n);
        for (const i of running) marks[i] = "picked";
        marks[rowIndex] = "current";
        push(
          base(table, {
            phase: "execute",
            title: `Draw ${draw + 1} of ${query.n}`,
            body: `Sampled original row ${rowIndex} without replacement. ${query.n - draw - 1} draw${query.n - draw - 1 === 1 ? "" : "s"} remaining.`,
            argFocus: 0,
            currentRow: rowIndex,
            rowMarks: marks,
            counter: { label: "sampled", value: running.length, caption: `${running.length} / ${query.n}` },
            durationMs: draw < 6 ? 220 : 80,
          }),
        );
      });
      const first = takeRows(table, picked);
      const second = takeRows(table, rest);
      const finalMarks = emptyMarks(n);
      for (const i of picked) finalMarks[i] = "picked";
      for (const i of rest) finalMarks[i] = "keep";
      push(
        base(table, {
          phase: "result",
          title: "Result: a tuple of two tables",
          body: `split returns (table_0, table_1). The first has ${query.n} rows; the second has ${rest.length} remaining rows.`,
          rowMarks: finalMarks,
          resultTable: first,
          resultTableB: second,
          resultCaption: `First table — ${query.n} randomly sampled rows`,
          resultCaptionB: `Second table — ${rest.length} remaining rows`,
        }),
      );
      break;
    }

    case "show": {
      const shown = query.n === null ? n : Math.min(query.n, n);
      push(
        base(table, {
          phase: "explain",
          title: query.n === null ? "No argument" : "Argument n",
          body:
            query.n === null
              ? "show() with no argument displays the entire table. It does not return a value — the output is None."
              : `n = ${query.n} means display the first ${query.n} rows (indices 0 through ${shown - 1}). show does not return a new table.`,
          argFocus: query.n === null ? undefined : 0,
        }),
      );
      const marks = emptyMarks(n);
      for (let i = 0; i < shown; i++) marks[i] = "keep";
      for (let i = shown; i < n; i++) marks[i] = "drop";
      push(
        base(table, {
          phase: "execute",
          title: "Choose which rows to display",
          body:
            query.n === null
              ? "Every row is included in the display."
              : `Rows 0 through ${shown - 1} stay visible. The remaining rows are still in the table; they are just not shown.`,
          argFocus: query.n === null ? undefined : 0,
          rowMarks: marks,
          visibleRowCount: query.n,
          durationMs: SETTLE,
        }),
      );
      push(
        base(table, {
          phase: "result",
          title: "Output: None",
          body: "In a notebook, this cell displays a table and returns None. The students table itself is unchanged.",
          rowMarks: marks,
          visibleRowCount: query.n,
          banner: "None",
          resultTable: takeRows(table, Array.from({ length: shown }, (_, i) => i)),
          resultCaption: query.n === null ? "Displayed table (all rows)" : `Displayed table (${shown} rows)`,
        }),
      );
      break;
    }

    case "column": {
      const label = colName(table, query.column);
      const values = table.columns[label];
      push(
        base(table, {
          phase: "explain",
          title: "The column argument",
          body: describeColumnArg(table, query.column),
          argFocus: 0,
          focusColumns: [label],
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: "Extract an array, not a table",
          body: `column returns the values of "${label}" from top to bottom as an array of length ${n}.`,
          argFocus: 0,
          focusColumns: [label],
        }),
      );
      for (let i = 0; i < n; i++) {
        const marks = emptyMarks(n);
        for (let j = 0; j <= i; j++) marks[j] = "keep";
        marks[i] = "current";
        push(
          base(table, {
            phase: "execute",
            title: `Read row ${i}`,
            body: `"${label}" in row ${i} is ${formatValue(values[i])}. Append it to the array.`,
            argFocus: 0,
            focusColumns: [label],
            currentRow: i,
            currentCell: { row: i, column: label },
            rowMarks: marks,
            arrayPreview: { title: `"${label}"`, values, filled: i + 1 },
            durationMs: i < 8 || i >= n - 2 ? 150 : 40,
          }),
        );
      }
      push(
        base(table, {
          phase: "result",
          title: "Result",
          body: `The result is an array of ${n} values, not a one-column table. Use select("${label}") if you want to keep table form.`,
          focusColumns: [label],
          arrayPreview: { title: "array", values, filled: n },
        }),
      );
      break;
    }

    case "select": {
      const labels = query.columns.map((c) => colName(table, c));
      const fade = table.labels.filter((l) => !labels.includes(l));
      push(
        base(table, {
          phase: "explain",
          title: "Arguments: columns to keep",
          body: `select keeps only ${labels.map((l) => `"${l}"`).join(", ")} and drops the rest. Rows are unchanged. Argument order becomes the new column order.`,
          argFocus: 0,
          focusColumns: labels,
          fadeColumns: fade,
        }),
      );
      labels.forEach((label, i) => {
        push(
          base(table, {
            phase: "explain",
            title: `Keep column ${i + 1}: "${label}"`,
            body: `"${label}" will be column index ${i} in the result.`,
            argFocus: 0,
            focusColumns: labels.slice(0, i + 1),
            fadeColumns: table.labels.filter((l) => !labels.slice(0, i + 1).includes(l)),
            durationMs: 900,
          }),
        );
      });
      const result = {
        labels,
        columns: Object.fromEntries(labels.map((l) => [l, [...table.columns[l]]])),
      };
      push(
        base(table, {
          phase: "execute",
          title: "Drop the unselected columns",
          body: "The original table is not modified. select returns a copy.",
          argFocus: 0,
          focusColumns: labels,
          fadeColumns: fade,
          durationMs: SETTLE,
        }),
      );
      push(
        base(table, {
          phase: "result",
          title: "Result table",
          body: `The copy has ${labels.length} column${labels.length === 1 ? "" : "s"} and the same ${n} rows.`,
          focusColumns: labels,
          fadeColumns: fade,
          resultTable: result,
          resultCaption: `Selected columns (${n} rows)`,
        }),
      );
      break;
    }

    case "drop": {
      const dropped = query.columns.map((c) => colName(table, c));
      const kept = table.labels.filter((l) => !dropped.includes(l));
      push(
        base(table, {
          phase: "explain",
          title: "Arguments: columns to remove",
          body: `drop removes ${dropped.map((l) => `"${l}"`).join(", ")}. Remaining columns keep their original order.`,
          argFocus: 0,
          fadeColumns: dropped,
          focusColumns: kept,
        }),
      );
      dropped.forEach((label) => {
        push(
          base(table, {
            phase: "explain",
            title: `Remove "${label}"`,
            body: `This column will not appear in the copy.`,
            argFocus: 0,
            fadeColumns: [label],
            durationMs: 850,
          }),
        );
      });
      const result = {
        labels: kept,
        columns: Object.fromEntries(kept.map((l) => [l, [...table.columns[l]]])),
      };
      push(
        base(table, {
          phase: "execute",
          title: "Build the copy",
          body: "Rows are unchanged. Only column structure changes.",
          argFocus: 0,
          fadeColumns: dropped,
          focusColumns: kept,
          durationMs: SETTLE,
        }),
      );
      push(
        base(table, {
          phase: "result",
          title: "Result table",
          body: `The copy has ${kept.length} columns and the same ${n} rows.`,
          fadeColumns: dropped,
          resultTable: result,
          resultCaption: `After drop (${n} rows)`,
        }),
      );
      break;
    }

    case "relabeled": {
      push(
        base(table, {
          phase: "explain",
          title: "Argument 1: old_label",
          body: `"${query.oldLabel}" is the current column name. Only this header will change.`,
          argFocus: 0,
          focusColumns: [query.oldLabel],
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: "Argument 2: new_label",
          body: `The header will be rewritten as "${query.newLabel}". Values in the column stay exactly the same.`,
          argFocus: 1,
          focusColumns: [query.oldLabel],
          headerOverride: { [query.oldLabel]: query.newLabel },
        }),
      );
      const resultLabels = table.labels.map((l) => (l === query.oldLabel ? query.newLabel : l));
      const result: TableData = {
        labels: resultLabels,
        columns: Object.fromEntries(
          resultLabels.map((label, i) => {
            const old = table.labels[i];
            return [label, [...table.columns[old]]];
          }),
        ),
      };
      push(
        base(table, {
          phase: "execute",
          title: "Rename the header",
          body: "relabeled returns a new table and leaves students unchanged.",
          argFocus: 1,
          focusColumns: [query.oldLabel],
          headerOverride: { [query.oldLabel]: query.newLabel },
          durationMs: SETTLE,
        }),
      );
      push(
        base(table, {
          phase: "result",
          title: "Result table",
          body: `Only the name changed: "${query.oldLabel}" → "${query.newLabel}".`,
          resultTable: result,
          resultCaption: "Relabeled copy",
        }),
      );
      break;
    }

    case "where": {
      const label = colName(table, query.column);
      const values = table.columns[label];
      const mask = values.map((value) => evaluatePredicate(query.predicate, value));
      const keptCount = mask.filter(Boolean).length;
      push(
        base(table, {
          phase: "explain",
          title: "Argument 1: the column to test",
          body: describeColumnArg(table, query.column) + ` Every row's value in "${label}" will be checked.`,
          argFocus: 0,
          focusColumns: [label],
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: "Argument 2: the predicate",
          body: `${formatPredicate(query.predicate)} — ${describePredicate(query.predicate, label)}`,
          argFocus: 1,
          focusColumns: [label],
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: "Walk down the column",
          body: `where looks at one row at a time. If the predicate is true, the whole row is kept. If false, the whole row is dropped. Other columns do not affect the test.`,
          argFocus: 1,
          focusColumns: [label],
        }),
      );
      const marks = emptyMarks(n);
      let keptSoFar = 0;
      for (let i = 0; i < n; i++) {
        const passed = mask[i];
        marks[i] = passed ? "keep" : "drop";
        const snapshot = { ...marks, [i]: "current" as RowMark };
        if (passed) keptSoFar += 1;
        push(
          base(table, {
            phase: "execute",
            title: `Row ${i}`,
            body: passed
              ? `Keep row ${i}. It stays in the result, in this same relative order.`
              : `Drop row ${i}. It will not appear in the result table.`,
            argFocus: 1,
            focusColumns: [label],
            currentRow: i,
            currentCell: { row: i, column: label },
            rowMarks: snapshot,
            comparison: {
              text: compareExpression(query.predicate, values[i], passed),
              passed,
            },
            counter: {
              label: "kept",
              value: keptSoFar,
              caption: `${keptSoFar} row${keptSoFar === 1 ? "" : "s"} kept so far`,
            },
            durationMs: i < 10 || i >= n - 2 ? 180 : 55,
          }),
        );
        marks[i] = passed ? "keep" : "drop";
      }
      const keptIdx = mask.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
      push(
        base(table, {
          phase: "execute",
          title: "Collect the matching rows",
          body: `${keptCount} of ${n} rows matched. They are copied into a new table in their original order.`,
          focusColumns: [label],
          rowMarks: marks,
          durationMs: SETTLE,
        }),
      );
      push(
        base(table, {
          phase: "result",
          title: "Result table",
          body: `where returns a copy with ${keptCount} row${keptCount === 1 ? "" : "s"} and the same columns.`,
          focusColumns: [label],
          rowMarks: marks,
          resultTable: takeRows(table, keptIdx),
          resultCaption: `${keptCount} matching rows`,
        }),
      );
      break;
    }

    case "take": {
      const indices = query.indices;
      push(
        base(table, {
          phase: "explain",
          title: "Argument: row indices",
          body: `take keeps rows by position, not by value. Indices start at 0. The requested indices are ${indices.join(", ")}.`,
          argFocus: 0,
        }),
      );
      const marks = emptyMarks(n);
      indices.forEach((rowIndex, step) => {
        marks[rowIndex] = "taken";
        const snapshot = { ...marks, [rowIndex]: "current" as RowMark };
        push(
          base(table, {
            phase: "execute",
            title: `Take index ${rowIndex}`,
            body: `Copy original row ${rowIndex} into result position ${step}. take uses the order you listed, which need not be sorted.`,
            argFocus: 0,
            currentRow: rowIndex,
            rowMarks: snapshot,
            durationMs: 280,
          }),
        );
        marks[rowIndex] = "taken";
      });
      push(
        base(table, {
          phase: "result",
          title: "Result table",
          body: `The copy has ${indices.length} row${indices.length === 1 ? "" : "s"}, in the order of the indices.`,
          rowMarks: marks,
          resultTable: takeRows(table, indices),
          resultCaption: `${indices.length} taken row${indices.length === 1 ? "" : "s"}`,
        }),
      );
      break;
    }

    case "sort": {
      const label = colName(table, query.column);
      const { table: sorted, order } = sortTable(table, query.column, query.descending);
      push(
        base(table, {
          phase: "explain",
          title: "Argument 1: the sort column",
          body: describeColumnArg(table, query.column) + " Every row will move so that this column is ordered.",
          argFocus: 0,
          focusColumns: [label],
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: query.descending ? "Argument 2: descending=True" : "Default: ascending",
          body: query.descending
            ? "descending=True means largest values first (or reverse alphabetical for strings)."
            : "With no descending argument, sort uses ascending order: smallest (or A) first.",
          argFocus: query.descending ? 1 : 0,
          focusColumns: [label],
        }),
      );
      push(
        base(table, {
          phase: "execute",
          title: "Compare values in the column",
          body: `The visualizer reads "${label}" in every row, then rearranges whole rows together — a row's other values travel with it.`,
          argFocus: query.descending ? 1 : 0,
          focusColumns: [label],
          durationMs: 1100,
        }),
      );
      push(
        base(sorted, {
          phase: "execute",
          title: "Rows rearrange",
          body: "The table is now ordered. Ties keep their previous relative order (stable sort).",
          focusColumns: [label],
          originalIndices: order,
          durationMs: 1200,
        }),
      );
      push(
        base(sorted, {
          phase: "result",
          title: "Result table",
          body: `A new table with the same ${n} rows, sorted by "${label}" (${query.descending ? "descending" : "ascending"}).`,
          focusColumns: [label],
          originalIndices: order,
          resultTable: sorted,
          resultCaption: `Sorted by "${label}"`,
        }),
      );
      break;
    }

    case "sample": {
      const picked = sampledIndexSequence(table, query.k, query.withReplacement, rng);
      const kDefault = query.k === n;
      push(
        base(table, {
          phase: "explain",
          title: kDefault ? "k defaults to num_rows" : "Argument 1: k, the sample size",
          body: kDefault
            ? `No k was given, so k = students.num_rows = ${n}. The result will have ${n} rows.`
            : `k = ${query.k} means draw ${query.k} rows. The result table will have ${query.k} rows.`,
          argFocus: kDefault ? undefined : 0,
        }),
      );
      push(
        base(table, {
          phase: "explain",
          title: query.withReplacement ? "Sampling with replacement" : "Sampling without replacement",
          body: query.withReplacement
            ? "Default is with_replacement=True. A row can be drawn more than once, so the result can contain duplicate rows. This is a bootstrap sample when k equals num_rows."
            : "with_replacement=False means each row can be drawn at most once. k cannot exceed num_rows.",
          argFocus: query.withReplacement ? 0 : 1,
        }),
      );
      const counts: Record<number, number> = {};
      picked.forEach((rowIndex, draw) => {
        counts[rowIndex] = (counts[rowIndex] ?? 0) + 1;
        const marks = emptyMarks(n);
        for (const key of Object.keys(counts)) marks[Number(key)] = "picked";
        marks[rowIndex] = "current";
        push(
          base(table, {
            phase: "execute",
            title: `Draw ${draw + 1} of ${query.k}`,
            body: query.withReplacement
              ? `Drew original row ${rowIndex}. This row has been selected ${counts[rowIndex]} time${counts[rowIndex] === 1 ? "" : "s"}.`
              : `Drew original row ${rowIndex}. It cannot be drawn again.`,
            currentRow: rowIndex,
            rowMarks: marks,
            counter: { label: "draws", value: draw + 1, caption: `${draw + 1} / ${query.k}` },
            durationMs: draw < 8 ? 200 : 70,
          }),
        );
      });
      push(
        base(table, {
          phase: "result",
          title: "Result table",
          body: `sample returns a new table with ${query.k} rows, in the order they were drawn.`,
          rowMarks: Object.fromEntries(
            Object.keys(counts).map((key) => [Number(key), "picked" as RowMark]),
          ),
          resultTable: takeRows(table, picked),
          resultCaption: `${query.k} sampled rows (${query.withReplacement ? "with" : "without"} replacement)`,
        }),
      );
      break;
    }
  }

  return { frames, seed };
}
