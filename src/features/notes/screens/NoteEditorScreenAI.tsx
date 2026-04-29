import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, MoreHorizontal, Pin, Bell, Archive, Trash2,
  Type, Image as ImageIcon, Video, Mic, CheckSquare, Plus,
  Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered,
  Palette, Sparkles, Save, Cloud, CloudOff,
  Tag, Hash, X, Check, Eraser, Brush, RotateCcw, RotateCw,
  AlignLeft, AlignCenter, AlignRight, Square, Minus, Aperture,
  Paintbrush, Sticker, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types for AI-Ready Block-Based System
type BlockType = 'text' | 'heading' | 'todo' | 'image' | 'video' | 'audio' | 'drawing';

interface NoteBlock {
  id: string;
  type: BlockType;
  content: any;
  order_index: number;
  ai_metadata?: {
    summary?: string;
    tags?: string[];
    ocr_text?: string;
    transcription?: string;
  };
}

interface NoteMetadata {
  id: string;
  title: string;
  type_tag: 'idea' | 'project' | 'meeting' | 'journal' | 'reminder' | 'draft';
  vibe_theme: string;
  is_pinned: boolean;
  is_archived: boolean;
  reminder_at?: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'offline';
}

const NOTE_TYPES = [
  { id: 'idea', label: 'Idea', color: 'bg-yellow-500/20 text-yellow-400', icon: Sparkles },
  { id: 'project', label: 'Project', color: 'bg-blue-500/20 text-blue-400', icon: Hash },
  { id: 'meeting', label: 'Meeting', color: 'bg-purple-500/20 text-purple-400', icon: Tag },
  { id: 'journal', label: 'Journal', color: 'bg-green-500/20 text-green-400', icon: Type },
  { id: 'reminder', label: 'Reminder', color: 'bg-red-500/20 text-red-400', icon: Bell },
  { id: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-400', icon: Save },
] as const;

const VIBE_THEMES = {
  deepNavy: { bg: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 100%)', accent: '#3B82F6' },
  midnight: { bg: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)', accent: '#8B5CF6' },
  forest: { bg: 'linear-gradient(135deg, #0a2815 0%, #1a3d2a 100%)', accent: '#10B981' },
  sunset: { bg: 'linear-gradient(135deg, #2a0a1a 0%, #3d1a2a 100%)', accent: '#F59E0B' },
  ocean: { bg: 'linear-gradient(135deg, #0a1a2a 0%, #1a3a4a 100%)', accent: '#06B6D4' },
  pureDark: { bg: '#0a0a0a', accent: '#FFFFFF' },
};

interface NoteEditorScreenAIProps {
  noteId?: string;
  onClose: () => void;
}

export const NoteEditorScreenAI: React.FC<NoteEditorScreenAIProps> = ({ noteId, onClose }) => {
  const { user } = useAuth();
  const [note, setNote] = useState<NoteMetadata | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>('synced');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // UI States
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTextFormat, setShowTextFormat] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [showDrawingMode, setShowDrawingMode] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState('deepNavy');
  const [activeColor, setActiveColor] = useState('#FFFFFF');
  const [activeBgColor, setActiveBgColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(20);
  const [isEraser, setIsEraser] = useState(false);
  const [freeDrawMode, setFreeDrawMode] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Text colors palette
  const TEXT_COLORS = [
    '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'
  ];
  
  // Background colors palette
  const BG_COLORS = [
    'transparent', '#FF6B6B20', '#4ECDC420', '#45B7D120', '#96CEB420', '#FECA5720', '#FF9FF320', '#54A0FF20',
    '#2C3E50', '#34495E', '#7F8C8D', '#1ABC9C20', '#3498DB20', '#9B59B620', '#E74C3C20', '#F39C1220'
  ];

  // Load note data
  useEffect(() => {
    if (!noteId || noteId === 'new') {
      // Create new note
      setNote({
        id: 'new',
        title: '',
        type_tag: 'idea',
        vibe_theme: 'deepNavy',
        is_pinned: false,
        is_archived: false,
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
      });
      setBlocks([{
        id: crypto.randomUUID(),
        type: 'text',
        content: '',
        order_index: 0,
      }]);
      setIsLoading(false);
      return;
    }

    loadNote(noteId);
  }, [noteId]);

  const loadNote = async (id: string) => {
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (noteError) throw noteError;

      const { data: blocksData, error: blocksError } = await supabase
        .from('note_blocks')
        .select('*')
        .eq('note_id', id)
        .order('order_index', { ascending: true });

      if (blocksError) throw blocksError;

      setNote(noteData);
      setBlocks(blocksData || []);
      setActiveTheme(noteData.vibe_theme || 'deepNavy');
      setLastSaved(new Date(noteData.updated_at));
    } catch (err) {
      console.error('Error loading note:', err);
      toast.error('Failed to load note');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save functionality
  const saveNote = useCallback(async () => {
    if (!note || !user) return;

    setIsSaving(true);
    setSyncStatus('pending');

    try {
      if (note.id === 'new') {
        // Create new note
        const { data: newNote, error } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: note.title,
            type_tag: note.type_tag,
            vibe_theme: note.vibe_theme,
            is_pinned: note.is_pinned,
            is_archived: note.is_archived,
            reminder_at: note.reminder_at,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert blocks
        if (blocks.length > 0) {
          const { error: blocksError } = await supabase
            .from('note_blocks')
            .insert(
              blocks.map(b => ({
                note_id: newNote.id,
                type: b.type,
                content: b.content,
                order_index: b.order_index,
              }))
            );

          if (blocksError) throw blocksError;
        }

        setNote({ ...note, id: newNote.id });
        toast.success('Note created');
      } else {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: note.title,
            type_tag: note.type_tag,
            vibe_theme: note.vibe_theme,
            is_pinned: note.is_pinned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', note.id);

        if (error) throw error;

        // Sync blocks (upsert)
        for (const block of blocks) {
          const { error: blockError } = await supabase
            .from('note_blocks')
            .upsert({
              id: block.id,
              note_id: note.id,
              type: block.type,
              content: block.content,
              order_index: block.order_index,
            });

          if (blockError) console.error('Block sync error:', blockError);
        }
      }

      setSyncStatus('synced');
      setLastSaved(new Date());
    } catch (err) {
      console.error('Save error:', err);
      setSyncStatus('offline');
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [note, blocks, user]);

  // Debounced auto-save
  useEffect(() => {
    if (!note) return;

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      saveNote();
    }, 2000);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [note, blocks]);

  // Block management
  const addBlock = (type: BlockType, afterBlockId?: string) => {
    const newBlock: NoteBlock = {
      id: crypto.randomUUID(),
      type,
      content: getDefaultContent(type),
      order_index: blocks.length,
    };

    if (afterBlockId) {
      const insertIndex = blocks.findIndex(b => b.id === afterBlockId) + 1;
      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);
      // Reorder indices
      newBlocks.forEach((b, i) => b.order_index = i);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }

    setFocusedBlockId(newBlock.id);
    setShowCommandCenter(false);
  };

  const getDefaultContent = (type: BlockType) => {
    switch (type) {
      case 'text': return '';
      case 'heading': return { level: 1, text: '' };
      case 'todo': return [{ text: '', checked: false }];
      case 'image': return { url: '', caption: '', width: 100 };
      case 'video': return { url: '', caption: '', width: 100 };
      case 'audio': return { url: '', duration: 0, transcription: '' };
      case 'drawing': return { paths: [] };
      default: return '';
    }
  };

  const updateBlock = (blockId: string, updates: Partial<NoteBlock>) => {
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, ...updates } : b
    ));
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
    supabase.from('note_blocks').delete().eq('id', blockId);
  };

  // Text selection handling for format bar
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      setSelectedText(text);
      setShowFormatBar(text.length > 0);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleArchive = async () => {
    if (!note || note.id === 'new') return;
    await supabase.from('notes').update({ is_archived: true }).eq('id', note.id);
    toast.success('Note archived');
    onClose();
  };

  const handleDelete = async () => {
    if (!note || note.id === 'new') return;
    if (!confirm('Delete this note permanently?')) return;
    await supabase.from('notes').delete().eq('id', note.id);
    toast.success('Note deleted');
    onClose();
  };

  const handlePin = async () => {
    if (!note) return;
    const newPinned = !note.is_pinned;
    setNote({ ...note, is_pinned: newPinned });
    if (note.id !== 'new') {
      await supabase.from('notes').update({ is_pinned: newPinned }).eq('id', note.id);
    }
    toast.success(newPinned ? 'Note pinned' : 'Note unpinned');
  };

  const theme = VIBE_THEMES[activeTheme as keyof typeof VIBE_THEMES] || VIBE_THEMES.deepNavy;
  const noteType = NOTE_TYPES.find(t => t.id === note?.type_tag) || NOTE_TYPES[0];

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{ background: theme.bg }}
      ref={containerRef}
    >
      {/* ====== AI-READY HEADER ====== */}
      <header className="flex items-center justify-between px-4 h-16 shrink-0 z-30 bg-black/20 backdrop-blur-xl border-b border-white/5">
        {/* Left: Back + Type Badge */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { saveNote(); onClose(); }}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all text-white/70 hover:text-white active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Type Badge - AI Metadata Layer */}
          <button
            onClick={() => setShowTypePicker(!showTypePicker)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              noteType.color
            )}
          >
            <noteType.icon className="w-3.5 h-3.5" />
            {noteType.label}
          </button>
        </div>

        {/* Center: Title Input */}
        <div className="flex-1 max-w-md mx-4">
          <input
            type="text"
            value={note?.title || ''}
            onChange={(e) => setNote(note ? { ...note, title: e.target.value } : null)}
            placeholder="What's on your mind?"
            className="w-full bg-transparent text-center text-lg font-semibold text-white placeholder:text-white/30 outline-none"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Pin */}
          <button
            onClick={handlePin}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90",
              note?.is_pinned ? "text-yellow-400 bg-yellow-400/20" : "text-white/50 hover:text-white hover:bg-white/10"
            )}
          >
            <Pin className={cn("w-4 h-4", note?.is_pinned && "fill-current")} />
          </button>

          {/* Reminder */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMoreMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#0f0f23] backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-30"
                  >
                    <button
                      onClick={() => { handleArchive(); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-white/70 hover:bg-white/5 rounded-xl transition-all text-left text-sm"
                    >
                      <Archive className="w-4 h-4" /> Archive
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button
                      onClick={() => { handleDelete(); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-left text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Type Picker */}
      <AnimatePresence>
        {showTypePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-black/30 backdrop-blur-xl border-b border-white/5 overflow-hidden"
          >
            <div className="flex gap-2 p-3 overflow-x-auto">
              {NOTE_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setNote(note ? { ...note, type_tag: type.id } : null);
                    setShowTypePicker(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    note?.type_tag === type.id
                      ? type.color
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== BLOCK-BASED CONTENT AREA ====== */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {blocks.map((block, index) => (
          <BlockComponent
            key={block.id}
            block={block}
            isFocused={focusedBlockId === block.id}
            onFocus={() => setFocusedBlockId(block.id)}
            onUpdate={(updates) => updateBlock(block.id, updates)}
            onDelete={() => deleteBlock(block.id)}
            onAddBelow={(type) => addBlock(type, block.id)}
            theme={theme}
          />
        ))}

        {/* Add Block Button */}
        <button
          onClick={() => setShowCommandCenter(true)}
          className="w-full py-4 flex items-center justify-center gap-2 text-white/30 hover:text-white/60 transition-all rounded-xl border border-dashed border-white/10 hover:border-white/30"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">Add block</span>
        </button>
      </main>

      {/* ====== COMPREHENSIVE BOTTOM TOOLBAR ====== */}
      <footer className="pb-safe px-2 pt-2 flex flex-col items-center gap-2 z-30">
        
        {/* Drawing Mode Panel - Shows when clicking Draw */}
        <AnimatePresence>
          {showDrawingMode && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f0f23]/98 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
            >
              <p className="text-xs text-white/50 mb-3 text-center">Choose Drawing Mode</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    addBlock('drawing');
                    setShowDrawingMode(false);
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Square className="w-8 h-8 text-blue-400" />
                  <span className="text-sm text-white/80">Take Sheet</span>
                  <span className="text-[10px] text-white/40">A4 canvas block</span>
                </button>
                <button
                  onClick={() => {
                    setFreeDrawMode(true);
                    setShowDrawingMode(false);
                    toast.success('Free draw mode enabled - draw anywhere!');
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <Paintbrush className="w-8 h-8 text-pink-400" />
                  <span className="text-sm text-white/80">Draw Free</span>
                  <span className="text-[10px] text-white/40">Draw anywhere like Instagram</span>
                </button>
              </div>
              <button
                onClick={() => setShowDrawingMode(false)}
                className="w-full mt-3 py-2 text-xs text-white/40 hover:text-white/60"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Media Panel - Shows when clicking + */}
        <AnimatePresence>
          {showCommandCenter && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f0f23]/98 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl"
            >
              <div className="grid grid-cols-4 gap-2">
                <CommandButton icon={ImageIcon} label="Image" onClick={() => addBlock('image')} color="text-blue-400" />
                <CommandButton icon={Video} label="Video" onClick={() => addBlock('video')} color="text-purple-400" />
                <CommandButton icon={Mic} label="Audio" onClick={() => addBlock('audio')} color="text-pink-400" />
                <CommandButton icon={Sticker} label="Drawing" onClick={() => { setShowCommandCenter(false); setShowDrawingMode(true); }} color="text-orange-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Format Panel */}
        <AnimatePresence>
          {showTextFormat && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f0f23]/98 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl"
            >
              <p className="text-xs text-white/50 mb-2">Text Format</p>
              <div className="flex items-center gap-2">
                <ToolbarButton icon={Type} label="Normal" onClick={() => applyTextFormat('normal')} />
                <ToolbarButton icon={Bold} label="Bold" onClick={() => applyTextFormat('bold')} />
                <ToolbarButton icon={Italic} label="Italic" onClick={() => applyTextFormat('italic')} />
                <ToolbarButton icon={Underline} label="Underline" onClick={() => applyTextFormat('underline')} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Panel */}
        <AnimatePresence>
          {showLayoutMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f0f23]/98 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl"
            >
              <p className="text-xs text-white/50 mb-2">Layout</p>
              <div className="grid grid-cols-4 gap-2">
                <ToolbarButton icon={Heading1} label="H1" onClick={() => { addBlock('heading'); setShowLayoutMenu(false); }} />
                <ToolbarButton icon={Heading2} label="H2" onClick={() => { addBlock('heading'); setShowLayoutMenu(false); }} />
                <ToolbarButton icon={List} label="Dots" onClick={() => { addBlock('todo'); setShowLayoutMenu(false); }} />
                <ToolbarButton icon={ListOrdered} label="1,2,3" onClick={() => { addBlock('text'); setShowLayoutMenu(false); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color Picker Panel */}
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f0f23]/98 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl"
            >
              <p className="text-xs text-white/50 mb-2">Text Color</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setActiveColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      activeColor === color ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="text-xs text-white/50 mb-2">Background</p>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setActiveBgColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-lg border border-white/20 transition-all",
                      activeBgColor === color ? "ring-2 ring-white" : ""
                    )}
                    style={{ backgroundColor: color === 'transparent' ? '#ffffff10' : color }}
                  >
                    {color === 'transparent' && <Minus className="w-4 h-4 mx-auto text-white/40" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brush Settings Panel */}
        <AnimatePresence>
          {showBrushSettings && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0f0f23]/98 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/50">Brush Size: {brushSize}px</p>
                <p className="text-xs text-white/50">Eraser: {eraserSize}px</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Brush className="w-4 h-4 text-white/40" />
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  />
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: activeColor, transform: `scale(${brushSize / 10})` }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Eraser className="w-4 h-4 text-white/40" />
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={eraserSize}
                    onChange={(e) => setEraserSize(parseInt(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  />
                  <div 
                    className="rounded-full border-2 border-white/40" 
                    style={{ width: eraserSize / 3, height: eraserSize / 3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Free Draw Exit Notice */}
        <AnimatePresence>
          {freeDrawMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/20 border border-pink-500/30"
            >
              <Paintbrush className="w-3 h-3 text-pink-400" />
              <span className="text-xs text-pink-300">Free Draw Mode</span>
              <button
                onClick={() => setFreeDrawMode(false)}
                className="ml-1 text-xs text-pink-300/60 hover:text-pink-300"
              >
                Exit
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Bottom Toolbar */}
        <div className="flex items-center justify-center gap-1 w-full max-w-md px-2">
          {/* + Add Media */}
          <ToolbarIconButton
            icon={Plus}
            isActive={showCommandCenter}
            onClick={() => {
              setShowCommandCenter(!showCommandCenter);
              closeOtherPanels('command');
            }}
            label="Add"
          />

          {/* Aa Text Format */}
          <ToolbarIconButton
            icon={Type}
            isActive={showTextFormat}
            onClick={() => {
              setShowTextFormat(!showTextFormat);
              closeOtherPanels('text');
            }}
            label="Aa"
            customIcon={<span className="text-sm font-bold">Aa</span>}
          />

          {/* Layout */}
          <ToolbarIconButton
            icon={Layers}
            isActive={showLayoutMenu}
            onClick={() => {
              setShowLayoutMenu(!showLayoutMenu);
              closeOtherPanels('layout');
            }}
            label="Layout"
          />

          {/* Color Palette */}
          <ToolbarIconButton
            icon={Palette}
            isActive={showColorPicker}
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              closeOtherPanels('color');
            }}
            label="Colors"
            accent={activeColor}
          />

          {/* Brush Settings */}
          <ToolbarIconButton
            icon={Brush}
            isActive={showBrushSettings}
            onClick={() => {
              setShowBrushSettings(!showBrushSettings);
              closeOtherPanels('brush');
            }}
            label="Brush"
          />

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Previous/Undo */}
          <ToolbarIconButton
            icon={RotateCcw}
            onClick={handleUndo}
            label="Undo"
          />

          {/* Next/Redo */}
          <ToolbarIconButton
            icon={RotateCw}
            onClick={handleRedo}
            label="Redo"
          />

          {/* Erase Mode Toggle */}
          <ToolbarIconButton
            icon={Eraser}
            isActive={isEraser}
            onClick={() => setIsEraser(!isEraser)}
            label="Erase"
            activeColor="text-orange-400"
          />
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          {syncStatus === 'synced' ? (
            <>
              <Cloud className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-white/50">{lastSaved ? formatTime(lastSaved) : 'Saved'}</span>
            </>
          ) : syncStatus === 'pending' ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5 border-2 border-white/20 border-t-white rounded-full" />
              <span className="text-[10px] text-white/50">Saving...</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] text-white/50">Offline</span>
            </>
          )}
        </div>
      </footer>
    </motion.div>
  );
};

// ====== HELPER FUNCTIONS ======

const closeOtherPanels = (keepOpen: string) => {
  if (keepOpen !== 'command') setShowCommandCenter(false);
  if (keepOpen !== 'text') setShowTextFormat(false);
  if (keepOpen !== 'layout') setShowLayoutMenu(false);
  if (keepOpen !== 'color') setShowColorPicker(false);
  if (keepOpen !== 'brush') setShowBrushSettings(false);
  if (keepOpen !== 'draw') setShowDrawingMode(false);
};

const applyTextFormat = (format: string) => {
  // Apply text formatting to selected text or current block
  const selection = window.getSelection();
  if (selection && selection.toString()) {
    document.execCommand(format === 'bold' ? 'bold' : format === 'italic' ? 'italic' : format === 'underline' ? 'underline' : 'removeFormat', false);
  }
  toast.success(`Text format: ${format}`);
  setShowTextFormat(false);
};

const handleUndo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    setBlocks(drawingHistory[historyIndex - 1]);
    toast.success('Undo');
  } else {
    document.execCommand('undo', false);
  }
};

const handleRedo = () => {
  if (historyIndex < drawingHistory.length - 1) {
    setHistoryIndex(historyIndex + 1);
    setBlocks(drawingHistory[historyIndex + 1]);
    toast.success('Redo');
  } else {
    document.execCommand('redo', false);
  }
};

// ====== SUB-COMPONENTS ======

const ToolbarIconButton = ({ 
  icon: Icon, 
  isActive, 
  onClick, 
  label, 
  accent, 
  customIcon,
  activeColor 
}: { 
  icon: any; 
  isActive?: boolean; 
  onClick: () => void; 
  label: string;
  accent?: string;
  customIcon?: React.ReactNode;
  activeColor?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all active:scale-90 min-w-[48px]",
      isActive 
        ? "bg-white/20 text-white" 
        : "text-white/50 hover:text-white hover:bg-white/10"
    )}
    title={label}
  >
    {customIcon ? customIcon : (
      <Icon 
        className={cn("w-5 h-5", activeColor)} 
        style={accent ? { color: accent } : undefined}
      />
    )}
    <span className="text-[9px]">{label}</span>
  </button>
);

const ToolbarButton = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-95"
  >
    <Icon className="w-5 h-5 text-white/70" />
    <span className="text-[10px] text-white/50">{label}</span>
  </button>
);

const FormatButton = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <button
    className="w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90"
    title={label}
  >
    <Icon className="w-4 h-4" />
  </button>
);

const CommandButton = ({ icon: Icon, label, onClick, color = 'text-white' }: { 
  icon: any; 
  label: string; 
  onClick: () => void;
  color?: string;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95"
  >
    <Icon className={cn("w-6 h-6", color)} />
    <span className="text-xs text-white/60">{label}</span>
  </button>
);

const BlockComponent = ({ 
  block, 
  isFocused, 
  onFocus, 
  onUpdate, 
  onDelete, 
  onAddBelow,
  theme 
}: {
  block: NoteBlock;
  isFocused: boolean;
  onFocus: () => void;
  onUpdate: (updates: Partial<NoteBlock>) => void;
  onDelete: () => void;
  onAddBelow: (type: BlockType) => void;
  theme: { bg: string; accent: string };
}) => {
  const renderContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onFocus={onFocus}
            placeholder="Start typing..."
            className="w-full bg-transparent text-white/90 placeholder:text-white/30 outline-none resize-none min-h-[24px] leading-relaxed"
            rows={Math.max(1, block.content.split('\n').length)}
          />
        );
      case 'heading':
        const level = block.content?.level || 1;
        const text = block.content?.text || '';
        const sizes = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg' };
        return (
          <input
            type="text"
            value={text}
            onChange={(e) => onUpdate({ content: { ...block.content, text: e.target.value } })}
            onFocus={onFocus}
            placeholder={`Heading ${level}`}
            className={cn(
              "w-full bg-transparent font-bold text-white placeholder:text-white/30 outline-none",
              sizes[level as keyof typeof sizes]
            )}
          />
        );
      case 'todo':
        const todos = block.content || [];
        return (
          <div className="space-y-2">
            {todos.map((todo: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newTodos = [...todos];
                    newTodos[idx].checked = !newTodos[idx].checked;
                    onUpdate({ content: newTodos });
                  }}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                    todo.checked
                      ? "bg-green-500 border-green-500"
                      : "border-white/30 hover:border-white/50"
                  )}
                >
                  {todo.checked && <Check className="w-3 h-3 text-white" />}
                </button>
                <input
                  type="text"
                  value={todo.text}
                  onChange={(e) => {
                    const newTodos = [...todos];
                    newTodos[idx].text = e.target.value;
                    onUpdate({ content: newTodos });
                  }}
                  className={cn(
                    "flex-1 bg-transparent text-white/90 outline-none",
                    todo.checked && "line-through text-white/40"
                  )}
                  placeholder="To-do item..."
                />
              </div>
            ))}
          </div>
        );
      case 'image':
        return (
          <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
            {block.content?.url ? (
              <img 
                src={block.content.url} 
                alt={block.content.caption || 'Note image'}
                className="w-full h-auto max-h-64 object-cover"
              />
            ) : (
              <div className="p-8 flex flex-col items-center gap-3 text-white/30">
                <ImageIcon className="w-10 h-10" />
                <span className="text-sm">Tap to add image</span>
              </div>
            )}
            <input
              type="text"
              value={block.content?.caption || ''}
              onChange={(e) => onUpdate({ content: { ...block.content, caption: e.target.value } })}
              placeholder="Add caption..."
              className="w-full px-4 py-2 bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none border-t border-white/10"
            />
          </div>
        );
      default:
        return (
          <div className="text-white/50 text-sm">
            {block.type} block (coming soon)
          </div>
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-2xl transition-all",
        isFocused ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      {/* Block Actions (visible on hover/focus) */}
      <div className={cn(
        "absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 transition-opacity",
        isFocused && "opacity-100"
      )}>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Block Content */}
      <div 
        className="p-4"
        onClick={onFocus}
      >
        {renderContent()}
      </div>

      {/* Add Below Button */}
      <div className={cn(
        "absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 transition-opacity",
        isFocused && "opacity-100"
      )}>
        <button
          onClick={() => onAddBelow('text')}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export default NoteEditorScreenAI;
