import { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, CheckSquare, Mountain, Check, ChevronLeft } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SYSTEM_CHALLENGES } from '@/data/adventureChallenges';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TodoItem {
  id: string;
  title?: string | null;
  task?: string | null;
  content?: string | null;
  completed?: boolean | null;
}

const MessageItem = memo(function MessageItem({ conv, onClick }: { conv: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/60 transition-colors"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-[10px] font-bold text-white">
          <AvatarImage src={conv.user_avatar || undefined} className="rounded-full object-cover" />
          <AvatarFallback className="rounded-full bg-transparent text-white">
            {(conv.user_name || 'U')[0]}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 w-[7px] h-[7px] rounded-full bg-green-500 border border-card" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-medium text-foreground truncate">{conv.user_name || 'User'}</p>
          <span className="text-[8px] text-muted-foreground whitespace-nowrap">
            {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false }).replace('about ', '').replace('less than a minute', 'now') : ''}
          </span>
        </div>
        <p className="text-[9px] text-muted-foreground truncate">{conv.last_message || 'Start chatting...'}</p>
      </div>
    </button>
  );
});

const TaskItem = memo(function TaskItem({ todo, onClick }: { todo: TodoItem; onClick: () => void }) {
  const label = todo.title || todo.task || todo.content;
  if (!label) return null;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/60 transition-colors"
    >
      <div className={`w-[14px] h-[14px] rounded-[3px] border-[1.5px] flex items-center justify-center flex-shrink-0 ${todo.completed ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
        {todo.completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
      </div>
      <p className={`text-[10px] flex-1 text-left truncate ${todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
        {label}
      </p>
    </button>
  );
});

const ChallengeItem = memo(function ChallengeItem({ challenge, onClick }: { challenge: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/60 transition-colors"
    >
      <div className="w-6 h-6 rounded-[6px] bg-muted flex items-center justify-center text-[12px] flex-shrink-0">
        {challenge.icon || '⛰️'}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] font-medium text-foreground truncate">{challenge.title || 'Challenge'}</p>
        <p className="text-[8px] text-muted-foreground uppercase tracking-tighter truncate">{challenge.category || 'Adventure'}</p>
      </div>
      <div className="px-1.5 py-0.5 rounded-[4px] bg-[#7c6af7]/20 text-[#a88eff] text-[8px] font-bold">
        {challenge.duration === '30' ? 'DAILY' : 'WEEKLY'}
      </div>
    </button>
  );
});

interface DesktopRightRailProps {
  onCollapseToggle?: () => void;
}

export function DesktopRightRail({ onCollapseToggle }: DesktopRightRailProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { conversations } = useChat();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });

  useEffect(() => {
    if (!user?.id) {
      setTodos([]);
      return;
    }

    let active = true;
    const loadData = async () => {
      // Load Todos
      const { data: todoData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Load Stats
      const [postsCount, followingCount, followersCount] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', user.id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', user.id),
      ]);

      if (!active) return;
      setTodos((todoData || []) as TodoItem[]);
      setStats({
        posts: postsCount.count || 0,
        following: followingCount.count || 0,
        followers: followersCount.count || 0,
      });
    };

    loadData();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const topMessages = useMemo(() => conversations.slice(0, 5), [conversations]);
  const topTodos = useMemo(() => todos.slice(0, 5), [todos]);
  const topChallenges = useMemo(() => SYSTEM_CHALLENGES.slice(0, 5), []);

  return (
    <aside className="sidebar-right hidden xl:flex border-l border-border flex-col bg-background/95">
      <div className="flex items-center justify-end px-3 py-2 border-b border-border">
        <button
          onClick={onCollapseToggle}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors"
          title="Collapse panel"
          aria-label="Collapse right panel"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex flex-col h-full overflow-y-auto no-scrollbar pb-10">

        <div className="p-3 space-y-3">
          {/* Messages Section (Prompt 6) */}
          <section className="rounded-2xl border border-border bg-card/70">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Messages</h3>
              </div>
              <button className="text-[10px] font-bold text-primary" onClick={() => navigate('/chat')}>ALL</button>
            </div>
            <div className="p-1.5 space-y-0.5">
              {topMessages.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-2 py-3 text-center">No messages yet</p>
              ) : (
                topMessages.map((conv: any) => (
                  <MessageItem key={conv.user_id} conv={conv} onClick={() => navigate(`/chat/${conv.user_id}`)} />
                ))
              )}
            </div>
          </section>

          {/* Daily Tasks Section (Prompt 7) */}
          <section className="rounded-2xl border border-border bg-card/70">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Daily Tasks</h3>
              </div>
              <button className="text-[10px] font-bold text-primary" onClick={() => navigate('/education')}>VIEW</button>
            </div>
            <div className="p-1.5 space-y-0.5">
              {topTodos.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-2 py-3 text-center">No tasks for today</p>
              ) : (
                topTodos.map((todo) => (
                  <TaskItem key={todo.id} todo={todo} onClick={() => navigate('/education')} />
                ))
              )}
            </div>
          </section>

          {/* Adventure Section (Prompt 8) */}
          <section className="rounded-2xl border border-border bg-card/70">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-amber-500" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adventures</h3>
              </div>
              <button className="text-[10px] font-bold text-primary" onClick={() => navigate('/music-adventure')}>EXP</button>
            </div>
            <div className="p-1.5 space-y-0.5">
              {topChallenges.map((challenge: any) => (
                <ChallengeItem key={challenge.id} challenge={challenge} onClick={() => navigate('/music-adventure')} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}

