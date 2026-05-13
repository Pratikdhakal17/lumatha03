import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Code, MessageCircle, Share2, Bookmark, Heart, Upload, MoreHorizontal, ExternalLink, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { toast } from 'sonner';
import { ABDevCommentsDialog } from '@/components/ABDevCommentsDialog';

type FilterKey = 'all' | 'liked' | 'shared' | 'commented' | 'saved' | 'yours';
type PostRow = Database['public']['Tables']['posts']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface ProjectPost extends PostRow {
  profiles?: ProfileRow | null;
}

type ProjectEngagement = {
  likes: number;
  saves: number;
  shares: number;
  comments: number;
};

const DEFAULT_PROJECT_ID = 'default-funpun';

const MENU_FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'yours', label: 'Yours' },
  { key: 'liked', label: 'Liked' },
  { key: 'shared', label: 'Shared' },
  { key: 'commented', label: 'Commented' },
  { key: 'saved', label: 'Saved' },
];

function buildPreviewUrl(project: ProjectPost): string {
  if (project.id === DEFAULT_PROJECT_ID) return '/funpun.html?challenge=1';
  if (project.file_url) return project.file_url;

  const title = project.title || 'Untitled project';
  const description = project.content || 'No description provided.';
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; font-family: Arial, sans-serif; background: #0a0f1e; color: #e5f6ff; display: grid; place-items: center; min-height: 100vh; padding: 24px; }
          .card { max-width: 720px; width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 28px; }
          h1 { margin: 0 0 12px; font-size: 28px; }
          p { margin: 0; line-height: 1.6; color: #b9c6da; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${title.replace(/</g, '&lt;')}</h1>
          <p>${description.replace(/</g, '&lt;')}</p>
        </div>
      </body>
    </html>
  `;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function guessMime(project: ProjectPost): string | null {
  if (project.file_type) return project.file_type;
  if (project.media_types && project.media_types.length > 0) return project.media_types[0];
  if (project.file_url) {
    if (project.file_url.startsWith('data:')) {
      const m = project.file_url.match(/^data:([^;,]+)[;,]/);
      if (m) return m[1];
    }
    const url = project.file_url;
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    if (!ext) return null;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    if (['mp4', 'webm', 'ogg'].includes(ext)) return `video/${ext}`;
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'html' || ext === 'htm') return 'text/html';
  }
  return null;
}

export default function FunPun() {
  const { user, profile } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [filterActive, setFilterActive] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ProjectPost[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>(DEFAULT_PROJECT_ID);
  const [previewUrl, setPreviewUrl] = useState('/funpun.html?challenge=1');
  const [showPlayer, setShowPlayer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProject, setEditProject] = useState<ProjectPost | null>(null);
  const [projectEngagement, setProjectEngagement] = useState<Record<string, ProjectEngagement>>({});
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [likedProjectIds, setLikedProjectIds] = useState<Set<string>>(new Set());
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set());
  const [sharedProjectIds, setSharedProjectIds] = useState<Set<string>>(new Set());
  const [commentedProjectIds, setCommentedProjectIds] = useState<Set<string>>(new Set());
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [selectedProjectForComments, setSelectedProjectForComments] = useState<{ id: string; title: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatar = profile?.avatar || profile?.photo_url || '/lumatha-logo-new.png';

  const defaultProject = useMemo<ProjectPost>(() => ({
    id: DEFAULT_PROJECT_ID,
    user_id: profile?.id || user?.id || DEFAULT_PROJECT_ID,
    title: 'FunPun',
    content: 'FunPun is the default AB Dev project. Open it to launch the built-in preview, then upload your own project cards.',
    file_url: '/funpun.html?challenge=1',
    file_type: 'text/html',
    media_type: 'html',
    media_types: ['text/html'],
    media_urls: ['/funpun.html?challenge=1'],
    audience: 'public',
    bg_color: null,
    category: 'abdev',
    created_at: null,
    expires_at: null,
    feeling: null,
    is_anonymous: false,
    is_private: false,
    likes_count: 0,
    location: profile?.country || null,
    post_type: 'post',
    shares_count: 0,
    shield_enabled: false,
    subcategory: null,
    tagged_user_ids: [],
    tags: null,
    updated_at: null,
    views_count: 0,
    visibility: 'public',
    allow_comments: true,
    allow_sharing: true,
    profiles: {
      id: profile?.id || user?.id || DEFAULT_PROJECT_ID,
      name: 'AB Dev',
      username: 'funpun',
      avatar_url: avatar,
    } as ProfileRow,
  } as ProjectPost), [avatar, profile?.country, profile?.id, user?.id]);


  const updateEngagement = useCallback((projectId: string, updater: (current: ProjectEngagement) => ProjectEngagement) => {
    setProjectEngagement((prev) => {
      const current = prev[projectId] || { likes: 0, saves: 0, shares: 0, comments: 0 };
      return {
        ...prev,
        [projectId]: updater(current),
      };
    });
  }, []);
  const feedProjects = useMemo(() => [defaultProject, ...projects], [defaultProject, projects]);

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

  useEffect(() => {
    if (editProject) {
      setEditTitle(editProject.title || '');
      setEditDesc(editProject.content || '');
    } else {
      setEditTitle('');
      setEditDesc('');
    }
  }, [editProject]);

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
        if (current && [DEFAULT_PROJECT_ID, ...nextProjects.map((project) => project.id)].includes(current)) return current;
        return DEFAULT_PROJECT_ID;
      });

      const projectIds = nextProjects.map((project) => project.id).filter(Boolean);
      if (projectIds.length > 0) {
        const [likesResult, savesResult, sharesResult, commentsResult] = await Promise.all([
          supabase.from('likes').select('post_id').in('post_id', projectIds),
          supabase.from('saved').select('post_id').in('post_id', projectIds),
          supabase.from('post_shares').select('post_id').in('post_id', projectIds),
          supabase.from('comments').select('post_id').in('post_id', projectIds).not('post_id', 'is', null),
        ]);

        const nextEngagement: Record<string, ProjectEngagement> = {};
        projectIds.forEach((id) => {
          nextEngagement[id] = { likes: 0, saves: 0, shares: 0, comments: 0 };
        });

        likesResult.data?.forEach((entry) => {
          if (entry.post_id && nextEngagement[entry.post_id]) nextEngagement[entry.post_id].likes += 1;
        });
        savesResult.data?.forEach((entry) => {
          if (entry.post_id && nextEngagement[entry.post_id]) nextEngagement[entry.post_id].saves += 1;
        });
        sharesResult.data?.forEach((entry) => {
          if (entry.post_id && nextEngagement[entry.post_id]) nextEngagement[entry.post_id].shares += 1;
        });
        commentsResult.data?.forEach((entry) => {
          if (entry.post_id && nextEngagement[entry.post_id]) nextEngagement[entry.post_id].comments += 1;
        });

        setProjectEngagement(nextEngagement);
      } else {
        setProjectEngagement({});
      }

      if (user?.id) {
        const [savedResult, likedResult, sharedResult, commentedResult] = await Promise.all([
          supabase.from('saved').select('post_id').eq('user_id', user.id),
          supabase.from('likes').select('post_id').eq('user_id', user.id),
          supabase.from('post_shares').select('post_id').eq('user_id', user.id),
          supabase.from('comments').select('post_id').eq('user_id', user.id).not('post_id', 'is', null),
        ]);

        setSavedProjectIds(new Set(savedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
        setLikedProjectIds(new Set(likedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
        setSharedProjectIds(new Set(sharedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
        setCommentedProjectIds(new Set(commentedResult.data?.map((entry) => entry.post_id).filter(Boolean) || []));
      } else {
        setSavedProjectIds(new Set());
        setLikedProjectIds(new Set());
        setSharedProjectIds(new Set());
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

  const currentProject = useMemo(
    () => feedProjects.find((project) => project.id === selectedProject) || defaultProject,
    [defaultProject, feedProjects, selectedProject],
  );

  const visibleProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return feedProjects.filter((project) => {
      const title = (project.title || '').toLowerCase();
      const content = (project.content || '').toLowerCase();
      const authorName = (project.profiles?.name || project.profiles?.username || '').toLowerCase();
      const matchesSearch = !normalizedSearch || title.includes(normalizedSearch) || content.includes(normalizedSearch) || authorName.includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (filterActive === 'liked') return likedProjectIds.has(project.id);
      if (filterActive === 'shared') return sharedProjectIds.has(project.id);
      if (filterActive === 'commented') return commentedProjectIds.has(project.id);
      if (filterActive === 'saved') return savedProjectIds.has(project.id);
      if (filterActive === 'yours') return project.id === DEFAULT_PROJECT_ID || (user?.id ? project.user_id === user.id : false);
      return true;
    });
  }, [commentedProjectIds, feedProjects, filterActive, likedProjectIds, savedProjectIds, searchQuery, sharedProjectIds, user?.id]);

  const openProject = useCallback((project: ProjectPost) => {
    setSelectedProject(project.id);
    setPreviewUrl(buildPreviewUrl(project));
    setShowPlayer(true);
  }, []);

  const closePlayer = useCallback(() => setShowPlayer(false), []);

  const toggleLike = useCallback(async (projectId: string) => {
    if (!user?.id || projectId === DEFAULT_PROJECT_ID) return;

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

      updateEngagement(projectId, (current) => ({
        ...current,
        likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)),
      }));

      setProjects((prev) => prev.map((project) => {
        if (project.id !== projectId) return project;
        const currentLikes = project.likes_count || 0;
        return { ...project, likes_count: nextLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1) };
      }));
    } catch (error) {
      console.error('Failed to update like:', error);
      toast.error('Could not update like');
    }
  }, [likedProjectIds, updateEngagement, user?.id]);

  const toggleSave = useCallback(async (projectId: string) => {
    if (!user?.id || projectId === DEFAULT_PROJECT_ID) return;

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

      updateEngagement(projectId, (current) => ({
        ...current,
        saves: Math.max(0, current.saves + (nextSaved ? 1 : -1)),
      }));
    } catch (error) {
      console.error('Failed to update save:', error);
      toast.error('Could not update save');
    }
  }, [savedProjectIds, updateEngagement, user?.id]);

  const toggleShare = useCallback(async (projectId: string) => {
    if (!user?.id || projectId === DEFAULT_PROJECT_ID) return;

    try {
      const { data: existingShare, error: lookupError } = await supabase
        .from('post_shares')
        .select('id')
        .eq('post_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingShare) {
        toast.info('Already shared');
        return;
      }

      const { error } = await supabase.from('post_shares').insert({ post_id: projectId, user_id: user.id });
      updateEngagement(projectId, (current) => ({
        ...current,
        shares: current.shares + 1,
      }));
      if (error) throw error;

      setSharedProjectIds((prev) => new Set(prev).add(projectId));
      setProjects((prev) => prev.map((project) => {
        if (project.id !== projectId) return project;
        return { ...project, shares_count: (project.shares_count || 0) + 1 };
      }));
      toast.success('Project shared');
    } catch (error) {
      console.error('Failed to share project:', error);
      toast.error('Could not share project');
    }
  }, [updateEngagement, user?.id]);

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
        const nameLower = projectFile.name.toLowerCase();
        const isHtml = (projectFile.type && projectFile.type.includes('html')) || nameLower.endsWith('.html') || nameLower.endsWith('.htm');

        if (isHtml) {
          // Skip storage upload for HTML files (Supabase blocks text/html); embed as data URL instead
          try {
            const text = await projectFile.text();
            fileUrl = `data:text/html;charset=utf-8,${encodeURIComponent(text)}`;
            fileType = 'text/html';
            toast.success('Project published with inline HTML preview');
          } catch (err) {
            console.warn('Failed to create inline HTML preview:', err);
            toast.warning('Project published without file attachment');
          }
        } else {
          const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${projectFile.name.replace(/\s+/g, '_')}`;
          const safeContentType = projectFile.type && !projectFile.type.includes('html')
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
        setPreviewUrl(buildPreviewUrl(createdProject));
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
  }, [profile?.country, projectDesc, projectFile, projectName, user?.id]);

  const handleSaveEdit = async () => {
    if (!editProject) return;
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      const { data, error } = await supabase.from('posts').update({ title: editTitle.trim(), content: editDesc.trim() || null }).eq('id', editProject.id).select('*, profiles(*)').maybeSingle();
      if (error) throw error;
      const updated = data as ProjectPost | null;
      if (updated) {
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setShowEditModal(false);
      setEditProject(null);
      toast.success('Project updated');
    } catch (err) {
      console.error('Failed to save project edits:', err);
      toast.error('Could not save changes');
    }
  };

  const handleDeleteProject = async (id?: string) => {
    const projectId = id || editProject?.id;
    if (!projectId) return;
    // confirm
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', projectId);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setShowEditModal(false);
      setEditProject(null);
      if (selectedProject === projectId) setSelectedProject(DEFAULT_PROJECT_ID);
      toast.success('Project deleted');
    } catch (err) {
      console.error('Failed to delete project:', err);
      toast.error('Could not delete project');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0a0f1e] to-[#0f1424] text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-700">
            <Code className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AB Dev</h1>
            <p className="text-sm text-muted-foreground mt-1">Ambitious Beginner Developer is a place where you can see developer projects and upload yours too with sharing your idea for some suggestion.</p>
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
              {MENU_FILTERS.map((entry) => (
                <button
                  key={entry.key}
                  onClick={() => {
                    setFilterActive(entry.key);
                    setShowOptionsMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded ${filterActive === entry.key ? 'bg-white/5 text-cyan-300' : ''}`}
                >
                  {entry.label}
                </button>
              ))}
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

      <div className="w-full max-w-4xl">
        {loadingProjects ? (
          <div className="space-y-3">
            <div className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            <div className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center space-y-3">
            {filterActive === 'liked' && (
              <>
                <Heart className="w-12 h-12 mx-auto text-red-400/40" />
                <p className="text-lg font-semibold">No liked posts yet</p>
                <p className="text-sm text-muted-foreground">Try liking a post to see it here!</p>
              </>
            )}
            {filterActive === 'saved' && (
              <>
                <Bookmark className="w-12 h-12 mx-auto text-blue-400/40" />
                <p className="text-lg font-semibold">No saved posts yet</p>
                <p className="text-sm text-muted-foreground">Save posts to view them later here.</p>
              </>
            )}
            {filterActive === 'shared' && (
              <>
                <Share2 className="w-12 h-12 mx-auto text-green-400/40" />
                <p className="text-lg font-semibold">No shared posts yet</p>
                <p className="text-sm text-muted-foreground">You haven't shared any posts yet.</p>
              </>
            )}
            {filterActive === 'commented' && (
              <>
                <MessageCircle className="w-12 h-12 mx-auto text-yellow-400/40" />
                <p className="text-lg font-semibold">No commented posts yet</p>
                <p className="text-sm text-muted-foreground">Posts you've commented on will appear here.</p>
              </>
            )}
            {filterActive === 'yours' && (
              <>
                <Code className="w-12 h-12 mx-auto text-cyan-400/40" />
                <p className="text-lg font-semibold">No projects uploaded yet</p>
                <p className="text-sm text-muted-foreground">Upload your first project to share with AB Dev!</p>
              </>
            )}
            {filterActive === 'all' && (
              <>
                <p className="text-lg font-semibold">No published projects yet</p>
                <p className="text-sm text-muted-foreground">Upload your first project and it will appear here for everyone in AB Dev.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleProjects.map((project) => {
              const authorName = project.profiles?.name || project.profiles?.username || 'AB Dev Creator';
              const authorAvatar = project.profiles?.avatar_url || avatar;
              const publishedLabel = project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Just now';
              const engagement = projectEngagement[project.id] || { likes: project.likes_count || 0, saves: 0, shares: project.shares_count || 0, comments: 0 };

              return (
                <div
                  key={project.id}
                  className={`bg-white/5 border rounded-xl overflow-hidden backdrop-blur-sm transition cursor-pointer ${selectedProject === project.id ? 'border-cyan-500 bg-white/10' : 'border-white/10 hover:border-white/20'}`}
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
                    {project.id === DEFAULT_PROJECT_ID ? (
                      <span className="text-[11px] rounded-full px-2 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">Default</span>
                    ) : project.user_id === user?.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] rounded-full px-2 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">Yours</span>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditProject(project); setShowEditModal(true); }}
                            className="p-1 hover:bg-white/5 rounded"
                            aria-label="edit-project"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
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
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleLike(project.id);
                        }}
                        className={`flex items-center gap-1 transition ${likedProjectIds.has(project.id) ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                        disabled={project.id === DEFAULT_PROJECT_ID}
                      >
                        <Heart className={`w-4 h-4 ${likedProjectIds.has(project.id) ? 'fill-red-500' : ''}`} />
                        <span className="text-xs">{engagement.likes}</span>
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedProjectForComments({ id: project.id, title: project.title || 'Untitled' });
                          setShowCommentsDialog(true);
                        }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-cyan-500 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{engagement.comments}</span>
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleShare(project.id);
                        }}
                        className={`flex items-center gap-1 transition ${sharedProjectIds.has(project.id) ? 'text-cyan-300' : 'text-muted-foreground hover:text-cyan-500'}`}
                        disabled={project.id === DEFAULT_PROJECT_ID}
                      >
                        <Share2 className={`w-4 h-4 ${sharedProjectIds.has(project.id) ? 'fill-cyan-300' : ''}`} />
                        <span className="text-xs">{engagement.shares}</span>
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleSave(project.id);
                        }}
                        className={`flex items-center gap-1 transition ${savedProjectIds.has(project.id) ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                        disabled={project.id === DEFAULT_PROJECT_ID}
                      >
                        <Bookmark className={`w-4 h-4 ${savedProjectIds.has(project.id) ? 'fill-yellow-500' : ''}`} />
                        <span className="text-xs">{engagement.saves}</span>
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
        <DialogContent className="max-w-4xl bg-[#0a0f1e] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New Project to AB Dev</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Policy Notes */}
            <div className="bg-white/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
              <p className="text-emerald-400 text-sm font-semibold">📋 Upload Guidelines</p>
              <ul className="text-xs text-emerald-300/80 space-y-1">
                <li>• Maximum file size: 50 MB (temporary)</li>
                <li>• Ads or promotion files will be taken down by system</li>
                <li>• Nudity and violated content will be taken down</li>
                <li>• Ensure content follows community standards</li>
              </ul>
            </div>

            {/* Project Name */}
            <div>
              <label className="text-sm font-semibold">Project Name</label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Enter project name"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold">Description</label>
              <textarea
                value={projectDesc}
                onChange={(event) => setProjectDesc(event.target.value)}
                placeholder="Describe your project"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none h-24 resize-none"
              />
            </div>

            {/* Project File */}
            <div>
              <label className="text-sm font-semibold">Project File</label>
              <div className="border-2 border-dashed border-white/10 rounded-lg p-6 mt-2 text-center hover:border-white/20 transition cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  id="project-file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      if (file.size > 50 * 1024 * 1024) {
                        toast.error('File size exceeds 50 MB limit');
                        return;
                      }
                      setProjectFile(file);
                    }
                  }}
                />
                <label htmlFor="project-file-input" className="cursor-pointer block">
                  <p className="text-sm text-muted-foreground">Click to select file or drag and drop</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Supports HTML, images, videos, PDFs, and more</p>
                </label>
              </div>
              {projectFile && (
                <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-md flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-semibold">{projectFile.name}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {(projectFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setProjectFile(null)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePublish} 
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              >
                Publish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-[#0a0f1e] border-white/10">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold">Project Name</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter project name"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Describe your project"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none h-20 resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Button variant="outline" className="text-red-400" onClick={() => void handleDeleteProject()}>Delete</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowEditModal(false); setEditProject(null); }}>Cancel</Button>
                <Button onClick={() => void handleSaveEdit()} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">Save</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showPlayer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-1.5 px-3">
            <button onClick={closePlayer} className="p-1.5 hover:bg-white/5 rounded" aria-label="close"><X className="w-3.5 h-3.5" /></button>
            <button onClick={() => window.open(previewUrl, '_blank')} className="p-1.5 hover:bg-white/5 rounded" aria-label="open-new-tab"><ExternalLink className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {previewError ? (
              <div className="text-center space-y-2">
                <div className="text-sm text-yellow-300">⚠ Preview Error</div>
                <div className="text-xs text-muted-foreground max-w-xs">{previewError}</div>
              </div>
            ) : (
              (() => {
                const project = currentProject;
                const src = previewUrl;
                const mime = guessMime(project || ({} as ProjectPost));

                if (!src) {
                  return <div className="text-xs text-muted-foreground">No preview available</div>;
                }

                if (mime && mime.startsWith('image')) {
                  return <img src={src} alt={project?.title || 'project'} className="max-w-full max-h-full object-contain" onLoad={() => setPreviewError(null)} onError={() => setPreviewError('This file may be too big or errors occurred while previewing')} />;
                }

                if (mime && mime.startsWith('video')) {
                  return <video controls className="w-full h-full max-h-[85vh] bg-black" src={src} onLoadedData={() => setPreviewError(null)} onError={() => setPreviewError('This file may be too big or errors occurred while previewing')} />;
                }

                if (mime === 'application/pdf') {
                  return <iframe title="PDF Preview" src={src} className="w-full h-full border-none" onLoad={() => setPreviewError(null)} onError={() => setPreviewError('PDF preview failed. File may be too big or have compatibility issues')} />;
                }

                if (mime === 'text/html') {
                  return <iframe title="HTML Preview" src={src} sandbox="allow-scripts allow-forms" className="w-full h-full border-none" onLoad={() => setPreviewError(null)} onError={() => setPreviewError('HTML preview may be blocked by browser or CORS policy')} />;
                }

                return <iframe title="AB Dev Player" src={src} className="w-full h-full border-none" onLoad={() => setPreviewError(null)} onError={() => setPreviewError('This file may be too big or errors occurred while previewing')} />;
              })()
            )}
          </div>
        </div>
      )}

      <ABDevCommentsDialog
        postId={selectedProjectForComments?.id || null}
        postTitle={selectedProjectForComments?.title}
        open={showCommentsDialog}
        onOpenChange={setShowCommentsDialog}
        onCommentAdded={() => {
          if (selectedProjectForComments?.id) {
            updateEngagement(selectedProjectForComments.id, (current) => ({
              ...current,
              comments: current.comments + 1,
            }));
          }
        }}
      />
    </div>
  );
}