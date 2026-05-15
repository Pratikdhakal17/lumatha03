import React, { useState, useRef, memo } from 'react';
import { Plus, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (text: string) => void;
  onFileClick: () => void;
  onPrimaryReaction: () => void;
  onPrimaryReactionLongPress: (event: React.MouseEvent | React.TouchEvent) => void;
  onOpenReactionTray?: () => void;
  onQuickReaction?: (emoji: string) => void;
  quickReactions?: string[];
  primaryReaction?: string;
  rateLimit: {
    isRateLimited: boolean;
    secondsUntilReset: number;
  };
  uploading: boolean;
  editingMsg: { id: string; content: string } | null;
  initialValue?: string;
}

export const ChatInput = memo(function ChatInput({
  onSend,
  onFileClick,
  onPrimaryReaction,
  onPrimaryReactionLongPress,
  onOpenReactionTray,
  onQuickReaction,
  quickReactions = ['🙏', '👍', '❤️', '😂', '😢', '😡'],
  primaryReaction = '🙏',
  rateLimit,
  uploading,
  editingMsg,
  initialValue = '',
}: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-[1200px] mx-auto">
      {!value.trim() && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            className="h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold flex items-center gap-2 border border-white/10 bg-white/5 text-white/90"
            onClick={onPrimaryReaction}
            onContextMenu={onPrimaryReactionLongPress}
            onTouchStart={(e) => {
              const timer = setTimeout(() => onPrimaryReactionLongPress(e), 500);
              const clear = () => clearTimeout(timer);
              e.currentTarget.addEventListener('touchend', clear, { once: true });
            }}
          >
            <span className="text-base leading-none">{primaryReaction}</span>
            <span>Primary</span>
          </button>
          {quickReactions.slice(0, 5).map((emoji) => (
            <button
              key={emoji}
              className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-[18px] active:scale-95 transition-transform"
              onClick={() => onQuickReaction?.(emoji)}
              aria-label={`Send ${emoji}`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
          <button
            className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-white/90 active:scale-95 transition-transform"
            onClick={onOpenReactionTray}
            aria-label="Open reaction tray"
            title="More reactions"
          >
            +
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 w-full">
      <motion.button
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 active:bg-white/20 transition-all"
        onClick={onFileClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
      </motion.button>

      <div className="flex-1 flex items-center rounded-full px-4 py-2" style={{ background: '#1e293b', border: '1px solid #334155', minHeight: 44 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={rateLimit.isRateLimited ? `Wait ${rateLimit.secondsUntilReset}s` : (editingMsg ? "Edit message..." : "Message...")}
          className="flex-1 bg-transparent text-[15px] text-white placeholder:text-muted-foreground outline-none"
          disabled={uploading || rateLimit.isRateLimited}
        />
      </div>

      {value.trim() ? (
        <motion.button
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all"
          style={{ background: !rateLimit.isRateLimited ? '#7C3AED' : '#1e293b' }}
          onClick={handleSend}
          disabled={uploading || rateLimit.isRateLimited}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
        >
          <Send className="w-5 h-5 text-white" />
        </motion.button>
      ) : (
        <motion.button
          className="w-10 h-10 rounded-full flex items-center justify-center text-[22px] hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all"
          onClick={onPrimaryReaction}
          onContextMenu={onPrimaryReactionLongPress}
          onTouchStart={(e) => {
            const timer = setTimeout(() => onPrimaryReactionLongPress(e), 500);
            const clear = () => clearTimeout(timer);
            e.currentTarget.addEventListener('touchend', clear, { once: true });
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
        >
          {primaryReaction}
        </motion.button>
      )}
      </div>
    </div>
  );
});
