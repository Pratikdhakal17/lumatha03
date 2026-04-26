import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, MapPin, ChevronRight, MessageCircle, X, ArrowLeft,
  ShoppingBag, Briefcase, Home as HomeIcon, Loader2, Sparkles, 
  Share2, Bookmark, Heart, Phone, ChevronLeft, AlertTriangle, Star, ImagePlus, Check, MoreVertical, Edit3, Trash2, Clock, ChevronDown, SearchX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { MarketplaceCommentsDialog } from '@/components/marketplace/MarketplaceCommentsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { validateMarketplaceAccess } from '@/lib/marketplaceValidation';
import { useRouteLoadTrace } from '@/hooks/useRouteLoadTrace';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarketplaceFeedCard } from '@/components/marketplace/MarketplaceFeedCard';
import { ListingDetail } from '@/components/marketplace/redesign/ListingDetail';
import { MarketplaceCreateDialog } from '@/components/marketplace/MarketplaceCreateDialog';

// ===== CONSTANTS =====
const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🏪' },
  { id: 'sell', label: 'Buy/Sell', icon: '🛍️' },
  { id: 'buy', label: 'Wanted', icon: '🔍' },
  { id: 'job', label: 'Jobs', icon: '💼' },
  { id: 'apply', label: 'Applicants', icon: '📄' },
  { id: 'rent', label: 'Rent', icon: '🏠' },
  { id: 'service', label: 'Services', icon: '🛠️' },
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'books', label: 'Books', icon: '📚' },
];

const TABS = [
  { id: 'feed', label: 'Explore' },
  { id: 'foryou', label: 'For You' },
  { id: 'saved', label: 'Saved' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editListing, setEditListing] = useState<any>(null);
  const [detailListing, setDetailListing] = useState<any>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentListingId, setCommentListingId] = useState<string | null>(null);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);

  useRouteLoadTrace('Marketplace');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          profiles:user_id (name, avatar_url, username)
        `)
        .order('created_at', { ascending: false });

      if (activeCategory !== 'all') {
        query = query.eq('type', activeCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setListings(data || []);

      // Fetch likes/saves for current user
      if (user) {
        const [likesRes, savesRes] = await Promise.all([
          supabase.from('marketplace_likes').select('listing_id').eq('user_id', user.id),
          supabase.from('marketplace_saved').select('listing_id').eq('user_id', user.id)
        ]);
        
        if (likesRes.data) setLikedSet(new Set(likesRes.data.map(l => l.listing_id)));
        if (savesRes.data) setSavedSet(new Set(savesRes.data.map(s => s.listing_id)));
      }

      // Populate counts
      const lCounts: Record<string, number> = {};
      const cCounts: Record<string, number> = {};
      data?.forEach(l => {
        lCounts[l.id] = l.likes_count || 0;
        cCounts[l.id] = l.comments_count || 0;
      });
      setLikeCounts(lCounts);
      setCommentCounts(cCounts);

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, activeCategory, searchQuery]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Handle URL listing parameter
  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId && listings.length > 0) {
      const found = listings.find(l => l.id === listingId);
      if (found) setDetailListing(found);
    }
    
    // Check for create=true param
    if (searchParams.get('create') === 'true') {
      handleOpenCreate();
      // Remove the param after opening to avoid re-opening on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams, listings, navigate]);

  const toggleLike = async (id: string) => {
    if (!user) return navigate('/auth');
    
    const isLiked = likedSet.has(id);
    const previousLikes = new Set(likedSet);
    const previousCount = likeCounts[id] || 0;

    setLikedSet(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(id);
      else next.add(id);
      return next;
    });

    setLikeCounts(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + (isLiked ? -1 : 1)
    }));

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('marketplace_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketplace_likes').insert({ user_id: user.id, listing_id: id });
        if (error) throw error;
      }
    } catch (error: any) {
      setLikedSet(previousLikes);
      setLikeCounts(prev => ({
        ...prev,
        [id]: previousCount,
      }));
      toast.error(error?.message || 'Could not update like right now');
    }
  };

  const toggleSave = async (id: string) => {
    if (!user) return navigate('/auth');
    
    const isSaved = savedSet.has(id);
    const previousSaved = new Set(savedSet);

    setSavedSet(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('marketplace_saved')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', id);
        if (error) throw error;
        toast.success('Removed from saved');
      } else {
        const { error } = await supabase.from('marketplace_saved').insert({ user_id: user.id, listing_id: id });
        if (error) throw error;
        toast.success('Saved to collection');
      }
    } catch (error: any) {
      setSavedSet(previousSaved);
      toast.error(error?.message || 'Could not update saved items right now');
    }
  };

  const handleShare = async (listing: any) => {
    const url = `${window.location.origin}/marketplace?listing=${listing.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Check out this listing: ${listing.title}`,
          url: url
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleChat = (userId: string, listingId: string, title: string) => {
    navigate(`/chat/${userId}?listing=${listingId}&msg=${encodeURIComponent(`Hi! I'm interested in "${title}". Is it still available?`)}`);
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from('marketplace_listings').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete listing');
    } else {
      setListings(prev => prev.filter(l => l.id !== id));
      setDetailListing(null);
      toast.success('Listing deleted');
    }
  };

  const handleOpenCreate = async () => {
    const validation = await validateMarketplaceAccess(user?.id);
    if (!validation.allowed) {
      toast.error(validation.message || 'You cannot post right now');
      return;
    }
    setEditListing(null);
    setCreateOpen(true);
  };

  const renderListings = () => {
    if (loading) return (
      <div className="space-y-4 px-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    );
    
    if (listings.length === 0) return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 px-4"
      >
        <SearchX className="w-14 h-14 mx-auto text-muted-foreground/20 mb-4" />
        <p className="text-sm font-medium text-muted-foreground mb-1">No results found</p>
        <p className="text-xs text-muted-foreground/60 mb-6">Try a different search or category</p>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" />Post something new
        </Button>
      </motion.div>
    );

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mp-feed"
      >
        {listings.map(l => (
          <motion.div key={l.id} variants={itemVariants}>
            <MarketplaceFeedCard
              listing={l}
              isLiked={likedSet.has(l.id)}
              isSaved={savedSet.has(l.id)}
              likesCount={likeCounts[l.id] || 0}
              commentsCount={commentCounts[l.id] || 0}
              currentUserId={user?.id || ''}
              onLike={toggleLike}
              onSave={toggleSave}
              onComment={(id) => { setCommentListingId(id); setCommentOpen(true); }}
              onShare={() => handleShare(l)}
              onChat={handleChat}
              onDelete={deleteListing}
              onEdit={(listing) => { setEditListing(listing); setCreateOpen(true); }}
              onViewProfile={(userId) => navigate(`/marketplace/profile/${userId}`)}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Premium Top Bar */}
      <div className="sticky top-0 z-50 px-3 md:px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/marketplace/profile/${user?.id}`)}
            className="flex items-center gap-2 transition-transform active:scale-95"
          >
            <Avatar className="w-9 h-9 border border-border/60">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                {user?.user_metadata?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search listings..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm bg-muted/40 border border-transparent focus:border-primary/20 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all outline-none"
            />
          </div>

          <button
            onClick={handleOpenCreate}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Scroller */}
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap shrink-0 transition-all active:scale-95",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="max-w-2xl mx-auto py-4">
        {renderListings()}
      </div>

      {/* Dialogs & Overlays */}
      <AnimatePresence>
        {detailListing && (
          <ListingDetail
            listing={detailListing}
            isLiked={likedSet.has(detailListing.id)}
            isSaved={savedSet.has(detailListing.id)}
            currentUserId={user?.id || ''}
            onClose={() => setDetailListing(null)}
            onLike={() => toggleLike(detailListing.id)}
            onSave={() => toggleSave(detailListing.id)}
            onShare={() => handleShare(detailListing)}
            onChat={() => handleChat(detailListing.user_id, detailListing.id, detailListing.title)}
            onDelete={() => deleteListing(detailListing.id)}
            onEdit={() => { setEditListing(detailListing); setDetailListing(null); setCreateOpen(true); }}
            onViewProfile={() => { setDetailListing(null); navigate(`/marketplace/profile/${detailListing.user_id}`); }}
            onComment={() => { setCommentListingId(detailListing.id); setCommentOpen(true); }}
          />
        )}
      </AnimatePresence>

      <MarketplaceCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditListing(null);
        }}
        editListing={editListing}
        onSuccess={() => {
          setCreateOpen(false);
          setEditListing(null);
          fetchListings();
        }}
      />

      <MarketplaceCommentsDialog
        open={commentOpen}
        onOpenChange={setCommentOpen}
        listingId={commentListingId}
        onCountChange={() => fetchListings()}
      />
    </div>
  );
}
