import { Plus, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function ProfileStrip() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const displayName = profile?.username ? `@${profile.username.replace('@', '')}` : profile?.name || 'Welcome!';

  return (
    <div className="glass-card rounded-2xl p-4 border border-border/50 hover-lift">
      <div className="flex items-center gap-4">
        {/* Profile Avatar with Add Button */}
        <button 
          onClick={() => navigate('/create')}
          className="relative group shrink-0"
        >
          <Avatar className="w-16 h-16 ring-[3px] ring-primary/60 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary group-hover:scale-105">
            <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground text-xl font-bold">
              {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg ring-2 ring-background">
            <Plus className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
        </button>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <button 
            onClick={() => profile?.id && navigate(`/profile/${profile.id}`)}
            className="text-left group"
          >
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {profile?.bio || 'Share your thoughts with the world'}
            </p>
          </button>
        </div>

        {/* Quick Create Button */}
        <Button
          onClick={() => navigate('/create')}
          className="shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </div>
    </div>
  );
}
