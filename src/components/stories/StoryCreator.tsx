import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Type, Loader2, Send, 
  Music, Smile, Sticker, Pencil, Sparkles,
  ChevronLeft, Trash2, Globe, Users, Lock,
  Sun, CloudRain, Zap, Wind, Heart, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { uploadStoryMediaWithFallback } from '@/lib/storyStorage';

interface StoryCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialMode?: 'media' | 'text' | 'voice' | 'mood';
}

const BG_COLORS = [
  'linear-gradient(135deg, #7C3AED, #3B82F6)',
  'linear-gradient(135deg, #EC4899, #F43F5E)',
  'linear-gradient(135deg, #10B981, #14B8A6)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
  'linear-gradient(135deg, #1D4ED8, #0891B2)',
  'linear-gradient(135deg, #8B5CF6, #EC4899)',
  '#0a0f1e',
  '#1e293b',
];

const MOODS = [
  { id: 'happy',     icon: Sun,       label: 'Happy',     grad: 'from-amber-400 to-orange-600',   emoji: '☀️', text: 'Radiating positivity' },
  { id: 'sad',       icon: CloudRain, label: 'Sad',       grad: 'from-blue-600 to-indigo-900',   emoji: '🌧️', text: 'In my feelings' },
  { id: 'energetic', icon: Zap,       label: 'Energy',    grad: 'from-red-500 to-yellow-500',   emoji: '⚡', text: 'Main character energy' },
  { id: 'calm',      icon: Wind,      label: 'Calm',      grad: 'from-emerald-400 to-teal-700',  emoji: '🍃', text: 'Finding my peace' },
  { id: 'romantic',  icon: Heart,     label: 'Romantic',  grad: 'from-pink-500 to-rose-700',    emoji: '❤️', text: 'Love is in the air' },
];

export function StoryCreator({ open, onClose, onCreated, initialMode = 'media' }: StoryCreatorProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'choose' | 'text' | 'media' | 'mood' | 'mood_choice'>(
    initialMode === 'text' ? 'text' : initialMode === 'mood' ? 'mood' : 'choose'
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState(BG_COLORS[0]);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [publishing, setPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mood Specific State
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [moodIntensity, setMoodIntensity] = useState(5);

  useEffect(() => {
    if (open && initialMode === 'media' && mode === 'choose') {
      fileInputRef.current?.click();
    }
  }, [open, initialMode]);

  const moodSuggestions = useMemo(() => {
    const s = {
      happy: ["Living my best life!", "Today was a 10/10", "Sun kissed and blessed"],
      sad: ["It's okay not to be okay", "Rainy days and introspection", "Healing takes time"],
      energetic: ["Leveling up!", "No limits, only goals", "Chasing dreams"],
      calm: ["Nature heals", "Just breathe", "Inner peace found"],
      romantic: ["Heart full", "Thinking of you", "Magic in the little things"]
    };
    return s[selectedMood.id as keyof typeof s] || s.happy;
  }, [selectedMood]);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      if (mode === 'choose') handleClose();
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setMode('media');
  };

  const handlePublish = async () => {
    if (!user) return;
    setPublishing(true);

    try {
      let mediaUrl = '';
      let mediaType = 'image';

      if (mode === 'media' && file) {
        const uploaded = await uploadStoryMediaWithFallback({
          userId: user.id,
          data: file,
          fileName: file.name,
          contentType: file.type,
        });
        mediaUrl = uploaded.publicUrl;
        mediaType = file.type.startsWith('video') ? 'video' : 'image';
      } else if (mode === 'text' || mode === 'mood_choice') {
        const storyData = mode === 'text' 
          ? JSON.stringify({ text: textContent, bg: textBg })
          : JSON.stringify({ 
              text: textContent, 
              mood: selectedMood.id, 
              intensity: moodIntensity,
              grad: `bg-gradient-to-br ${selectedMood.grad}`,
              emoji: selectedMood.emoji
            });
            
        mediaUrl = `data:text/story;base64,${btoa(unescape(encodeURIComponent(storyData)))}`;
        mediaType = mode === 'text' ? 'text' : 'mood';
      }

      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: (mode === 'media' || mode === 'mood_choice') ? (caption.trim() || null) : null,
        visibility,
        expires_at: expiresAt,
      });
      if (error) throw error;

      toast.success('Story added! ✨');
      onCreated?.();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to post story');
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setMode(initialMode === 'text' ? 'text' : initialMode === 'mood' ? 'mood' : 'choose');
    setFile(null);
    setPreviewUrl(null);
    setCaption('');
    setTextContent('');
    setVisibility('public');
    setPublishing(false);
    setShowSettings(false);
    onClose();
  };

  const handleMoodSelect = (mood: any) => {
    setSelectedMood(mood);
  };

  const handleGoToMoodChoice = () => {
    setTextContent(moodSuggestions[0]);
    setMode('mood_choice');
  };

  const canPublish = mode === 'media' ? !!file : (mode === 'text' || mode === 'mood_choice') ? textContent.trim().length > 0 : false;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="fixed inset-0 z-[10001] flex flex-col overflow-hidden"
      style={{ background: '#000' }}
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {mode === 'media' && previewUrl ? (
          <div className="w-full h-full relative">
            {file?.type.startsWith('video') ? (
              <video src={previewUrl} className="w-full h-full object-contain" autoPlay muted loop playsInline />
            ) : (
              <img src={previewUrl} alt="" className="w-full h-full object-contain" />
            )}
          </div>
        ) : mode === 'text' ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: textBg }} />
        ) : mode === 'mood' ? (
          <div className={cn("w-full h-full transition-all duration-700 bg-gradient-to-br opacity-50", selectedMood.grad)} />
        ) : mode === 'mood_choice' ? (
          <div className={cn("w-full h-full transition-all duration-700 bg-gradient-to-br", selectedMood.grad)}>
             {/* Particle Effect Emulation */}
             <div className="absolute inset-0 overflow-hidden opacity-30">
               {Array.from({ length: Math.floor(moodIntensity * 2) }).map((_, i) => (
                 <motion.span 
                   key={i}
                   animate={{ 
                     y: [-20, 1000],
                     x: [Math.random() * 400, Math.random() * 400],
                     opacity: [0, 1, 0]
                   }}
                   transition={{ 
                     duration: 5 + Math.random() * 5, 
                     repeat: Infinity, 
                     ease: "linear",
                     delay: Math.random() * 5
                   }}
                   className="absolute text-2xl"
                   style={{ left: `${Math.random() * 100}%`, top: '-50px' }}
                 >
                   {selectedMood.emoji}
                 </motion.span>
               ))}
             </div>
          </div>
        ) : null}
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-20 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/40 to-transparent">
        <button 
          onClick={handleClose} 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md border border-white/10 text-white"
        >
          {mode === 'mood_choice' ? <ChevronLeft onClick={() => setMode('mood')} /> : <X />}
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="px-4 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Globe size={14} className="text-primary" /> {visibility}
          </button>
          
          <button
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            className="px-6 h-10 rounded-full bg-gradient-to-r from-primary to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl disabled:opacity-50 transition-all active:scale-95"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={14} />}
            Post
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="relative flex-1 z-10 flex flex-col items-center justify-center px-6">
        
        {/* MOOD SELECTION (STEP 1) */}
        {mode === 'mood' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-12"
          >
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">How's the vibe?</h2>
              <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Select your energy</p>
            </div>

            <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl p-4 rounded-[32px] border border-white/10">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMoodSelect(m)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                    selectedMood.id === m.id ? `bg-gradient-to-br ${m.grad} scale-125 shadow-lg` : "text-white/40 hover:text-white"
                  )}
                >
                  <m.icon size={24} strokeWidth={selectedMood.id === m.id ? 2.5 : 1.5} />
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Intensity</span>
                <span className={cn("text-sm font-black uppercase tracking-widest", selectedMood.id === 'happy' ? 'text-amber-400' : 'text-primary')}>
                  {moodIntensity === 10 ? 'MAX' : moodIntensity}
                </span>
              </div>
              <Slider 
                min={1} 
                max={10} 
                step={1}
                value={[moodIntensity]}
                onValueChange={(vals) => setMoodIntensity(vals[0])}
                className="py-4"
              />
            </div>

            <button
              onClick={handleGoToMoodChoice}
              className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              Continue <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {/* MOOD CHOICE (STEP 2) */}
        {mode === 'mood_choice' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="text-center space-y-2 mb-12">
              <span className="text-8xl">{selectedMood.emoji}</span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedMood.label} Energy</h2>
            </div>

            <div className="space-y-3">
              {moodSuggestions.map((text, i) => (
                <button
                  key={i}
                  onClick={() => setTextContent(text)}
                  className={cn(
                    "w-full p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group",
                    textContent === text 
                      ? "bg-white text-black border-white" 
                      : "bg-black/20 text-white/70 border-white/10 hover:border-white/30"
                  )}
                >
                  <span className="text-sm font-black uppercase tracking-wide relative z-10">{text}</span>
                  {textContent === text && (
                     <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <Sparkles size={16} />
                     </div>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-8">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a personal note..."
                className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-center text-sm outline-none placeholder:text-white/40 resize-none"
                rows={2}
              />
            </div>
          </motion.div>
        )}

        {/* TEXT MODE */}
        {mode === 'text' && (
          <div className="w-full max-w-sm text-center">
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full bg-transparent border-0 outline-none resize-none text-white text-center text-4xl font-black placeholder:text-white/20 font-['Space_Grotesk']"
              rows={4}
            />
          </div>
        )}

        {/* MEDIA MODE */}
        {mode === 'media' && (
          <div className="absolute bottom-32 left-0 right-0 px-6">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-white text-center text-sm outline-none placeholder:text-white/30 shadow-2xl"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* BOTTOM TOOLS */}
      <AnimatePresence>
        {mode === 'text' && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 px-6 overflow-x-auto no-scrollbar"
          >
            {BG_COLORS.map((bg, i) => (
              <button
                key={i}
                onClick={() => setTextBg(bg)}
                className={cn(
                  "w-10 h-10 rounded-full shrink-0 border-2 transition-all",
                  textBg === bg ? "border-white scale-110 shadow-lg shadow-white/20" : "border-white/10"
                )}
                style={{ background: bg }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-[#050814] rounded-t-[32px] border-t border-white/10 p-6 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Visibility Settings</h3>
              <div className="space-y-2 mb-8">
                {[
                  { id: 'public', label: 'Public', desc: 'Seen by everyone', icon: Globe },
                  { id: 'friends', label: 'Followers', desc: 'Only your followers', icon: Users },
                  { id: 'private', label: 'Private', desc: 'Only you can see it', icon: Lock }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setVisibility(item.id as any); setShowSettings(false); }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all border",
                      visibility === item.id ? "bg-primary/10 border-primary/20" : "bg-white/[0.03] border-white/5"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", visibility === item.id ? "bg-primary text-white" : "bg-white/10 text-gray-500")}>
                      <item.icon size={18} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-black text-white uppercase tracking-tight">{item.label}</p>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{item.desc}</p>
                    </div>
                    {visibility === item.id && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#7C3AED]" />}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleClose}
                className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Discard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </motion.div>,
    document.body
  );
}
