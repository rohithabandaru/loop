"use client";

import { useState } from "react";
import { Sparkles, Send, RefreshCw, HelpCircle } from "lucide-react";
import type { CitedFeedback } from "@/lib/types";

interface AskMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  citations?: CitedFeedback[];
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function AskLoopPage() {
  const [messages, setMessages] = useState<AskMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Hello! I am Ask LOOP. Ask me any question about your customer feedback in plain English. I will perform semantic vector retrieval across your workspace data and give you an answer grounded strictly in verbatim customer evidence.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    "What are customers saying about onboarding and setup?",
    "Why are users complaining about billing and invoices?",
    "What feature requests do enterprise customers have for SSO?",
    "How do users feel about mobile app performance?",
  ];

  const handleAsk = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg: AskMessage = { id: generateId("user"), sender: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: generateId("ai-err"), sender: "ai", text: `Error: ${data.error || "Failed to process question."}` },
        ]);
      } else {
        const aiMsg: AskMessage = {
          id: generateId("ai"),
          sender: "ai",
          text: data.answer,
          citations: data.citations || [],
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: generateId("ai-err"), sender: "ai", text: "Network error communicating with Ask LOOP." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>Ask LOOP (Retrieval-Grounded Q&A)</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
              RAG Engine Active
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Plain-English AI answers grounded strictly in workspace feedback data with evidence citations.
          </p>
        </div>
      </div>

      {/* Query Suggestions */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 shrink-0 scrollbar-none">
        <span className="text-xs text-slate-400 font-semibold flex items-center space-x-1 shrink-0">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>Try asking:</span>
        </span>
        {sampleQuestions.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(sq)}
            disabled={loading}
            className="text-xs bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 overflow-y-auto space-y-6 shadow-2xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl rounded-2xl p-5 shadow-lg space-y-3 ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none"
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-semibold">
                {msg.sender === "ai" ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                      L
                    </div>
                    <span className="text-indigo-400">Ask LOOP AI</span>
                  </>
                ) : (
                  <span className="text-indigo-200">You</span>
                )}
              </div>

              {/* Response Text */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                {msg.text}
              </div>

              {/* Citations Box (Acceptance Criteria AI3 item 3: Answers cite or list specific feedback items) */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Retrieved Grounding Evidence ({msg.citations.length} Cited Items)
                  </span>

                  <div className="grid grid-cols-1 gap-2">
                    {msg.citations.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs space-y-1 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-indigo-400 font-semibold">
                            Feedback #{idx + 1} ({c.channel.replace("_", " ")})
                          </span>
                          <span className="text-slate-400">{c.customerLabel || "Anonymous Customer"}</span>
                        </div>
                        <p className="text-slate-300 italic">&quot;{c.content}&quot;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-indigo-400 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Retrieving vector embeddings & synthesizing grounded response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex items-center space-x-3 shrink-0"
      >
        <input
          type="text"
          placeholder="Ask a question about customer feedback (e.g. 'What are top issues in onboarding?')"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 shadow-xl"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
