import { useEffect, useRef } from "react";
import { formatValue, numRows, type TableData } from "../lib/table";
import type { RowMark, VizFrame } from "../animations/types";

function rowClass(mark: RowMark | undefined, isCurrent: boolean): string {
  if (isCurrent) return "row-current";
  if (mark === "keep") return "row-keep";
  if (mark === "drop") return "row-drop";
  if (mark === "picked") return "row-picked";
  if (mark === "taken") return "row-taken";
  return "";
}

export function TableGrid({
  table,
  frame,
  caption,
}: {
  table: TableData;
  frame?: VizFrame | null;
  caption?: string;
}) {
  const currentRef = useRef<HTMLTableRowElement | null>(null);
  const n = numRows(table);
  const visible = frame?.visibleRowCount == null ? n : Math.min(frame.visibleRowCount, n);
  const indices = (frame?.originalIndices ?? Array.from({ length: n }, (_, i) => i)).slice(0, visible);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [frame?.currentRow, frame?.title]);

  return (
    <div>
      {caption ? <h5>{caption}</h5> : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th className="idx">i</th>
              {table.labels.map((label) => {
                const shown = frame?.headerOverride?.[label] ?? label;
                const focus = frame?.focusColumns.includes(label);
                return (
                  <th key={label} className={focus ? "focus" : undefined}>
                    {shown}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {indices.map((original, display) => {
              const isCurrent = frame?.currentRow === original || frame?.currentRow === display;
              const mark = frame?.rowMarks[original] ?? frame?.rowMarks[display];
              return (
                <tr
                  key={`${original}-${display}`}
                  className={rowClass(mark, Boolean(isCurrent))}
                  ref={isCurrent ? currentRef : undefined}
                >
                  <td className="idx">{original}</td>
                  {table.labels.map((label) => {
                    const fade = frame?.fadeColumns.includes(label);
                    const focus = frame?.focusColumns.includes(label);
                    const isCell =
                      frame?.currentCell?.row === original && frame.currentCell.column === label;
                    return (
                      <td
                        key={label}
                        className={[
                          fade ? "fade-col" : "",
                          focus ? "focus-col" : "",
                          isCell ? "current-cell" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {formatValue(table.columns[label][display])}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
