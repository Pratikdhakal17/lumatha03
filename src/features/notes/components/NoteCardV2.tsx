import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Pin, Archive, Trash2, MoreVertical, Image as ImageIcon,
  Clock, Type, Palette
} from 'lucide-react';
import { LumaNote } from '../types';
import { cn } from '@/lib/utils';

interface NoteCardV2Props {
  note: LumaNote;
  onClick: () => void;
  onDelete: () => void;
  onPin: () => void;
  onArchive: () => void;
}

const THEME_COLORS: Record<string, string> = {
  deepNavy: '#070B14',
  purpleMist: '#150C2A',
  warmDark: '#221707',
  pureBlack: '#000000',
  midnightGreen: '#0B1B12',
  roseDark: '#2A0F1A',
  oceanBlue: '#0A132A',
  ember: '#221707',
  forest: '#0B1B12',
  slate: '#F5F3EB',
};

export const NoteCardV2: React.FC<NoteCardV2Props> = ({
  note,
  onClick,
  onDelete,
  onPin,
  onArchive,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const bgColor = THEME_COLORS[note.theme] || THEME_COLORS.deepNavy;
  const isLight = note.theme === 'slate';
  const textColor = isLight ? '#1a2332' : '#E6E9F2';
  const mutedColor = isLight ? '#6B7280' : '#8A90A2';

  // Long press handling for mobile
  const handleTouchStart = useCallback(() => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Right click for desktop
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowActions(true);
  }, []);

  // Format date
  const formatDate = (date: string): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  // Truncate text
  const truncate = (text: string, max: number): string => {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max).trim() + '...';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "relative group rounded-[20px] p-4 cursor-pointer overflow-hidden transition-all duration-200",
        "border border-white/5 hover:border-white/10",
        note.isPinned && "ring-2 ring-primary/30"
      )}
      style={{ backgroundColor: bgColor }}
    >
      {/* Color accent strip */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px]"
        style={{ backgroundColor: note.isPinned ? '#7B61FF' : 'transparent' }}
      />

      {/* Pin indicator */}
      {note.isPinned && (
        <div className="absolute top-3 right-3">
          <Pin className="w-4 h-4 text-primary" />
        </div>
      )}

      {/* Content */}
      <div className="space-y-2 pr-6">
        {/* Title */}
        <h3 
          className="font-bold text-sm leading-tight line-clamp-1"
          style={{ color: textColor }}
        >
          {note.title || 'Untitled'}
        </h3>

        {/* Body preview */}
        <p 
          className="text-xs line-clamp-2 leading-relaxed"
          style={{ color: mutedColor }}
        >
          {note.previewText || 'No content'}
        </p>

        {/* Media thumbnail */}
        {note.firstImageUrl && (
          <div className="relative mt-2 rounded-lg overflow-hidden aspect-video">
            <img 
              src={note.firstImageUrl} 
              alt="Note media" 
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
          <div 
            className="flex items-center gap-1 text-[10px]"
            style={{ color: mutedColor }}
          >
            <Clock className="w-3 h-3" />
            <span>{formatDate(note.updatedAt)}</span>
          </div>

          <div className="flex items-center gap-2">
            {note.wordCount > 0 && (
              <span 
                className="text-[10px] flex items-center gap-1"
                style={{ color: mutedColor }}
              >
                <Type className="w-3 h-3" />
                {note.wordCount}
              </span>
            )}
            {note.firstImageUrl && (
              <ImageIcon className="w-3 h-3" style={{ color: mutedColor }} />
            )}
          </div>
        </div>
      </div>

      {/* Actions Menu */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 z-10 bg-black/90 backdrop-blur-sm rounded-[20px] flex flex-col items-center justify-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onPin(); setShowActions(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
          >
            <Pin className="w-4 h-4" />
            {note.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={() => { onArchive(); setShowActions(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
          >
            <Archive className="w-4 h-4" />
            {note.isArchived ? 'Restore' : 'Archive'}
          </button>
          <button
            onClick={() => { onDelete(); setShowActions(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={() => setShowActions(false)}
            className="text-white/50 text-xs mt-2"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default NoteCardV2;
