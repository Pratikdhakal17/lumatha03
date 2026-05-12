import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, CheckCircle2 } from 'lucide-react';

interface PollDisplayProps {
  content: string;
  isOwn: boolean;
  onVote?: (optionIndex: number) => void;
}

export function PollDisplay({ content, isOwn, onVote }: PollDisplayProps) {
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
  const mockVotes = useMemo(
    () => parsedPoll.options.map((option, index) => (parsedPoll.structured ? option.votes : 1 + (hashString(`${parsedPoll.question}:${option.text}:${index}`) % 4))),
    [parsedPoll]
  );
  const totalVotes = mockVotes.reduce((sum, count) => sum + count, 0);

  const handleVote = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    if (onVote) onVote(idx);
  };

  if (parsedPoll.options.length === 0) return <p className="text-white">{content}</p>;

  const currentTotal = totalVotes + (selectedOption !== null ? 1 : 0);

  return (
    <div className={cn(
      "w-full max-w-[320px] rounded-2xl overflow-hidden",
      isOwn ? "bg-[#1a1a2e] border border-white/10" : "bg-[#1a1a2e] border border-white/10"
    )}>
      {/* Poll Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Poll</span>
        </div>
        <h4 className="font-semibold text-[15px] text-white leading-snug">{parsedPoll.question}</h4>
      </div>

      {/* Options */}
      <div className="p-3 space-y-2">
        {parsedPoll.options.map((option, idx) => {
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
                "relative w-full text-left rounded-xl overflow-hidden transition-all",
                hasVoted ? "cursor-default" : "cursor-pointer active:scale-[0.98] hover:bg-white/5"
              )}
            >
              {/* Background track */}
              <div className="absolute inset-0 bg-white/5 rounded-xl" />

              {/* Progress fill */}
              {hasVoted && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out",
                    isSelected ? "bg-violet-500/25" : "bg-white/5"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Content */}
              <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {hasVoted && isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-[13px] font-medium truncate",
                    isSelected ? "text-white" : "text-white/90"
                  )}>
                    {option.text}
                  </span>
                </div>

                {hasVoted && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-bold text-white/80">{percentage}%</span>
                    <span className="text-[11px] text-white/40">({voteCount})</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {selectedOption !== null && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-[10px] text-white/40 text-center font-medium">
            {currentTotal} votes · Tap an option to vote
          </p>
        </div>
      )}
    </div>
  );
}
