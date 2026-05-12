import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Code, MessageCircle, Share2, Bookmark, Heart, Upload, Filter } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { toast } from 'sonner';

type FilterKey = 'all' | 'liked' | 'saved' | 'commented' | 'yours';
type PostRow = Database['public']['Tables']['posts']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface ProjectPost extends PostRow {
  profiles?: ProfileRow | null;
}

export default function FunPun() {
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [filterActive, setFilterActive] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ProjectPost[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [likedProjectIds, setLikedProjectIds] = useState<Set<string>>(new Set());
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [commentedProjectIds, setCommentedProjectIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOptionsMenu]);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('visibility', 'public')
        .eq('category', 'abdev')
        .order('created_at', { ascending: false })
        .limit(60);

      if (postsError) throw postsError;

      const nextProjects = (postsData || []) as ProjectPost[];
      setProjects(nextProjects);
      setSelectedProject((current) => {
        if (current && nextProjects.some((project) => project.id === current)) return current;
        return nextProjects[0]?.id ?? null;
      });

      if (user?.id) {
        const [savedResult, likedResult, commentedResult] = await Promise.all([
          supabase.from('saved').select('post_id').eq('user_id', user.id),
          supabase.from('likes').select('post_id').eq('user_id', user.id),
          supabase.from('comments').select('post_id').eq('user_id', user.id).not('post_id', 'is', null),
        ]);

        setSavedProjectIds(new Set(savedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
        setLikedProjectIds(new Set(likedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
        setCommentedProjectIds(new Set(commentedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
      } else {
        setSavedProjectIds(new Set());
        setLikedProjectIds(new Set());
        setCommentedProjectIds(new Set());
      }
    } catch (error) {
      console.error('Error loading AB Dev projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const avatar = profile?.avatar || profile?.photo_url || '/lumatha-logo-new.png';
  const currentProject = useMemo(
    () => projects.find((project) => project.id === selectedProject) || projects[0] || null,
    [projects, selectedProject],
  );

  const visibleProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const title = (project.title || '').toLowerCase();
      const content = (project.content || '').toLowerCase();
      const authorName = (project.profiles?.name || project.profiles?.username || '').toLowerCase();
      const matchesSearch = !normalizedSearch || title.includes(normalizedSearch) || content.includes(normalizedSearch) || authorName.includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (filterActive === 'liked') return likedProjectIds.has(project.id);
      if (filterActive === 'saved') return savedProjectIds.has(project.id);
      if (filterActive === 'commented') return commentedProjectIds.has(project.id);
      if (filterActive === 'yours') return user?.id ? project.user_id === user.id : false;
      return true;
    });
  }, [projects, searchQuery, filterActive, likedProjectIds, savedProjectIds, commentedProjectIds, user?.id]);

  const isCurrentLiked = currentProject ? likedProjectIds.has(currentProject.id) : false;
  const isCurrentSaved = currentProject ? savedProjectIds.has(currentProject.id) : false;

  const openPlayer = useCallback(() => setShowPlayer(true), []);
  const closePlayer = useCallback(() => setShowPlayer(false), []);
  const openProject = useCallback((project: ProjectPost) => {
    if (project.file_url) {
      window.open(project.file_url, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelectedProject(project.id);
    setShowPlayer(true);
  }, []);

  const toggleLike = useCallback(async (projectId: string = currentProject?.id || '') => {
    if (!user?.id || !projectId) return;

    const nextLiked = !likedProjectIds.has(projectId);
    try {
      if (nextLiked) {
        const { error } = await supabase.from('likes').insert({ post_id: projectId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes').delete().eq('post_id', projectId).eq('user_id', user.id);
        if (error) throw error;
      }

      setLikedProjectIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) next.add(projectId);
        else next.delete(projectId);
        return next;
      });

      setProjects((prev) => prev.map((project) => {
        if (project.id !== projectId) return project;
        const currentLikes = project.likes_count || 0;
        return { ...project, likes_count: nextLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1) };
      }));
    } catch (error) {
      console.error('Failed to update like:', error);
      toast.error('Could not update like');
    }
  }, [currentProject, likedProjectIds, user?.id]);

  const toggleSave = useCallback(async (projectId: string = currentProject?.id || '') => {
    if (!user?.id || !projectId) return;

    const nextSaved = !savedProjectIds.has(projectId);
    try {
      if (nextSaved) {
        const { error } = await supabase.from('saved').insert({ post_id: projectId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved').delete().eq('post_id', projectId).eq('user_id', user.id);
        if (error) throw error;
      }

      setSavedProjectIds((prev) => {
        const next = new Set(prev);
        if (nextSaved) next.add(projectId);
        else next.delete(projectId);
        return next;
      });
    } catch (error) {
      console.error('Failed to update save:', error);
      toast.error('Could not update save');
    }
  }, [currentProject, savedProjectIds, user?.id]);

  const handlePublish = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please sign in to publish');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;

      if (projectFile) {
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${projectFile.name.replace(/\s+/g, '_')}`;
        const safeContentType = projectFile.type && projectFile.type !== 'text/html'
          ? projectFile.type
          : 'application/octet-stream';
        const { error: uploadError } = await supabase.storage.from('posts-media').upload(filePath, projectFile, {
          cacheControl: '31536000',
          contentType: safeContentType,
        });

        if (uploadError) {
          console.warn('Attachment upload skipped:', uploadError);
          toast.warning('Project published without file attachment');
        } else {
          fileUrl = getPublicUrlSafe('posts-media', filePath);
          fileType = safeContentType;
        }
      }

      const payload = {
        user_id: user.id,
        title: projectName.trim(),
        content: projectDesc.trim() || null,
        file_url: fileUrl,
        file_type: fileType,
        media_types: fileType ? [fileType] : [],
        media_type: fileType?.startsWith('video') ? 'video' : fileType?.startsWith('image') ? 'image' : fileUrl ? 'file' : 'text',
        visibility: 'public',
        category: 'abdev',
        post_type: 'post',
        audience: 'public',
        is_anonymous: false,
        is_private: false,
        allow_comments: true,
        allow_sharing: true,
        shield_enabled: false,
        location: profile?.country || null,
        tagged_user_ids: [],
        likes_count: 0,
        shares_count: 0,
        views_count: 0,
      };

      const { data, error } = await supabase.from('posts').insert(payload).select('*, profiles(*)').maybeSingle();
      if (error) throw error;

      const createdProject = data as ProjectPost | null;
      if (createdProject) {
        setProjects((prev) => [createdProject, ...prev]);
        setSelectedProject(createdProject.id);
      }

      toast.success(`${projectName} published successfully!`);
      setShowUploadModal(false);
      setProjectName('');
      setProjectDesc('');
      setProjectFile(null);
    } catch (error) {
      console.error('Failed to publish project:', error);
      toast.error('Failed to publish project');
    }
  }, [currentProject, projectDesc, projectFile, projectName, profile?.country, user?.id]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0a0f1e] to-[#0f1424] text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-700">
            <Code className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AB Dev</h1>
            <p className="text-sm text-muted-foreground mt-1">Ambitious Beginner Developer is a place where you can see developer projects and able to upload yours too with sharing your idea for some suggestion.</p>
          </div>
        </div>
      </header>

      <div className="w-full max-w-4xl flex items-start gap-4 mb-6 relative">
        <div className="flex-shrink-0 relative">
          <button onClick={() => setShowOptionsMenu((value) => !value)} className="hover:opacity-80 transition">
            <Avatar className="cursor-pointer">
              <AvatarImage src={avatar} alt="profile" />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
          </button>
          {showOptionsMenu && (
            <div ref={menuRef} className="absolute top-12 left-0 bg-[#0a0f1e] border border-white/10 rounded-lg p-2 space-y-1 z-40 w-40">
              <button onClick={() => { void toggleLike(); setShowOptionsMenu(false); }} disabled={!currentProject} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50">
                <Heart className="w-4 h-4" />
                {isCurrentLiked ? 'Unlike' : 'Like'}
              </button>
              <button onClick={() => { toast.info('Open comments from the project feed card.'); setShowOptionsMenu(false); }} disabled={!currentProject} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50">
                <MessageCircle className="w-4 h-4" />
                Comment
              </button>
              <button onClick={() => { toast.info('Share is available from the project card.'); setShowOptionsMenu(false); }} disabled={!currentProject} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button onClick={() => { void toggleSave(); setShowOptionsMenu(false); }} disabled={!currentProject} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded flex items-center gap-2 disabled:opacity-50">
                <Bookmark className="w-4 h-4" />
                {isCurrentSaved ? 'Unsave' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500"
            aria-label="search-abdev"
          />
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold gap-2">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>

      <div className="w-full max-w-4xl mb-6 flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'liked', 'saved', 'commented', 'yours'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded-full text-sm capitalize transition ${
                filterActive === f
                  ? 'bg-cyan-500 text-black font-semibold'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl">
        {loadingProjects ? (
          <div className="space-y-3">
            <div className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            <div className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center space-y-3">
            <p className="text-lg font-semibold">No published projects yet</p>
            <p className="text-sm text-muted-foreground">Upload your first project and it will appear here for everyone in AB Dev.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleProjects.map((project) => {
              const authorName = project.profiles?.name || project.profiles?.username || 'AB Dev Creator';
              const authorAvatar = project.profiles?.avatar_url || avatar;
              const publishedLabel = project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Just now';

              return (
                <div
                  key={project.id}
                  className={`bg-white/5 border rounded-xl overflow-hidden backdrop-blur-sm transition cursor-pointer ${
                    selectedProject === project.id ? 'border-cyan-500 bg-white/10' : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={authorAvatar} alt={authorName} />
                        <AvatarFallback>{(project.title || 'A').slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{project.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{authorName} • {publishedLabel}</p>
                      </div>
                    </div>
                    {project.user_id === user?.id ? (
                      <span className="text-[11px] rounded-full px-2 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">Yours</span>
                    ) : null}
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.content || 'No description provided.'}</p>
                    {project.file_url ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-cyan-200">
                        <Upload className="h-3.5 w-3.5" />
                        Attachment ready
                      </div>
                    ) : null}
                  </div>
                  <div className="px-4 py-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(event) => { event.stopPropagation(); void toggleLike(project.id); }}
                        className={`flex items-center gap-1 transition ${isCurrentLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                      >
                        <Heart className={`w-4 h-4 ${isCurrentLiked ? 'fill-red-500' : ''}`} />
                        <span className="text-xs">{project.likes_count || 0}</span>
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); toast.info('Open comments from the main feed card.'); }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-cyan-500 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">Comment</span>
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); toast.info('Share from the main feed card.'); }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-cyan-500 transition"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="text-xs">Share</span>
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); void toggleSave(project.id); }}
                        className={`transition ${isCurrentSaved ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${isCurrentSaved ? 'fill-yellow-500' : ''}`} />
                      </button>
                    </div>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        openProject(project);
                      }}
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                    >
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="bg-[#0a0f1e] border-white/10">
          <DialogHeader>
            <DialogTitle>Upload New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold">Project Name</label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Description</label>
              <textarea
                value={projectDesc}
                onChange={e => setProjectDesc(e.target.value)}
                placeholder="Describe your project"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none h-20 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Project File</label>
              <input type="file" className="w-full text-sm mt-1" onChange={(event) => setProjectFile(event.target.files?.[0] || null)} />
              {projectFile ? <p className="mt-2 text-xs text-cyan-300">Selected: {projectFile.name}</p> : null}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button onClick={handlePublish} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">Publish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPlayer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-3 max-w-3xl w-full mx-auto">
            <div />
            <button onClick={closePlayer} className="text-white text-sm bg-white/10 px-3 py-1 rounded">Close</button>
          </div>
          <div className="flex-1">
            <iframe title="AB Dev Player" src="/funpun.html" className="w-full h-full border-none" />
          </div>
        </div>
      )}
    </div>
  );
}
