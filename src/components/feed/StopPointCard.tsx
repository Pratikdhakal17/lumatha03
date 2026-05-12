import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Mountain, Code, Target, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BreakModeScreen } from './BreakModeScreen';

export function StopPointCard() {
  const navigate = useNavigate();
  const [showBreak, setShowBreak] = useState(false);

  if (showBreak) return <BreakModeScreen onReturn={() => setShowBreak(false)} />;

  return (
    <div className="glass-card rounded-2xl p-4 text-center space-y-3">
      <Leaf className="w-8 h-8 text-green-400 mx-auto" />
      <div>
        <p className="text-sm font-semibold">You're all caught up 🌿</p>
        <p className="text-xs text-muted-foreground mt-0.5">Want to do something meaningful?</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1" onClick={() => navigate('/music-adventure')}>
          <Mountain className="w-3.5 h-3.5" /> Adventure
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1" onClick={() => navigate('/funpun')}>
          <Code className="w-3.5 h-3.5" /> AB Dev
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1" onClick={() => navigate('/music-adventure')}>
          <Target className="w-3.5 h-3.5" /> Goals
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1" onClick={() => setShowBreak(true)}>
          <Coffee className="w-3.5 h-3.5" /> Break
        </Button>
      </div>
    </div>
  );
}
