import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Upload, X, Trash2 } from 'lucide-react';
import { ImageBlockData } from '../../types';
import { cn } from '@/lib/utils';

interface ImageBlockProps {
  content: ImageBlockData | string;
  onChange: (data: ImageBlockData) => void;
  onDelete: () => void;
  isFocused?: boolean;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({ content, onChange, onDelete, isFocused }) => {
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const data: ImageBlockData = typeof content === 'string' 
    ? { url: content, width: 100, alignment: 'center', caption: '', borderRadius: 32 }
    : (content as ImageBlockData) || { url: '', width: 100, alignment: 'center', caption: '', borderRadius: 32 };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...data, url: reader.result as string, width: 100 });
      setShowSourceMenu(false);
    };
    reader.readAsDataURL(file);
  };

  if (!data.url) {
    return (
      <div className="w-64">
        <motion.div
          onClick={() => setShowSourceMenu(true)}
          className="cursor-pointer rounded-[40px] border-2 border-dashed border-white/5 bg-white/[0.02] p-10 flex flex-col items-center justify-center gap-4 hover:bg-white/[0.04] hover:border-white/10 transition-all active:scale-95"
        >
          <div className="w-16 h-16 rounded-[24px] bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] shadow-inner">
            <ImageIcon className="w-8 h-8" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-widest text-white/30">Add Image</p>
        </motion.div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>
    );
  }

  return (
    <div className="relative group select-none">
      <div className={cn(
        "relative overflow-hidden transition-all duration-700 ease-in-out",
        isFocused ? "shadow-[0_40px_80px_rgba(0,0,0,0.6)] ring-[3px] ring-[#8B5CF6] scale-[1.02]" : "shadow-2xl ring-1 ring-white/10",
        "rounded-[32px] bg-[#0D1425]"
      )}>
        <img
          src={data.url}
          alt={data.caption}
          className="w-full h-auto block pointer-events-none min-w-[160px] max-w-[600px] object-cover"
          draggable={false}
        />
        {/* Subtle Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Caption */}
      <AnimatePresence>
        {(data.caption || isFocused) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-5 px-4"
          >
            <input
              value={data.caption || ''}
              onChange={(e) => onChange({ ...data, caption: e.target.value })}
              placeholder="Write a caption..."
              className="w-full bg-transparent border-none outline-none text-center text-[12px] font-bold tracking-wide text-white/30 focus:text-white/80 transition-all placeholder:text-white/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

