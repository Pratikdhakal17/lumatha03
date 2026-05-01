import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Settings, Bookmark, MessageSquare, Music, FileText, 
  Palette, GraduationCap, ShoppingBag, Compass, ChevronRight,
  Heart, Users, Bell, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const shortcuts = [
  { icon: Settings, label: 'Settings', path: '/settings', color: 'from-slate-500 to-slate-600' },
  { icon: Bookmark, label: 'Saved Items', path: '/saved', color: 'from-amber-500 to-orange-500' },
  { icon: MessageSquare, label: 'Messages', path: '/chat', color: 'from-blue-500 to-cyan-500' },
  { icon: Music, label: 'Music', path: '/music', color: 'from-pink-500 to-rose-500' },
  { icon: FileText, label: 'My Notes', path: '/private', color: 'from-green-500 to-emerald-500' },
  { icon: Palette, label: 'Creativity Hub', path: '/creativity', color: 'from-purple-500 to-violet-500' },
  { icon: GraduationCap, label: 'Education', path: '/education', color: 'from-indigo-500 to-blue-500' },
  { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', color: 'from-teal-500 to-green-500' },
  { icon: Compass, label: 'Adventures', path: '/adventure', color: 'from-orange-500 to-red-500' },
];

const stats = [
  { icon: Heart, label: 'Likes', key: 'likes' },
  { icon: Users, label: 'Followers', key: 'followers' },
  { icon: Bell, label: 'Notifications', key: 'notifications' },
];

export function ProfileShortcuts() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleNavigate = (path: string) => {
    if (path === 'profile' && profile?.id) {
      navigate(`/profile/${profile.id}`);
    } else {
      navigate(path);
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Profile Card */}
      <Card className="glass-card border-border overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20" />
        <CardContent className="pt-0 -mt-10 text-center">
          <Avatar 
            className="w-20 h-20 mx-auto ring-4 ring-background cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleNavigate('profile')}
          >
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-2xl text-white">
              {profile.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-xl font-bold mt-3">{profile.name}</h2>
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
          )}
          
          {/* Quick Stats */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold">{profile.total_posts || 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{profile.total_followers || 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{profile.total_following || 0}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Shortcuts Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/50 hover:bg-card transition-colors group"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-110",
                item.color
              )}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Logout Button */}
      <Button 
        variant="outline" 
        className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  );
}
