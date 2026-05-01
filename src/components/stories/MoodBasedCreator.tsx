import { useState, useRef, useCallback } from 'react';
import { 
  X, Camera, Type, Sparkles, Pencil, StickyNote,
  ChevronRight, Users, Lock, Globe, Heart, Image as ImageIcon,
  Wand2, Palette, Zap, Smile, Music, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { SmartDrawCanvas } from '@/components/chat/SmartDrawCanvas';

// ============ TYPES ============
export type StoryType = 'image' | 'draw' | 'text' | 'note' | 'voice';
export type MoodType = 'calm' | 'energetic' | 'creative' | 'happy' | 'reflective' | 'romantic';
export type AudienceType = 'public' | 'close' | 'private';

export interface MoodBasedCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreateStory: (data: StoryData) => void;
}

export interface StoryData {
  type: StoryType;
  mood: MoodType;
  audience: AudienceType;
  content: string;
  mediaUrl?: string;
  mediaFile?: File;
  drawingBlob?: Blob;
  duration?: number; // Duration in seconds (min 15)
}

// ============ MOOD CONFIGURATION ============
const MOODS: Record<MoodType, {
  label: string;
  emoji: string;
  gradient: string;
  accentColor: string;
  bgOverlay: string;
  description: string;
}> = {
  calm: {
    label: 'Calm',
    emoji: '😌',
    gradient: 'from-blue-400 via-cyan-400 to-teal-400',
    accentColor: '#3b82f6',
    bgOverlay: 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-cyan-950/90',
    description: 'Soft, peaceful blues',
  },
  energetic: {
    label: 'Energetic',
    emoji: '⚡',
    gradient: 'from-orange-400 via-amber-400 to-yellow-400',
    accentColor: '#f97316',
    bgOverlay: 'bg-gradient-to-br from-orange-950/90 via-red-950 to-amber-950/90',
    description: 'Vibrant orange vibes',
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    gradient: 'from-purple-400 via-fuchsia-400 to-pink-400',
    accentColor: '#a855f7',
    bgOverlay: 'bg-gradient-to-br from-purple-950/90 via-fuchsia-950 to-pink-950/90',
    description: 'Bold purple energy',
  },
  happy: {
    label: 'Happy',
    emoji: '🌞',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    accentColor: '#eab308',
    bgOverlay: 'bg-gradient-to-br from-yellow-900/90 via-amber-950 to-orange-900/90',
    description: 'Warm sunshine tones',
  },
  reflective: {
    label: 'Reflective',
    emoji: '🌙',
    gradient: 'from-slate-400 via-zinc-400 to-neutral-400',
    accentColor: '#64748b',
    bgOverlay: 'bg-gradient-to-br from-slate-950/90 via-zinc-950 to-neutral-950/90',
    description: 'Dark minimal tones',
  },
  romantic: {
    label: 'Romantic',
    emoji: '💕',
    gradient: 'from-rose-400 via-pink-400 to-purple-400',
    accentColor: '#f43f5e',
    bgOverlay: 'bg-gradient-to-br from-rose-950/90 via-pink-950 to-purple-950/90',
    description: 'Soft pink dreams',
  },
};

// ============ STORY TYPES ============
const STORY_TYPES: Array<{
  id: StoryType;
  label: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;
}> = [
  { 
    id: 'image', 
    label: 'Camera', 
    desc: 'Photo or video',
    icon: Camera,
    gradient: 'from-purple-500/20 to-indigo-500/20'
  },
  { 
    id: 'draw', 
    label: 'Draw', 
    desc: 'Sketch & paint',
    icon: Pencil,
    gradient: 'from-pink-500/20 to-rose-500/20'
  },
  { 
    id: 'text', 
    label: 'Text', 
    desc: 'Write your mood',
    icon: Type,
    gradient: 'from-blue-500/20 to-cyan-500/20'
  },
  { 
    id: 'note', 
    label: 'Note', 
    desc: 'Quick thought',
    icon: StickyNote,
    gradient: 'from-amber-500/20 to-yellow-500/20'
  },
];

// ============ AUDIENCE OPTIONS ============
const AUDIENCES: Array<{
  id: AudienceType;
  label: string;
  desc: string;
  icon: React.ElementType;
}> = [
  { id: 'private', label: 'For Me', desc: 'Private diary', icon: Lock },
  { id: 'close', label: 'Close Circle', desc: 'Best friends only', icon: Heart },
  { id: 'public', label: 'Public', desc: 'All followers', icon: Globe },
];

// ============ MAIN COMPONENT ============
export function MoodBasedCreator({ open, onClose, onCreateStory }: MoodBasedCreatorProps) {
  const [step, setStep] = useState<'mood' | 'type' | 'edit' | 'audience'>('mood');
  const [selectedMood, setSelectedMood] = useState<MoodType>('creative');
  const [selectedType, setSelectedType] = useState<StoryType | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('public');
  const [content, setContent] = useState('');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [drawingBlob, setDrawingBlob] = useState<Blob | null>(null);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [duration, setDuration] = useState<number>(15); // Default 15 seconds minimum
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moodConfig = MOODS[selectedMood];

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    setTimeout(() => setStep('type'), 300);
  };

  const handleTypeSelect = (type: StoryType) => {
    setSelectedType(type);
    
    if (type === 'image') {
      fileInputRef.current?.click();
    } else if (type === 'draw') {
      // Navigate to draw canvas
      setStep('edit');
    } else {
      setStep('edit');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCapturedMedia(url);
      setCapturedFile(file);
      setStep('edit');
    }
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    
    onCreateStory({
      type: selectedType,
      mood: selectedMood,
      audience: selectedAudience,
      content,
      mediaUrl: capturedMedia || undefined,
      mediaFile: capturedFile || undefined,
      drawingBlob: drawingBlob || undefined,
      duration: Math.max(15, duration), // Ensure minimum 15 seconds
    });
    
    resetState();
    onClose();
  };

  const resetState = () => {
    setStep('mood');
    setSelectedMood('creative');
    setSelectedType(null);
    setSelectedAudience('public');
    setContent('');
    setCapturedMedia(null);
    setCapturedFile(null);
    setDrawingBlob(null);
    setShowDrawCanvas(false);
    setDuration(15);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={cn(
          "absolute inset-0 backdrop-blur-xl transition-colors duration-500",
          moodConfig.bgOverlay
        )}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col">
        {/* Header - compact sizing */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between px-4 py-2"
        >
          <button
            onClick={step === 'mood' ? onClose : () => setStep('mood')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            {step !== 'mood' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10">
                <span className="text-lg">{moodConfig.emoji}</span>
                <span className="text-xs text-white/80 font-medium">{moodConfig.label}</span>
              </div>
            )}
          </div>

          {step === 'edit' && (
            <button
              onClick={() => setStep('audience')}
              className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold"
            >
              Next
            </button>
          )}
          
          {step === 'audience' && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold"
            >
              Share
            </button>
          )}
        </motion.div>

        {/* Step Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* STEP 1: MOOD SELECTION */}
            {step === 'mood' && (
              <motion.div
                key="mood"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col px-6 py-4"
              >
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    What are you feeling?
                  </h2>
                  <p className="text-white/50 text-sm">
                    Your mood shapes the experience
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(MOODS) as MoodType[]).map((moodKey) => {
                    const mood = MOODS[moodKey];
                    const isSelected = selectedMood === moodKey;
                    
                    return (
                      <motion.button
                        key={moodKey}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMoodSelect(moodKey)}
                        className={cn(
                          "relative p-4 rounded-xl text-left transition-all duration-300",
                          "border border-white/10 hover:border-white/20",
                          isSelected 
                            ? "bg-white/10 ring-2 ring-white/30" 
                            : "bg-white/5"
                        )}
                      >
                        {/* Gradient Background */}
                        <div className={cn(
                          "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
                          "bg-gradient-to-br",
                          mood.gradient,
                          isSelected && "opacity-20"
                        )} />
                        
                        <div className="relative">
                          <span className="text-3xl mb-2 block">{mood.emoji}</span>
                          <h3 className="text-base font-semibold text-white mb-0.5">
                            {mood.label}
                          </h3>
                          <p className="text-xs text-white/50">
                            {mood.description}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: TYPE SELECTION */}
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col px-6 py-4"
              >
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    How do you want to express?
                  </h2>
                  <p className="text-white/50 text-sm">
                    Choose your medium
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {STORY_TYPES.map((type) => (
                    <motion.button
                      key={type.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTypeSelect(type.id)}
                      className={cn(
                        "relative p-4 rounded-xl text-left transition-all",
                        "border border-white/10 hover:border-white/20 bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "absolute inset-0 rounded-xl opacity-30",
                        "bg-gradient-to-br",
                        type.gradient
                      )} />
                      
                      <div className="relative">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-2">
                          <type.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-base font-semibold text-white mb-0.5">
                          {type.label}
                        </h3>
                        <p className="text-xs text-white/50">
                          {type.desc}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </motion.div>
            )}

            {/* STEP 3: EDIT */}
            {step === 'edit' && (
              <motion.div
                key="edit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col"
              >
                {/* Preview Area */}
                <div className="flex-1 px-6 py-4">
                  <div 
                    className="w-full h-full rounded-3xl overflow-hidden relative"
                    style={{ background: moodConfig.accentColor + '20' }}
                  >
                    {capturedMedia ? (
                      <img
                        src={capturedMedia}
                        alt="Story"
                        className="w-full h-full object-cover"
                      />
                    ) : selectedType === 'draw' && drawingBlob ? (
                      <img
                        src={capturedMedia || ''}
                        alt="Drawing"
                        className="w-full h-full object-contain bg-black/30"
                      />
                    ) : selectedType === 'text' || selectedType === 'note' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder={selectedType === 'text' ? "What's on your mind?" : "Quick note..."}
                          className={cn(
                            "w-full h-full bg-transparent text-center text-2xl font-medium resize-none outline-none",
                            "placeholder:text-white/30"
                          )}
                          style={{ color: moodConfig.accentColor }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
                          {selectedType === 'draw' ? (
                            <button
                              onClick={() => setShowDrawCanvas(true)}
                              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold"
                            >
                              Open Draw Canvas
                            </button>
                          ) : (
                            <p className="text-white/40">Ready to create</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Floating Tools */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-3">
                      <FloatingTool icon={Palette} label="Style" />
                      <FloatingTool icon={Wand2} label="Effects" />
                      <FloatingTool icon={Sparkles} label="AI" />
                      <FloatingTool icon={Type} label="Text" />
                    </div>
                  </div>
                </div>

                {/* Duration Selector */}
                <div className="px-6 py-3">
                  <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Story Duration</p>
                        <p className="text-xs text-white/50">Minimum 15 seconds</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDuration(Math.max(15, duration - 5))}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        disabled={duration <= 15}
                      >
                        -
                      </button>
                      <span className="text-lg font-semibold text-white w-12 text-center">{duration}s</span>
                      <button
                        onClick={() => setDuration(Math.min(60, duration + 5))}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        disabled={duration >= 60}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: AUDIENCE */}
            {step === 'audience' && (
              <motion.div
                key="audience"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-full flex flex-col px-6 py-8"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Who can see this?
                  </h2>
                  <p className="text-white/50">
                    Choose your audience
                  </p>
                </div>

                <div className="space-y-3">
                  {AUDIENCES.map((audience) => (
                    <motion.button
                      key={audience.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedAudience(audience.id)}
                      className={cn(
                        "w-full p-4 rounded-2xl flex items-center gap-4 transition-all",
                        selectedAudience === audience.id
                          ? "bg-white text-black"
                          : "bg-white/5 text-white hover:bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        selectedAudience === audience.id
                          ? "bg-black/10"
                          : "bg-white/10"
                      )}>
                        <audience.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold">{audience.label}</h3>
                        <p className={cn(
                          "text-sm",
                          selectedAudience === audience.id
                            ? "text-black/60"
                            : "text-white/50"
                        )}>
                          {audience.desc}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-50" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Progress */}
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2">
            {['mood', 'type', 'edit', 'audience'].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  ['mood', 'type', 'edit', 'audience'].indexOf(step) >= i
                    ? "bg-white"
                    : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <DrawCanvasOverlay
        open={showDrawCanvas}
        onClose={() => setShowDrawCanvas(false)}
        onDone={(blob) => {
          const url = URL.createObjectURL(blob);
          setDrawingBlob(blob);
          setCapturedMedia(url);
          setShowDrawCanvas(false);
        }}
      />
    </div>,
    document.body
  );
}

// Draw canvas overlay to create draw-story blobs with the upgraded brush UX.
function DrawCanvasOverlay({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (blob: Blob) => void;
}) {
  if (!open) return null;
  return (
    <SmartDrawCanvas
      onClose={onClose}
      onSubmit={(blob) => {
        onDone(blob);
      }}
      initialMood="creative"
    />
  );
}

// ============ SUB COMPONENTS ============
function FloatingTool({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-1"
    >
      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] text-white/60">{label}</span>
    </motion.button>
  );
}

export default MoodBasedCreator;
