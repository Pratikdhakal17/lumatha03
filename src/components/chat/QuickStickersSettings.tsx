/**
 * Quick Stickers Settings Modal
 * Allows users to customize which reactions show in the quick reaction panel
 */

import React, { useState, useEffect } from 'react';
import { X, Heart, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PRESET_STICKERS = ['🙏', '👍', '❤️', '😂', '😢', '😡', '🔥', '😍', '🎉', '🚀', '✨', '💯', '🙌', '👏', '🔔', '⭐', '💬'];

interface QuickStickersSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStickers: string[];
  onSave: (stickers: string[]) => void;
}

export function QuickStickersSettings({
  open,
  onOpenChange,
  currentStickers,
  onSave,
}: QuickStickersSettingsProps) {
  const [selected, setSelected] = useState<string[]>(currentStickers);
  const [customEmoji, setCustomEmoji] = useState('');

  useEffect(() => {
    setSelected(currentStickers);
  }, [currentStickers]);

  const toggleSticker = (emoji: string) => {
    setSelected(prev => {
      if (prev.includes(emoji)) {
        return prev.filter(e => e !== emoji);
      }

      if (prev.length < 6) {
        return [...prev, emoji];
      }

      return prev;
    });
  };

  const promoteSticker = (emoji: string) => {
    setSelected(prev => [emoji, ...prev.filter(e => e !== emoji)]);
  };

  const addCustom = () => {
    if (customEmoji.trim() && selected.length < 6) {
      setSelected(prev => [...prev, customEmoji.trim()]);
      setCustomEmoji('');
    }
  };

  const removeSticker = (emoji: string) => {
    setSelected(prev => prev.filter(e => e !== emoji));
  };

  const handleSave = () => {
    const unique = Array.from(new Set(selected.map((emoji) => emoji.trim()).filter(Boolean)));
    onSave(unique.length > 0 ? unique : ['🙏']);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] border-0 rounded-3xl" style={{ background: '#111827' }}>
        <DialogHeader>
          <DialogTitle className="text-white">Quick Stickers</DialogTitle>
          <DialogDescription className="sr-only">Customize the emoji reactions shown in quick stickers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Stickers */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Selected ({selected.length}/6)
            </label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 min-h-[48px]">
              {selected.length === 0 ? (
                <p className="text-sm text-muted-foreground w-full">
                  Select your quick reactions. The first one becomes the primary tap action.
                </p>
              ) : (
                selected.map((emoji) => (
                  <div key={emoji} className="relative">
                    <button
                      onClick={() => promoteSticker(emoji)}
                      className="relative group rounded-lg px-2 py-1 text-2xl hover:scale-110 transition-transform bg-muted/70"
                      title={emoji === selected[0] ? 'Primary quick reaction' : 'Tap to make primary'}
                    >
                      {emoji}
                      {emoji === selected[0] && (
                        <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                          1
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSticker(emoji)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow"
                      aria-label={`Remove ${emoji}`}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            {selected.length < 6 && (
              <p className="text-xs text-muted-foreground mt-1">
                Tap a selected emoji to make it primary.
              </p>
            )}
          </div>

          {/* Add Custom */}
          {selected.length < 6 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Paste emoji or paste text"
                maxLength={2}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg"
              />
              <button
                onClick={addCustom}
                disabled={!customEmoji.trim()}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Preset Stickers */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Presets
            </label>
            <div className="grid grid-cols-6 gap-2 p-3 rounded-lg bg-muted/30">
              {PRESET_STICKERS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleSticker(emoji)}
                  className={`
                    aspect-square rounded-lg text-xl flex items-center justify-center
                    transition-all duration-200 active:scale-95
                    ${selected.includes(emoji)
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                    }
                    ${selected.length >= 6 && !selected.includes(emoji)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                    }
                  `}
                  disabled={selected.length >= 6 && !selected.includes(emoji)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-200">
              💡 Your first selected quick sticker becomes the primary chat reaction.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
