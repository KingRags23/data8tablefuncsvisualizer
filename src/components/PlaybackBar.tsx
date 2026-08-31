export function PlaybackBar({
  step,
  total,
  longAnimation,
  onPrev,
  onNext,
  onRestart,
  onSkip,
}: {
  step: number;
  total: number;
  longAnimation: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="playback">
      <button type="button" onClick={onRestart}>
        Restart
      </button>
      <button type="button" onClick={onPrev}>
        Back
      </button>
      <button type="button" className="primary" onClick={onNext} disabled={step >= total - 1}>
        Next
      </button>
      {longAnimation ? (
        <button type="button" onClick={onSkip}>
          Skip to result
        </button>
      ) : null}
      <div className="legend">
        <span>
          <i style={{ background: "#fff3c4" }} /> current
        </span>
        <span>
          <i style={{ background: "var(--keep-bg)" }} /> keep
        </span>
        <span>
          <i style={{ background: "var(--drop-bg)" }} /> drop
        </span>
        <span>
          <i style={{ background: "var(--picked-bg)" }} /> sampled / taken
        </span>
      </div>
      <span className="step-num">
        Step {step + 1} / {total}
        {longAnimation ? " · use Next for each row, or Skip to result" : ""}
      </span>
    </div>
  );
}
