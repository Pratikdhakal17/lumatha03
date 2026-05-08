import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Search, X, Folder, ArrowLeft, Trash2, FolderPlus, Upload, FileText, ChevronDown, Globe, Bookmark, Heart, Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { EducationComments } from './EducationComments';
import { DocCard } from './docs/DocCard';
import { DocViewer } from './docs/DocViewer';
import { DocUploadSheet } from './docs/DocUploadSheet';
import { CommunityDocs } from './docs/CommunityDocs';
import { openDocumentTarget } from './docs/docTools';
import { Skeleton } from '@/components/ui/skeleton';

type Document = Database['public']['Tables']['documents']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type DocumentWithProfile = Document & { profiles?: Profile };

interface DocFolder {
  id: string;
  name: string;
  docIds: string[];
}

const FOLDERS_KEY = 'lumatha_edu_folders';

const SECTION_TABS = [
  { id: 'community', label: 'Public', icon: Globe },
  { id: 'mine', label: 'Mine', icon: FileText },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'liked', label: 'Liked', icon: Heart },
  { id: 'reviewed', label: 'Reviewed', icon: Star },
];

function DocSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 animate-pulse">
      <Skeleton className="w-12 h-16 rounded-lg bg-white/10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-white/10" />
        <Skeleton className="h-3 w-1/2 bg-white/10" />
      </div>
      <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
    </div>
  );
}

export function EducationModule() {
  const { user, profile: userProfile } = useAuth();
  const [activeSection, setActiveSection] = useState('community');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCategoryLabel = SECTION_TABS.find(t => t.id === activeSection)?.label || 'Public';

  const [allDocs, setAllDocs] = useState<DocumentWithProfile[]>([]);
  const [savedDocIds, setSavedDocIds] = useState<Set<string>>(new Set());
  const [likedDocIds, setLikedDocIds] = useState<Set<string>>(new Set());
  const [commentedDocIds, setCommentedDocIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Viewer state
  const [viewingDoc, setViewingDoc] = useState<DocumentWithProfile | null>(null);

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsDocId, setCommentsDocId] = useState<string | null>(null);
  const [commentsTitle, setCommentsTitle] = useState('');

  // Folders
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [moveToFolderDocId, setMoveToFolderDocId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename dialog
  const [renameDoc, setRenameDoc] = useState<DocumentWithProfile | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_KEY);
      if (saved) setFolders(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse folders:', e);
    }
  }, []);

  const saveFolders = (f: DocFolder[]) => {
    setFolders(f);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(f));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    // Only show skeleton if loading takes more than 300ms
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = setTimeout(() => setShowSkeleton(true), 300);

    try {
      if (!user) return;
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (docsError) throw docsError;
      
      if (docs) {
        const userIds = [...new Set(docs.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, username')
          .in('id', userIds);
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setAllDocs(docs.map(doc => ({ ...doc, profiles: profilesMap.get(doc.user_id) })));
      }
      
      const [savedRes, likedRes, commentedRes] = await Promise.all([
        supabase.from('saved').select('document_id').eq('user_id', user.id).limit(500),
        supabase.from('document_reactions').select('document_id').eq('user_id', user.id).eq('reaction', 'heart'),
        supabase.from('comments').select('document_id').eq('user_id', user.id).limit(500)
      ]);

      const savedIds = (savedRes.data || []).map((s: any) => s.document_id).filter(Boolean) as string[];
      const likedIds = (likedRes.data || []).map((l: any) => l.document_id).filter(Boolean) as string[];
      const commentedIds = (commentedRes.data || []).map((c: any) => c.document_id).filter(Boolean) as string[];

      setSavedDocIds(new Set(savedIds));
      setLikedDocIds(new Set(likedIds));
      setCommentedDocIds(new Set(commentedIds));

    } catch (error) {
      console.error('Failed to load education data:', error);
      toast.error('Something went wrong loading your docs');
    } finally { 
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      setLoading(false); 
      setShowSkeleton(false);
    }
  }, [user]);

  useEffect(() => { if (user) void loadData(); }, [user, loadData]);

  const scheduleLoadData = useCallback(() => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      void loadData();
      refreshTimerRef.current = null;
    }, 220);
  }, [loadData]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`education-live-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        () => {
          scheduleLoadData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          scheduleLoadData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved' },
        () => {
          scheduleLoadData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_reactions' },
        () => {
          scheduleLoadData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleLoadData, user?.id]);

  const toggleSaveDoc = async (docId: string) => {
    if (!user) return;
    const isSaved = savedDocIds.has(docId);
    const newSaved = new Set(savedDocIds);
    
    if (isSaved) {
      newSaved.delete(docId);
      await supabase.from('saved').delete().eq('user_id', user.id).eq('document_id', docId);
    } else {
      newSaved.add(docId);
      await supabase.from('saved').insert({ user_id: user.id, document_id: docId });
    }
    setSavedDocIds(newSaved);
  };

  const deleteDoc = async (docId: string, fileUrl: string) => {
    try {
      const filePath = fileUrl.split('/documents/')[1];
      if (filePath) await supabase.storage.from('documents').remove([filePath]);
      await supabase.from('documents').delete().eq('id', docId);
      saveFolders(folders.map(f => ({ ...f, docIds: f.docIds.filter(id => id !== docId) })));
      loadData();
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleRename = async () => {
    if (!renameDoc || !renameTitle.trim()) return;
    await supabase.from('documents').update({ title: renameTitle }).eq('id', renameDoc.id);
    toast.success('Renamed!');
    setRenameDoc(null);
    loadData();
  };

  const openDocument = (fileUrl: string) => {
    openDocumentTarget(fileUrl, 'browser');
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      toast.info('Starting download...');
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Downloaded!');
    } catch { toast.error('Download failed'); }
  };

  const moveDocToFolder = (folderId: string) => {
    if (!moveToFolderDocId) return;
    const updated = folders.map(f => {
      const cleaned = { ...f, docIds: f.docIds.filter(id => id !== moveToFolderDocId) };
      if (f.id === folderId) cleaned.docIds.push(moveToFolderDocId);
      return cleaned;
    });
    saveFolders(updated);
    setMoveToFolderDocId(null);
    toast.success('Moved to folder');
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    saveFolders([...folders, { id: Date.now().toString(), name: newFolderName.trim(), docIds: [] }]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  // Filtering
  const filterBySearch = (docs: DocumentWithProfile[]) => {
    if (!search) return docs;
    const q = search.toLowerCase();
    return docs.filter(d => 
      (d.title || '').toLowerCase().includes(q) || 
      (d.profiles?.name || '').toLowerCase().includes(q) ||
      (d.profiles?.username || '').toLowerCase().includes(q)
    );
  };

  const getFilteredDocs = () => {
    let docs = filterBySearch(allDocs);
    
    if (activeSection === 'mine') return docs.filter(d => d.user_id === user?.id);
    if (activeSection === 'community') return docs.filter(d => d.visibility === 'public');
    if (activeSection === 'saved') return docs.filter(d => savedDocIds.has(d.id));
    if (activeSection === 'liked') return docs.filter(d => likedDocIds.has(d.id));
    if (activeSection === 'reviewed') return docs.filter(d => commentedDocIds.has(d.id));
    return docs;
  };

  const filteredDocs = getFilteredDocs();
  const currentFolder = folders.find(f => f.id === selectedFolder);
  const folderDocs = currentFolder ? allDocs.filter(d => currentFolder.docIds.includes(d.id) && d.user_id === user?.id) : [];

  // If viewing a doc, show full screen viewer
  if (viewingDoc) {
    return (
      <DocViewer
        doc={viewingDoc}
        onBack={() => setViewingDoc(null)}
        isSaved={savedDocIds.has(viewingDoc.id)}
        onSave={() => toggleSaveDoc(viewingDoc.id)}
        onOpenComments={() => {
          setCommentsDocId(viewingDoc.id);
          setCommentsTitle(viewingDoc.title);
          setCommentsOpen(true);
        }}
      />
    );
  }

  return (
    <div className="pb-32 bg-[#0a0f1e] min-h-screen">
      {/* Header - Profile Pic with Dropdown, Searchbar, + Button */}
      <div className="px-4 py-4 sticky top-0 bg-[#0a0f1e]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Profile Pic with Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 group">
                <Avatar className="w-10 h-10 border-2 border-white/10 group-hover:border-blue-500/50 transition-colors">
                  <AvatarImage src={userProfile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-blue-600/20 text-blue-400 text-sm font-bold uppercase">
                    {(userProfile?.name || user?.email || 'U').slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center text-[#6B7280]">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px] bg-[#1a1f35] border border-white/10 rounded-xl shadow-xl p-2">
              {SECTION_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => { setActiveSection(tab.id); setSelectedFolder(null); }}
                    className={cn(
                      "rounded-lg py-2.5 px-3 cursor-pointer flex items-center gap-2",
                      activeSection === tab.id ? "text-white bg-white/10" : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{tab.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeCategoryLabel.toLowerCase()}...`}
              className="w-full h-10 pl-10 pr-10 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-[#4B5563] text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#6B7280] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* + Upload Button */}
          <button
            onClick={() => setUploadOpen(true)}
            className="w-10 h-10 bg-primary hover:bg-primary/90 rounded-xl flex items-center justify-center text-white transition-all active:scale-90 shadow-lg shadow-primary/20"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full">
        {activeSection === 'community' ? (
          <div className="mt-6">
            {showSkeleton ? (
              <div className="px-4 space-y-4">
                {[1, 2, 3, 4].map(i => <DocSkeleton key={i} />)}
              </div>
            ) : (
              <CommunityDocs
                docs={allDocs.filter(d => d.visibility === 'public')}
                onOpenDoc={setViewingDoc}
                onSaveDoc={toggleSaveDoc}
                savedDocIds={savedDocIds}
                onOpenComments={(id, title) => {
                  setCommentsDocId(id);
                  setCommentsTitle(title);
                  setCommentsOpen(true);
                }}
                currentUserId={user?.id}
                onRenameDoc={(doc) => { setRenameDoc(doc); setRenameTitle(doc.title); }}
                onMoveToFolderDoc={(doc) => setMoveToFolderDocId(doc.id)}
                onDeleteDoc={(doc) => deleteDoc(doc.id, doc.file_url)}
              />
            )}
          </div>
        ) : selectedFolder ? (
          /* Folder view */
          <div className="px-0 sm:px-4 mt-6 space-y-4">
            <div className="flex items-center gap-3 bg-slate-900/30 p-3 rounded-2xl border border-white/5">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white rounded-xl bg-white/5" onClick={() => setSelectedFolder(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base truncate">{currentFolder?.name}</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{folderDocs.length} Documents</p>
              </div>
            </div>

            {folderDocs.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/20 rounded-[32px] border border-dashed border-white/5">
                <Folder className="w-12 h-12 mx-auto mb-3 text-slate-800" />
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Empty folder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {folderDocs.map(doc => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    isOwner={true}
                    isSaved={savedDocIds.has(doc.id)}
                    currentUserName={userProfile?.name}
                    onOpen={() => setViewingDoc(doc)}
                    onOpenInBrowser={() => openDocument(doc.file_url)}
                    onDownload={() => handleDownload(doc.file_url, doc.file_name)}
                    onRename={() => { setRenameDoc(doc); setRenameTitle(doc.title); }}
                    onMoveToFolder={() => setMoveToFolderDocId(doc.id)}
                    onDelete={() => deleteDoc(doc.id, doc.file_url)}
                    onSave={() => toggleSaveDoc(doc.id)}
                    onOpenComments={() => { setCommentsDocId(doc.id); setCommentsTitle(doc.title); setCommentsOpen(true); }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Main list view */
          <div className="space-y-6 mt-6">
            {/* Folders row (only on Mine tab) */}
            {activeSection === 'mine' && (
              <div className="px-0 sm:px-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-black text-xs uppercase tracking-widest">Folders</span>
                  <button onClick={() => setShowNewFolder(true)} className="text-primary text-[11px] font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-lg">+ New</button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder.id)}
                      className="bg-slate-900/50 border border-white/5 rounded-3xl p-4 w-[140px] shrink-0 text-left hover:border-primary/30 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-white font-bold text-xs truncate mb-1">{folder.name}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{folder.docIds.length} items</p>
                    </button>
                  ))}
                  {folders.length === 0 && (
                    <button
                      onClick={() => setShowNewFolder(true)}
                      className="flex flex-col items-center justify-center w-[140px] h-[120px] border border-dashed border-white/5 rounded-3xl text-slate-600 hover:text-primary hover:border-primary/30 transition-all"
                    >
                      <FolderPlus className="w-6 h-6 mb-2" />
                      <span className="text-[10px] font-black uppercase">Create</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Doc cards */}
            <div className="px-0 sm:px-4 space-y-4">
              {showSkeleton ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <DocSkeleton key={i} />)}
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-[32px] border border-dashed border-white/5">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-800" />
                  <p className="text-white font-bold text-base uppercase tracking-widest">No documents</p>
                  <p className="text-slate-500 text-[11px] mt-2 font-medium">Nothing found in this section yet</p>
                  <Button
                    className="mt-6 bg-primary hover:bg-primary/90 rounded-full px-8 h-11 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    onClick={() => setUploadOpen(true)}
                  >
                    Upload Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocs.map(doc => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      isOwner={doc.user_id === user?.id}
                      isSaved={savedDocIds.has(doc.id)}
                      currentUserName={userProfile?.name}
                      onOpen={() => setViewingDoc(doc)}
                      onOpenInBrowser={() => openDocument(doc.file_url)}
                      onDownload={() => handleDownload(doc.file_url, doc.file_name)}
                      onRename={doc.user_id === user?.id ? () => { setRenameDoc(doc); setRenameTitle(doc.title); } : undefined}
                      onMoveToFolder={doc.user_id === user?.id ? () => setMoveToFolderDocId(doc.id) : undefined}
                      onDelete={doc.user_id === user?.id ? () => deleteDoc(doc.id, doc.file_url) : undefined}
                      onSave={() => toggleSaveDoc(doc.id)}
                      onOpenComments={() => { setCommentsDocId(doc.id); setCommentsTitle(doc.title); setCommentsOpen(true); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sheets/Dialogs */}
      <DocUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(uploadedDoc) => {
          if (uploadedDoc && user?.id) {
            const docWithProfile = {
              ...uploadedDoc,
              profiles: {
                id: user.id,
                name: userProfile?.name || 'You',
                avatar_url: userProfile?.avatar_url || null,
              },
            } as DocumentWithProfile;
            setAllDocs((prev) => [docWithProfile, ...prev.filter((d) => d.id !== uploadedDoc.id)]);
          }
          setActiveSection('mine');
          scheduleLoadData();
        }}
      />

      <Dialog open={!!moveToFolderDocId} onOpenChange={() => setMoveToFolderDocId(null)}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-3xl">
          <DialogHeader><DialogTitle className="text-white font-bold">Move to Folder</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {folders.map(folder => (
              <Button key={folder.id} variant="outline" className="w-full justify-start gap-3 bg-slate-800/50 border-white/5 text-white hover:bg-primary/10 hover:border-primary/20 rounded-2xl h-14" onClick={() => moveDocToFolder(folder.id)}>
                <Folder className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-bold text-sm">{folder.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{folder.docIds.length} items</p>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameDoc} onOpenChange={() => setRenameDoc(null)}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-3xl">
          <DialogHeader><DialogTitle className="text-white font-bold">Rename</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Input value={renameTitle} onChange={e => setRenameTitle(e.target.value)} className="bg-slate-800 border-white/10 text-white rounded-2xl h-12" />
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-2xl h-12" onClick={handleRename} disabled={!renameTitle.trim()}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="bg-slate-900 border-white/5 rounded-3xl">
          <DialogHeader><DialogTitle className="text-white font-bold">New Folder</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <Input placeholder="Enter folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="bg-slate-800 border-white/10 text-white rounded-2xl h-12" />
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-2xl h-12" onClick={createFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EducationComments
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        documentId={commentsDocId || undefined}
        title={commentsTitle}
      />
    </div>
  );
}
