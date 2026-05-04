import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { LumaNote, NoteBlock, NoteTheme, NoteCategory } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { safeGetUser } from '@/lib/supabaseAuth';
import { toast } from 'sonner';

interface SupabaseNotesContextType {
  notes: LumaNote[];
  loading: boolean;
  error: string | null;
  addNote: () => Promise<LumaNote>;
  updateNote: (id: string, updates: Partial<LumaNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNote: (id: string) => LumaNote | undefined;
  refreshNotes: () => Promise<void>;
  pinNote: (id: string, pinned: boolean) => Promise<void>;
  archiveNote: (id: string, archived: boolean) => Promise<void>;
  searchNotes: (query: string) => LumaNote[];
}

const SupabaseNotesContext = createContext<SupabaseNotesContextType | undefined>(undefined);

// Fallback to localStorage key
const LOCAL_STORAGE_KEY = 'lumatha_notes_backup_v3';

const isKeepNotesMissingTableError = (err: any): boolean => {
  const message = String(err?.message || '').toLowerCase();
  return (
    err?.code === '42P01' ||
    err?.code === 'PGRST205' ||
    err?.status === 404 ||
    message.includes('keep_notes') ||
    message.includes('could not find the table')
  );
};

// Convert Supabase row to LumaNote
const rowToNote = (row: any): LumaNote => ({
  id: row.id,
  title: row.title || '',
  blocks: row.body ? parseBodyToBlocks(row.body) : [{ id: crypto.randomUUID(), type: 'text', content: '' }],
  theme: (row.color as NoteTheme) || 'deepNavy',
  category: 'all',
  isPinned: row.is_pinned || false,
  isSaved: false,
  isArchived: row.is_archived || false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  wordCount: row.word_count || 0,
  firstImageUrl: row.media_urls?.[0] || undefined,
  previewText: extractPreview(row.body),
  tags: row.tags || [],
});

// Parse body text to blocks
const parseBodyToBlocks = (body: string): NoteBlock[] => {
  if (!body) return [{ id: crypto.randomUUID(), type: 'text', content: '' }];
  
  const lines = body.split('\n');
  return lines.map((line, index) => ({
    id: crypto.randomUUID(),
    type: index === 0 ? 'text' : 'text',
    content: line,
  }));
};

// Extract preview text from body
const extractPreview = (body: string): string => {
  if (!body) return '';
  return body.slice(0, 200).replace(/\n/g, ' ');
};

// Convert LumaNote to Supabase row
const noteToRow = (note: Partial<LumaNote>, userId: string) => ({
  user_id: userId,
  title: note.title || null,
  body: note.blocks?.map(b => b.content).join('\n') || null,
  media_urls: note.firstImageUrl ? [note.firstImageUrl] : [],
  note_type: note.firstImageUrl ? 'mixed' : 'text',
  color: note.theme || '#1a2332',
  is_pinned: note.isPinned || false,
  is_archived: note.isArchived || false,
  tags: note.tags || [],
  word_count: note.wordCount || 0,
});

export const SupabaseNotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<LumaNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notesTableMissing, setNotesTableMissing] = useState(false);
  
  const pendingUpdates = useRef<Map<string, Partial<LumaNote>>>(new Map());
  const missingTableNotified = useRef(false);

  // Load user and notes
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await safeGetUser();
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setNotes([]);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Fetch notes from Supabase
  const fetchNotes = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (notesTableMissing) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch {
          setNotes([]);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('keep_notes')
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const loadedNotes = (data || []).map(rowToNote);
      setNotes(loadedNotes);

      // Backup to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loadedNotes));
    } catch (err: any) {
      console.error('Failed to fetch notes:', err);

      if (isKeepNotesMissingTableError(err)) {
        setNotesTableMissing(true);
        setError('Notes table missing. Using local notes only.');
        if (!missingTableNotified.current) {
          toast.warning('Cloud notes table is unavailable. Using local notes only.');
          missingTableNotified.current = true;
        }
      } else {
        setError(err.message);
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotes(parsed);
          toast.warning('Using offline notes. Changes will sync when online.');
        } catch (e) {
          console.error('Failed to parse saved notes', e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [notesTableMissing, userId]);

  // Initial fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId || notesTableMissing) return;

    const channel = supabase
      .channel('keep_notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'keep_notes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotes((prev) => [rowToNote(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotes((prev) =>
              prev.map((n) => (n.id === payload.new.id ? rowToNote(payload.new) : n))
            );
          } else if (payload.eventType === 'DELETE') {
            setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notesTableMissing, userId]);

  // Add a new note
  const addNote = useCallback(async (): Promise<LumaNote> => {
    if (!userId) throw new Error('Not authenticated');

    const newNote: LumaNote = {
      id: crypto.randomUUID(),
      title: '',
      blocks: [{ id: crypto.randomUUID(), type: 'text', content: '', isFocused: true }],
      theme: 'deepNavy',
      category: 'all',
      isPinned: false,
      isSaved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0,
      previewText: '',
    };

    // Optimistic update
    setNotes((prev) => [newNote, ...prev]);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newNote, ...notes]));

    if (notesTableMissing) {
      return newNote;
    }

    try {
      const { error: insertError } = await supabase
        .from('keep_notes')
        .insert({
          id: newNote.id,
          ...noteToRow(newNote, userId),
        });

      if (insertError) throw insertError;
    } catch (err: any) {
      console.error('Failed to create note:', err);
      toast.error('Failed to create note. Will retry.');
      
      // Keep in state, will sync later
    }

    return newNote;
  }, [notes, notesTableMissing, userId]);

  // Update a note
  const updateNote = useCallback(async (id: string, updates: Partial<LumaNote>): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, ...updates, updatedAt: new Date().toISOString() }
          : n
      )
    );

    if (notesTableMissing) {
      return;
    }

    // Queue for sync
    const pending = pendingUpdates.current.get(id) || {};
    pendingUpdates.current.set(id, { ...pending, ...updates });

    // Debounced sync to Supabase
    setTimeout(async () => {
      const pendingUpdate = pendingUpdates.current.get(id);
      if (!pendingUpdate) return;

      pendingUpdates.current.delete(id);

      try {
        const { error: updateError } = await supabase
          .from('keep_notes')
          .update(noteToRow(pendingUpdate, userId))
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } catch (err: any) {
        console.error('Failed to update note:', err);
        // Re-queue for retry
        pendingUpdates.current.set(id, pendingUpdate);
      }
    }, 500);
  }, [notesTableMissing, userId]);

  // Delete a note
  const deleteNote = useCallback(async (id: string): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    // Optimistic update
    setNotes((prev) => prev.filter((n) => n.id !== id));

    if (notesTableMissing) {
      toast.success('Note deleted');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('keep_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      toast.success('Note deleted');
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      toast.error('Failed to delete note');
      
      // Restore from backup
      fetchNotes();
    }
  }, [notesTableMissing, userId, fetchNotes]);

  // Get a single note
  const getNote = useCallback(
    (id: string): LumaNote | undefined => {
      return notes.find((n) => n.id === id);
    },
    [notes]
  );

  // Refresh all notes
  const refreshNotes = useCallback(async (): Promise<void> => {
    await fetchNotes();
  }, [fetchNotes]);

  // Pin/unpin a note
  const pinNote = useCallback(
    async (id: string, pinned: boolean): Promise<void> => {
      await updateNote(id, { isPinned: pinned });
      toast.success(pinned ? 'Note pinned' : 'Note unpinned');
    },
    [updateNote]
  );

  // Archive/unarchive a note
  const archiveNote = useCallback(
    async (id: string, archived: boolean): Promise<void> => {
      await updateNote(id, { isArchived: archived });
      toast.success(archived ? 'Note archived' : 'Note restored');
    },
    [updateNote]
  );

  // Search notes
  const searchNotes = useCallback(
    (query: string): LumaNote[] => {
      if (!query.trim()) return notes;
      
      const lowerQuery = query.toLowerCase();
      return notes.filter(
        (note) =>
          note.title?.toLowerCase().includes(lowerQuery) ||
          note.previewText?.toLowerCase().includes(lowerQuery) ||
          note.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
      );
    },
    [notes]
  );

  return (
    <SupabaseNotesContext.Provider
      value={{
        notes,
        loading,
        error,
        addNote,
        updateNote,
        deleteNote,
        getNote,
        refreshNotes,
        pinNote,
        archiveNote,
        searchNotes,
      }}
    >
      {children}
    </SupabaseNotesContext.Provider>
  );
};

export const useSupabaseNotes = () => {
  const context = useContext(SupabaseNotesContext);
  if (!context) {
    throw new Error('useSupabaseNotes must be used within SupabaseNotesProvider');
  }
  return context;
};

export default useSupabaseNotes;
