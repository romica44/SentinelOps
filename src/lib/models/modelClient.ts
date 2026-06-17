/**
 * Multi-provider model client — all free tiers
 *
 * Providers:
 *  - groq       → https://console.groq.com  (GROQ_API_KEY)
 *  - gemini     → https://aistudio.google.com (GEMINI_API_KEY)
 *  - openrouter → https://openrouter.ai      (OPENROUTER_API_KEY)
 *
 * All three use OpenAI-compatible /chat/completions endpoints,
 * so the same fetch shape works for all of them.
 */

export type Provider = "mock" | "groq" | "gemini" | "openrouter";

interface ProviderConfig {
  baseUrl: string;
  key: string | undefined;
  extraHeaders?: Record<string, string>;
}

function getConfig(provider: Provider): ProviderConfig {
  switch (provider) {
    case "groq":
      return {
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        key: process.env.GROQ_API_KEY,
      };
    case "gemini":
      return {
        // Google exposes an OpenAI-compatible endpoint
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: process.env.GEMINI_API_KEY,
      };
    case "openrouter":
      return {
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY,
        // OpenRouter recommends these headers for tracking
        extraHeaders: {
          "HTTP-Referer": "https://sentinelops.vercel.app",
          "X-Title":      "SentinelOps",
        },
      };
    default:
      return { baseUrl: "", key: undefined };
  }
}

export async function callModel({
  provider,
  model,
  system,
  user,
}: {
  provider: Provider;
  model: string;
  system: string;
  user: string;
}): Promise<string> {
  if (provider === "mock") {
    return "MOCK_MODEL_RESPONSE";
  }

  const cfg = getConfig(provider);

  if (!cfg.key) {
    throw new Error(
      `Missing API key for provider "${provider}". ` +
      `Set ${provider.toUpperCase()}_API_KEY in .env.local`
    );
  }

  const res = await fetch(cfg.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${cfg.key}`,
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
      temperature: 0.3,
      max_tokens:  512,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`${provider} error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response";
}
