import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Check, Plus, Type, Palette, Smile, Undo2, Redo2, 
  MoreVertical, Image as ImageIcon, Pencil, Share2, Trash2,
  Bold, Italic, Underline, Heading1, Heading2, X, Eraser
} from 'lucide-react';
import { useSupabaseNotes } from '../context/SupabaseNotesContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { uploadNoteMedia, UploadProgress } from '../utils/noteMediaUpload';
import { LumaNote, NoteBlock, NoteTheme } from '../types';
import { toast } from 'sonner';

interface KeepNotesEditorProps {
  noteId: string;
  onClose: () => void;
}

// Extended theme colors - 50+ colors including gradients
type ExtendedTheme = NoteTheme | 
  'ruby' | 'cherrySolid' | 'rose' | 'pink' | 'fuchsia' | 'magenta' | 'purple' | 'violet' |
  'lavender' | 'indigo' | 'blue' | 'azure' | 'cyan' | 'teal' | 'mint' | 'green' |
  'lime' | 'yellow' | 'amber' | 'orange' | 'coral' | 'red' | 'white' | 'gray' |
  'zinc' | 'neutral' | 'stone' | 'cream' | 'beige' | 'brown' | 'sepia' |
  'navy' | 'midnightSolid' | 'charcoal' | 'obsidian' | 'sage' | 'olive' |
  'mustard' | 'peachSolid' | 'salmon' | 'crimson' | 'maroon' | 'plum' | 'orchid' |
  'thistle' | 'periwinkle' | 'sky' | 'ocean' | 'turquoise' | 'emerald' | 'jade' |
  'sunset' | 'aurora' | 'berry' | 'golden' | 'cosmic' | 'tropical' | 'cherry' | 'rubyGrad' |
  'purpleMistGrad' | 'oceanGrad' | 'forestGrad' | 'slateGrad' |
  'cottonCandy' | 'midnightGrad' | 'fire' | 'ice' | 'roseGold' | 'neon' | 'peachGrad' | 'lavenderGrad';

interface ThemeOption {
  id: ExtendedTheme;
  color: string;
  name: string;
  isGradient?: boolean;
  gradient?: string;
}

const THEMES: ThemeOption[] = [
  // Original themes
  { id: 'deepNavy', color: '#070B14', name: 'Deep Navy' },
  { id: 'purpleMist', color: '#150C2A', name: 'Purple Mist' },
  { id: 'warmDark', color: '#221707', name: 'Warm Dark' },
  { id: 'pureBlack', color: '#000000', name: 'Pure Black' },
  { id: 'midnightGreen', color: '#0B1B12', name: 'Midnight' },
  { id: 'roseDark', color: '#2A0F1A', name: 'Rose Dark' },
  { id: 'oceanBlue', color: '#0A132A', name: 'Ocean' },
  { id: 'ember', color: '#221707', name: 'Ember' },
  { id: 'forest', color: '#0B1B12', name: 'Forest' },
  { id: 'slate', color: '#F5F3EB', name: 'Slate' },
  
  // Extended solid colors
  { id: 'ruby', color: '#DC2626', name: 'Ruby' },
  { id: 'cherrySolid', color: '#991B1B', name: 'Cherry' },
  { id: 'rose', color: '#E11D48', name: 'Rose' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'fuchsia', color: '#D946EF', name: 'Fuchsia' },
  { id: 'magenta', color: '#C026D3', name: 'Magenta' },
  { id: 'purple', color: '#9333EA', name: 'Purple' },
  { id: 'violet', color: '#7C3AED', name: 'Violet' },
  { id: 'lavender', color: '#A78BFA', name: 'Lavender' },
  { id: 'indigo', color: '#4F46E5', name: 'Indigo' },
  { id: 'blue', color: '#3B82F6', name: 'Blue' },
  { id: 'azure', color: '#0EA5E9', name: 'Azure' },
  { id: 'cyan', color: '#06B6D4', name: 'Cyan' },
  { id: 'teal', color: '#14B8A6', name: 'Teal' },
  { id: 'mint', color: '#10B981', name: 'Mint' },
  { id: 'green', color: '#22C55E', name: 'Green' },
  { id: 'lime', color: '#84CC16', name: 'Lime' },
  { id: 'yellow', color: '#EAB308', name: 'Yellow' },
  { id: 'amber', color: '#F59E0B', name: 'Amber' },
  { id: 'orange', color: '#F97316', name: 'Orange' },
  { id: 'coral', color: '#FB7185', name: 'Coral' },
  { id: 'red', color: '#EF4444', name: 'Red' },
  { id: 'white', color: '#FFFFFF', name: 'White' },
  { id: 'gray', color: '#6B7280', name: 'Gray' },
  { id: 'zinc', color: '#71717A', name: 'Zinc' },
  { id: 'neutral', color: '#737373', name: 'Neutral' },
  { id: 'stone', color: '#78716C', name: 'Stone' },
  { id: 'cream', color: '#FEF3C7', name: 'Cream' },
  { id: 'beige', color: '#F5F5DC', name: 'Beige' },
  { id: 'brown', color: '#92400E', name: 'Brown' },
  { id: 'sepia', color: '#704214', name: 'Sepia' },
  { id: 'navy', color: '#1E3A8A', name: 'Navy' },
  { id: 'midnightSolid', color: '#0F172A', name: 'Midnight' },
  { id: 'charcoal', color: '#374151', name: 'Charcoal' },
  { id: 'obsidian', color: '#1F2937', name: 'Obsidian' },
  { id: 'sage', color: '#9CA3AF', name: 'Sage' },
  { id: 'olive', color: '#65A30D', name: 'Olive' },
  { id: 'mustard', color: '#CA8A04', name: 'Mustard' },
  { id: 'peachSolid', color: '#FED7AA', name: 'Peach' },
  { id: 'salmon', color: '#FDA4AF', name: 'Salmon' },
  { id: 'crimson', color: '#BE123C', name: 'Crimson' },
  { id: 'maroon', color: '#881337', name: 'Maroon' },
  { id: 'plum', color: '#A855F7', name: 'Plum' },
  { id: 'orchid', color: '#C084FC', name: 'Orchid' },
  { id: 'thistle', color: '#D8B4FE', name: 'Thistle' },
  { id: 'periwinkle', color: '#818CF8', name: 'Periwinkle' },
  { id: 'sky', color: '#7DD3FC', name: 'Sky' },
  { id: 'ocean', color: '#0369A1', name: 'Ocean' },
  { id: 'turquoise', color: '#2DD4BF', name: 'Turquoise' },
  { id: 'emerald', color: '#059669', name: 'Emerald' },
  { id: 'jade', color: '#34D399', name: 'Jade' },
  
  // Gradients
  { id: 'purpleMistGrad', color: '#150C2A', name: 'Purple Mist Grad', isGradient: true, gradient: 'linear-gradient(135deg, #150C2A 0%, #2D1B4E 100%)' },
  { id: 'sunset', color: '#7C2D12', name: 'Sunset', isGradient: true, gradient: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #F97316 100%)' },
  { id: 'oceanGrad', color: '#0C4A6E', name: 'Ocean Grad', isGradient: true, gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 50%, #38BDF8 100%)' },
  { id: 'aurora', color: '#0F172A', name: 'Aurora', isGradient: true, gradient: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)' },
  { id: 'forestGrad', color: '#064E3B', name: 'Forest Grad', isGradient: true, gradient: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #10B981 100%)' },
  { id: 'berry', color: '#881337', name: 'Berry', isGradient: true, gradient: 'linear-gradient(135deg, #881337 0%, #BE123C 50%, #FB7185 100%)' },
  { id: 'golden', color: '#78350F', name: 'Golden', isGradient: true, gradient: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #FBBF24 100%)' },
  { id: 'cosmic', color: '#0F172A', name: 'Cosmic', isGradient: true, gradient: 'linear-gradient(135deg, #0F172A 0%, #312E81 50%, #7C3AED 100%)' },
  { id: 'cherry', color: '#7F1D1D', name: 'Cherry', isGradient: true, gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #FCA5A5 100%)' },
  { id: 'tropical', color: '#065F46', name: 'Tropical', isGradient: true, gradient: 'linear-gradient(135deg, #065F46 0%, #059669 50%, #34D399 100%)' },
  { id: 'slateGrad', color: '#F5F3EB', name: 'Slate Grad', isGradient: true, gradient: 'linear-gradient(135deg, #F5F3EB 0%, #E5E7EB 50%, #D1D5DB 100%)' },
  { id: 'rubyGrad', color: '#7F1D1D', name: 'Ruby Grad', isGradient: true, gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #EF4444 100%)' },
  { id: 'cottonCandy', color: '#FBCFE8', name: 'Cotton Candy', isGradient: true, gradient: 'linear-gradient(135deg, #FBCFE8 0%, #DDD6FE 50%, #C7D2FE 100%)' },
  { id: 'midnightGrad', color: '#0F172A', name: 'Midnight Grad', isGradient: true, gradient: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)' },
  { id: 'fire', color: '#451A03', name: 'Fire', isGradient: true, gradient: 'linear-gradient(135deg, #451A03 0%, #92400E 50%, #F59E0B 100%)' },
  { id: 'ice', color: '#E0F2FE', name: 'Ice', isGradient: true, gradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)' },
  { id: 'roseGold', color: '#FDA4AF', name: 'Rose Gold', isGradient: true, gradient: 'linear-gradient(135deg, #FDA4AF 0%, #FED7AA 100%)' },
  { id: 'neon', color: '#0F172A', name: 'Neon', isGradient: true, gradient: 'linear-gradient(135deg, #0F172A 0%, #166534 50%, #0891B2 100%)' },
  { id: 'peachGrad', color: '#FFEDD5', name: 'Peach Grad', isGradient: true, gradient: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 50%, #FDBA74 100%)' },
  { id: 'lavenderGrad', color: '#EDE9FE', name: 'Lavender Grad', isGradient: true, gradient: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)' },
];

// Text colors
const TEXT_COLORS = [
  { color: '#FFFFFF', name: 'White' },
  { color: '#000000', name: 'Black' },
  { color: '#EF4444', name: 'Red' },
  { color: '#F97316', name: 'Orange' },
  { color: '#F59E0B', name: 'Amber' },
  { color: '#84CC16', name: 'Lime' },
  { color: '#22C55E', name: 'Green' },
  { color: '#14B8A6', name: 'Teal' },
  { color: '#06B6D4', name: 'Cyan' },
  { color: '#3B82F6', name: 'Blue' },
  { color: '#6366F1', name: 'Indigo' },
  { color: '#8B5CF6', name: 'Violet' },
  { color: '#A855F7', name: 'Purple' },
  { color: '#D946EF', name: 'Fuchsia' },
  { color: '#EC4899', name: 'Pink' },
  { color: '#FB7185', name: 'Rose' },
  { color: '#94A3B8', name: 'Slate' },
  { color: '#9CA3AF', name: 'Gray' },
  { color: '#D97706', name: 'Gold' },
  { color: '#92400E', name: 'Brown' },
];

export const KeepNotesEditor: React.FC<KeepNotesEditorProps> = ({ noteId, onClose }) => {
  const { getNote, updateNote, deleteNote } = useSupabaseNotes();
  const note = getNote(noteId);
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [theme, setTheme] = useState<ExtendedTheme>('deepNavy');
  const [textColor, setTextColor] = useState('#E6E9F2');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
  // Toolbar states
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ status: 'idle', progress: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { status, statusText, saveNow, triggerSave } = useAutoSave({ delay: 1000 });

  // History for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.blocks?.map(b => b.content).join('\n') || '');
      setTheme(note.theme as ExtendedTheme);
      setMediaUrls(note.firstImageUrl ? [note.firstImageUrl] : []);
      setIsPinned(note.isPinned);
      
      // Initialize history
      const initialContent = note.blocks?.map(b => b.content).join('\n') || '';
      setHistory([initialContent]);
      setHistoryIndex(0);
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
        theme: theme as NoteTheme,
        firstImageUrl: mediaUrls[0],
        previewText: body.slice(0, 200),
        wordCount: body.split(/\s+/).filter(w => w.length > 0).length,
      });
    });
  }, [title, body, theme, mediaUrls, noteId, note, triggerSave, updateNote]);

  // Add to history when body changes significantly
  const addToHistory = useCallback((newContent: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      // Keep only last 50 entries
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setBody(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setBody(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Handle body change with history
  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setBody(newValue);
    
    // Add to history every 3 seconds or on significant changes
    if (Math.abs(newValue.length - (history[historyIndex]?.length || 0)) > 10) {
      addToHistory(newValue);
    }
  }, [history, historyIndex, addToHistory]);

  // Force save on close
  const handleDone = useCallback(async () => {
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

  // Delete note
  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote(noteId);
      onClose();
    }
  }, [deleteNote, noteId, onClose]);

  // Share note
  const handleShare = useCallback(async () => {
    const shareData = {
      title: title || 'Untitled Note',
      text: body.slice(0, 100) + (body.length > 100 ? '...' : ''),
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n\n${body}`);
      toast.success('Note copied to clipboard');
    }
    setShowMoreMenu(false);
  }, [title, body]);

  // Insert formatting
  const insertFormatting = useCallback((format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    
    let newText = body;
    let cursorOffset = 0;
    
    switch (format) {
      case 'h1':
        newText = body.substring(0, start) + '# ' + selectedText + body.substring(end);
        cursorOffset = 2;
        break;
      case 'h2':
        newText = body.substring(0, start) + '## ' + selectedText + body.substring(end);
        cursorOffset = 3;
        break;
      case 'bold':
        newText = body.substring(0, start) + '**' + selectedText + '**' + body.substring(end);
        cursorOffset = 2;
        break;
      case 'italic':
        newText = body.substring(0, start) + '*' + selectedText + '*' + body.substring(end);
        cursorOffset = 1;
        break;
      case 'underline':
        newText = body.substring(0, start) + '__' + selectedText + '__' + body.substring(end);
        cursorOffset = 2;
        break;
    }
    
    setBody(newText);
    addToHistory(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText ? end + cursorOffset * 2 : start + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [body, addToHistory]);

  // Clear all content
  const handleClear = useCallback(() => {
    if (confirm('Clear all content?')) {
      addToHistory(body);
      setBody('');
      setMediaUrls([]);
    }
  }, [body, addToHistory]);

  // Get theme color
  const themeOption = THEMES.find(t => t.id === theme) || THEMES[0];
  const bgStyle = themeOption.isGradient && themeOption.gradient 
    ? { background: themeOption.gradient }
    : { backgroundColor: themeOption.color };

  // Determine text color based on background brightness
  const isLightBg = ['white', 'cream', 'beige', 'slate', 'peach', 'thistle', 'periwinkle', 'sky'].includes(theme);
  const defaultTextColor = isLightBg ? '#1F2937' : '#E6E9F2';
  const placeholderColor = isLightBg ? '#9CA3AF' : '#FFFFFF50';

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
      style={bgStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button 
          onClick={handleDone}
          className="flex items-center gap-1 transition-colors"
          style={{ color: defaultTextColor }}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="text-base font-bold" style={{ color: defaultTextColor }}>
          Keep Notes
        </h1>

        <button 
          onClick={handleDone}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#7B61FF] text-white text-sm font-medium hover:bg-[#6B51EF] transition-colors"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title . . . . . ."
          className="w-full bg-transparent text-2xl font-bold outline-none mb-4"
          style={{ 
            color: textColor || defaultTextColor,
            caretColor: '#7B61FF'
          }}
        />

        {/* Media/Drawing Area */}
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

        {/* Drawing Mode Indicator */}
        {isDrawingMode && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[#7B61FF]/20 border border-[#7B61FF]/30">
            <p className="text-xs text-[#7B61FF] font-medium">Drawing mode enabled</p>
          </div>
        )}

        {/* Body Textarea */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          placeholder="Description . . ."
          className="w-full min-h-[40vh] bg-transparent outline-none resize-none text-base leading-relaxed"
          style={{ 
            color: textColor || defaultTextColor,
            caretColor: '#7B61FF'
          }}
          autoFocus
        />

        {/* Upload Progress */}
        {uploadProgress.status !== 'idle' && uploadProgress.status !== 'complete' && (
          <div className="fixed bottom-32 left-4 right-4 bg-[#0F1629] rounded-xl p-3 flex items-center gap-3 z-50">
            {uploadProgress.status === 'uploading' && (
              <div className="flex-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#7B61FF] transition-all duration-300"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-white/50 mt-1">
                  Uploading... {uploadProgress.progress}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formatting Toolbar */}
      <AnimatePresence>
        {showFormatting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-t border-white/10 shrink-0"
            style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: placeholderColor }}>
              Layout
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => insertFormatting('h1')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: defaultTextColor }}
                title="Heading 1"
              >
                <Heading1 className="w-5 h-5" />
              </button>
              <button
                onClick={() => insertFormatting('h2')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: defaultTextColor }}
                title="Heading 2"
              >
                <Heading2 className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button
                onClick={() => insertFormatting('bold')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: defaultTextColor }}
                title="Bold"
              >
                <Bold className="w-5 h-5" />
              </button>
              <button
                onClick={() => insertFormatting('italic')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: defaultTextColor }}
                title="Italic"
              >
                <Italic className="w-5 h-5" />
              </button>
              <button
                onClick={() => insertFormatting('underline')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: defaultTextColor }}
                title="Underline"
              >
                <Underline className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Color Picker */}
      <AnimatePresence>
        {showBgColorPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-t border-white/10 shrink-0"
            style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: placeholderColor }}>
                Background Colour
              </p>
              <span className="text-[10px]" style={{ color: placeholderColor }}>
                50+ colors & gradients
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowBgColorPicker(false);
                  }}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl border-2 transition-all ${
                    theme === t.id ? 'border-[#7B61FF] scale-110' : 'border-transparent'
                  }`}
                  style={{ 
                    background: t.gradient || t.color,
                    boxShadow: theme === t.id ? '0 0 10px rgba(123,97,255,0.5)' : 'none'
                  }}
                  title={t.name}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Color Picker */}
      <AnimatePresence>
        {showTextColorPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-t border-white/10 shrink-0"
            style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: placeholderColor }}>
              Text Colour
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.color}
                  onClick={() => {
                    setTextColor(c.color);
                    setShowTextColorPicker(false);
                  }}
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${
                    textColor === c.color ? 'border-[#7B61FF] scale-110' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* More Options Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 bg-[#0F1629] rounded-xl shadow-xl border border-white/10 p-2 z-50 min-w-[160px]"
          >
            <button
              onClick={() => { setShowMoreMenu(false); setShowFormatting(!showFormatting); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white text-sm"
            >
              <Pencil className="w-4 h-4" />
              Edit Note
            </button>
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share Note
            </button>
            <div className="h-px bg-white/10 my-1" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Toolbar */}
      <div 
        className="px-4 py-3 pb-safe border-t shrink-0 backdrop-blur-sm"
        style={{ 
          borderColor: isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
          backgroundColor: isLightBg ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.2)'
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Main Tools */}
          <div className="flex items-center gap-1">
            {/* Plus - Drawing / Add Media */}
            <button
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`p-2.5 rounded-xl transition-colors ${
                isDrawingMode ? 'bg-[#7B61FF] text-white' : 'hover:bg-white/10'
              }`}
              style={{ color: isDrawingMode ? 'white' : defaultTextColor }}
              title="Drawing on"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Text Style / Formatting */}
            <button
              onClick={() => setShowFormatting(!showFormatting)}
              className={`p-2.5 rounded-xl transition-colors ${
                showFormatting ? 'bg-[#7B61FF] text-white' : 'hover:bg-white/10'
              }`}
              style={{ color: showFormatting ? 'white' : defaultTextColor }}
              title="Text Style (H1, H2, B, U, I)"
            >
              <Type className="w-5 h-5" />
            </button>

            {/* Add Media */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              style={{ color: defaultTextColor }}
              title="Add media"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Background Color */}
            <button
              onClick={() => setShowBgColorPicker(!showBgColorPicker)}
              className={`p-2.5 rounded-xl transition-colors ${
                showBgColorPicker ? 'bg-[#7B61FF] text-white' : 'hover:bg-white/10'
              }`}
              style={{ color: showBgColorPicker ? 'white' : defaultTextColor }}
              title="Background colour"
            >
              <Palette className="w-5 h-5" />
            </button>

            {/* Text Color / Emoji */}
            <button
              onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              className={`p-2.5 rounded-xl transition-colors ${
                showTextColorPicker ? 'bg-[#7B61FF] text-white' : 'hover:bg-white/10'
              }`}
              style={{ color: showTextColorPicker ? 'white' : defaultTextColor }}
              title="Text colour"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
              style={{ color: defaultTextColor }}
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>

            {/* Clear / Eraser */}
            <button
              onClick={handleClear}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              style={{ color: defaultTextColor }}
              title="Clear"
            >
              <Eraser className="w-5 h-5" />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-30"
              style={{ color: defaultTextColor }}
              title="Redo"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Right: More Options */}
          <div className="flex items-center gap-2">
            {/* More Menu */}
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`p-2.5 rounded-xl transition-colors ${
                showMoreMenu ? 'bg-[#7B61FF] text-white' : 'hover:bg-white/10'
              }`}
              style={{ color: showMoreMenu ? 'white' : defaultTextColor }}
              title="Edit, Share, Delete"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Status */}
        <div className="flex items-center justify-center mt-2 gap-1.5 text-[10px]" style={{ color: placeholderColor }}>
          {status === 'saving' && <span>Saving...</span>}
          {status === 'saved' && <span>Saved</span>}
          {status === 'error' && <span className="text-red-400">Error saving</span>}
          {!status && <span>{body.split(/\s+/).filter(w => w.length > 0).length} words</span>}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Click outside to close more menu */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMoreMenu(false)}
        />
      )}
    </motion.div>
  );
};

export default KeepNotesEditor;
