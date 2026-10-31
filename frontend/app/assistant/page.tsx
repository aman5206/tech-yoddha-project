"use client";
import { useState } from "react";
import { ask } from "../../lib/api";
import { useApp } from "../../lib/store";

interface Msg { role: "user" | "bot"; text: string; sources?: string[] }

export default function Assistant() {
  const { engine, setEngine, sim } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: "Ask about the selected engine's RUL, anomalies, model differences or maintenance. Answers use only stored project data." }]);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]); setText(""); setBusy(true);
    try { const r = await ask(q, engine, sim.last?.cycle); setMsgs((m) => [...m, { role: "bot", text: r.answer, sources: r.sources }]); }
    catch (e) { setMsgs((m) => [...m, { role: "bot", text: `Could not get an answer: ${(e as Error).message}` }]); }
    setBusy(false);
  };
  const chips = [`Why is ENG-${engine} flagged?`, "Explain the RUL prediction", "Which sensors look anomalous?", "Compare the models", "What maintenance do you suggest?"];
  return (
    <>
      <h1>AI assistant</h1>
      <label className="inline">Engine context <input type="number" min={1} max={100} value={engine} onChange={(e) => setEngine(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} /></label>
      <div className="chat" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.text}{m.sources && <small>Data used: {m.sources.join(", ")}</small>}</div>)}
        {busy && <div className="msg bot">Thinking…</div>}
      </div>
      <div className="chips">{chips.map((c) => <button key={c} className="btn small" onClick={() => send(c)}>{c}</button>)}</div>
      <div className="filters"><input className="grow" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} placeholder="Ask a question" aria-label="Question" />
        <button className="btn dark" onClick={() => send(text)} disabled={busy}>Send</button></div>
      <p className="empty">Rule-based answers built from model outputs and sensor data, not a general chatbot. Not an aviation maintenance authorization.</p>
    </>
  );
}
