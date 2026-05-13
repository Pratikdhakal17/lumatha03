import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoTheme } from '@/hooks/useAutoTheme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ChevronRight, LogOut, Share2, Globe, HelpCircle, Info, Smartphone, Fingerprint, LayoutGrid, GripVertical, RotateCcw, Sparkles, Bell, Shield, Palette, Clock, Bot, Mail, FileText, Star, CreditCard, Lock, Eye, EyeOff, Users, MessageSquare, BookOpen, Mountain, ShoppingCart, Home, Search, Flag, Ghost, Code, Gamepad2, BarChart3, Trophy, FileText as DocIcon, Heart, User, Settings as SettingsIcon, GripHorizontal, Plus, ChevronDown, CheckSquare, StickyNote, Compass, Library, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import lumathaLogo from '@/assets/lumatha-logo.png';

const CHAT_AUTOPLAY_STORAGE_KEY = 'lumatha_chat_video_autoplay';

type SettingsPage = 'main' | 'privacy' | 'security' | 'appearance' | 'notifications' | 'ai' | 'help' | 'about' | 'manage' | 'customize';

const SECTION_ROWS = {
  account: [
    { id: 'privacy' as SettingsPage, icon: '🔒', title: 'Privacy & Safety', subtitle: 'Account privacy, blocking, data', color: '#3B82F6' },
    { id: 'security' as SettingsPage, icon: '🔑', title: 'Security', subtitle: 'Passwords, PIN', color: '#F59E0B' },
  ],
  experience: [
    { id: 'appearance' as SettingsPage, icon: '🎨', title: 'Appearance', subtitle: 'Themes, font size, colours', color: '#EC4899' },
    { id: 'notifications' as SettingsPage, icon: '🔔', title: 'Notifications', subtitle: 'Alerts, sounds, badges', color: '#EF4444' },
    { id: 'language' as SettingsPage, icon: '🌐', title: 'Language & Region', subtitle: 'Display language, timezone', color: '#10B981', isInline: true },
  ],
  controls: [
    { id: 'manage' as SettingsPage, icon: '⏱️', title: 'Time & Controls', subtitle: 'Screen time tracking, limits', color: '#06B6D4' },
    { id: 'customize' as SettingsPage, icon: '⚙️', title: 'Customize Lumatha', subtitle: 'Layouts, navigation', color: '#8B5CF6' },
  ],
  lumatha: [
    { id: 'ai' as SettingsPage, icon: '🤖', title: 'AI Assistant', subtitle: 'Manage, history', color: '#A78BFA' },
  ],
  support: [
    { id: 'help' as SettingsPage, icon: '❓', title: 'Help & Support', subtitle: 'FAQ, contact, report, reviews', color: '#6B7280' },
    { id: 'about' as SettingsPage, icon: '📊', title: 'About Lumatha', subtitle: 'Version, changelog, credits', color: '#94A3B8' },
  ],
};

export default function Settings() {
  const { user, profile: userProfile, logout } = useAuth();
  const { setManualTheme } = useAutoTheme();
  const navigate = useNavigate();
  const [page, setPage] = useState<SettingsPage>('main');
  const isAdmin = userProfile?.role === 'admin';

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [fontSize, setFontSize] = useState(16);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    all: true, likes: true, comments: true, followers: true, mentions: true, shares: true,
    directMessages: true, groupMessages: true,
    chatVideoAutoplay: false,
    dailyChallenge: true, leaderboard: true, travelStories: true,
    randomConnect: true, memoryReminder: true,
    streakReminder: true, dailyTask: true,
    sound: true, vibration: true, badgeCount: true,
    quietHours: false,
  });
  const [quietFrom, setQuietFrom] = useState('22:00');
  const [quietTo, setQuietTo] = useState('07:00');

  // Privacy state
  const [isPrivate, setIsPrivate] = useState(false);
  const [messagePermission, setMessagePermission] = useState('friends');

  // AI state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiFeatures, setAiFeatures] = useState({
    smartReplies: true, aiWriting: true, morningBriefing: false, statsInsights: true, placeDescriptions: true, storyWriter: true,
  });
  const [aiPersonality, setAiPersonality] = useState<'friendly' | 'formal' | 'casual'>('friendly');
  const [aiLanguage, setAiLanguage] = useState('en');

  // Security state
  const [pinLock, setPinLock] = useState(false);
  const [biometricLock, setBiometricLock] = useState(false);

  // PIN flow state
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'change' | 'verify' | 'private_zone'>('set');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinShake, setPinShake] = useState(false);

  // Language
  const [language, setLanguage] = useState('en');


  useEffect(() => {
    const override = localStorage.getItem('lumatha_theme_override');
    const overrideTime = localStorage.getItem('lumatha_theme_override_time');
    if (override && overrideTime) {
      const elapsed = Date.now() - parseInt(overrideTime);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) setTheme(override as 'light' | 'dark');
      else setTheme('auto');
    }
    setLanguage(localStorage.getItem('lumatha_language') || 'en');
    setAccentColor(localStorage.getItem('lumatha_accent') || '#7C3AED');
    setFontSize(parseInt(localStorage.getItem('lumatha_fontsize') || '16'));
    setReduceMotion(localStorage.getItem('lumatha_reduce_motion') === 'true');
    setIsPrivate(localStorage.getItem('lumatha_private_account') === 'true');
    setMessagePermission(localStorage.getItem('lumatha_msg_perm') || 'friends');
    setPinLock(localStorage.getItem('lumatha_pin_lock') === 'true');
    const storedChatAutoplay = localStorage.getItem(CHAT_AUTOPLAY_STORAGE_KEY);
    if (storedChatAutoplay !== null) {
      setNotifications((prev) => ({ ...prev, chatVideoAutoplay: storedChatAutoplay === 'true' }));
    }
  }, []);

  const handleThemeChange = (t: 'dark' | 'light' | 'auto') => {
    setTheme(t);
    if (t === 'auto') {
      localStorage.removeItem('lumatha_theme_override');
      localStorage.removeItem('lumatha_theme_override_time');
      const hour = new Date().getHours();
      setManualTheme((hour >= 5 && hour < 17) ? 'light' : 'dark');
      localStorage.removeItem('lumatha_theme_override');
      localStorage.removeItem('lumatha_theme_override_time');
    } else {
      setManualTheme(t);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/auth'); };

  const openPinScreen = (mode: 'set' | 'change' | 'verify' | 'private_zone') => {
    setPinMode(mode); setPinStep('enter'); setPinDigits([]); setPinFirst(''); setPinError(''); setPinShake(false); setShowPinScreen(true);
  };

  const handlePinDigit = (digit: string) => {
    if (pinDigits.length >= 4) return;
    const nd = [...pinDigits, digit];
    setPinDigits(nd);
    setPinError('');
    if (nd.length === 4) {
      const code = nd.join('');
      setTimeout(() => {
        if (pinMode === 'set' || (pinMode === 'change' && pinStep === 'confirm') || pinMode === 'private_zone') {
          if (pinStep === 'enter') { setPinFirst(code); setPinStep('confirm'); setPinDigits([]); }
          else if (code === pinFirst) {
            localStorage.setItem(pinMode === 'private_zone' ? 'lumatha_private_zone_pin' : 'lumatha_pin_code', code);
            if (pinMode !== 'private_zone') { localStorage.setItem('lumatha_pin_lock', 'true'); setPinLock(true); }
            setShowPinScreen(false);
            toast.success(pinMode === 'private_zone' ? 'Private Zone PIN updated! 🔒' : 'PIN set successfully! 🔒');
          } else {
            setPinError("PINs don't match"); setPinShake(true); setTimeout(() => setPinShake(false), 500);
            setPinDigits([]); setPinStep('enter'); setPinFirst('');
          }
        } else if (pinMode === 'change' && pinStep === 'enter') {
          if (code === localStorage.getItem('lumatha_pin_code')) { setPinMode('set'); setPinStep('enter'); setPinDigits([]); setPinFirst(''); }
          else { setPinError('Wrong current PIN'); setPinShake(true); setTimeout(() => setPinShake(false), 500); setPinDigits([]); }
        } else if (pinMode === 'verify') {
          if (code === localStorage.getItem('lumatha_pin_code')) { setShowPinScreen(false); toast.success('Verified!'); }
          else { setPinError('Wrong PIN'); setPinShake(true); setTimeout(() => setPinShake(false), 500); setPinDigits([]); }
        }
      }, 150);
    }
  };

  const getPinTitle = () => {
    if (pinMode === 'change' && pinStep === 'enter') return 'Enter Current PIN';
    if (pinMode === 'private_zone') return pinStep === 'enter' ? 'Set Private Zone PIN' : 'Confirm PIN';
    return pinStep === 'enter' ? 'Create PIN' : 'Confirm PIN';
  };

  const SettingsRow = ({ icon, title, subtitle, color, accent, onClick, right }: any) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-hover)] active:scale-[0.99] transition-all">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}20` }}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-[15px] font-semibold ${accent ? 'text-purple-400' : 'text-foreground'}`} style={{ fontFamily: 'Space Grotesk' }}>{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      {right || <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  const AdminRow = () => (
    <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-hover)] active:scale-[0.99] transition-all">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#06B6D420' }}>
        🛡️
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-[15px] font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>Admin Console</p>
        <p className="text-xs text-muted-foreground truncate">Moderate posts, messages, comments, likes, users</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );

  const SectionLabel = ({ children }: { children: string }) => (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 pt-6 pb-2">{children}</p>
  );

  const ToggleRow = ({ icon, title, subtitle, checked, onChange }: any) => (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-lg w-6 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-foreground font-medium">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-purple-600" />
    </div>
  );

  const PageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10 bg-background">
      <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/30 active:scale-95 transition-all">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>{title}</h2>
    </div>
  );

  // ===== SUB-PAGES =====

  const PrivacyPage = () => (
    <div className="pb-20">
      <PageHeader title="Privacy & Safety" onBack={() => setPage('main')} />
      <SectionLabel>Account</SectionLabel>
      <ToggleRow icon="🔒" title="Private Account" subtitle="Only approved followers see your posts" checked={isPrivate} onChange={async (v: boolean) => {
        setIsPrivate(v);
        localStorage.setItem('lumatha_private_account', String(v));
        if (user) await supabase.from('profiles').update({ is_private: v } as any).eq('id', user.id);
      }} />

      <SectionLabel>Who can...</SectionLabel>
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="text-lg w-6 text-center">💬</span>
        <div className="flex-1"><p className="text-[14px] text-foreground font-medium">Message You</p></div>
        <Select value={messagePermission} onValueChange={async (v) => {
          setMessagePermission(v);
          localStorage.setItem('lumatha_msg_perm', v);
          if (user) await supabase.from('profiles').update({ allow_messages_from: v } as any).eq('id', user.id);
        }}>
          <SelectTrigger className="w-32 h-8 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="followers">Followers</SelectItem>
            <SelectItem value="friends">Friends Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="text-lg w-6 text-center">🏷️</span>
        <div className="flex-1"><p className="text-[14px] text-foreground font-medium">Tag You</p></div>
        <Select defaultValue="friends">
          <SelectTrigger className="w-32 h-8 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="friends">Friends Only</SelectItem>
            <SelectItem value="nobody">Nobody</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SectionLabel>Blocked Users</SectionLabel>
      <SettingsRow icon="🚫" title="Blocked Users" subtitle="0 blocked" color="#EF4444" onClick={() => toast.info('No blocked users')} />

      <SectionLabel>Data & Privacy</SectionLabel>
      <SettingsRow icon="📥" title="Download My Data" subtitle="Export all your data as ZIP" color="#3B82F6" onClick={() => toast.info('Data export will be available soon')} />
      <SettingsRow icon="📄" title="Privacy Policy" subtitle="How we handle your data" color="#6B7280" onClick={() => toast.info('Opening privacy policy')} />
      <SettingsRow icon="📋" title="Terms of Service" subtitle="Usage terms and conditions" color="#6B7280" onClick={() => toast.info('Opening terms of service')} />
    </div>
  );

  const SecurityPage = () => (
    <div className="pb-20">
      <PageHeader title="Security" onBack={() => setPage('main')} />
      <SectionLabel>App Lock</SectionLabel>
      <ToggleRow icon="🔢" title="PIN Lock" subtitle="Require PIN to open Lumatha" checked={pinLock} onChange={(v: boolean) => {
        if (v) {
          openPinScreen('set');
        } else {
          setPinLock(false);
          localStorage.setItem('lumatha_pin_lock', 'false');
          localStorage.removeItem('lumatha_pin_code');
          toast.success('PIN Lock disabled');
        }
      }} />
      {pinLock && (
        <SettingsRow icon="🔄" title="Change PIN" subtitle="Update your 4-digit PIN" color="#F59E0B" onClick={() => openPinScreen('change')} />
      )}
      <ToggleRow icon="👤" title="Biometric Lock" subtitle="Use face or fingerprint to unlock" checked={biometricLock} onChange={(v: boolean) => {
        setBiometricLock(v);
        if (v) toast.success('Biometric lock enabled');
      }} />

      <SectionLabel>Private Zone</SectionLabel>
      <SettingsRow icon="🔒" title="Change Private Zone PIN" subtitle="Update your vault access code" color="#7C3AED" onClick={() => openPinScreen('private_zone')} />

      <SectionLabel>Session</SectionLabel>
      <SettingsRow icon="📱" title="Active Sessions" subtitle="1 device" color="#3B82F6" onClick={() => toast.info('Session management coming soon')} right={<span className="text-xs text-muted-foreground">1 device</span>} />

      <SectionLabel>Password</SectionLabel>
      <SettingsRow icon="🔑" title="Change Password" subtitle="Update your account password" color="#F59E0B" onClick={() => toast.info('Password change coming soon')} />

      <SectionLabel>Two-Factor Authentication</SectionLabel>
      <div className="flex items-center gap-3 px-5 py-3.5 opacity-50">
        <span className="text-lg w-6 text-center">📱</span>
        <div className="flex-1">
          <p className="text-[14px] text-foreground font-medium">Two-Factor Authentication</p>
          <p className="text-[11px] text-muted-foreground">Extra layer of security</p>
        </div>
        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Coming Soon</span>
      </div>
    </div>
  );

  const AppearancePage = () => {
    const accents = [
      { color: '#7C3AED', name: 'Purple' },
      { color: '#3B82F6', name: 'Blue' },
      { color: '#10B981', name: 'Green' },
      { color: '#F59E0B', name: 'Orange' },
      { color: '#EF4444', name: 'Red' },
      { color: '#EC4899', name: 'Pink' },
    ];

    return (
      <div className="pb-20">
        <PageHeader title="Appearance" onBack={() => setPage('main')} />
        <SectionLabel>Theme</SectionLabel>
        <div className="flex gap-3 px-5 py-2">
          {[
            { value: 'auto' as const, icon: '⏰', label: 'Auto', sub: 'Day/Night' },
            { value: 'dark' as const, icon: '🌙', label: 'Dark', sub: 'Always dark' },
            { value: 'light' as const, icon: '☀️', label: 'Light', sub: 'Always light' },
          ].map(t => (
            <button key={t.value} onClick={() => handleThemeChange(t.value)}
              className={`flex-1 rounded-2xl p-4 text-center transition-all border ${theme === t.value ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_16px_rgba(124,58,237,0.15)]' : 'border-border bg-card/50'}`}>
              <span className="text-2xl block mb-1">{t.icon}</span>
              <p className="text-[13px] text-foreground font-semibold">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.sub}</p>
            </button>
          ))}
        </div>


        <SectionLabel>Custom Accent</SectionLabel>
        <div className="flex gap-4 px-5 py-3 justify-center">
          {accents.map(a => (
            <button key={a.color} onClick={() => {
              setAccentColor(a.color);
              localStorage.setItem('lumatha_accent', a.color);
              toast.success(`Accent: ${a.name}`);
            }} className="relative">
              <div className="w-8 h-8 rounded-full transition-transform active:scale-90" style={{ background: a.color, boxShadow: accentColor === a.color ? `0 0 0 3px var(--bg-base), 0 0 0 5px ${a.color}` : 'none' }} />
              {accentColor === a.color && <div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
            </button>
          ))}
        </div>

        <SectionLabel>Text Size</SectionLabel>
        <div className="px-5 py-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-muted-foreground">A</span>
            <Slider value={[fontSize]} min={12} max={22} step={2} onValueChange={([v]) => {
              setFontSize(v);
              localStorage.setItem('lumatha_fontsize', String(v));
            }} className="flex-1" />
            <span className="text-lg text-muted-foreground font-bold">A</span>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-foreground/70" style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
              The quick brown fox jumps over the lazy dog. 🦊
            </p>
          </div>
        </div>

        <SectionLabel>Motion</SectionLabel>
        <ToggleRow icon="✨" title="Reduce Motion" subtitle="Disable heavy animations" checked={reduceMotion} onChange={(v: boolean) => {
          setReduceMotion(v);
          localStorage.setItem('lumatha_reduce_motion', String(v));
        }} />
      </div>
    );
  };

  const NotificationsPage = () => (
    <div className="pb-20">
      <PageHeader title="Notifications" onBack={() => setPage('main')} />
      <div className="mx-4 my-3 bg-card/80 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <p className="text-[15px] text-foreground font-bold" style={{ fontFamily: 'Space Grotesk' }}>All Notifications</p>
          </div>
          <Switch checked={notifications.all} onCheckedChange={(v) => setNotifications(p => ({ ...p, all: v }))} className="data-[state=checked]:bg-purple-600" />
        </div>
      </div>

      <div className={notifications.all ? '' : 'opacity-30 pointer-events-none'}>
        <SectionLabel>Social</SectionLabel>
        <ToggleRow icon="❤️" title="Likes on your posts" checked={notifications.likes} onChange={(v: boolean) => setNotifications(p => ({ ...p, likes: v }))} />
        <ToggleRow icon="💬" title="Comments on posts" checked={notifications.comments} onChange={(v: boolean) => setNotifications(p => ({ ...p, comments: v }))} />
        <ToggleRow icon="👥" title="New followers" checked={notifications.followers} onChange={(v: boolean) => setNotifications(p => ({ ...p, followers: v }))} />
        <ToggleRow icon="@" title="Mentions" checked={notifications.mentions} onChange={(v: boolean) => setNotifications(p => ({ ...p, mentions: v }))} />
        <ToggleRow icon="🔁" title="Post shares" checked={notifications.shares} onChange={(v: boolean) => setNotifications(p => ({ ...p, shares: v }))} />

        <SectionLabel>Messages</SectionLabel>
        <ToggleRow icon="💬" title="Direct messages" checked={notifications.directMessages} onChange={(v: boolean) => setNotifications(p => ({ ...p, directMessages: v }))} />
        <ToggleRow icon="👥" title="Group messages" checked={notifications.groupMessages} onChange={(v: boolean) => setNotifications(p => ({ ...p, groupMessages: v }))} />
        <ToggleRow
          icon="🎬"
          title="Auto-play videos in chat"
          subtitle="Play chat videos automatically when visible"
          checked={notifications.chatVideoAutoplay}
          onChange={(v: boolean) => {
            setNotifications((p) => ({ ...p, chatVideoAutoplay: v }));
            localStorage.setItem(CHAT_AUTOPLAY_STORAGE_KEY, String(v));
          }}
        />

        <SectionLabel>Adventure</SectionLabel>
        <ToggleRow icon="🎯" title="Daily challenge reminder" checked={notifications.dailyChallenge} onChange={(v: boolean) => setNotifications(p => ({ ...p, dailyChallenge: v }))} />
        <ToggleRow icon="🏆" title="Leaderboard changes" checked={notifications.leaderboard} onChange={(v: boolean) => setNotifications(p => ({ ...p, leaderboard: v }))} />
        <ToggleRow icon="✈️" title="New travel stories nearby" checked={notifications.travelStories} onChange={(v: boolean) => setNotifications(p => ({ ...p, travelStories: v }))} />

        <SectionLabel>Random Connect</SectionLabel>
        <ToggleRow icon="🤝" title="New connection" checked={notifications.randomConnect} onChange={(v: boolean) => setNotifications(p => ({ ...p, randomConnect: v }))} />
        <ToggleRow icon="💜" title="Memory reminder" checked={notifications.memoryReminder} onChange={(v: boolean) => setNotifications(p => ({ ...p, memoryReminder: v }))} />

        <SectionLabel>Style</SectionLabel>
        <ToggleRow icon="🔊" title="Sound" checked={notifications.sound} onChange={(v: boolean) => setNotifications(p => ({ ...p, sound: v }))} />
        <ToggleRow icon="📳" title="Vibration" checked={notifications.vibration} onChange={(v: boolean) => setNotifications(p => ({ ...p, vibration: v }))} />
        <ToggleRow icon="🔴" title="Badge count" subtitle="Shows number on app icon" checked={notifications.badgeCount} onChange={(v: boolean) => setNotifications(p => ({ ...p, badgeCount: v }))} />

        <SectionLabel>Do Not Disturb</SectionLabel>
        <ToggleRow icon="🌙" title="Quiet Hours" subtitle={notifications.quietHours ? `${quietFrom} → ${quietTo}` : 'Silence notifications at night'} checked={notifications.quietHours} onChange={(v: boolean) => setNotifications(p => ({ ...p, quietHours: v }))} />
      </div>
    </div>
  );

  const AIPage = () => (
    <div className="pb-20">
      <PageHeader title="AI Assistant" onBack={() => setPage('main')} />
      <div className="mx-4 my-3 bg-card/50 border border-border rounded-2xl p-4 flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <p className="text-[15px] text-foreground font-bold" style={{ fontFamily: 'Space Grotesk' }}>AI Assistant</p>
          <p className="text-[11px] text-muted-foreground">Powered by advanced AI models</p>
        </div>
        <div className="ml-auto">
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} className="data-[state=checked]:bg-purple-600" />
        </div>
      </div>

      <div className={aiEnabled ? '' : 'opacity-30 pointer-events-none'}>
        <SectionLabel>AI Features</SectionLabel>
        <ToggleRow icon="✨" title="Smart Replies in Chat" checked={aiFeatures.smartReplies} onChange={(v: boolean) => setAiFeatures(p => ({ ...p, smartReplies: v }))} />
        <ToggleRow icon="📝" title="AI Writing in Notes" checked={aiFeatures.aiWriting} onChange={(v: boolean) => setAiFeatures(p => ({ ...p, aiWriting: v }))} />
        <ToggleRow icon="🌅" title="Morning Briefing" subtitle="Daily motivational message" checked={aiFeatures.morningBriefing} onChange={(v: boolean) => setAiFeatures(p => ({ ...p, morningBriefing: v }))} />
        <ToggleRow icon="📊" title="Stats Insights" checked={aiFeatures.statsInsights} onChange={(v: boolean) => setAiFeatures(p => ({ ...p, statsInsights: v }))} />
        <ToggleRow icon="🗺️" title="Place Descriptions" checked={aiFeatures.placeDescriptions} onChange={(v: boolean) => setAiFeatures(p => ({ ...p, placeDescriptions: v }))} />
        <ToggleRow icon="✈️" title="Story Writer" checked={aiFeatures.storyWriter} onChange={(v: boolean) => setAiFeatures(p => ({ ...p, storyWriter: v }))} />

        <SectionLabel>Personality</SectionLabel>
        <div className="flex gap-3 px-5 py-2">
          {[
            { value: 'friendly' as const, icon: '😊', label: 'Friendly' },
            { value: 'formal' as const, icon: '📚', label: 'Formal' },
            { value: 'casual' as const, icon: '😄', label: 'Casual' },
          ].map(p => (
            <button key={p.value} onClick={() => setAiPersonality(p.value)}
              className={`flex-1 rounded-xl p-3 text-center border transition-all ${aiPersonality === p.value ? 'border-purple-500 bg-purple-500/10' : 'border-border bg-card/50'}`}>
              <span className="text-lg block">{p.icon}</span>
              <p className="text-[12px] text-foreground font-medium mt-1">{p.label}</p>
            </button>
          ))}
        </div>

        <SectionLabel>Language</SectionLabel>
        <div className="flex gap-3 px-5 py-2">
          {[
            { value: 'en', flag: '🇬🇧', label: 'English' },
            { value: 'ne', flag: '🇳🇵', label: 'Nepali' },
            { value: 'mixed', flag: '🔀', label: 'Mixed' },
          ].map(l => (
            <button key={l.value} onClick={() => setAiLanguage(l.value)}
              className={`flex-1 rounded-xl p-3 text-center border transition-all ${aiLanguage === l.value ? 'border-purple-500 bg-purple-500/10' : 'border-border bg-card/50'}`}>
              <span className="text-lg block">{l.flag}</span>
              <p className="text-[12px] text-foreground font-medium mt-1">{l.label}</p>
            </button>
          ))}
        </div>

        <SectionLabel>About</SectionLabel>
        <div className="mx-4 bg-card/50 border border-border rounded-2xl p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            AI features are powered by advanced language models. Your conversations help improve the experience. Usage is subject to available credits.
          </p>
        </div>
      </div>
    </div>
  );

  const HelpPage = () => {
    const faqs = [
      { q: 'How do I change my profile picture?', a: 'Go to your Profile page and tap on your avatar to upload a new photo.' },
      { q: 'How does content protection work?', a: 'Your content is protected with privacy controls. You can manage who sees your posts via the Settings > Privacy & Safety section.' },
      { q: 'How do I use Random Connect?', a: 'Go to the Random Connect section from the navigation. Choose Text, Audio, or Video mode and start connecting with random people safely.' },
      { q: 'Is my data safe?', a: 'Yes! We use end-to-end encryption for messages and your data is stored securely. You can download or delete your data anytime from Privacy settings.' },
      { q: 'How do I report a bug?', a: 'Use the Report a Bug option below or email us at lumatha333@gmail.com' },
    ];
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
      <div className="pb-20">
        <PageHeader title="Help & Support" onBack={() => setPage('main')} />
        <div className="mx-4 my-3 bg-card/50 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer" onClick={() => toast.info('AI Help coming soon')}>
          <span className="text-2xl">✨</span>
          <div>
            <p className="text-[15px] text-foreground font-bold">Ask AI for Help</p>
            <p className="text-[11px] text-muted-foreground">Get instant answers about Lumatha</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>

        <SectionLabel>Frequently Asked Questions</SectionLabel>
        {faqs.map((faq, i) => (
          <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left px-5 py-3.5 border-b border-border/50 transition-colors hover:bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-[14px] text-foreground font-medium pr-4">{faq.q}</p>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-90' : ''}`} />
            </div>
            {openFaq === i && <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{faq.a}</p>}
          </button>
        ))}

        <SectionLabel>Contact</SectionLabel>
        <div className="mx-4 bg-card/50 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-lg">📧</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Email Support</p>
            <a href="mailto:lumatha333@gmail.com" className="text-sm text-blue-500 hover:text-blue-600 font-semibold">
              lumatha333@gmail.com
            </a>
          </div>
        </div>
        <SettingsRow icon="🐛" title="Report a Bug" subtitle="Help us improve Lumatha" color="#EF4444" onClick={() => {
          const mailto = `mailto:lumatha333@gmail.com?subject=Bug Report - Lumatha&body=Please describe the bug you found:`;
          window.location.href = mailto;
        }} />
      </div>
    );
  };

  const AboutPage = () => (
    <div className="pb-20">
      <PageHeader title="About Lumatha" onBack={() => setPage('main')} />
      <div className="mx-4 my-3 rounded-[20px] p-8 border border-purple-500/20 text-center relative overflow-hidden bg-card">
        <div className="absolute top-[-30px] right-[-30px] text-[140px] opacity-[0.03]">💜</div>
<img src="/lumatha-logo-new.png" alt="Lumatha" className="w-20 h-14 mx-auto mb-3 rounded-xl object-cover shadow-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <h3 className="text-3xl font-black text-foreground" style={{ fontFamily: 'Space Grotesk' }}>Lumatha</h3>
        <p className="text-sm text-muted-foreground mt-1">Version 1.0.0</p>
        <p className="text-sm text-foreground mt-2">Made with 💜 in Nepal 🇳🇵</p>
      </div>

      <SectionLabel>Credits</SectionLabel>
      <div className="mx-4 bg-card/50 border border-border rounded-2xl p-4">
        <p className="text-sm text-foreground font-semibold">Built by Pratik</p>
        <p className="text-[12px] text-muted-foreground mt-1">Build by Pratik Dhakal at the age of 15</p>
      </div>

      <SectionLabel>Legal</SectionLabel>
      <SettingsRow icon="📄" title="Privacy Policy" subtitle="" color="#6B7280" onClick={() => navigate('/privacy')} />
      <SettingsRow icon="📋" title="Terms of Service" subtitle="" color="#6B7280" onClick={() => navigate('/terms')} />
      <SettingsRow icon="📦" title="Open Source Licenses" subtitle="" color="#6B7280" onClick={() => {}} />

      <SectionLabel>Support</SectionLabel>
      <div className="mx-4 bg-card/50 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-lg">📧</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Contact Us</p>
          <a href="mailto:lumatha333@gmail.com" className="text-sm text-blue-500 hover:text-blue-600 font-semibold">
            lumatha333@gmail.com
          </a>
        </div>
      </div>

      <SectionLabel>Share</SectionLabel>
      <div className="mx-4">
        <button onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'Lumatha', text: 'Check out Lumatha — a Nepal-first super app with AI, privacy shield, and random connect! 💜', url: 'https://lumatha03.lovable.app' });
          } else {
            navigator.clipboard.writeText('https://lumatha03.lovable.app');
            toast.success('Link copied!');
          }
        }} className="w-full py-3.5 rounded-2xl font-bold text-white text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all" style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
          <Share2 className="w-4 h-4" /> Share Lumatha 💜
        </button>
      </div>
    </div>
  );

  const ManagePage = () => (
    <div className="pb-20">
      <PageHeader title="Time & Controls" onBack={() => setPage('main')} />
      
      <SectionLabel>Screen Time Tracking</SectionLabel>
      <div className="mx-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-lg font-bold text-cyan-400">Today</p>
            <p className="text-[13px] text-muted-foreground">Time spent in Lumatha</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-cyan-400">42m</p>
            <p className="text-[11px] text-muted-foreground">vs. 38m yesterday</p>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-cyan-500/20 overflow-hidden">
          <div className="h-full w-[65%] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
        </div>
      </div>

      <SectionLabel>Daily Limits</SectionLabel>
      <ToggleRow icon="⏰" title="Set Daily Limit" subtitle="Get notified when you reach your limit" checked={true} onChange={() => toast.info('Daily limits feature')} />
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="text-lg w-6 text-center">📊</span>
        <div className="flex-1">
          <p className="text-[14px] text-foreground font-medium">Your Limit</p>
          <p className="text-xs text-muted-foreground">Maximum time per day</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-muted/30 active:scale-95">−</button>
          <span className="w-12 text-center font-bold text-foreground">2h 30m</span>
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-muted/30 active:scale-95">+</button>
        </div>
      </div>

      <SectionLabel>Downtime</SectionLabel>
      <ToggleRow icon="🌙" title="Scheduled Downtime" subtitle="Auto-minimize app during rest hours" checked={false} onChange={() => toast.info('Downtime scheduling')} />

      <SectionLabel>Statistics</SectionLabel>
      <div className="mx-4 grid grid-cols-3 gap-3">
        {[
          { label: 'This Week', value: '4h 23m', icon: '📅' },
          { label: 'This Month', value: '18h 12m', icon: '📊' },
          { label: 'This Year', value: '142h 5m', icon: '📈' },
        ].map((stat, i) => (
          <div key={i} className="bg-card/50 border border-border rounded-xl p-3 text-center">
            <p className="text-lg">{stat.icon}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
            <p className="text-[13px] font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <SectionLabel>Notifications</SectionLabel>
      <ToggleRow icon="🔔" title="Limit Warnings" subtitle="Alert when approaching daily limit" checked={true} onChange={() => {}} />
      <ToggleRow icon="🎯" title="Goal Reminders" subtitle="Remind you of your goals" checked={true} onChange={() => {}} />
    </div>
  );

  // ===== MAIN PAGE =====
  const MainPage = () => (
    <div className="pb-20">
      {/* User Card - Now at top without back button */}
      <div className="mx-4 mb-4 rounded-[20px] p-5 border border-purple-500/20 relative overflow-hidden bg-card">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-14 h-14 ring-2 ring-purple-500/50">
              <AvatarImage src={userProfile?.avatar_url || ''} />
              <AvatarFallback className="bg-muted text-foreground text-lg">{userProfile?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate" style={{ fontFamily: 'Space Grotesk' }}>{userProfile?.name || 'User'}</p>
            <p className="text-sm text-muted-foreground truncate">@{userProfile?.username || userProfile?.name?.toLowerCase().replace(/\s+/g, '') || 'user'}</p>
          </div>
          <button onClick={() => navigate(`/profile/${user?.id}`)} className="text-sm text-purple-400 font-semibold whitespace-nowrap flex items-center gap-1">
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Account */}
      <SectionLabel>Account</SectionLabel>
      <div className="mx-4 rounded-2xl overflow-hidden border border-border bg-card/30">
        {SECTION_ROWS.account.map((row, i) => (
          <div key={row.id}>
            {i > 0 && <div className="h-px bg-border/50 mx-5" />}
            <SettingsRow {...row} onClick={() => setPage(row.id)} />
          </div>
        ))}
      </div>

      {/* Experience */}
      <SectionLabel>Experience</SectionLabel>
      <div className="mx-4 rounded-2xl overflow-hidden border border-border bg-card/30">
        {SECTION_ROWS.experience.map((row, i) => (
          <div key={row.id || row.title}>
            {i > 0 && <div className="h-px bg-border/50 mx-5" />}
            {row.isInline ? (
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${row.color}20` }}>
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[15px] font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>{row.title}</p>
                   <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                </div>
                 <Select value={language} onValueChange={(v) => { setLanguage(v); localStorage.setItem('lumatha_language', v); }}>
                   <SelectTrigger className="w-28 h-8 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="ne">🇳🇵 Nepali</SelectItem>
                    <SelectItem value="hi">🇮🇳 Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <SettingsRow {...row} onClick={() => setPage(row.id)} />
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      {SECTION_ROWS.controls && (
        <>
          <SectionLabel>Controls</SectionLabel>
          <div className="mx-4 rounded-2xl overflow-hidden border border-border bg-card/30">
            {SECTION_ROWS.controls.map((row, i) => (
              <div key={row.id}>
                {i > 0 && <div className="h-px bg-border/50 mx-5" />}
                <SettingsRow {...row} onClick={() => setPage(row.id)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lumatha */}
      <SectionLabel>Lumatha</SectionLabel>
      <div className="mx-4 rounded-2xl overflow-hidden border border-border bg-card/30">
        {SECTION_ROWS.lumatha.map((row, i) => (
          <div key={row.id}>
            {i > 0 && <div className="h-px bg-border/50 mx-5" />}
            <SettingsRow {...row} onClick={() => setPage(row.id)} />
          </div>
        ))}
      </div>

      {/* Support */}
      <SectionLabel>Support</SectionLabel>
      <div className="mx-4 rounded-2xl overflow-hidden border border-border bg-card/30">
        {isAdmin && <AdminRow />}
        {SECTION_ROWS.support.map((row, i) => (
          <div key={row.id}>
            {i > 0 && <div className="h-px bg-border/50 mx-5" />}
            <SettingsRow {...row} onClick={() => setPage(row.id)} />
          </div>
        ))}
      </div>

      {/* Subscriptions */}
      <SectionLabel>Subscriptions</SectionLabel>
      <div className="mx-4 rounded-2xl overflow-hidden border border-border bg-card/30 opacity-70">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#F59E0B20' }}>
            💎
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>Premium Plans</p>
            <p className="text-xs text-muted-foreground">Unlock exclusive features</p>
          </div>
          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Coming Soon</span>
        </div>
      </div>

      {/* Sign Out */}
      <SectionLabel>Session</SectionLabel>
      <div className="mx-4 rounded-2xl overflow-hidden border border-red-900/30 bg-card/30">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-all">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-red-500/10">🚪</div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-red-400" style={{ fontFamily: 'Space Grotesk' }}>Sign Out</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </button>
      </div>

      <div className="text-center py-6">
        <p className="text-[11px] text-muted-foreground">Lumatha v1.0.0 • Made with 💜 in Nepal</p>
      </div>
    </div>
  );

  // ===== CUSTOMIZE LUMATHA PAGE =====
  const CustomizePage = () => {
    const [selectedLayout, setSelectedLayout] = useState<number>(() => {
      if (typeof window !== 'undefined') {
        return parseInt(localStorage.getItem('lumatha_layout_mode') || '1');
      }
      return 1;
    });
    const [showDropdown, setShowDropdown] = useState(false);
    
    const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('lumatha_section_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          const validKeys = ['home', 'learn', 'messages', 'randomConnect', 'adventure', 'marketplace'];
          const filtered = parsed.filter((k: string) => validKeys.includes(k));
          const missing = validKeys.filter(k => !filtered.includes(k));
          return [...filtered, ...missing];
        }
      }
      return ['home', 'learn', 'adventure', 'messages', 'randomConnect', 'marketplace'];
    });

    const saveLayout = (layout: number) => {
      setSelectedLayout(layout);
      localStorage.setItem('lumatha_layout_mode', String(layout));
      toast.success(`Layout ${layout} applied!`);
      window.dispatchEvent(new CustomEvent('lumatha_layout_change', { detail: layout }));
    };

    const saveSectionOrder = (newOrder: string[]) => {
      const mainSections = newOrder.filter(s => s !== 'settings');
      setSectionOrder(newOrder);
      localStorage.setItem('lumatha_section_order', JSON.stringify(mainSections));
      window.dispatchEvent(new CustomEvent('lumatha-manage-order-changed'));
      toast.success('Section order saved');
    };

    const resetOrder = () => {
      const resetSections = ['home', 'learn', 'adventure', 'messages', 'randomConnect', 'marketplace'];
      setSectionOrder([...resetSections]);
      localStorage.setItem('lumatha_section_order', JSON.stringify(resetSections));
      window.dispatchEvent(new CustomEvent('lumatha-manage-order-changed'));
      toast.success('Reset to default order');
    };

    const sectionIcons: Record<string, React.ReactNode> = {
      home: <Home className="w-5 h-5" />,
      learn: <BookOpen className="w-5 h-5" />,
      messages: <MessageSquare className="w-5 h-5" />,
      randomConnect: <Heart className="w-5 h-5" />,
      adventure: <Mountain className="w-5 h-5" />,
      marketplace: <ShoppingCart className="w-5 h-5" />,
    };

    const sectionLabels: Record<string, string> = {
      home: 'Feed',
      learn: 'Learn',
      messages: 'Messages',
      randomConnect: 'Random Connect',
      adventure: 'Adventure',
      marketplace: 'Marketplace',
    };

    const sectionColors: Record<string, string> = {
      home: 'bg-blue-500/20 text-blue-400',
      learn: 'bg-green-500/20 text-green-400',
      messages: 'bg-purple-500/20 text-purple-400',
      randomConnect: 'bg-pink-500/20 text-pink-400',
      adventure: 'bg-orange-500/20 text-orange-400',
      marketplace: 'bg-yellow-500/20 text-yellow-400',
    };

    // Reorder within dropdown
    const handleReorder = (newOrder: string[]) => {
      setSectionOrder(newOrder);
    };

    // Save when dropdown closes
    const handleDropdownToggle = () => {
      if (showDropdown) {
        // Closing - save the order
        saveSectionOrder(sectionOrder);
      }
      setShowDropdown(!showDropdown);
    };

    return (
      <div className="pb-20">
        <PageHeader title="Customize Lumatha" onBack={() => setPage('main')} />
        
        <SectionLabel>Choose Layout</SectionLabel>
        <div className="mx-4 space-y-3">
          {/* Layout 1: Classic */}
          <button 
            onClick={() => saveLayout(1)}
            className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedLayout === 1 ? 'border-purple-500 bg-purple-500/10' : 'border-border bg-card/30'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Classic Layout</p>
                <p className="text-xs text-muted-foreground">7 sections + Settings with custom ordering</p>
              </div>
              {selectedLayout === 1 && <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">✓</div>}
            </div>
          </button>

          {/* Layout 2: Privacy Zones */}
          <button 
            onClick={() => saveLayout(2)}
            className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedLayout === 2 ? 'border-purple-500 bg-purple-500/10' : 'border-border bg-card/30'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Privacy Zones</p>
                <p className="text-xs text-muted-foreground">Private × Neutral × Public sections</p>
              </div>
              {selectedLayout === 2 && <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">✓</div>}
            </div>
          </button>

          {/* Layout 3: Education First */}
          <button 
            onClick={() => saveLayout(3)}
            className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedLayout === 3 ? 'border-purple-500 bg-purple-500/10' : 'border-border bg-card/30'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Education First</p>
                <p className="text-xs text-muted-foreground">Education × Social × Neutral sections</p>
              </div>
              {selectedLayout === 3 && <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">✓</div>}
            </div>
          </button>

          {/* Layout 4: Custom - Coming Soon */}
          <button disabled className="w-full rounded-2xl border border-border bg-card/30 opacity-50 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Custom Layout</p>
                <p className="text-xs text-muted-foreground">Build your own layout</p>
              </div>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
          </button>
        </div>

        {/* Layout 1: Section Order Dropdown with Drag & Drop */}
        {selectedLayout === 1 && (
          <>
            <div className="flex items-center justify-between px-5 pt-6 pb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Section Order</p>
              <button 
                onClick={resetOrder}
                className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
            
            {/* Dropdown Toggle */}
            <div className="mx-4">
              <button
                onClick={handleDropdownToggle}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all"
              >
                <span className="text-sm text-muted-foreground">Current: {sectionOrder.length} sections</span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showDropdown && "rotate-180")} />
              </button>
              
              {/* Expandable Dropdown with Drag & Drop */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[11px] text-muted-foreground mt-2 mb-1 px-1">Long press and drag to reorder sections</p>
                    
                    <div className="rounded-xl border border-border bg-card/30 overflow-hidden mt-2">
                      <Reorder.Group axis="y" values={sectionOrder} onReorder={handleReorder} className="divide-y divide-border/50">
                        {sectionOrder.map((section) => (
                          <Reorder.Item key={section} value={section} className="touch-none">
                            <div className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing bg-card/20 hover:bg-card/40 transition-colors">
                              {/* Four dots drag handle */}
                              <div className="flex flex-col gap-0.5 opacity-50">
                                <div className="flex gap-0.5">
                                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                </div>
                                <div className="flex gap-0.5">
                                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                </div>
                              </div>
                              
                              {/* Icon */}
                              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", sectionColors[section])}>
                                {sectionIcons[section]}
                              </div>
                              
                              {/* Label */}
                              <span className="flex-1 text-[14px] font-medium text-foreground">{sectionLabels[section]}</span>
                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Layout 2: Privacy Zones - Detailed Preview */}
        {selectedLayout === 2 && (
          <>
            <SectionLabel>Layout Preview</SectionLabel>
            <div className="mx-4 space-y-4">
              {/* Private Zone - 7 subsections */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
                <div className="px-4 py-3 bg-purple-500/20 border-b border-purple-500/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Private Zone
                  </p>
                  <span className="text-[10px] text-purple-400/70">7 subsections</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { icon: Lock, label: 'Private', color: 'text-purple-400' },
                      { icon: CheckSquare, label: 'To Do', color: 'text-purple-400' },
                      { icon: StickyNote, label: 'Notes', color: 'text-purple-400' },
                      { icon: Mountain, label: 'Quests', color: 'text-purple-400' },
                      { icon: Trophy, label: 'Challenges', color: 'text-purple-400' },
                      { icon: MessageSquare, label: 'Messages', color: 'text-purple-400' },
                      { icon: Code, label: 'AB Dev', color: 'text-purple-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-white/5">
                        <item.icon className={cn("w-4 h-4", item.color)} />
                        <span className="text-[8px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Public Zone - 5 subsections */}
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 overflow-hidden">
                <div className="px-4 py-3 bg-green-500/20 border-b border-green-500/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Public Zone
                  </p>
                  <span className="text-[10px] text-green-400/70">5 subsections</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { icon: Home, label: 'Feed', color: 'text-green-400' },
                      { icon: Library, label: 'Docs', color: 'text-green-400' },
                      { icon: Ghost, label: 'Stories', color: 'text-green-400' },
                      { icon: ShoppingCart, label: 'Market', color: 'text-green-400' },
                      { icon: UserCircle, label: 'Profile', color: 'text-green-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                        <item.icon className={cn("w-5 h-5", item.color)} />
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Neutral Zone - 5 subsections */}
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
                <div className="px-4 py-3 bg-blue-500/20 border-b border-blue-500/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Neutral Zone
                  </p>
                  <span className="text-[10px] text-blue-400/70">5 subsections</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { icon: Compass, label: 'Explore', color: 'text-blue-400' },
                      { icon: Heart, label: 'Connect', color: 'text-blue-400' },
                      { icon: Bell, label: 'Notify', color: 'text-blue-400' },
                      { icon: BarChart3, label: 'Stats', color: 'text-blue-400' },
                      { icon: Trophy, label: 'Ranking', color: 'text-blue-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                        <item.icon className={cn("w-5 h-5", item.color)} />
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings - Always included */}
              <div className="rounded-2xl border border-border bg-card/30 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Settings</p>
                  <p className="text-[10px] text-muted-foreground">Always accessible</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Layout 3: Education First - Detailed Preview */}
        {selectedLayout === 3 && (
          <>
            <SectionLabel>Layout Preview</SectionLabel>
            <div className="mx-4 space-y-4">
              {/* Social Zone - 6 subsections */}
              <div className="rounded-2xl border border-pink-500/30 bg-pink-500/5 overflow-hidden">
                <div className="px-4 py-3 bg-pink-500/20 border-b border-pink-500/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-pink-400 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Social Zone
                  </p>
                  <span className="text-[10px] text-pink-400/70">6 subsections</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { icon: Home, label: 'Feed', color: 'text-pink-400' },
                      { icon: Mountain, label: 'Quest', color: 'text-pink-400' },
                      { icon: Compass, label: 'Explore', color: 'text-pink-400' },
                      { icon: Heart, label: 'Connect', color: 'text-pink-400' },
                      { icon: ShoppingCart, label: 'Market', color: 'text-pink-400' },
                      { icon: UserCircle, label: 'Profile', color: 'text-pink-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                        <item.icon className={cn("w-5 h-5", item.color)} />
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Education Zone - 5 subsections */}
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 overflow-hidden">
                <div className="px-4 py-3 bg-green-500/20 border-b border-green-500/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Education Zone
                  </p>
                  <span className="text-[10px] text-green-400/70">5 subsections</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { icon: Lock, label: 'Private', color: 'text-green-400' },
                      { icon: CheckSquare, label: 'To Do', color: 'text-green-400' },
                      { icon: StickyNote, label: 'Notes', color: 'text-green-400' },
                      { icon: Library, label: 'Docs', color: 'text-green-400' },
                      { icon: MessageSquare, label: 'Messages', color: 'text-green-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                        <item.icon className={cn("w-5 h-5", item.color)} />
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Neutral Zone - 5 subsections */}
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
                <div className="px-4 py-3 bg-blue-500/20 border-b border-blue-500/30 flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Neutral Zone
                  </p>
                  <span className="text-[10px] text-blue-400/70">5 subsections</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { icon: Ghost, label: 'Stories', color: 'text-blue-400' },
                      { icon: Code, label: 'AB Dev', color: 'text-blue-400' },
                      { icon: Bell, label: 'Notify', color: 'text-blue-400' },
                      { icon: BarChart3, label: 'Stats', color: 'text-blue-400' },
                      { icon: Trophy, label: 'Ranking', color: 'text-blue-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                        <item.icon className={cn("w-5 h-5", item.color)} />
                        <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings - Always included */}
              <div className="rounded-2xl border border-border bg-card/30 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Settings</p>
                  <p className="text-[10px] text-muted-foreground">Always accessible</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info footer */}
        <div className="mx-4 mt-6 p-3 rounded-xl bg-card/20 border border-border/50">
          <p className="text-[11px] text-muted-foreground text-center">
            Layout changes apply immediately. Bottom navigation adapts to show zone-specific options.
          </p>
        </div>
      </div>
    );
  };

  // ===== RENDER =====
  const pages: Record<SettingsPage, React.ReactNode> = {
    main: <MainPage />,
    privacy: <PrivacyPage />,
    security: <SecurityPage />,
    appearance: <AppearancePage />,
    notifications: <NotificationsPage />,
    ai: <AIPage />,
    manage: <ManagePage />,
    help: <HelpPage />,
    about: <AboutPage />,
    customize: <CustomizePage />,
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: page === 'main' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: page === 'main' ? 20 : -20 }}
          transition={{ duration: 0.15 }}
        >
          {pages[page]}
        </motion.div>
      </AnimatePresence>

      {/* PIN Screen Overlay */}
      <AnimatePresence>
        {showPinScreen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button onClick={() => setShowPinScreen(false)} className="absolute top-5 right-5 text-muted-foreground text-sm px-3 py-1.5 hover:bg-muted/30 rounded-lg transition-colors">Cancel</button>

            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6" style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>🔒</div>

            <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'Space Grotesk' }}>{getPinTitle()}</h2>
            <p className="text-sm text-muted-foreground mb-8">Enter a 4-digit code</p>

            <motion.div
              className="flex gap-5 mb-4"
              animate={pinShake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pinDigits.length ? 'bg-purple-500 scale-110 shadow-[0_0_12px_rgba(124,58,237,0.5)]' : 'bg-muted'}`} />
              ))}
            </motion.div>

            {pinError && (
              <motion.p className="text-red-400 text-sm mb-4" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>{pinError}</motion.p>
            )}

            <div className="grid grid-cols-3 gap-4 mt-4 w-[260px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(key => (
                <button
                  key={key || 'empty'}
                  disabled={!key}
                  onClick={() => {
                    if (key === '⌫') { setPinDigits(prev => prev.slice(0, -1)); setPinError(''); }
                    else if (key) handlePinDigit(key);
                  }}
                  className={`h-16 rounded-2xl text-2xl font-semibold transition-all active:scale-90 ${!key ? 'invisible' : key === '⌫' ? 'text-muted-foreground hover:bg-muted/50' : 'text-foreground bg-muted/50 hover:bg-muted/70 active:bg-purple-500/20'}`}
                  style={{ fontFamily: 'Space Grotesk' }}
                >
                  {key}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
