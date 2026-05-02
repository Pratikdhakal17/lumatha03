import { useState } from 'react';
import { Database } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/LazyImage';
import { Heart, MessageCircle, Share2, Star, Play, MoreVertical, X, ChevronLeft, ChevronRight, Copy, Trash2, Send, ThumbsUp } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type Post = Database['public']['Tables']['posts']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'];
type PostWithProfile = Post & { profiles?: Profile };
type CommentWithProfile = Comment & { profiles?: Profile };

interface FeedGridProps {
  posts: PostWithProfile[];
  savedPosts: Set<string>;
  likedPosts: Set<string>;
  likeCounts: Record<string, number>;
  currentUserId: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (post: PostWithProfile) => void;
  viewMode?: 'mixed' | 'photos' | 'videos';
}

export function FeedGrid({ 
  posts, 
  savedPosts, 
  likedPosts, 
  likeCounts, 
  currentUserId, 
  onToggleSave, 
  onToggleLike, 
  onDelete,
  onShare,
  viewMode = 'mixed'
}: FeedGridProps) {
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [userCommentCounts, setUserCommentCounts] = useState<Record<string, number>>({});
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Filter posts by view mode
  const filteredPosts = posts.filter(post => {
    const mediaTypes = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
    const hasVideo = mediaTypes.some(t => t?.includes('video'));
    const hasImage = mediaTypes.some(t => t?.includes('image'));
    
    if (viewMode === 'photos') return hasImage && !hasVideo;
    if (viewMode === 'videos') return hasVideo;
    return true;
  });

  const handleShare = async (post: PostWithProfile) => {
    if (onShare) {
      onShare(post);
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.content || '', url: window.location.href });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied!");
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const getMediaInfo = (post: PostWithProfile) => {
    const urls = post.media_urls?.length ? post.media_urls : (post.file_url ? [post.file_url] : []);
    const types = post.media_types?.length ? post.media_types : (post.file_type ? [post.file_type] : []);
    return { urls, types, hasMedia: urls.length > 0, hasMultiple: urls.length > 1 };
  };

  // Fetch comments for a post
  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id)
        }));
        
        setComments(commentsWithProfiles);
      } else {
        setComments([]);
      }
      
      const userCount = (commentsData || []).filter(c => c.user_id === currentUserId).length;
      setUserCommentCounts(prev => ({ ...prev, [postId]: userCount }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Add comment (max 2 per user per post)
  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;
    
    const { data: existingComments } = await supabase
      .from('comments')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId);
    
    if (existingComments && existingComments.length >= 2) {
      toast.error('Maximum 2 comments per post allowed');
      return;
    }
    
    try {
      await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: newComment.trim()
      });
      
      setNewComment('');
      setReplyTo(null);
      fetchComments(postId);
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const toggleCommentLike = (commentId: string) => {
    setCommentLikes(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const openComments = (postId: string) => {
    setShowComments(postId);
    fetchComments(postId);
  };

  return (
    <>
      {/* Single column on mobile for proper scrolling */}
      <div className="flex flex-col gap-4">
        {filteredPosts.map((post, index) => {
          const { urls, types, hasMedia, hasMultiple } = getMediaInfo(post);
          const currentUrl = urls[0] || '/placeholder.svg';
          const isVideo = types[0]?.includes('video');
          const isLiked = likedPosts.has(post.id);
          const isSaved = savedPosts.has(post.id);
          const isOwner = currentUserId === post.user_id;

          return (
            <Card 
              key={post.id} 
              className="overflow-hidden glass-card border-border group cursor-pointer transition-all duration-300 hover:shadow-xl animate-fade-in w-full"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Media - Proper sizing */}
              {hasMedia && (
                <div 
                  className="relative overflow-hidden"
                  onClick={() => { setSelectedPost(post); setCurrentMediaIndex(0); }}
                >
                  {isVideo ? (
                    <div className="relative aspect-video bg-black max-h-96">
                      <video src={currentUrl} className="w-full h-full object-contain" preload="metadata" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-300 group-hover:bg-black/40">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110">
                          <Play className="w-6 h-6 text-primary ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-hidden">
                      <LazyImage
                        src={currentUrl}
                        alt={post.title}
                        className="w-full object-contain max-h-96 transition-transform duration-500 group-hover:scale-105"
                        aspectRatio="auto"
                      />
                    </div>
                  )}
                  
                  {/* Overlay badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {hasMultiple && (
                      <Badge variant="secondary" className="bg-black/60 text-white text-[10px] px-1.5 animate-pulse">
                        +{urls.length - 1}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* User */}
                <div className="flex items-center gap-3">
                  <Avatar 
                    className="w-10 h-10 cursor-pointer ring-2 ring-transparent transition-all duration-300 hover:ring-primary"
                    onClick={() => navigate(`/profile/${post.user_id}`)}
                  >
                    <AvatarImage src={post.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-sm">
                      {post.profiles?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{post.profiles?.name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.created_at && new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {isOwner && onDelete && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card animate-scale-in">
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(`${post.title}\n${post.content}`);
                          toast.success("Copied!");
                        }}>
                          <Copy className="w-3 h-3 mr-2" /> Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                          <Trash2 className="w-3 h-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Title & Content */}
                <div>
                  <h3 className="font-semibold text-base">{post.title}</h3>
                  {post.content && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{post.content}</p>
                  )}
                </div>

                {/* Actions - Full width like Facebook */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
                    className={cn(
                      "flex-1 h-10 gap-2 transition-all duration-300",
                      isLiked && "text-red-500"
                    )}
                  >
                    <Heart className={cn("w-5 h-5 transition-transform", isLiked && "fill-current animate-bounce")} />
                    <span>{likeCounts[post.id] || ''}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 h-10 gap-2 transition-all duration-300 hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); openComments(post.id); }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{commentCounts[post.id] || ''}</span>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 h-10 gap-2 transition-all duration-300 hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); handleShare(post); }}
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onToggleSave(post.id); }}
                    className={cn(
                      "flex-1 h-10 gap-2 transition-all duration-300",
                      isSaved && "text-primary"
                    )}
                  >
                    <Star className={cn("w-5 h-5 transition-transform", isSaved && "fill-current")} />
                    <span>Save</span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Comments Dialog - Full width like Facebook */}
      <Dialog open={!!showComments} onOpenChange={() => { setShowComments(null); setReplyTo(null); }}>
        <DialogContent className="max-w-lg w-[95vw] glass-card animate-scale-in max-h-[90vh] flex flex-col p-0">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="font-semibold text-lg">Comments</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowComments(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {loadingComments ? (
              <p className="text-center text-muted-foreground py-8 animate-pulse">Loading...</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <div 
                    key={comment.id} 
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex gap-3">
                      <Avatar 
                        className="w-10 h-10 cursor-pointer"
                        onClick={() => navigate(`/profile/${comment.user_id}`)}
                      >
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-sm">
                          {comment.profiles?.name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted/50 rounded-2xl p-3">
                          <p 
                            className="text-sm font-medium cursor-pointer hover:underline"
                            onClick={() => navigate(`/profile/${comment.user_id}`)}
                          >
                            {comment.profiles?.name || 'Anonymous'}
                          </p>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                        {/* Comment actions */}
                        <div className="flex items-center gap-4 mt-1 ml-3">
                          <button 
                            className={cn(
                              "text-xs font-medium transition-colors",
                              commentLikes.has(comment.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => toggleCommentLike(comment.id)}
                          >
                            Like
                          </button>
                          <button 
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setReplyTo(comment.id)}
                          >
                            Reply
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {comment.created_at && new Date(comment.created_at).toLocaleDateString()}
                          </span>
                          {commentLikes.has(comment.id) && (
                            <span className="text-xs flex items-center gap-1 text-primary">
                              <ThumbsUp className="w-3 h-3" /> 1
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {/* Comment input - Full width */}
          <div className="p-4 border-t border-border/50">
            {showComments && (userCommentCounts[showComments] || 0) >= 2 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                You've reached the maximum of 2 comments on this post
              </p>
            ) : (
              <div className="flex gap-3 items-center">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-primary/20">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Input
                    placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="pr-12 rounded-full bg-muted/50 border-0"
                    onKeyPress={(e) => e.key === 'Enter' && showComments && handleAddComment(showComments)}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => showComments && handleAddComment(showComments)} 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 transition-transform hover:scale-110"
                    disabled={!newComment.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Media Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none animate-scale-in">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full transition-transform hover:scale-110"
            onClick={() => setSelectedPost(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          
          {selectedPost && (() => {
            const { urls, types } = getMediaInfo(selectedPost);
            const currentUrl = urls[currentMediaIndex] || '/placeholder.svg';
            const isVideo = types[currentMediaIndex]?.includes('video');
            
            return (
              <div className="relative flex items-center justify-center min-h-[60vh]">
                {isVideo ? (
                  <video src={currentUrl} className="max-w-full max-h-[85vh] object-contain" controls autoPlay />
                ) : (
                  <img src={currentUrl} alt="" className="max-w-full max-h-[85vh] object-contain animate-fade-in" />
                )}
                
                {urls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 bg-white/20 hover:bg-white/40 text-white rounded-full transition-transform hover:scale-110"
                      onClick={() => setCurrentMediaIndex((prev) => (prev - 1 + urls.length) % urls.length)}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 bg-white/20 hover:bg-white/40 text-white rounded-full transition-transform hover:scale-110"
                      onClick={() => setCurrentMediaIndex((prev) => (prev + 1) % urls.length)}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {urls.map((_, i) => (
                        <button
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            i === currentMediaIndex ? "bg-white scale-125" : "bg-white/50"
                          )}
                          onClick={() => setCurrentMediaIndex(i)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}