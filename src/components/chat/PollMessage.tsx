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
    <div className="w-full max-w-[320px] rounded-2xl overflow-hidden bg-[#1a1a2e] border border-white/10">
      {/* Poll Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Poll</span>
          {totalVotes > 0 && (
            <span className="text-[10px] text-white/50">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          )}
        </div>
        <h3 className="text-white font-semibold text-[15px] leading-snug">{poll.question}</h3>
      </div>

      {/* Poll Options */}
      <div className="p-3 space-y-2">
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
              <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {hasVoted && isSelected && (
                    <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
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
      <div className="text-[10px] text-white/40 px-4 py-2 border-t border-white/5">
        Created {new Date(poll.createdAt).toLocaleDateString()}
        {!poll.isActive && (
          <span className="ml-2 text-orange-400">· Poll ended</span>
        )}
      </div>
    </div>
  );
}
