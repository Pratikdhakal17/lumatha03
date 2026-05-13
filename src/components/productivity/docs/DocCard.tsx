import React, { useState, useEffect, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Heart, MessageCircle, Bookmark, Share2, MoreVertical, 
  ExternalLink, Download, Edit, Trash2, FolderPlus 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { openDocumentTarget } from './docTools';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Document = Database['public']['Tables']['documents']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type DocumentWithProfile = Document & { profiles?: Profile };

interface DocCardProps {
  doc: DocumentWithProfile;
  isOwner?: boolean;
  isSaved?: boolean;
  currentUserName?: string;
  onOpen: () => void;
  onOpenInBrowser: () => void;
  onDownload: () => void;
  onRename?: () => void;
  onMoveToFolder?: () => void;
  onDelete?: () => void;
  onSave: () => void;
  onOpenComments: () => void;
}

const FILE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pdf: { label: 'PDF', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
  doc: { label: 'DOC', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  docx: { label: 'DOCX', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  ppt: { label: 'PPT', bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  pptx: { label: 'PPTX', bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  xls: { label: 'XLS', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  xlsx: { label: 'XLSX', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  txt: { label: 'TXT', bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' },
};

export const getFileBadge = (type?: string | null) => {
  const ext = type?.toLowerCase() || 'txt';
  return FILE_BADGES[ext] || FILE_BADGES.txt;
};

function DocCardComponent({
  doc, isOwner, isSaved, currentUserName,
  onOpen, onOpenInBrowser, onDownload, onRename, onMoveToFolder, onDelete,
  onSave, onOpenComments
}: DocCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReactions();
  }, [user, doc.id]);

  const fetchReactions = async () => {
    const { data: likes } = await supabase.from('document_reactions').select('id').eq('document_id', doc.id).eq('reaction', 'heart');
    const { data: userLike } = await supabase.from('document_reactions').select('id').eq('document_id', doc.id).eq('user_id', user?.id).eq('reaction', 'heart').maybeSingle();
    const { count: comments } = await supabase.from('comments').select('id', { count: 'exact' }).eq('document_id', doc.id);

    setLikesCount(likes?.length || 0);
    setIsLiked(!!userLike);
    setCommentsCount(comments || 0);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      if (isLiked) {
        await supabase.from('document_reactions').delete().eq('document_id', doc.id).eq('user_id', user.id).eq('reaction', 'heart');
        setLikesCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await supabase.from('document_reactions').insert({ document_id: doc.id, user_id: user.id, reaction: 'heart' });
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (err) {}
  };

  const badge = getFileBadge(doc.file_type);
  const uploaderName = doc.profiles?.name || 'Explorer';

  return (
    <div className="w-full bg-gradient-to-br from-[#09111f] via-[#0b1627] to-[#0f1b2e] border-y border-[#1d2a40] md:border md:rounded-2xl overflow-hidden group hover:border-[#35527c] transition-all relative shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      {/* Three dots menu in top right */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-full hover:bg-white/10 text-slate-300 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#08111f] border-[#23324a] rounded-2xl p-2 shadow-2xl min-w-[250px] space-y-1 text-[#eaf3ff]">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }} className="rounded-xl gap-2 py-2.5">
              <ExternalLink className="w-4 h-4" /> <span>Open</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenInBrowser(); }} className="rounded-xl gap-2 py-2.5">
              <ExternalLink className="w-4 h-4" /> <span>Open in Browser</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDocumentTarget(doc.file_url, 'drive'); }} className="rounded-xl gap-2 py-2.5">
              <ExternalLink className="w-4 h-4" /> <span>Open in Drive</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDocumentTarget(doc.file_url, 'word'); }} className="rounded-xl gap-2 py-2.5">
              <ExternalLink className="w-4 h-4" /> <span>Open in Microsoft Word</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDocumentTarget(doc.file_url, 'powerpoint'); }} className="rounded-xl gap-2 py-2.5">
              <ExternalLink className="w-4 h-4" /> <span>Open in PowerPoint</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDocumentTarget(doc.file_url, 'wps'); }} className="rounded-xl gap-2 py-2.5">
              <ExternalLink className="w-4 h-4" /> <span>Open in WPS</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }} className="rounded-xl gap-2 py-2.5">
              <Download className="w-4 h-4" /> <span>Download</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10 my-1" />
            {isOwner && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename?.(); }} className="rounded-xl gap-2 py-2.5">
                  <Edit className="w-4 h-4" /> <span>Edit Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder?.(); }} className="rounded-xl gap-2 py-2.5">
                  <FolderPlus className="w-4 h-4" /> <span>Move to Folder</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="rounded-xl gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10 py-2.5">
                  <Trash2 className="w-4 h-4" /> <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex p-3 sm:p-4 gap-4 cursor-pointer" onClick={onOpen}>
        {/* Left: Cover Pic - Optimized for smooth rendering */}
        <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-[#26384f] bg-[#08111f] flex items-center justify-center relative shadow-xl">
          {doc.cover_url && !imageError ? (
            <>
              {!imageLoaded && (
                <div className={cn("text-center p-2", badge.text)}>
                  <span className="text-lg block mb-1 opacity-40">📄</span>
                </div>
              )}
              <img
                src={doc.cover_url}
                className={cn("w-full h-full object-cover transition-opacity duration-300", imageLoaded ? "opacity-100" : "opacity-0")}
                alt=""
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div className={cn("text-center p-2", badge.text)}>
              <span className="text-lg block mb-1 opacity-40">📄</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{badge.label}</span>
            </div>
          )}
        </div>

        {/* Right: Info - Full Space Utilization */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="pr-6"> {/* Leave space for three dots */}
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar className="w-5 h-5 ring-1 ring-white/10 border border-white/5">
                <AvatarImage src={doc.profiles?.avatar_url || ''} />
                <AvatarFallback className="text-[7px] bg-primary/20 text-primary font-black uppercase">{uploaderName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-black text-[#8fa4c4] uppercase tracking-widest truncate">{uploaderName}</span>
            </div>
            <h3 className="text-base font-black text-[#f1f7ff] line-clamp-2 leading-tight font-['Space_Grotesk'] mb-1">{doc.title}</h3>
            {doc.description && (
              <p className="text-[12px] text-[#8fa4c4] line-clamp-2 leading-snug font-medium">"{doc.description}"</p>
            )}
          </div>

          {/* Social Row - Compact and Left Aligned */}
          <div className="flex items-center gap-4 mt-3">
            <button onClick={handleLike} className={cn("flex items-center gap-1.5 transition-all active:scale-90 touch-manipulation", isLiked ? "text-red-500" : "text-slate-500")}>
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span className="text-[10px] font-black">{likesCount > 0 ? likesCount : ''}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onOpenComments(); }} className="flex items-center gap-1.5 text-[#8fa4c4] transition-all active:scale-90 touch-manipulation">
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px] font-black">{commentsCount > 0 ? commentsCount : ''}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onSave(); }} className={cn("flex items-center gap-1.5 transition-all active:scale-90 touch-manipulation", isSaved ? "text-primary" : "text-[#8fa4c4]") }>
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (navigator.share) {
                    await navigator.share({ title: doc.title, url: doc.file_url });
                    return;
                  }
                  await navigator.clipboard.writeText(doc.file_url);
                  toast.success('Document link copied');
                } catch {
                  toast.error('Unable to share document');
                }
              }}
              className="text-[#8fa4c4] touch-manipulation hover:text-white"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DocCard = memo(DocCardComponent);
