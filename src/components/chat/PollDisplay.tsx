import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, CheckCircle2 } from 'lucide-react';

// Add CSS for animated percentage fill
const style = document.createElement('style');
if (!style.textContent) {
  style.textContent = `
    @keyframes fillBar {
      from {
        width: 0%;
        opacity: 0.5;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .poll-bar-fill {
      animation: fillBar 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    .poll-option {
      animation: slideIn 0.5s ease-out;
    }
  `;
  document.head.appendChild(style);
}

interface PollDisplayProps {
  content: string;
  isOwn: boolean;
  messageId?: string;
  peerId?: string; // id of chat peer to send vote messages to
  onVote?: (optionIndex: number) => void;
}

export function PollDisplay({ content, isOwn, messageId, peerId, onVote }: PollDisplayProps) {
  const parsedPoll = useMemo(() => {
    if (content.startsWith('[POLL]')) {
      try {
        const raw = JSON.parse(content.slice(6));
        const structuredOptions = Array.isArray(raw?.options)
          ? raw.options
              .map((option: any, index: number) => ({
                id: option?.id || `option-${index + 1}`,
                text: typeof option === 'string' ? option : String(option?.text ?? option?.label ?? '').trim(),
                votes: Number(option?.votes || 0),
              }))
              .filter((option: { text: string }) => Boolean(option.text))
          : [];

        return {
          question: String(raw?.question || raw?.title || '').trim(),
          options: structuredOptions,
          createdAt: String(raw?.createdAt || raw?.created_at || ''),
          isActive: raw?.isActive !== false,
          structured: true,
        };
      } catch {
        // Fall through to legacy parsing.
      }
    }

    const lines = content.split('\n');
    const question = lines[0].replace(/^📊 POLL:\s*/i, '').trim();
    const options = lines
      .slice(1)
      .map((line) => line.replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean)
      .map((text, index) => ({ id: `legacy-${index + 1}`, text, votes: 0 }));

    return {
      question,
      options,
      createdAt: '',
      isActive: true,
      structured: false,
    };
  }, [content]);

  const hashString = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [pollState, setPollState] = useState(() => ({ ...parsedPoll }));

  useEffect(() => {
    setPollState({ ...parsedPoll });
  }, [parsedPoll]);

  const mockVotes = useMemo(
    () => pollState.options.map((option, index) => (pollState.structured ? option.votes : 1 + (hashString(`${pollState.question}:${option.text}:${index}`) % 4))),
    [pollState]
  );
  const totalVotes = mockVotes.reduce((sum, count) => sum + count, 0);

  const handleVote = (idx: number) => {
    // allow changing vote: send vote message every time
    setSelectedOption(idx);
    if (onVote) onVote(idx);
    // send poll vote message via chat system so peers get realtime update
    try {
      // lazy import hook to avoid cycles
      // @ts-ignore
      const { useChat } = require('@/hooks/useChat');
      // call sendMessage from hook by creating a temporary instance
      // Since hooks cannot be called conditionally, dispatch a custom event to request a vote send
      window.dispatchEvent(new CustomEvent('request-poll-vote', { detail: { pollMessageId: messageId, peerId, optionIndex: idx } }));
    } catch (e) {
      // Fallback: store locally only
    }
  };

  // Listen for incoming poll vote events from useChat realtime handler
  useEffect(() => {
    const onVoteEvent = (e: any) => {
      try {
        const msg = e.detail as any;
        let payload = null;
        if (typeof msg === 'string' && msg.startsWith('[POLL_VOTE]')) {
          payload = JSON.parse(msg.slice(11));
        } else if (msg && msg.content && typeof msg.content === 'string' && msg.content.startsWith('[POLL_VOTE]')) {
          payload = JSON.parse(msg.content.slice(11));
        } else if (msg && msg.pollId) {
          payload = msg;
        }
        if (!payload) return;
        const pollId = payload.pollId || payload.pollMessageId;
        if (!pollId) return;
        // Match by poll id inside parsedPoll
        const myPollId = (parsedPoll as any).id || parsedPoll.question;
        if (String(pollId) !== String(myPollId) && String(pollId) !== String(messageId)) return;

        const voterId = payload.voterId || payload.userId || payload.voter;
        const optionIndex = Number(payload.optionIndex);
        if (Number.isNaN(optionIndex)) return;

        setPollState(prev => {
          const next = { ...prev, options: prev.options.map(o => ({ ...o, voters: Array.isArray(o.voters) ? [...o.voters] : [] })) };
          // remove voter from any previous option
          next.options.forEach((opt) => {
            const idx = opt.voters.indexOf(voterId);
            if (idx !== -1) opt.voters.splice(idx, 1);
          });
          // add to new option
          if (!next.options[optionIndex]) return prev;
          next.options[optionIndex].voters = next.options[optionIndex].voters || [];
          if (!next.options[optionIndex].voters.includes(voterId)) next.options[optionIndex].voters.push(voterId);
          // update votes counts
          next.options = next.options.map(o => ({ ...o, votes: (o.voters || []).length }));
          return next;
        });
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('poll-vote', onVoteEvent as EventListener);
    return () => window.removeEventListener('poll-vote', onVoteEvent as EventListener);
  }, [parsedPoll, messageId]);

  if (pollState.options.length === 0) return <p className="text-white">{content}</p>;

  const currentTotal = totalVotes + (selectedOption !== null ? 1 : 0);

  return (
    <div className={cn(
      "w-full max-w-full rounded-[24px] overflow-hidden border border-white/10 bg-[#121423] shadow-[0_10px_36px_rgba(0,0,0,0.24)]",
      isOwn ? "ring-1 ring-violet-500/15" : "ring-1 ring-white/5"
    )}>
      {/* Poll Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/8 bg-[linear-gradient(180deg,rgba(124,58,237,0.16),rgba(255,255,255,0.02))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 border border-violet-400/20">
              <BarChart3 className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">Poll</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/55 border border-white/10">
                  {poll.isActive ? 'Live' : 'Ended'}
                </span>
              </div>
              <p className="text-[11px] text-white/45 mt-0.5">
                {totalVotes > 0 ? `${totalVotes} vote${totalVotes !== 1 ? 's' : ''}` : 'No votes yet'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Question</p>
            <p className="text-[11px] text-white/50">Vote to show results</p>
          </div>
        </div>
        <h4 className="mt-3 text-[15px] font-semibold text-white leading-snug">{pollState.question}</h4>
      </div>

      {/* Options */}
      <div className="px-4 py-4 space-y-2.5">
        {pollState.options.map((option, idx) => {
          const voteCount = mockVotes[idx] + (selectedOption === idx ? 1 : 0);
          const percentage = currentTotal > 0 ? Math.round((voteCount / currentTotal) * 100) : 0;
          const isSelected = selectedOption === idx;
          const hasVoted = selectedOption !== null;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={hasVoted}
              type="button"
              className={cn(
                "relative w-full text-left rounded-xl overflow-hidden transition-all poll-option",
                hasVoted ? "cursor-default" : "cursor-pointer active:scale-[0.98] hover:bg-white/5"
              )}
            >
              {/* Background track */}
              <div className="absolute inset-0 bg-white/5 rounded-xl" />

              {/* Progress fill with animation */}
              {hasVoted && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-xl poll-bar-fill",
                    isSelected ? "bg-gradient-to-r from-violet-500/30 to-violet-500/10" : "bg-white/8"
                  )}
                  style={{ 
                    width: `${percentage}%`,
                    animation: `fillBar 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                  }}
                />
              )}

              {/* Content */}
              <div className="relative flex items-center justify-between gap-3 px-3 py-3">
                <div className="flex items-start gap-2 min-w-0">
                  {hasVoted && isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[13px] font-medium leading-snug whitespace-normal break-words",
                    isSelected ? "text-white" : "text-white/90"
                  )}>
                    {option.text}
                  </span>
                </div>

                {hasVoted && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-bold text-white/80 transition-all duration-500">
                      {percentage}%
                    </span>
                    <span className="text-[11px] text-white/40 transition-all duration-500">
                      ({voteCount})
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3 text-[10px] text-white/42">
          <span>{selectedOption !== null ? `${currentTotal} votes recorded` : 'Tap one option to vote'}</span>
          <span>{poll.isActive ? 'Results update instantly' : 'Voting closed'}</span>
        </div>
      </div>
    </div>
  );
}
