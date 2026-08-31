import { useMemo, useState } from "react";
import { buildAnimation } from "./animations/build";
import type { Animation } from "./animations/types";
import { DescriptionPanel } from "./components/DescriptionPanel";
import { QueryEditor } from "./components/QueryEditor";
import { Visualizer } from "./components/Visualizer";
import { createStudentsTable } from "./lib/dataset";
import { briefQuery, type QueryBriefing } from "./lib/explain";
import type { Query } from "./lib/functions";
import { defaultQuery } from "./lib/options";
import { numRows } from "./lib/table";

export default function App() {
  const table = useMemo(() => createStudentsTable(), []);
  const [query, setQuery] = useState<Query>(() => defaultQuery("where"));
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [stage, setStage] = useState<"idle" | "briefing" | "walkthrough">("idle");
  const [briefing, setBriefing] = useState<QueryBriefing | null>(null);
  const [animation, setAnimation] = useState<Animation | null>(null);
  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState(8);

  const run = () => {
    setBriefing(briefQuery(table, query));
    setAnimation(buildAnimation(table, query, seed));
    setSeed((value) => value + 1);
    setStep(0);
    setStage("briefing");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="logo" src={`${import.meta.env.BASE_URL}data8-logo.png`} alt="Data 8" />
          <div>
            <h1>Table Functions Visualizer</h1>
            <p>Data 8</p>
          </div>
        </div>
        <div className="dataset-meta">
          <div className="dataset-chip">
            Loaded table <strong>students</strong> · {numRows(table)} rows · {table.labels.length}{" "}
            columns
          </div>
          <p className="synthetic-note">
            Note: All data in this table is AI-generated and synthetic. It is not real student data.
          </p>
        </div>
      </header>

      <QueryEditor
        table={table}
        query={query}
        learnMoreOpen={learnMoreOpen}
        onChange={(next) => {
          setQuery(next);
          setStage("idle");
          setAnimation(null);
          setBriefing(null);
          setStep(0);
        }}
        onRun={run}
        onToggleLearnMore={() => setLearnMoreOpen((open) => !open)}
      />

      <DescriptionPanel fn={query.fn} open={learnMoreOpen} />

      <Visualizer
        table={table}
        query={stage === "idle" ? null : query}
        briefing={briefing}
        stage={stage}
        animation={animation}
        step={step}
        onStartAnimation={() => {
          setStage("walkthrough");
          setStep(0);
        }}
        onPrev={() => {
          if (step <= 0) {
            setStage("briefing");
            setStep(0);
            return;
          }
          setStep((current) => current - 1);
        }}
        onNext={() => {
          if (!animation) return;
          setStep((current) => Math.min(animation.frames.length - 1, current + 1));
        }}
        onRestart={() => {
          setStage("briefing");
          setStep(0);
        }}
        onSkip={() => {
          if (!animation) return;
          setStage("walkthrough");
          setStep(animation.frames.length - 1);
        }}
      />
    </div>
  );
}
