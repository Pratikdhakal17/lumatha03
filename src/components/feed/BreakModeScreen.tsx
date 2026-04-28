import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface BreakModeScreenProps {
  onReturn: () => void;
}

export function BreakModeScreen({ onReturn }: BreakModeScreenProps) {
  const [seconds, setSeconds] = useState(120); // 2 minutes
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  // Breathing cycle: 4s inhale, 4s hold, 4s exhale
  useEffect(() => {
    const cycle = setInterval(() => {
      setPhase(p => p === 'inhale' ? 'hold' : p === 'hold' ? 'exhale' : 'inhale');
    }, 4000);
    return () => clearInterval(cycle);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="glass-card rounded-2xl p-6 text-center space-y-4">
      <div className="relative w-24 h-24 mx-auto">
        <div
          className={`w-full h-full rounded-full transition-all ease-in-out ${
            phase === 'inhale' ? 'scale-100 bg-primary/30' :
            phase === 'hold' ? 'scale-110 bg-primary/40' :
            'scale-90 bg-primary/20'
          }`}
          style={{ transitionDuration: '4000ms' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium capitalize text-primary">
          {phase}
        </span>
      </div>
      <p className="text-lg font-mono text-foreground">{mins}:{secs.toString().padStart(2, '0')}</p>
      <p className="text-xs text-muted-foreground">Take a moment to breathe</p>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={onReturn}>
        Return
      </Button>
    </div>
  );
}
