import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Trash2, Video } from 'lucide-react';
import { VideoBlockData } from '../../types';
import { cn } from '@/lib/utils';

interface VideoBlockProps {
  content: VideoBlockData | string;
  onChange: (data: VideoBlockData) => void;
  onDelete: () => void;
  isFocused?: boolean;
}

export const VideoBlock: React.FC<VideoBlockProps> = ({ content, onChange, onDelete, isFocused }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const data: VideoBlockData = typeof content === 'string'
    ? { url: content, width: 100, isMuted: true, autoPlay: true, borderRadius: 32 }
    : (content as VideoBlockData) || { url: '', width: 100, isMuted: true, autoPlay: true, borderRadius: 32 };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...data, url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
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
            <Video className="w-8 h-8" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-widest text-white/30">Add Video</p>
        </motion.div>
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
      </div>
    );
  }

  return (
    <div className="relative group select-none">
      <div className={cn(
        "relative overflow-hidden transition-all duration-700 ease-in-out",
        isFocused ? "shadow-[0_40px_80px_rgba(0,0,0,0.6)] ring-[3px] ring-[#8B5CF6] scale-[1.02]" : "shadow-2xl ring-1 ring-white/10",
        "rounded-[32px] bg-black"
      )}>
        <video
          ref={videoRef}
          src={data.url}
          className="w-full h-auto block pointer-events-none min-w-[200px] max-w-[600px]"
          muted={data.isMuted}
          autoPlay={data.autoPlay}
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Premium Controls Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            onClick={togglePlay} 
            className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white scale-90 hover:scale-100 active:scale-95 transition-all shadow-2xl"
          >
            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
          </button>
        </div>

        <button 
          onClick={() => onChange({ ...data, isMuted: !data.isMuted })}
          className="absolute bottom-6 right-6 w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
        >
          {data.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
