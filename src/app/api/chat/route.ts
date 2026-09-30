import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { buildChatContext, systemPrompt } from "@/lib/chat-context";
import { loadFactures } from "@/lib/store";

// Les appels OpenAI passent par le proxy key.one : une clé de projet, budget contrôlé avant chaque appel.
const BASE_URL = (process.env.KEYONE_OPENAI_BASE_URL || "https://getkeyone.com/api/proxy/openai/v1").replace(/\/+$/, "");
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const MAX_MESSAGES = 12;
const MAX_LENGTH = 2000;

type Message = { role: "user" | "assistant"; content: string };

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function readMessages(body: unknown): Message[] | null {
  const list = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(list) || !list.length) return null;
  const out: Message[] = [];
  for (const m of list.slice(-MAX_MESSAGES)) {
    if ((m?.role !== "user" && m?.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) return null;
    out.push({ role: m.role, content: m.content.slice(0, MAX_LENGTH) });
  }
  return out.at(-1)?.role === "user" ? out : null;
}

export async function POST(request: Request) {
  if (!(await getUser())) return fail("Non connecté.", 401);
  const key = process.env.KEYONE_API_KEY;
  if (!key) return fail("L’assistant n’est pas encore configuré : il manque la clé KEYONE_API_KEY.", 503);

  const messages = readMessages(await request.json().catch(() => null));
  if (!messages) return fail("Message invalide.");

  const context = buildChatContext(await loadFactures());
  if (!context) return fail("Importez d’abord un journal des ventes : l’assistant n’a aucune donnée à lire.");

  const upstream = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [{ role: "system", content: systemPrompt(context) }, ...messages],
    }),
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    console.error("key.one", upstream.status, await upstream.text().catch(() => ""));
    const messages: Record<number, string> = {
      401: "La clé key.one est refusée. Vérifiez KEYONE_API_KEY.",
      402: "Le crédit key.one est épuisé. Rechargez le compte pour réactiver l’assistant.",
      // Plafond de dépense atteint ou modèle non autorisé : réessayer ne sert à rien.
      403: "L’appel a été bloqué par une limite de budget key.one. Relevez-la dans le tableau de bord key.one.",
    };
    return fail(messages[upstream.status] ?? "L’assistant est indisponible pour le moment. Réessayez dans un instant.", 502);
  }

  // Convertit le flux SSE en texte brut, au fil de l'eau.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const text = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.startsWith("data:") ? line.slice(5).trim() : "";
          if (!data || data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // Fragment incomplet : ignoré.
          }
        }
      },
    })
  );

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
