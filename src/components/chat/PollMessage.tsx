import React, { useState, useCallback } from 'react';
import { BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface PollMessageProps {
  content: string;
  messageId: string;
  senderId: string;
  isOwn: boolean;
}

export function PollMessage({ content, messageId, senderId, isOwn }: PollMessageProps) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  // Parse poll data from message content
  React.useEffect(() => {
    if (content.startsWith('[POLL]')) {
      try {
        const pollData = JSON.parse(content.substring(6));
        setPoll(pollData);
        
        // Check if current user has already voted
        if (user && pollData.options) {
          const hasVoted = pollData.options.some(option => 
            option.voters && option.voters.includes(user.id)
          );
          if (hasVoted) {
            const votedOption = pollData.options.find(option => 
              option.voters && option.voters.includes(user.id)
            );
            if (votedOption) {
              setSelectedOption(votedOption.id);
            }
          }
        }
        return;
      } catch (error) {
        console.error('Failed to parse poll data:', error);
      }
    }

    const lines = content.split('\n');
    if (lines.length >= 2) {
      const question = lines[0].replace(/^📊 POLL:\s*/i, '').trim();
      const options = lines.slice(1).map((line, index) => ({
        id: `legacy-${index + 1}`,
        text: line.replace(/^\d+\.\s+/, '').trim(),
        votes: 0,
        voters: [],
      })).filter(option => Boolean(option.text));

      setPoll({
        id: `legacy-${Date.now()}`,
        question,
        options,
        createdBy: senderId,
        createdAt: new Date().toISOString(),
        isActive: true,
      });
    }
  }, [content, user]);

  const handleVote = useCallback(async (optionId: string) => {
    if (!user || !poll || voting) return;
    
    setVoting(true);
    try {
      // Update local state immediately for better UX
      const updatedOptions = poll.options.map(option => {
        if (option.id === optionId) {
          return {
            ...option,
            votes: option.votes + 1,
            voters: [...(option.voters || []), user.id]
          };
        }
        return option;
      });
      
      setPoll({ ...poll, options: updatedOptions });
      setSelectedOption(optionId);

      // Store vote in localStorage for now (can be moved to database later)
      try {
        const voteKey = `poll_vote_${poll.id}_${user.id}`;
        localStorage.setItem(voteKey, JSON.stringify({
          pollId: poll.id,
          messageId,
          userId: user.id,
          optionId,
          timestamp: new Date().toISOString()
        }));
        toast.success('Vote recorded');
      } catch (error) {
        console.error('Failed to record vote:', error);
        toast.error('Failed to record vote');
        
        // Revert local state on error
        setPoll(poll);
        setSelectedOption(null);
      }
    } catch (error) {
      console.error('Vote failed:', error);
      toast.error('Failed to vote');
      
      // Revert local state on error
      setPoll(poll);
      setSelectedOption(null);
    } finally {
      setVoting(false);
    }
  }, [user, poll, voting, messageId]);

  if (!poll) {
    return (
      <div className="rounded-xl border border-white/10 p-4 bg-white/5">
        <p className="text-white/60">Loading poll...</p>
      </div>
    );
  }

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const hasVoted = selectedOption !== null;
  const canVote = user && !isOwn && poll.isActive && !hasVoted;

  return (
    <div className="w-full max-w-full rounded-[24px] overflow-hidden border border-white/10 bg-[#121423] shadow-[0_10px_36px_rgba(0,0,0,0.24)] ring-1 ring-white/5">
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
        <h3 className="mt-3 text-white font-semibold text-[15px] leading-snug">{poll.question}</h3>
      </div>

      {/* Poll Options */}
      <div className="px-4 py-4 space-y-2.5">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = option.id === selectedOption;

          return (
            <button
              key={option.id}
              onClick={() => canVote && handleVote(option.id)}
              disabled={!canVote || voting}
              type="button"
              className={cn(
                "relative w-full text-left rounded-xl overflow-hidden transition-all",
                canVote && !voting && "cursor-pointer active:scale-[0.98] hover:bg-white/5",
                !canVote && "cursor-default",
                "border-0"
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
              <div className="relative flex items-center justify-between gap-3 px-3 py-3">
                <div className="flex items-start gap-2 min-w-0">
                  {hasVoted && isSelected && (
                    <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
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
                    <span className="text-[12px] font-bold text-white/80">{Math.round(percentage)}%</span>
                    <span className="text-[11px] text-white/40">({option.votes})</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Voting Status */}
      {voting && (
        <div className="text-center py-2">
          <span className="text-xs text-violet-300">Recording vote...</span>
        </div>
      )}

      {/* Poll Footer */}
      <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3 text-[10px] text-white/42">
          <span>Created {new Date(poll.createdAt).toLocaleDateString()}</span>
          <span>{poll.isActive ? 'Results update instantly' : 'Voting closed'}</span>
        </div>
      </div>
    </div>
  );
}
