import type { AgentDefinition, AgentContext, CrisisMessage } from "./types";
import { callModel } from "@/lib/models/modelClient";
import {
  createCrisisRoom,
  addAllParticipants,
  sendBandAgentMessage,
  getMissingBandConfig,
  type BandAgentId,
} from "@/lib/band/bandClient";

/* ─── System prompts ─────────────────────────────────────────────────────────── */
const systemPrompts: Record<string, string> = {
  commander: `You are the Incident Commander in a corporate crisis response team.
Your job: open the crisis room, assign roles, set severity level and kick off the response.
Be concise, authoritative, and action-oriented. Max 3 sentences.`,

  security: `You are the Security Agent (Cybersecurity Response) in a crisis team.
Your job: assess the technical threat, recommend containment actions, and flag what you disagree with in other agents' plans.
Be direct. Raise conflicts if you see a risk being underplayed. Max 3 sentences.`,

  operations: `You are the Operations Agent (Business Continuity) in a crisis team.
Your job: assess operational impact, propose continuity actions, and balance business risk against security risk.
You may disagree with Security if full shutdown is too costly. Max 3 sentences.`,

  legal: `You are the Legal Agent (Compliance & Regulatory) in a crisis team.
Your job: flag regulatory notification requirements, instruct on evidence preservation, and constrain communications.
Be precise. Cite what cannot be undone. Max 3 sentences.`,

  finance: `You are the Finance Agent (Financial Impact) in a crisis team.
Your job: estimate financial exposure of each proposed action vs. inaction, and recommend the cost-optimal response.
Be quantitative where possible. Max 3 sentences.`,

  pr: `You are the PR Agent (Stakeholder Communications) in a crisis team.
Your job: draft the tone and content of external and internal communications, avoiding legal exposure.
Be careful not to overpromise. Max 3 sentences.`,

  executive: `You are the Executive Agent (Decision Authority) in a crisis team.
Your job: read all the agent debate above and publish a single final decision that resolves conflicts and approves a plan.
Be decisive. One clear directive per department. Max 4 sentences.`,
};

/* ─── Fallback mock responses ────────────────────────────────────────────────── */
const mockResponses: Record<string, (ctx: AgentContext) => { content: string; status: CrisisMessage["status"]; decision?: string }> = {
  commander: (ctx) => ({
    content: `Crisis room opened for ${ctx.scenario.company}. Severity: ${ctx.scenario.severity}. Trigger: ${ctx.scenario.trigger}. Security, Operations and Legal must assess immediately.`,
    status: "decision",
    decision: "OPEN_CRISIS_ROOM",
  }),
  security: (ctx) => ({
    content: `Security assessment: affected systems — ${ctx.scenario.affectedSystems.join(", ")}. Recommendation: isolate compromised services, preserve logs, freeze suspicious credentials. I disagree with keeping production fully online until containment is confirmed.`,
    status: "conflict",
    decision: "ISOLATE_AFFECTED_SERVICES",
  }),
  operations: (ctx) => ({
    content: `Operations impact: business flow degraded across ${ctx.scenario.affectedSystems.join(", ")}. Activating manual contingency. Keeping partial service reduces disruption but increases risk if Security is correct.`,
    status: "conflict",
    decision: "ACTIVATE_CONTINGENCY",
  }),
  legal: () => ({
    content: `Legal position: preserve evidence before any remediation changes. If personal data or customer transactions are impacted, notification windows may apply. PR must not overpromise until scope is confirmed.`,
    status: "sent",
    decision: "PRESERVE_EVIDENCE",
  }),
  finance: () => ({
    content: `Finance estimate: uncontrolled spread creates higher downside than controlled shutdown cost. Recommend controlled isolation for highest-risk systems with hourly loss tracking.`,
    status: "sent",
    decision: "CONTROLLED_ISOLATION",
  }),
  pr: () => ({
    content: `Communications draft: acknowledge service disruption, state investigation is active, avoid speculation, provide next update window. Internal message should include employee do/don't guidance.`,
    status: "sent",
    decision: "PREPARE_STAKEHOLDER_UPDATE",
  }),
  executive: () => ({
    content: `Final decision: approve controlled isolation, activate contingency operations, preserve forensic evidence, start legal review, and release a cautious stakeholder update. This resolves the Security vs. Operations conflict in favor of risk containment.`,
    status: "decision",
    decision: "APPROVED_CRISIS_PLAN",
  }),
};

/* ─── Agent model mapping ────────────────────────────────────────────────────── */
const agentModels: Record<string, { provider: "groq" | "gemini" | "openrouter" | "mock"; model: string; label: string }> = {
  // Groq — free tier, very fast (https://console.groq.com)
  commander:  { provider: "groq",       model: "llama-3.3-70b-versatile",                    label: "Llama 3.3 70B via Groq"          },
  security:   { provider: "groq",       model: "deepseek-r1-distill-llama-70b",               label: "DeepSeek R1 70B via Groq"        },
  executive:  { provider: "groq",       model: "llama-3.3-70b-versatile",                    label: "Llama 3.3 70B via Groq"          },
  // Gemini — free tier via AI Studio (https://aistudio.google.com)
  legal:      { provider: "gemini",     model: "gemini-2.0-flash",                           label: "Gemini 2.0 Flash via Google"     },
  finance:    { provider: "gemini",     model: "gemini-2.0-flash",                           label: "Gemini 2.0 Flash via Google"     },
  // OpenRouter — free models with :free suffix (https://openrouter.ai)
  operations: { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free",     label: "Llama 3.3 70B via OpenRouter"    },
  pr:         { provider: "openrouter", model: "deepseek/deepseek-r1:free",                  label: "DeepSeek R1 via OpenRouter"      },
};

/* ─── Build context prompt for each agent ────────────────────────────────────── */
function buildUserPrompt(ctx: AgentContext): string {
  const prev = ctx.previousMessages.length
    ? "\n\nAgent debate so far:\n" + ctx.previousMessages.map((m) => `[${m.agent}]: ${m.content}`).join("\n")
    : "";
  return `CRISIS SCENARIO: ${ctx.scenario.title} at ${ctx.scenario.company}.
Severity: ${ctx.scenario.severity}.
Trigger: ${ctx.scenario.trigger}.
Affected systems: ${ctx.scenario.affectedSystems.join(", ")}.${prev}

Respond now as your role.`;
}

/* ─── Detect conflict/decision from AI response ──────────────────────────────── */
function detectStatus(agentId: string, text: string): CrisisMessage["status"] {
  const conflictWords = ["disagree", "conflict", "risk", "but", "however", "oppose", "concern", "danger"];
  const decisionWords = ["approve", "decision", "decided", "resolved", "final", "directive", "plan"];
  const lower = text.toLowerCase();
  if (["commander", "executive"].includes(agentId)) return "decision";
  if (conflictWords.some((w) => lower.includes(w))) return "conflict";
  if (decisionWords.some((w) => lower.includes(w))) return "decision";
  return "sent";
}

/* ─── Agent order and next-agent mapping ─────────────────────────────────────── */
const agentIds = ["commander", "security", "operations", "legal", "finance", "pr", "executive"] as const;

// Who each agent @mentions (who reads their message next)
const nextAgent: Record<string, BandAgentId> = {
  commander:  "security",
  security:   "operations",
  operations: "legal",
  legal:      "finance",
  finance:    "pr",
  pr:         "executive",
  executive:  "commander", // loop back to commander as acknowledgment
};

/* ─── Agent definitions ──────────────────────────────────────────────────────── */
export const crisisAgents: AgentDefinition[] = agentIds.map((id) => ({
  id,
  name: {
    commander:  "Incident Commander",
    security:   "Security Agent",
    operations: "Operations Agent",
    legal:      "Legal Agent",
    finance:    "Finance Agent",
    pr:         "PR Agent",
    executive:  "Executive Agent",
  }[id]!,
  role: {
    commander:  "Crisis Coordinator",
    security:   "Cybersecurity Response",
    operations: "Business Continuity",
    legal:      "Compliance & Regulatory",
    finance:    "Financial Impact",
    pr:         "Stakeholder Communications",
    executive:  "Decision Authority",
  }[id]!,
  model: agentModels[id].label,
  prompt: systemPrompts[id],
  handoffTo: [] as any,

  run: async (ctx: AgentContext) => {
    if (ctx.useExternalModels) {
      try {
        const { provider, model } = agentModels[id];
        const content = await callModel({
          provider: "groq", model: "llama-3.3-70b-versatile",
          system: systemPrompts[id],
          user: buildUserPrompt(ctx),
        });
        const status = detectStatus(id, content);
        return { content, status };
      } catch (err) {
        console.warn(`[${id}] model call failed, falling back to mock:`, err);
      }
    }
    return mockResponses[id](ctx);
  },
}));

/* ─── Workflow runner ────────────────────────────────────────────────────────── */
export async function runCrisisWorkflow(
  ctx: Omit<AgentContext, "previousMessages"> & { scenarioTitle?: string }
): Promise<{ timeline: CrisisMessage[]; bandChatId: string | null }> {
  const timeline: CrisisMessage[] = [];

  /* ── 1. Set up Band room if enabled ── */
  let bandChatId: string | null = null;

  if (ctx.useBand) {
    const missing = getMissingBandConfig();
    if (missing.length > 0) {
      console.warn(
        `[Band] Skipping — missing config for agents: ${missing.join(", ")}. ` +
        `Set BAND_KEY_* and BAND_ID_* in .env.local`
      );
    } else {
      try {
        const title = ctx.scenarioTitle ?? ctx.scenario.title;
        bandChatId = await createCrisisRoom(title);
        console.log(`[Band] Created chat room: ${bandChatId}`);
        await addAllParticipants(bandChatId);
        console.log(`[Band] All 7 agents added to room`);
      } catch (err) {
        console.error("[Band] Room setup failed:", err);
        bandChatId = null; // continue workflow without Band
      }
    }
  }

  /* ── 2. Run each agent sequentially ── */
  for (const agent of crisisAgents) {
    const result = await agent.run({ ...ctx, previousMessages: timeline });

    const message: CrisisMessage = {
      id:      crypto.randomUUID(),
      at:      new Date().toISOString(),
      agentId: agent.id,
      agent:   agent.name,
      role:    agent.role,
      model:   agent.model,
      ...result,
    };

    /* ── 3. Post to Band from this agent's key, @mentioning next agent ── */
    if (ctx.useBand && bandChatId) {
      const next = nextAgent[agent.id];
      await sendBandAgentMessage(
        agent.id as BandAgentId,
        bandChatId,
        message.content,
        next
      ).catch((err) => console.warn(`[Band] message failed for ${agent.id}:`, err));
    }

    timeline.push(message);
  }

  return { timeline, bandChatId };
}
