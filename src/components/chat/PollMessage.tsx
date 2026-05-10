import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
      } catch (error) {
        console.error('Failed to parse poll data:', error);
      }
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
    <div className="rounded-xl border border-white/10 p-4 bg-white/5 space-y-3">
      {/* Poll Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">POLL</span>
        {totalVotes > 0 && (
          <span className="text-xs text-white/60">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Poll Question */}
      <h3 className="text-white font-semibold">{poll.question}</h3>

      {/* Poll Options */}
      <div className="space-y-2">
        <AnimatePresence>
          {poll.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            const isSelected = option.id === selectedOption;
            const isLeading = totalVotes > 0 && option.votes === Math.max(...poll.options.map(o => o.votes));

            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => canVote && handleVote(option.id)}
                disabled={!canVote || voting}
                className={cn(
                  "relative w-full text-left p-3 rounded-lg border transition-all duration-200 overflow-hidden",
                  canVote && !voting && "hover:bg-white/10 cursor-pointer",
                  isSelected && "bg-purple-500/20 border-purple-400/50",
                  !canVote && "cursor-not-allowed opacity-75",
                  "border-white/10"
                )}
              >
                {/* Progress Bar */}
                {hasVoted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-lg",
                      isSelected ? "bg-purple-500/30" : "bg-white/10"
                    )}
                  />
                )}

                {/* Option Content */}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      isSelected ? "text-purple-200 font-medium" : "text-white"
                    )}>
                      {option.text}
                    </span>
                  </div>
                  
                  {hasVoted && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-white/60">
                        {Math.round(percentage)}%
                      </span>
                      <span className="text-xs text-white/40">
                        {option.votes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Leading Indicator */}
                {hasVoted && isLeading && !isSelected && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Voting Status */}
      {voting && (
        <div className="text-center">
          <span className="text-xs text-purple-300">Recording vote...</span>
        </div>
      )}

      {/* Poll Footer */}
      <div className="text-xs text-white/40 pt-2 border-t border-white/5">
        Created {new Date(poll.createdAt).toLocaleDateString()}
        {!poll.isActive && (
          <span className="ml-2 text-orange-400">• Poll ended</span>
        )}
      </div>
    </div>
  );
}
