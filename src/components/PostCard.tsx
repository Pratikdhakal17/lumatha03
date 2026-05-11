import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LazyImage } from '@/components/LazyImage';
import { Star, MoreVertical, Copy, Edit, Trash2, Heart, ChevronLeft, ChevronRight, Play, MessageCircle, Share2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { FullScreenMediaViewer } from '@/components/FullScreenMediaViewer';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PostCardProps {
  post: Post & { profiles?: Profile };
  isSaved: boolean;
  isLiked: boolean;
  likesCount: number;
  currentUserId: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Post>) => void;
  onOpenComments?: (id: string, title: string) => void;
}

export function PostCard({ post, isSaved, isLiked, likesCount, currentUserId, onToggleSave, onToggleLike, onDelete, onUpdate, onOpenComments }: PostCardProps) {
  const navigate = useNavigate();
  const [imageOpen, setImageOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showFullText, setShowFullText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  
  // Get all media URLs (support both single and multiple)
  const mediaUrls = post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []);
  const mediaTypes = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
  const hasMedia = mediaUrls.length > 0;
  const hasMultipleMedia = mediaUrls.length > 1;
  const currentMedia = mediaUrls[currentMediaIndex] || '/placeholder.svg';
  const currentMediaType = mediaTypes[currentMediaIndex] || 'image';
  
  const isOwner = currentUserId === post.user_id;
  const isLongText = (post.content?.length || 0) > 200;
  const isVideo = currentMediaType?.includes('video');

  const handleCopy = () => {
    navigator.clipboard.writeText(`${post.title}\n\n${post.content}\n\n- ${post.profiles?.name || 'Anonymous'}`);
    toast.success("Copied to clipboard!");
  };

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(post.id, { content: editContent });
      setIsEditing(false);
      toast.success("Post updated!");
    }
  };

  const nextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const prevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content || '',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied!");
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <Card className="group hover-lift glass-card overflow-hidden border-border h-full flex flex-col">
      {/* Media Section */}
      {hasMedia && (
        <div 
          className="relative cursor-pointer overflow-hidden"
          onClick={() => setImageOpen(true)}
        >
          {isVideo ? (
            <div className="relative aspect-video bg-black">
              <video 
                src={currentMedia} 
                className="w-full h-full object-contain"
                controls
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div className="relative">
              <LazyImage
                src={currentMedia}
                alt={post.title}
                className="w-full h-auto max-h-[500px] object-contain bg-black/5 transition-transform duration-500 group-hover:scale-[1.02]"
                aspectRatio="auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
            </div>
          )}
          
          {/* Multi-media navigation */}
          {hasMultipleMedia && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full"
                onClick={prevMedia}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full"
                onClick={nextMedia}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              
              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaUrls.map((_, idx) => (
                  <button
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentMediaIndex ? 'bg-primary w-4' : 'bg-white/60'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(idx); }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Video indicator */}
          {isVideo && (
            <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Play className="w-3 h-3" /> Video
            </div>
          )}
        </div>
      )}

      {/* Full Screen Media Viewer - Reference style with bottom actions */}
      <FullScreenMediaViewer
        open={imageOpen}
        onOpenChange={setImageOpen}
        mediaUrls={mediaUrls}
        mediaTypes={mediaTypes}
        initialIndex={currentMediaIndex}
        title={post.title}
        likesCount={likesCount}
        isLiked={isLiked}
        onLike={() => onToggleLike(post.id)}
        onComment={() => {
          setImageOpen(false);
          onOpenComments?.(post.id, post.title);
        }}
        onShare={handleShare}
      />

      <CardContent className="flex-1 flex flex-col p-4 space-y-3">
        {/* User info and actions */}
        <div className="flex items-start justify-between gap-2">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            <Avatar className="w-10 h-10 ring-2 ring-primary/20">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {post.profiles?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold">{post.profiles?.name || 'Anonymous'}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(post.created_at || '').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border-border">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </DropdownMenuItem>
              {isOwner && onUpdate && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isOwner && onDelete && (
                <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 flex-wrap">
          {post.category && (
            <Badge variant="secondary" className="capitalize">
              {post.category}
            </Badge>
          )}
          {post.subcategory && (
            <Badge variant="outline" className="capitalize text-xs">
              {post.subcategory}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg line-clamp-2">{post.title}</h3>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 rounded glass-card border-border min-h-[100px] text-sm bg-background text-foreground"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditContent(post.content || ''); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm flex-1">
            <p className={`text-foreground/90 whitespace-pre-wrap ${!showFullText && isLongText ? 'line-clamp-3' : ''}`}>
              {post.content}
            </p>
            {isLongText && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-primary text-xs mt-1 hover:underline font-medium"
              >
                {showFullText ? '↑ Show less' : '↓ See more'}
              </button>
            )}
          </div>
        )}

        {/* Action buttons - Facebook style */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleLike(post.id)}
            className={`flex-1 gap-2 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount > 0 ? likesCount : 'Like'}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenComments?.(post.id, post.title)}
            className="flex-1 gap-2 text-muted-foreground"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Comment</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex-1 gap-2 text-muted-foreground"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleSave(post.id)}
            className={isSaved ? 'text-primary' : 'text-muted-foreground'}
          >
            <Star className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
