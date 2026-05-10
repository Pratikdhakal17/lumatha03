import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { 
  Search, Globe, MapPin, Heart, MessageCircle, Share2, 
  Bookmark, Plane, ArrowRight, Mountain, Building2, Waves, Eye, MoreVertical, Flag,
  UserCircle2, UserPlus, EyeOff, Copy, Pencil, Trash2, MinusCircle, ChevronUp, Edit3
} from 'lucide-react';
import LazyBlurImage from '@/components/LazyBlurImage';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const FALLBACK_STORY_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80&auto=format&fit=crop';

interface TravelStory {
  id: string;
  creatorId?: string;
  title: string;
  content: string;
  location: string;
  image?: string;
  video?: string;
  author: string;
  authorAvatar: string;
  authorAvatarUrl?: string;
  createdAt: string;
  likes: number;
  saves?: number;
  views?: number;
  comments: number;
  moods?: string[];
  tags?: string[];
  isFlagged?: boolean;
}

interface TravelStoriesFeedProps {
  stories: TravelStory[];
  currentUserId?: string;
  onCreateStory: () => void;
  onOpenStory: (story: TravelStory) => void;
  onLike: (id: string) => void;
  onComment: (id: string, title: string) => void;
  onShare: (id: string, title: string, content: string) => void;
  onSave: (id: string) => void;
  onReport: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  savedPosts: Set<string>;
  likedPosts: Set<string>;
}

export function TravelStoriesFeed({
  stories,
  currentUserId,
  onCreateStory,
  onOpenStory,
  onLike,
  onComment,
  onShare,
  onSave,
  onReport,
  onEdit,
  onDelete,
  savedPosts,
  likedPosts
}: TravelStoriesFeedProps) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  const FILTERS = [
    { id: 'global', label: 'Global' },
    { id: 'nepal', label: 'Nepal' },
    { id: 'mountains', label: 'Mountains' },
    { id: 'cities', label: 'Cities' },
    { id: 'beaches', label: 'Beaches' },
  ];

  const filteredStories = stories.filter(s => {
    const q = search.toLowerCase();
    const locationText = (s.location || '').toLowerCase();
    const contentText = (s.content || '').toLowerCase();
    const matchSearch = !search || 
      (s.title || '').toLowerCase().includes(q) ||
      (s.author || '').toLowerCase().includes(q) ||
      (s.content || '').toLowerCase().includes(q);
    
    if (category === 'liked') return matchSearch && likedPosts.has(s.id);
    if (category === 'saved') return matchSearch && savedPosts.has(s.id);
    if (category === 'own') return matchSearch && s.creatorId === currentUserId;
    if (category === 'nepal') return matchSearch && (locationText.includes('nepal') || contentText.includes('nepal'));
    if (category === 'mountains') return matchSearch && /(mountain|himalaya|peak|trek|summit|alp)/.test(`${locationText} ${contentText}`);
    if (category === 'cities') return matchSearch && /(city|town|urban|street|market)/.test(`${locationText} ${contentText}`);
    if (category === 'beaches') return matchSearch && /(beach|coast|island|ocean|sea)/.test(`${locationText} ${contentText}`);
    if (category === 'global') return matchSearch;
    
    return matchSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedStories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-[#0a0f1e] w-full pb-8 [touch-action:pan-y]">
      {/* Feed Header */}
      <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-4 py-6 border-b border-white/5 bg-[#0a0f1e]/50 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 shadow-lg touch-manipulation">
              <Avatar className="h-full w-full">
                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-slate-800 text-primary font-black uppercase">{profile?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-white/10 rounded-[24px] p-2 shadow-2xl">
            <DropdownMenuItem onClick={() => setCategory('all')} className="rounded-xl py-3 gap-3">
              <Globe className="w-4 h-4 text-primary" /> <span className="font-bold text-xs uppercase tracking-widest text-white">All Stories</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategory('liked')} className="rounded-xl py-3 gap-3">
              <Heart className="w-4 h-4 text-red-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Liked</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategory('saved')} className="rounded-xl py-3 gap-3">
              <Bookmark className="w-4 h-4 text-violet-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">Saved</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategory('own')} className="rounded-xl py-3 gap-3">
              <UserCircle2 className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-xs uppercase tracking-widest text-white">My Stories</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search stories or creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 bg-slate-900/50 border-white/5 rounded-full pl-11 pr-4 text-white placeholder:text-slate-600 font-bold focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Share Journey Row */}
      <div className="px-4 py-4">
        <button 
          onClick={onCreateStory}
          className="group relative w-full overflow-hidden h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between px-6 text-primary transition-all active:scale-95 touch-manipulation"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <div className="flex items-center gap-3">
            <Plane className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Share Your Journey</span>
          </div>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Region Filters */}
      <div className="w-full flex gap-2 overflow-x-auto no-scrollbar px-4 pb-6">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setCategory(f.id)}
            className={cn(
              "shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
              category === f.id ? "bg-white/10 border-white/20 text-white" : "bg-transparent text-slate-600 border-white/5"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stories Feed - 100% Width Layout */}
      <div className="w-full space-y-px">
        {filteredStories.map((story) => {
          const isExpanded = expandedStories.has(story.id);
          const isLiked = likedPosts.has(story.id);
          const isSaved = savedPosts.has(story.id);
          const isOwner = currentUserId === story.creatorId;
          
          return (
            <div key={story.id} className="w-full bg-[#111827] border-b border-white/5 overflow-hidden">
              {/* Top: Cover Pic */}
              <div className="w-full aspect-[4/3] bg-slate-900 relative">
                <img
                  src={story.image || FALLBACK_STORY_IMAGE}
                  className="w-full h-full object-cover"
                  alt={story.title || 'Travel story cover'}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_STORY_IMAGE;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-60" />
              </div>

              {/* Below Pic: Info */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10 border border-primary/20 ring-2 ring-primary/5">
                    <AvatarImage src={story.authorAvatarUrl || undefined} />
                    <AvatarFallback className="bg-slate-800 text-primary font-black uppercase">{story.authorAvatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-black text-white leading-tight truncate">{story.author}</h4>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{story.location}</p>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-3 leading-tight font-['Space_Grotesk']">{story.title}</h3>
                
                <div className="relative">
                  <p className={cn(
                    "text-sm text-slate-400 leading-relaxed font-medium transition-all duration-500",
                    !isExpanded && "line-clamp-3"
                  )} style={{ whiteSpace: 'pre-wrap' }}>
                    {story.content}
                  </p>
                  {story.content.length > 150 && (
                    <button 
                      onClick={() => toggleExpand(story.id)}
                      className="text-primary text-[11px] font-black uppercase tracking-widest mt-2 block"
                    >
                      {isExpanded ? 'See Less' : 'See More'}
                    </button>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center mt-6">
                  <div className="flex flex-nowrap items-center gap-4 sm:gap-6">
                    <button onClick={() => onLike(story.id)} className={cn("transition-all touch-manipulation", isLiked ? "text-red-500" : "text-slate-500")}>
                      <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                    </button>
                    <button onClick={() => onComment(story.id, story.title)} className="text-slate-500 touch-manipulation">
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button onClick={() => onSave(story.id)} className={cn("transition-all touch-manipulation", isSaved ? "text-violet-500" : "text-slate-500")}>
                      <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                    </button>
                    <button onClick={() => onShare(story.id, story.title, story.content)} className="text-slate-500 touch-manipulation">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="ml-auto p-2 text-slate-500 hover:bg-white/5 rounded-full transition-all touch-manipulation">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="bg-slate-900 border-white/10 rounded-2xl p-1.5 shadow-2xl">
                      {isOwner ? (
                        <>
                          <DropdownMenuItem className="rounded-xl gap-2.5 text-slate-300" onClick={() => onEdit?.(story.id)}>
                            <Edit3 className="w-4 h-4" /> <span className="font-bold text-[10px] uppercase tracking-widest">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl gap-2.5 text-red-500" onClick={() => onDelete?.(story.id)}>
                            <Trash2 className="w-4 h-4" /> <span className="font-bold text-[10px] uppercase tracking-widest">Delete</span>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem className="rounded-xl gap-2.5 text-slate-300" onClick={() => onReport(story.id)}>
                          <Flag className="w-4 h-4" /> <span className="font-bold text-[10px] uppercase tracking-widest">Report</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
