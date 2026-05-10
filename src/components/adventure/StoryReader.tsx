import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, 
  MapPin, Clock, Sparkles
} from 'lucide-react';
import LazyBlurImage from '@/components/LazyBlurImage';
import { supabase } from '@/integrations/supabase/client';

interface TravelStory {
  id: string;
  title: string;
  content: string;
  location: string;
  image?: string;
  video?: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  likes: number;
  comments: number;
  moods?: string[];
  tags?: string[];
  photos?: string[];
}

interface StoryReaderProps {
  story: TravelStory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onPlaceClick?: (placeName: string) => void;
}

export function StoryReader({
  story,
  open,
  onOpenChange,
  isLiked,
  onLike,
  onComment,
  onShare,
  onPlaceClick
}: StoryReaderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setScrollProgress(0);
      setAiSummary('');
      setHasReachedEnd(false);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    if (scrollHeight <= 0) {
      setScrollProgress(100);
      return;
    }

    const progress = (scrollTop / scrollHeight) * 100;
    setScrollProgress(Math.min(Math.max(progress, 0), 100));

    // Check if reached end
    if (progress > 90 && !hasReachedEnd && story) {
      setHasReachedEnd(true);
      loadAiSummary();
    }
  };

  const loadAiSummary = async () => {
    if (!story || aiSummary) return;
    
    setLoadingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('story-ai', {
        body: { 
          type: 'shorten',
          existingContent: story.content 
        }
      });
      if (data?.content) {
        // Take just first sentence
        const summary = data.content.split('.')[0] + '.';
        setAiSummary(summary);
      }
    } catch (err) {
      console.error('Error loading summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const getReadingTime = (content: string) => {
    const words = content?.split(/\s+/).length || 0;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min read`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Render paragraphs with drop cap for first letter
  const renderContent = (content: string) => {
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((para, index) => {
      if (index === 0 && para.length > 0) {
        // First paragraph with drop cap
        const firstLetter = para.charAt(0);
        const rest = para.slice(1);
        return (
          <p key={index} className="text-[17px] text-white leading-[1.9] mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span 
              className="float-left mr-2 text-[52px] font-bold leading-[0.85]"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#7C3AED' }}
            >
              {firstLetter}
            </span>
            {rest}
          </p>
        );
      }
      return (
        <p key={index} className="text-[17px] text-white leading-[1.9] mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          {para}
        </p>
      );
    });
  };

  if (!story) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-full p-0 border-0 overflow-hidden"
        style={{ background: '#0a0f1e' }}
      >
        <SheetTitle className="sr-only">Travel story reader</SheetTitle>
        <SheetDescription className="sr-only">Read the selected travel story with reactions and sharing controls.</SheetDescription>
        {/* Reading Progress Bar */}
        <div 
          className="fixed top-0 left-0 h-[2px] z-[9999] transition-all duration-100"
          style={{ 
            width: `${scrollProgress}%`,
            background: '#7C3AED'
          }}
        />

        <div 
          ref={contentRef}
          className="h-full overflow-y-auto"
          onScroll={handleScroll}
        >
          {/* Hero Section */}
          <div className="relative h-[320px]">
            <LazyBlurImage 
              src={story.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'}
              alt={story.title}
              className="w-full h-full object-cover"
            />
            
            {/* Gradient Overlay */}
            <div 
              className="absolute inset-0"
              style={{ 
                background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.85) 100%)'
              }}
            />

            {/* Content Over Hero */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {/* Mood Pills */}
              {story.moods && story.moods.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {story.moods.map(mood => (
                    <span
                      key={mood}
                      className="px-2 py-0.5 rounded-full text-[11px] text-white backdrop-blur-md"
                      style={{ background: 'rgba(0,0,0,0.4)' }}
                    >
                      {mood}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 
                className="text-[28px] font-bold text-white leading-tight line-clamp-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {story.title}
              </h1>

              {/* Author Row */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold"
                    style={{ background: 'rgba(124, 58, 237, 0.3)', color: 'white' }}
                  >
                    {story.authorAvatar}
                  </div>
                  <span 
                    className="text-[14px] font-semibold text-white"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {story.author}
                  </span>
                </div>
                <span className="text-[12px]" style={{ color: '#94A3B8' }}>
                  {getReadingTime(story.content)} · {formatDate(story.createdAt)}
                </span>
              </div>

              {/* Location */}
              {story.location && (
                <button 
                  onClick={() => onPlaceClick?.(story.location)}
                  className="flex items-center gap-1 mt-2 text-[13px]"
                  style={{ color: '#94A3B8' }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {story.location}
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="px-5 py-6">
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 text-[13px] font-semibold mb-5"
              style={{ color: '#94A3B8' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {renderContent(story.content)}

            {/* Inline Photos */}
            {story.photos && story.photos.length > 0 && (
              <div className="my-6">
                <p className="text-[13px] mb-3" style={{ color: '#94A3B8' }}>
                  More from this trip
                </p>
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
                  {story.photos.map((photo, i) => (
                    <div key={i} className="snap-center shrink-0 w-[86%] max-w-[360px] rounded-2xl overflow-hidden" style={{ background: '#111827' }}>
                      <div className="aspect-[4/5] w-full">
                        <LazyBlurImage 
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Card */}
            {story.location && (
              <div 
                className="p-4 rounded-2xl mb-6"
                style={{ background: '#111827', border: '1px solid #1f2937' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <LazyBlurImage 
                      src={`https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200`}
                      alt={story.location}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-white flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {story.location}
                    </p>
                    <button 
                      onClick={() => onPlaceClick?.(story.location)}
                      className="text-[13px] mt-1"
                      style={{ color: '#7C3AED' }}
                    >
                      View Place →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Summary (appears at end) */}
            {hasReachedEnd && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl mb-6"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(59, 130, 246, 0.1))',
                  border: '1px solid rgba(124, 58, 237, 0.2)'
                }}
              >
                <p className="text-[13px] flex items-center gap-2 mb-2" style={{ color: '#94A3B8' }}>
                  <Sparkles className="w-4 h-4 text-primary" />
                  Story Summary
                </p>
                {loadingSummary ? (
                  <div className="h-4 rounded animate-pulse" style={{ background: '#1f2937' }} />
                ) : (
                  <p className="text-[15px] text-white italic">{aiSummary || story.content.slice(0, 100) + '...'}</p>
                )}
              </motion.div>
            )}

            {/* Tags */}
            {story.tags && story.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {story.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-[12px]"
                    style={{ 
                      background: 'rgba(124, 58, 237, 0.1)',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                      color: '#A78BFA'
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Story end actions */}
            <div
              className="flex items-center gap-6 pt-4 mt-2"
              style={{ borderTop: '1px solid #1f2937' }}
            >
              <button
                onClick={onLike}
                className="flex items-center gap-1.5"
              >
                <Heart
                  className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
                  style={{ color: isLiked ? '#EF4444' : '#94A3B8' }}
                />
              </button>
              <button
                onClick={onComment}
                className="flex items-center gap-1.5"
                style={{ color: '#94A3B8' }}
              >
                <MessageCircle className="w-5 h-5" />
                {story.comments > 0 && (
                  <span className="text-[13px]">{story.comments}</span>
                )}
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 ml-auto"
                style={{ color: '#94A3B8' }}
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button style={{ color: '#94A3B8' }}>
                <Bookmark className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
