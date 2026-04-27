import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Plus, Search, MoreVertical, Pin, Bell, Archive, Trash2, 
  Type, Image as ImageIcon, Pencil, Edit3,
  Palette, MoreHorizontal, ChevronLeft, Share2, 
  Copy, X, Bold, Italic, Underline, 
  Heading1, Heading2, CaseSensitive, ChevronRight,
  Clock, Calendar, Star, Save, ArrowLeft, ArrowRight,
  Smile, MinusCircle, ChevronUp, ChevronDown, GraduationCap, Zap,
  Eraser, Brush, Square, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// --- DESIGN TOKENS (PIXEL PERFECT) ---
const TOKENS = {
  colors: {
    bg: '#070B14',
    card: '#0F1629',
    primary: '#7B61FF', // Primary Purple
    textPrimary: '#E6E9F2',
    textSecondary: '#8A90A2',
    glass: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  radius: '18px',
  spacing: '20px',
  animation: {
    duration: 0.28,
    curve: [0.2, 0.8, 0.2, 1], // Custom cubic-bezier
  }
};

const THEMES = [
  { id: 'dark', label: 'Default Dark', bg: '#070B14', text: '#E6E9F2', primary: '#7B61FF' },
  { id: 'black', label: 'Pure Black', bg: '#000000', text: '#FFFFFF', primary: '#FFFFFF' },
  { id: 'paper', label: 'Paper', bg: '#F5F5F7', text: '#1D1D1F', primary: '#007AFF' },
  { id: 'forest', label: 'Forest', bg: '#0A1A12', text: '#E2E8F0', primary: '#4ADE80' },
  { id: 'violet', label: 'Violet', bg: '#130B1A', text: '#F5F3FF', primary: '#C084FC' },
  { id: 'amber', label: 'Amber', bg: '#1A140B', text: '#FFFBEB', primary: '#FBBF24' },
];

// --- TYPES ---
interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface MediaItem {
  id: string;
  type: 'image';
  url: string;
}

interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  mode: 'draw' | 'erase';
}

interface Note {
  id: string;
  title: string;
  body: string;
  media: MediaItem[];
  stickers: Sticker[];
  strokes: DrawingStroke[];
  drawingMode: 'free' | 'paper' | 'none';
  mood?: string;
  pinned: boolean;
  saved: boolean;
  theme: string;
  fontSize: number;
  textColor: string;
  updatedAt: number;
}

// --- CORE COMPONENT ---
export function NotesSection() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pinned' | 'Saved'>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [showCover, setShowCover] = useState(false);

  // Load Persistence
  useEffect(() => {
    const saved = localStorage.getItem('premium_notes_v2');
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  // Auto-Save Effect
  useEffect(() => {
    if (notes.length > 0) {
      setIsSaving(true);
      const timer = setTimeout(() => {
        localStorage.setItem('premium_notes_v2', JSON.stringify(notes));
        setIsSaving(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [notes]);

  const activeNote = useMemo(() => notes.find(n => n.id === selectedId) || null, [notes, selectedId]);

  const handleCreate = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      body: '',
      media: [],
      stickers: [],
      strokes: [],
      drawingMode: 'none',
      mood: '✨',
      pinned: false,
      saved: false,
      theme: 'dark',
      fontSize: 16,
      textColor: TOKENS.colors.textPrimary,
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setSelectedId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedId(null);
    toast.success('Note deleted');
  };

  if (showCover && activeNote) {
    return (
      <DiaryCover 
        note={activeNote} 
        onClose={() => setShowCover(false)} 
        onFlip={(dir: 'next' | 'prev') => {
          const idx = notes.findIndex(n => n.id === selectedId);
          if (dir === 'next' && idx < notes.length - 1) setSelectedId(notes[idx + 1].id);
          if (dir === 'prev' && idx > 0) setSelectedId(notes[idx - 1].id);
        }}
      />
    );
  }

  return (
    <div className="h-full w-full bg-[#070B14] text-[#E6E9F2] font-sans selection:bg-[#7B61FF]/30 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!selectedId ? (
          <NotesListView 
            notes={notes}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelect={setSelectedId}
            onCreate={handleCreate}
          />
        ) : (
          <EditorView 
            note={activeNote!}
            isSaving={isSaving}
            onClose={() => setSelectedId(null)}
            onUpdate={(u: Partial<Note>) => updateNote(selectedId, u)}
            onDelete={() => deleteNote(selectedId)}
            onDone={() => setShowCover(true)}
            onNext={() => {
              const idx = notes.findIndex(n => n.id === selectedId);
              if (idx < notes.length - 1) setSelectedId(notes[idx + 1].id);
            }}
            onPrev={() => {
              const idx = notes.findIndex(n => n.id === selectedId);
              if (idx > 0) setSelectedId(notes[idx - 1].id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- 🧩 LIST VIEW ---
function NotesListView({ notes, activeTab, setActiveTab, searchQuery, setSearchQuery, onSelect, onCreate }: any) {
  const filtered = notes.filter((n: Note) => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (n.body || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'Pinned') return n.pinned && matchesSearch;
    if (activeTab === 'Saved') return n.saved && matchesSearch;
    return matchesSearch;
  });

  const sections = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    return [
      { label: 'TODAY', items: filtered.filter((n: Note) => now - n.updatedAt < day) },
      { label: 'THIS WEEK', items: filtered.filter((n: Note) => now - n.updatedAt >= day && now - n.updatedAt < day * 7) },
      { label: 'EARLIER', items: filtered.filter((n: Note) => now - n.updatedAt >= day * 7) },
    ].filter(s => s.items.length > 0);
  }, [filtered]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-5">
      <div className="mb-8 mt-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A90A2] group-focus-within:text-[#7B61FF] transition-colors" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-[#0F1629] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/20 transition-all shadow-lg"
          />
        </div>
      </div>

      <div className="flex gap-8 mb-6 border-b border-white/5 px-2">
        {['All', 'Pinned', 'Saved'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-all relative ${activeTab === tab ? 'text-[#E6E9F2]' : 'text-[#8A90A2]'}`}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7B61FF]" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-10 pb-32">
        {sections.map(s => (
          <div key={s.label}>
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#8A90A2] mb-4 opacity-50 uppercase">{s.label}</h3>
            <div className="grid gap-3">
              {s.items.map((n: Note) => (
                <NoteCard key={n.id} note={n} onClick={() => onSelect(n.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onCreate} className="fixed bottom-10 right-8 w-16 h-16 bg-[#7B61FF] rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform z-50">
        <Plus className="w-8 h-8 text-white" />
      </button>
    </motion.div>
  );
}

function NoteCard({ note, onClick }: { note: Note, onClick: () => void }) {
  return (
    <motion.div 
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="bg-[#0F1629] p-5 rounded-[22px] border border-white/5 relative group cursor-pointer shadow-xl hover:bg-[#151D35] transition-colors"
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-base truncate pr-6 text-[#E6E9F2]">{note.title || 'Untitled Note'}</h4>
        <div className="flex gap-2">
          {note.mood && <span className="text-xs">{note.mood}</span>}
          {note.pinned && <Pin className="w-3.5 h-3.5 text-[#7B61FF] fill-[#7B61FF]" />}
        </div>
      </div>
      <p className="text-sm text-[#8A90A2] line-clamp-2 leading-relaxed mb-4">{note.body || 'No content yet...'}</p>
      <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-[#8A90A2]/40 uppercase">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {note.media.length > 0 && <span>📷 {note.media.length}</span>}
      </div>
    </motion.div>
  );
}

// --- 📝 EDITOR VIEW ---
function EditorView({ note, isSaving, onClose, onUpdate, onDelete, onNext, onPrev, onDone }: any) {
  const [activePanel, setActivePanel] = useState<'add' | 'color' | 'typo' | 'menu' | 'stickers' | 'mood' | 'drawing' | null>(null);
  const [drawMode, setDrawMode] = useState<'draw' | 'erase'>('draw');
  const [drawColor, setDrawColor] = useState('#E6E9F2');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const theme = THEMES.find(t => t.id === note.theme) || THEMES[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [note.body]);

  const addSticker = (emoji: string) => {
    onUpdate({ stickers: [...(note.stickers || []), { id: Date.now().toString(), emoji, x: 50, y: 50 }] });
    setActivePanel(null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (note.drawingMode === 'none') return;
    setIsDrawing(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', ...TOKENS.animation }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
      ref={containerRef}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 flex-shrink-0 backdrop-blur-xl bg-black/10">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/5 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
        
        <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
          <button onClick={onPrev} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 rounded-full transition-all">Prev</button>
          <div className="w-[1px] h-3 bg-white/10 mx-1" />
          <button onClick={onNext} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 rounded-full transition-all">Next</button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onDone}
            className="px-5 py-1.5 bg-[#7B61FF] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all"
          >
            Done
          </button>
          <button onClick={() => setActivePanel('menu')} className="p-2 -mr-2 hover:bg-white/5 rounded-full opacity-60"><MoreHorizontal className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar relative">
        <input 
          value={note.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Note title"
          className="w-full bg-transparent border-none text-2xl font-black placeholder:opacity-20 mb-2 focus:outline-none"
        />
        
        <div className="flex items-center gap-2 mb-8 opacity-40 text-[10px] font-bold tracking-widest uppercase">
          <button onClick={() => setActivePanel('mood')} className="hover:text-[#7B61FF] transition-colors">{note.mood || 'Add Mood'}</button>
        </div>

        {/* Media Row - Images Only */}
        {note.media.length > 0 && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 pb-4">
            <LayoutGroup>
              {note.media.map((m: MediaItem) => (
                <motion.div 
                  layout
                  key={m.id} 
                  className="min-w-[160px] h-40 rounded-[22px] bg-white/5 border border-white/5 overflow-hidden flex-shrink-0 relative group shadow-2xl"
                >
                  <img src={m.url} className="w-full h-full object-cover" alt="" />
                  <button 
                    onClick={() => onUpdate({ media: note.media.filter((item: MediaItem) => item.id !== m.id) })}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              ))}
            </LayoutGroup>
          </div>
        )}

        <div className="relative">
          <textarea 
            ref={textareaRef}
            value={note.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="Start your note..."
            style={{ fontSize: note.fontSize, color: note.textColor }}
            className="w-full bg-transparent border-none resize-none focus:outline-none placeholder:opacity-20 leading-relaxed min-h-[50vh]"
          />

          {/* Stickers Layer */}
          <AnimatePresence>
            {note.stickers?.map((s: Sticker) => (
              <motion.div
                key={s.id}
                drag
                dragConstraints={containerRef}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute z-[40] cursor-grab active:cursor-grabbing p-4 text-4xl"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                {s.emoji}
                <button 
                  onClick={() => onUpdate({ stickers: note.stickers.filter((item: Sticker) => item.id !== s.id) })}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[10px] text-white opacity-0 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Toolbar - IMPROVED LAYOUT */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[60]">
        {/* Layered Typography Panel (Docks Above) */}
        <AnimatePresence>
          {activePanel === 'typo' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-[#0F1629]/95 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-8 shadow-2xl"
            >
              <button onClick={() => onUpdate({ fontSize: Math.max(12, note.fontSize - 2) })} className="p-2 opacity-60 hover:opacity-100"><MinusCircle className="w-5 h-5" /></button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button onClick={() => onUpdate({ fontSize: 24 })} className="text-xl font-black">H1</button>
              <button onClick={() => onUpdate({ fontSize: 20 })} className="text-lg font-black">H2</button>
              <button onClick={() => onUpdate({ fontSize: 16 })} className="text-sm font-black">Aa</button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button className="p-2 opacity-60"><Bold className="w-5 h-5" /></button>
              <button className="p-2 opacity-60"><Underline className="w-5 h-5" /></button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button onClick={() => setActivePanel(null)} className="p-1"><X className="w-5 h-5 text-[#F2565A]" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IMPROVED BOTTOM TOOLBAR - Better icon management */}
        <div className="bg-white/5 backdrop-blur-3xl rounded-[32px] px-8 py-5 flex items-center gap-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Add Media (Images Only) */}
          <button 
            onClick={() => setActivePanel(activePanel === 'add' ? null : 'add')} 
            className={`transition-all ${activePanel === 'add' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}
            title="Add image"
          >
            <ImageIcon className="w-7 h-7" />
          </button>

          {/* Drawing Tools */}
          <button 
            onClick={() => setActivePanel(activePanel === 'drawing' ? null : 'drawing')} 
            className={`transition-all ${activePanel === 'drawing' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}
            title="Drawing"
          >
            <Brush className="w-7 h-7" />
          </button>

          {/* Eraser */}
          <button 
            onClick={() => {
              if (note.drawingMode !== 'none') {
                onUpdate({ drawingMode: 'none' });
                toast.success('Drawing mode disabled');
              } else {
                onUpdate({ drawingMode: 'free' });
                setActivePanel(null);
                toast.success('Free drawing enabled');
              }
            }}
            className={`transition-all ${note.drawingMode !== 'none' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}
            title="Eraser/Clear drawing"
          >
            <Eraser className="w-7 h-7" />
          </button>

          {/* Stickers */}
          <button 
            onClick={() => setActivePanel(activePanel === 'stickers' ? null : 'stickers')} 
            className={`transition-all ${activePanel === 'stickers' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}
            title="Add stickers"
          >
            <Smile className="w-7 h-7" />
          </button>

          {/* Colors */}
          <button 
            onClick={() => setActivePanel(activePanel === 'color' ? null : 'color')} 
            className={`transition-all ${activePanel === 'color' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}
            title="Colors & themes"
          >
            <Palette className="w-7 h-7" />
          </button>

          {/* Typography */}
          <button 
            onClick={() => setActivePanel(activePanel === 'typo' ? null : 'typo')} 
            className={`transition-all ${activePanel === 'typo' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}
            title="Typography"
          >
            <Type className="w-7 h-7" />
          </button>

          <div className="flex gap-6 px-8 border-x border-white/10">
            <button onClick={onPrev} className="opacity-40 hover:opacity-100 active:scale-90 transition-all"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={onNext} className="opacity-40 hover:opacity-100 active:scale-90 transition-all"><ArrowRight className="w-6 h-6" /></button>
          </div>

          {/* Delete */}
          <button 
            onClick={() => setActivePanel('menu')} 
            className="opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
            title="More options"
          >
            <MoreVertical className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Panels (Slide Up) */}
      <AnimatePresence>
        {activePanel === 'add' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="grid grid-cols-2 gap-8 p-8">
              <PanelItem icon={ImageIcon} label="Add Image" onClick={() => {
                // Open file picker for images
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt: any) => {
                      onUpdate({ media: [...note.media, { id: Date.now().toString(), type: 'image', url: evt.target.result }] });
                      setActivePanel(null);
                      toast.success('Image added');
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }} />
              <PanelItem icon={Brush} label="Free Draw" onClick={() => {
                onUpdate({ drawingMode: 'free' });
                setActivePanel(null);
                toast.success('Free drawing mode');
              }} />
              <PanelItem icon={Square} label="Paper Draw" onClick={() => {
                onUpdate({ drawingMode: 'paper' });
                setActivePanel(null);
                toast.success('Paper drawing mode');
              }} />
            </div>
          </SlidePanel>
        )}
        {activePanel === 'drawing' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase mb-4">Drawing Mode</h4>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { onUpdate({ drawingMode: 'free', strokes: [] }); toast.success('Free draw mode'); setActivePanel(null); }}
                    className={`flex-1 py-3 rounded-xl font-bold text-[12px] transition-all ${note.drawingMode === 'free' ? 'bg-[#7B61FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    Free Draw
                  </button>
                  <button 
                    onClick={() => { onUpdate({ drawingMode: 'paper', strokes: [] }); toast.success('Paper mode'); setActivePanel(null); }}
                    className={`flex-1 py-3 rounded-xl font-bold text-[12px] transition-all ${note.drawingMode === 'paper' ? 'bg-[#7B61FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    Paper
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase mb-4">Brush Size</h4>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs opacity-60 mt-2">Size: {brushSize}px</p>
              </div>
            </div>
          </SlidePanel>
        )}
        {activePanel === 'stickers' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 grid grid-cols-5 gap-6 max-h-[40vh] overflow-y-auto no-scrollbar">
              {['✨', '🔥', '💖', '🍀', '🌈', '🎨', '🚀', '⭐', '🎈', '🍕', '🍣', '🎸', '🎮', '🛸', '🌊'].map(s => (
                <button key={s} onClick={() => addSticker(s)} className="text-4xl hover:scale-125 transition-transform">{s}</button>
              ))}
            </div>
          </SlidePanel>
        )}
        {activePanel === 'mood' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 grid grid-cols-5 gap-6">
              {['😊', '😇', '🤔', '😴', '😎', '🥳', '😭', '🤯', '🤠', '👻'].map(m => (
                <button key={m} onClick={() => { onUpdate({ mood: m }); setActivePanel(null); }} className="text-4xl hover:scale-125 transition-transform">{m}</button>
              ))}
            </div>
          </SlidePanel>
        )}
        {activePanel === 'color' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase">Themes</h4>
                <div className="grid grid-cols-3 gap-4">
                  {THEMES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => { onUpdate({ theme: t.id }); setActivePanel(null); }}
                      className={`p-5 rounded-[22px] border-2 transition-all text-[11px] font-black uppercase tracking-widest ${note.theme === t.id ? 'border-[#7B61FF] shadow-lg scale-105' : 'border-white/5'}`}
                      style={{ backgroundColor: t.bg, color: t.text }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase">Text Color</h4>
                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
                  {['#E6E9F2', '#7B61FF', '#4ADE80', '#FBBF24', '#F2565A', '#C084FC', '#000000', '#FFFFFF'].map(c => (
                    <button 
                      key={c}
                      onClick={() => { onUpdate({ textColor: c }); setActivePanel(null); }}
                      className={`min-w-[50px] h-12 rounded-full border-2 transition-all ${note.textColor === c ? 'border-white scale-110 shadow-xl' : 'border-white/10'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SlidePanel>
        )}
        {activePanel === 'menu' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-6 space-y-3">
              <MenuItem icon={Star} label={note.pinned ? "Unpin" : "Pin to Top"} onClick={() => { onUpdate({ pinned: !note.pinned }); setActivePanel(null); }} />
              <MenuItem icon={Save} label={note.saved ? "Unsave" : "Save"} onClick={() => { onUpdate({ saved: !note.saved }); setActivePanel(null); }} />
              <MenuItem icon={Share2} label="Share" onClick={() => { toast.info('Share feature coming soon'); setActivePanel(null); }} />
              <div className="pt-6 mt-3 border-t border-white/5">
                <MenuItem icon={Trash2} label="Delete" color="#F2565A" onClick={() => {
                  if (confirm('Delete this note permanently?')) {
                    onDelete();
                    onClose();
                  }
                }} />
              </div>
              <div className="text-[9px] text-center pt-8 opacity-20 font-black uppercase tracking-[0.3em]">
                Last Edit: {new Date(note.updatedAt).toLocaleString()}
              </div>
            </div>
          </SlidePanel>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelect={setSelectedId}
            onCreate={handleCreate}
          />
        ) : (
          <EditorView 
            note={activeNote!}
            isSaving={isSaving}
            onClose={() => setSelectedId(null)}
            onUpdate={(u: Partial<Note>) => updateNote(selectedId, u)}
            onDelete={() => deleteNote(selectedId)}
            onDone={() => setShowCover(true)}
            onNext={() => {
              const idx = notes.findIndex(n => n.id === selectedId);
              if (idx < notes.length - 1) setSelectedId(notes[idx + 1].id);
            }}
            onPrev={() => {
              const idx = notes.findIndex(n => n.id === selectedId);
              if (idx > 0) setSelectedId(notes[idx - 1].id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- 🧩 LIST VIEW ---
function NotesListView({ notes, activeTab, setActiveTab, searchQuery, setSearchQuery, onSelect, onCreate }: any) {
  const filtered = notes.filter((n: Note) => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (n.body || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'Pinned') return n.pinned && matchesSearch;
    if (activeTab === 'Saved') return n.saved && matchesSearch;
    return matchesSearch;
  });

  const sections = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    return [
      { label: 'TODAY', items: filtered.filter((n: Note) => now - n.updatedAt < day) },
      { label: 'THIS WEEK', items: filtered.filter((n: Note) => now - n.updatedAt >= day && now - n.updatedAt < day * 7) },
      { label: 'EARLIER', items: filtered.filter((n: Note) => now - n.updatedAt >= day * 7) },
    ].filter(s => s.items.length > 0);
  }, [filtered]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-5">
      <div className="mb-8 mt-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A90A2] group-focus-within:text-[#7B61FF] transition-colors" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search diary..."
            className="w-full bg-[#0F1629] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B61FF]/20 transition-all shadow-lg"
          />
        </div>
      </div>

      <div className="flex gap-8 mb-6 border-b border-white/5 px-2">
        {['All', 'Pinned', 'Saved'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-all relative ${activeTab === tab ? 'text-[#E6E9F2]' : 'text-[#8A90A2]'}`}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7B61FF]" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-10 pb-32">
        {sections.map(s => (
          <div key={s.label}>
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#8A90A2] mb-4 opacity-50 uppercase">{s.label}</h3>
            <div className="grid gap-3">
              {s.items.map((n: Note) => (
                <NoteCard key={n.id} note={n} onClick={() => onSelect(n.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onCreate} className="fixed bottom-10 right-8 w-16 h-16 bg-[#7B61FF] rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform z-50">
        <Plus className="w-8 h-8 text-white" />
      </button>
    </motion.div>
  );
}

function NoteCard({ note, onClick }: { note: Note, onClick: () => void }) {
  return (
    <motion.div 
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="bg-[#0F1629] p-5 rounded-[22px] border border-white/5 relative group cursor-pointer shadow-xl hover:bg-[#151D35] transition-colors"
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-base truncate pr-6 text-[#E6E9F2]">{note.title || 'Diary'}</h4>
        <div className="flex gap-2">
          {note.mood && <span className="text-xs">{note.mood}</span>}
          {note.pinned && <Pin className="w-3.5 h-3.5 text-[#7B61FF] fill-[#7B61FF]" />}
        </div>
      </div>
      <p className="text-sm text-[#8A90A2] line-clamp-2 leading-relaxed mb-4">{note.body || 'No story yet...'}</p>
      <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-[#8A90A2]/40 uppercase">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {note.location && <span className="flex items-center gap-1 opacity-60"><Bell className="w-2.5 h-2.5" /> {note.location}</span>}
      </div>
    </motion.div>
  );
}

// --- 📝 EDITOR VIEW ---
function EditorView({ note, isSaving, onClose, onUpdate, onDelete, onNext, onPrev, onDone }: any) {
  const [activePanel, setActivePanel] = useState<'add' | 'color' | 'typo' | 'menu' | 'stickers' | 'mood' | null>(null);
  const theme = THEMES.find(t => t.id === note.theme) || THEMES[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [note.body]);

  const addSticker = (emoji: string) => {
    onUpdate({ stickers: [...(note.stickers || []), { id: Date.now().toString(), emoji, x: 50, y: 50 }] });
    setActivePanel(null);
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', ...TOKENS.animation }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
      ref={containerRef}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 flex-shrink-0 backdrop-blur-xl bg-black/10">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/5 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
        
        <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
          <button onClick={onPrev} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 rounded-full transition-all">Prev</button>
          <div className="w-[1px] h-3 bg-white/10 mx-1" />
          <button onClick={onNext} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 rounded-full transition-all">Next</button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onDone}
            className="px-5 py-1.5 bg-[#7B61FF] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all"
          >
            Done
          </button>
          <button onClick={() => setActivePanel('menu')} className="p-2 -mr-2 hover:bg-white/5 rounded-full opacity-60"><MoreHorizontal className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar relative">
        <input 
          value={note.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Diary Title"
          className="w-full bg-transparent border-none text-2xl font-black placeholder:opacity-20 mb-2 focus:outline-none"
        />
        
        <div className="flex items-center gap-2 mb-8 opacity-40 text-[10px] font-bold tracking-widest uppercase">
          <span>{note.location || 'Detecting Location...'}</span>
          <span>•</span>
          <button onClick={() => setActivePanel('mood')} className="hover:text-[#7B61FF] transition-colors">{note.mood || 'Set Mood'}</button>
        </div>

        {/* Media Row */}
        {note.media.length > 0 && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 pb-4">
            <LayoutGroup>
              {note.media.map((m: MediaItem) => (
                <motion.div 
                  layout
                  key={m.id} 
                  className="min-w-[160px] h-40 rounded-[22px] bg-white/5 border border-white/5 overflow-hidden flex-shrink-0 relative group shadow-2xl"
                >
                  {m.type === 'video' ? (
                    <video src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={m.url} className="w-full h-full object-cover" alt="" />
                  )}
                  <button 
                    onClick={() => onUpdate({ media: note.media.filter((item: MediaItem) => item.id !== m.id) })}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              ))}
            </LayoutGroup>
          </div>
        )}

        <div className="relative">
          <textarea 
            ref={textareaRef}
            value={note.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="Start your story..."
            style={{ fontSize: note.fontSize, color: note.textColor }}
            className="w-full bg-transparent border-none resize-none focus:outline-none placeholder:opacity-20 leading-relaxed min-h-[50vh]"
          />

          {/* Stickers Layer */}
          <AnimatePresence>
            {note.stickers?.map((s: Sticker) => (
              <motion.div
                key={s.id}
                drag
                dragConstraints={containerRef}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute z-[40] cursor-grab active:cursor-grabbing p-4 text-4xl"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                {s.emoji}
                <button 
                  onClick={() => onUpdate({ stickers: note.stickers.filter((item: Sticker) => item.id !== s.id) })}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[10px] text-white opacity-0 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[60]">
        {/* Layered Typography Panel (Docks Above) */}
        <AnimatePresence>
          {activePanel === 'typo' && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-[#0F1629]/95 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-8 shadow-2xl"
            >
              <button onClick={() => onUpdate({ fontSize: Math.max(12, note.fontSize - 2) })} className="p-2 opacity-60 hover:opacity-100"><MinusCircle className="w-5 h-5" /></button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button onClick={() => onUpdate({ fontSize: 24 })} className="text-xl font-black">H1</button>
              <button onClick={() => onUpdate({ fontSize: 20 })} className="text-lg font-black">H2</button>
              <button onClick={() => onUpdate({ fontSize: 16 })} className="text-sm font-black">Aa</button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button className="p-2 opacity-60"><Bold className="w-5 h-5" /></button>
              <button className="p-2 opacity-60"><Underline className="w-5 h-5" /></button>
              <div className="w-[1px] h-4 bg-white/10" />
              <button onClick={() => setActivePanel(null)} className="p-1"><X className="w-5 h-5 text-[#F2565A]" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/5 backdrop-blur-3xl rounded-[32px] px-8 py-5 flex items-center gap-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button onClick={() => setActivePanel(activePanel === 'add' ? null : 'add')} className={`transition-all ${activePanel === 'add' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}><Plus className="w-7 h-7" /></button>
          <button onClick={() => setActivePanel(activePanel === 'stickers' ? null : 'stickers')} className={`transition-all ${activePanel === 'stickers' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}><Smile className="w-7 h-7" /></button>
          <button onClick={() => setActivePanel(activePanel === 'color' ? null : 'color')} className={`transition-all ${activePanel === 'color' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}><Palette className="w-7 h-7" /></button>
          <button onClick={() => setActivePanel(activePanel === 'typo' ? null : 'typo')} className={`transition-all ${activePanel === 'typo' ? 'text-[#7B61FF] scale-110' : 'opacity-40 hover:opacity-100'}`}><Type className="w-7 h-7" /></button>
          <div className="flex gap-6 px-8 border-x border-white/10">
            <button onClick={onPrev} className="opacity-40 hover:opacity-100 active:scale-90 transition-all"><ArrowLeft className="w-6 h-6" /></button>
            <button onClick={onNext} className="opacity-40 hover:opacity-100 active:scale-90 transition-all"><ArrowRight className="w-6 h-6" /></button>
          </div>
          <button onClick={() => setActivePanel('menu')} className="opacity-40 hover:opacity-100"><MoreVertical className="w-7 h-7" /></button>
        </div>
      </div>

      {/* Panels (Slide Up) */}
      <AnimatePresence>
        {activePanel === 'add' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="grid grid-cols-3 gap-8 p-8">
              <PanelItem icon={ImageIcon} label="Photos Only" onClick={() => {
                onUpdate({ media: [...note.media, { id: Date.now().toString(), type: 'image', url: 'https://picsum.photos/800/800?random=' + Math.random() }] });
                setActivePanel(null);
              }} />
              <PanelItem icon={Video} label="Videos Only" onClick={() => {
                onUpdate({ media: [...note.media, { id: Date.now().toString(), type: 'video', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4' }] });
                setActivePanel(null);
              }} />
              <PanelItem icon={Pencil} label="Sketch" onClick={() => setActivePanel(null)} />
            </div>
          </SlidePanel>
        )}
        {activePanel === 'stickers' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 grid grid-cols-5 gap-6 max-h-[40vh] overflow-y-auto no-scrollbar">
              {['✨', '🔥', '💖', '🍀', '🌈', '🎨', '🚀', '⭐', '🎈', '🍕', '🍣', '🎸', '🎮', '🛸', '🌊'].map(s => (
                <button key={s} onClick={() => addSticker(s)} className="text-4xl hover:scale-125 transition-transform">{s}</button>
              ))}
            </div>
          </SlidePanel>
        )}
        {activePanel === 'mood' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 grid grid-cols-5 gap-6">
              {['😊', '😇', '🤔', '😴', '😎', '🥳', '😭', '🤯', '🤠', '👻'].map(m => (
                <button key={m} onClick={() => { onUpdate({ mood: m }); setActivePanel(null); }} className="text-4xl hover:scale-125 transition-transform">{m}</button>
              ))}
            </div>
          </SlidePanel>
        )}
        {activePanel === 'color' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase">Aesthetic Themes</h4>
                <div className="grid grid-cols-3 gap-4">
                  {THEMES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => onUpdate({ theme: t.id })}
                      className={`p-5 rounded-[22px] border-2 transition-all text-[11px] font-black uppercase tracking-widest ${note.theme === t.id ? 'border-[#7B61FF] shadow-lg scale-105' : 'border-white/5'}`}
                      style={{ backgroundColor: t.bg, color: t.text }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase">Ink Color</h4>
                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
                  {['#E6E9F2', '#7B61FF', '#4ADE80', '#FBBF24', '#F2565A', '#C084FC', '#000000', '#FFFFFF'].map(c => (
                    <button 
                      key={c}
                      onClick={() => onUpdate({ textColor: c })}
                      className={`min-w-[50px] h-12 rounded-full border-2 transition-all ${note.textColor === c ? 'border-white scale-110 shadow-xl' : 'border-white/10'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SlidePanel>
        )}
        {activePanel === 'menu' && (
          <SlidePanel onClose={() => setActivePanel(null)}>
            <div className="p-6 space-y-3">
              <MenuItem icon={Star} label={note.pinned ? "Unpin from Top" : "Pin to Top"} onClick={() => { onUpdate({ pinned: !note.pinned }); setActivePanel(null); }} />
              <MenuItem icon={Save} label={note.saved ? "Unsave" : "Save to Memories"} onClick={() => { onUpdate({ saved: !note.saved }); setActivePanel(null); }} />
              <MenuItem icon={Share2} label="Export Diary" onClick={() => setActivePanel(null)} />
              <div className="pt-6 mt-3 border-t border-white/5">
                <MenuItem icon={Trash2} label="Move to Trash" color="#F2565A" onClick={onDelete} />
              </div>
              <div className="text-[9px] text-center pt-8 opacity-20 font-black uppercase tracking-[0.3em]">
                Last Edit: {new Date(note.updatedAt).toLocaleTimeString()}
              </div>
            </div>
          </SlidePanel>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ✨ NEW COMPONENTS (DIARY COVER & FLIP) ---

function DiaryCover({ note, onClose, onFlip }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] bg-[#070B14] flex flex-col items-center justify-center p-8"
    >
      <div className="absolute top-8 left-8">
        <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full max-w-sm aspect-[3/4] bg-[#0F1629] rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
        
        {/* Dynamic Cover Image */}
        {note.media?.[0] ? (
          <img src={note.media[0].url} className="w-full h-full object-cover opacity-60" alt="" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#7B61FF]/20 to-transparent" />
        )}

        <div className="absolute inset-0 p-12 flex flex-col justify-between items-center text-center">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60">My Diary</span>
            <h2 className="text-3xl font-black tracking-tight">{note.title || 'Diary Story'}</h2>
          </div>

          <div className="space-y-4 w-full">
            <div className="h-[2px] w-12 bg-[#7B61FF] mx-auto" />
            <p className="text-sm font-medium opacity-80 italic line-clamp-3">"{note.body || 'No words written yet...'}"</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold opacity-40 uppercase tracking-widest">Created By</span>
            <p className="text-lg font-black tracking-wide">User Name</p>
          </div>
        </div>
      </div>

      {/* Navigation & Options Below */}
      <div className="mt-16 flex flex-col items-center gap-8 w-full">
        <div className="flex items-center gap-12">
          <button onClick={() => onFlip('prev')} className="p-4 bg-white/5 rounded-full hover:bg-[#7B61FF]/20 hover:text-[#7B61FF] transition-all group active:scale-90">
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-[#7B61FF]' : 'bg-white/10'}`} />)}
          </div>
          <button onClick={() => onFlip('next')} className="p-4 bg-white/5 rounded-full hover:bg-[#7B61FF]/20 hover:text-[#7B61FF] transition-all group active:scale-90">
            <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="flex gap-4 w-full max-w-sm">
          <button className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">
            Add Page
          </button>
          <button className="flex-1 py-4 bg-[#7B61FF] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            Share Diary
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- 🛠 UI HELPERS ---
function SlidePanel({ children, onClose }: any) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-[#0F1629] border-t border-white/10 rounded-t-[32px] z-[80] pb-12 pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" />
        {children}
      </motion.div>
    </>
  );
}

function PanelItem({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-3 active:scale-95 transition-transform group">
      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-[#7B61FF]/10 group-hover:border-[#7B61FF]/30 transition-all">
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-40">{label}</span>
    </button>
  );
}

function MenuItem({ icon: Icon, label, onClick, color }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-5 px-6 py-4 hover:bg-white/5 rounded-2xl transition-all group">
      <Icon className="w-5 h-5" style={{ color: color || 'inherit' }} />
      <span className="text-sm font-semibold flex-1 text-left" style={{ color: color || 'inherit' }}>{label}</span>
      <ChevronRight className="w-4 h-4 opacity-10 group-hover:opacity-30" />
    </button>
  );
}

