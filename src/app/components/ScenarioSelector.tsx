import type { CrisisScenario } from "@/lib/scenarios/crisisScenarios";

export function ScenarioSelector({
  scenarios,
  selected,
  setSelected,
}: {
  scenarios: CrisisScenario[];
  selected: string;
  setSelected: (id: string) => void;
}) {
  return (
    <section className="scenario-row">
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          onClick={() => setSelected(scenario.id)}
          className={`scenario-card ${selected === scenario.id ? "selected" : ""}`}
        >
          <div className="scenario-card-head">
            <h3>{scenario.title}</h3>
            <span className="scenario-severity">{scenario.severity}</span>
          </div>
          <p className="scenario-company">{scenario.company}</p>
          <p className="scenario-description">{scenario.description}</p>
        </button>
      ))}
    </section>
  );
}
