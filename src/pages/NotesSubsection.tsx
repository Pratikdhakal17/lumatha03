import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Type, Image, Plus, Redo2, Undo2, Sparkles, MessageSquare, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NotesSubsectionProps {
  onBack?: () => void;
}

export function NotesSubsection({ onBack }: NotesSubsectionProps) {
  const { user } = useAuth();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // State management
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Placeholder prompts
  const placeholders = [
    'Write freely...',
    'What stayed in your mind today?',
    'Capture a quiet thought...',
    'Your thoughts, nothing else...',
    'Let it flow...',
  ];
  const [placeholder, setPlaceholder] = useState(placeholders[0]);

  // Load notes on mount
  useEffect(() => {
    if (!user?.id) return;
    loadNotes();
  }, [user?.id]);

  const loadNotes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);

      // Load the most recent note or create blank
      if (data && data.length > 0) {
        loadNote(data[0].id);
      } else {
        createNewNote();
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const loadNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setActiveNoteId(noteId);
    setTitle(note.title);
    setContent(note.content);
    setHistory([note.content]);
    setHistoryIndex(0);
    setLastSaved(note.updated_at);
    setPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
  };

  const createNewNote = async () => {
    if (!user?.id) return;
    try {
      const newNote: Note = {
        id: `note_${Date.now()}`,
        user_id: user.id,
        title: '',
        content: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setActiveNoteId(newNote.id);
      setTitle('');
      setContent('');
      setHistory(['']);
      setHistoryIndex(0);
      setPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const saveNote = useCallback(async () => {
    if (!user?.id || !activeNoteId) return;

    setSaving(true);
    try {
      const existingNote = notes.find(n => n.id === activeNoteId);

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: title || 'Untitled',
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeNoteId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase.from('notes').insert({
          id: activeNoteId,
          user_id: user.id,
          title: title || 'Untitled',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      setLastSaved(new Date().toISOString());
      await loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  }, [user?.id, activeNoteId, title, content, notes]);

  // Auto-save on content change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content || title) {
        saveNote();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title, saveNote]);

  // History management
  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          saveNote();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveNote]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#060B16] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#4D7CFE] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/55 text-sm font-medium">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#060B16] flex flex-col text-white overflow-hidden">
      {/* Top Bar - Minimal */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/5 backdrop-blur-sm px-4 py-4 flex items-center justify-between"
      >
        <button
          onClick={onBack}
          className="p-2.5 hover:bg-white/5 rounded-lg transition-colors text-white/70 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-black uppercase tracking-wider text-white/92">Keep Notes</h1>
          <p className="text-[10px] text-white/40 mt-0.5">
            {lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : 'Saving...'}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={saveNote}
          disabled={saving}
          className="px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/12 text-white/90 text-xs font-bold transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Done'}
        </motion.button>
      </motion.div>

      {/* Main Editor */}
      <div className="flex-1 overflow-y-auto scroll-smooth" ref={editorRef}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl mx-auto px-4 py-8 md:py-12"
        >
          {/* Title Input - Minimal */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title..."
            className="w-full bg-transparent text-2xl md:text-3xl font-black text-white/92 placeholder:text-white/20 outline-none mb-2 transition-colors"
          />

          {/* Date info */}
          <p className="text-xs text-white/40 mb-8 font-medium uppercase tracking-widest">
            {activeNoteId && lastSaved
              ? `Edited ${new Date(lastSaved).toLocaleDateString()}`
              : 'New note'}
          </p>

          {/* Content Editor - Infinite & Free */}
          <div
            className="relative min-h-[400px] md:min-h-[500px]"
            onClick={() => {
              textAreaRef.current?.focus();
              setShowToolbar(true);
            }}
            onMouseEnter={() => setToolbarVisible(true)}
            onMouseLeave={() => !showToolbar && setToolbarVisible(false)}
          >
            <textarea
              ref={textAreaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onFocus={() => setShowToolbar(true)}
              onBlur={() => setShowToolbar(false)}
              placeholder={placeholder}
              className="w-full h-full bg-transparent text-base md:text-lg text-white/92 placeholder:text-white/20 outline-none resize-none font-light leading-relaxed"
              style={{
                minHeight: '400px',
                lineHeight: '1.8',
                letterSpacing: '0.3px',
              }}
            />

            {/* Subtle glow effect when focused */}
            <div className="absolute inset-0 pointer-events-none rounded-lg opacity-0 transition-opacity" />
          </div>

          {/* Empty state message */}
          {!content && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12 text-center"
            >
              <p className="text-white/30 text-sm leading-relaxed">
                Your thoughts are safe here.<br />
                Write without judgment.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Floating Toolbar - Hidden by Default */}
      <AnimatePresence>
        {(showToolbar || toolbarVisible) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex gap-2 shadow-2xl"
          >
            {/* Undo */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              title="Undo (⌘Z)"
            >
              <Undo2 className="w-4 h-4" />
            </motion.button>

            {/* Redo */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              title="Redo (⌘Y)"
            >
              <Redo2 className="w-4 h-4" />
            </motion.button>

            {/* Divider */}
            <div className="w-px bg-white/10" />

            {/* Add Image */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              title="Add image"
            >
              <Image className="w-4 h-4" />
            </motion.button>

            {/* Text Style */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              title="Text formatting"
            >
              <Type className="w-4 h-4" />
            </motion.button>

            {/* AI Suggestions */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-[#4D7CFE]"
              title="AI reflection"
            >
              <Sparkles className="w-4 h-4" />
            </motion.button>

            {/* Voice Note */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              title="Voice note"
            >
              <MessageSquare className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hints - subtle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-2 right-4 text-[10px] text-white/20 font-medium pointer-events-none hidden md:block"
      >
        <p>⌘S to save • ⌘Z to undo</p>
      </motion.div>
    </div>
  );
}
