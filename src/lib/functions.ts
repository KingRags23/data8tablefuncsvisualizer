import type { PredicateSpec } from "./predicates";

export type FunctionId =
  | "num_rows"
  | "num_columns"
  | "labels"
  | "split"
  | "show"
  | "column"
  | "select"
  | "drop"
  | "relabeled"
  | "where"
  | "take"
  | "sort"
  | "sample";

export type Query =
  | { fn: "num_rows" }
  | { fn: "num_columns" }
  | { fn: "labels" }
  | { fn: "split"; n: number }
  | { fn: "show"; n: number | null }
  | { fn: "column"; column: string | number }
  | { fn: "select"; columns: (string | number)[] }
  | { fn: "drop"; columns: (string | number)[] }
  | { fn: "relabeled"; oldLabel: string; newLabel: string }
  | { fn: "where"; column: string | number; predicate: PredicateSpec }
  | { fn: "take"; indices: number[] }
  | { fn: "sort"; column: string | number; descending: boolean }
  | { fn: "sample"; k: number; withReplacement: boolean };

export interface FunctionInfo {
  id: FunctionId;
  codeName: string;
  signature: string;
  chapter: string;
  output: string;
  summary: string;
  details: string;
  arguments: { name: string; optional?: boolean; text: string }[];
}

export const FUNCTION_INFO: Record<FunctionId, FunctionInfo> = {
  num_rows: {
    id: "num_rows",
    codeName: "num_rows",
    signature: "tbl.num_rows",
    chapter: "Ch 6",
    output: "int — number of rows in the table",
    summary: "A property (not a method) that counts how many rows the table has.",
    details:
      "There are no arguments and no parentheses. Evaluating students.num_rows returns a single integer. In this visualizer the table has 100 rows, so the result is 100.",
    arguments: [],
  },
  num_columns: {
    id: "num_columns",
    codeName: "num_columns",
    signature: "tbl.num_columns",
    chapter: "Ch 6",
    output: "int — number of columns in the table",
    summary: "A property that counts how many columns the table has.",
    details:
      "Like num_rows, this is a property: no parentheses. It counts labels, not rows. This table has 10 columns.",
    arguments: [],
  },
  labels: {
    id: "labels",
    codeName: "labels",
    signature: "tbl.labels",
    chapter: "Ch 6",
    output: "array of strings — the column names, in order",
    summary: "Returns an array of every column label in the table, from left to right.",
    details:
      "This is a property. The result is an array of strings, not a table. The order matches the left-to-right order of the columns.",
    arguments: [],
  },
  split: {
    id: "split",
    codeName: "split",
    signature: "tbl.split(n)",
    chapter: "Ch 17.6",
    output: "tuple of two tables",
    summary:
      "Randomly samples n rows without replacement into a first table, and puts the leftover rows into a second table.",
    details:
      "n must be between 1 and tbl.num_rows - 1. Sampling is without replacement, so no row appears in both tables. The original table is not modified. This is often used to create a training set and a remaining set.",
    arguments: [
      {
        name: "n",
        text: "Integer number of rows randomly sampled into the first table. Must be between 1 and num_rows - 1.",
      },
    ],
  },
  show: {
    id: "show",
    codeName: "show",
    signature: "tbl.show(n)",
    chapter: "Ch 6.1",
    output: "None — displays a table in the notebook",
    summary: "Displays n rows of the table. With no argument, displays the entire table.",
    details:
      "show does not return a new table. It only controls how many rows are displayed. If n is omitted, every row is shown. The underlying table is unchanged.",
    arguments: [
      {
        name: "n",
        optional: true,
        text: "Optional integer. Number of rows to display. If omitted, the entire table is displayed.",
      },
    ],
  },
  column: {
    id: "column",
    codeName: "column",
    signature: "tbl.column(column_name_or_index)",
    chapter: "Ch 6",
    output: "array — the values in that column",
    summary: "Extracts one column as an array, in row order.",
    details:
      "The argument can be a column name (string) or a column index (int, starting at 0). The result is an array, not a one-column table. Use select if you want to keep table form.",
    arguments: [
      {
        name: "column_name_or_index",
        text: "String column label, or integer index of the column to extract.",
      },
    ],
  },
  select: {
    id: "select",
    codeName: "select",
    signature: "tbl.select(col1, col2, ...)",
    chapter: "Ch 6",
    output: "Table with only the selected columns",
    summary: "Returns a copy of the table that keeps only the listed columns, in the order you list them.",
    details:
      "Each argument is a column name or index. Rows are unchanged. The original table is not modified. Column order in the result follows the order of the arguments, not the original table.",
    arguments: [
      {
        name: "col1, col2, ...",
        text: "One or more column names or indices to keep.",
      },
    ],
  },
  drop: {
    id: "drop",
    codeName: "drop",
    signature: "tbl.drop(col1, col2, ...)",
    chapter: "Ch 6",
    output: "Table without the listed columns",
    summary: "Returns a copy of the table with the listed columns removed.",
    details:
      "Each argument is a column name or index. Remaining columns stay in their original order. Rows are unchanged.",
    arguments: [
      {
        name: "col1, col2, ...",
        text: "One or more column names or indices to remove.",
      },
    ],
  },
  relabeled: {
    id: "relabeled",
    codeName: "relabeled",
    signature: "tbl.relabeled(old_label, new_label)",
    chapter: "Ch 6",
    output: "Table — a copy with one column renamed",
    summary: "Returns a new table where one column has a new name. Data values do not change.",
    details:
      "old_label must already exist. The original table is left unchanged (that is why the method is called relabeled, not relabel). Only the header changes.",
    arguments: [
      { name: "old_label", text: "Current column name (string)." },
      { name: "new_label", text: "Replacement column name (string)." },
    ],
  },
  where: {
    id: "where",
    codeName: "where",
    signature: "tbl.where(column, predicate)",
    chapter: "Ch 6.2",
    output: "Table — only the rows that match the predicate",
    summary: "Keeps rows whose value in a chosen column satisfies an are. predicate.",
    details:
      "The first argument is a column name or index. The second is a predicate such as are.equal_to(x) or are.above(x). Every row is checked independently. Rows that fail the test are dropped; the rest stay in their original order.",
    arguments: [
      { name: "column", text: "Column name or index to test." },
      {
        name: "predicate",
        text: "An are. predicate, for example are.above(3.5) or are.containing(\"Science\"). Predicates can be negated with not_, such as are.not_equal_to(x).",
      },
    ],
  },
  take: {
    id: "take",
    codeName: "take",
    signature: "tbl.take(row_indices)",
    chapter: "Ch 6.2",
    output: "Table — only the rows at the given indices",
    summary: "Keeps rows by position. Indices start at 0.",
    details:
      "The argument is a single integer or an array of integers. The result contains those rows in the order listed, which need not be sorted. take does not filter by value — that is what where is for.",
    arguments: [
      {
        name: "row_indices",
        text: "An integer index, or an array of indices such as np.arange(5) or make_array(0, 2, 9).",
      },
    ],
  },
  sort: {
    id: "sort",
    codeName: "sort",
    signature: "tbl.sort(column_name_or_index, descending=False)",
    chapter: "Ch 6.1",
    output: "Table — a copy sorted by the chosen column",
    summary: "Returns a copy of the table ordered by one column. Default is ascending.",
    details:
      "Pass descending=True to reverse the order. Ties keep a stable relative order. Strings are sorted alphabetically. The original table is not modified.",
    arguments: [
      { name: "column_name_or_index", text: "Column name or index to sort by." },
      {
        name: "descending",
        optional: true,
        text: "Optional boolean. Default False (ascending). Set True for descending order.",
      },
    ],
  },
  sample: {
    id: "sample",
    codeName: "sample",
    signature: "tbl.sample(k, with_replacement)",
    chapter: "Ch 10",
    output: "Table — k randomly sampled rows",
    summary:
      "Draws k rows at random. By default k is the number of rows and sampling is with replacement.",
    details:
      "Default: tbl.sample() draws num_rows rows with replacement (a bootstrap sample). with_replacement=False draws without replacement, so k cannot exceed num_rows. Each draw is independent of values — unlike where, sample does not look at column contents when choosing rows.",
    arguments: [
      {
        name: "k",
        optional: true,
        text: "Sample size. Defaults to tbl.num_rows.",
      },
      {
        name: "with_replacement",
        optional: true,
        text: "Boolean. Default True. Use False to sample without replacement.",
      },
    ],
  },
};

export interface FunctionUsage {
  form: string;
  argCount: string;
  examples: string[];
}

export const FUNCTION_USAGE: Record<FunctionId, FunctionUsage> = {
  num_rows: {
    form: "students.num_rows",
    argCount: "Takes no arguments. It is a property, so do not use parentheses.",
    examples: ["students.num_rows"],
  },
  num_columns: {
    form: "students.num_columns",
    argCount: "Takes no arguments. It is a property, so do not use parentheses.",
    examples: ["students.num_columns"],
  },
  labels: {
    form: "students.labels",
    argCount: "Takes no arguments. It is a property, so do not use parentheses.",
    examples: ["students.labels"],
  },
  split: {
    form: "students.split(n)",
    argCount: "Takes 1 required argument: n, an integer between 1 and num_rows - 1.",
    examples: ["students.split(20)"],
  },
  show: {
    form: "students.show(n)",
    argCount: "Takes 0 or 1 argument. n is optional; omit it to display the whole table.",
    examples: ["students.show()", "students.show(10)"],
  },
  column: {
    form: "students.column(column_name_or_index)",
    argCount: "Takes 1 required argument: a column name (string) or a column index (int).",
    examples: ['students.column("GPA")', "students.column(3)"],
  },
  select: {
    form: "students.select(col1, col2, ...)",
    argCount: "Takes 1 or more arguments: column names or indices to keep.",
    examples: ['students.select("Name", "Major", "GPA")'],
  },
  drop: {
    form: "students.drop(col1, col2, ...)",
    argCount: "Takes 1 or more arguments: column names or indices to remove.",
    examples: ['students.drop("Club Member", "Residence")'],
  },
  relabeled: {
    form: "students.relabeled(old_label, new_label)",
    argCount: "Takes 2 required arguments: the current column name, then the new name. Both are strings.",
    examples: ['students.relabeled("GPA", "Grade Point Average")'],
  },
  where: {
    form: "students.where(column, predicate)",
    argCount:
      "Takes 2 required arguments: a column name or index, then an are. predicate such as are.above(3.5).",
    examples: [
      'students.where("GPA", are.above(3.5))',
      'students.where("Year", are.equal_to("Freshman"))',
    ],
  },
  take: {
    form: "students.take(row_indices)",
    argCount:
      "Takes 1 required argument: a single integer index, or an array of indices from np.arange(...) or make_array(...).",
    examples: ["students.take(0)", "students.take(np.arange(5))", "students.take(make_array(0, 4, 9))"],
  },
  sort: {
    form: "students.sort(column_name_or_index, descending=False)",
    argCount:
      "Takes 1 required argument (the column) and 1 optional keyword argument, descending=True or descending=False.",
    examples: ['students.sort("GPA")', 'students.sort("Midterm", descending=True)'],
  },
  sample: {
    form: "students.sample(k, with_replacement=True)",
    argCount:
      "Takes 0 to 2 arguments. k is the sample size (default: num_rows). with_replacement defaults to True.",
    examples: ["students.sample()", "students.sample(10)", "students.sample(10, with_replacement=False)"],
  },
};

export const FUNCTION_ORDER: FunctionId[] = [
  "num_rows",
  "num_columns",
  "labels",
  "split",
  "show",
  "column",
  "select",
  "drop",
  "relabeled",
  "where",
  "take",
  "sort",
  "sample",
];
