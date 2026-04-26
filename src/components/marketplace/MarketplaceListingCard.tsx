import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MapPin, MoreVertical, Edit3, Trash2, ShoppingBag, Briefcase, Home as HomeIcon, DollarSign } from 'lucide-react';
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
  sell: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/25',
  job: 'from-violet-500/20 to-purple-500/10 border-violet-500/25',
  rent: 'from-amber-500/20 to-orange-500/10 border-amber-500/25',
};

const typeBadgeColors: Record<string, string> = {
  sell: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  job: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  rent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
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
      {/* Header */}
      <div className="flex items-center gap-3 p-3 pb-2">
        <button onClick={() => onViewProfile(listing.user_id)}>
          <Avatar className="w-9 h-9 ring-1 ring-border/50">
            <AvatarImage src={listing.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground text-xs font-bold">
              {listing.profiles?.name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => onViewProfile(listing.user_id)} className="font-semibold text-sm truncate block hover:text-primary transition-colors">
            {listing.profiles?.name || 'User'}
          </button>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
            {listing.location && (
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{listing.location}</span>
            )}
          </div>
        </div>
        <Badge className={cn("text-[10px] px-2 py-0.5 border", typeBadgeColors[listing.type] || 'bg-primary/20 text-primary')}>
          <TypeIcon className="w-3 h-3 mr-1" />
          {listing.type === 'sell' ? 'Buy/Sell' : listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}
        </Badge>
        {isOwner && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[100] bg-popover shadow-xl">
              <DropdownMenuItem onClick={() => onEdit?.(listing)}><Edit3 className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(listing.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <h3 className="font-bold text-sm">{listing.title}</h3>
        {listing.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{listing.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {listing.price != null && (
            <Badge variant="outline" className="text-xs gap-1 border-primary/20 bg-primary/5">
              <DollarSign className="w-3 h-3" />
              {listing.currency || 'NPR'} {listing.price.toLocaleString()}
            </Badge>
          )}
          {listing.salary_range && <Badge variant="outline" className="text-xs border-violet-500/20 bg-violet-500/5">{listing.salary_range}</Badge>}
          {listing.qualification && <Badge variant="secondary" className="text-[10px]">{listing.qualification}</Badge>}
          {listing.category && <Badge variant="secondary" className="text-[10px]">{listing.category}</Badge>}
        </div>
      </div>

      {/* Media */}
      {media.length > 0 && (
        <div className="relative">
          <img
            src={media[imgIndex]}
            alt={listing.title}
            className="w-full aspect-[4/3] object-cover"
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

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onLike(listing.id)} className="h-8 gap-1 px-2">
            <Heart className={cn("w-4 h-4", isLiked ? "fill-red-500 text-red-500" : "")} />
            <span className="text-xs">{likesCount}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onComment(listing.id)} className="h-8 gap-1 px-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{commentsCount}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onShare(listing.id)} className="h-8 gap-1 px-2">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onSave(listing.id)} className="h-8 px-2">
            <Bookmark className={cn("w-4 h-4", isSaved ? "fill-primary text-primary" : "")} />
          </Button>
          {!isOwner && (
            <Button size="sm" onClick={() => onChat(listing.user_id, listing.id)} className={cn(
              "h-8 text-xs gap-1",
              listing.type === 'sell' ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" :
                listing.type === 'job' ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30" :
                  "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            )}>
              <MessageCircle className="w-3.5 h-3.5" />
              {actionLabels[listing.type] || 'Chat'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

