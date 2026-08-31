import { NUMERIC_COLUMNS, RELABEL_OPTIONS, uniqueValues } from "./dataset";
import type { FunctionId, Query } from "./functions";
import type { PredicateSpec } from "./predicates";
import type { CellValue, TableData } from "./table";

export const TAKE_PRESETS: { label: string; indices: number[] }[] = [
  { label: "0  (first row)", indices: [0] },
  { label: "np.arange(5)", indices: [0, 1, 2, 3, 4] },
  { label: "np.arange(10)", indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { label: "np.arange(50, 55)", indices: [50, 51, 52, 53, 54] },
  { label: "make_array(0, 4, 9, 16, 25)", indices: [0, 4, 9, 16, 25] },
  { label: "make_array(2, 20, 40, 80)", indices: [2, 20, 40, 80] },
  { label: "99  (last row)", indices: [99] },
];

export const SHOW_PRESETS: { label: string; n: number | null }[] = [
  { label: "no argument (entire table)", n: null },
  { label: "5", n: 5 },
  { label: "10", n: 10 },
  { label: "20", n: 20 },
  { label: "50", n: 50 },
];

export const SPLIT_PRESETS = [10, 20, 25, 50, 80];
export const SAMPLE_K_PRESETS = [5, 10, 20, 50, 100];

export const NUMERIC_PREDICATE_NAMES: PredicateSpec["name"][] = [
  "above",
  "above_or_equal_to",
  "below",
  "below_or_equal_to",
  "between",
  "between_or_equal_to",
  "strictly_between",
  "equal_to",
  "not_equal_to",
  "not_above",
  "not_below",
  "not_above_or_equal_to",
  "not_below_or_equal_to",
  "not_between",
  "not_between_or_equal_to",
  "not_strictly_between",
];

export const STRING_PREDICATE_NAMES: PredicateSpec["name"][] = [
  "equal_to",
  "not_equal_to",
  "containing",
  "not_containing",
  "contained_in",
  "not_contained_in",
];

export function isNumericColumn(column: string): boolean {
  return NUMERIC_COLUMNS.includes(column as (typeof NUMERIC_COLUMNS)[number]);
}

export function isTwoArgPredicate(name: PredicateSpec["name"]): boolean {
  return name.includes("between");
}

export function isSubstringPredicate(name: PredicateSpec["name"]): boolean {
  return name.includes("containing");
}

export function isMembershipPredicate(name: PredicateSpec["name"]): boolean {
  return name.includes("contained_in");
}

export function predicateNamesFor(column: string): PredicateSpec["name"][] {
  return isNumericColumn(column) ? NUMERIC_PREDICATE_NAMES : STRING_PREDICATE_NAMES;
}

export function numericValueChoices(table: TableData, column: string): number[] {
  const nums = table.columns[column].filter((v): v is number => typeof v === "number");
  const extra: Record<string, number[]> = {
    GPA: [2.5, 3.0, 3.5, 3.7],
    Units: [12, 13, 16, 18, 20],
    Midterm: [60, 70, 80, 90],
    "Hours Studying": [10, 15, 20, 25],
  };
  const unique = uniqueValues(table, column).filter((v): v is number => typeof v === "number");
  return [...new Set([...extra[column] ?? [], ...unique, nums[0]])].filter((v) => v !== undefined).sort(
    (a, b) => a - b,
  );
}

const CONTAINING_PRESETS: Record<string, string[]> = {
  Name: ["a", "an", "el", "i"],
  Year: ["or", "Fresh"],
  Major: ["Science", "Computer"],
  Residence: ["Unit", "Campus"],
  "Favorite Subject": ["tion", "ing"],
  "Club Member": ["e", "Y"],
};

export function containingChoices(column: string): string[] {
  return CONTAINING_PRESETS[column] ?? ["a"];
}

export function containedInChoices(table: TableData, column: string): { label: string; value: CellValue[] | string }[] {
  const unique = uniqueValues(table, column);
  const choices: { label: string; value: CellValue[] | string }[] = [];
  if (unique.length >= 2) {
    const pair = unique.slice(0, 2);
    const triple = unique.slice(0, Math.min(3, unique.length));
    const fmt = (items: CellValue[]) =>
      `make_array(${items.map((item) => (typeof item === "string" ? `"${item}"` : String(item))).join(", ")})`;
    choices.push({ label: fmt(pair), value: pair });
    if (triple.length > pair.length) {
      choices.push({ label: fmt(triple), value: triple });
    }
  }
  if (column === "Year") {
    choices.push({ label: '"FreshmanSophomore"', value: "FreshmanSophomore" });
  }
  if (column === "Club Member") {
    choices.push({ label: '"YesNo"', value: "YesNo" });
  }
  return choices;
}

export function resolveColumnLabel(table: TableData, column: string | number): string {
  return typeof column === "number" ? table.labels[column] : column;
}

export function makePredicate(
  table: TableData,
  column: string,
  name: PredicateSpec["name"],
  arg0?: CellValue | CellValue[],
  arg1?: number,
): PredicateSpec {
  if (isTwoArgPredicate(name)) {
    const values = numericValueChoices(table, column);
    const y = typeof arg0 === "number" ? arg0 : values[0];
    const z = arg1 ?? values[Math.min(values.length - 1, 2)];
    return { name, args: [y, z] } as PredicateSpec;
  }
  if (isSubstringPredicate(name)) {
    const sub = typeof arg0 === "string" ? arg0 : containingChoices(column)[0];
    return { name, args: [sub] } as PredicateSpec;
  }
  if (isMembershipPredicate(name)) {
    const choice = containedInChoices(table, column)[0];
    return { name, args: [arg0 ?? choice.value] } as PredicateSpec;
  }
  if (isNumericColumn(column)) {
    const values = numericValueChoices(table, column);
    const y = typeof arg0 === "number" ? arg0 : (values.includes(3.5) ? 3.5 : values[Math.floor(values.length / 2)]);
    return { name, args: [y] } as PredicateSpec;
  }
  const unique = uniqueValues(table, column);
  const y = arg0 ?? unique[0];
  return { name, args: [y] } as PredicateSpec;
}

export function defaultQuery(fn: FunctionId): Query {
  switch (fn) {
    case "num_rows":
      return { fn };
    case "num_columns":
      return { fn };
    case "labels":
      return { fn };
    case "split":
      return { fn, n: 20 };
    case "show":
      return { fn, n: 10 };
    case "column":
      return { fn, column: "GPA" };
    case "select":
      return { fn, columns: ["Name", "Major", "GPA"] };
    case "drop":
      return { fn, columns: ["Club Member", "Residence"] };
    case "relabeled":
      return { fn, oldLabel: "GPA", newLabel: RELABEL_OPTIONS.GPA[0] };
    case "where":
      return {
        fn,
        column: "GPA",
        predicate: { name: "above", args: [3.5] },
      };
    case "take":
      return { fn, indices: [0, 1, 2, 3, 4] };
    case "sort":
      return { fn, column: "GPA", descending: false };
    case "sample":
      return { fn, k: 10, withReplacement: true };
  }
}

export function columnChoices(table: TableData): { label: string; value: string | number }[] {
  const byName = table.labels.map((label) => ({ label: `"${label}"`, value: label as string | number }));
  const byIndex = table.labels.map((label, i) => ({
    label: `${i}  (column "${label}")`,
    value: i as string | number,
  }));
  return [...byName, ...byIndex];
}
