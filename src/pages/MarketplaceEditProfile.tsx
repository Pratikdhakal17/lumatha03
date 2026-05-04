import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Sparkles, Search, X, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SellerProfile, DEFAULT_SELLER, loadSellerProfile, saveSellerProfile,
  getTrustScore, getCompletionTip, NEPAL_DISTRICTS, SELLING_CATEGORIES,
  PAYMENT_OPTIONS, RESPONSE_TIMES, AVAILABILITY_OPTIONS,
} from '@/lib/marketplaceTrust';
import { sendPhoneOtp, verifyPhoneOtp, markPhoneVerified } from '@/lib/phoneOtpService';

export default function MarketplaceEditProfile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [mpProfile, setMpProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [data, setData] = useState<SellerProfile>({ ...DEFAULT_SELLER });
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState<'idle' | 'sent'>('idle');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setAvatarUrl(profile?.avatar_url || '');
    const { data: mp } = await supabase.from('marketplace_profiles').select('*').eq('user_id', user.id).maybeSingle();
    const stored = loadSellerProfile(user.id);
    setMpProfile(mp);
    const next = mp
      ? {
          ...stored,
          displayName: (mp as any).username || (mp as any).display_name || profile?.first_name || profile?.name || stored.displayName,
          sellerType: (mp as any).seller_type || stored.sellerType,
          bio: mp.bio || stored.bio,
          qualification: mp.qualification || stored.qualification,
          phone: (mp as any).phone || stored.phone,
          whatsappSame: (mp as any).whatsapp_same ?? stored.whatsappSame,
          whatsapp: (mp as any).whatsapp || stored.whatsapp,
          location: mp.location || profile?.location || stored.location,
          area: (mp as any).area || stored.area,
          paymentMethods: (mp as any).payment_methods || stored.paymentMethods,
          responseTime: (mp as any).response_time || stored.responseTime,
          availability: (mp as any).availability || stored.availability,
          sellingCategories: (mp as any).selling_categories || stored.sellingCategories,
          showPhoneTo: (mp as any).show_phone_to || stored.showPhoneTo,
          allowReviews: (mp as any).allow_reviews ?? stored.allowReviews,
          isPhoneVerified: (mp as any).is_phone_verified ?? stored.isPhoneVerified,
        }
      : {
          ...stored,
          displayName: profile?.first_name || profile?.name || stored.displayName,
          location: profile?.location || stored.location,
        };

    setVerifiedPhone(next.isPhoneVerified ? next.phone : '');
    setData(next);
    saveSellerProfile(user.id, next);
  };

  const update = <K extends keyof SellerProfile>(key: K, value: SellerProfile[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArray = (key: 'paymentMethods' | 'availability' | 'sellingCategories', value: string) => {
    setData(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      const url = (getPublicUrlSafe('avatars', path) ?? '') + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const generateBio = async () => {
    setGeneratingBio(true);
    try {
      const { data: fnData, error } = await supabase.functions.invoke('generate-bio', {
        body: {
          name: data.displayName || 'User',
          city: data.location || 'Nepal',
          interests: data.sellingCategories.join(', ') || 'general items',
        }
      });
      if (error) throw error;
      if (fnData?.bio) update('bio', fnData.bio.slice(0, 180));
      else toast.error('Could not generate');
    } catch { toast.error('AI generation failed'); }
    setGeneratingBio(false);
  };

  const sendPhoneOtp = async () => {
    const normalizedPhone = data.phone.trim();
    if (!normalizedPhone) {
      toast.error('Enter phone number first.');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await sendPhoneOtp(normalizedPhone);
      if (result.success) {
        setOtpInput('');
        setOtpStep('sent');
        update('isPhoneVerified', false);
        toast.success('SMS sent! Check your phone for the 6-digit code.');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to send OTP');
      console.error(err);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!otpInput.trim()) {
      toast.error('Enter OTP code.');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await verifyPhoneOtp(data.phone.trim(), otpInput);
      
      if (result.verified && result.success) {
        // Mark phone as verified in marketplace_profiles
        await markPhoneVerified(user!.id, data.phone.trim());
        
        update('isPhoneVerified', true);
        setVerifiedPhone(data.phone.trim());
        setOtpStep('idle');
        setOtpInput('');
        toast.success('✅ Phone verified successfully!');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Verification failed');
      console.error(err);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!data.displayName.trim()) { toast.error('Display name is required'); return; }
    setSaving(true);
    try {
      const basePayload: any = {
        user_id: user.id,
        bio: data.bio.slice(0, 180),
        qualification: data.qualification,
        location: data.location,
        seller_type: data.sellerType,
        phone: data.phone,
        whatsapp: data.whatsapp,
        whatsapp_same: data.whatsappSame,
        area: data.area,
        payment_methods: data.paymentMethods,
        response_time: data.responseTime,
        availability: data.availability,
        selling_categories: data.sellingCategories,
        show_phone_to: data.showPhoneTo,
        allow_reviews: data.allowReviews,
        is_phone_verified: data.isPhoneVerified,
        username: data.displayName || profile?.name || '',
      };

      const saveProfile = async (payload: any) => {
        if (mpProfile) {
          const { id, created_at, updated_at, ...updatePayload } = payload;
          return supabase.from('marketplace_profiles').update(updatePayload).eq('user_id', user.id);
        }
        return supabase.from('marketplace_profiles').insert(payload);
      };

      let result = await saveProfile(basePayload);

      if (result.error) {
        throw result.error;
      }

      saveSellerProfile(user.id, {
        ...data,
        displayName: data.displayName || profile?.name || '',
        location: data.location || profile?.location || '',
      });

      // Verify data was saved before navigating
      await new Promise(resolve => setTimeout(resolve, 300));
      const { data: verify, error: verifyError } = await supabase
        .from('marketplace_profiles')
        .select('selling_categories, availability, payment_methods')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (verifyError || !verify) {
        console.warn('Verification fetch failed, proceeding anyway');
      }

      toast.success('Seller profile saved! 🎉');
      navigate(-1);
    } catch (err: any) {
      toast.error(err?.message || 'Save failed');
    }
    setSaving(false);
  };

  const trust = getTrustScore(data, avatarUrl);
  const tip = getCompletionTip(data);
  const filteredDistricts = NEPAL_DISTRICTS.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg-base, #0a0f1e)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated, #1e293b)' }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-[18px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Seller Profile</h1>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-full text-[14px] font-semibold text-white active:scale-95 transition-all" style={{ background: 'var(--accent, #7C3AED)' }}>
          {saving ? '...' : 'Save ✓'}
        </button>
      </div>

      <div className="px-4">
        {/* Linked profile card */}
        <div className="mt-4 p-4 rounded-[16px] flex items-center gap-3" style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border, #1f2937)' }}>
          <Avatar className="w-12 h-12 shrink-0" style={{ background: '#1e293b', color: '#94A3B8' }}>
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-transparent text-lg font-bold text-muted-foreground">
              {profile?.name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[12px]" style={{ color: '#94A3B8' }}>Linked to your Lumatha profile</p>
            <p className="text-[15px] font-bold text-white truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{profile?.name || 'User'}</p>
          </div>
          <button onClick={() => navigate(`/profile/${user?.id}`)} className="text-[13px] font-medium shrink-0" style={{ color: '#7C3AED' }}>View →</button>
        </div>

        {/* Profile strength */}
        <div className="mt-4 p-3.5 rounded-[14px]" style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border, #1f2937)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-white">Profile Strength</span>
            <span className="text-[13px] font-bold" style={{ color: trust.trustColor }}>{trust.score}%</span>
          </div>
          <Progress value={trust.score} className="h-2" />
          {tip && <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>💡 {tip}</p>}
        </div>

        {/* IDENTITY */}
        <SectionLabel text="Your Seller Identity" />

        {/* Avatar */}
        <div className="flex justify-center my-3">
          <div className="relative">
            <Avatar className="w-20 h-20" style={{ background: '#1e293b', border: '3px solid #374151', color: '#94A3B8' }}>
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-transparent text-2xl font-bold text-muted-foreground">
                {data.displayName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--accent, #7C3AED)' }}>
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            {uploading && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">...</div>}
          </div>
        </div>

        <InputField label="Name buyers see *" value={data.displayName} onChange={v => update('displayName', v)} placeholder="e.g. Pratik or Pratik Mobile Repair" helper="Can be different from your username" />

        {/* Seller type */}
        <label className="text-[13px] mb-2 block mt-4" style={{ color: '#94A3B8' }}>Selling as</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: 'individual' as const, icon: '👤', title: 'Student/Individual', desc: 'Personal items, second hand, services' },
            { id: 'business' as const, icon: '🏪', title: 'Small Business', desc: 'Products, shop, regular selling' },
          ]).map(opt => (
            <button key={opt.id} onClick={() => update('sellerType', opt.id)} className="p-3.5 rounded-[12px] text-left transition-all"
              style={{
                background: data.sellerType === opt.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-input, #1e293b)',
                border: `2px solid ${data.sellerType === opt.id ? 'var(--accent, #7C3AED)' : 'var(--border, #1f2937)'}`,
              }}>
              <span className="text-xl">{opt.icon}</span>
              <p className="text-[13px] font-semibold text-white mt-1">{opt.title}</p>
              <p className="text-[11px] mt-0.5 leading-tight" style={{ color: '#94A3B8' }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* ABOUT */}
        <SectionLabel text="About" />

        <label className="text-[13px] mb-1.5 block" style={{ color: '#94A3B8' }}>About You</label>
        <textarea value={data.bio} onChange={e => update('bio', e.target.value.slice(0, 180))}
          placeholder={'Tell buyers who you are.\nWhat do you sell?\nAre you reliable?'}
          rows={3} className="w-full px-4 py-3 rounded-[12px] text-[15px] text-white placeholder-slate-600 resize-none"
          style={{ background: 'var(--bg-input, #1e293b)', border: '1px solid var(--border, #374151)', minHeight: 90 }} />
        <div className="flex items-center justify-between mt-1.5">
          <button onClick={generateBio} disabled={generatingBio} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium active:scale-95 transition-all"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA' }}>
            <Sparkles className="w-3.5 h-3.5" /> {generatingBio ? 'Writing...' : '✨ Write with AI'}
          </button>
          <span className="text-[11px]" style={{ color: '#4B5563' }}>{data.bio.length}/180</span>
        </div>

        {/* Categories — collapsible */}
        <CollapsiblePills
          label="What do you mainly sell?"
          items={SELLING_CATEGORIES}
          selected={data.sellingCategories}
          onToggle={v => toggleArray('sellingCategories', v)}
          className="mt-4"
        />

        {/* CONTACT & LOCATION */}
        <SectionLabel text="Contact & Location" />

        <InputField
          label="📱 Phone Number"
          value={data.phone}
          onChange={(value) => {
            update('phone', value);
            if (value.trim() !== verifiedPhone) {
              update('isPhoneVerified', false);
            }
          }}
          placeholder="+977 98XXXXXXXX"
          type="tel"
        />

        {/* Verify phone with OTP */}
        {data.phone && (
          <div className="mt-2 rounded-[12px] p-3" style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border, #1f2937)' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px]" style={{ color: '#94A3B8' }}>Phone verification status</p>
              {data.isPhoneVerified ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                  <Check className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)', color: '#94A3B8' }}>
                  Unverified
                </span>
              )}
            </div>

            {!data.isPhoneVerified && (
              <div className="mt-2 space-y-2">
                {otpStep === 'sent' && (
                  <input
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2 rounded-[10px] text-[14px] text-white placeholder-slate-600"
                    style={{ background: 'var(--bg-input, #1e293b)', border: '1px solid var(--border, #374151)' }}
                  />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={sendPhoneOtp}
                    disabled={otpLoading}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(124,58,237,0.16)', border: '1px solid rgba(124,58,237,0.35)', color: '#A78BFA' }}
                  >
                    {otpLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    {otpStep === 'sent' ? 'Resend OTP' : 'Send OTP'}
                  </button>
                  {otpStep === 'sent' && (
                    <button
                      onClick={verifyPhoneOtp}
                      disabled={otpLoading}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: '#10B981', color: 'white' }}
                    >
                      {otpLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      Verify OTP
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp */}
        <div className="flex items-center justify-between mt-4 mb-2">
          <label className="text-[13px]" style={{ color: '#94A3B8' }}>💬 WhatsApp — Same as phone?</label>
          <Switch checked={data.whatsappSame} onCheckedChange={v => update('whatsappSame', v)} />
        </div>
        {!data.whatsappSame && (
          <InputField label="WhatsApp Number" value={data.whatsapp} onChange={v => update('whatsapp', v)} placeholder="+977 98XXXXXXXX" type="tel" helper="Most buyers prefer WhatsApp for quick deals" />
        )}

        {/* Location with district picker */}
        <label className="text-[13px] mb-1.5 block mt-4" style={{ color: '#94A3B8' }}>📍 Your City/District</label>
        <button onClick={() => setDistrictOpen(true)} className="w-full px-4 py-3.5 rounded-[12px] text-[15px] text-left"
          style={{ background: 'var(--bg-input, #1e293b)', border: '1px solid var(--border, #374151)', color: data.location ? 'white' : '#475569' }}>
          {data.location || 'Select your district...'}
        </button>

        {/* District picker modal */}
        {districtOpen && (
          <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-base, #0a0f1e)' }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border, #1f2937)' }}>
              <button onClick={() => setDistrictOpen(false)}><X className="w-5 h-5 text-white" /></button>
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                <input value={districtSearch} onChange={e => setDistrictSearch(e.target.value)} placeholder="Search district..." autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-[10px] text-[14px] text-white placeholder-slate-500"
                  style={{ background: 'var(--bg-input, #1e293b)', border: '1px solid var(--border, #374151)' }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredDistricts.map(d => (
                <button key={d} onClick={() => { update('location', d); setDistrictOpen(false); setDistrictSearch(''); }}
                  className="w-full px-5 py-3.5 text-left text-[14px] text-white border-b transition-colors"
                  style={{ borderColor: 'var(--border, #111827)' }}>
                  {d} {data.location === d && <Check className="w-4 h-4 inline ml-2" style={{ color: '#10B981' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        <InputField label="🤝 Preferred meetup spot" value={data.area} onChange={v => update('area', v)} placeholder="e.g. Butwal Bus Park, near my college" helper="Buyers near you will find you easier" className="mt-4" />

        {/* PAYMENT */}
        <SectionLabel text="Payment Methods" />
        <CollapsiblePills
          label="Payment Methods Accepted"
          items={PAYMENT_OPTIONS}
          selected={data.paymentMethods}
          onToggle={v => toggleArray('paymentMethods', v)}
        />

        {/* PREFERENCES */}
        <SectionLabel text="Your Preferences" />

        <CollapsiblePills
          label="I reply within"
          items={RESPONSE_TIMES.map(r => r.label)}
          selected={[RESPONSE_TIMES.find(r => r.id === data.responseTime)?.label || '']}
          onToggle={v => { const found = RESPONSE_TIMES.find(r => r.label === v); if (found) update('responseTime', found.id); }}
          single
        />

        <CollapsiblePills
          label="Available to meet"
          items={AVAILABILITY_OPTIONS.map(a => a.label)}
          selected={data.availability.map(a => AVAILABILITY_OPTIONS.find(o => o.id === a)?.label || '')}
          onToggle={v => { const found = AVAILABILITY_OPTIONS.find(a => a.label === v); if (found) toggleArray('availability', found.id); }}
          className="mt-3"
        />

        <label className="text-[13px] mb-2 block mt-4" style={{ color: '#94A3B8' }}>Show phone to</label>
        <div className="flex flex-wrap gap-2">
          {['🌍 Everyone', '👥 Verified only', '🔒 Hidden'].map(o => (
            <Pill key={o} label={o} selected={data.showPhoneTo === o} onTap={() => update('showPhoneTo', o)} />
          ))}
        </div>

        <ToggleRow label="Allow buyers to rate me" checked={data.allowReviews} onChange={v => update('allowReviews', v)} />
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-0 inset-x-0 z-50 px-4 py-4" style={{ background: 'var(--bg-base, #0a0f1e)', borderTop: '1px solid var(--border, #1f2937)' }}>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 rounded-[14px] text-[16px] font-bold text-white active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)', fontFamily: "'Space Grotesk', sans-serif" }}>
          {saving ? 'Saving...' : 'Save Seller Profile ✓'}
        </button>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[12px] font-semibold uppercase tracking-[1px] mt-6 mb-2" style={{ color: '#94A3B8', padding: '0' }}>{text}</p>;
}

function InputField({ label, value, onChange, placeholder, type = 'text', helper, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; helper?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[13px] mb-1.5 block" style={{ color: '#94A3B8' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-[12px] text-[15px] text-white placeholder-slate-600"
        style={{ background: 'var(--bg-input, #1e293b)', border: '1px solid var(--border, #374151)' }} />
      {helper && <p className="text-[11px] mt-1" style={{ color: '#4B5563' }}>{helper}</p>}
    </div>
  );
}

function Pill({ label, selected, onTap }: { label: string; selected: boolean; onTap: () => void }) {
  return (
    <button onClick={onTap} className="px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap active:scale-95 transition-all"
      style={{
        background: selected ? 'rgba(124,58,237,0.12)' : 'var(--bg-input, #111827)',
        border: `1.5px solid ${selected ? 'var(--accent, #7C3AED)' : 'var(--border, #1f2937)'}`,
        color: selected ? '#A78BFA' : '#94A3B8',
      }}>
      {label}
    </button>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between mt-3 py-3 px-4 rounded-[12px]" style={{ background: 'var(--bg-card, #111827)', border: '1px solid var(--border, #1f2937)' }}>
      <p className="text-[14px] text-white font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function CollapsiblePills({ label, items, selected, onToggle, single, className = '' }: {
  label: string; items: string[]; selected: string[]; onToggle: (v: string) => void; single?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.filter(Boolean).length;

  return (
    <div className={className}>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-2">
        <span className="text-[13px]" style={{ color: '#94A3B8' }}>
          {label} {count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA' }}>{count}</span>}
        </span>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: '#94A3B8' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#94A3B8' }} />}
      </button>
      {/* Show selected pills when collapsed */}
      {!open && count > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.filter(i => selected.includes(i)).map(i => (
            <span key={i} className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA' }}>{i}</span>
          ))}
        </div>
      )}
      {open && (
        <div className="flex flex-wrap gap-2">
          {items.map(i => (
            <Pill key={i} label={i} selected={selected.includes(i)} onTap={() => onToggle(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
