import { Heart, MessageCircle, Share2, MapPin, ShieldCheck, AlertCircle, X, ChevronLeft, ChevronRight, Bookmark, Flag, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ListingDetailProps {
  listing: any;
  isLiked: boolean;
  isSaved: boolean;
  currentUserId: string;
  onClose: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onChat: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onViewProfile: () => void;
  onComment: () => void;
}

type BadgeKey = 'service' | 'sell' | 'rent' | 'wanted';

const TYPE_TO_BADGE: Record<string, BadgeKey> = {
  service: 'service',
  sell: 'sell',
  rent: 'rent',
  buy: 'wanted',
  job: 'service',
  apply: 'wanted',
};

const BADGE_STYLES: Record<BadgeKey, { label: string; badgeClass: string; priceClass: string }> = {
  service: {
    label: 'Service',
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-300/70 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/50',
    priceClass: 'text-violet-700 dark:text-violet-300',
  },
  sell: {
    label: 'Sell',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300/70 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',
    priceClass: 'text-blue-700 dark:text-blue-300',
  },
  rent: {
    label: 'Rent',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300/70 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50',
    priceClass: 'text-emerald-700 dark:text-emerald-300',
  },
  wanted: {
    label: 'Wanted',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-300/70 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
    priceClass: 'text-amber-700 dark:text-amber-300',
  },
};

export function ListingDetail({
  listing,
  isLiked,
  isSaved,
  currentUserId,
  onClose,
  onLike,
  onSave,
  onShare,
  onChat,
  onDelete,
  onEdit,
  onViewProfile,
  onComment,
}: ListingDetailProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const isOwner = listing.user_id === currentUserId;
  const media = listing.media_urls || [];
  
  const badgeKey = TYPE_TO_BADGE[listing.type] || 'sell';
  const badgeStyle = BADGE_STYLES[badgeKey];
  
  const timestamp = useMemo(() => {
    const date = new Date(listing.created_at);
    if (Number.isNaN(date.getTime())) {
      return 'Recently';
    }
    return formatDistanceToNow(date, { addSuffix: true }).replace('about ', '');
  }, [listing.created_at]);

  const hasPrice = typeof listing.price === 'number' && !Number.isNaN(listing.price) && listing.price > 0;

  const nextImage = () => {
    if (media.length > 0) setImgIndex((prev) => (prev + 1) % media.length);
  };

  const prevImage = () => {
    if (media.length > 0) setImgIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/50 flex items-end md:items-center justify-center backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full md:w-[90vw] md:max-w-2xl max-h-[90vh] bg-background rounded-t-3xl md:rounded-3xl overflow-y-auto flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
            <button onClick={onClose} className="flex-1">
              <X className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center font-semibold truncate">{listing.title}</h2>
            {isOwner && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[220]">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-32">
            {/* Image Gallery */}
            {media.length > 0 ? (
              <div className="relative">
                <img
                  src={media[imgIndex]}
                  alt={listing.title}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                {media.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                      {media.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIndex(i)}
                          className={cn('w-2 h-2 rounded-full transition-all', i === imgIndex ? 'bg-white w-4' : 'bg-white/50')}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full aspect-square flex items-center justify-center bg-secondary/50">
                <span className="text-5xl opacity-30">🛍️</span>
              </div>
            )}

            {/* Details Section */}
            <div className="p-5 space-y-5">
              {/* Badge & Price */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={cn(
                      'inline-block rounded-full border px-3 py-1 text-xs font-semibold',
                      badgeStyle.badgeClass,
                    )}
                  >
                    {badgeStyle.label}
                  </span>
                </div>
                {hasPrice && (
                  <span className={cn('text-2xl font-bold', badgeStyle.priceClass)}>
                    NPR {listing.price!.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  {listing.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.location}
                    </div>
                  )}
                  <span>•</span>
                  <span>{timestamp}</span>
                </div>
              </div>

              {/* Seller Info */}
              <div className="rounded-lg border border-border/50 p-4 bg-card/50">
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={onViewProfile}>
                    <Avatar className="w-12 h-12 border border-border/60">
                      <AvatarImage src={listing.profiles?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {listing.profiles?.name?.[0] || 'S'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1">
                    <button onClick={onViewProfile} className="font-semibold hover:text-primary transition-colors">
                      {listing.profiles?.name || 'Seller'}
                    </button>
                    {listing.seller?.verified && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Phone: {listing.seller?.phone ? (
                        <span className="text-foreground">{listing.seller.phone}</span>
                      ) : (
                        'Not shared'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                {listing.category && (
                  <div className="rounded-lg border border-border/30 p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground font-medium">Category</p>
                    <p className="text-sm font-semibold mt-1">{listing.category}</p>
                  </div>
                )}
                {listing.status && (
                  <div className="rounded-lg border border-border/30 p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    <p className="text-sm font-semibold mt-1 capitalize">{listing.status}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 space-y-3">
            {/* Like/Save/Share/Comment */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onLike}
                className="flex-1 gap-2"
              >
                <Heart className={cn('w-4 h-4', isLiked ? 'fill-red-500 text-red-500' : '')} />
                Like
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="flex-1 gap-2"
              >
                <Bookmark className={cn('w-4 h-4', isSaved ? 'fill-primary text-primary' : '')} />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onComment}
                className="flex-1 gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Comment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="w-10"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Primary Actions */}
            {!isOwner && (
              <>
                <Button
                  onClick={onChat}
                  size="lg"
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message Seller
                </Button>
                {listing.seller?.phone && (
                  <div className="text-xs text-center text-muted-foreground">
                    Phone: {listing.seller.phone} (Shared with interested buyers)
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
        {/* Title and Price */}
        <div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#E6EDF3',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              marginBottom: '8px',
            }}
          >
            {title}
          </h1>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#34D399',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            NPR {price.toLocaleString()}
          </div>
        </div>

        {/* Seller Card */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: '#161B24',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: '#0D1117', border: '2px solid #4F8EF7' }}
          >
            {seller.avatar || '👨'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#E6EDF3',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {seller.name}
              </h3>
              {seller.verified && <ShieldCheck className="w-4 h-4" style={{ color: '#34D399' }} />}
            </div>
            <div style={{ fontSize: '12px', color: '#7D8590', marginBottom: '4px' }}>
              ⭐ {seller.rating} • {seller.reviews} reviews • {seller.deals} deals
            </div>
            <div style={{ fontSize: '11px', color: '#7D8590' }}>Member for 2 years</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#E6EDF3', marginBottom: '8px' }}>Description</h3>
          <p style={{ fontSize: '13px', color: '#A8B5C2', lineHeight: '1.6' }}>{description}</p>
        </div>

        {/* Details */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            backgroundColor: '#161B24',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <div className="flex justify-between">
            <span style={{ fontSize: '12px', color: '#7D8590' }}>Category</span>
            <span style={{ fontSize: '12px', color: '#E6EDF3', fontWeight: 600 }}>{category}</span>
          </div>
          <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.07)' }} />
          <div className="flex justify-between">
            <span style={{ fontSize: '12px', color: '#7D8590' }}>Location</span>
            <span style={{ fontSize: '12px', color: '#E6EDF3', fontWeight: 600 }}>{location}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#E6EDF3', marginBottom: '8px' }}>Payment Methods</h3>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: 'rgba(79, 142, 247, 0.1)',
                  color: '#4F8EF7',
                }}
              >
                {method}
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#E6EDF3', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
            Safety Tips
          </h3>
          <div className="space-y-2">
            {safetyTips.map((tip, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12px',
                  color: '#A8B5C2',
                  paddingLeft: '20px',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: '#F59E0B',
                  }}
                >
                  •
                </span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Message Seller CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{
          backgroundColor: '#0D1117',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <button
          onClick={onMessage}
          className="w-full py-3 rounded-lg font-bold"
          style={{
            backgroundColor: '#4F8EF7',
            color: '#FFFFFF',
            fontSize: '14px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <MessageCircle className="inline w-4 h-4 mr-2" />
          Message Seller
        </button>
      </div>
    </div>
  );
}

export function ListingDetailDemo() {
  return (
    <ListingDetail
      id="1"
      emoji="📱"
      title="iPhone 12 Pro - Mint Condition"
      price={45000}
      description="Only 3 months old, used sparingly, comes with original box and all accessories. Screen protector and case included. No scratches or damage. All functions working perfectly."
      category="Electronics"
      location="Kathmandu"
      seller={{
        name: 'Tech Seller Nepal',
        avatar: '👨‍💼',
        verified: true,
        rating: 4.8,
        reviews: 127,
        deals: 45,
      }}
      paymentMethods={['💵 Cash', '📱 eWallet', '🏦 Bank Transfer']}
      safetyTips={[
        'Meet in a safe, public location',
        'Check the product before making payment',
        'Use cash on delivery when possible',
        'Never share personal financial information',
      ]}
    />
  );
}
