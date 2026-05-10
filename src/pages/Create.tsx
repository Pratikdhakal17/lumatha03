import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { safeGetUser } from '@/lib/supabaseAuth';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { toast } from 'sonner';
import { ArrowLeft, Check, ChevronDown, Palette, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DrawingAttachment } from '@/components/chat/MessageAttachments';

const AUDIENCE_OPTIONS = [
  {
    value: 'global',
    emoji: '🌎',
    title: 'Global',
    desc: 'Everyone on Lumatha + searchable publicly',
    badge: 'Most reach',
    iconBg: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(160 84% 39%))',
    badgeBg: 'hsl(160 84% 39% / 0.14)',
    badgeColor: 'hsl(160 84% 39%)',
  },
  {
    value: 'regional',
    emoji: '🇳🇵',
    title: 'Regional — Nepal',
    desc: 'People in Nepal only',
    badge: 'Local reach',
    iconBg: 'linear-gradient(135deg, hsl(24 95% 53%), hsl(43 96% 56%))',
    badgeBg: 'hsl(24 95% 53% / 0.15)',
    badgeColor: 'hsl(24 95% 53%)',
  },
  {
    value: 'following',
    emoji: '👥',
    title: 'Following',
    desc: 'Only your followers',
    badge: 'Safe',
    iconBg: 'linear-gradient(135deg, var(--accent), hsl(239 84% 67%))',
    badgeBg: 'var(--accent-dim)',
    badgeColor: 'var(--accent-light)',
  },
  {
    value: 'ghost',
    emoji: '👻',
    title: 'Ghost Mode',
    desc: 'Post without anyone knowing it is you. Shows as Anonymous',
    badge: 'Anonymous',
    iconBg: 'linear-gradient(135deg, hsl(217 19% 27%), hsl(215 28% 17%))',
    badgeBg: 'hsl(0 0% 100% / 0.06)',
    badgeColor: 'var(--text-3)',
  },
  {
    value: 'private',
    emoji: '🔒',
    title: 'Only Me',
    desc: 'Saved privately. Goes to Private Zone',
    badge: 'Private Zone',
    iconBg: 'linear-gradient(135deg, hsl(0 84% 60%), hsl(0 72% 51%))',
    badgeBg: 'hsl(0 84% 60% / 0.14)',
    badgeColor: 'hsl(0 84% 60%)',
  },
] as const;

const FEELINGS = ['😊', '😢', '😠', '🤩', '😴', '🥰', '😲', '😎', '🤔'];
const EXPIRE_OPTIONS = ['Never', '24h', '7 days', '30 days'] as const;

const THOUGHT_BACKGROUNDS = [
  '#0a0f1e', '#1a0533', '#071428', '#0c0805', '#071f1e', '#1a0d18', '#1a1200', '#0d1a00',
  'linear-gradient(135deg, #1a0533, #0a0f1e)',
  'linear-gradient(135deg, #071428, #020814)',
  'linear-gradient(135deg, #1f1409, #0c0805)',
  'linear-gradient(135deg, #071f0e, #020f0a)',
  'linear-gradient(135deg, #1f0914, #0a0209)',
  'linear-gradient(135deg, #1f1200, #0c0800)',
];

const TEXT_STYLES = [
  { key: 'normal', label: 'Normal', style: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontStyle: 'normal' } },
  { key: 'bold', label: 'Bold', style: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontStyle: 'normal' } },
  { key: 'italic', label: 'Italic', style: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontStyle: 'italic' } },
  { key: 'handwriting', label: 'Handwriting', style: { fontFamily: 'cursive', fontWeight: 600, fontStyle: 'normal' } },
  { key: 'mono', label: 'Mono', style: { fontFamily: 'monospace', fontWeight: 700, fontStyle: 'normal' } },
] as const;

const TEXT_COLORS = ['#ffffff', 'var(--accent)', '#FBBF24', '#10B981', '#3B82F6', '#EF4444'];

export default function Create() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { contentType?: string; autoFocus?: boolean } | null;
  const isPrivateEntry = new URLSearchParams(location.search).get('mode') === 'private';

  const contentType = state?.contentType || 'post';
  const isThoughtMode = contentType === 'thought';
  const isStoryMode = contentType === 'story';
  const isDiaryMode = contentType === 'diary';
  const isReelMode = contentType === 'reel';
  const isDrawingMode = contentType === 'drawing';
  const isPrivateMode = isPrivateEntry || isStoryMode || isDiaryMode || isReelMode || isDrawingMode || isThoughtMode;

  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [audience, setAudience] = useState<'global' | 'regional' | 'following' | 'ghost' | 'private'>('global');
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagResults, setTagResults] = useState<any[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);
  const [shieldEnabled, setShieldEnabled] = useState(false);
  const [expireAfter, setExpireAfter] = useState<(typeof EXPIRE_OPTIONS)[number]>('Never');
  const [feeling, setFeeling] = useState('');
  const [sharing, setSharing] = useState(false);
  const [expandedMore, setExpandedMore] = useState(false);

  const [thoughtText, setThoughtText] = useState('');
  const [thoughtBg, setThoughtBg] = useState(THOUGHT_BACKGROUNDS[0]);
  const [thoughtStyle, setThoughtStyle] = useState<(typeof TEXT_STYLES)[number]['key']>('normal');
  const [thoughtColor, setThoughtColor] = useState(TEXT_COLORS[0]);
  const [showDrawingEditor, setShowDrawingEditor] = useState(isDrawingMode);
  const [drawingExportType, setDrawingExportType] = useState<'story' | 'post' | 'chat' | 'private' | undefined>(undefined);

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isPrivateEntry || isPrivateMode) {
      setAudience('private');
    }
  }, [isPrivateEntry, isPrivateMode]);

  useEffect(() => {
    if (isDrawingMode) {
      setShowDrawingEditor(true);
    }
  }, [isDrawingMode]);

  useEffect(() => {
    if (!tagSearch.trim() || !showTagPicker) {
      setTagResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .or(`name.ilike.%${tagSearch}%,username.ilike.%${tagSearch}%`)
        .limit(8);
      setTagResults((data || []).filter((row) => !taggedUsers.some((u) => u.id === row.id)));
    }, 250);

    return () => clearTimeout(timeout);
  }, [tagSearch, showTagPicker, taggedUsers]);

  const activeAudience = useMemo(() => AUDIENCE_OPTIONS.find((opt) => opt.value === audience) || AUDIENCE_OPTIONS[0], [audience]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.max(80, el.scrollHeight)}px`;
  };

  const thoughtFontSize = thoughtText.length < 50 ? 28 : thoughtText.length < 100 ? 22 : 18;

  const handleSelectMedia = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const nextFiles = [...files, ...Array.from(incoming)].slice(0, 10);
    setFiles(nextFiles);
    const urls = nextFiles.map((f) => URL.createObjectURL(f));
    setMediaPreviewUrls(urls);
    setMediaTypes(nextFiles.map((f) => (f.type.includes('video') ? 'video' : 'image')));
  };

  const handleRemoveMedia = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setMediaTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrawingSubmit = (blob: Blob, exportType?: 'story' | 'post' | 'chat' | 'private') => {
    const file = new File([blob], `free-draw-${Date.now()}.jpg`, {
      type: blob.type || 'image/jpeg',
    });
    setFiles([file]);
    setMediaPreviewUrls([URL.createObjectURL(file)]);
    setMediaTypes(['image']);
    if (exportType) {
      setDrawingExportType(exportType);
      if (exportType === 'private') setAudience('private');
      else if (exportType === 'story') setAudience('global');
    }
    setShowDrawingEditor(false);
  };

  const getExpiresAt = () => {
    if (expireAfter === 'Never') return null;
    const now = new Date();
    if (expireAfter === '24h') now.setHours(now.getHours() + 24);
    if (expireAfter === '7 days') now.setDate(now.getDate() + 7);
    if (expireAfter === '30 days') now.setDate(now.getDate() + 30);
    return now.toISOString();
  };

  const handleAICaption = async () => {
    if (!caption.trim() && files.length === 0) {
      toast.error('Add text, media or draw first.');
      return;
    }

    const context = `Write an engaging social media caption for this post from Nepal. Tone: friendly, authentic. Context: mood=${feeling || 'neutral'}, hasMedia=${files.length > 0}. Max 100 characters. Optional hashtags at end. Return only caption.`;

    const { data, error } = await supabase.functions.invoke('lumatha-assistant', {
      body: {
        messages: [{ role: 'user', content: context }],
        username: profile?.name || '',
        location: profile?.country || 'Nepal',
      },
    });

    if (error) {
      toast.error('AI caption unavailable right now.');
      return;
    }

    const aiText = (data?.reply || '').trim();
    if (!aiText) {
      toast.error('Could not generate caption.');
      return;
    }

    setCaption(aiText);
    if (textAreaRef.current) autoResize(textAreaRef.current);
  };

  const handlePublish = async () => {
    const { data: authData } = await safeGetUser();
    const authUser = authData.user;
    if (!authUser) {
      toast.error('Please sign in first');
      return;
    }

    const finalText = isThoughtMode ? thoughtText.trim() : caption.trim();
    if (!finalText && !files.length) {
      toast.error('Add some content first');
      return;
    }

    setSharing(true);

    try {
      const uploadedUrls: string[] = [];
      const uploadedTypes: string[] = [];

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${authUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('posts-media').upload(path, file, {
          cacheControl: '31536000',
          contentType: file.type,
        });
        if (uploadError) throw uploadError;
        uploadedUrls.push(getPublicUrlSafe('posts-media', path) ?? '');
        uploadedTypes.push(file.type.includes('video') ? 'video' : 'image');
      }

      const isGhost = audience === 'ghost';
      let isPrivate = audience === 'private' || drawingExportType === 'private';
      const mediaType = uploadedTypes[0] || (isThoughtMode ? 'text' : 'image');
      let postType = isThoughtMode
        ? 'thought'
        : isStoryMode
          ? 'story'
          : isDiaryMode
            ? 'diary'
            : isReelMode
              ? 'reel'
              : isDrawingMode
                ? 'drawing'
                : 'post';

      // If the user exported a drawing with a specific target type, favor that
      if (drawingExportType) {
        if (drawingExportType === 'story') postType = 'story';
        else if (drawingExportType === 'post') postType = 'post';
        else if (drawingExportType === 'chat') postType = 'post';
        else if (drawingExportType === 'private') postType = isDrawingMode ? 'drawing' : 'post';
      }

      const payload: any = {
        user_id: authUser.id,
        title: finalText.slice(0, 70) || (isThoughtMode ? 'Thought' : isStoryMode ? 'Story' : isDiaryMode ? 'Diary' : isReelMode ? 'Reel' : isDrawingMode ? 'Free Draw' : 'Post'),
        content: finalText || null,
        file_url: uploadedUrls[0] || null,
        file_type: uploadedTypes[0] || null,
        media_urls: uploadedUrls,
        media_types: uploadedTypes,
        media_type: mediaType,
        visibility: isPrivate ? 'private' : 'public',
        category: isGhost ? 'ghost' : 'inspire',
        audience,
        is_anonymous: isGhost,
        is_private: isPrivate,
        location: profile?.country || 'Nepal',
        feeling: feeling || null,
        post_type: postType,
        bg_color: isThoughtMode ? thoughtBg : null,
        allow_comments: allowComments,
        allow_sharing: allowSharing,
        shield_enabled: shieldEnabled,
        expires_at: getExpiresAt(),
        tagged_user_ids: taggedUsers.map((u) => u.id),
      };

      const { error } = await supabase.from('posts').insert(payload);
      if (error) throw error;

      if (isPrivate) toast.success('🔒 Saved to Private Zone');
      else if (isGhost) toast.success('👻 Posted anonymously!');
      else toast.success('Posted! 🎉');

      navigate('/');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to publish post');
    } finally {
      setSharing(false);
    }
  };

  const canShare = isThoughtMode ? thoughtText.trim().length > 0 : caption.trim().length > 0 || files.length > 0;
  const createTitle = isThoughtMode
    ? 'Own Thoughts'
    : isStoryMode
      ? isPrivateMode ? 'New Private Story' : 'New Story'
      : isDiaryMode
        ? isPrivateMode ? 'New Private Diary' : 'New Diary'
        : isReelMode
          ? isPrivateMode ? 'New Private Reel' : 'New Reel'
          : isDrawingMode
            ? 'Captures Drawing arts'
            : isPrivateEntry
              ? 'New Private Post'
              : 'New Post';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="sticky top-0 z-20 px-4 py-3 border-b" style={{ borderColor: 'var(--border-c)', background: 'var(--bg-base)' }}>
        {/* Clean header - Back arrow left, Title center, Share right */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-300 transition-all rounded-lg hover:bg-white/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
            {createTitle}
          </h1>
          <button
            disabled={!canShare || sharing}
            onClick={handlePublish}
            className="rounded-full px-5 py-2 transition-all"
            style={{
              background: canShare ? 'var(--accent)' : 'var(--bg-elevated)',
              color: canShare ? 'white' : 'var(--text-3)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {sharing ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>

      {showDrawingEditor ? (
        <DrawingAttachment
          onSubmit={handleDrawingSubmit}
          onClose={() => setShowDrawingEditor(false)}
        />
      ) : isThoughtMode ? (
        <div className="space-y-4 px-4 py-4 pb-24">
          <div className="flex gap-2 overflow-x-auto">
            {THOUGHT_BACKGROUNDS.map((bg) => (
              <button
                key={bg}
                onClick={() => setThoughtBg(bg)}
                className="w-8 h-8 rounded-[8px] shrink-0 border"
                style={{
                  background: bg,
                  borderColor: thoughtBg === bg ? 'var(--accent)' : 'var(--border-c)',
                  boxShadow: thoughtBg === bg ? '0 0 0 2px hsl(263 84% 58% / 0.35)' : 'none',
                }}
              />
            ))}
          </div>

          <div
            className="rounded-2xl min-h-[360px] p-6 flex flex-col justify-between"
            style={{ background: thoughtBg, border: '1px solid var(--border-c)' }}
          >
            <textarea
              value={thoughtText}
              onChange={(e) => setThoughtText(e.target.value.slice(0, 300))}
              placeholder="What are you thinking?"
              className="w-full bg-transparent border-0 outline-none resize-none text-center"
              style={{
                ...TEXT_STYLES.find((s) => s.key === thoughtStyle)?.style,
                color: thoughtColor,
                fontSize: thoughtFontSize,
                lineHeight: 1.25,
                minHeight: 230,
                paddingTop: 32,
              }}
            />
            <p className="text-center" style={{ color: thoughtText.length >= 280 ? 'hsl(0 84% 60%)' : 'var(--text-3)', fontSize: 12 }}>
              {thoughtText.length} / 300
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {TEXT_STYLES.map((styleOpt) => (
              <button
                key={styleOpt.key}
                onClick={() => setThoughtStyle(styleOpt.key)}
                className="px-3 py-1.5 rounded-full border shrink-0"
                style={{
                  borderColor: thoughtStyle === styleOpt.key ? 'var(--accent)' : 'var(--border-c)',
                  color: thoughtStyle === styleOpt.key ? 'var(--accent-light)' : 'var(--text-2)',
                }}
              >
                {styleOpt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setThoughtColor(color)}
                className="w-6 h-6 rounded-full border"
                style={{
                  background: color,
                  borderColor: thoughtColor === color ? 'white' : 'var(--border-c)',
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="pb-32">
          {/* FB-Style Layout: Profile + Text */}
          <div className="px-4 pt-4">
            <div className="flex gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback style={{ background: 'var(--grad-1)', color: 'white' }}>{profile?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-white text-base">{profile?.name || 'You'}</p>
                <p className="text-xs text-slate-500">{activeAudience.title} • {isPrivateMode ? 'Private' : 'Public'}</p>
              </div>
            </div>
            <textarea
              ref={textAreaRef}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                autoResize(e.target);
              }}
              placeholder="Write with your own thoughts..."
              className="w-full bg-transparent border-0 outline-none resize-none mt-4"
              style={{ minHeight: 120, color: 'var(--text-1)', fontSize: 18, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}
              autoFocus={state?.autoFocus}
            />
          </div>

          {/* Media Icons - Camera, Gallery, Videos (hidden for drawing mode) */}
          {!isDrawingMode && (
            <div className="px-4 mt-4">
              <div className="flex items-center gap-3">
                {[
                  { key: 'camera', emoji: '📷', title: 'Camera', accept: 'image/*,video/*', capture: 'environment', multiple: false },
                  { key: 'gallery', emoji: '🖼️', title: 'Gallery', accept: 'image/*,video/*', multiple: true },
                  { key: 'video', emoji: '🎥', title: 'Videos', accept: 'video/*', multiple: true },
                ].map((option) => (
                  <label
                    key={option.key}
                    title={option.title}
                    aria-label={option.title}
                    className="w-12 h-12 rounded-full border border-white/10 cursor-pointer flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95"
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <input
                      type="file"
                      accept={option.accept}
                      capture={option.capture as any}
                      className="hidden"
                      multiple={option.multiple}
                      onChange={(e) => handleSelectMedia(e.target.files)}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Media Preview */}
          {mediaPreviewUrls.length > 0 && (
            <div className="px-4 mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {mediaPreviewUrls.map((url, index) => (
                  <div key={url} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden">
                    {mediaTypes[index] === 'video' ? <video src={url} className="w-full h-full object-cover" /> : <img src={url} alt="preview" className="w-full h-full object-cover" />}
                    <button onClick={() => handleRemoveMedia(index)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tag People */}
          <div className="px-4 mt-4">
            <button onClick={() => setShowTagPicker(true)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <span className="text-lg">👥</span>
              <span style={{ color: taggedUsers.length ? 'var(--text-2)' : 'var(--text-3)', fontSize: 14 }}>
                {taggedUsers.length ? taggedUsers.map((u) => u.name).join(', ') : 'Tag people'}
              </span>
            </button>
          </div>

          {/* Who can see this */}
          <div className="px-4 mt-3">
            <button onClick={() => setShowAudiencePicker(true)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
              <span className="text-lg">{activeAudience.emoji}</span>
              <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Who can see this? {activeAudience.title}</span>
            </button>
          </div>

          {/* How are you feeling */}
          <div className="px-4 mt-4">
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 10 }}>How are you feeling?</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFeeling(f)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all active:scale-90"
                  style={{
                    background: feeling === f ? 'var(--accent-dim)' : 'rgba(255,255,255,0.03)',
                    border: feeling === f ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Options - Vertical Collapsible */}
          <div className="px-4 mt-3">
            <Collapsible open={expandedMore} onOpenChange={setExpandedMore}>
              <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl px-4 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                <span style={{ color: 'var(--text-2)', fontSize: 14 }}>Additional Options</span>
                <span style={{ color: 'var(--text-3)' }}>{expandedMore ? '∧' : '∨'}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-2)', fontSize: 13 }}>💬 Comments</span>
                  <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-2)', fontSize: 13 }}>🔄 Shares</span>
                  <Switch checked={allowSharing} onCheckedChange={setAllowSharing} />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-2)', fontSize: 13 }}>⬇️ Download Media</span>
                  <Switch checked={shieldEnabled} onCheckedChange={setShieldEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-2)', fontSize: 13 }}>⏰ Post expires after</span>
                  <select
                    value={expireAfter}
                    onChange={(e) => setExpireAfter(e.target.value as typeof expireAfter)}
                    className="bg-transparent text-xs text-slate-300 border border-white/10 rounded-lg px-2 py-1 outline-none"
                  >
                    {EXPIRE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0B0D1F]">{opt}</option>
                    ))}
                  </select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      )}

      <Sheet open={showAudiencePicker} onOpenChange={setShowAudiencePicker} >
        <SheetContent side="bottom" className="border-0" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-c)', borderRadius: '24px 24px 0 0' }}>
          <SheetTitle className="sr-only">Audience</SheetTitle>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: 'var(--text-1)', marginBottom: 16 }}>Who sees this post?</h3>
          <div className="space-y-2 pb-5">
            {AUDIENCE_OPTIONS.map((opt) => {
              const selected = audience === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setAudience(opt.value as any);
                    setShowAudiencePicker(false);
                  }}
                  className="w-full rounded-2xl p-4 border text-left flex items-start justify-between"
                  style={{
                    borderColor: selected ? 'var(--accent)' : 'var(--border-c)',
                    background: selected ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: opt.iconBg }}>{opt.emoji}</div>
                    <div>
                      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, color: 'var(--text-1)' }}>{opt.title}</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--text-2)' }}>{opt.desc}</p>
                      <span className="inline-block mt-1 rounded-full px-2 py-0.5" style={{ background: opt.badgeBg, color: opt.badgeColor, fontSize: 11 }}>
                        {opt.badge}
                      </span>
                    </div>
                  </div>
                  {selected && <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showTagPicker} onOpenChange={setShowTagPicker}>
        <SheetContent side="bottom" className="border-0" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-c)', borderRadius: '24px 24px 0 0' }}>
          <SheetTitle className="sr-only">Tag people</SheetTitle>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: 'var(--text-1)', marginBottom: 12 }}>Tag people</h3>
          <Input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Search users" />
          <div className="flex flex-wrap gap-2 mt-3">
            {taggedUsers.map((u) => (
              <span key={u.id} className="px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', fontSize: 12 }}>
                {u.name}
                <button onClick={() => setTaggedUsers((prev) => prev.filter((x) => x.id !== u.id))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="max-h-[260px] overflow-y-auto mt-3 space-y-1">
            {tagResults.map((u) => (
              <button
                key={u.id}
                onClick={() => setTaggedUsers((prev) => [...prev, u])}
                className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <Avatar className="w-7 h-7">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback>{u.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p style={{ color: 'var(--text-1)', fontSize: 13 }}>{u.name}</p>
                  <p style={{ color: 'var(--text-3)', fontSize: 12 }}>@{u.username || 'user'}</p>
                </div>
                <Users className="w-4 h-4 ml-auto" style={{ color: 'var(--text-3)' }} />
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
