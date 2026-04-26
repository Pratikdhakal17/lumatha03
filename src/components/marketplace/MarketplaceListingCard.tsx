import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, MoreVertical, Edit3, Trash2, ShoppingBag, Briefcase, Home as HomeIcon, Phone, ChevronDown, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
  onChat: (userId: string, listingId: string) => void;
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
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const isOwner = listing.user_id === currentUserId;
  const media = listing.media_urls || [];
  const TypeIcon = typeIcons[listing.type] || ShoppingBag;

  return (
    <>
      <Card className={cn(
        "border-0 overflow-hidden animate-fade-in backdrop-blur-sm",
        "bg-gradient-to-br", typeGradients[listing.type] || 'from-card/80 to-card/40'
      )}>
        {/* Top Row: Profile pic, username, time, three dots */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <button onClick={() => onViewProfile(listing.user_id)}>
              <Avatar className="w-10 h-10 ring-1 ring-border/50">
                <AvatarImage src={listing.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700/50 to-gray-800/30 text-foreground text-xs font-bold">
                  {listing.profiles?.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0">
              <button onClick={() => onViewProfile(listing.user_id)} className="font-semibold text-sm truncate block hover:text-white transition-colors">
                {listing.profiles?.name || 'User'}
              </button>
              <div className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          {/* More options */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
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

        {/* Price (left) and Location (right) */}
        <div className="flex items-center justify-between px-3 pb-3">
          {listing.price != null && (
            <div className="font-bold text-lg text-white">
              {listing.currency || 'NPR'} {listing.price.toLocaleString()}
            </div>
          )}
          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {listing.location}
            </div>
          )}
        </div>

        {/* Mobile: full-width swipeable media */}
        {media.length > 0 && (
          <div className="md:hidden px-3 pb-3">
            <div
              className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory rounded-lg"
              onScroll={(e) => {
                const container = e.currentTarget;
                if (!container.clientWidth) return;
                const nextIndex = Math.round(container.scrollLeft / container.clientWidth);
                if (nextIndex !== imgIndex) setImgIndex(nextIndex);
              }}
            >
              {media.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  className="w-full shrink-0 snap-center"
                  onClick={() => {
                    setImgIndex(i);
                    setImageDialogOpen(true);
                  }}
                >
                  <img
                    src={url}
                    alt={`${listing.title} ${i + 1}`}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            {media.length > 1 && (
              <div className="mt-2 flex justify-center gap-1">
                {media.map((_, i) => (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    onClick={() => setImgIndex(i)}
                    className={cn('h-1.5 rounded-full transition-all', i === imgIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Desktop: 50/50 image and description */}
        <div className="hidden md:flex gap-3 px-3 pb-3">
          {media.length > 0 && (
            <div className="w-1/2 flex-shrink-0">
              <div className="relative cursor-pointer" onClick={() => setImageDialogOpen(true)}>
                <img
                  src={media[imgIndex]}
                  alt={listing.title}
                  className="w-full aspect-square object-cover rounded-lg"
                  loading="lazy"
                />
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
          )}

          <div className="w-1/2 flex flex-col">
            {listing.description && (
              <>
                <p className={cn('text-sm text-muted-foreground', !showFullDesc && 'line-clamp-4')}>
                  {listing.description}
                </p>
                {listing.description.length > 150 && (
                  <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-white mt-1 hover:underline">
                    {showFullDesc ? 'See less' : 'See more'}
                  </button>
                )}
              </>
            )}
            <div className="flex items-center gap-2 mt-auto flex-wrap">
              {listing.category && <Badge variant="secondary" className="text-xs">{listing.category}</Badge>}
              {listing.qualification && <Badge variant="secondary" className="text-xs">{listing.qualification}</Badge>}
              {listing.salary_range && <Badge variant="outline" className="text-xs border-gray-600/50 text-white">{listing.salary_range}</Badge>}
            </div>
          </div>
        </div>

        {/* Mobile description and badges below media */}
        <div className="md:hidden px-3 pb-3">
          {listing.description && (
            <>
              <p className={cn('text-sm text-muted-foreground', !showFullDesc && 'line-clamp-4')}>
                {listing.description}
              </p>
              {listing.description.length > 150 && (
                <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs text-white mt-1 hover:underline">
                  {showFullDesc ? 'See less' : 'See more'}
                </button>
              )}
            </>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {listing.category && <Badge variant="secondary" className="text-xs">{listing.category}</Badge>}
            {listing.qualification && <Badge variant="secondary" className="text-xs">{listing.qualification}</Badge>}
            {listing.salary_range && <Badge variant="outline" className="text-xs border-gray-600/50 text-white">{listing.salary_range}</Badge>}
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

        {/* Bottom: Message and Call buttons */}
        {!isOwner && (
          <div className="flex gap-2 p-3 pt-2 border-t border-border/50">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 h-12 border-gray-600/50 text-white hover:bg-gray-700/20"
              onClick={() => onChat(listing.user_id, listing.id)}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Message
            </Button>
            <Button 
              size="lg" 
              className="flex-1 h-12 bg-white hover:bg-gray-200 text-black"
              onClick={() => onChat(listing.user_id, listing.id)}
            >
              <Phone className="w-5 h-5 mr-2" />
              Call
            </Button>
          </div>
        )}
      </Card>

      {/* Full Image View Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl bg-black/95 border-gray-800 p-0">
          <button 
            onClick={() => setImageDialogOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full aspect-square max-h-[80vh]">
            <img
              src={media[imgIndex]}
              alt={listing.title}
              className="w-full h-full object-contain"
            />
            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={() => setImgIndex((imgIndex - 1 + media.length) % media.length)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronDown className="w-6 h-6 rotate-90" />
                </button>
                <span className="text-white text-sm self-center">{imgIndex + 1} / {media.length}</span>
                <button
                  onClick={() => setImgIndex((imgIndex + 1) % media.length)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronDown className="w-6 h-6 -rotate-90" />
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

