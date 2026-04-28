import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, Trash2, Volume2, Disc, Waves } from 'lucide-react';
import { MusicBlockData } from '../../types';
import { cn } from '@/lib/utils';

interface MusicBlockProps {
  content: MusicBlockData | string;
  onChange: (data: MusicBlockData) => void;
  onDelete: () => void;
  isFocused?: boolean;
}

export const MusicBlock: React.FC<MusicBlockProps> = ({ content, onChange, onDelete, isFocused }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const data: MusicBlockData = typeof content === 'string'
    ? { url: content, title: 'Unknown Track', isPlaying: false }
    : (content as MusicBlockData) || { url: '', title: 'Unknown Track', isPlaying: false };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...data, url: reader.result as string, title: file.name.split('.')[0] });
    };
    reader.readAsDataURL(file);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  if (!data.url) {
    return (
      <div className="w-64">
        <motion.div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-[40px] border-2 border-dashed border-white/5 bg-white/[0.02] p-10 flex flex-col items-center justify-center gap-4 hover:bg-white/[0.04] hover:border-white/10 transition-all active:scale-95"
        >
          <div className="w-16 h-16 rounded-[24px] bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] shadow-inner">
            <Music className="w-8 h-8" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-widest text-white/30">Add Music</p>
        </motion.div>
        <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
      </div>
    );
  }

  return (
    <div className="relative group select-none">
      <div className={cn(
        "flex items-center gap-6 bg-[#0D1425F2] backdrop-blur-[60px] border border-white/10 p-6 rounded-[40px] shadow-2xl transition-all duration-700 ease-in-out min-w-[320px]",
        isFocused ? "ring-[3px] ring-[#8B5CF6] scale-[1.05] shadow-[0_40px_80px_rgba(0,0,0,0.6)]" : "hover:bg-white/[0.05]"
      )}>
        <div className="relative shrink-0">
          <div className={cn(
            "w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#8B5CF6] via-[#D946EF] to-[#3B82F6] flex items-center justify-center text-white shadow-xl relative overflow-hidden",
            isPlaying && "animate-pulse"
          )}>
            <Disc className={cn("w-10 h-10 relative z-10 transition-transform", isPlaying && "rotate-[360deg] repeat-infinite")} style={{ transitionDuration: '2000ms' }} />
            {isPlaying && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 bg-white/10 blur-xl"
              />
            )}
          </div>
          <button 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[28px] opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current text-white" /> : <Play className="w-8 h-8 fill-current text-white translate-x-1" />}
          </button>
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-black text-white truncate tracking-tight">{data.title}</p>
            {isPlaying && <Waves className="w-4 h-4 text-[#8B5CF6] animate-bounce" />}
          </div>
          <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mt-1.5">Luma Studio Audio</p>
        </div>

        <audio ref={audioRef} src={data.url} loop onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      </div>
    </div>
  );
};
