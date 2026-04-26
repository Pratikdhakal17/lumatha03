import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Filter, Archive, Pin } from 'lucide-react';
import { useSupabaseNotes } from '../context/SupabaseNotesContext';
import { NoteCardV2 } from '../components/NoteCardV2';
import { KeepNotesEditor } from './KeepNotesEditor';
import { LumaNote } from '../types';

type FilterTab = 'all' | 'pinned' | 'archived';

export const NotesListScreenV2: React.FC = () => {
  const { 
    notes, 
    loading, 
    addNote, 
    deleteNote, 
    updateNote, 
    pinNote, 
    archiveNote,
    searchNotes 
  } = useSupabaseNotes();
  
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Handle creating a new note
  const handleCreateNote = useCallback(async () => {
    const newNote = await addNote();
    setEditingNoteId(newNote.id);
  }, [addNote]);

  // Filter notes based on tab and search
  const filteredNotes = useMemo(() => {
    let result = notes;

    // Apply tab filter
    switch (activeFilter) {
      case 'pinned':
        result = result.filter(n => n.isPinned && !n.isArchived);
        break;
      case 'archived':
        result = result.filter(n => n.isArchived);
        break;
      case 'all':
      default:
        result = result.filter(n => !n.isArchived);
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      result = searchNotes(searchQuery);
      // Re-apply tab filter after search
      switch (activeFilter) {
        case 'pinned':
          result = result.filter(n => n.isPinned && !n.isArchived);
          break;
        case 'archived':
          result = result.filter(n => n.isArchived);
          break;
        case 'all':
        default:
          result = result.filter(n => !n.isArchived);
          break;
      }
    }

    // Sort: pinned first, then by updated_at
    return [...result].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, activeFilter, searchQuery, searchNotes]);

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { title: string; notes: LumaNote[] }[] = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const todayNotes: LumaNote[] = [];
    const yesterdayNotes: LumaNote[] = [];
    const thisWeekNotes: LumaNote[] = [];
    const lastWeekNotes: LumaNote[] = [];
    const thisMonthNotes: LumaNote[] = [];
    const olderNotes: LumaNote[] = [];

    filteredNotes.forEach(note => {
      const noteDate = new Date(note.updatedAt);
      noteDate.setHours(0, 0, 0, 0);

      if (noteDate.getTime() === today.getTime()) {
        todayNotes.push(note);
      } else if (noteDate.getTime() === yesterday.getTime()) {
        yesterdayNotes.push(note);
      } else if (noteDate >= thisWeekStart) {
        thisWeekNotes.push(note);
      } else if (noteDate >= lastWeekStart) {
        lastWeekNotes.push(note);
      } else if (noteDate >= thisMonthStart) {
        thisMonthNotes.push(note);
      } else {
        olderNotes.push(note);
      }
    });

    if (todayNotes.length) groups.push({ title: 'Today', notes: todayNotes });
    if (yesterdayNotes.length) groups.push({ title: 'Yesterday', notes: yesterdayNotes });
    if (thisWeekNotes.length) groups.push({ title: 'This Week', notes: thisWeekNotes });
    if (lastWeekNotes.length) groups.push({ title: 'Last Week', notes: lastWeekNotes });
    if (thisMonthNotes.length) groups.push({ title: 'This Month', notes: thisMonthNotes });
    if (olderNotes.length) groups.push({ title: 'Older', notes: olderNotes });

    return groups;
  }, [filteredNotes]);

  // Tab configuration
  const tabs: { id: FilterTab; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'pinned', label: 'Pinned', icon: Pin },
    { id: 'archived', label: 'Archived', icon: Archive },
  ];

  return (
    <div className="flex flex-col h-full bg-[#070B14] text-[#E6E9F2]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 space-y-4 shrink-0">
        {/* Title and Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Keep Notes</h1>
            <p className="text-xs text-[#8A90A2] mt-0.5">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
          <button
            onClick={handleCreateNote}
            className="w-10 h-10 rounded-full bg-[#7B61FF] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            aria-label="Create note"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`
                h-9 px-4 rounded-full text-xs font-bold transition-all flex items-center gap-1.5
                ${activeFilter === tab.id 
                  ? 'bg-[#7B61FF] text-white shadow-lg shadow-primary/20' 
                  : 'bg-white/5 text-[#8A90A2] hover:text-[#E6E9F2] hover:bg-white/10'
                }
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A90A2]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setIsSearching(false)}
            placeholder="Search notes..."
            className={`
              w-full h-11 rounded-[14px] bg-[#0F1629] border pl-10 pr-10 text-sm text-[#E6E9F2] 
              placeholder:text-[#8A90A2] outline-none transition-all
              ${isSearching 
                ? 'border-[#7B61FF]/70 shadow-[0_0_0_4px_rgba(123,97,255,0.16)]' 
                : 'border-white/10 hover:border-white/20'
              }
            `}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[#8A90A2] hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="h-32 rounded-[20px] bg-[#0F1629] animate-pulse"
              />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#0F1629] flex items-center justify-center mb-4">
              {searchQuery ? (
                <Search className="w-8 h-8 text-[#8A90A2]" />
              ) : (
                <Plus className="w-8 h-8 text-[#8A90A2]" />
              )}
            </div>
            <p className="text-[#8A90A2] text-sm font-medium">
              {searchQuery 
                ? 'No notes found matching your search'
                : activeFilter === 'archived'
                  ? 'No archived notes'
                  : activeFilter === 'pinned'
                    ? 'No pinned notes'
                    : 'No notes yet. Tap + to create one.'
              }
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <button
                onClick={handleCreateNote}
                className="mt-4 px-4 py-2 rounded-full bg-[#7B61FF]/20 text-[#7B61FF] text-sm font-bold hover:bg-[#7B61FF]/30 transition-colors"
              >
                Create your first note
              </button>
            )}
          </div>
        ) : (
          // Grouped notes
          <div className="space-y-6">
            {groupedNotes.map((group) => (
              <section key={group.title}>
                <h3 className="text-[11px] font-black text-[#8A90A2] uppercase tracking-[0.2em] mb-3 sticky top-0 bg-[#070B14] py-2 z-10">
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout">
                    {group.notes.map((note) => (
                      <NoteCardV2
                        key={note.id}
                        note={note}
                        onClick={() => setEditingNoteId(note.id)}
                        onDelete={() => deleteNote(note.id)}
                        onPin={() => pinNote(note.id, !note.isPinned)}
                        onArchive={() => archiveNote(note.id, !note.isArchived)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Note Editor */}
      <AnimatePresence>
        {editingNoteId && (
          <KeepNotesEditor 
            noteId={editingNoteId} 
            onClose={() => setEditingNoteId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesListScreenV2;
