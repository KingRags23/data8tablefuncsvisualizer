import type { FunctionId } from "../lib/functions";
import { FUNCTION_INFO, FUNCTION_ORDER, FUNCTION_USAGE } from "../lib/functions";

export function DescriptionPanel({
  fn,
  open,
}: {
  fn: FunctionId | null;
  open: boolean;
}) {
  if (!open) return null;

  if (!fn) {
    return (
      <section className="desc">
        <div className="desc-body catalog">
          <p>Type a call such as students.where(...) or students.sort(...), then you can learn about that specific method. These are the table functions this visualizer supports:</p>
          <ul className="arg-list">
            {FUNCTION_ORDER.map((id) => (
              <li key={id}>
                <code>{FUNCTION_USAGE[id].form}</code>
                <div>{FUNCTION_USAGE[id].argCount}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const info = FUNCTION_INFO[fn];
  const usage = FUNCTION_USAGE[fn];
  return (
    <section className="desc">
      <div className="desc-toggle static">
        <div>
          <div className="desc-kicker">output: {info.output}</div>
          <h2>{info.signature}</h2>
        </div>
      </div>
      <div className="desc-body">
        <div className="desc-grid">
          <div>
            <p>{info.summary}</p>
            <p>{info.details}</p>
            <p>
              How to call it: <code>{usage.form}</code>
            </p>
            <p>{usage.argCount}</p>
          </div>
          <div>
            {info.arguments.length === 0 ? (
              <p>This is a property. It takes no arguments and uses no parentheses.</p>
            ) : (
              <ul className="arg-list">
                {info.arguments.map((arg) => (
                  <li key={arg.name}>
                    <code>
                      {arg.name}
                      {arg.optional ? " (optional)" : ""}
                    </code>
                    <div>{arg.text}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="examples-inline">
              {usage.examples.map((example) => (
                <code key={example}>{example}</code>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
