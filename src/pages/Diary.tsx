import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Type, Image, Film, Smile, Sparkles, Calendar,
  MapPin, Music, Palette, Loader2, Lock, Globe, Users, Ghost,
  Focus, Check, Heading1, Heading2, List, ListOrdered, Quote, Code2,
  GripVertical, Trash2, Copy, EyeOff, Bold, Highlighter
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// ── Types ──
interface DiaryBlock {
  id: string;
  type: 'text' | 'photo' | 'video' | 'mood' | 'sticker' | 'date' | 'location' | 'music';
  content: string;
  richContent?: string;
  style?: string;
  color?: string;
  highlight?: string;
  file?: File;
  previewUrl?: string;
  filter?: string;
  shape?: string;
}

interface SlashCommand {
  id: string;
  label: string;
  keywords: string[];
  action: (blockId: string) => void;
}

const BACKGROUNDS = [
  { id: 'dark', value: '#0a0f1e', type: 'solid' },
  { id: 'deeper', value: '#09090f', type: 'solid' },
  { id: 'warm', value: '#0c0805', type: 'solid' },
  { id: 'navy', value: '#020814', type: 'solid' },
  { id: 'rose', value: '#0d0208', type: 'solid' },
  { id: 'g-purple', value: 'linear-gradient(180deg, #1a0533, #0a0f1e)', type: 'gradient' },
  { id: 'g-blue', value: 'linear-gradient(180deg, #071428, #020814)', type: 'gradient' },
  { id: 'g-warm', value: 'linear-gradient(180deg, #1f1409, #0c0805)', type: 'gradient' },
  { id: 'g-rose', value: 'linear-gradient(180deg, #1f0914, #0a0209)', type: 'gradient' },
  { id: 'g-teal', value: 'linear-gradient(180deg, #071f1e, #020f0e)', type: 'gradient' },
];

const TEXT_STYLES = [
  { id: 'heading', label: 'Heading', font: "'Space Grotesk', sans-serif", size: 28, weight: 700 },
  { id: 'body', label: 'Body', font: "'Inter', sans-serif", size: 16, weight: 400 },
  { id: 'quote', label: 'Quote', font: "'Inter', sans-serif", size: 18, weight: 400, italic: true },
  { id: 'caption', label: 'Caption', font: "'Inter', sans-serif", size: 12, weight: 400 },
  { id: 'big', label: 'BIG', font: "'Space Grotesk', sans-serif", size: 48, weight: 900 },
];

const TEXT_COLORS = [
  { id: 'white', value: '#FFFFFF' },
  { id: 'accent', value: '#7C3AED' },
  { id: 'pink', value: '#FDA4AF' },
  { id: 'gold', value: '#FCD34D' },
  { id: 'teal', value: '#5EEAD4' },
  { id: 'purple', value: '#C4B5FD' },
];

const MOODS = [
  { emoji: '😊', label: 'Happy', gradient: 'linear-gradient(135deg, #84cc16, #10b981)' },
  { emoji: '😢', label: 'Sad', gradient: 'linear-gradient(135deg, #3b82f6, #1e3a5f)' },
  { emoji: '😡', label: 'Angry', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
  { emoji: '😮', label: 'Surprised', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
  { emoji: '🥰', label: 'Loved', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
  { emoji: '😴', label: 'Tired', gradient: 'linear-gradient(135deg, #6b7280, #1e3a5f)' },
  { emoji: '🤩', label: 'Excited', gradient: 'linear-gradient(135deg, #f97316, #eab308)' },
  { emoji: '😌', label: 'Peaceful', gradient: 'linear-gradient(135deg, #14b8a6, #3b82f6)' },
];

const PHOTO_FILTERS = [
  { id: 'none', label: 'None', css: 'none' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.3) saturate(1.3)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(20deg) saturate(0.9)' },
  { id: 'fade', label: 'Fade', css: 'opacity(0.8) saturate(0.7)' },
  { id: 'dramatic', label: 'Drama', css: 'contrast(1.3) saturate(1.4)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.2)' },
  { id: 'golden', label: 'Golden', css: 'sepia(0.5) saturate(1.5)' },
];

const STICKERS = ['✨', '💜', '🔥', '🌙', '🦋', '🌸', '💫', '🎵', '☁️', '🌈', '💎', '🪷', '🍃', '⭐', '🫶', '💗'];

const AUDIENCES = [
  { id: 'public', label: 'Everyone', icon: Globe, desc: 'Shows in feed' },
  { id: 'friends', label: 'Friends only', icon: Users, desc: 'Only followers see it' },
  { id: 'private', label: 'Just me', icon: Lock, desc: 'Saved privately' },
  { id: '24h', label: '24h only', icon: Ghost, desc: 'Disappears after 24 hours' },
];

let blockId = 0;

export default function Diary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<'photo' | 'video'>('photo');

  const [blocks, setBlocks] = useState<DiaryBlock[]>([]);
  const [title, setTitle] = useState('');
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAudienceSheet, setShowAudienceSheet] = useState(false);
  const [audience, setAudience] = useState('public');
  const [publishing, setPublishing] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showTextStyle, setShowTextStyle] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; query: string } | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [inlineToolbar, setInlineToolbar] = useState<{ blockId: string; x: number; y: number } | null>(null);
  const editableRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  const hasContent = blocks.length > 0 || title.trim().length > 0;

  const addBlock = useCallback((type: DiaryBlock['type'], extra?: Partial<DiaryBlock>) => {
    const id = `db-${++blockId}-${Date.now()}`;
    const newBlock: DiaryBlock = {
      id,
      type,
      content: '',
      style: type === 'text' ? 'body' : undefined,
      color: type === 'text' ? '#FFFFFF' : undefined,
      filter: 'none',
      shape: 'rounded',
      ...extra,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(id);
    if (type === 'text') setEditingBlockId(id);
    setShowMoodPicker(false);
    setShowStickerPicker(false);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<DiaryBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const addBlockAfter = useCallback((afterId: string, type: DiaryBlock['type'], extra?: Partial<DiaryBlock>) => {
    const id = `db-${++blockId}-${Date.now()}`;
    const newBlock: DiaryBlock = {
      id,
      type,
      content: '',
      style: type === 'text' ? 'body' : undefined,
      color: type === 'text' ? '#FFFFFF' : undefined,
      filter: 'none',
      shape: 'rounded',
      ...extra,
    };
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId);
      if (idx === -1) return [...prev, newBlock];
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setSelectedBlockId(id);
    if (type === 'text') setEditingBlockId(id);
    return id;
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    const target = blocks.find((b) => b.id === id);
    if (!target) return;
    addBlockAfter(id, target.type, {
      content: target.content,
      richContent: target.richContent,
      style: target.style,
      color: target.color,
      highlight: target.highlight,
      previewUrl: target.previewUrl,
      filter: target.filter,
      shape: target.shape,
    });
  }, [addBlockAfter, blocks]);

  const moveBlock = useCallback((fromId: string, toId: string) => {
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === fromId);
      const toIndex = prev.findIndex((b) => b.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [selectedBlockId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    addBlock(fileTypeRef.current, { file, previewUrl: url });
    e.target.value = '';
  };

  const handleAddDate = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    addBlock('date', { content: formatted });
  };

  const handleAddLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => addBlock('location', { content: 'My Location' }),
        () => addBlock('location', { content: 'My Location' })
      );
    } else {
      addBlock('location', { content: 'My Location' });
    }
  };

  const handlePublish = async () => {
    if (!user || !hasContent) return;
    setShowAudienceSheet(false);
    setPublishing(true);

    try {
      // Upload media files
      const canvasData = await Promise.all(blocks.map(async (block) => {
        if ((block.type === 'photo' || block.type === 'video') && block.file) {
          const ext = block.file.name.split('.').pop();
          const path = `${user.id}/diary_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from('posts-media').upload(path, block.file, { contentType: block.file.type });
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('posts-media').getPublicUrl(path);
          return { ...block, file: undefined, previewUrl: publicUrl };
        }
        return { ...block, file: undefined };
      }));

      const expiresAt = audience === '24h' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

      const { error } = await (supabase.from('diary_posts' as any) as any).insert({
        user_id: user.id,
        canvas_data: canvasData,
        background: background.value,
        audience: audience === '24h' ? 'public' : audience,
        expires_at: expiresAt,
      });
      
      if (error) {
        console.error('Supabase diary_posts insert error:', error);
        throw error;
      }

      toast.success('Diary posted! 📔');
      navigate('/');
    } catch (err: any) {
      console.error('Failed to publish diary:', err);
      toast.error(err.message || 'Failed to publish diary');
    } finally {
      setPublishing(false);
    }
  };

  const getTextStyle = (styleId?: string) => {
    const s = TEXT_STYLES.find(t => t.id === styleId) || TEXT_STYLES[1];
    return { fontFamily: s.font, fontSize: s.size, fontWeight: s.weight, fontStyle: s.italic ? 'italic' as const : 'normal' as const };
  };

  const isRichEmpty = (html?: string) => {
    if (!html) return true;
    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return text.length === 0;
  };

  const syncBlockFromEditable = useCallback((blockId: string) => {
    const el = editableRefs.current[blockId];
    if (!el) return;
    updateBlock(blockId, {
      content: el.innerText,
      richContent: el.innerHTML,
    });
  }, [updateBlock]);

  const refreshInlineToolbar = useCallback((blockId: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setInlineToolbar(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setInlineToolbar(null);
      return;
    }

    setInlineToolbar({
      blockId,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  }, []);

  const applyInlineCommand = useCallback((command: 'bold' | 'foreColor' | 'hiliteColor', value?: string) => {
    if (!inlineToolbar) return;
    document.execCommand(command, false, value);
    syncBlockFromEditable(inlineToolbar.blockId);
    refreshInlineToolbar(inlineToolbar.blockId);
  }, [inlineToolbar, refreshInlineToolbar, syncBlockFromEditable]);

  const applySlashCommand = useCallback((blockId: string, commandId: string) => {
    switch (commandId) {
      case 'h1':
        updateBlock(blockId, { style: 'heading' });
        break;
      case 'h2':
        updateBlock(blockId, { style: 'body', color: '#E5E7EB' });
        break;
      case 'bullet':
        updateBlock(blockId, { content: '• ' });
        break;
      case 'number':
        updateBlock(blockId, { content: '1. ' });
        break;
      case 'quote':
        updateBlock(blockId, { style: 'quote', highlight: 'rgba(139,92,246,0.10)' });
        break;
      case 'code':
        updateBlock(blockId, { style: 'caption', color: '#A5B4FC', highlight: 'rgba(17,24,39,0.85)' });
        break;
      case 'image':
        fileTypeRef.current = 'photo';
        fileInputRef.current?.click();
        break;
      default:
        break;
    }
    setSlashMenu(null);
  }, [updateBlock]);

  const slashCommands: SlashCommand[] = [
    { id: 'h1', label: 'Heading 1', keywords: ['h1', 'heading', 'title'], action: (id) => applySlashCommand(id, 'h1') },
    { id: 'h2', label: 'Heading 2', keywords: ['h2', 'subheading'], action: (id) => applySlashCommand(id, 'h2') },
    { id: 'bullet', label: 'Bullet List', keywords: ['bullet', 'list'], action: (id) => applySlashCommand(id, 'bullet') },
    { id: 'number', label: 'Numbered List', keywords: ['number', 'ordered'], action: (id) => applySlashCommand(id, 'number') },
    { id: 'quote', label: 'Quote Block', keywords: ['quote', 'callout'], action: (id) => applySlashCommand(id, 'quote') },
    { id: 'code', label: 'Code Block', keywords: ['code', 'mono'], action: (id) => applySlashCommand(id, 'code') },
    { id: 'image', label: 'Image Block', keywords: ['image', 'photo'], action: (id) => applySlashCommand(id, 'image') },
  ];

  const TOOLBAR_ITEMS = [
    { icon: Type, label: 'Text', action: () => addBlock('text') },
    { icon: Image, label: 'Photo', action: () => { fileTypeRef.current = 'photo'; fileInputRef.current?.click(); } },
    { icon: Film, label: 'Video', action: () => { fileTypeRef.current = 'video'; fileInputRef.current?.click(); } },
    { icon: Smile, label: 'Mood', action: () => setShowMoodPicker(true) },
    { icon: Sparkles, label: 'Sticker', action: () => setShowStickerPicker(true) },
    { icon: Calendar, label: 'Date', action: handleAddDate },
    { icon: MapPin, label: 'Location', action: handleAddLocation },
    { icon: Music, label: 'Music', action: () => addBlock('music', { content: '' }) },
    { icon: Palette, label: 'BG', action: () => setShowBgPicker(!showBgPicker) },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: background.value.startsWith('linear') ? undefined : background.value, backgroundImage: background.value.startsWith('linear') ? background.value : undefined }}>
      {/* Texture overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />

      {/* ── Top Bar ── */}
      <div className="relative flex items-center justify-between px-5 h-16 shrink-0" style={{ background: 'rgba(10,14,28,0.55)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#A78BFA', boxShadow: '0 0 10px rgba(167,139,250,0.9)' }} />
          <h1 className="text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Note</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFocusMode((prev) => !prev)}
            className="text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #60A5FA, #A78BFA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {focusMode ? <EyeOff className="w-4 h-4" /> : <Focus className="w-4 h-4" />} Focus
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (hasContent) setShowAudienceSheet(true); }}
            disabled={!hasContent || publishing}
            className="text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #34D399, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Done'}
          </button>
        </div>
      </div>

      {/* ── Title Area ── */}
      <div className="relative px-5 pt-5 pb-3 shrink-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Note"
          className="w-full bg-transparent border-0 outline-none"
          style={{ fontSize: 32, lineHeight: 1.1, fontWeight: 600, color: '#E6E9F2', fontFamily: "'Space Grotesk', sans-serif" }}
        />
      </div>

      {/* ── Glass Toolbar ── */}
      {!focusMode && (
        <div className="relative px-5 pb-3 shrink-0">
          <div className="w-full rounded-2xl px-4 py-3 flex items-center gap-4 overflow-x-auto"
            style={{ background: 'rgba(20,25,40,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => addBlock('text', { style: 'body' })} className="text-white/80 hover:text-white transition-colors"><Type className="w-4 h-4" /></button>
            <button onClick={() => addBlock('text', { style: 'heading' })} className="text-white/80 hover:text-white transition-colors"><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => addBlock('text', { style: 'body', color: '#E5E7EB' })} className="text-white/80 hover:text-white transition-colors"><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => addBlock('text', { content: '• ' })} className="text-white/80 hover:text-white transition-colors"><List className="w-4 h-4" /></button>
            <button onClick={() => addBlock('text', { content: '1. ' })} className="text-white/80 hover:text-white transition-colors"><ListOrdered className="w-4 h-4" /></button>
            <button onClick={() => addBlock('text', { style: 'quote', highlight: 'rgba(139,92,246,0.10)' })} className="text-white/80 hover:text-white transition-colors"><Quote className="w-4 h-4" /></button>
            <button onClick={() => addBlock('text', { style: 'caption', color: '#A5B4FC', highlight: 'rgba(17,24,39,0.85)' })} className="text-white/80 hover:text-white transition-colors"><Code2 className="w-4 h-4" /></button>
            <button onClick={() => { fileTypeRef.current = 'photo'; fileInputRef.current?.click(); }} className="text-white/80 hover:text-white transition-colors"><Image className="w-4 h-4" /></button>
            <button onClick={() => setShowBgPicker(!showBgPicker)} className="text-white/80 hover:text-white transition-colors"><Palette className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="relative flex-1 overflow-y-auto px-5 py-4" onClick={() => { setSelectedBlockId(null); setEditingBlockId(null); setShowTextStyle(false); setShowFilterPicker(false); setSlashMenu(null); }}>
        <div className="space-y-3 rounded-[20px] p-5" style={{
          background: 'linear-gradient(180deg, rgba(20,25,45,0.9), rgba(10,15,30,0.95))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.45)',
        }}>
        {blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <p className="text-white text-lg font-bold mb-1" style={{ fontFamily: "'Space Grotesk'" }}>Your canvas</p>
            <p className="text-white/60 text-sm">Tap the tools below to start</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {blocks.map((block) => (
            <motion.div
              key={block.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              draggable
              onDragStart={() => setDraggedBlockId(block.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedBlockId && draggedBlockId !== block.id) {
                  moveBlock(draggedBlockId, block.id);
                }
                setDraggedBlockId(null);
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); setShowTextStyle(false); setShowFilterPicker(false); }}
              className={`relative transition-all ${selectedBlockId === block.id ? 'ring-2 ring-violet-300/50 ring-offset-2 ring-offset-transparent -translate-y-0.5' : ''}`}
              style={{
                borderRadius: 16,
                background: selectedBlockId === block.id
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.08))'
                  : block.highlight || 'transparent',
                boxShadow: selectedBlockId === block.id ? '0 8px 24px rgba(124,58,237,0.25)' : 'none',
              }}
            >
              <div className="absolute -left-4 top-2 flex flex-col gap-1">
                <button className="w-7 h-7 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/60 hover:text-white">
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Delete button */}
              {selectedBlockId === block.id && (
                <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                    className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                    className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}

              {/* ── Text Block ── */}
              {block.type === 'text' && (
                <div className="p-4" style={{ borderRadius: 16 }}>
                  {block.style === 'quote' && <div className="w-1 h-full absolute left-0 top-0 rounded-full" style={{ background: 'hsl(var(--primary))' }} />}
                  {editingBlockId === block.id ? (
                    <div className="relative">
                      {isRichEmpty(block.richContent ?? block.content) && (
                        <span className="pointer-events-none absolute left-0 top-0 text-white/30" style={{ ...getTextStyle(block.style), lineHeight: 1.7 }}>
                          Type '/' for commands...
                        </span>
                      )}
                      <div
                        ref={(el) => { editableRefs.current[block.id] = el; }}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => {
                          const target = e.currentTarget;
                          updateBlock(block.id, {
                            content: target.innerText,
                            richContent: target.innerHTML,
                          });

                          const plain = target.innerText;
                          const slashMatch = plain.match(/(?:^|\s)\/([a-z]*)$/i);
                          if (slashMatch) {
                            setSlashMenu({ blockId: block.id, query: slashMatch[1].toLowerCase() });
                          } else if (slashMenu?.blockId === block.id) {
                            setSlashMenu(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            syncBlockFromEditable(block.id);
                            addBlockAfter(block.id, 'text', { style: 'body' });
                            return;
                          }

                          if (e.key === 'Escape') {
                            setInlineToolbar(null);
                          }
                        }}
                        onMouseUp={() => refreshInlineToolbar(block.id)}
                        onKeyUp={() => refreshInlineToolbar(block.id)}
                        onBlur={() => {
                          syncBlockFromEditable(block.id);
                          setEditingBlockId(null);
                          setTimeout(() => setInlineToolbar(null), 100);
                        }}
                        className="w-full bg-transparent border-0 outline-none text-white"
                        style={{ ...getTextStyle(block.style), color: block.color || '#fff', minHeight: 40, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: block.richContent || block.content || '' }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); setSelectedBlockId(block.id); }}
                      className="cursor-text min-h-[40px]"
                      style={{ ...getTextStyle(block.style), color: block.color || '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
                    >
                      {isRichEmpty(block.richContent ?? block.content)
                        ? <span className="opacity-30">Tap to type...</span>
                        : <div dangerouslySetInnerHTML={{ __html: block.richContent || block.content }} />}
                    </div>
                  )}
                </div>
              )}

              {/* ── Photo Block ── */}
              {block.type === 'photo' && block.previewUrl && (
                <div
                  className="overflow-hidden"
                  style={{
                    borderRadius: block.shape === 'circle' ? '50%' : block.shape === 'polaroid' ? 0 : 16,
                    ...(block.shape === 'polaroid' ? { background: 'white', padding: 12, paddingBottom: 40, transform: `rotate(${Math.random() * 4 - 2}deg)`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } : {}),
                  }}
                >
                  <img
                    src={block.previewUrl}
                    alt=""
                    className="w-full object-cover"
                    onClick={(e) => { e.stopPropagation(); setImagePreviewUrl(block.previewUrl || null); }}
                    style={{
                      filter: block.filter && block.filter !== 'none' ? PHOTO_FILTERS.find(f => f.id === block.filter)?.css : undefined,
                      borderRadius: block.shape === 'polaroid' ? 4 : block.shape === 'circle' ? '50%' : 16,
                      aspectRatio: block.shape === 'square' || block.shape === 'circle' ? '1' : undefined,
                      maxHeight: 400,
                    }}
                  />
                </div>
              )}

              {/* ── Video Block ── */}
              {block.type === 'video' && block.previewUrl && (
                <video
                  src={block.previewUrl}
                  className="w-full rounded-2xl"
                  style={{ maxHeight: 400 }}
                  controls
                  playsInline
                />
              )}

              {/* ── Mood Block ── */}
              {block.type === 'mood' && (
                <div
                  className="flex flex-col items-center justify-center p-5"
                  style={{ background: block.content ? MOODS.find(m => m.emoji === block.content)?.gradient : '#1e293b', borderRadius: 20, width: 160, height: 160 }}
                >
                  <span className="text-5xl mb-2">{block.content}</span>
                  <span className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk'" }}>
                    {MOODS.find(m => m.emoji === block.content)?.label}
                  </span>
                </div>
              )}

              {/* ── Sticker Block ── */}
              {block.type === 'sticker' && (
                <span className="text-5xl">{block.content}</span>
              )}

              {/* ── Date Block ── */}
              {block.type === 'date' && (
                <div className="px-4 py-2 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                  <p className="text-white/70 text-sm font-semibold" style={{ fontFamily: "'Space Grotesk'" }}>{block.content}</p>
                </div>
              )}

              {/* ── Location Block ── */}
              {block.type === 'location' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  {editingBlockId === block.id ? (
                    <input
                      autoFocus
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      onBlur={() => setEditingBlockId(null)}
                      className="bg-transparent border-0 outline-none text-white text-sm flex-1"
                      placeholder="Type location..."
                    />
                  ) : (
                    <span
                      onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); }}
                      className="text-white text-sm cursor-text"
                    >
                      {block.content || 'Tap to edit'}
                    </span>
                  )}
                </div>
              )}

              {/* ── Music Block ── */}
              {block.type === 'music' && (
                <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  {editingBlockId === block.id ? (
                    <input
                      autoFocus
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      onBlur={() => setEditingBlockId(null)}
                      className="bg-transparent border-0 outline-none text-white text-sm flex-1"
                      placeholder="Song name - Artist"
                    />
                  ) : (
                    <span
                      onClick={(e) => { e.stopPropagation(); setEditingBlockId(block.id); }}
                      className="text-white/70 text-sm cursor-text"
                    >
                      {block.content || 'What are you listening to?'}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        </div>

        {slashMenu && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,360px)] rounded-2xl border border-white/10 p-2"
            style={{ background: 'rgba(11,18,32,0.95)', backdropFilter: 'blur(12px)' }}>
            {slashCommands
              .filter((cmd) => cmd.label.toLowerCase().includes(slashMenu.query) || cmd.keywords.some((k) => k.includes(slashMenu.query)))
              .map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => cmd.action(slashMenu.blockId)}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/85 hover:bg-white/10 transition-colors"
                >
                  /{cmd.id} - {cmd.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* ── Text Style Bar (when text block selected) ── */}
      {inlineToolbar && (
        <div
          className="fixed z-[10010] flex items-center gap-1.5 rounded-xl px-2.5 py-2 border border-white/10"
          style={{
            left: inlineToolbar.x,
            top: inlineToolbar.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(9, 12, 22, 0.92)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            onClick={() => applyInlineCommand('bold')}
            className="w-7 h-7 rounded-md hover:bg-white/10 text-white/90 flex items-center justify-center"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15" />

          {['#FFFFFF', '#60A5FA', '#FCD34D', '#F472B6', '#A78BFA'].map((color) => (
            <button
              key={color}
              onClick={() => applyInlineCommand('foreColor', color)}
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ background: color }}
              title="Text color"
            />
          ))}

          <div className="w-px h-5 bg-white/15" />

          {['#312E81', '#4C1D95', '#7C2D12'].map((color) => (
            <button
              key={color}
              onClick={() => applyInlineCommand('hiliteColor', color)}
              className="w-7 h-7 rounded-md hover:bg-white/10 text-white/90 flex items-center justify-center"
              title="Highlight"
            >
              <Highlighter className="w-4 h-4" style={{ color }} />
            </button>
          ))}
        </div>
      )}

      {selectedBlock?.type === 'text' && showTextStyle && (
        <div className="px-4 py-2 shrink-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
            {TEXT_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => updateBlock(selectedBlock.id, { style: s.id })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedBlock.style === s.id ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {TEXT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => updateBlock(selectedBlock.id, { color: c.value })}
                className={`w-7 h-7 rounded-full border-2 transition-all ${selectedBlock.color === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ background: c.value }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Bar (when photo selected) ── */}
      {selectedBlock?.type === 'photo' && showFilterPicker && (
        <div className="px-4 py-2 shrink-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
            {PHOTO_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => updateBlock(selectedBlock.id, { filter: f.id })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${selectedBlock.filter === f.id ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {['rounded', 'square', 'circle', 'polaroid'].map(s => (
              <button
                key={s}
                onClick={() => updateBlock(selectedBlock.id, { shape: s })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize ${selectedBlock.shape === s ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Mood Picker ── */}
      {showMoodPicker && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 shrink-0"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map(mood => (
              <button
                key={mood.emoji}
                onClick={() => addBlock('mood', { content: mood.emoji })}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-95"
                style={{ background: mood.gradient }}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-white text-[10px] font-semibold">{mood.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Sticker Picker ── */}
      {showStickerPicker && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 shrink-0"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <div className="grid grid-cols-8 gap-2">
            {STICKERS.map(s => (
              <button
                key={s}
                onClick={() => addBlock('sticker', { content: s })}
                className="text-3xl p-2 rounded-full transition-all active:scale-90 hover:bg-white/10"
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Background Picker ── */}
      {showBgPicker && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-2 shrink-0"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex gap-2 overflow-x-auto">
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => { setBackground(bg); setShowBgPicker(false); }}
                className={`w-9 h-9 rounded-full shrink-0 border-2 transition-all ${background.id === bg.id ? 'border-white scale-110' : 'border-white/20'}`}
                style={{ background: bg.value }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Bottom Toolbar ── */}
      {!focusMode && (
      <div className="shrink-0 px-4 py-3 pb-safe" style={{ background: '#111827', borderTop: '1px solid #1f2937' }}>
        {/* Style toggle for selected block */}
        {selectedBlock?.type === 'text' && (
          <button
            onClick={() => setShowTextStyle(!showTextStyle)}
            className="mb-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70"
          >
            Aa Style
          </button>
        )}
        {selectedBlock?.type === 'photo' && (
          <button
            onClick={() => setShowFilterPicker(!showFilterPicker)}
            className="mb-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70"
          >
            🎨 Filter & Shape
          </button>
        )}

        <div className="flex gap-2 overflow-x-auto">
          {TOOLBAR_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={(e) => { e.stopPropagation(); item.action(); }}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] text-white/50 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ── Audience Sheet ── */}
      <Sheet open={showAudienceSheet} onOpenChange={setShowAudienceSheet}>
        <SheetContent side="bottom" className="p-0 border-0" style={{ background: '#111827', borderRadius: '24px 24px 0 0', borderTop: '1px solid #1f2937' }}>
          <SheetTitle className="sr-only">Who sees this diary?</SheetTitle>
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full" style={{ background: '#374151' }} />
          </div>
          <div className="px-5 pt-4 pb-8">
            <h2 className="text-white text-lg font-bold mb-4" style={{ fontFamily: "'Space Grotesk'" }}>Who sees this diary?</h2>
            <div className="space-y-2 mb-6">
              {AUDIENCES.map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all ${audience === a.id ? 'bg-primary/20 border border-primary/40' : 'bg-white/5 border border-transparent'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${audience === a.id ? 'bg-primary/30' : 'bg-white/10'}`}>
                      <Icon className={`w-5 h-5 ${audience === a.id ? 'text-primary' : 'text-white/50'}`} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white text-sm font-semibold">{a.label}</p>
                      <p className="text-white/40 text-xs">{a.desc}</p>
                    </div>
                    {audience === a.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePublish}
              disabled={publishing}
              className="w-full h-[52px] rounded-full text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), #3B82F6)' }}
            >
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : '📔 Post Diary'}
            </motion.button>
          </div>
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {imagePreviewUrl && (
          <motion.div
            className="fixed inset-0 z-[10000] bg-black/85 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setImagePreviewUrl(null)}
          >
            <img src={imagePreviewUrl} alt="Preview" className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
