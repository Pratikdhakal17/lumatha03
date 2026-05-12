import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerUpLeft, Copy, Forward, Pin, Pencil, Trash2, X } from 'lucide-react';

interface MessageActionMenuProps {
  targetId: string | null;
  menuPos: { top: number; left: number; width: number } | null;
  messages: any[];
  currentUserId: string;
  onReact: (id: string, emoji: string) => void;
  onClose: () => void;
  onEmojiPanel: () => void;
  onReply: (m: any) => void;
  onCopy: (m: any) => void;
  onForward: (m: any) => void;
  onTogglePin: (id: string) => void;
  onEdit: (m: any) => void;
  onDelete: (id: string, isOwn: boolean) => void;
  isPinned: (id: string) => boolean;
  displayName?: string;
}

const QUICK_REACTIONS = ['🙏', '❤️', '👍', '😂', '🔥', '🥹'];

export const MessageActionMenu = memo(function MessageActionMenu({
  targetId,
  menuPos,
  messages,
  currentUserId,
  onReact,
  onClose,
  onEmojiPanel,
  onReply,
  onCopy,
  onForward,
  onTogglePin,
  onEdit,
  onDelete,
  isPinned,
  displayName,
}: MessageActionMenuProps) {
  const targetMsg = messages.find((m) => m.id === targetId);
  if (!targetId || !menuPos || !targetMsg) return null;

  const isOwn = targetMsg.sender_id === currentUserId;
  const menuWidth = Math.min(292, menuPos.width);
  const viewportHeight = window.innerHeight;
  const estimatedMenuHeight = Math.min(Math.floor(viewportHeight * 0.74), 560);
  const top = Math.max(12, Math.min(menuPos.top - 10, viewportHeight - estimatedMenuHeight - 12));

  const actions = [
    { icon: <CornerUpLeft className="w-5 h-5" />, label: 'Reply', action: () => onReply(targetMsg), color: '#94A3B8' },
    { icon: <Copy className="w-5 h-5" />, label: 'Copy', action: () => onCopy(targetMsg), color: '#94A3B8' },
    { icon: <Forward className="w-5 h-5" />, label: 'Forward', action: () => onForward(targetMsg), color: '#94A3B8' },
    { icon: <Pin className="w-5 h-5" />, label: isPinned(targetId) ? 'Unpin' : 'Pin', action: () => onTogglePin(targetId), color: '#94A3B8' },
    ...(isOwn ? [{ icon: <Pencil className="w-5 h-5" />, label: 'Edit', action: () => onEdit(targetMsg), color: '#94A3B8' }] : []),
    {
      icon: <Trash2 className="w-5 h-5" />,
      label: isOwn ? 'Unsend' : 'Delete for me',
      action: () => onDelete(targetId, isOwn),
      color: '#EF4444',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        id="chat-message-action-menu"
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed z-40 max-h-[74svh] md:max-h-[74vh] rounded-2xl p-0 border border-white/10 overflow-hidden shadow-2xl"
        style={{ 
          background: 'rgba(15, 23, 42, 0.98)', 
          backdropFilter: 'blur(14px)',
          left: menuPos.left, 
          top,
          width: menuWidth,
          maxWidth: 'calc(100vw - 24px)',
          transformOrigin: isOwn ? 'top right' : 'top left',
          willChange: 'transform, opacity',
        }}
      >
        <div className="flex items-center justify-between gap-1 px-2 py-2" style={{ borderBottom: '1px solid #334155' }}>
          <div className="flex items-center gap-0.5">
            {QUICK_REACTIONS.map((emoji, index) => (
              <motion.button 
                key={emoji} 
                initial={{ opacity: 0, scale: 0, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 500 }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="text-[22px] leading-none p-2.5 rounded-xl hover:bg-white/10 transition-colors relative"
                onClick={() => { 
                  if (navigator.vibrate) navigator.vibrate(20);
                  onReact(targetId, emoji);
                  onClose();
                }}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button 
              className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20 text-primary text-base font-semibold hover:bg-primary/30 transition-colors"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(20);
                onEmojiPanel();
                onClose();
              }}
            >
              +
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors" onClick={onClose}>
              <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
            </button>
          </div>
        </div>
        
        <div className="py-1 max-h-[52vh] overflow-y-auto">
          {actions.map((item, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => { 
                if (navigator.vibrate) navigator.vibrate(15);
                item.action(); 
                onClose(); 
              }}
              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3.5 px-4 py-3 transition-colors"
            >
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="text-[14px] font-medium" style={{ color: item.color }}>{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
