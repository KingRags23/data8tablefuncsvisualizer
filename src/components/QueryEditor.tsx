import type { ReactNode } from "react";
import { FUNCTION_INFO, FUNCTION_ORDER, type FunctionId, type Query } from "../lib/functions";
import { RELABEL_OPTIONS, uniqueValues } from "../lib/dataset";
import {
  SAMPLE_K_PRESETS,
  SHOW_PRESETS,
  SPLIT_PRESETS,
  TAKE_PRESETS,
  containedInChoices,
  containingChoices,
  defaultQuery,
  isMembershipPredicate,
  isNumericColumn,
  isSubstringPredicate,
  isTwoArgPredicate,
  makePredicate,
  numericValueChoices,
  predicateNamesFor,
  resolveColumnLabel,
} from "../lib/options";
import type { PredicateSpec } from "../lib/predicates";
import type { CellValue, TableData } from "../lib/table";

function MiniSelect({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <select
      className="code-select"
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function ColumnSelect({
  table,
  value,
  onChange,
  ariaLabel,
}: {
  table: TableData;
  value: string | number;
  onChange: (value: string | number) => void;
  ariaLabel: string;
}) {
  return (
    <MiniSelect
      ariaLabel={ariaLabel}
      value={typeof value === "number" ? `i:${value}` : `n:${value}`}
      onChange={(raw) => {
        if (raw.startsWith("i:")) onChange(Number(raw.slice(2)));
        else onChange(raw.slice(2));
      }}
    >
      {table.labels.map((label) => (
        <option key={`n:${label}`} value={`n:${label}`}>
          "{label}"
        </option>
      ))}
      {table.labels.map((label, index) => (
        <option key={`i:${index}`} value={`i:${index}`}>
          {index} ({label})
        </option>
      ))}
    </MiniSelect>
  );
}

function WhereArgs({
  table,
  query,
  onChange,
}: {
  table: TableData;
  query: Extract<Query, { fn: "where" }>;
  onChange: (query: Query) => void;
}) {
  const label = resolveColumnLabel(table, query.column);
  const names = predicateNamesFor(label);
  const predicate = query.predicate;

  const setColumn = (column: string | number) => {
    const nextLabel = resolveColumnLabel(table, column);
    const nextNames = predicateNamesFor(nextLabel);
    const name = nextNames.includes(predicate.name) ? predicate.name : nextNames[0];
    onChange({ fn: "where", column, predicate: makePredicate(table, nextLabel, name) });
  };

  const setName = (name: PredicateSpec["name"]) => {
    onChange({
      fn: "where",
      column: query.column,
      predicate: makePredicate(
        table,
        label,
        name,
        predicate.args[0],
        predicate.args[1] as number | undefined,
      ),
    });
  };

  return (
    <>
      <ColumnSelect table={table} value={query.column} onChange={setColumn} ariaLabel="column" />
      <span className="code-punct">,</span>
      <span className="code-static">are.</span>
      <MiniSelect
        ariaLabel="predicate"
        value={predicate.name}
        onChange={(value) => setName(value as PredicateSpec["name"])}
      >
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </MiniSelect>
      <span className="code-punct">(</span>
      {isTwoArgPredicate(predicate.name) ? (
        <>
          <MiniSelect
            ariaLabel="x"
            value={String(predicate.args[0])}
            onChange={(value) =>
              onChange({
                fn: "where",
                column: query.column,
                predicate: makePredicate(table, label, predicate.name, Number(value), Number(predicate.args[1])),
              })
            }
          >
            {numericValueChoices(table, label).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </MiniSelect>
          <span className="code-punct">,</span>
          <MiniSelect
            ariaLabel="y"
            value={String(predicate.args[1])}
            onChange={(value) =>
              onChange({
                fn: "where",
                column: query.column,
                predicate: makePredicate(table, label, predicate.name, Number(predicate.args[0]), Number(value)),
              })
            }
          >
            {numericValueChoices(table, label).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </MiniSelect>
        </>
      ) : isSubstringPredicate(predicate.name) ? (
        <MiniSelect
          ariaLabel="substring"
          value={String(predicate.args[0])}
          onChange={(value) =>
            onChange({
              fn: "where",
              column: query.column,
              predicate: makePredicate(table, label, predicate.name, value),
            })
          }
        >
          {containingChoices(label).map((value) => (
            <option key={value} value={value}>
              "{value}"
            </option>
          ))}
        </MiniSelect>
      ) : isMembershipPredicate(predicate.name) ? (
        <MiniSelect
          ariaLabel="A"
          value={JSON.stringify(predicate.args[0])}
          onChange={(value) =>
            onChange({
              fn: "where",
              column: query.column,
              predicate: makePredicate(table, label, predicate.name, JSON.parse(value)),
            })
          }
        >
          {containedInChoices(table, label).map((choice) => (
            <option key={choice.label} value={JSON.stringify(choice.value)}>
              {choice.label}
            </option>
          ))}
        </MiniSelect>
      ) : (
        <MiniSelect
          ariaLabel="x"
          value={String(predicate.args[0])}
          onChange={(value) => {
            const parsed: CellValue = isNumericColumn(label) ? Number(value) : value;
            onChange({
              fn: "where",
              column: query.column,
              predicate: makePredicate(table, label, predicate.name, parsed),
            });
          }}
        >
          {(isNumericColumn(label) ? numericValueChoices(table, label) : uniqueValues(table, label)).map(
            (value) => (
              <option key={String(value)} value={String(value)}>
                {typeof value === "string" ? `"${value}"` : value}
              </option>
            ),
          )}
        </MiniSelect>
      )}
      <span className="code-punct">)</span>
    </>
  );
}

function SelectDropArgs({
  table,
  query,
  onChange,
}: {
  table: TableData;
  query: Extract<Query, { fn: "select" | "drop" }>;
  onChange: (query: Query) => void;
}) {
  const updateAt = (index: number, column: string | number) => {
    const columns = [...query.columns];
    columns[index] = column;
    onChange({ fn: query.fn, columns });
  };

  const removeAt = (index: number) => {
    if (query.columns.length <= 1) return;
    onChange({ fn: query.fn, columns: query.columns.filter((_, i) => i !== index) });
  };

  const addColumn = () => {
    const used = new Set(query.columns.map(String));
    const next = table.labels.find((label) => !used.has(label)) ?? table.labels[0];
    if (query.fn === "drop" && query.columns.length >= table.labels.length - 1) return;
    onChange({ fn: query.fn, columns: [...query.columns, next] });
  };

  return (
    <>
      {query.columns.map((column, index) => (
        <span key={`${String(column)}-${index}`} className="arg-cluster">
          {index > 0 ? <span className="code-punct">,</span> : null}
          <ColumnSelect
            table={table}
            value={column}
            onChange={(value) => updateAt(index, value)}
            ariaLabel={`column ${index + 1}`}
          />
          {query.columns.length > 1 ? (
            <button type="button" className="arg-remove" onClick={() => removeAt(index)} aria-label="Remove column">
              ×
            </button>
          ) : null}
        </span>
      ))}
      <button type="button" className="arg-add" onClick={addColumn}>
        + column
      </button>
    </>
  );
}

export function QueryEditor({
  table,
  query,
  learnMoreOpen,
  onChange,
  onRun,
  onToggleLearnMore,
}: {
  table: TableData;
  query: Query;
  learnMoreOpen: boolean;
  onChange: (query: Query) => void;
  onRun: () => void;
  onToggleLearnMore: () => void;
}) {
  const setFn = (id: FunctionId) => onChange(defaultQuery(id));

  return (
    <section className="query-bar">
      <div className="builder-shell">
        <div className="code-call" aria-label="Table function call">
          <span className="code-static">students</span>
          <span className="code-punct">.</span>
          <MiniSelect
            ariaLabel="table method"
            value={query.fn}
            onChange={(value) => setFn(value as FunctionId)}
          >
            {FUNCTION_ORDER.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </MiniSelect>

          {query.fn === "num_rows" || query.fn === "num_columns" || query.fn === "labels" ? null : (
            <>
              <span className="code-punct">(</span>
              {query.fn === "split" ? (
                <MiniSelect
                  ariaLabel="n"
                  value={String(query.n)}
                  onChange={(value) => onChange({ fn: "split", n: Number(value) })}
                >
                  {SPLIT_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </MiniSelect>
              ) : null}

              {query.fn === "show" ? (
                <MiniSelect
                  ariaLabel="n"
                  value={query.n === null ? "all" : String(query.n)}
                  onChange={(value) =>
                    onChange({ fn: "show", n: value === "all" ? null : Number(value) })
                  }
                >
                  {SHOW_PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.n === null ? "all" : String(preset.n)}>
                      {preset.n === null ? "None" : preset.n}
                    </option>
                  ))}
                </MiniSelect>
              ) : null}

              {query.fn === "column" ? (
                <ColumnSelect
                  table={table}
                  value={query.column}
                  onChange={(column) => onChange({ fn: "column", column })}
                  ariaLabel="column"
                />
              ) : null}

              {query.fn === "select" || query.fn === "drop" ? (
                <SelectDropArgs table={table} query={query} onChange={onChange} />
              ) : null}

              {query.fn === "relabeled" ? (
                <>
                  <MiniSelect
                    ariaLabel="old_label"
                    value={query.oldLabel}
                    onChange={(value) =>
                      onChange({
                        fn: "relabeled",
                        oldLabel: value,
                        newLabel: RELABEL_OPTIONS[value][0],
                      })
                    }
                  >
                    {table.labels.map((label) => (
                      <option key={label} value={label}>
                        "{label}"
                      </option>
                    ))}
                  </MiniSelect>
                  <span className="code-punct">,</span>
                  <MiniSelect
                    ariaLabel="new_label"
                    value={query.newLabel}
                    onChange={(value) => onChange({ ...query, newLabel: value })}
                  >
                    {RELABEL_OPTIONS[query.oldLabel].map((label) => (
                      <option key={label} value={label}>
                        "{label}"
                      </option>
                    ))}
                  </MiniSelect>
                </>
              ) : null}

              {query.fn === "where" ? (
                <WhereArgs table={table} query={query} onChange={onChange} />
              ) : null}

              {query.fn === "take" ? (
                <MiniSelect
                  ariaLabel="row_indices"
                  value={query.indices.join(",")}
                  onChange={(value) =>
                    onChange({
                      fn: "take",
                      indices:
                        TAKE_PRESETS.find((preset) => preset.indices.join(",") === value)?.indices ??
                        [0],
                    })
                  }
                >
                  {TAKE_PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.indices.join(",")}>
                      {preset.label.includes("np.arange") || preset.label.includes("make_array")
                        ? preset.label
                        : preset.indices.length === 1
                          ? String(preset.indices[0])
                          : preset.label}
                    </option>
                  ))}
                </MiniSelect>
              ) : null}

              {query.fn === "sort" ? (
                <>
                  <ColumnSelect
                    table={table}
                    value={query.column}
                    onChange={(column) => onChange({ ...query, column })}
                    ariaLabel="column"
                  />
                  <span className="code-punct">,</span>
                  <span className="code-static">descending=</span>
                  <MiniSelect
                    ariaLabel="descending"
                    value={query.descending ? "True" : "False"}
                    onChange={(value) => onChange({ ...query, descending: value === "True" })}
                  >
                    <option value="False">False</option>
                    <option value="True">True</option>
                  </MiniSelect>
                </>
              ) : null}

              {query.fn === "sample" ? (
                <>
                  <MiniSelect
                    ariaLabel="k"
                    value={String(query.k)}
                    onChange={(value) => onChange({ ...query, k: Number(value) })}
                  >
                    {SAMPLE_K_PRESETS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </MiniSelect>
                  <span className="code-punct">,</span>
                  <span className="code-static">with_replacement=</span>
                  <MiniSelect
                    ariaLabel="with_replacement"
                    value={query.withReplacement ? "True" : "False"}
                    onChange={(value) => onChange({ ...query, withReplacement: value === "True" })}
                  >
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </MiniSelect>
                </>
              ) : null}
              <span className="code-punct">)</span>
            </>
          )}
        </div>

        <button className="run-btn" type="button" onClick={onRun}>
          Visualize!
        </button>
      </div>

      <div className="query-tools">
        <button className="learn-btn" type="button" onClick={onToggleLearnMore}>
          {learnMoreOpen ? "Hide details" : `Learn more about .${query.fn}`}
        </button>
        <span className="builder-hint">{FUNCTION_INFO[query.fn].signature}</span>
      </div>
    </section>
  );
}
