/**
 * Band.ai Client — Agent API (REST)
 * https://docs.band.ai/api/agent-api
 *
 * Architecture:
 *  - Each of the 7 crisis agents is a separate Remote Agent registered on band.ai
 *  - Each has its own API key (X-API-Key) and UUID
 *  - Commander creates the chat room and adds the other 6 as participants
 *  - Every message is sent from the correct agent's key and must @mention at
 *    least one recipient (Band requirement)
 *
 * Setup:
 *  1. Go to https://app.band.ai/agents → New Agent → Remote Agent (repeat × 7)
 *  2. Copy each agent's API key + UUID into .env.local (see env.local.example)
 */

const BAND_BASE = "https://app.band.ai/api/v1/agent";

export type BandAgentId =
  | "commander"
  | "security"
  | "operations"
  | "legal"
  | "finance"
  | "pr"
  | "executive";

/** Per-agent configuration loaded from environment variables */
const agentConfig: Record<BandAgentId, { key: string; id: string; handle: string; name: string }> = {
  commander:  { key: process.env.BAND_KEY_COMMANDER  ?? "", id: process.env.BAND_ID_COMMANDER  ?? "", handle: "commander",  name: "Incident Commander" },
  security:   { key: process.env.BAND_KEY_SECURITY   ?? "", id: process.env.BAND_ID_SECURITY   ?? "", handle: "security",   name: "Security Agent"     },
  operations: { key: process.env.BAND_KEY_OPERATIONS ?? "", id: process.env.BAND_ID_OPERATIONS ?? "", handle: "operations", name: "Operations Agent"   },
  legal:      { key: process.env.BAND_KEY_LEGAL      ?? "", id: process.env.BAND_ID_LEGAL      ?? "", handle: "legal",      name: "Legal Agent"        },
  finance:    { key: process.env.BAND_KEY_FINANCE    ?? "", id: process.env.BAND_ID_FINANCE    ?? "", handle: "finance",    name: "Finance Agent"      },
  pr:         { key: process.env.BAND_KEY_PR         ?? "", id: process.env.BAND_ID_PR         ?? "", handle: "pr",         name: "PR Agent"           },
  executive:  { key: process.env.BAND_KEY_EXECUTIVE  ?? "", id: process.env.BAND_ID_EXECUTIVE  ?? "", handle: "executive",  name: "Executive Agent"    },
};

const agentOrder: BandAgentId[] = [
  "commander", "security", "operations", "legal", "finance", "pr", "executive",
];

/* ─── Internal fetch helper ──────────────────────────────────────────────────── */

async function bandFetch(
  agentId: BandAgentId,
  path: string,
  body?: object
): Promise<any> {
  const cfg = agentConfig[agentId];
  if (!cfg.key) {
    throw new Error(
      `Missing Band API key for agent "${agentId}". ` +
      `Set BAND_KEY_${agentId.toUpperCase()} in .env.local`
    );
  }

  const res = await fetch(`${BAND_BASE}${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: {
      "X-API-Key":    cfg.key,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Band API ${res.status} on ${path}: ${text}`);
  }

  return res.json();
}

/* ─── Public API ─────────────────────────────────────────────────────────────── */

/**
 * Commander creates a new Band chat room for this crisis.
 * Returns the chat room UUID (used in all subsequent calls).
 */
export async function createCrisisRoom(scenarioTitle: string): Promise<string> {
  const res = await bandFetch("commander", "/chats", {
    chat: { title: `[SentinelOps] ${scenarioTitle}` },
  });
  return res.data.id as string;
}

/**
 * Commander adds all other 6 agents as participants in the room.
 * Must be called after createCrisisRoom().
 */
export async function addAllParticipants(chatId: string): Promise<void> {
  const others = agentOrder.filter((id) => id !== "commander");

  for (const agentId of others) {
    const cfg = agentConfig[agentId];
    if (!cfg.id) {
      console.warn(`[Band] Skipping participant "${agentId}" — BAND_ID_${agentId.toUpperCase()} not set`);
      continue;
    }
    await bandFetch("commander", `/chats/${chatId}/participants`, {
      participant: { participant_id: cfg.id },
    }).catch((err) =>
      console.warn(`[Band] Failed to add participant "${agentId}":`, err)
    );
  }
}

/**
 * Send a message as a specific agent, @mentioning the next agent in sequence.
 * Band requires at least one @mention per message.
 *
 * @param senderAgentId  - which crisis agent is sending (uses their API key)
 * @param chatId         - the Band chat room UUID
 * @param content        - the agent's response text
 * @param nextAgentId    - who to @mention (next in workflow, or commander if last)
 */
export async function sendBandAgentMessage(
  senderAgentId: BandAgentId,
  chatId: string,
  content: string,
  nextAgentId: BandAgentId = "commander"
): Promise<void> {
  const senderCfg = agentConfig[senderAgentId];
  if (!senderCfg.key) return; // silently skip if key not configured

  const targetCfg = agentConfig[nextAgentId];
  if (!targetCfg.id) {
    console.warn(`[Band] Cannot @mention "${nextAgentId}" — BAND_ID not set`);
    return;
  }

  // Band requires @mention in the content AND in the mentions array
  const messageContent = `@${targetCfg.handle} ${content}`;

  await bandFetch(senderAgentId, `/chats/${chatId}/messages`, {
    message: {
      content: messageContent,
      mentions: [
        {
          id:     targetCfg.id,
          handle: targetCfg.handle,
          name:   targetCfg.name,
        },
      ],
    },
  });
}

/**
 * Checks that all 7 agents have both key + id configured.
 * Returns list of missing agent IDs (empty = fully configured).
 */
export function getMissingBandConfig(): BandAgentId[] {
  return agentOrder.filter(
    (id) => !agentConfig[id].key || !agentConfig[id].id
  );
}
