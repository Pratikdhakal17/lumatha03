import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Edit3, MessageCircle, Phone, ExternalLink, Star, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getTrustScore, SellerProfile, RESPONSE_TIMES, AVAILABILITY_OPTIONS, DEFAULT_SELLER,
} from '@/lib/marketplaceTrust';

export default function MarketplaceProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.id === userId;

  const [profile, setProfile] = useState<any>(null);
  const [mpProfile, setMpProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, sell: 0, job: 0, rent: 0 });
  const [activeTab, setActiveTab] = useState('listings');
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!userId) return;
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    const [{ data: p }, { data: mp }, { data: lData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('marketplace_profiles').select('*').eq('user_id', userId!).maybeSingle(),
      supabase.from('marketplace_listings').select('*').eq('user_id', userId!).eq('status', 'active').order('created_at', { ascending: false }),
    ]);
    setProfile(p);
    setMpProfile(mp);
    if (lData) {
      setListings(lData);
      const s = { total: lData.length, sell: 0, job: 0, rent: 0 };
      lData.forEach(l => { if (l.type in s) (s as any)[l.type]++; });
      setStats(s);
    }
    // Build seller from DB data
    const stored: SellerProfile = {
      displayName: (mp as any)?.username || p?.first_name || p?.name || '',
      sellerType: (mp as any)?.seller_type || 'individual',
      bio: mp?.bio || '',
      qualification: mp?.qualification || '',
      phone: (mp as any)?.phone || '',
      whatsappSame: (mp as any)?.whatsapp_same ?? true,
      whatsapp: (mp as any)?.whatsapp || '',
      location: mp?.location || p?.location || '',
      area: (mp as any)?.area || '',
      paymentMethods: (mp as any)?.payment_methods || ['💵 Cash'],
      responseTime: (mp as any)?.response_time || 'few_hours',
      availability: (mp as any)?.availability || [],
      sellingCategories: (mp as any)?.selling_categories || [],
      showPhoneTo: (mp as any)?.show_phone_to || 'Everyone',
      allowReviews: (mp as any)?.allow_reviews ?? true,
      isPhoneVerified: (mp as any)?.is_phone_verified ?? false,
    };
    setSeller(stored);
    if (isOwner && user) fetchSaved();
  };

  const fetchSaved = async () => {
    if (!user) return;
    const { data: saved } = await supabase.from('marketplace_saved').select('listing_id').eq('user_id', user.id);
    if (saved?.length) {
      const { data } = await supabase.from('marketplace_listings').select('*').in('id', saved.map(s => s.listing_id));
      setSavedListings(data || []);
    }
  };

  if (!profile || !seller) return <div className="min-h-screen" style={{ background: 'var(--bg-base, #0a0f1e)' }} />;

  const trust = getTrustScore(seller, profile.avatar_url);
  const whatsappNumber = seller.whatsappSame ? seller.phone : seller.whatsapp;
  const canShowPhone = seller.showPhoneTo === '🌍 Everyone' || (seller.showPhoneTo === '👥 Verified only');
  const responseLabel = RESPONSE_TIMES.find(r => r.id === seller.responseTime)?.label || '';
  const availLabel = seller.availability.map(a => AVAILABILITY_OPTIONS.find(o => o.id === a)?.label || a).join(' • ');
  const joinedDate = profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '--';
  const filteredListings = filter === 'all' ? listings : listings.filter(l => l.type === filter);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg-base, #0a0f1e)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/marketplace')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated, #1e293b)' }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-[16px] font-bold text-white flex-1 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {seller.displayName || profile.name}
        </h1>
      </div>

      {/* Profile header card */}
      <div className="px-4 pt-4">
        <div className="rounded-b-[24px] p-5" style={{ background: 'var(--bg-card, #111827)' }}>
          {/* Avatar + name row */}
          <div className="flex items-start gap-4">
            <Avatar className="w-[72px] h-[72px] shrink-0" style={{ border: '3px solid #374151' }}>
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-bold" style={{ background: '#1e293b', color: '#94A3B8' }}>
                {seller.displayName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {seller.displayName || profile.name}
              </h2>
              {/* Trust label */}
              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold mt-1" style={{ background: `${trust.trustColor}15`, border: `1px solid ${trust.trustColor}30`, color: trust.trustColor }}>
                {trust.trustLabel}
              </span>
              {/* Seller type */}
              <span className="inline-block ml-2 px-2.5 py-1 rounded-full text-[11px] font-medium mt-1" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA' }}>
                {seller.sellerType === 'business' ? '🏪 Small Business' : '👤 Individual'}
              </span>
            </div>
          </div>

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {/* Phone badge */}
            {seller.isPhoneVerified ? (
              <span className="px-3 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>✅ Verified</span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-[12px] opacity-60" style={{ background: 'var(--bg-elevated, #1e293b)', border: '1px solid var(--border, #1f2937)', color: '#94A3B8' }}>⏳ Pending</span>
            )}
            {/* Location badge */}
            {seller.location && (
              <span className="px-3 py-1.5 rounded-full text-[12px] text-white" style={{ background: 'var(--bg-elevated, #1e293b)', border: '1px solid var(--border, #1f2937)' }}>📍 {seller.location}</span>
            )}
            {/* Rating badge */}
            <span className="px-3 py-1.5 rounded-full text-[12px]" style={{ background: 'var(--bg-elevated, #1e293b)', border: '1px solid var(--border, #1f2937)', color: '#94A3B8' }}>⭐ New Seller</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 text-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border, #1f2937)' }}>
            {[
              { icon: '📦', value: stats.total, label: 'Listings' },
              { icon: '✅', value: 0, label: 'Deals' },
              { icon: '📅', value: joinedDate, label: 'Joined' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[18px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
                <p className="text-[11px]" style={{ color: '#94A3B8' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bio section */}
        {seller.bio && (
          <div className="mt-4 px-1">
            <p className="text-[14px] font-semibold text-white mb-1">About</p>
            <p className="text-[15px] leading-relaxed" style={{ color: '#94A3B8' }}>{seller.bio}</p>
          </div>
        )}

        {/* Contact / Owner action buttons */}
        {!isOwner ? (
          <div className="flex gap-2 mt-4">
            <button onClick={() => navigate(`/chat/${userId}`)} className="flex-1 h-[44px] rounded-[12px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent, #7C3AED), #6366F1)' }}>
              <MessageCircle className="w-4 h-4" /> 💬 Message
            </button>
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="h-[44px] px-5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                style={{ background: '#25D366', color: 'white' }}>
                📱 WhatsApp
              </a>
            )}
            {canShowPhone && seller.phone && (
              <a href={`tel:${seller.phone}`} className="h-[44px] px-4 rounded-[12px] flex items-center justify-center active:scale-95 transition-all"
                style={{ background: 'var(--bg-elevated, #1e293b)', border: '1px solid var(--border, #374151)' }}>
                <Phone className="w-4 h-4 text-white" />
              </a>
            )}
          </div>
        ) : (
          <button onClick={() => navigate('/marketplace/edit-profile')} className="w-full mt-4 py-2.5 rounded-[12px] text-[13px] font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'var(--bg-elevated, #1e293b)', border: '1px solid var(--border, #374151)' }}>
            <Edit3 className="w-4 h-4" /> Edit Seller Profile
          </button>
        )}

        {/* Details card */}
        <div className="mt-4 rounded-[16px] p-4 space-y-3" style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border, #1f2937)' }}>
          {[
            seller.location && { icon: '📍', label: 'Location', value: seller.location },
            seller.area && { icon: '🤝', label: 'Meetup', value: seller.area },
            responseLabel && { icon: '⚡', label: 'Response', value: responseLabel },
            availLabel && { icon: '🕐', label: 'Available', value: availLabel },
            seller.paymentMethods.length > 0 && { icon: '💳', label: 'Payment', value: seller.paymentMethods.join(' | ') },
          ].filter(Boolean).map((row: any) => (
            <div key={row.label} className="flex items-start justify-between">
              <span className="text-[13px] shrink-0" style={{ color: '#94A3B8' }}>{row.icon} {row.label}</span>
              <span className="text-[13px] text-white text-right ml-3 leading-snug">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Categories */}
        {seller.sellingCategories.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-white mb-2">Sells</p>
            <div className="flex flex-wrap gap-2">
              {seller.sellingCategories.map(c => (
                <span key={c} className="px-3 py-1.5 rounded-full text-[12px]" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA' }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Social profile link */}
        <button onClick={() => navigate(`/profile/${userId}`)} className="mt-4 flex items-center gap-2 text-[13px] font-medium" style={{ color: '#A78BFA' }}>
          <ExternalLink className="w-3.5 h-3.5" /> View {profile.name} on Lumatha
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 mt-6">
        {[
          { id: 'listings', label: 'Listings' },
          { id: 'reviews', label: 'Reviews' },
          ...(isOwner ? [{ id: 'saved', label: 'Saved' }] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--accent, #7C3AED)' : 'var(--bg-card, #111827)',
              color: activeTab === tab.id ? 'white' : '#94A3B8',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border, #1f2937)',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter pills for listings tab */}
      {activeTab === 'listings' && (
        <div className="flex gap-2 px-5 mt-3">
          {['all', 'sell', 'job', 'rent'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: filter === f ? 'var(--accent, #7C3AED)' : 'var(--bg-card, #111827)',
                color: filter === f ? 'white' : '#94A3B8',
                border: filter === f ? 'none' : '1px solid var(--border, #1f2937)',
              }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="px-5 mt-4 space-y-2.5">
        {activeTab === 'listings' && filteredListings.map(l => (
          <ListingRow key={l.id} listing={l} onTap={() => navigate(`/marketplace?listing=${l.id}`)} />
        ))}
        {activeTab === 'listings' && filteredListings.length === 0 && (
          <p className="text-center py-12 text-[14px]" style={{ color: '#94A3B8' }}>No listings yet</p>
        )}
        {activeTab === 'reviews' && (
          <div className="text-center py-12">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: '#94A3B8' }} />
            <p className="text-[14px]" style={{ color: '#94A3B8' }}>No reviews yet</p>
            <p className="text-[12px] mt-1" style={{ color: '#4B5563' }}>Reviews will appear after deals</p>
          </div>
        )}
        {activeTab === 'saved' && savedListings.map(l => (
          <ListingRow key={l.id} listing={l} onTap={() => navigate(`/marketplace?listing=${l.id}`)} />
        ))}
        {activeTab === 'saved' && savedListings.length === 0 && (
          <p className="text-center py-12 text-[14px]" style={{ color: '#94A3B8' }}>No saved listings</p>
        )}
      </div>
    </div>
  );
}

function ListingRow({ listing: l, onTap }: { listing: any; onTap: () => void }) {
  return (
    <button onClick={onTap} className="w-full flex gap-3 p-3 rounded-[16px] text-left active:scale-[0.98] transition-all"
      style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border, #1f2937)' }}>
      {l.media_urls?.[0] && <img src={l.media_urls[0]} className="w-16 h-16 rounded-[12px] object-cover shrink-0" alt="" />}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white truncate">{l.title}</p>
        {l.price != null && <p className="text-[13px] font-bold mt-0.5" style={{ color: '#10B981' }}>NPR {l.price.toLocaleString()}</p>}
        <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: '#94A3B8' }}>
          {l.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{l.location.split(',')[0]}</span>}
          <span>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true }).replace('about ', '')}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 self-center" style={{ color: '#94A3B8' }} />
    </button>
  );
}
