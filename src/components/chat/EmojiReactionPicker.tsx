import { useState } from 'react';
import { cn } from '@/lib/utils';

// Top 5 reaction emojis - most commonly used
const TOP_REACTIONS = [
  '🙏', // Namaste - Purposeful greeting
  '😂', // Haha - Laughing face with texture  
  '❤️', // Love - Heart with texture
  '😮', // Wow - Surprised face with texture
  '😢', // Sad - Crying face with texture
];

// All available reactions for "more" option
const ALL_REACTIONS = [
  '🙏', // Namaste - Purposeful greeting
  '😂', // Haha - Laughing face with texture  
  '❤️', // Love - Heart with texture
  '😮', // Wow - Surprised face with texture
  '😢', // Sad - Crying face with texture
  '😡', // Angry - Angry face with texture
  '👍', // Like - Thumbs up with texture
  '😄', // Happy - Wide smile with texture
  '💜', // Purple heart - Support/Love
  '😕', // Confused - Thinking face
  '🔥', // Fire - Hot/Amazing
  '😎', // Cool - Sunglasses face
  '🎉', // Celebrate - Party popper
  '👏', // Clap - Applause
  '🤝', // Handshake - Agreement
  '💯', // 100 - Perfect/Agree
  '👎', // Disappearing message - Self-destruct
  '🕐', // Disappearing message - Rabbit
  '👻', // Disappearing message - Ghost
  '💨', // Disappearing message - Poof/Dissolve
];

// Helper function to get emoji title for tooltip
const getEmojiTitle = (emoji: string): string => {
  const titles: Record<string, string> = {
    '🙏': 'Namaste',
    '😂': 'Haha',
    '❤️': 'Love',
    '😮': 'Wow',
    '😢': 'Sad',
    '😡': 'Angry',
    '👍': 'Like',
    '': 'Happy',
    '💜': 'Support',
    '😕': 'Confused',
    '🔥': 'Fire',
    '😎': 'Cool',
    '🎉': 'Celebrate',
    '👏': 'Clap',
    '🤝': 'Agree',
    '💯': '100',
    '👎': 'Disappearing',
    '🕐': 'Rabbit',
    '👻': 'Ghost',
    '💨': 'Poof'
  };
  return titles[emoji] || emoji;
};

// Helper function to get recent emojis from localStorage
const getRecentEmojis = (): string[] => {
  try {
    const recent = localStorage.getItem('recent_emojis');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

interface EmojiReactionPickerProps {
  reactions: Record<string, number>;
  onReact: (emoji: string) => void;
  isOwn: boolean;
}

export function EmojiReactionPicker({ reactions, onReact, isOwn }: EmojiReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);

  const totalReactions = Object.values(reactions).reduce((sum, c) => sum + c, 0);
  const topReactions = Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="relative">
      {/* Reaction display */}
      {totalReactions > 0 && (
        <div className={cn(
          "absolute -bottom-3 flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm",
          isOwn ? "right-1" : "left-1"
        )}>
          {topReactions.map(([emoji, count]) => (
            <span key={emoji} className="text-[11px]">{emoji}</span>
          ))}
          {totalReactions > 1 && (
            <span className="text-[9px] text-muted-foreground font-medium ml-0.5">{totalReactions}</span>
          )}
        </div>
      )}

      {/* Reaction trigger - double tap / long press area */}
      <button
        className="absolute inset-0 z-10"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onReact('❤️');
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowPicker(true);
        }}
        onClick={(e) => {
          if (showPicker) {
            e.stopPropagation();
            setShowPicker(false);
          }
        }}
      />

      {/* Picker popup */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className={cn(
            "absolute z-50 -top-14 bg-card border border-border rounded-2xl p-3 shadow-xl animate-in zoom-in-95 duration-150 w-80 max-h-96 overflow-y-auto",
            isOwn ? "right-0" : "left-0"
          )}>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {TOP_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95 p-2 rounded-lg hover:bg-muted/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Store emoji in recent emojis
                    try {
                      const recentEmojis = getRecentEmojis();
                      const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
                      localStorage.setItem('recent_emojis', JSON.stringify(updatedRecent));
                    } catch (error) {
                      console.log('Could not store recent emoji:', error);
                    }
                    onReact(emoji);
                    setShowPicker(false);
                  }}
                  title={getEmojiTitle(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            {/* Custom emoji section */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Add custom emoji</span>
                <button 
                  className="text-xs bg-violet-500 text-white px-2 py-1 rounded hover:bg-violet-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open emoji keyboard or system emoji picker
                    try {
                      if ('virtualKeyboard' in navigator) {
                        (navigator as any).virtualKeyboard.show();
                      } else {
                        // Fallback: try to open emoji picker on mobile
                        const input = document.createElement('input');
                        input.setAttribute('type', 'text');
                        input.setAttribute('inputmode', 'emoji');
                        input.focus();
                      }
                    } catch (error) {
                      console.log('Could not open emoji keyboard:', error);
                    }
                    setShowPicker(false);
                  }}
                >
                  🎹 Keyboard
                </button>
              </div>
              
              {/* Recent emojis section */}
              <div className="grid grid-cols-8 gap-1">
                {getRecentEmojis().map((emoji) => (
                  <button
                    key={emoji}
                    className="text-lg hover:scale-110 transition-transform active:scale-95 p-1 rounded hover:bg-muted/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReact(emoji);
                      setShowPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {/* All reactions section */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">All reactions</span>
                  <button 
                    className="text-xs bg-violet-500 text-white px-2 py-1 rounded hover:bg-violet-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle between showing top reactions and all reactions
                      setShowAllReactions(!showAllReactions);
                    }}
                  >
                    {showAllReactions ? 'Show less' : 'Show more'}
                  </button>
                </div>
                
                <div className="grid grid-cols-6 gap-1">
                  {(showAllReactions ? ALL_REACTIONS : TOP_REACTIONS).map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg hover:scale-110 transition-transform active:scale-95 p-1 rounded hover:bg-muted/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Store emoji in recent emojis
                        try {
                          const recentEmojis = getRecentEmojis();
                          const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
                          localStorage.setItem('recent_emojis', JSON.stringify(updatedRecent));
                        } catch (error) {
                          console.log('Could not store recent emoji:', error);
                        }
                        onReact(emoji);
                        setShowPicker(false);
                      }}
                      title={getEmojiTitle(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
