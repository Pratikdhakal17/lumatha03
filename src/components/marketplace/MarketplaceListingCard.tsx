import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, MoreVertical, Edit3, Trash2, ShoppingBag, Briefcase, Home as HomeIcon, Phone, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  sell: 'from-blue-600/20 to-indigo-600/10 border-blue-600/25',
  job: 'from-blue-600/20 to-indigo-600/10 border-blue-600/25',
  rent: 'from-blue-600/20 to-indigo-600/10 border-blue-600/25',
};

const typeBadgeColors: Record<string, string> = {
  sell: 'bg-blue-600/15 text-blue-400 border-blue-600/20',
  job: 'bg-blue-600/15 text-blue-400 border-blue-600/20',
  rent: 'bg-blue-600/15 text-blue-400 border-blue-600/20',
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
  const isOwner = listing.user_id === currentUserId;
  const media = listing.media_urls || [];
  const TypeIcon = typeIcons[listing.type] || ShoppingBag;

  return (
    <Card className={cn(
      "border-0 overflow-hidden animate-fade-in backdrop-blur-sm",
      "bg-gradient-to-br", typeGradients[listing.type] || 'from-card/80 to-card/40'
    )}>
      {/* Header - Username & Price */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => onViewProfile(listing.user_id)}>
            <Avatar className="w-10 h-10 ring-1 ring-border/50">
              <AvatarImage src={listing.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600/30 to-indigo-600/30 text-foreground text-xs font-bold">
                {listing.profiles?.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0">
            <button onClick={() => onViewProfile(listing.user_id)} className="font-semibold text-sm truncate block hover:text-blue-400 transition-colors">
              {listing.profiles?.name || 'User'}
            </button>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        
        {/* Price - High contrast, prominent */}
        {listing.price != null && (
          <div className="text-right">
            <div className="font-bold text-lg text-blue-400">
              {listing.currency || 'NPR'} {listing.price.toLocaleString()}
            </div>
          </div>
        )}
        
        {/* More options */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2"><MoreVertical className="w-4 h-4" /></Button>
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

      {/* Media - Square/Portrait ratio, full width */}
      {media.length > 0 && (
        <div className="relative">
          <img
            src={media[imgIndex]}
            alt={listing.title}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
          {media.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={cn("w-1.5 h-1.5 rounded-full transition-all", i === imgIndex ? "bg-white w-3" : "bg-white/50")}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Social & Utility Row */}
      <div className="flex items-center gap-2 px-3 py-3">
        <Button variant="ghost" size="sm" onClick={() => onLike(listing.id)} className="h-10 w-10 p-0">
          <Heart className={cn("w-6 h-6", isLiked ? "fill-red-500 text-red-500" : "")} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onComment(listing.id)} className="h-10 w-10 p-0">
          <MessageCircle className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onShare(listing.id)} className="h-10 w-10 p-0">
          <Share2 className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSave(listing.id)} className="h-10 w-10 p-0">
          <Bookmark className={cn("w-6 h-6", isSaved ? "fill-blue-400 text-blue-400" : "")} />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{likesCount} likes</span>
      </div>

      {/* Content - Title & Description */}
      <div className="px-3 pb-2">
        <h3 className="font-bold text-base">{listing.title}</h3>
        {listing.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{listing.description}</p>
        )}
        {listing.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <MapPin className="w-3 h-3" />
            {listing.location}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {listing.category && <Badge variant="secondary" className="text-xs">{listing.category}</Badge>}
          {listing.qualification && <Badge variant="secondary" className="text-xs">{listing.qualification}</Badge>}
          {listing.salary_range && <Badge variant="outline" className="text-xs border-blue-600/20 text-blue-400">{listing.salary_range}</Badge>}
        </div>
      </div>

      {/* Sticky Action Buttons - Message */}
      {!isOwner && (
        <div className="flex gap-2 p-3 pt-2 border-t border-border/50">
          <Button 
            size="lg" 
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onChat(listing.user_id, listing.id)}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Message
          </Button>
        </div>
      )}
    </Card>
  );
}

