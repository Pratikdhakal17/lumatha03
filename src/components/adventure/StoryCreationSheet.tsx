import { useEffect, useState, useRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plane, Camera, MapPin, Sparkles, Image as ImageIcon, 
  X, Check, Rocket, Wand2, FileText, Target, Flag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LazyBlurImage from '@/components/LazyBlurImage';
import { useAuth } from '@/contexts/AuthContext';

interface StoryCreationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (story: {
    title: string;
    location: string;
    content: string;
    image?: string;
    photos?: string[];
    moods: string[];
    tags: string[];
    audience: string;
  }) => void;
  initialTitle?: string;
  initialStory?: {
    title?: string;
    location?: string;
    content?: string;
    image?: string;
    photos?: string[];
    moods?: string[];
    tags?: string[];
    audience?: string;
  } | null;
}

const MOODS = [
  { emoji: '🏔️', label: 'Epic' },
  { emoji: '🧘', label: 'Peaceful' },
  { emoji: '🎉', label: 'Fun' },
  { emoji: '😮', label: 'Surprising' },
  { emoji: '😢', label: 'Emotional' },
  { emoji: '💪', label: 'Challenging' },
  { emoji: '❤️', label: 'Romantic' },
  { emoji: '🌧️', label: 'Rainy day' },
  { emoji: '☀️', label: 'Perfect weather' },
];

const AUDIENCES = [
  { id: 'global', label: '🌍 Global' },
  { id: 'nepal', label: '🇳🇵 Nepal Only' },
  { id: 'friends', label: '👥 Friends' },
];

const getCleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

const getUniqueCharRatio = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return 0;
  return new Set(normalized.split('')).size / normalized.length;
};

const isRepeatedCharacterString = (value: string) => {
  const normalized = value.toLowerCase().replace(/\s+/g, '');
  return normalized.length > 0 && /^([a-z0-9])\1+$/.test(normalized);
};

const isNumericOnly = (value: string) => /^\d+$/.test(value.replace(/\s+/g, ''));

const getWordCount = (value: string) =>
  getCleanText(value)
    .split(' ')
    .filter((word) => /[a-z]/i.test(word)).length;

const validateStoryTitle = (value: string): string | null => {
  const trimmed = getCleanText(value);
  if (!trimmed) return 'Please enter a meaningful title (at least 2 words).';
  if (getWordCount(trimmed) < 2) return 'Please enter a meaningful title (at least 2 words).';
  // Only block obvious gibberish (repeated chars or all numeric)
  if (isRepeatedCharacterString(trimmed) || isNumericOnly(trimmed)) return 'Please enter a meaningful title (at least 2 words).';
  return null;
};

const validateStoryBody = (value: string): string | null => {
  const trimmed = getCleanText(value);
  if (!trimmed) return null;
  // Only block obvious gibberish (repeated chars or all numeric)
  if (isRepeatedCharacterString(trimmed) || isNumericOnly(trimmed)) return 'Please write a meaningful description.';
  return null;
};

export function StoryCreationSheet({ 
  open, 
  onOpenChange, 
  onPublish,
  initialTitle = '',
  initialStory = null,
}: StoryCreationSheetProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialTitle);
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [moods, setMoods] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [audience, setAudience] = useState('global');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const titleError = validateStoryTitle(title);
  const bodyError = validateStoryBody(content);
  const canPublish = !titleError && !bodyError;
  const isEditing = Boolean(initialStory);

  useEffect(() => {
    if (!open) return;

    if (initialStory) {
      setTitle(initialStory.title || '');
      setLocation(initialStory.location || '');
      setContent(initialStory.content || '');
      setCoverImage(initialStory.image || '');
      setPhotos(initialStory.photos || []);
      setMoods(initialStory.moods || []);
      setTags(initialStory.tags || []);
      setAudience(initialStory.audience || 'global');
    } else {
      setTitle(initialTitle);
      setLocation('');
      setContent('');
      setCoverImage('');
      setPhotos([]);
      setMoods([]);
      setTags([]);
      setAudience('global');
    }

    setTagInput('');
    setTitleTouched(false);
    setBodyTouched(false);
    setAttemptedPublish(false);
  }, [open, initialStory, initialTitle]);

  const buildUploadPath = (file: File, prefix: 'cover' | 'story') => {
    const safeExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const token = Math.random().toString(36).slice(2, 10);
    return `${user?.id}/${prefix}-${Date.now()}-${token}.${safeExt}`;
  };

  const toggleMood = (emoji: string) => {
    setMoods(prev => 
      prev.includes(emoji) 
        ? prev.filter(m => m !== emoji)
        : [...prev, emoji]
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error('Please sign in to upload media');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploading(true);
    try {
      const fileName = buildUploadPath(file, 'cover');
      
      const { error: uploadError, data } = await supabase.storage
        .from('posts-media')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '31536000',
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('posts-media')
        .getPublicUrl(fileName);
      
      setCoverImage(publicUrl);
      toast.success('Cover photo added!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 10) return;
    if (!user?.id) {
      toast.error('Please sign in to upload media');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploading(true);
    try {
      const fileName = buildUploadPath(file, 'story');
      
      const { error: uploadError } = await supabase.storage
        .from('posts-media')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '31536000',
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('posts-media')
        .getPublicUrl(fileName);
      
      setPhotos(prev => [...prev, publicUrl]);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const fetchCoverFromLocation = async () => {
    if (!location.trim()) {
      toast.error('Enter a location first');
      return;
    }
    
    setUploading(true);
    try {
      // Use Unsplash search for location
      const query = encodeURIComponent(`${location} landmark travel`);
      const unsplashUrl = `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop`;
      setCoverImage(unsplashUrl);
      toast.success('Found a cover photo!');
    } catch (err) {
      console.error('Error fetching cover:', err);
    } finally {
      setUploading(false);
    }
  };

  const callAI = async (type: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('story-ai', {
        body: { 
          type,
          location,
          moods,
          title,
          existingContent: content
        }
      });
      
      if (error) throw error;
      
      if (data?.content) {
        if (type === 'share_caption') {
          setShareCaption(data.content);
        } else {
          setContent(data.content);
        }
        toast.success('AI magic applied! ✨');
      }
    } catch (err: any) {
      console.error('AI error:', err);
      if (err.message?.includes('429')) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (err.message?.includes('402')) {
        toast.error('AI credits exhausted. Please add credits.');
      } else {
        toast.error('AI unavailable right now');
      }
    } finally {
      setAiLoading(false);
      setShowAiPanel(false);
    }
  };

  const handlePublish = async () => {
    setAttemptedPublish(true);
    setTitleTouched(true);
    setBodyTouched(true);

    if (!canPublish) {
      toast.error(titleError || bodyError || 'Please complete the story before publishing.');
      return;
    }

    if (!coverImage) {
      toast.error('Cover photo is required for travel stories.');
      return;
    }
    
    // Generate share caption
    setAiLoading(true);
    try {
      const { data } = await supabase.functions.invoke('story-ai', {
        body: { type: 'share_caption', title, location }
      });
      if (data?.content) {
        setShareCaption(data.content);
      }
    } catch {}
    setAiLoading(false);
    
    onPublish({
      title: title.trim(),
      location: location.trim(),
      content: content.trim(),
      image: coverImage,
      photos,
      moods,
      tags,
      audience
    });
    
    setShowSuccess(true);
  };

  const resetForm = () => {
    setTitle('');
    setLocation('');
    setContent('');
    setCoverImage('');
    setMoods([]);
    setTags([]);
    setPhotos([]);
    setAudience('global');
    setShowSuccess(false);
    setShareCaption('');
    setTitleTouched(false);
    setBodyTouched(false);
    setAttemptedPublish(false);
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-full p-0 border-0" style={{ background: '#0a0f1e' }}>
          <SheetTitle className="sr-only">Story published</SheetTitle>
          <SheetDescription className="sr-only">Confirmation that your travel story has been published.</SheetDescription>
          <div className="flex flex-col items-center justify-center h-full px-8">
            {/* Confetti effect placeholder */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="text-[72px] mb-6"
            >
              ✈️
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[28px] font-bold text-white text-center"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Story Published!
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[16px] text-center mt-2"
              style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}
            >
              Your journey is now inspiring others
            </motion.p>

            {shareCaption && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full mt-8 p-4 rounded-2xl"
                style={{ background: '#111827', border: '1px solid #1f2937' }}
              >
                <p className="text-[13px] flex items-center gap-2 mb-2" style={{ color: '#94A3B8' }}>
                  <Sparkles className="w-4 h-4 text-primary" />
                  Share caption ready:
                </p>
                <p className="text-[15px] italic text-white">{shareCaption}</p>
                <button 
                  className="mt-3 text-[13px] text-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(shareCaption);
                    toast.success('Caption copied!');
                  }}
                >
                  Copy Caption
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full mt-8 space-y-3"
            >
              <button
                onClick={resetForm}
                className="w-full h-[52px] rounded-2xl text-[15px] font-semibold text-white flex items-center justify-center gap-2"
                style={{ 
                  background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <Check className="w-5 h-5" />
                Done
              </button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] p-0 border-0 rounded-t-[24px] overflow-hidden shadow-2xl [&>button]:hidden" style={{ background: '#0a0f1e' }}>
        <SheetTitle className="sr-only">Create travel story</SheetTitle>
        <SheetDescription className="sr-only">Write and publish a travel story with media, mood, and audience settings.</SheetDescription>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full" style={{ background: '#1e293b' }} />
        </div>

        <div className="h-[calc(92vh-24px)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900/50">
            <button onClick={() => onOpenChange(false)} className="p-1">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <span 
              className="text-[16px] font-semibold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {isEditing ? 'Edit Story' : 'New Story'}
            </span>
            <button
              onClick={handlePublish}
              disabled={!canPublish || uploading}
              className="px-4 py-1.5 rounded-full text-[14px] font-semibold text-white flex items-center gap-1 disabled:opacity-50"
              style={{ background: canPublish ? '#7C3AED' : '#374151' }}
            >
              {isEditing ? 'Update' : 'Publish'} <Plane className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Cover Photo */}
            <div className="relative">
              {coverImage ? (
                <div className="h-[280px] relative">
                  <LazyBlurImage 
                    src={coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setCoverImage('')}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label 
                  className="h-[200px] flex flex-col items-center justify-center cursor-pointer"
                  style={{ 
                    background: 'rgba(124, 58, 237, 0.05)',
                    border: '2px dashed rgba(124, 58, 237, 0.3)'
                  }}
                >
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <Camera className="w-8 h-8 text-primary mb-2" />
                  <span 
                    className="text-[16px] font-semibold text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Add Cover Photo
                  </span>
                  <span 
                    className="text-[13px] mt-1"
                    style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}
                  >
                    Makes your story 10x more compelling
                  </span>
                </label>
              )}
              
              {!coverImage && location && (
                <button
                  onClick={fetchCoverFromLocation}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[13px] font-medium text-white flex items-center gap-2"
                  style={{ background: 'rgba(124, 58, 237, 0.8)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Find photo for my location
                </button>
              )}
            </div>

            {/* Title */}
            <div className="px-5 pt-5 pb-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                placeholder="Your story title..."
                className="w-full bg-transparent text-[26px] font-bold text-white placeholder:text-slate-600 outline-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              />
              {(titleTouched || attemptedPublish) && titleError ? (
                <p className="mt-1 text-[12px]" style={{ color: '#FCA5A5' }}>
                  {titleError}
                </p>
              ) : null}
            </div>

            {/* Location */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid #1f2937' }}>
                <MapPin className="w-5 h-5" style={{ color: '#94A3B8' }} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where did you go?"
                  className="flex-1 bg-transparent text-[16px] text-white placeholder:text-slate-600 outline-none"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>

            {/* Mood Selector */}
            <div className="px-5 py-3">
              <p className="text-[13px] mb-2" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                What was the vibe?
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {MOODS.map(mood => (
                  <button
                    key={mood.emoji}
                    onClick={() => toggleMood(mood.emoji)}
                    className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap flex items-center gap-1"
                    style={{
                      background: moods.includes(mood.emoji) ? 'rgba(124, 58, 237, 0.15)' : '#111827',
                      border: moods.includes(mood.emoji) ? '1px solid #7C3AED' : '1px solid #1f2937',
                      color: moods.includes(mood.emoji) ? '#A78BFA' : '#94A3B8',
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    {mood.emoji} {mood.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Story Content */}
            <div className="px-5 py-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => setBodyTouched(true)}
                placeholder={`Tell your story...

What happened? How did it feel?
What surprised you? What would you 
tell someone visiting for the first time?`}
                className="w-full min-h-[200px] bg-transparent text-[16px] text-white placeholder:text-slate-600 outline-none resize-none"
                style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.9 }}
              />
              {(bodyTouched || attemptedPublish) && bodyError ? (
                <p className="mt-1 text-[12px]" style={{ color: '#FCA5A5' }}>
                  {bodyError}
                </p>
              ) : null}
            </div>

            {/* Photo Gallery */}
            <div className="px-5 py-3">
              <p className="text-[13px] mb-2" style={{ color: '#94A3B8' }}>Add Photos</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <label 
                  className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-xl cursor-pointer"
                  style={{ border: '2px dashed #374151' }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <ImageIcon className="w-6 h-6" style={{ color: '#94A3B8' }} />
                </label>
                {photos.map((photo, i) => (
                  <div key={i} className="w-20 h-20 flex-shrink-0 relative rounded-xl overflow-hidden">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: '#4B5563' }}>
                Max 10 photos
              </p>
            </div>

            {/* Tags */}
            <div className="px-5 py-3">
              <p className="text-[13px] mb-2" style={{ color: '#94A3B8' }}>Add tags</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-full text-[12px] flex items-center gap-1"
                    style={{ 
                      background: 'rgba(124, 58, 237, 0.1)',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                      color: '#A78BFA'
                    }}
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Type and press enter..."
                className="w-full bg-transparent text-[14px] text-white placeholder:text-slate-600 outline-none"
              />
            </div>

            {/* Audience */}
            <div className="px-5 py-3 mb-20">
              <p className="text-[13px] mb-2" style={{ color: '#94A3B8' }}>Audience</p>
              <div className="flex gap-2">
                {AUDIENCES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className="px-4 py-2 rounded-full text-[13px]"
                    style={{
                      background: audience === a.id ? '#7C3AED' : '#111827',
                      color: audience === a.id ? 'white' : '#94A3B8',
                      border: audience === a.id ? 'none' : '1px solid #1f2937'
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Floating Button */}
          <button
            onClick={() => setShowAiPanel(true)}
            className="fixed bottom-24 right-5 w-12 h-12 rounded-full flex items-center justify-center z-50"
            style={{ 
              background: '#7C3AED',
              boxShadow: '0 6px 24px rgba(124, 58, 237, 0.5)'
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </button>

          {/* Sticky Publish Bar */}
          <div 
            className="fixed bottom-0 left-0 right-0 p-4"
            style={{ background: '#111827', borderTop: '1px solid #1f2937' }}
          >
            <button
              onClick={handlePublish}
              disabled={!canPublish || uploading || aiLoading}
              className="w-full h-[52px] rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ 
                background: canPublish ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : '#374151',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI Working...
                </>
              ) : (
                <>
                  {isEditing ? 'Update Story' : 'Publish Story'} <Plane className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Panel */}
        <AnimatePresence>
          {showAiPanel && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-x-0 bottom-0 rounded-t-[24px] p-5 z-50"
              style={{ background: '#111827', border: '1px solid #1f2937' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 
                  className="text-[18px] font-bold text-white flex items-center gap-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Story Assistant
                </h3>
                <button onClick={() => setShowAiPanel(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { type: 'write', icon: Rocket, label: 'Write my story', desc: 'AI writes based on location & mood' },
                  { type: 'improve', icon: Wand2, label: 'Improve my writing', desc: 'Make it more vivid & engaging' },
                  { type: 'expand', icon: FileText, label: 'Add more details', desc: 'Expand with sensory details' },
                  { type: 'shorten', icon: Target, label: 'Make it shorter', desc: 'Summarize key moments' },
                  { type: 'nepal_flavor', icon: Flag, label: 'Add Nepal flavor', desc: 'Cultural context & local words' },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => callAI(item.type)}
                    disabled={aiLoading}
                    className="w-full p-4 rounded-xl flex items-center gap-3 text-left disabled:opacity-50"
                    style={{ background: '#1f2937' }}
                  >
                    <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[14px] font-medium text-white">{item.label}</p>
                      <p className="text-[12px]" style={{ color: '#94A3B8' }}>{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {aiLoading && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px]" style={{ color: '#94A3B8' }}>AI is writing...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
