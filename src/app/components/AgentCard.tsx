import { AlertTriangle, Banknote, CheckCircle2, Crown, Megaphone, Radio, Scale, Shield } from "lucide-react";
import type { CrisisMessage } from "@/lib/agents/types";

const iconMap: Record<string, any> = {
  commander:  Crown,
  security:   Shield,
  operations: Radio,
  legal:      Scale,
  finance:    Banknote,
  pr:         Megaphone,
  executive:  CheckCircle2,
};

const colorMap: Record<string, string> = {
  commander:  "red",
  security:   "blue",
  operations: "purple",
  legal:      "amber",
  finance:    "green",
  pr:         "pink",
  executive:  "teal",
};

export function AgentCard({ item }: { item: CrisisMessage }) {
  const Icon       = iconMap[item.agentId] ?? Shield;
  const color      = colorMap[item.agentId] ?? "blue";
  const isConflict = item.status === "conflict";

  return (
    <article className="timeline-item">
      <div className={`timeline-avatar ${color}`}>
        <Icon size={16} />
      </div>

      <div className="timeline-body">
        <div className="timeline-topline">
          <span className="timeline-time">
            {new Date(item.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <span className={`agent-name ${color}`}>{item.agent}</span>
          <span className={`role-pill ${color}`}>{item.role}</span>
          {isConflict && (
            <span className="debate-pill">
              <AlertTriangle size={11} /> debate
            </span>
          )}
        </div>

        <p className="timeline-copy">{item.content}</p>

        {item.decision && (
          <div className="decision-box">
            <span>Decision / Handoff</span>
            <strong>{item.decision}</strong>
          </div>
        )}
      </div>
    </article>
  );
}
