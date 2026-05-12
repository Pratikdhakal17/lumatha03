import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, MapPin, Star, Check, Heart, 
  ExternalLink, Sparkles, Calendar, Users, MessageCircle, Bookmark, X,
  Navigation
} from 'lucide-react';
import LazyBlurImage from '@/components/LazyBlurImage';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AdventureCommentsDialog } from '@/components/AdventureCommentsDialog';
import { toast } from 'sonner';

interface Place {
  id: string;
  name: string;
  country: string;
  city?: string;
  countryCode?: string;
  countryFlag: string;
  type: 'unesco' | 'hidden';
  image: string;
  stars: number;
  mapUrl?: string;
  description?: string;
  photoSourceName?: string;
  photoSourceUrl?: string;
  photoCredit?: string;
  bestMonths?: string[];
}

interface PlaceDetailSheetProps {
  place: Place;
  isVisited: boolean;
  isLoved: boolean;
  isSaved?: boolean;
  userRating?: number;
  onOpenChange: (open: boolean) => void;
  onToggleVisit: () => void;
  onToggleLove: () => void;
  onToggleSave?: () => void;
  onRate: (rating: number) => void;
  onOpenComments: () => void;
}

const PLACE_SPECIFIC_BEST_TIMES: Record<string, string[]> = {
  'Everest Base Camp': ['Apr', 'May', 'Oct', 'Nov'],
  'Machu Picchu': ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
  'Petra': ['Mar', 'Apr', 'May', 'Sep', 'Oct', 'Nov'],
  'Santorini': ['Apr', 'May', 'Jun', 'Sep', 'Oct'],
  'Kyoto': ['Mar', 'Apr', 'Oct', 'Nov'],
  'Bali': ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
  'Great Barrier Reef': ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  'Iceland': ['Jun', 'Jul', 'Aug', 'Dec', 'Jan', 'Feb'],
  'Cairo': ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  'Paris': ['Apr', 'May', 'Jun', 'Sep', 'Oct'],
  'Swiss Alps': ['Jun', 'Jul', 'Aug', 'Dec', 'Jan', 'Feb', 'Mar'],
};

export function PlaceDetailSheet({
  place,
  isVisited,
  isLoved,
  isSaved = false,
  userRating,
  onOpenChange,
  onToggleVisit,
  onToggleLove,
  onToggleSave,
  onRate,
  onOpenComments
}: PlaceDetailSheetProps) {
  const [aiDescription, setAiDescription] = useState<string>('');
  const [loadingDescription, setLoadingDescription] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (place.description) {
      setAiDescription(place.description);
      setLoadingDescription(false);
      return;
    }
    setAiDescription(`${place.name} is a world-class destination in ${place.country}. Known for its breathtaking ${place.type === 'unesco' ? 'historical significance' : 'natural beauty'}, it offers explorers a unique glimpse into the soul of ${place.country}.`);
    setLoadingDescription(false);
  }, [place.id, place.name, place.country]);

  const bestMonths = PLACE_SPECIFIC_BEST_TIMES[place.name] || ['Mar', 'Apr', 'May', 'Sep', 'Oct', 'Nov'];

  const handleOpenMaps = () => {
    const url = place.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.country)}`;
    window.open(url, '_blank');
    if (!isVisited) {
      onToggleVisit();
      toast.success('Added to visited places! 📍');
    }
  };

  if (showComments) {
    return (
      <Sheet open={true} onOpenChange={() => setShowComments(false)}>
        <SheetContent side="bottom" className="h-full rounded-none p-0 border-0 bg-[#0a0f1e] flex flex-col">
          <SheetTitle className="sr-only">Place comments</SheetTitle>
          <SheetDescription className="sr-only">Read and add comments for this place.</SheetDescription>
          <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0f1e] z-20">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowComments(false)} className="p-1 hover:bg-white/5 rounded-full text-slate-400">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-[17px] font-bold text-white truncate font-['Space_Grotesk']">{place.name}</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
            <div className="w-full aspect-video overflow-hidden relative">
              <img src={place.image} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
            </div>
            <div className="relative z-10 min-h-0 flex-1 flex flex-col">
               <AdventureCommentsDialog 
                 open={true} 
                 onOpenChange={() => {}} 
                 itemId={place.id} 
                 itemTitle={place.name} 
                 itemType="place"
                   mediaUrl={place.image}
                 inline
               />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={true} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-full sm:h-full md:h-full rounded-none p-0 border-0 [&>button]:hidden shadow-2xl flex flex-col"
        style={{ background: '#0a0f1e' }}
      >
        <SheetTitle className="sr-only">Place details</SheetTitle>
        <SheetDescription className="sr-only">Details, best visiting months, and actions for this destination.</SheetDescription>
        <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-white/5 sticky top-0 bg-[#0a0f1e]/80 backdrop-blur-xl z-20">
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-sm font-black uppercase tracking-widest">Back</span>
          </button>
          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", isVisited ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-slate-900 border-white/5 text-slate-500")}>
            {isVisited ? 'Visited ✓' : 'Not Visited'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <div className="w-full aspect-[4/3] relative overflow-hidden">
            <LazyBlurImage 
              src={place.image} 
              alt={place.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent" />
          </div>

          <div className="px-6 -mt-16 relative z-10 space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white leading-none tracking-tight font-['Space_Grotesk']">
                {place.name}
              </h1>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[12px]">
                  <MapPin className="w-4 h-4" />
                  {place.countryFlag} {place.country}
                </div>
                {place.city && (
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest ml-6 opacity-60">Nearby: {place.city}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-1.5 bg-primary rounded-full" />
              <p className="text-[17px] text-slate-300 leading-relaxed font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                {aiDescription}
              </p>
            </div>

            <div className="space-y-5 bg-slate-900/30 p-6 rounded-[32px] border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Best time to visit</label>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => {
                  const isBest = bestMonths.includes(month);
                  return (
                    <div 
                      key={month}
                      className={cn(
                        "shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all",
                        isBest ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-slate-900/50 border-white/5 text-slate-700"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase">{month}</span>
                      {isBest && <Sparkles className="w-3 h-3" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 border-t border-white/5 bg-[#0a0f1e]/95 backdrop-blur-2xl z-30 flex items-center gap-3 pb-safe">
          <button 
            onClick={onToggleLove}
            className={cn(
              "w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-90",
              isLoved ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-slate-900 border-white/5 text-slate-500"
            )}
          >
            <Heart className={cn("w-5 h-5", isLoved && "fill-current")} />
          </button>
          
          <button 
            onClick={() => setShowComments(true)}
            className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 active:scale-90 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          <button 
            onClick={onToggleSave ? onToggleSave : () => { toast.success('Saved to collection ✨'); }}
            className={cn(
              "w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-90",
              isSaved ? "bg-violet-500/10 border-violet-500/20 text-violet-500" : "bg-slate-900 border-white/5 text-slate-500"
            )}
          >
            <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
          </button>

          <button
            onClick={handleOpenMaps}
            className="flex-1 h-12 rounded-xl bg-primary text-white flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] shadow-xl shadow-primary/30 active:scale-95 transition-all"
          >
            <Navigation className="w-4 h-4 fill-current" />
            Maps
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
