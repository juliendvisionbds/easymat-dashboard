"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quels sont mes dix plus gros clients ?",
  "Suis-je trop dépendant d’un client ?",
  "Combien d’avoirs cette année, et sur quels mois ?",
  "Quels clients sont dormants ?",
  "Quel est mon meilleur mois, et pourquoi ?",
  "Quels clients ont décroché ces derniers mois ?",
];

export function Chat({ welcome }: { welcome: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Message[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "L’assistant est indisponible pour le moment.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }
      if (!answer.trim()) throw new Error("L’assistant n’a rien répondu. Réessayez.");
    } catch (e) {
      setMessages(history);
      setError(e instanceof Error ? e.message : "L’assistant est indisponible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-layout">
      <div className="card chat">
        <div className="chat-messages" aria-live="polite">
          <div className="msg">
            <div className="bubble">{welcome}</div>
          </div>
          {messages.map((m, i) => (
            <div key={i} className={`msg${m.role === "user" ? " user" : ""}`}>
              <div className={`bubble${m.content ? "" : " pending"}`}>{m.content || "Analyse en cours…"}</div>
            </div>
          ))}
          {error && <div className="error">{error}</div>}
          <div ref={end} />
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ex : quels clients ont le plus baissé ?"
            aria-label="Votre question"
            maxLength={2000}
          />
          <button className="btn-primary" type="submit" disabled={busy || !draft.trim()}>Envoyer</button>
        </form>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Questions fréquentes</div>
        <div className="card-sub" style={{ marginBottom: 12 }}>Cliquez pour poser la question.</div>
        {SUGGESTIONS.map((q) => (
          <button key={q} type="button" className="suggestion" disabled={busy} onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
