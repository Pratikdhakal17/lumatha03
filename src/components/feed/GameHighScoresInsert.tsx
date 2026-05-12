import { useNavigate } from 'react-router-dom';
import { Code, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const top3 = [
  { name: 'MindMaster99', score: 15420, badge: '🥇' },
  { name: 'BrainNinja', score: 14200, badge: '🥈' },
  { name: 'QuizKing', score: 13800, badge: '🥉' },
];

export function GameHighScoresInsert() {
  const navigate = useNavigate();

  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-semibold">AB Dev Leaderboard</span>
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => navigate('/funpun')}>
          Play Now
        </Button>
      </div>
      <div className="space-y-1.5">
        {top3.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-center">{p.badge}</span>
            <span className="flex-1 truncate text-muted-foreground">{p.name}</span>
            <span className="font-medium text-foreground">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
