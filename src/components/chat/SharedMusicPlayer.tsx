import { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, X, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Built-in ambient tracks for shared listening
const AMBIENT_TRACKS = [
  { id: '1', title: 'Lo-fi Chill', category: 'chill', url: '' },
  { id: '2', title: 'Rain Sounds', category: 'focus', url: '' },
  { id: '3', title: 'Ocean Waves', category: 'focus', url: '' },
  { id: '4', title: 'Coffee Shop', category: 'chill', url: '' },
  { id: '5', title: 'Forest Birds', category: 'nature', url: '' },
  { id: '6', title: 'Night Crickets', category: 'nature', url: '' },
  { id: '7', title: 'Gentle Piano', category: 'study', url: '' },
  { id: '8', title: 'Soft Guitar', category: 'study', url: '' },
];

type MusicMode = 'off' | 'personal' | 'invite_sent' | 'shared';

interface SharedMusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
}

export function SharedMusicPlayer({ isOpen, onClose, partnerName }: SharedMusicPlayerProps) {
  const [mode, setMode] = useState<MusicMode>('off');
  const [selectedTrack, setSelectedTrack] = useState<typeof AMBIENT_TRACKS[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [category, setCategory] = useState<string>('all');

  const filteredTracks = category === 'all' 
    ? AMBIENT_TRACKS 
    : AMBIENT_TRACKS.filter(t => t.category === category);

  const selectTrack = (track: typeof AMBIENT_TRACKS[0]) => {
    setSelectedTrack(track);
    setIsPlaying(true);
    setMode('personal');
  };

  const inviteToListen = () => {
    if (!selectedTrack) return;
    setMode('invite_sent');
    // In a real app, this would send via realtime
    setTimeout(() => setMode('shared'), 2000); // Simulate acceptance
  };

  const stopMusic = () => {
    setSelectedTrack(null);
    setIsPlaying(false);
    setMode('off');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
            Shared Sound
          </DialogTitle>
          <DialogDescription className="sr-only">Choose ambient tracks and invite your chat partner to listen together.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Mode indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <div className={cn(
              "w-2 h-2 rounded-full",
              mode === 'off' ? 'bg-muted-foreground' :
              mode === 'personal' ? 'bg-green-500' :
              mode === 'invite_sent' ? 'bg-yellow-500 animate-pulse' :
              'bg-primary animate-pulse'
            )} />
            <span className="text-xs text-muted-foreground">
              {mode === 'off' ? 'No music playing' :
               mode === 'personal' ? 'Listening privately' :
               mode === 'invite_sent' ? `Waiting for ${partnerName}...` :
               `Listening with ${partnerName}`}
            </span>
          </div>

          {/* Now Playing */}
          {selectedTrack && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{selectedTrack.title}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{selectedTrack.category}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={stopMusic}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {selectedTrack && mode === 'personal' && (
            <Button size="sm" className="w-full text-xs h-8" onClick={inviteToListen}>
              <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              Invite {partnerName} to Listen Together
            </Button>
          )}

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto">
            {['all', 'chill', 'focus', 'nature', 'study'].map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={category === cat ? 'default' : 'outline'}
                className="h-6 text-[10px] px-2.5 rounded-full capitalize shrink-0"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Track list */}
          <ScrollArea className="max-h-48">
            <div className="space-y-1">
              {filteredTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors text-left",
                    selectedTrack?.id === track.id ? "bg-primary/15 text-primary" : "hover:bg-muted/50"
                  )}
                >
                  <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                    {selectedTrack?.id === track.id && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 bg-primary rounded-full animate-pulse h-1.5" />
                        <div className="w-0.5 bg-primary rounded-full animate-pulse h-3" style={{ animationDelay: '0.15s' }} />
                        <div className="w-0.5 bg-primary rounded-full animate-pulse h-2" style={{ animationDelay: '0.3s' }} />
                      </div>
                    ) : (
                      <Play className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{track.title}</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{track.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Shared mode waveform animation */}
          {mode === 'shared' && (
            <div className="flex items-center justify-center gap-1 py-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary/60 rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.4 + Math.random() * 0.4}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact bar shown in chat header when music is active
export function MusicBar({ trackName, isShared, partnerName, onTap }: { 
  trackName: string; isShared: boolean; partnerName: string; onTap: () => void 
}) {
  return (
    <button 
      onClick={onTap}
      className="w-full flex items-center gap-2 px-3 py-1.5 bg-primary/5 border-b border-border/30 hover:bg-primary/10 transition-colors"
    >
      <div className="flex gap-0.5 items-end h-3">
        <div className="w-0.5 bg-primary rounded-full animate-pulse h-1.5" />
        <div className="w-0.5 bg-primary rounded-full animate-pulse h-3" style={{ animationDelay: '0.15s' }} />
        <div className="w-0.5 bg-primary rounded-full animate-pulse h-2" style={{ animationDelay: '0.3s' }} />
      </div>
      <span className="text-[10px] font-medium text-primary truncate flex-1 text-left">{trackName}</span>
      {isShared && (
        <span className="text-[9px] text-muted-foreground shrink-0">with {partnerName}</span>
      )}
    </button>
  );
}
