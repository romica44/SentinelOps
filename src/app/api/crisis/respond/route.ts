import { NextResponse } from "next/server";
import { callModel } from "@/lib/models/modelClient";
import { sendBandAgentMessage } from "@/lib/band/bandClient";

const systemPrompts: Record<string, string> = {
  security: `You are the Security Agent (Cybersecurity Response) in a crisis team. The human operator has provided new information. Respond directly to it with your updated threat assessment and recommended actions. Max 3 sentences.`,
  executive: `You are the Executive Agent (Decision Authority) in a crisis team. The human operator has provided new information and agents have responded. Issue a brief updated directive. Max 3 sentences.`,
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { chatId, message, timeline } = body;

  if (!chatId || !message?.trim()) {
    return NextResponse.json({ error: "chatId and message are required" }, { status: 400 });
  }

  const useExternalModels =
    !!process.env.GROQ_API_KEY ||
    !!process.env.GEMINI_API_KEY ||
    !!process.env.OPENROUTER_API_KEY;

  // Build context from previous timeline + human message
  const prevContext = (timeline ?? [])
    .map((m: any) => `[${m.agent}]: ${m.content}`)
    .join("\n");

  const userPrompt = `${prevContext}\n\n[Human Operator]: ${message.trim()}\n\nRespond to the human operator's new information as your role.`;

  const responses = [];

  // ── Security Agent responds ──
  let securityContent: string;
  if (useExternalModels) {
    try {
      securityContent = await callModel({
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        system: systemPrompts.security,
        user: userPrompt,
      });
    } catch {
      securityContent = "Security Agent: acknowledged new threat intel. Updating containment priorities accordingly.";
    }
  } else {
    securityContent = "Security Agent: acknowledged new threat intel. Updating containment priorities accordingly.";
  }

  if (chatId) {
    await sendBandAgentMessage("security", chatId, securityContent, "executive").catch(() => {});
  }

  responses.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    agentId: "security",
    agent: "Security Agent",
    role: "Cybersecurity Response",
    model: "Llama 3.3 70B via Groq",
    content: securityContent,
    status: "conflict" as const,
  });

  // ── Executive Agent responds ──
  const execPrompt = `${userPrompt}\n\n[Security Agent]: ${securityContent}`;
  let executiveContent: string;

  if (useExternalModels) {
    try {
      executiveContent = await callModel({
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        system: systemPrompts.executive,
        user: execPrompt,
      });
    } catch {
      executiveContent = "Executive Agent: directive updated based on new intelligence. All teams adjust response accordingly.";
    }
  } else {
    executiveContent = "Executive Agent: directive updated based on new intelligence. All teams adjust response accordingly.";
  }

  if (chatId) {
    await sendBandAgentMessage("executive", chatId, executiveContent, "commander").catch(() => {});
  }

  responses.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    agentId: "executive",
    agent: "Executive Agent",
    role: "Decision Authority",
    model: "Llama 3.3 70B via Groq",
    content: executiveContent,
    status: "decision" as const,
  });

  return NextResponse.json({ responses });
}