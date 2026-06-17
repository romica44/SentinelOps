import { NextResponse } from "next/server";
import { sendBandAgentMessage } from "@/lib/band/bandClient";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { chatId, message } = body;

  if (!chatId || !message?.trim()) {
    return NextResponse.json({ error: "chatId and message are required" }, { status: 400 });
  }

  // Human message posted to Band as Commander (room owner)
  try {
    await sendBandAgentMessage(
      "commander",
      chatId,
      `[Human Operator] ${message.trim()}`,
      "security"
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Message] Failed to send:", err);
    return NextResponse.json({ error: err.message ?? "Failed to send message" }, { status: 500 });
  }
}
