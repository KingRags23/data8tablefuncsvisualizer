import {
  FUNCTION_INFO,
  FUNCTION_ORDER,
  FUNCTION_USAGE,
  type FunctionId,
  type Query,
} from "./functions";
import type { PredicateSpec } from "./predicates";
import { numRows, type CellValue, type TableData } from "./table";

export type ParseError = {
  ok: false;
  fn: FunctionId | null;
  headline: string;
  detail: string;
  signature?: string;
  example?: string;
};

export type ParseSuccess = {
  ok: true;
  fn: FunctionId;
  query: Query;
};

export type ParseResult = ParseSuccess | ParseError;

const PROPERTIES = new Set<FunctionId>(["num_rows", "num_columns", "labels"]);

const TWO_ARG_PREDICATES = new Set([
  "between",
  "between_or_equal_to",
  "strictly_between",
  "not_between",
  "not_between_or_equal_to",
  "not_strictly_between",
]);

const PREDICATE_NAMES = new Set<PredicateSpec["name"]>([
  "equal_to",
  "not_equal_to",
  "above",
  "above_or_equal_to",
  "below",
  "below_or_equal_to",
  "between",
  "between_or_equal_to",
  "strictly_between",
  "not_above",
  "not_below",
  "not_above_or_equal_to",
  "not_below_or_equal_to",
  "not_between",
  "not_between_or_equal_to",
  "not_strictly_between",
  "containing",
  "not_containing",
  "contained_in",
  "not_contained_in",
]);

const NUMERIC_PREDICATES = new Set([
  "above",
  "above_or_equal_to",
  "below",
  "below_or_equal_to",
  "between",
  "between_or_equal_to",
  "strictly_between",
  "not_above",
  "not_below",
  "not_above_or_equal_to",
  "not_below_or_equal_to",
  "not_between",
  "not_between_or_equal_to",
  "not_strictly_between",
]);

type ParsedValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "array"; values: CellValue[] }
  | { kind: "predicate"; spec: PredicateSpec };

function fail(
  fn: FunctionId | null,
  headline: string,
  detail: string,
): ParseError {
  const usage = fn ? FUNCTION_USAGE[fn] : undefined;
  const info = fn ? FUNCTION_INFO[fn] : undefined;
  return {
    ok: false,
    fn,
    headline,
    detail,
    signature: usage?.form ?? info?.signature,
    example: usage?.examples[0],
  };
}

function usageDetail(fn: FunctionId): string {
  const usage = FUNCTION_USAGE[fn];
  return `${usage.argCount} Write ${usage.form}. Example: ${usage.examples[0]}`;
}

function arityError(fn: FunctionId, got: number): ParseError {
  const usage = FUNCTION_USAGE[fn];
  return fail(
    fn,
    `Incorrect number of arguments for .${fn}.`,
    `${usage.argCount} This call passed ${got} argument${got === 1 ? "" : "s"}. ${usageDetail(fn)}`,
  );
}

export function peekFunction(source: string): FunctionId | null {
  const trimmed = source.trim();
  const dotted = trimmed.match(/^(?:students|tbl)\s*\.\s*([A-Za-z_]+)/);
  const name = dotted?.[1] ?? trimmed.match(/^([A-Za-z_]+)\s*(\(|$)/)?.[1];
  if (!name) return null;
  return FUNCTION_ORDER.includes(name as FunctionId) ? (name as FunctionId) : null;
}

function splitTopLevel(input: string): string[] {
  if (!input.trim()) return [];
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (const ch of input) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[") {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ")" || ch === "]") {
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseString(raw: string): string | null {
  if (raw.length < 2) return null;
  const q = raw[0];
  if ((q !== '"' && q !== "'") || raw[raw.length - 1] !== q) return null;
  return raw.slice(1, -1);
}

function parseNumber(raw: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  return Number(raw);
}

function parseCall(raw: string): { name: string; inner: string } | null {
  const match = raw.match(/^([A-Za-z_][\w.]*)\s*\(/);
  if (!match) return null;
  const start = match[0].length;
  let depth = 1;
  let quote: '"' | "'" | null = null;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        if (raw.slice(i + 1).trim()) return null;
        return { name: match[1], inner: raw.slice(start, i) };
      }
    }
  }
  return null;
}

function parseArrayLiteral(raw: string): CellValue[] | null {
  if (!raw.startsWith("[") || !raw.endsWith("]")) return null;
  const inner = raw.slice(1, -1);
  const parts = splitTopLevel(inner);
  const values: CellValue[] = [];
  for (const part of parts) {
    const str = parseString(part);
    if (str !== null) {
      values.push(str);
      continue;
    }
    const num = parseNumber(part);
    if (num !== null) {
      values.push(num);
      continue;
    }
    return null;
  }
  return values;
}

function parsePredicate(raw: string, fn: FunctionId): { kind: "predicate"; spec: PredicateSpec } | ParseError {
  const call = parseCall(raw);
  if (!call || !call.name.startsWith("are.")) {
    return fail(
      fn,
      "The second argument of .where must be an are. predicate.",
      'Write a predicate such as are.above(3.5), are.equal_to("Freshman"), or are.containing("Science"). ' +
        usageDetail("where"),
    );
  }
  const name = call.name.slice(4) as PredicateSpec["name"];
  if (!PREDICATE_NAMES.has(name)) {
    return fail(
      fn,
      `Unknown predicate are.${name}.`,
      "Use a Data 8 predicate such as equal_to, above, below, between, containing, or contained_in. You can negate most of them with not_, for example are.not_equal_to(x).",
    );
  }
  const args = splitTopLevel(call.inner);
  const expected = TWO_ARG_PREDICATES.has(name) ? 2 : 1;
  if (args.length !== expected) {
    return fail(
      fn,
      `are.${name} takes ${expected} argument${expected === 1 ? "" : "s"}, but ${args.length} ${args.length === 1 ? "was" : "were"} given.`,
      expected === 2
        ? `Write are.${name}(x, y), where x and y are numbers.`
        : `Write are.${name}(x).`,
    );
  }

  const parsedArgs: CellValue[] = [];
  for (const arg of args) {
    const arrayCall = parseCall(arg);
    if (arrayCall && (arrayCall.name === "make_array" || arrayCall.name === "np.array")) {
      const values = splitTopLevel(arrayCall.inner).map((part) => {
        const str = parseString(part);
        if (str !== null) return str;
        const num = parseNumber(part);
        if (num !== null) return num;
        return null;
      });
      if (values.some((v) => v === null)) {
        return fail(fn, `Could not read the array inside are.${name}.`, "Use make_array with strings or numbers, for example make_array(\"Freshman\", \"Sophomore\").");
      }
      parsedArgs.push(values as unknown as CellValue);
      continue;
    }
    const list = parseArrayLiteral(arg);
    if (list) {
      parsedArgs.push(list as unknown as CellValue);
      continue;
    }
    const str = parseString(arg);
    if (str !== null) {
      parsedArgs.push(str);
      continue;
    }
    const num = parseNumber(arg);
    if (num !== null) {
      parsedArgs.push(num);
      continue;
    }
    return fail(
      fn,
      `Could not read an argument of are.${name}.`,
      "Predicate arguments should be numbers, quoted strings, or make_array(...).",
    );
  }

  if (NUMERIC_PREDICATES.has(name)) {
    if (parsedArgs.some((value) => typeof value !== "number")) {
      return fail(fn, `are.${name} needs numeric argument${expected === 1 ? "" : "s"}.`, `Example: are.${name}(${expected === 2 ? "3.0, 3.7" : "3.5"}).`);
    }
  }
  if (name === "containing" || name === "not_containing") {
    if (typeof parsedArgs[0] !== "string") {
      return fail(fn, `are.${name} needs a string.`, 'Example: are.containing("Science").');
    }
  }

  if (name === "contained_in" || name === "not_contained_in") {
    const first = parsedArgs[0];
    if (typeof first === "string" || Array.isArray(first)) {
      return { kind: "predicate", spec: { name, args: [first] } as PredicateSpec };
    }
    return fail(fn, `are.${name} needs a string or an array.`, 'Example: are.contained_in(make_array("Freshman", "Sophomore")).');
  }

  if (TWO_ARG_PREDICATES.has(name)) {
    return {
      kind: "predicate",
      spec: { name, args: [parsedArgs[0] as number, parsedArgs[1] as number] } as PredicateSpec,
    };
  }

  return { kind: "predicate", spec: { name, args: [parsedArgs[0]] } as PredicateSpec };
}

function parseValue(raw: string, fn: FunctionId, allowPredicate: boolean): ParsedValue | ParseError {
  const text = raw.trim();
  if (text === "True" || text === "true") return { kind: "boolean", value: true };
  if (text === "False" || text === "false") return { kind: "boolean", value: false };

  const str = parseString(text);
  if (str !== null) return { kind: "string", value: str };

  const num = parseNumber(text);
  if (num !== null) return { kind: "number", value: num };

  const list = parseArrayLiteral(text);
  if (list) return { kind: "array", values: list };

  const call = parseCall(text);
  if (call) {
    if (call.name === "make_array" || call.name === "np.array") {
      const parts = splitTopLevel(call.inner);
      const values: CellValue[] = [];
      for (const part of parts) {
        const innerStr = parseString(part);
        if (innerStr !== null) {
          values.push(innerStr);
          continue;
        }
        const innerNum = parseNumber(part);
        if (innerNum !== null) {
          values.push(innerNum);
          continue;
        }
        return fail(fn, "Could not read a make_array argument.", "Each item should be a quoted string or a number.");
      }
      return { kind: "array", values };
    }
    if (call.name === "np.arange" || call.name === "numpy.arange") {
      const parts = splitTopLevel(call.inner).map((part) => parseNumber(part));
      if (parts.some((p) => p === null) || parts.length === 0 || parts.length > 3) {
        return fail(fn, "np.arange should look like np.arange(stop) or np.arange(start, stop).", "Example: np.arange(5) or np.arange(50, 55).");
      }
      const nums = parts as number[];
      if (nums.some((n) => !Number.isInteger(n))) {
        return fail(fn, "np.arange arguments should be integers.", "Example: np.arange(5).");
      }
      const start = nums.length === 1 ? 0 : nums[0];
      const stop = nums.length === 1 ? nums[0] : nums[1];
      const step = nums.length === 3 ? nums[2] : 1;
      if (step === 0) return fail(fn, "np.arange step cannot be 0.", "Use a non-zero step.");
      const values: number[] = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) values.push(i);
      } else {
        for (let i = start; i > stop; i += step) values.push(i);
      }
      return { kind: "array", values };
    }
    if (call.name.startsWith("are.")) {
      if (!allowPredicate) {
        return fail(fn, `.${fn} does not take an are. predicate.`, usageDetail(fn));
      }
      return parsePredicate(text, fn);
    }
  }

  if (text.startsWith("are.")) {
    return fail(
      fn,
      "An are. predicate needs parentheses.",
      'Write are.above(3.5), not are.above 3.5. ' + usageDetail("where"),
    );
  }

  if (/^[A-Za-z_]/.test(text)) {
    return fail(
      fn,
      `Unquoted name ${text}.`,
      'Column labels and strings need quotes, for example "GPA". Integer column indices do not need quotes.',
    );
  }

  return fail(fn, `Could not read ${text}.`, usageDetail(fn));
}

function splitKeyword(raw: string): { name: string; value: string } | null {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth += 1;
    if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "=" && depth === 0) {
      const name = raw.slice(0, i).trim();
      const value = raw.slice(i + 1).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && value) return { name, value };
    }
  }
  return null;
}

function asColumn(value: ParsedValue, fn: FunctionId, table: TableData): string | number | ParseError {
  if (value.kind === "string") {
    if (!table.labels.includes(value.value)) {
      return fail(
        fn,
        `There is no column named "${value.value}".`,
        `This table's labels are: ${table.labels.map((label) => `"${label}"`).join(", ")}.`,
      );
    }
    return value.value;
  }
  if (value.kind === "number") {
    if (!Number.isInteger(value.value) || value.value < 0 || value.value >= table.labels.length) {
      return fail(
        fn,
        `Column index ${value.value} is out of range.`,
        `Valid indices are 0 through ${table.labels.length - 1}.`,
      );
    }
    return value.value;
  }
  return fail(fn, "A column argument must be a string name or an integer index.", usageDetail(fn));
}

function isError(value: ParsedValue | ParseError | string | number): value is ParseError {
  return typeof value === "object" && "ok" in value && value.ok === false;
}

export function parseQuery(source: string, table: TableData): ParseResult {
  const trimmed = source.trim().replace(/;$/, "").trim();
  if (!trimmed) {
    return fail(
      null,
      "Type a table call to visualize.",
      'Start with the loaded table, for example students.where("GPA", are.above(3.5)).',
    );
  }

  const peeked = peekFunction(trimmed);
  const prefix = trimmed.match(/^(?:students|tbl)\s*\.\s*([A-Za-z_]+)(.*)$/s);
  if (!prefix) {
    if (peeked) {
      return fail(
        peeked,
        `Write the call on the students table.`,
        `Use students.${peeked}... ${usageDetail(peeked)}`,
      );
    }
    if (/^[A-Za-z_][\w]*\s*\(/.test(trimmed)) {
      return fail(
        null,
        "Start the call with students.",
        'The loaded table is named students. Example: students.where("GPA", are.above(3.5)). Supported methods: ' +
          FUNCTION_ORDER.map((id) => `.${id}`).join(", ") +
          ".",
      );
    }
    return fail(
      null,
      "That does not look like a Data 8 table call.",
      'Write students followed by a method or property, for example students.num_rows or students.where("Year", are.equal_to("Freshman")).',
    );
  }

  const name = prefix[1];
  const rest = prefix[2].trim();
  let hasCall = false;
  let inner = "";
  if (rest.startsWith("(")) {
    let depth = 0;
    let quote: '"' | "'" | null = null;
    let close = -1;
    for (let i = 0; i < rest.length; i++) {
      const ch = rest[i];
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === "(") depth += 1;
      if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) {
      return fail(peeked, "This call is missing a closing parenthesis.", "Check that every ( has a matching ).");
    }
    if (rest.slice(close + 1).trim()) {
      return fail(peeked, "Unexpected extra text after the call.", "Remove anything after the closing parenthesis.");
    }
    hasCall = true;
    inner = rest.slice(1, close);
  } else if (rest) {
    return fail(
      peeked,
      "Unexpected extra text after the method name.",
      "Properties have no parentheses. Methods need a single pair of parentheses.",
    );
  }
  const fn = FUNCTION_ORDER.includes(name as FunctionId) ? (name as FunctionId) : null;
  if (!fn) {
    return fail(
      null,
      `This visualizer does not support .${name}.`,
      "Supported calls: " +
        FUNCTION_ORDER.map((id) => FUNCTION_USAGE[id].form).join("; ") +
        ".",
    );
  }

  if (PROPERTIES.has(fn)) {
    if (hasCall) {
      return fail(
        fn,
        `.${fn} is a property, not a method.`,
        `Do not use parentheses. Write ${FUNCTION_USAGE[fn].form} with no arguments.`,
      );
    }
    return { ok: true, fn, query: { fn } as Query };
  }

  if (!hasCall) {
    return fail(
      fn,
      `.${fn} is a method, so it needs parentheses.`,
      usageDetail(fn),
    );
  }

  const rawArgs = splitTopLevel(inner);
  const positionals: string[] = [];
  const keywords: Record<string, string> = {};
  let seenKeyword = false;
  for (const raw of rawArgs) {
    const kw = splitKeyword(raw);
    if (kw) {
      seenKeyword = true;
      keywords[kw.name] = kw.value;
    } else if (seenKeyword) {
      return fail(fn, "Positional arguments cannot come after keyword arguments.", usageDetail(fn));
    } else {
      positionals.push(raw);
    }
  }

  const n = numRows(table);

  switch (fn) {
    case "split": {
      if (positionals.length !== 1 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      const value = parseValue(positionals[0], fn, false);
      if (isError(value)) return value;
      if (value.kind !== "number" || !Number.isInteger(value.value)) {
        return fail(fn, "split's argument n must be an integer.", usageDetail(fn));
      }
      if (value.value < 1 || value.value > n - 1) {
        return fail(fn, `n must be between 1 and ${n - 1}.`, "split needs at least one row in each of the two tables.");
      }
      return { ok: true, fn, query: { fn, n: value.value } };
    }
    case "show": {
      if (positionals.length > 1 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      if (positionals.length === 0) return { ok: true, fn, query: { fn, n: null } };
      const value = parseValue(positionals[0], fn, false);
      if (isError(value)) return value;
      if (value.kind !== "number" || !Number.isInteger(value.value) || value.value < 0) {
        return fail(fn, "show's argument n must be a non-negative integer.", usageDetail(fn));
      }
      return { ok: true, fn, query: { fn, n: value.value } };
    }
    case "column": {
      if (positionals.length !== 1 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      const value = parseValue(positionals[0], fn, false);
      if (isError(value)) return value;
      const column = asColumn(value, fn, table);
      if (isError(column)) return column;
      return { ok: true, fn, query: { fn, column } };
    }
    case "select":
    case "drop": {
      if (positionals.length < 1 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      const columns: (string | number)[] = [];
      for (const raw of positionals) {
        const value = parseValue(raw, fn, false);
        if (isError(value)) return value;
        const column = asColumn(value, fn, table);
        if (isError(column)) return column;
        columns.push(column);
      }
      if (fn === "drop" && columns.length >= table.labels.length) {
        return fail(fn, "drop cannot remove every column.", "Leave at least one column in the table.");
      }
      return { ok: true, fn, query: { fn, columns } };
    }
    case "relabeled": {
      if (positionals.length !== 2 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      const oldV = parseValue(positionals[0], fn, false);
      const newV = parseValue(positionals[1], fn, false);
      if (isError(oldV)) return oldV;
      if (isError(newV)) return newV;
      if (oldV.kind !== "string" || newV.kind !== "string") {
        return fail(fn, "Both arguments of relabeled must be strings.", usageDetail(fn));
      }
      if (!table.labels.includes(oldV.value)) {
        return fail(fn, `There is no column named "${oldV.value}".`, `Labels: ${table.labels.map((l) => `"${l}"`).join(", ")}.`);
      }
      return { ok: true, fn, query: { fn, oldLabel: oldV.value, newLabel: newV.value } };
    }
    case "where": {
      if (positionals.length !== 2 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      const colV = parseValue(positionals[0], fn, false);
      if (isError(colV)) return colV;
      const column = asColumn(colV, fn, table);
      if (isError(column)) return column;
      const predRaw = positionals[1].trim();
      if (predRaw.startsWith("are.")) {
        const pred = parsePredicate(predRaw, fn);
        if (isError(pred)) return pred;
        return { ok: true, fn, query: { fn, column, predicate: pred.spec } };
      }
      const asValue = parseValue(predRaw, fn, false);
      if (!isError(asValue) && (asValue.kind === "string" || asValue.kind === "number")) {
        return {
          ok: true,
          fn,
          query: { fn, column, predicate: { name: "equal_to", args: [asValue.value] } },
        };
      }
      if (isError(asValue)) return asValue;
      return fail(fn, "The second argument of where must be an are. predicate.", usageDetail(fn));
    }
    case "take": {
      if (positionals.length !== 1 || Object.keys(keywords).length) return arityError(fn, positionals.length);
      const value = parseValue(positionals[0], fn, false);
      if (isError(value)) return value;
      let indices: number[] = [];
      if (value.kind === "number") {
        if (!Number.isInteger(value.value)) {
          return fail(fn, "Row indices must be integers.", usageDetail(fn));
        }
        indices = [value.value];
      } else if (value.kind === "array") {
        if (value.values.some((item) => typeof item !== "number" || !Number.isInteger(item))) {
          return fail(fn, "take needs an array of integer indices.", "Example: np.arange(5) or make_array(0, 4, 9).");
        }
        indices = value.values as number[];
      } else {
        return fail(fn, "take needs an integer or an array of integers.", usageDetail(fn));
      }
      if (indices.length === 0) {
        return fail(fn, "take needs at least one index.", usageDetail(fn));
      }
      for (const index of indices) {
        if (index < 0 || index >= n) {
          return fail(fn, `Row index ${index} is out of range.`, `Valid indices are 0 through ${n - 1}.`);
        }
      }
      return { ok: true, fn, query: { fn, indices } };
    }
    case "sort": {
      if (positionals.length < 1 || positionals.length > 2) return arityError(fn, positionals.length);
      const extraKeys = Object.keys(keywords).filter((key) => key !== "descending");
      if (extraKeys.length) {
        return fail(fn, `Unknown argument ${extraKeys[0]}.`, "sort accepts descending=True or descending=False.");
      }
      const colV = parseValue(positionals[0], fn, false);
      if (isError(colV)) return colV;
      const column = asColumn(colV, fn, table);
      if (isError(column)) return column;
      let descending = false;
      if (positionals.length === 2) {
        const second = parseValue(positionals[1], fn, false);
        if (isError(second)) return second;
        if (second.kind !== "boolean") {
          return fail(fn, "The optional second argument to sort is descending, a boolean.", "Write descending=True.");
        }
        descending = second.value;
      }
      if (keywords.descending !== undefined) {
        const flag = parseValue(keywords.descending, fn, false);
        if (isError(flag)) return flag;
        if (flag.kind !== "boolean") {
          return fail(fn, "descending must be True or False.", usageDetail(fn));
        }
        descending = flag.value;
      }
      return { ok: true, fn, query: { fn, column, descending } };
    }
    case "sample": {
      const extraKeys = Object.keys(keywords).filter((key) => key !== "with_replacement" && key !== "k");
      if (extraKeys.length) {
        return fail(fn, `Unknown argument ${extraKeys[0]}.`, "sample accepts k and with_replacement=True or False.");
      }
      if (positionals.length > 2) return arityError(fn, positionals.length);
      let k = n;
      let withReplacement = true;
      if (positionals.length >= 1) {
        const kVal = parseValue(positionals[0], fn, false);
        if (isError(kVal)) return kVal;
        if (kVal.kind === "boolean" && positionals.length === 1) {
          withReplacement = kVal.value;
        } else if (kVal.kind === "number" && Number.isInteger(kVal.value) && kVal.value >= 0) {
          k = kVal.value;
        } else {
          return fail(fn, "k must be a non-negative integer.", usageDetail(fn));
        }
      }
      if (positionals.length === 2) {
        const flag = parseValue(positionals[1], fn, false);
        if (isError(flag)) return flag;
        if (flag.kind !== "boolean") {
          return fail(fn, "with_replacement must be True or False.", usageDetail(fn));
        }
        withReplacement = flag.value;
      }
      if (keywords.k !== undefined) {
        const kVal = parseValue(keywords.k, fn, false);
        if (isError(kVal)) return kVal;
        if (kVal.kind !== "number" || !Number.isInteger(kVal.value) || kVal.value < 0) {
          return fail(fn, "k must be a non-negative integer.", usageDetail(fn));
        }
        k = kVal.value;
      }
      if (keywords.with_replacement !== undefined) {
        const flag = parseValue(keywords.with_replacement, fn, false);
        if (isError(flag)) return flag;
        if (flag.kind !== "boolean") {
          return fail(fn, "with_replacement must be True or False.", usageDetail(fn));
        }
        withReplacement = flag.value;
      }
      if (!withReplacement && k > n) {
        return fail(fn, `Cannot sample ${k} rows without replacement from a table of ${n} rows.`, "Use a smaller k, or omit with_replacement=False.");
      }
      return { ok: true, fn, query: { fn, k, withReplacement } };
    }
    default:
      return fail(fn, `Cannot parse .${fn}.`, usageDetail(fn));
  }
}

export const EXAMPLE_CALLS = [
  'students.where("GPA", are.above(3.5))',
  'students.select("Name", "Major", "GPA")',
  'students.sort("Midterm", descending=True)',
  "students.take(np.arange(5))",
  "students.num_rows",
];
