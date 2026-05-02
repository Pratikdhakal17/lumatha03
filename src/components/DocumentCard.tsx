import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Heart, MessageCircle, Share2, MoreVertical, Download, ExternalLink, Edit, Trash2, Lock, Globe, BookOpen, Bookmark } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Document = Database['public']['Tables']['documents']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type DocumentWithProfile = Document & { profiles?: Profile };

interface DocumentCardProps {
  doc: DocumentWithProfile;
  onDelete: (docId: string, fileUrl: string) => void;
  onDownload: (fileUrl: string, fileName: string) => void;
  onOpenInBrowser: (fileUrl: string) => void;
  onRefresh: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export default function DocumentCard({ doc, onDelete, onDownload, onOpenInBrowser, onRefresh, onSave, isSaved }: DocumentCardProps) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isOwner = currentUser?.id === doc.user_id;
  
  const [loved, setLoved] = useState(false);
  const [loveCount, setLoveCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(doc.title);
  const [editDescription, setEditDescription] = useState(doc.description || '');

  // Fetch reactions on mount
  useEffect(() => {
    fetchReactions();
  }, [doc.id, currentUser?.id]);

  const fetchReactions = async () => {
    try {
      // Get reaction count
      const { count } = await supabase
        .from('document_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', doc.id);
      
      setLoveCount(count || 0);

      // Check if current user has reacted
      if (currentUser?.id) {
        const { data } = await supabase
          .from('document_reactions')
          .select('id')
          .eq('document_id', doc.id)
          .eq('user_id', currentUser.id)
          .maybeSingle();
        
        setLoved(!!data);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleLove = async () => {
    if (!currentUser) {
      toast.error('Please login to react');
      return;
    }
    
    try {
      if (loved) {
        await supabase
          .from('document_reactions')
          .delete()
          .eq('document_id', doc.id)
          .eq('user_id', currentUser.id);
        setLoved(false);
        setLoveCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('document_reactions')
          .insert({ document_id: doc.id, user_id: currentUser.id, reaction: 'love' });
        setLoved(true);
        setLoveCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to update reaction');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: doc.title,
        text: doc.description || 'Check out this document',
        url: doc.file_url
      });
    } catch {
      await navigator.clipboard.writeText(doc.file_url);
      toast.success('Link copied!');
    }
  };

  // Fixed download function using fetch and blob
  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      toast.info('Starting download...');
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Try opening in browser first.');
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('document_id', doc.id)
      .order('created_at', { ascending: true });
    
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, username, name, username').in('id', userIds);
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setComments(data.map(c => ({ ...c, profile: profilesMap.get(c.user_id) })));
    }
    setShowComments(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      toast.error('Please login to comment');
      return;
    }
    
    try {
      const { error } = await supabase.from('comments').insert({
        user_id: currentUser.id,
        document_id: doc.id,
        content: newComment
      });
      
      if (error) {
        console.error('Comment insert error:', error);
        throw error;
      }
      
      setNewComment('');
      loadComments();
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    loadComments();
  };

  const handleEditDocument = async () => {
    await supabase.from('documents').update({ title: editTitle, description: editDescription }).eq('id', doc.id);
    toast.success('Updated!');
    setEditDialogOpen(false);
    onRefresh();
  };

  return (
    <>
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-2.5 space-y-2">
          {/* User info row */}
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80" 
              onClick={() => navigate(`/profile/${doc.user_id}`)}
            >
              <Avatar className="w-7 h-7">
                <AvatarImage src={doc.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-[10px]">
                  {doc.profiles?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate">{(doc.profiles as any)?.username || (doc.profiles as any)?.name || (doc.profiles as any)?.username || doc.profiles?.name || 'User'}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge variant={doc.visibility === 'public' ? 'default' : 'secondary'} className="text-[8px] h-4 px-1">
                {doc.visibility === 'public' ? <Globe className="w-2 h-2 mr-0.5" /> : <Lock className="w-2 h-2 mr-0.5" />}
                {doc.visibility}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-7 w-7 border-primary/50 bg-primary/10 hover:bg-primary/20 shadow-[0_0_8px_2px_hsl(var(--primary)/0.3)]"
                  >
                    <MoreVertical className="w-4 h-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 glass-card">
                  <DropdownMenuItem onClick={async () => {
                    const fileType = doc.file_type?.toLowerCase() || '';
                    const fileName = doc.file_name.toLowerCase();
                    
                    // For images, open directly
                    if (fileType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)) {
                      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
                      toast.success('Opening image...');
                      return;
                    }
                    
                    // For PDFs - try native browser PDF viewer first
                    if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
                      // Open PDF directly - most modern browsers have built-in PDF viewers
                      const newWindow = window.open(doc.file_url, '_blank', 'noopener,noreferrer');
                      if (newWindow) {
                        toast.success('Opening PDF...');
                      } else {
                        // Fallback to Google Docs Viewer
                        const encodedUrl = encodeURIComponent(doc.file_url);
                        window.open(`https://docs.google.com/gview?url=${encodedUrl}&embedded=true`, '_blank', 'noopener,noreferrer');
                        toast.success('Opening PDF in viewer...');
                      }
                      return;
                    }
                    
                    // For text files, open directly
                    if (fileType.includes('text') || fileName.match(/\.(txt|md|csv|json|xml|html|css|js|ts)$/i)) {
                      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
                      toast.success('Opening file...');
                      return;
                    }
                    
                    // For Office documents (Word, Excel, PowerPoint)
                    const isWord = fileType.includes('word') || fileType.includes('document') || fileName.match(/\.(doc|docx|odt)$/i);
                    const isExcel = fileType.includes('excel') || fileType.includes('spreadsheet') || fileName.match(/\.(xls|xlsx|ods)$/i);
                    const isPowerPoint = fileType.includes('powerpoint') || fileType.includes('presentation') || fileName.match(/\.(ppt|pptx|odp)$/i);
                    
                    if (isWord || isExcel || isPowerPoint) {
                      const encodedUrl = encodeURIComponent(doc.file_url);
                      // Use Office Online Viewer for Microsoft formats
                      window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`, '_blank', 'noopener,noreferrer');
                      toast.success(`Opening ${isWord ? 'document' : isExcel ? 'spreadsheet' : 'presentation'}...`);
                      return;
                    }
                    
                    // For audio/video, open directly
                    if (fileType.includes('audio') || fileType.includes('video') || fileName.match(/\.(mp3|mp4|wav|ogg|webm|m4a|mov|avi)$/i)) {
                      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
                      toast.success('Opening media file...');
                      return;
                    }
                    
                    // Fallback: try Google Docs Viewer for unknown document types
                    const encodedUrl = encodeURIComponent(doc.file_url);
                    window.open(`https://docs.google.com/gview?url=${encodedUrl}&embedded=true`, '_blank', 'noopener,noreferrer');
                    toast.success('Opening in document viewer...');
                  }}>
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />Open in Browser
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadFile(doc.file_url, doc.file_name)}>
                    <Download className="w-3.5 h-3.5 mr-2" />Download
                  </DropdownMenuItem>
                  {onSave && (
                    <DropdownMenuItem onClick={onSave}>
                      <Bookmark className={`w-3.5 h-3.5 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                      {isSaved ? 'Unsave' : 'Save'}
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => { setEditTitle(doc.title); setEditDescription(doc.description || ''); setEditDialogOpen(true); }}>
                        <Edit className="w-3.5 h-3.5 mr-2" />Edit Document
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(doc.id, doc.file_url)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Document info and Cover Image */}
          <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-lg overflow-hidden group/card relative">
            {doc.cover_url ? (
              <div className="relative aspect-[16/9] w-full rounded-md overflow-hidden bg-black/20">
                <img 
                  src={doc.cover_url} 
                  alt={doc.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-xs truncate">{doc.title}</h3>
                  <p className="text-[9px] text-muted-foreground truncate">{doc.file_name}</p>
                </div>
              </div>
            )}
            
            {doc.cover_url && (
              <div className="min-w-0">
                <h3 className="font-medium text-xs truncate">{doc.title}</h3>
                {doc.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{doc.description}</p>
                )}
                <p className="text-[9px] text-muted-foreground mt-0.5">{doc.file_name}</p>
              </div>
            )}

            {/* Direct Delete Button for Owner - visible on hover */}
            {isOwner && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id, doc.file_url);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Social actions */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-7 text-[10px] gap-1 ${loved ? 'text-red-500' : ''}`}
              onClick={handleLove}
            >
              <Heart className={`w-3.5 h-3.5 ${loved ? 'fill-current' : ''}`} />
              {loveCount > 0 && loveCount}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] gap-1"
              onClick={loadComments}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Comment
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] gap-1"
              onClick={handleShare}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="glass-card max-w-md mx-4 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Comments</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 p-2 bg-muted/30 rounded-lg">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={comment.profile?.avatar_url} />
                    <AvatarFallback className="text-[9px]">{comment.profile?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium">{(comment.profile as any)?.username || (comment.profile as any)?.name || (comment.profile as any)?.username || comment.profile?.name || 'User'}</p>
                      {comment.user_id === currentUser?.id && (
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleDeleteComment(comment.id)}>
                          <Trash2 className="w-2.5 h-2.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px]">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex gap-2 pt-2 border-t">
            <Input 
              placeholder="Add a comment..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 h-8 text-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <Button size="sm" className="h-8" onClick={handleAddComment}>Send</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-card max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px]">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Description</Label>
              <Textarea 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                className="glass-card text-xs min-h-[80px]"
                placeholder="Add a description..."
              />
            </div>
            <Button onClick={handleEditDocument} className="w-full h-8 text-xs">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
