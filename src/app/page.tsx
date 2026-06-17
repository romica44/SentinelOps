"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Bot,
  CheckCircle2,
  ClipboardList,
  Crown,
  Download,
  FileText,
  Home as HomeIcon,
  Megaphone,
  Moon,
  Radio,
  Scale,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";
import type { CrisisMessage, CrisisAgentId } from "@/lib/agents/types";
import { crisisScenarios } from "@/lib/scenarios/crisisScenarios";
import { AgentCard } from "./components/AgentCard";
import { AgentNetwork } from "./components/AgentNetwork";
import { ScenarioSelector } from "./components/ScenarioSelector";

type View = "dashboard" | "rooms" | "agents" | "scenarios" | "reports" | "settings";

const navItems: Array<{ id: View; label: string; icon: any }> = [
  { id: "dashboard", label: "Dashboard",    icon: HomeIcon      },
  { id: "rooms",     label: "Crisis Rooms", icon: ClipboardList },
  { id: "agents",    label: "Agents",       icon: Users         },
  { id: "scenarios", label: "Scenarios",    icon: CheckCircle2  },
  { id: "reports",   label: "Reports",      icon: FileText      },
  { id: "settings",  label: "Settings",     icon: Settings      },
];

const agentList = [
  { name: "Incident Commander", role: "Coordinator",    color: "red",    Icon: Crown        },
  { name: "Security Agent",     role: "Cybersecurity",  color: "blue",   Icon: Shield       },
  { name: "Operations Agent",   role: "Operations",     color: "purple", Icon: Radio        },
  { name: "Legal Agent",        role: "Compliance",     color: "amber",  Icon: Scale        },
  { name: "Finance Agent",      role: "Finance",        color: "green",  Icon: Banknote     },
  { name: "PR Agent",           role: "Communications", color: "pink",   Icon: Megaphone    },
  { name: "Executive Agent",    role: "Decision Maker", color: "teal",   Icon: CheckCircle2 },
];

export default function Home() {
  const [view,           setView]           = useState<View>("dashboard");
  const [scenarioId,     setScenarioId]     = useState("ransomware");
  const [timeline,       setTimeline]       = useState<CrisisMessage[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [room,           setRoom]           = useState("");
  const [bandChatId,     setBandChatId]     = useState<string | null>(null);
  const [messageText,    setMessageText]    = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [customCrisis,   setCustomCrisis]   = useState("");

  const scenario  = useMemo(() => crisisScenarios.find((s) => s.id === scenarioId)!, [scenarioId]);
  const conflicts = timeline.filter((m) => m.status === "conflict").length;
  const decisions = timeline.filter((m) => m.decision).length;

  async function launch() {
    setView("dashboard");
    setLoading(true);
    setTimeline([]);

    const response = await fetch("/api/crisis/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId, customCrisis }),
    });

    const data = await response.json();
    setRoom(data.room);
    setBandChatId(data.bandChatId ?? null); 

    for (const message of data.timeline) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setTimeline((current) => [...current, message]);
    }

    setLoading(false);
  }
  
  async function sendMessage() {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    const text = messageText.trim();
    setMessageText("");

    // Mostrar el mensaje del operador en el timeline
    const humanMsg = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      agentId: "human" as CrisisAgentId,
      agent: "Human Operator",
      role: "Crisis Commander",
      model: "",
      content: text,
      status: "sent" as const,
    };
    setTimeline((current) => [...current, humanMsg]);

    try {
      const res = await fetch("/api/crisis/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: bandChatId, message: text, timeline }),
      });
      const data = await res.json();
      console.log("respond API:", data); // ← mirá esto en DevTools
      if (data.responses) {
        for (const msg of data.responses) {
          await new Promise((r) => setTimeout(r, 600));
          setTimeline((current) => [...current, msg]);
        }
      }
    } finally {
      setSendingMessage(false);
    }
  }

  async function downloadReport() {
    const response = await fetch("/api/crisis/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, timeline }),
    });
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "sentinelops-crisis-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><ShieldAlert size={22} /></div>
          <div>
            <h1>Sentinel<span>Ops</span></h1>
            <p>AI-Powered Crisis Command</p>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setView(id)} className={view === id ? "active" : ""}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="status-block">
            <p className="status-label">System Status</p>
            <p className="status-value ok">All Systems Operational</p>
          </div>
          <div className="status-block">
            <p className="status-label">Band Connection</p>
            <p className="status-value ok">Ready to connect</p>
          </div>
          <div className="status-block">
            <p className="status-label">Active Room</p>
            <p className="status-value">{room || "—"}</p>
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <section className="main-panel">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title">
            <h2>{view === "dashboard" ? "Crisis Room Overview" : navItems.find((n) => n.id === view)?.label}</h2>
            <p>Real-time enterprise incident coordination powered by multi-agent collaboration</p>
          </div>
          <div className="top-actions">
            <div className="launch-group">
              <button className="launch-button" type="button" onClick={launch} disabled={loading}>
                <AlertTriangle size={16} />
                {loading ? "Running Agents…" : "Launch Crisis"}
              </button>
            </div>
          </div>
        </header>

        {/* Metrics */}
        <div className="metric-grid">
          <Metric label="Severity"      value={scenario.severity.toUpperCase()} tone="critical" icon={<ShieldAlert   size={20} />} />
          <Metric label="Active Agents" value="7"                               tone="blue"     icon={<Users         size={20} />} />
          <Metric label="Conflicts"     value={String(conflicts)}               tone="amber"    icon={<AlertTriangle size={20} />} />
          <Metric label="Decisions"     value={String(decisions)}               tone="green"    icon={<CheckCircle2  size={20} />} />
        </div>

        {/* Dashboard view */}
        {view === "dashboard" && (
          <>
            <div className="custom-crisis-box">
              <label className="custom-crisis-label">
                Custom Crisis
              </label>
              <textarea
                className="custom-crisis-input"
                placeholder="Describe your own crisis scenario… e.g. 'Our customer database was exposed via a misconfigured S3 bucket affecting 50,000 users.'"
                value={customCrisis}
                onChange={(e) => setCustomCrisis(e.target.value)}
                rows={3}
              />
            </div>

            <AgentNetwork active={loading || timeline.length > 0} />
            
            <div className="content-grid">
              {/* Timeline */}
              <section className="panel timeline-panel">
                <div className="panel-header">
                  <h3>Crisis Timeline</h3>
                  <span className="live-badge">LIVE</span>
                </div>

                <div className="timeline-scroll">
                  {timeline.length === 0 ? (
                    <div className="empty-state">
                      <Bot size={38} />
                      <p>Launch the crisis room to make agents debate and publish the audit trail.</p>
                    </div>
                  ) : (
                    timeline.map((item) => <AgentCard key={item.id} item={item} />)
                  )}
                </div>

                {/* ── MODIFICADO ── */}
                <div className="message-box">
                  <input
                    placeholder={bandChatId ? "Send message to Band crisis room…" : "Launch a crisis first to enable messaging…"}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    disabled={!bandChatId || sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!bandChatId || !messageText.trim() || sendingMessage}
                  >
                    <Send size={16} />
                  </button>
                </div>

                <div className="quick-actions">
                  <button onClick={downloadReport} disabled={!timeline.length}>
                    <Download size={15} /> Report
                  </button>
                </div>
                {/* ── FIN MODIFICADO ── */}

              </section>

              {/* Right column */}
              <aside className="right-column">
                <section className="panel">
                  <div className="panel-header">
                    <h3>Active Agents</h3>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>7 online</span>
                  </div>
                  <div className="agent-list">
                    {agentList.map(({ name, role, color, Icon }) => (
                      <div key={name} className="mini-agent-card">
                        <div className={`mini-avatar ${color}`}><Icon size={15} /></div>
                        <div className="mini-agent-info">
                          <strong>{name}</strong>
                          <p>{role}</p>
                        </div>
                        <div className="agent-status-dot" />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <h3>Incident Details</h3>
                    <button className="ghost-button">Edit</button>
                  </div>
                  <InfoRow label="Incident"    value={scenario.title} />
                  <InfoRow label="Company"     value={scenario.company} />
                  <InfoRow label="Status"      value={room ? "Active" : "Waiting"} />
                  <div className="info-row">
                    <span className="info-label">Affected Systems</span>
                    <div className="tags">
                      {scenario.affectedSystems.map((s) => <em key={s}>{s}</em>)}
                    </div>
                  </div>
                  <InfoRow label="Description" value={scenario.trigger} />
                </section>
              </aside>
            </div>
          </>
        )}

        {view === "rooms"     && <SimplePanel title="Crisis Rooms"  text="This section represents Band chat rooms. In production, each launched incident maps to one Band room with participants and messages." />}
        {view === "agents"    && <SimplePanel title="Agents"        text="These are the seven remote agents you register in Band: Commander, Security, Operations, Legal, Finance, PR and Executive." />}
        {view === "scenarios" && <ScenarioSelector scenarios={crisisScenarios} selected={scenarioId} setSelected={setScenarioId} />}
        {view === "reports"   && <SimplePanel title="Reports"       text="Reports are generated from the timeline and decisions. Export becomes enabled after running the workflow." />}
        {view === "settings"  && <SimplePanel title="Settings"      text="Add Band agent keys, model providers and environment variables in .env.local. Never commit real API keys." />}
      </section>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setView(id)} className={view === id ? "active" : ""}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return (
    <section className={`metric-card ${tone}`}>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
      <div className="metric-icon">{icon}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function SimplePanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="panel simple-panel">
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}