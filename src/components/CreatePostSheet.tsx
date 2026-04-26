import { useState, useEffect } from 'react';
import { StoryCreatorV3 } from '@/components/stories/StoryCreatorV3';
import { AddStorySheetV3 } from '@/components/stories/AddStorySheetV3';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export type QuickCreateType = 'post' | 'story' | 'diary' | 'reel' | 'thought' | 'drawing' | 'marketplace';

interface CreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREATE_TYPES: {
  type: QuickCreateType;
  emoji: string;
  label: string;
  hint: string;
  iconBg: string;
}[] = [
  {
    type: 'post',
    emoji: '📝',
    label: 'Post',
    hint: 'Photo · Video · Text',
    iconBg: 'linear-gradient(135deg, hsl(263 84% 58%), hsl(239 84% 67%))',
  },
  {
    type: 'story',
    emoji: '🌟',
    label: 'Story',
    hint: '24h · Disappears',
    iconBg: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(24 95% 53%))',
  },
  {
    type: 'marketplace',
    emoji: '🛍️',
    label: 'Marketplace',
    hint: 'Sell · Buy · Rent',
    iconBg: 'linear-gradient(135deg, #10B981, #3B82F6)',
  },
  {
    type: 'diary',
    emoji: '📔',
    label: 'Diary',
    hint: 'Canvas · Private',
    iconBg: 'linear-gradient(135deg, hsl(258 90% 66%), hsl(330 81% 60%))',
  },
  {
    type: 'reel',
    emoji: '🎬',
    label: 'Reel',
    hint: 'Short video',
    iconBg: 'linear-gradient(135deg, hsl(0 84% 60%), hsl(24 95% 53%))',
  },
  {
    type: 'thought',
    emoji: '💭',
    label: 'Thought',
    hint: 'Text only · Quick',
    iconBg: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(258 90% 66%))',
  },
  {
    type: 'drawing',
    emoji: '🎨',
    label: 'Draw Free',
    hint: 'Sketch · Paint',
    iconBg: 'linear-gradient(135deg, hsl(330 81% 60%), hsl(263 84% 58%))',
  },
];

export function CreatePostSheet({ open, onOpenChange }: CreatePostSheetProps) {
  const navigate = useNavigate();
  const [storyHubOpen, setStoryHubOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyCreatorMode, setStoryCreatorMode] = useState<'media' | 'text' | 'voice' | 'dang'>('media');
  const [storyCreatorStream, setStoryCreatorStream] = useState<MediaStream | undefined>(undefined);
  const [storyCreatorFile, setStoryCreatorFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setStoryCreatorOpen(false);
    setStoryHubOpen(false);
  }, [open]);

  const handleSelectType = (type: QuickCreateType) => {
    onOpenChange(false);

    if (type === 'story') {
      setStoryHubOpen(true);
      return;
    }

    if (type === 'diary') {
      navigate('/diary');
      return;
    }

    if (type === 'marketplace') {
      navigate('/marketplace?create=true');
      return;
    }

    navigate('/create', { state: { contentType: type } });
  };

  const handleStoryHubSelect = (mode: 'media' | 'text' | 'voice' | 'dang', stream?: MediaStream, file?: File) => {
    setStoryHubOpen(false);
    setStoryCreatorMode(mode);
    setStoryCreatorStream(stream);
    setStoryCreatorFile(file || null);
    setStoryCreatorOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 border-0 overflow-hidden flex flex-col max-h-[85vh]"
          style={{
            background: 'var(--bg-card)',
            borderRadius: '28px 28px 0 0',
            borderTop: '1px solid var(--border-c)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
          }}
        >
          <SheetTitle className="sr-only">Create</SheetTitle>

          <div className="w-[40px] h-1 rounded-full mx-auto mt-3" style={{ background: 'var(--border-c)' }} />

          <div className="px-4 pt-2 pb-2 flex-shrink-0">
            <div className="relative flex items-center justify-center">
              <h2
                className="text-center"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--text-1)',
                }}
              >
                Create
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 px-4 pb-8 max-h-[calc(100vh-280px)] overflow-y-auto">
            {CREATE_TYPES.map((item, i) => (
              <motion.button
                key={item.type}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3, type: 'spring', stiffness: 300 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  // Ripple effect
                  const button = e.currentTarget;
                  const rect = button.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const ripple = document.createElement('span');
                  ripple.style.cssText = `
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: rgba(255,255,255,0.4);
                    border-radius: 50%;
                    transform: translate(-50%, -50%) scale(0);
                    animation: ripple 0.6s ease-out;
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                  `;
                  button.style.position = 'relative';
                  button.style.overflow = 'hidden';
                  button.appendChild(ripple);
                  setTimeout(() => ripple.remove(), 600);
                  handleSelectType(item.type);
                }}
                className="flex flex-col items-center gap-2 rounded-[16px] px-2 py-3 transition-all hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] group"
                style={{
                  border: '1px solid var(--border-c)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                  style={{ background: item.iconBg }}
                >
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                </div>

                <p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--text-1)',
                  }}
                >
                  {item.label}
                </p>

                <p
                  className="text-center"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    color: 'var(--text-3)',
                    lineHeight: 1.2,
                  }}
                >
                  {item.hint}
                </p>
              </motion.button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AddStorySheetV3
        open={storyHubOpen}
        onClose={() => setStoryHubOpen(false)}
        onSelectAction={handleStoryHubSelect}
      />

      <StoryCreatorV3
        open={storyCreatorOpen}
        initialMode={storyCreatorMode}
        initialStream={storyCreatorStream}
        initialFile={storyCreatorFile}
        onClose={() => {
          setStoryCreatorOpen(false);
          setStoryCreatorStream(undefined);
          setStoryCreatorFile(null);
        }}
      />
    </>
  );
}
