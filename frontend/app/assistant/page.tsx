"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ask, generateEngineCycleData } from "../../lib/api";
import { useApp } from "../../lib/store";
import { StatusBadge } from "../../lib/ui";
import { Bot, Send, Sparkles, Rotate3d, Wrench, ShieldAlert, Cpu } from "lucide-react";

interface Msg {
  role: "user" | "bot";
  text: string;
  sources?: string[];
  timestamp: string;
}

export default function AssistantPage() {
  const { engine, setEngine, sim } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: `Greetings. I am AeroGuard AI Copilot, your context-aware aerospace engineering specialist. I am synchronized with telemetry for engine unit ENG-${engine} (NASA C-MAPSS FD001 dataset). Ask me about thermal degradation trends, High-Pressure Turbine conditions, sensor feature contributions, or projected maintenance windows.`,
      sources: ["NASA C-MAPSS FD001", "Dual-Spool Spool Kinetics", "LSTM Predictor"],
      timestamp: "03:45 UTC",
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"technical" | "simplified">("technical");

  const telemetry = generateEngineCycleData(engine, sim.last?.cycle ?? 115);

  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsgs((m) => [...m, { role: "user", text: q, timestamp: now }]);
    setText("");
    setBusy(true);

    try {
      const r = await ask(q, engine, telemetry.cycle);
      let reply = r.answer;
      if (mode === "simplified") {
        reply = reply.replace(/Station 3\.0|psia|°R|z-score/gi, "").trim();
      }
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: reply,
          sources: r.sources,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: `Engineering inquiry failed: ${(e as Error).message}`,
          timestamp: now,
        },
      ]);
    }
    setBusy(false);
  };

  const promptChips = [
    `Why is ENG-${engine} showing elevated degradation risk?`,
    "Explain High-Pressure Turbine (HPT) condition",
    "Which sensors contributed most to the RUL prediction?",
    "Compare LSTM vs GRU vs XGBoost models",
    "Recommend maintenance schedule and action plan",
    "What changed in the last 40 operating cycles?",
  ];

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>AI Copilot — Aerospace Engineering Assistant</h1>
          <p className="empty">
            Evidence-grounded engineering intelligence assistant linked to live sensor telemetry, deep learning RUL models, and maintenance workflows.
          </p>
        </div>
        <div className="filters">
          <div className="tabs" style={{ borderBottom: 0 }}>
            <button
              className={mode === "technical" ? "on" : ""}
              onClick={() => setMode("technical")}
            >
              Technical Mode
            </button>
            <button
              className={mode === "simplified" ? "on" : ""}
              onClick={() => setMode("simplified")}
            >
              Simplified Mode
            </button>
          </div>
        </div>
      </div>

      {/* Synchronized Engine Context Banner */}
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(90deg, #101c28 0%, #17283c 100%)",
          padding: "12px 18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label className="inline">
            Active Engine:
            <select
              value={engine}
              onChange={(e) => setEngine(Number(e.target.value))}
              style={{ fontWeight: 600, color: "#38bdf8" }}
            >
              {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>ENG-{id}</option>
              ))}
            </select>
          </label>
          <span style={{ color: "#334155" }}>|</span>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            Cycle: <b>{telemetry.cycle}</b> / {telemetry.maxCycle}
          </span>
          <span style={{ color: "#334155" }}>|</span>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            Health: <b>{telemetry.healthScore}/100</b>
          </span>
          <StatusBadge s={telemetry.healthStatus} />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/twin" className="btn small">
            <Rotate3d size={13} />
            <span>View in 3D Twin</span>
          </Link>
          <Link href="/maintenance" className="btn small">
            <Wrench size={13} />
            <span>Maintenance Center</span>
          </Link>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div
        className="chat panel"
        style={{
          minHeight: "380px",
          maxHeight: "52vh",
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
        aria-live="polite"
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`msg ${m.role}`}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#0369a1" : "#142232",
              border: m.role === "user" ? "1px solid #0284c7" : "1px solid #1e2f42",
              color: "#f8fafc",
              borderRadius: "8px",
              padding: "12px 16px",
              maxWidth: "800px",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <b style={{ color: m.role === "user" ? "#bae6fd" : "#38bdf8", fontSize: "12px" }}>
                {m.role === "user" ? "Aerospace Lead (Aditya Bijore)" : "AeroGuard AI Specialist"}
              </b>
              <small style={{ color: "#94a3b8", fontSize: "10px" }}>{m.timestamp}</small>
            </div>
            <div>{m.text}</div>
            {m.sources && (
              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "11px", color: "#94a3b8" }}>
                Evidence Grounding: {m.sources.join(" • ")}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="msg bot" style={{ background: "#142232", border: "1px solid #1e2f42", maxWidth: "300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
              <Sparkles size={14} className="animate-spin" />
              <span>Synthesizing NASA C-MAPSS Telemetry...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Pills */}
      <div className="chips">
        {promptChips.map((c) => (
          <button key={c} className="btn small" onClick={() => send(c)}>
            <Sparkles size={12} color="#38bdf8" />
            <span>{c}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="filters">
        <input
          className="grow"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(text)}
          placeholder="Ask engineering question about engine degradation, sensors, or RUL..."
          aria-label="Engineering question input"
        />
        <button className="btn dark" onClick={() => send(text)} disabled={busy || !text.trim()}>
          <Send size={15} />
          <span>Ask Copilot</span>
        </button>
      </div>

      <p className="empty">
        Grounding constraint: Inferences reference stored NASA C-MAPSS dataset channels and evaluated PyTorch models. For certified flight release, always follow certified OEM aircraft maintenance manuals.
      </p>
    </div>
  );
}
