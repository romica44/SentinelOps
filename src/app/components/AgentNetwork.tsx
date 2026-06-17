import { Banknote, CheckCircle2, Crown, Megaphone, Radio, Scale, Shield, Zap } from "lucide-react";

const SIZE = 200;
const R_ORBIT = 150;

const agents = [
  { id: "commander",  name: "Commander",  role: "Coordinator", icon: Crown,        color: "#ef4444", cls: "node-red"    },
  { id: "security",   name: "Security",   role: "Threats",     icon: Shield,       color: "#3b82f6", cls: "node-blue"   },
  { id: "legal",      name: "Legal",      role: "Compliance",  icon: Scale,        color: "#f59e0b", cls: "node-amber"  },
  { id: "finance",    name: "Finance",    role: "Impact",      icon: Banknote,     color: "#22c55e", cls: "node-green"  },
  { id: "pr",         name: "PR",         role: "Messaging",   icon: Megaphone,    color: "#ec4899", cls: "node-pink"   },
  { id: "operations", name: "Operations", role: "Continuity",  icon: Radio,        color: "#a855f7", cls: "node-purple" },
  { id: "executive",  name: "Executive",  role: "Decision",    icon: CheckCircle2, color: "#14b8a6", cls: "node-teal"   },
];

const agentPositions = agents.map((agent, i) => {
  const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
  return {
    ...agent,
    x: SIZE + Math.cos(angle) * R_ORBIT,
    y: SIZE + Math.sin(angle) * R_ORBIT,
  };
});

export function AgentNetwork({ active }: { active: boolean }) {
  return (
    <section className={`network-card ${active ? "is-active" : ""}`}>
      <div className="network-text">
        <span className="eyebrow">Multi-agent coordination</span>
        <h2>7 agents enter one Band room, debate, then publish the audit trail.</h2>
        <p>
          Band acts as the shared collaboration layer: agents exchange context,
          challenge each other, hand off tasks and converge on an executive response.
        </p>
      </div>

      <div className="network-map" aria-label="Band agent collaboration map">
        <svg
          className="network-svg"
          viewBox={`0 0 ${SIZE * 2} ${SIZE * 2}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx={SIZE} cy={SIZE} r={R_ORBIT} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
          {agentPositions.map((agent) => (
            <line
              key={agent.id}
              className="net-line"
              x1={SIZE} y1={SIZE}
              x2={agent.x} y2={agent.y}
              stroke={agent.color}
              strokeWidth="1.5"
              strokeOpacity="0.25"
            />
          ))}
          {agentPositions.map((agent) => (
            <circle
              key={agent.id + "-dot"}
              className="net-dot"
              cx={agent.x} cy={agent.y}
              r="20"
              fill={agent.color}
              fillOpacity="0.15"
              stroke={agent.color}
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          ))}
        </svg>

        <div className="band-core">
          <Zap size={22} />
          <div className="band-core-label">Band</div>
        </div>

        {agentPositions.map((agent) => {
          const Icon = agent.icon;
          const left = `${(agent.x / (SIZE * 2)) * 100}%`;
          const top  = `${(agent.y / (SIZE * 2)) * 100}%`;
          return (
            <div key={agent.id} className={`agent-node ${agent.cls}`} style={{ left, top }} title={`${agent.name} — ${agent.role}`}>
              <div className="agent-node-dot"><Icon size={16} /></div>
              <span className="agent-node-label">{agent.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
