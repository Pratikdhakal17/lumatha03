import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, BookOpen, CheckSquare, Bookmark, TrendingUp, Globe, Plus, ArrowRight, Crown, PenLine, Image, Music, Code, Star } from 'lucide-react';

// ... (existing code)

export function FunpunPreviewWidget({ className }: WidgetProps) {
  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group shadow-[0_0_20px_rgba(249,115,22,0.15)]", className)}>
      <Link to="/funpun">
        <CardHeader className="p-3 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center relative">
                <Code className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold">FP Games</CardTitle>
            </div>
            <Badge variant="outline" className="text-[8px] h-4 border-green-500/50 text-green-500 font-black animate-pulse">PLAY NOW</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
            Experience 29 classic games in our legendary FP-333 console. Pure nostalgia, high-performance gaming.
          </p>
          <div className="mt-2 flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
            <span className="text-[9px] font-bold text-orange-500/80 tracking-widest uppercase">29 GAMES ACTIVE</span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WidgetProps {
  className?: string;
}

export function FeedPreviewWidget({ className }: WidgetProps) {
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase.from('posts').select('id, title').eq('visibility', 'public').order('created_at', { ascending: false }).limit(3);
      setRecentPosts(data || []);
    };
    fetchPosts();
  }, []);

  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group", className)}>
      <Link to="/public">
        <CardHeader className="p-3 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold">Feed</CardTitle>
            </div>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {recentPosts.length > 0 ? (
            <div className="space-y-1">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                  <div className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                  <span className="truncate text-muted-foreground">{post.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] sm:text-xs text-muted-foreground">No posts yet</p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

export function ChatPreviewWidget({ className }: WidgetProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', user.id).eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
  }, [user]);

  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group", className)}>
      <Link to="/chat">
        <CardHeader className="p-3 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center relative">
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
                )}
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold">Messages</CardTitle>
            </div>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {unreadCount > 0 ? (
            <p className="text-[10px] sm:text-xs font-medium" style={{ color: '#22C55E' }}>New messages</p>
          ) : (
            <p className="text-[10px] sm:text-xs text-muted-foreground">All caught up!</p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

export function NotesPreviewWidget({ className }: WidgetProps) {
  const { user } = useAuth();
  const [notesCount, setNotesCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchNotes = async () => {
      const { count } = await supabase.from('keep_notes').select('id', { count: 'exact' }).eq('user_id', user.id);
      setNotesCount(count || 0);
    };
    fetchNotes();
  }, [user]);

  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group", className)}>
      <Link to="/education">
        <CardHeader className="p-3 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold">Notes</CardTitle>
            </div>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">{notesCount} saved</p>
        </CardContent>
      </Link>
    </Card>
  );
}

export function TasksPreviewWidget({ className }: WidgetProps) {
  const { user } = useAuth();
  const [todoStats, setTodoStats] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchTodos = async () => {
      const { data } = await supabase.from('todos').select('completed').eq('user_id', user.id);
      const total = data?.length || 0;
      const completed = data?.filter(t => t.completed).length || 0;
      setTodoStats({ total, completed });
    };
    fetchTodos();
  }, [user]);

  const progress = todoStats.total > 0 ? (todoStats.completed / todoStats.total) * 100 : 0;

  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_14px_rgba(16,185,129,0.2)]", className)}>
      <Link to="/education">
        <CardHeader className="p-3 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold">Tasks</CardTitle>
            </div>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">{todoStats.completed}/{todoStats.total}</span>
            <span className="text-primary font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export function SavedItemsWidget({ className }: WidgetProps) {
  const { user } = useAuth();
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchSaved = async () => {
      const { count } = await supabase.from('saved').select('id', { count: 'exact' }).eq('user_id', user.id);
      setSavedCount(count || 0);
    };
    fetchSaved();
  }, [user]);

  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group", className)}>
      <Link to="/saved">
        <CardHeader className="p-3 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              </div>
              <CardTitle className="text-xs sm:text-sm font-semibold">Saved</CardTitle>
            </div>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">{savedCount} items</p>
        </CardContent>
      </Link>
    </Card>
  );
}

export function TrendsWidget({ className }: WidgetProps) {
  const trends = [
    { tag: '#Tech', count: '2.3K' },
    { tag: '#Music', count: '1.8K' },
    { tag: '#Education', count: '1.2K' },
  ];

  return (
    <Card className={cn("glass-card border-border/40 hover-lift", className)}>
      <CardHeader className="p-3 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-semibold">Trending</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1">
          {trends.map((trend, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-primary font-medium">{trend.tag}</span>
              <span className="text-muted-foreground">{trend.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickCreateWidget({ className }: WidgetProps) {
  const actions = [
    { icon: PenLine, label: 'Post', color: 'from-primary to-secondary', link: '/create' },
    { icon: Image, label: 'Photo', color: 'from-pink-500 to-rose-500', link: '/create' },
    { icon: Music, label: 'Music', color: 'from-violet-500 to-purple-500', link: '/music-adventure' },
    { icon: BookOpen, label: 'Note', color: 'from-amber-500 to-orange-500', link: '/education' },
  ];

  return (
    <Card className={cn("glass-card border-border/40", className)}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse-glow">
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-foreground" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-semibold">Quick Create</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {actions.map((action, i) => (
            <Link key={i} to={action.link}>
              <Button variant="ghost" className="w-full h-auto flex-col py-2 gap-1 hover:bg-muted/50 group">
                <div className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-110",
                  action.color
                )}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground group-hover:text-foreground">{action.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileStatsWidget({ className }: WidgetProps) {
  const { profile } = useAuth();

  return (
    <Card className={cn("glass-card border-border/40 hover-lift cursor-pointer group", className)}>
      <Link to={profile?.id ? `/profile/${profile.id}` : '/auth'}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11 ring-2 ring-primary/40 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-sm font-bold">
                {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {profile?.name || 'Guest User'}
              </h4>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <span>{profile?.total_posts || 0} posts</span>
                <span>{profile?.total_followers || 0} followers</span>
              </div>
            </div>
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
