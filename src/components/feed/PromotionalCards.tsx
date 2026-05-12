import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, StickyNote, Mountain, Compass, Plane,
  Shuffle, Code, Gamepad2, ShoppingBag, BookOpen, Target,
  ArrowRight, Sparkles, Zap, Star
} from 'lucide-react';
import { ReactNode } from 'react';

/* ─── Card Variant: Compact Pill (Facebook-style) ─── */
function CompactPromo({
  gradient, icon, title, subtitle, cta, onTap,
}: {
  gradient: string; icon: ReactNode; title: string; subtitle: string; cta: string; onTap: () => void;
}) {
  return (
    <button onClick={onTap} className="w-full text-left active:scale-[0.98] transition-transform">
      <div className="rounded-2xl overflow-hidden" style={{ background: gradient, padding: '14px 16px' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-white leading-tight truncate">{title}</h3>
            <p className="text-[11px] text-white/60 leading-snug truncate mt-0.5">{subtitle}</p>
          </div>
          <div className="shrink-0 bg-white/15 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[11px] font-semibold text-white whitespace-nowrap">{cta}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Card Variant: Wide Banner (Thread/IG style) ─── */
function BannerPromo({
  gradient, icon, title, subtitle, stats, cta, onTap,
}: {
  gradient: string; icon: ReactNode; title: string; subtitle: string; stats?: string; cta: string; onTap: () => void;
}) {
  return (
    <button onClick={onTap} className="w-full text-left active:scale-[0.98] transition-transform">
      <div className="rounded-2xl overflow-hidden" style={{ background: gradient, padding: '18px 20px' }}>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
            <p className="text-[12px] text-white/60 leading-snug line-clamp-2">{subtitle}</p>
            {stats && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-yellow-300" />
                <span className="text-[10px] font-medium text-yellow-200/80">{stats}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-1 bg-white/15 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm mt-1">
              <span className="text-[11px] font-semibold text-white">{cta}</span>
              <ArrowRight className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Card Variant: Dual Feature (two mini cards side by side) ─── */
function DualPromo({
  items,
}: {
  items: { gradient: string; icon: ReactNode; title: string; route: string }[];
}) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => navigate(item.route)}
          className="rounded-xl overflow-hidden text-left active:scale-[0.97] transition-transform"
          style={{ background: item.gradient, padding: '14px' }}
        >
          <div className="flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="text-[12px] font-bold text-white leading-tight">{item.title}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Master card definitions ─── */
const allCards = [
  {
    type: 'compact' as const,
    gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    icon: <CheckSquare className="w-5 h-5 text-indigo-300" />,
    title: "Today's Tasks",
    subtitle: 'Organize your goals & build streaks',
    cta: 'Open →',
    route: '/education',
  },
  {
    type: 'banner' as const,
    gradient: 'linear-gradient(135deg, #14532d, #166534)',
    icon: <Mountain className="w-5.5 h-5.5 text-emerald-300" />,
    title: 'Adventure Awaits',
    subtitle: 'Discover 2200+ locations. Complete challenges, earn ranks & explore the world.',
    stats: '500+ real-world challenges',
    cta: 'Start Exploring',
    route: '/music-adventure',
  },
  {
    type: 'compact' as const,
    gradient: 'linear-gradient(135deg, #0c4a6e, #075985)',
    icon: <StickyNote className="w-5 h-5 text-sky-300" />,
    title: 'Quick Notes',
    subtitle: 'Capture ideas before they fade',
    cta: 'Write →',
    route: '/education',
  },
  {
      { type: 'dual' as const,
    items: [
      { gradient: 'linear-gradient(135deg, #4a044e, #701a75)', icon: <Shuffle className="w-4.5 h-4.5 text-fuchsia-300" />, title: 'Random Connect', route: '/random-connect' },
      { gradient: 'linear-gradient(135deg, #1c1917, #292524)', icon: <Code className="w-4.5 h-4.5 text-purple-300" />, title: 'Arcade Games', route: '/funpun' },
    ],
  },
  {
    type: 'banner' as const,
    gradient: 'linear-gradient(135deg, #7c2d12, #9a3412)',
    icon: <Compass className="w-5.5 h-5.5 text-orange-300" />,
    title: 'Explore Your World',
    subtitle: 'Discover hidden gems, local treasures and breathtaking views near you.',
    stats: 'Trending near your area',
    cta: 'Discover Now',
    route: '/music-adventure',
  },
  {
    type: 'compact' as const,
    gradient: 'linear-gradient(135deg, #022c22, #064e3b)',
    icon: <ShoppingBag className="w-5 h-5 text-emerald-300" />,
    title: 'Marketplace',
    subtitle: 'Buy, sell & find jobs locally',
    cta: 'Browse →',
    route: '/marketplace',
  },
  {
    type: 'dual' as const,
    items: [
      { gradient: 'linear-gradient(135deg, #0f172a, #1e293b)', icon: <BookOpen className="w-4.5 h-4.5 text-cyan-300" />, title: 'Learn Hub', route: '/education' },
      { gradient: 'linear-gradient(135deg, #3b0764, #581c87)', icon: <Star className="w-4.5 h-4.5 text-yellow-300" />, title: 'Saved Posts', route: '/saved' },
    ],
  },
  {
    type: 'banner' as const,
    gradient: 'linear-gradient(135deg, #0f172a, #1e293b)',
    icon: <Plane className="w-5.5 h-5.5 text-sky-300" />,
    title: 'Share Your Journey',
    subtitle: 'Create beautiful travel stories with photos, videos & more. Inspire millions.',
    stats: 'Your stories, your legacy',
    cta: 'Write Story',
    route: '/create',
  },
  {
    type: 'compact' as const,
    gradient: 'linear-gradient(135deg, #4a044e, #701a75)',
    icon: <Target className="w-5 h-5 text-pink-300" />,
    title: "Today's Challenge",
    subtitle: 'Push your limits with an adventure',
    cta: 'Accept →',
    route: '/music-adventure',
  },
  {
    type: 'banner' as const,
    gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    icon: <Shuffle className="w-5.5 h-5.5 text-blue-300" />,
    title: 'Meet Someone New',
    subtitle: 'Anonymous. Safe. Interesting. Text, audio or video chat with real people.',
    stats: 'Safety-first design',
    cta: 'Start Connecting',
    route: '/random-connect',
  },
];

/* ─── Exported component used by FeedInterleaver ─── */
export function PromotionalCard({ index }: { index: number }) {
  const navigate = useNavigate();
  const card = allCards[index % allCards.length];

  if (card.type === 'dual') {
    return <DualPromo items={card.items!} />;
  }

  if (card.type === 'banner') {
    return (
      <BannerPromo
        gradient={card.gradient!}
        icon={card.icon!}
        title={card.title!}
        subtitle={card.subtitle!}
        stats={card.stats}
        cta={card.cta!}
        onTap={() => navigate(card.route!)}
      />
    );
  }

  return (
    <CompactPromo
      gradient={card.gradient!}
      icon={card.icon!}
      title={card.title!}
      subtitle={card.subtitle!}
      cta={card.cta!}
      onTap={() => navigate(card.route!)}
    />
  );
}
