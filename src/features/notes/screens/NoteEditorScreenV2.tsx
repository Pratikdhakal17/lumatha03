import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, ChevronLeft, Image as ImageIcon, Type, Mic, 
  Palette, Save, Loader2, Clock, CheckCircle2
} from 'lucide-react';
import { useSupabaseNotes } from '../context/SupabaseNotesContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { uploadNoteMedia, UploadProgress } from '../utils/noteMediaUpload';
import { LumaNote, NoteBlock, NoteTheme } from '../types';
import { toast } from 'sonner';

interface NoteEditorScreenV2Props {
  noteId: string;
  onClose: () => void;
}

const THEMES: { id: NoteTheme; color: string; name: string }[] = [
  { id: 'deepNavy', color: '#070B14', name: 'Deep Navy' },
  { id: 'purpleMist', color: '#150C2A', name: 'Purple Mist' },
  { id: 'warmDark', color: '#221707', name: 'Warm Dark' },
  { id: 'pureBlack', color: '#000000', name: 'Pure Black' },
  { id: 'midnightGreen', color: '#0B1B12', name: 'Midnight' },
  { id: 'roseDark', color: '#2A0F1A', name: 'Rose Dark' },
  { id: 'oceanBlue', color: '#0A132A', name: 'Ocean' },
];

export const NoteEditorScreenV2: React.FC<NoteEditorScreenV2Props> = ({ noteId, onClose }) => {
  const { getNote, updateNote } = useSupabaseNotes();
  const note = getNote(noteId);
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [theme, setTheme] = useState<NoteTheme>('deepNavy');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  
  const [showToolbar, setShowToolbar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ status: 'idle', progress: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { status, statusText, saveNow, triggerSave } = useAutoSave({ delay: 1000 });

  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.blocks?.map(b => b.content).join('\n') || '');
      setTheme(note.theme);
      setMediaUrls(note.firstImageUrl ? [note.firstImageUrl] : []);
      setIsPinned(note.isPinned);
    }
  }, [note]);

  // Auto-save trigger
  useEffect(() => {
    if (!note) return;
    
    triggerSave(async () => {
      const blocks: NoteBlock[] = body.split('\n').map((line, i) => ({
        id: `block-${i}`,
        type: 'text',
        content: line,
      }));
      
      await updateNote(noteId, {
        title,
        blocks,
        theme,
        firstImageUrl: mediaUrls[0],
        previewText: body.slice(0, 200),
        wordCount: body.split(/\s+/).filter(w => w.length > 0).length,
      });
    });
  }, [title, body, theme, mediaUrls, noteId, note, triggerSave, updateNote]);

  // Force save on close
  const handleClose = useCallback(async () => {
    await saveNow();
    onClose();
  }, [saveNow, onClose]);

  // Handle media upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !note) return;

    try {
      const result = await uploadNoteMedia(file, noteId, setUploadProgress);
      setMediaUrls(prev => [...prev, result.url]);
      toast.success('Media added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload media');
    } finally {
      setUploadProgress({ status: 'idle', progress: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [note, noteId]);

  // Remove media
  const removeMedia = useCallback((index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Theme color
  const bgColor = THEMES.find(t => t.id === theme)?.color || '#070B14';

  if (!note) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      >
        <p className="text-white">Note not found</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[1000] flex flex-col"
      style={{ backgroundColor: bgColor }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button 
          onClick={handleClose}
          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {status === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            {status === 'error' && <Clock className="w-3.5 h-3.5 text-red-400" />}
            <span>{statusText}</span>
          </div>

          {/* Pin Button */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-full transition-colors ${isPinned ? 'bg-primary/20 text-primary' : 'text-white/50 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-white/30 outline-none mb-4"
        />

        {/* Media Grid */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {mediaUrls.map((url, index) => (
              <div key={index} className="relative rounded-xl overflow-hidden aspect-video group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Body Textarea */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing..."
          className="w-full h-[50vh] bg-transparent text-white placeholder:text-white/30 outline-none resize-none text-base leading-relaxed"
          autoFocus
        />

        {/* Upload Progress */}
        {uploadProgress.status !== 'idle' && uploadProgress.status !== 'complete' && (
          <div className="fixed bottom-24 left-4 right-4 bg-[#0F1629] rounded-xl p-3 flex items-center gap-3">
            {uploadProgress.status === 'uploading' && (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
            <div className="flex-1">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-white/50 mt-1">
                {uploadProgress.status === 'checking' && 'Preparing...'}
                {uploadProgress.status === 'uploading' && `Uploading... ${uploadProgress.progress}%`}
                {uploadProgress.status === 'processing' && 'Processing...'}
                {uploadProgress.status === 'error' && (uploadProgress.error || 'Upload failed')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="px-4 py-3 pb-safe border-t border-white/5 shrink-0 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Left: Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowToolbar(!showToolbar)}
              className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Palette className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Info */}
          <div className="text-xs text-white/40">
            {body.split(/\s+/).filter(w => w.length > 0).length} words
          </div>
        </div>

        {/* Theme Selector */}
        {showToolbar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-white/5"
          >
            <p className="text-xs text-white/40 mb-2">Theme</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 transition-all ${
                    theme === t.id 
                      ? 'bg-white/20 ring-1 ring-white/30' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs text-white/70">{t.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </motion.div>
  );
};

export default NoteEditorScreenV2;
