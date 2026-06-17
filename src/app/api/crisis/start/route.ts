import { NextResponse } from "next/server";
import { crisisScenarios } from "@/lib/scenarios/crisisScenarios";
import { runCrisisWorkflow } from "@/lib/agents/crisisAgents";
import { getMissingBandConfig } from "@/lib/band/bandClient";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const customCrisis = body.customCrisis?.trim();

  const scenario = customCrisis
    ? {
        id:              "custom",
        title:           "Custom Crisis",
        company:         "Your Organization",
        severity:        "critical" as const,
        trigger:         customCrisis,
        description:     customCrisis,
        affectedSystems: ["systems", "operations", "data"],
      }
    : crisisScenarios.find((s) => s.id === (body.scenarioId ?? "ransomware"));

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const useExternalModels =
    !!process.env.GROQ_API_KEY ||
    !!process.env.GEMINI_API_KEY ||
    !!process.env.OPENROUTER_API_KEY;

  const useBand = getMissingBandConfig().length === 0;

  const { timeline, bandChatId } = await runCrisisWorkflow({
    scenario: scenario as any,
    scenarioTitle: scenario.title,
    useExternalModels,
    useBand,
  });

  const roomName = `sentinelops-${scenario.id}-${Date.now()}`;

  return NextResponse.json({
    room:      roomName,
    bandChatId,
    scenario,
    timeline,
    summary: {
      agents:        timeline.length,
      conflicts:     timeline.filter((m) => m.status === "conflict").length,
      decisions:     timeline.filter((m) => m.decision).length,
      finalDecision: timeline.at(-1)?.decision ?? "PENDING",
    },
  });
}