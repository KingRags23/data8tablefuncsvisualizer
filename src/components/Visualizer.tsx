import { formatQuery } from "../lib/code";
import type { QueryBriefing } from "../lib/explain";
import { formatValue, type TableData } from "../lib/table";
import type { Animation } from "../animations/types";
import type { Query } from "../lib/functions";
import { TableGrid } from "./TableGrid";
import { PlaybackBar } from "./PlaybackBar";

const LONG_ANIMATION_STEPS = 20;

export function Visualizer({
  table,
  query,
  briefing,
  stage,
  animation,
  step,
  onStartAnimation,
  onPrev,
  onNext,
  onRestart,
  onSkip,
}: {
  table: TableData;
  query: Query | null;
  briefing: QueryBriefing | null;
  stage: "idle" | "briefing" | "walkthrough";
  animation: Animation | null;
  step: number;
  onStartAnimation: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onSkip: () => void;
}) {
  const frame = stage === "walkthrough" ? animation?.frames[step] : undefined;
  const longAnimation = (animation?.frames.length ?? 0) >= LONG_ANIMATION_STEPS;

  return (
    <section className="panel viz">
      <div className="viz-head">
        <h3>Visualizer</h3>
      </div>
      {stage === "idle" || !briefing || !query ? (
        <div>
          <div className="empty-viz">
            <h4>The students table is already loaded</h4>
            <p>
              Choose a table method and its arguments from the menus above, then click Visualize!
              You will first see an explanation; press Next to step through the animation row by
              row.
            </p>
          </div>
          <TableGrid table={table} caption="students  ·  100 rows × 10 columns" />
        </div>
      ) : stage === "briefing" ? (
        <>
          <div className="step-card briefing-card">
            <div className="phase">Before the animation</div>
            <h4>{briefing.title}</h4>
            <p className="call-line">
              <code>{formatQuery(query)}</code>
            </p>
            <p>{briefing.summary}</p>
            {briefing.arguments.length > 0 ? (
              <ul className="arg-list briefing-args">
                {briefing.arguments.map((arg) => (
                  <li key={arg.name}>
                    <code>{arg.name}</code>
                    <div>{arg.text}</div>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="next-hint">{briefing.nextHint}</p>
          </div>
          <TableGrid table={table} caption="students, before the call" />
          <div className="playback">
            <button type="button" className="primary" onClick={onStartAnimation}>
              Next
            </button>
            <span className="step-num">
              Read the explanation, then press Next to step through the animation.
            </span>
          </div>
        </>
      ) : frame ? (
        <>
          <div className="step-card">
            <div className="phase">{frame.phase}</div>
            <h4>{frame.title}</h4>
            <p>{frame.body}</p>
            {frame.comparison ? (
              <div className={frame.comparison.passed ? "comparison pass" : "comparison fail"}>
                {frame.comparison.text}
              </div>
            ) : null}
          </div>

          <div className="meta-row">
            {frame.counter ? (
              <div className="counter">
                <span>{frame.counter.label}</span>
                <strong>{frame.counter.value}</strong>
                {frame.counter.caption ? <span>{frame.counter.caption}</span> : null}
              </div>
            ) : null}
            {frame.scalarPreview ? (
              <div className="scalar-preview">
                <span>{frame.scalarPreview.label}</span>
                <strong>{frame.scalarPreview.display}</strong>
              </div>
            ) : null}
            {frame.arrayPreview ? (
              <div className="array-preview">
                <span>{frame.arrayPreview.title}</span>
                <div className="array-track">
                  {frame.arrayPreview.values.slice(0, 28).map((value, i) => (
                    <div
                      key={`${String(value)}-${i}`}
                      className={i < frame.arrayPreview!.filled ? "array-item filled" : "array-item"}
                    >
                      {i < frame.arrayPreview!.filled ? formatValue(value) : "·"}
                    </div>
                  ))}
                  {frame.arrayPreview.values.length > 28 ? (
                    <div className="array-item filled">
                      +{frame.arrayPreview.values.length - 28}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {frame.banner ? <div className="banner-none">{frame.banner}</div> : null}

          <TableGrid table={frame.table} frame={frame} />

          {frame.resultTable ? (
            <div className={frame.resultTableB ? "results" : "results single"}>
              <div className="result-pane">
                <TableGrid table={frame.resultTable} caption={frame.resultCaption} />
              </div>
              {frame.resultTableB ? (
                <div className="result-pane">
                  <TableGrid table={frame.resultTableB} caption={frame.resultCaptionB} />
                </div>
              ) : null}
            </div>
          ) : null}

          <PlaybackBar
            step={step}
            total={animation!.frames.length}
            longAnimation={longAnimation}
            onPrev={onPrev}
            onNext={onNext}
            onRestart={onRestart}
            onSkip={onSkip}
          />
        </>
      ) : null}
    </section>
  );
}
