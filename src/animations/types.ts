import type { CellValue, TableData } from "../lib/table";

export type RowMark = "none" | "current" | "keep" | "drop" | "picked" | "taken";

export interface Comparison {
  text: string;
  passed: boolean;
}

export interface ArrayPreview {
  title: string;
  values: CellValue[];
  filled: number;
}

export interface ScalarPreview {
  label: string;
  value: number | string;
  display: string;
}

export interface VizFrame {
  title: string;
  body: string;
  phase: "explain" | "execute" | "result";
  argFocus?: number;
  durationMs: number;
  table: TableData;
  originalIndices: number[];
  focusColumns: string[];
  fadeColumns: string[];
  currentRow?: number;
  currentCell?: { row: number; column: string };
  rowMarks: Record<number, RowMark>;
  headerOverride?: Record<string, string>;
  comparison?: Comparison;
  counter?: { label: string; value: number; caption?: string };
  arrayPreview?: ArrayPreview;
  scalarPreview?: ScalarPreview;
  resultTable?: TableData;
  resultTableB?: TableData;
  resultCaption?: string;
  resultCaptionB?: string;
  visibleRowCount?: number | null;
  banner?: string;
}

export interface Animation {
  frames: VizFrame[];
  seed: number;
}

export function emptyMarks(n: number): Record<number, RowMark> {
  const marks: Record<number, RowMark> = {};
  for (let i = 0; i < n; i++) marks[i] = "none";
  return marks;
}
