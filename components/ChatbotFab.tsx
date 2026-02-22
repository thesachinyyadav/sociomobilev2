"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

/* ─── Types ─────────────────────────────────────────── */
interface QA { q: string; a: string }
interface Message { role: "user" | "assistant"; content: string }

/* ─── Preset Q&A databases ──────────────────────────── */
const GLOBAL_QA: QA[] = [
  { q: "What is Socio?", a: "Socio is a campus event management platform that lets you discover, register for, and manage college events and fests — all in one place." },
  { q: "How do I register for an event?", a: "Open any event page and tap the 'Register' button. You'll need to be signed in with your college email." },
  { q: "How do I contact support?", a: "Reach out via the Contact page or email our support team. We're happy to help!" },
  { q: "Is there a desktop version?", a: "Yes! Visit socio2026.vercel.app on your laptop or desktop for the full web experience with more features." },
];

function getPageQA(pathname: string): QA[] {
  if (pathname === "/events") return [
    { q: "How do I find events?", a: "You're on the right page! Browse all upcoming events here. Use the search and filters to narrow down by category, date, or fest." },
    { q: "Can I filter events?", a: "Yes! Use the filter options at the top to filter by category (Technical, Cultural, Sports, etc.) or date." },
    { q: "Are events free?", a: "It depends on the event. Each event card shows whether it's free or paid. Tap on an event for full details." },
  ];
  if (pathname.startsWith("/event/")) return [
    { q: "How do I register?", a: "Tap the 'Register' button on this page. Make sure you're signed in first. You'll receive a confirmation with your QR code." },
    { q: "Where is the venue?", a: "The venue details are shown in the event information section on this page. Look for the location field." },
    { q: "What is the QR code for?", a: "After registering, you receive a QR code. This is scanned at the venue entrance for attendance tracking. Keep it handy!" },
    { q: "Can I cancel registration?", a: "Contact the event organiser directly for cancellations. You can find their details on the event page." },
  ];
  if (pathname === "/fests") return [
    { q: "What is a fest?", a: "A fest is a collection of related events, usually spanning multiple days — like a college cultural or technical festival." },
    { q: "How do I view fest events?", a: "Tap on any fest card to see all events that are part of that fest. You can register for individual events within." },
    { q: "When is the next fest?", a: "Check the fest cards on this page — each shows the start and end dates. Upcoming fests appear first." },
  ];
  if (pathname.startsWith("/fest/")) return [
    { q: "What events are in this fest?", a: "Scroll down on this page to see all events in this fest. You can register for each one individually." },
    { q: "How long does this fest run?", a: "The fest duration is shown at the top with start and end dates." },
  ];
  if (pathname === "/profile") return [
    { q: "Where are my registrations?", a: "Your registered events are shown on this page under the Registrations section. You can also see your attendance history." },
    { q: "How do I edit my profile?", a: "Tap the Edit button on this page to update your name, bio, and other details." },
    { q: "Where is my QR code?", a: "Your QR codes appear in the Registrations section. Tap on a registration to view or screenshot your QR." },
  ];
  if (pathname === "/discover") return [
    { q: "What is Discover?", a: "Discover helps you explore events and fests. Browse by category to find something you'll enjoy!" },
    { q: "Can I search for events?", a: "Yes! Use the search at the top to find events by name, or browse through categories." },
  ];
  if (pathname === "/" || pathname === "/notifications") return [
    { q: "Where do I start?", a: "Head to Events to browse upcoming events, or check Fests to see what's happening on campus." },
    { q: "How do I sign in?", a: "Tap Sign In and use your Google account. Use your college email for full access." },
    { q: "What can I do on Socio?", a: "Discover and register for campus events, track your registrations and attendance, and get notified about new events." },
  ];
  if (pathname === "/auth" || pathname === "/auth/login") return [
    { q: "How do I sign in?", a: "Tap 'Sign in with Google' to use your Google account. Use your college email if required by your institution." },
    { q: "I can't sign in", a: "Make sure pop-ups aren't blocked and you have a stable internet connection. Try clearing your browser cache." },
  ];
  return [];
}

/* ─── Fuzzy match typed questions ───────────────────── */
function findAnswer(input: string, qaList: QA[]): string | null {
  const lower = input.toLowerCase().trim();
  for (const qa of qaList) {
    const keywords = qa.q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const hits = keywords.filter((k) => lower.includes(k)).length;
    if (hits >= 2 || (keywords.length <= 3 && hits >= 1)) return qa.a;
  }
  if (/register|sign.?up|join/i.test(lower)) return "To register for an event, open the event page and tap 'Register'. Make sure you're signed in first!";
  if (/qr|code|ticket/i.test(lower)) return "After registering, you receive a unique QR code for attendance. Find it on your Profile page.";
  if (/cancel|refund/i.test(lower)) return "To cancel a registration, please contact the event organiser directly via the event page.";
  if (/contact|help|support/i.test(lower)) return "You can reach our support team via the Contact page.";
  if (/fest|festival/i.test(lower)) return "Fests are collections of related events. Visit the Fests tab to browse upcoming festivals.";
  if (/profile|account/i.test(lower)) return "Visit your Profile to see registrations, attendance history, and edit your details.";
  return null;
}

/* ─── Component ─────────────────────────────────────── */
export default function ChatbotFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const pageQA = getPageQA(pathname);
  const allQA = [...pageQA, ...GLOBAL_QA];
  const quickQuestions = [...pageQA.slice(0, 3), ...GLOBAL_QA.slice(0, Math.max(0, 3 - pageQA.length))].map((qa) => qa.q);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);
  const handleQuestion = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
    const answer = findAnswer(text, allQA);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: answer || "I'm not sure about that one. Try picking a question below, or check the Events/Fests pages for more info!",
      }]);
    }, 350);
  };

  const clearChat = () => setMessages([]);
  const asked = messages.filter((m) => m.role === "user").map((m) => m.content);
  const remaining = quickQuestions.filter((q) => !asked.includes(q));

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open help"
          className="fixed right-3 z-40 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          style={{ bottom: "calc(var(--bottom-nav) + var(--safe-bottom) + 10px)" }}
        >
          {/* Chat bubble icon */}
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          style={{ paddingBottom: "calc(var(--bottom-nav) + var(--safe-bottom))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-primary)] text-white shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
              <div>
                <h2 className="text-[15px] font-bold leading-tight">SocioAssist</h2>
                <p className="text-[11px] opacity-75">Quick Help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearChat} className="p-2 rounded-full hover:bg-white/15 transition-colors" aria-label="Clear chat">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-white/15 transition-colors" aria-label="Close">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[15px] text-gray-900">Need help? 👋</p>
                  <p className="text-[13px] text-gray-500 mt-1">
                    Pick a question or type your own!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {quickQuestions.map((q) => (
                    <button key={q} onClick={() => handleQuestion(q)}
                      className="text-[12px] px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[var(--color-primary)] text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {messages.length > 0 && remaining.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1 justify-center">
                {remaining.map((q) => (
                  <button key={q} onClick={() => handleQuestion(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>


        </div>
      )}
    </>
  );
}
