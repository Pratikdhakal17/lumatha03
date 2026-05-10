import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface PollDisplayProps {
  content: string;
  isOwn: boolean;
  onVote?: (optionIndex: number) => void;
}

export function PollDisplay({ content, isOwn, onVote }: PollDisplayProps) {
  // Parse the poll content
  // Format: 📊 POLL: Question\n1. Option 1\n2. Option 2...
  const lines = content.split('\n');
  const question = lines[0].replace('📊 POLL: ', '').trim();
  const options = lines.slice(1).map(line => line.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);

  const hashString = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  // Maintain local vote state for UI demonstration
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Stable mock results for a professional look
  const mockVotes = useMemo(
    () => options.map((option, index) => 1 + (hashString(`${question}:${option}:${index}`) % 4)),
    [options, question]
  );
  const totalVotes = mockVotes.reduce((sum, count) => sum + count, 0);

  const handleVote = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    if (onVote) onVote(idx);
  };

  if (options.length === 0) return <p className="text-white">{content}</p>;

  return (
    <div className={cn(
      "w-full max-w-[300px] p-4 rounded-2xl space-y-3",
      isOwn ? "bg-primary/10 border border-primary/20" : "bg-slate-800/50 border border-slate-700/50"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📊</span>
        <h4 className="font-bold text-[15px] text-white leading-tight">{question}</h4>
      </div>

      <div className="space-y-2">
        {options.map((option, idx) => {
          const voteCount = mockVotes[idx] + (selectedOption === idx ? 1 : 0);
          const currentTotal = totalVotes + (selectedOption !== null ? 1 : 0);
          const percentage = currentTotal > 0 ? Math.round((voteCount / currentTotal) * 100) : 0;
          const isSelected = selectedOption === idx;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={selectedOption !== null}
              className={cn(
                "relative w-full text-left p-3 rounded-xl overflow-hidden transition-all active:scale-[0.98]",
                isSelected ? "ring-2 ring-primary" : "bg-white/5 hover:bg-white/10"
              )}
            >
              {/* Progress bar background */}
              {selectedOption !== null && (
                <div 
                  className="absolute inset-0 bg-primary/20 transition-all duration-1000 ease-out" 
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3">
                <span className={cn(
                  "text-[14px] font-medium truncate",
                  isSelected ? "text-primary-foreground font-bold" : "text-white"
                )}>{option}</span>
                
                {selectedOption !== null && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-white/70">{percentage}%</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedOption !== null && (
        <p className="text-[10px] text-white/40 text-center pt-1 font-medium uppercase tracking-wider">
          {totalVotes + 1} votes • Anonymous
        </p>
      )}
    </div>
  );
}
