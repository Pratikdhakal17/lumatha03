import { useNavigate } from 'react-router-dom';
import { Flame, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export function DailyStreakInsert() {
  const completed = parseInt(localStorage.getItem('abdev_completed') || '[]', 10) || 0;
  const target = 5;
  const pct = Math.min((completed / target) * 100, 100);
  const navigate = useNavigate();

  return (
    <div 
      className="rounded-xl p-2.5 border"
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.05))',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div 
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
        >
          <Flame className="w-3 h-3 text-white" />
        </div>
        <span className="text-[11px] font-semibold" style={{ color: '#3B82F6' }}>Daily Challenge</span>
      </div>
      <Progress value={pct} className="h-1.5 mb-1.5" />
      <div className="flex items-center justify-between">
        <span className="text-[9px]" style={{ color: '#64748b' }}>{Math.round(pct)}% complete</span>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-5 text-[9px] gap-0.5 px-1.5 hover:bg-blue-500/10" 
          style={{ color: '#3B82F6' }}
          onClick={() => navigate('/music-adventure')}
        >
          View <ArrowRight className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}
