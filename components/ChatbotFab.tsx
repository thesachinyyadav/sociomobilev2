"use client";

import { MessageSquare, X, Send, Trash2, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/api\/?$/, "");

type Message = {
  role: "user" | "model";
  content: string;
};

export default function ChatbotFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const { session, userData } = useAuth();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const sendMessage = useCallback(async (directMsg?: string) => {
    const trimmed = (directMsg || input).trim();
    if (!trimmed || loading) return;

    if (!session?.access_token) {
      setError("Please sign in to use the chatbot.");
      return;
    }

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    if (!directMsg) setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10), // last 10 messages for context
          context: {
            page: pathname,
            userId: userData?.email,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "model", content: data.reply },
      ]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [input, loading, session, messages, pathname, userData]);

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {/* FAB Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chatbot"
          className="fixed right-3 z-40 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          style={{
            bottom:
              "calc(var(--bottom-nav) + var(--safe-bottom) + 10px)",
          }}
        >
          <MessageSquare size={22} strokeWidth={2} />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          style={{
            paddingBottom:
              "calc(var(--bottom-nav) + var(--safe-bottom))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-primary)] text-white shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <div>
                <h2 className="text-[15px] font-bold leading-tight">
                  SocioAssist
                </h2>
                <p className="text-[11px] opacity-75">
                  Powered by Gemini
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2 rounded-full hover:bg-white/15 transition-colors"
                  aria-label="Clear chat"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-white/15 transition-colors"
                aria-label="Close chatbot"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          >
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
                  <Sparkles
                    size={24}
                    className="text-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <p className="font-bold text-[15px] text-gray-900">
                    Hey{userData?.name ? `, ${userData.name.split(" ")[0]}` : ""}! 👋
                  </p>
                  <p className="text-[13px] text-gray-500 mt-1">
                    I&apos;m SocioAssist, your event assistant. Ask me
                    about events, fests, registrations, or anything
                    about Socio!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {[
                    "What events are happening?",
                    "How do I register?",
                    "Upcoming fests?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-[12px] px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[var(--color-primary)] text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-center px-4 py-2">
                <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2 inline-block">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-gray-200 px-3 py-2.5 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  session
                    ? "Ask about events, fests..."
                    : "Sign in to chat"
                }
                disabled={!session || loading}
                className="flex-1 text-[14px] px-4 py-2.5 bg-gray-100 rounded-full border-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-all disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || !session}
                className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
                aria-label="Send message"
              >
                <Send size={16} className="translate-x-[1px]" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              20 messages/day &bull; Responses may be inaccurate
            </p>
          </div>
        </div>
      )}
    </>
  );
}
