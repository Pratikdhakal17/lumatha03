import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Add CSS for animated percentage fill (injected once at module load)
if (typeof document !== 'undefined' && !document.getElementById('poll-animations-style')) {
  const style = document.createElement('style');
  style.id = 'poll-animations-style';
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
  const { user } = useAuth();
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
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    setPollState({ ...parsedPoll });
    
    // Check if user has already voted in this poll
    if (user && messageId) {
      try {
        const voteKey = `poll_vote_${parsedPoll.question || messageId}_${user.id}`;
        const storedVote = localStorage.getItem(voteKey);
        if (storedVote) {
          const voteData = JSON.parse(storedVote);
          setSelectedOption(voteData.optionIndex);
          setHasVoted(true);
        }
      } catch (error) {
        // Ignore storage errors
      }
    }
  }, [parsedPoll, messageId, user]);

  const actualVotes = useMemo(
    () => pollState.options.map((option) => option.votes || 0),
    [pollState]
  );
  const totalVotes = actualVotes.reduce((sum, count) => sum + count, 0);

  const handleVote = (idx: number) => {
    // Prevent voting if user has already voted and not changing vote
    if (hasVoted && selectedOption === idx) return;
    
    const wasChangingVote = hasVoted && selectedOption !== idx;
    setSelectedOption(idx);
    setHasVoted(true);
    
    // Update local state immediately for better UX
    if (wasChangingVote) {
      // User is changing their vote
      setPollState(prev => {
        const updatedOptions = prev.options.map((option, optionIdx) => {
          if (optionIdx === selectedOption) {
            // Remove vote from previous option
            return { ...option, votes: Math.max(0, option.votes - 1) };
          }
          if (optionIdx === idx) {
            // Add vote to new option
            return { ...option, votes: option.votes + 1 };
          }
          return option;
        });
        return { ...prev, options: updatedOptions };
      });
    } else {
      // First time voting
      setPollState(prev => {
        const updatedOptions = prev.options.map((option, optionIdx) => {
          if (optionIdx === idx) {
            return { ...option, votes: option.votes + 1 };
          }
          return option;
        });
        return { ...prev, options: updatedOptions };
      });
    }
    
    if (onVote) onVote(idx);
    
    // Store vote in localStorage for persistence
    try {
      const voteKey = `poll_vote_${parsedPoll.question || messageId}_${user?.id || 'anonymous'}`;
      localStorage.setItem(voteKey, JSON.stringify({
        pollId: messageId,
        question: parsedPoll.question,
        userId: user?.id || 'anonymous',
        optionIndex: idx,
        isChangingVote: wasChangingVote,
        timestamp: new Date().toISOString()
      }));
    } catch (storageError) {
      // Ignore storage errors
    }
    
    // send poll vote message via chat system so peers get realtime update
    try {
      // lazy import hook to avoid cycles
      // @ts-ignore
      const { useChat } = require('@/hooks/useChat');
      // call sendMessage from hook by creating a temporary instance
      // Since hooks cannot be called conditionally, dispatch a custom event to request a vote send
      window.dispatchEvent(new CustomEvent('request-poll-vote', { detail: { pollMessageId: messageId, peerId, optionIndex: idx, isChangingVote: wasChangingVote } }));
    } catch (e) {
      // Fallback: local storage already handled
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

        // Prevent processing own votes from remote events (to avoid duplicates)
        if (user && voterId === user.id) return;

        setPollState(prev => {
          // Ensure voters arrays exist
          const optionsWithVoters = prev.options.map(option => ({
            ...option,
            voters: Array.isArray(option.voters) ? [...option.voters] : []
          }));
          
          // Remove voter from all options first (prevents duplicate votes)
          const cleanedOptions = optionsWithVoters.map(option => ({
            ...option,
            voters: option.voters.filter(id => id !== voterId)
          }));
          
          // Add voter to the selected option
          if (cleanedOptions[optionIndex]) {
            cleanedOptions[optionIndex] = {
              ...cleanedOptions[optionIndex],
              voters: [...cleanedOptions[optionIndex].voters, voterId]
            };
          }
          
          // Update vote counts based on voter arrays
          return {
            ...prev,
            options: cleanedOptions.map(option => ({
              ...option,
              votes: option.voters.length
            }))
          };
        });
      } catch (err) {
        console.error('Error processing poll vote:', err);
      }
    };
    window.addEventListener('poll-vote', onVoteEvent as EventListener);
    return () => window.removeEventListener('poll-vote', onVoteEvent as EventListener);
  }, [parsedPoll, messageId, user]);

  if (pollState.options.length === 0) return <p className="text-white">{content}</p>;

  const currentTotal = totalVotes;

  // Helper function to get voter avatars for an option
  const getVoterAvatars = (option: any) => {
    if (!option.voters || !Array.isArray(option.voters)) return [];
    
    // Show up to 3 voter avatars, exclude current user
    const otherVoters = option.voters.filter((voterId: string) => voterId !== user?.id);
    return otherVoters.slice(0, 3).map((voterId: string) => {
      // For demo purposes, generate avatar from voter ID
      // In real app, you'd fetch user data from your user context
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${voterId}`;
      const initials = voterId.slice(0, 2).toUpperCase();
      return { id: voterId, avatarUrl, initials };
    });
  };

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
                  {pollState.isActive ? 'Live' : 'Ended'}
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
          const voteCount = actualVotes[idx];
          const percentage = currentTotal > 0 ? Math.round((voteCount / currentTotal) * 100) : 0;
          const isSelected = selectedOption === idx;
          const hasVoted = selectedOption !== null;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={!pollState.isActive || (hasVoted && selectedOption === idx)}
              type="button"
              className={cn(
                "relative w-full text-left rounded-xl overflow-hidden transition-all poll-option",
                !pollState.isActive ? "cursor-not-allowed opacity-60" : 
                (hasVoted && selectedOption === idx) ? "cursor-default opacity-80" : 
                "cursor-pointer active:scale-[0.98] hover:bg-white/5",
                isSelected && "ring-2 ring-violet-500/30"
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
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {hasVoted && isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-[13px] font-medium leading-snug whitespace-normal break-words block",
                      isSelected ? "text-white" : "text-white/90"
                    )}>
                      {option.text}
                    </span>
                    
                    {/* Show voter avatars */}
                    {voteCount > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {/* Show current user's avatar if they voted for this option */}
                        {isSelected && user && (
                          <div 
                            className="w-5 h-5 rounded-full border-2 border-violet-400 flex-shrink-0"
                            title="You voted for this"
                          >
                            <Avatar className="w-full h-full">
                              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email?.[0]} />
                              <AvatarFallback className="text-[8px] bg-violet-500 text-white border-0">
                                {user.email?.[0]?.toUpperCase() || 'Y'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        
                        {/* Show other voters */}
                        {getVoterAvatars(option).map((voter, idx) => (
                          <div 
                            key={voter.id} 
                            className={cn(
                              "w-5 h-5 rounded-full border border-white/20 flex-shrink-0",
                              idx > 0 && "-ml-1"
                            )}
                            title={`Voter: ${voter.id}`}
                          >
                            <Avatar className="w-full h-full">
                              <AvatarImage src={voter.avatarUrl} alt={voter.initials} />
                              <AvatarFallback className="text-[8px] bg-violet-500/20 text-violet-300 border-0">
                                {voter.initials}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        ))}
                        
                        {/* Show remaining voters count */}
                        {option.voters && option.voters.length > (isSelected ? 4 : 3) && (
                          <span className="text-[10px] text-white/50 ml-1">
                            +{option.voters.length - (isSelected ? 4 : 3)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {hasVoted && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] font-bold text-white/80 transition-all duration-500">
                      {percentage}%
                    </span>
                    <span className="text-[11px] text-white/40 transition-all duration-500">
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
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
          <span>{selectedOption !== null ? `${currentTotal} votes • You voted` : currentTotal > 0 ? `${currentTotal} votes` : 'Tap one option to vote'}</span>
          <span>{pollState.isActive ? 'Results update instantly' : 'Voting closed'}</span>
        </div>
      </div>
    </div>
  );
}
