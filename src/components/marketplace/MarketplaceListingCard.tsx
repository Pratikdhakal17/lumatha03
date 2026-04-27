import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, MoreVertical, Edit3, Trash2, ShoppingBag, Briefcase, Home as HomeIcon, Phone, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FullScreenMediaViewer } from '@/components/FullScreenMediaViewer';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface Listing {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  category: string | null;
  media_urls: string[];
  media_types: string[];
  status: string | null;
  likes_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  qualification: string | null;
  salary_range: string | null;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null; username: string | null; id: string };
}

interface Props {
  listing: Listing;
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;
  currentUserId: string;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
  onShare: (id: string) => void;
  onChat: (userId: string, listingId: string, title?: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (listing: Listing) => void;
  onViewProfile: (userId: string) => void;
}

const typeIcons: Record<string, any> = {
  sell: ShoppingBag,
  job: Briefcase,
  rent: HomeIcon,
};

const typeGradients: Record<string, string> = {
  sell: 'from-gray-800/50 to-gray-900/30 border-gray-700/50',
  job: 'from-gray-800/50 to-gray-900/30 border-gray-700/50',
  rent: 'from-gray-800/50 to-gray-900/30 border-gray-700/50',
};

const typeBadgeColors: Record<string, string> = {
  sell: 'bg-gray-700/50 text-white border-gray-600/50',
  job: 'bg-gray-700/50 text-white border-gray-600/50',
  rent: 'bg-gray-700/50 text-white border-gray-600/50',
};

const actionLabels: Record<string, string> = {
  sell: 'Buy',
  job: 'Apply',
  rent: 'Contact',
};

export function MarketplaceListingCard({
  listing, isLiked, isSaved, likesCount, commentsCount,
  currentUserId, onLike, onSave, onComment, onShare, onChat,
  onDelete, onEdit, onViewProfile
}: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const isOwner = listing.user_id === currentUserId;
  const media = listing.media_urls || [];
  const mediaTypes = (listing.media_types && listing.media_types.length > 0
    ? listing.media_types
    : media.map(() => 'image')) as string[];
  const TypeIcon = typeIcons[listing.type] || ShoppingBag;
  const isMobile = useIsMobile();

  return (
    <>
      <Card className={cn(
        "border-0 overflow-hidden animate-fade-in backdrop-blur-sm",
        "bg-gradient-to-br", typeGradients[listing.type] || 'from-card/80 to-card/40'
      )}>
        {/* Header: Profile pic, username, NPR, time, three dots */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => onViewProfile(listing.user_id)}>
              <Avatar className="w-10 h-10 ring-1 ring-border/50">
                <AvatarImage src={listing.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700/50 to-gray-800/30 text-foreground text-xs font-bold">
                  {listing.profiles?.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0 flex-1">
              <button onClick={() => onViewProfile(listing.user_id)} className="font-semibold text-sm truncate block hover:text-white transition-colors">
                {listing.profiles?.name || 'User'}
              </button>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                {listing.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {listing.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* NPR Price in green */}
          {listing.price != null && (
            <div className="font-bold text-base text-emerald-500 mr-2 shrink-0">
              NPR {listing.price.toLocaleString()}
            </div>
          )}
          
          {/* More options */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[100] bg-popover shadow-xl">
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(listing)}><Edit3 className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(listing.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => onShare(listing.id)}><Share2 className="w-4 h-4 mr-2" />Share</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSave(listing.id)}><Bookmark className="w-4 h-4 mr-2" />{isSaved ? 'Unsave' : 'Save'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <div className="px-3 pb-2">
          <h3 className="font-bold text-base">{listing.title}</h3>
        </div>

        {/* Main Content: Picture left to middle, Description middle to right */}
        <div className="flex gap-3 px-3 pb-3">
          {/* Picture section - takes up left to middle (about 45%) */}
          {media.length > 0 ? (
            <div className="w-[45%] shrink-0">
              <div className="relative cursor-pointer rounded-lg overflow-hidden" onClick={() => setImageViewerOpen(true)}>
                <img
                  src={media[imgIndex]}
                  alt={listing.title}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                
                {/* Desktop navigation arrows inside image */}
                {!isMobile && media.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setImgIndex((prev) => (prev - 1 + media.length) % media.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setImgIndex((prev) => (prev + 1) % media.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                
                {/* Image dots indicator */}
                {media.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {media.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                        className={cn('w-1.5 h-1.5 rounded-full transition-all', i === imgIndex ? 'bg-white w-3' : 'bg-white/50')}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-[45%] shrink-0 aspect-square bg-muted/50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Description section - takes up middle to right (about 55%) */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Description - full text without truncation */}
            {listing.description ? (
              <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-hide">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {listing.description}
                </p>
              </div>
            ) : (
              <div className="flex-1 text-sm text-muted-foreground italic">
                No description provided
              </div>
            )}
            
            {/* Badges at bottom */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {listing.category && <Badge variant="secondary" className="text-xs">{listing.category}</Badge>}
              {listing.qualification && <Badge variant="secondary" className="text-xs">{listing.qualification}</Badge>}
              {listing.salary_range && <Badge variant="outline" className="text-xs border-gray-600/50 text-white">{listing.salary_range}</Badge>}
            </div>
          </div>
        </div>

        {/* Social Icons: Like, Comment, Share, Save with counts */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onLike(listing.id)} className="h-10 w-10 p-0">
              <Heart className={cn("w-6 h-6", isLiked ? "fill-red-500 text-red-500" : "")} />
            </Button>
            <span className="text-xs text-muted-foreground">{likesCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onComment(listing.id)} className="h-10 w-10 p-0">
              <MessageCircle className="w-6 h-6" />
            </Button>
            <span className="text-xs text-muted-foreground">{commentsCount}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onShare(listing.id)} className="h-10 w-10 p-0">
            <Share2 className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSave(listing.id)} className="h-10 w-10 p-0">
            <Bookmark className={cn("w-6 h-6", isSaved ? "fill-white text-white" : "")} />
          </Button>
        </div>

        {/* Bottom: Message (blue) and Call (green) buttons */}
        {!isOwner && (
          <div className="flex gap-2 p-3 pt-2 border-t border-border/50">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white border-0"
              onClick={() => onChat(listing.user_id, listing.id, listing.title)}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Message
            </Button>
            <Button 
              size="lg" 
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              onClick={() => onChat(listing.user_id, listing.id, listing.title)}
            >
              <Phone className="w-5 h-5 mr-2" />
              Call
            </Button>
          </div>
        )}
      </Card>

      {/* Full Image View */}
      <FullScreenMediaViewer
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        mediaUrls={media}
        mediaTypes={mediaTypes}
        initialIndex={imgIndex}
        title={listing.title}
        minimal
      />
    </>
  );
}

