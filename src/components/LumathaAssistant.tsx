import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Sparkles, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  time: Date;
}

const ALL_CHIPS = [
  'How do I use Home? 🏠',
  'How do I use Messages? 💬',
  'How do I use Notes? 📝',
  'How do I use Adventure? 🧭',
  'How do I use Marketplace? 🛍️',
];

const STORAGE_KEY = 'lumatha_ai_chat_history';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Floating Button ─── */
export function LumathaAIButton({ onClick, hasUnread }: { onClick: () => void; hasUnread: boolean }) {
  return (
    <button
      onClick={onClick}
      className="fixed z-[100] flex items-center justify-center rounded-full transition-transform active:scale-95"
      style={{
        bottom: 80,
        right: 20,
        width: 56,
        height: 56,
        background: 'hsl(var(--accent))',
        boxShadow: '0 8px 32px rgba(124,58,237,0.5)',
        animation: 'lumathaAIPulse 3s ease-in-out infinite',
      }}
      aria-label="Open Lumatha AI"
    >
      <Sparkles className="w-6 h-6 text-white" />
      {hasUnread && (
        <span
          className="absolute rounded-full"
          style={{
            top: 0,
            right: 0,
            width: 12,
            height: 12,
            background: '#EF4444',
            border: '2px solid hsl(var(--background))',
          }}
        />
      )}
    </button>
  );
}

/* ─── Main Chat Panel ─── */
export function LumathaAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const username = profile?.name || profile?.first_name || 'Friend';
  const location = profile?.country || profile?.detected_city || '';
  const currentDate = new Date().toISOString().slice(0, 10);
  const assistantSystemPrompt = `You are Lumatha AI for the date ${currentDate}.

You must ONLY answer questions about Lumatha and how to use it. Allowed topics include Home, Stories, Messages, Random Connect, Private, Privacy Shield, Adventure, Learn, Notes, Docs, Marketplace, AB Dev, Profile, Settings, XP, points, and app features.

If the user asks about anything outside Lumatha, refuse politely and say you can only help with Lumatha features and usage.

If the user asks who founded or built Lumatha, answer exactly: "Pratik Dhakal".

Keep answers practical, concise, and helpful. Do not provide political, historical, or general current-events answers.`;

  // Randomised chip order, stable per mount
  const shuffledChips = useMemo(() => shuffleArray(ALL_CHIPS), []);
  const visibleChips = showAllChips ? shuffledChips : shuffledChips.slice(0, 4);

  // Load history from localStorage on open
  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ChatMessage[] = JSON.parse(saved).map((m: any) => ({ ...m, time: new Date(m.time) }));
        if (parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch { /* ignore */ }
    // Show welcome message
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `Namaste ${username}! 🙏\n\nI am your Lumatha AI companion. I can only help with Lumatha features and app usage, and I can answer Lumatha founder questions too. If you ask something outside Lumatha, I’ll gently redirect you back here.\n\nWhat do you want to explore in Lumatha today?`,
      time: new Date(),
    }]);
  }, [open]);

  // Save ONLY assistant responses to localStorage (ephemeral, per-session)
  // User questions are NOT persisted
  useEffect(() => {
    if (messages.length > 0) {
      const responsesOnly = messages.filter(m => m.role === 'assistant').slice(-20);
      if (responsesOnly.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(responsesOnly));
      }
    }
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
  }, [messages, loading]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 400);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    // Show user message temporarily in UI
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text.trim(), time: new Date() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);
    // Auto-delete user message after response comes back (ephemeral)
    // Only persist assistant responses

    try {
      const history = [
        { role: 'system' as const, content: assistantSystemPrompt },
        ...allMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      ];
      const { data, error } = await supabase.functions.invoke('lumatha-assistant', {
        body: { messages: history, username, location },
      });

      if (error) throw error;
      const reply = data?.reply || 'Sorry sathi, something went wrong. Try again? 🙏';
      const assistantMsg: ChatMessage = { id: Date.now() + 1, role: 'assistant', content: reply, time: new Date() };
      
      // Remove user question, keep only assistant response (ephemeral questions)
      setMessages(prev => prev.filter(m => m.role === 'assistant').concat(assistantMsg));
    } catch (e) {
      console.error('Assistant error:', e);
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Mero sathi, I am having a little trouble connecting right now. 😔\n\nCould you try sending that again or check your internet? I'm always here to help once we're back online! 🙏`,
        time: new Date(),
      };
      // Remove user question on error too
      setMessages(prev => prev.filter(m => m.role === 'assistant').concat(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `Chat cleared! Fresh start, ${username}! 🌟\nHow can I help you today?`,
      time: new Date(),
    }]);
  };

  const handleClear = () => {
    clearChat();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{
          background: 'hsl(var(--card))',
          height: '100dvh',
          maxHeight: '100dvh',
          borderRadius: 0,
        }}
      >
        {/* Drag handle - minimal */}
        <div className="flex justify-center pt-2 pb-0.5">
          <div className="rounded-full" style={{ width: 30, height: 3, background: '#374151', borderRadius: 100 }} />
        </div>

        {/* Header - Minimal with Clear button */}
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-2">
            {/* AI Avatar - minimal */}
            <div
              className="relative flex items-center justify-center rounded-full shrink-0"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, hsl(var(--accent)), #6366F1)',
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Lumatha AI
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/30 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" style={{ color: '#94A3B8' }} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/30 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
          {/* Suggestion chips — always visible at top */}
          <div className="pb-2">
            <div className="flex flex-wrap gap-2">
              {visibleChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="shrink-0 rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-95"
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--muted-foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
            {!showAllChips && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    shuffleArray(ALL_CHIPS);
                    setShowAllChips(false);
                    // Force re-render with new random set
                    window.dispatchEvent(new Event('resize'));
                  }}
                  className="flex items-center gap-1 text-[12px] hover:opacity-80 transition-opacity"
                  style={{ color: '#94A3B8', fontFamily: "'Inter'" }}
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
                <button
                  onClick={() => setShowAllChips(true)}
                  className="flex items-center gap-1 text-[12px] hover:opacity-80 transition-opacity"
                  style={{ color: 'hsl(var(--accent))', fontFamily: "'Inter'" }}
                >
                  See more <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
              {msg.role === 'assistant' && (
                <div
                  className="flex items-center justify-center rounded-full shrink-0 mt-1"
                  style={{
                    width: 28,
                    height: 28,
                    background: 'linear-gradient(135deg, hsl(var(--accent)), #6366F1)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div>
                <div
                  style={{
                    background: msg.role === 'user' ? 'hsl(var(--accent))' : 'hsl(var(--muted))',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '12px 16px',
                    maxWidth: msg.role === 'user' ? '75%' : '80%',
                    fontSize: 15,
                    fontFamily: "'Inter', sans-serif",
                    color: msg.role === 'user' ? 'white' : 'hsl(var(--foreground))',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    marginLeft: msg.role === 'user' ? 'auto' : undefined,
                    border: msg.role === 'assistant' ? '1px solid hsl(var(--border))' : undefined,
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <p
                    style={{ fontSize: 10, color: '#4B5563', marginTop: 4, fontFamily: "'Inter'" }}
                  >
                    {formatTime(msg.time)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start gap-2">
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  background: 'linear-gradient(135deg, hsl(var(--accent)), #6366F1)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div
                className="flex items-center gap-1.5"
                style={{
                  background: 'hsl(var(--muted))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '18px 18px 18px 4px',
                  padding: '14px 20px',
                }}
              >
                {[0, 1, 2].map(j => (
                  <div
                    key={j}
                    className="rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: '#94A3B8',
                      animation: `lumathaTypingBounce 0.6s ease-in-out ${j * 150}ms infinite alternate`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div
          style={{
            background: 'hsl(var(--card))',
            borderTop: '1px solid hsl(var(--border))',
            padding: '12px 16px',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              background: 'hsl(var(--muted))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 100,
              padding: '6px 6px 6px 20px',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask me anything..."
              className="flex-1 bg-transparent border-none outline-none text-foreground text-[15px] placeholder:text-muted-foreground"
              style={{ fontFamily: "'Inter', sans-serif" }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'hsl(var(--accent))' }}
            >
              <Send className="w-[18px] h-[18px] text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
