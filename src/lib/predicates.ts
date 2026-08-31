import type { CellValue } from "./table";

export type PredicateSpec =
  | { name: "equal_to"; args: [CellValue] }
  | { name: "not_equal_to"; args: [CellValue] }
  | { name: "above"; args: [number] }
  | { name: "above_or_equal_to"; args: [number] }
  | { name: "below"; args: [number] }
  | { name: "below_or_equal_to"; args: [number] }
  | { name: "between"; args: [number, number] }
  | { name: "between_or_equal_to"; args: [number, number] }
  | { name: "strictly_between"; args: [number, number] }
  | { name: "not_above"; args: [number] }
  | { name: "not_below"; args: [number] }
  | { name: "not_above_or_equal_to"; args: [number] }
  | { name: "not_below_or_equal_to"; args: [number] }
  | { name: "not_between"; args: [number, number] }
  | { name: "not_between_or_equal_to"; args: [number, number] }
  | { name: "not_strictly_between"; args: [number, number] }
  | { name: "containing"; args: [string] }
  | { name: "not_containing"; args: [string] }
  | { name: "contained_in"; args: [string] | [CellValue[]] }
  | { name: "not_contained_in"; args: [string] | [CellValue[]] };

export function evaluatePredicate(spec: PredicateSpec, value: CellValue): boolean {
  switch (spec.name) {
    case "equal_to":
      return value === spec.args[0];
    case "not_equal_to":
      return value !== spec.args[0];
    case "above":
      return typeof value === "number" && value > spec.args[0];
    case "above_or_equal_to":
      return typeof value === "number" && value >= spec.args[0];
    case "below":
      return typeof value === "number" && value < spec.args[0];
    case "below_or_equal_to":
      return typeof value === "number" && value <= spec.args[0];
    case "between":
      return typeof value === "number" && value >= spec.args[0] && value < spec.args[1];
    case "between_or_equal_to":
      return typeof value === "number" && value >= spec.args[0] && value <= spec.args[1];
    case "strictly_between":
      return typeof value === "number" && value > spec.args[0] && value < spec.args[1];
    case "not_above":
      return typeof value === "number" && value <= spec.args[0];
    case "not_below":
      return typeof value === "number" && value >= spec.args[0];
    case "not_above_or_equal_to":
      return typeof value === "number" && value < spec.args[0];
    case "not_below_or_equal_to":
      return typeof value === "number" && value > spec.args[0];
    case "not_between":
      return typeof value === "number" && !(value >= spec.args[0] && value < spec.args[1]);
    case "not_between_or_equal_to":
      return typeof value === "number" && !(value >= spec.args[0] && value <= spec.args[1]);
    case "not_strictly_between":
      return typeof value === "number" && !(value > spec.args[0] && value < spec.args[1]);
    case "containing":
      return String(value).includes(spec.args[0]);
    case "not_containing":
      return !String(value).includes(spec.args[0]);
    case "contained_in": {
      const haystack = spec.args[0];
      if (Array.isArray(haystack)) {
        return haystack.some((item) => item === value);
      }
      return haystack.includes(String(value));
    }
    case "not_contained_in": {
      const haystack = spec.args[0];
      if (Array.isArray(haystack)) {
        return !haystack.some((item) => item === value);
      }
      return !haystack.includes(String(value));
    }
  }
}

export function formatPredicate(spec: PredicateSpec): string {
  const [a, b] = spec.args as (CellValue | CellValue[])[];
  const fmt = (v: CellValue | CellValue[]): string => {
    if (Array.isArray(v)) {
      return `make_array(${v.map((item) => (typeof item === "string" ? `"${item}"` : String(item))).join(", ")})`;
    }
    return typeof v === "string" ? `"${v}"` : String(v);
  };
  if (b !== undefined) {
    return `are.${spec.name}(${fmt(a)}, ${fmt(b)})`;
  }
  return `are.${spec.name}(${fmt(a)})`;
}

export function describePredicate(spec: PredicateSpec, column: string): string {
  const fmt = (v: CellValue | CellValue[]): string => {
    if (Array.isArray(v)) {
      return v.map((item) => (typeof item === "string" ? `"${item}"` : String(item))).join(", ");
    }
    return typeof v === "string" ? `"${v}"` : String(v);
  };
  const col = `"${column}"`;
  switch (spec.name) {
    case "equal_to":
      return `Keep a row when ${col} is equal to ${fmt(spec.args[0])}.`;
    case "not_equal_to":
      return `Keep a row when ${col} is not equal to ${fmt(spec.args[0])}.`;
    case "above":
      return `Keep a row when ${col} is strictly greater than ${spec.args[0]}.`;
    case "above_or_equal_to":
      return `Keep a row when ${col} is greater than or equal to ${spec.args[0]}.`;
    case "below":
      return `Keep a row when ${col} is strictly less than ${spec.args[0]}.`;
    case "below_or_equal_to":
      return `Keep a row when ${col} is less than or equal to ${spec.args[0]}.`;
    case "between":
      return `Keep a row when ${col} is ≥ ${spec.args[0]} and < ${spec.args[1]}. The left endpoint is included; the right endpoint is not.`;
    case "between_or_equal_to":
      return `Keep a row when ${col} is ≥ ${spec.args[0]} and ≤ ${spec.args[1]}. Both endpoints are included.`;
    case "strictly_between":
      return `Keep a row when ${col} is > ${spec.args[0]} and < ${spec.args[1]}. Neither endpoint is included.`;
    case "not_above":
      return `Keep a row when ${col} is not above ${spec.args[0]} — that is, when it is ≤ ${spec.args[0]}.`;
    case "not_below":
      return `Keep a row when ${col} is not below ${spec.args[0]} — that is, when it is ≥ ${spec.args[0]}.`;
    case "not_above_or_equal_to":
      return `Keep a row when ${col} is strictly less than ${spec.args[0]}.`;
    case "not_below_or_equal_to":
      return `Keep a row when ${col} is strictly greater than ${spec.args[0]}.`;
    case "not_between":
      return `Keep a row when ${col} is not in [${spec.args[0]}, ${spec.args[1]}) — that is, when it is < ${spec.args[0]} or ≥ ${spec.args[1]}.`;
    case "not_between_or_equal_to":
      return `Keep a row when ${col} is not in [${spec.args[0]}, ${spec.args[1]}] — that is, when it is < ${spec.args[0]} or > ${spec.args[1]}.`;
    case "not_strictly_between":
      return `Keep a row when ${col} is not strictly between ${spec.args[0]} and ${spec.args[1]}.`;
    case "containing":
      return `Keep a row when the string in ${col} contains ${fmt(spec.args[0])} as a substring.`;
    case "not_containing":
      return `Keep a row when the string in ${col} does not contain ${fmt(spec.args[0])}.`;
    case "contained_in":
      return Array.isArray(spec.args[0])
        ? `Keep a row when the value in ${col} is one of ${fmt(spec.args[0])}.`
        : `Keep a row when the value in ${col} is a substring of ${fmt(spec.args[0])}.`;
    case "not_contained_in":
      return Array.isArray(spec.args[0])
        ? `Keep a row when the value in ${col} is not one of ${fmt(spec.args[0])}.`
        : `Keep a row when the value in ${col} is not a substring of ${fmt(spec.args[0])}.`;
  }
}

export function compareExpression(
  spec: PredicateSpec,
  value: CellValue,
  passed: boolean,
): string {
  const shown = typeof value === "string" ? `"${value}"` : String(value);
  const verb = passed ? "is true" : "is false";
  switch (spec.name) {
    case "equal_to":
      return `${shown} == ${typeof spec.args[0] === "string" ? `"${spec.args[0]}"` : spec.args[0]}  →  ${verb}`;
    case "not_equal_to":
      return `${shown} != ${typeof spec.args[0] === "string" ? `"${spec.args[0]}"` : spec.args[0]}  →  ${verb}`;
    case "above":
      return `${shown} > ${spec.args[0]}  →  ${verb}`;
    case "above_or_equal_to":
      return `${shown} >= ${spec.args[0]}  →  ${verb}`;
    case "below":
      return `${shown} < ${spec.args[0]}  →  ${verb}`;
    case "below_or_equal_to":
      return `${shown} <= ${spec.args[0]}  →  ${verb}`;
    case "between":
      return `${spec.args[0]} <= ${shown} < ${spec.args[1]}  →  ${verb}`;
    case "between_or_equal_to":
      return `${spec.args[0]} <= ${shown} <= ${spec.args[1]}  →  ${verb}`;
    case "strictly_between":
      return `${spec.args[0]} < ${shown} < ${spec.args[1]}  →  ${verb}`;
    case "not_above":
      return `not (${shown} > ${spec.args[0]})  →  ${verb}`;
    case "not_below":
      return `not (${shown} < ${spec.args[0]})  →  ${verb}`;
    case "not_above_or_equal_to":
      return `not (${shown} >= ${spec.args[0]})  →  ${verb}`;
    case "not_below_or_equal_to":
      return `not (${shown} <= ${spec.args[0]})  →  ${verb}`;
    case "not_between":
      return `not (${spec.args[0]} <= ${shown} < ${spec.args[1]})  →  ${verb}`;
    case "not_between_or_equal_to":
      return `not (${spec.args[0]} <= ${shown} <= ${spec.args[1]})  →  ${verb}`;
    case "not_strictly_between":
      return `not (${spec.args[0]} < ${shown} < ${spec.args[1]})  →  ${verb}`;
    case "containing":
      return `"${spec.args[0]}" in ${shown}  →  ${verb}`;
    case "not_containing":
      return `"${spec.args[0]}" not in ${shown}  →  ${verb}`;
    case "contained_in":
      return Array.isArray(spec.args[0])
        ? `${shown} in make_array(...)  →  ${verb}`
        : `${shown} in "${spec.args[0]}"  →  ${verb}`;
    case "not_contained_in":
      return Array.isArray(spec.args[0])
        ? `${shown} not in make_array(...)  →  ${verb}`
        : `${shown} not in "${spec.args[0]}"  →  ${verb}`;
  }
}
