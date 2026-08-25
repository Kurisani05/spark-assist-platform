const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export class AiGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AiGatewayError";
  }
}

function friendlyMessage(status: number, raw: string): string {
  if (status === 402) return raw || "AI credits are exhausted. Add credits to continue.";
  if (status === 403) return raw || "AI access is blocked by workspace policy.";
  if (status === 429) return "The AI is rate limited right now. Please try again in a moment.";
  if (status >= 500) return "The AI service is temporarily unavailable. Please retry.";
  return raw || `AI request failed (${status}).`;
}

/**
 * Calls the Lovable AI Gateway and returns the full assistant text.
 * Streams server-side so long generations never hit a request timeout.
 */
export async function callAi(options: {
  system: string;
  prompt: string;
  json?: boolean;
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiGatewayError(401, "AI is not configured (missing key).");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok || !response.body) {
    let raw = "";
    try {
      const text = await response.text();
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
      raw = parsed.error?.message ?? parsed.message ?? text.slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new AiGatewayError(response.status, friendlyMessage(response.status, raw));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        out += chunk.choices?.[0]?.delta?.content ?? "";
      } catch {
        /* partial chunk, ignore */
      }
    }
  }

  return out.trim();
}

/** Parses model output as JSON, tolerating code fences and surrounding prose. */
export function parseJsonOutput<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new AiGatewayError(502, "The AI returned an unexpected response. Please retry.");
  }
}
