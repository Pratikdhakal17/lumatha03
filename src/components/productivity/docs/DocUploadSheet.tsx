import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { Upload, Loader2, Lock, Globe, X, Camera, FileText, ArrowLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (uploadedDoc?: any) => void;
}

export function DocUploadSheet({ open, onOpenChange, onUploaded }: DocUploadSheetProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('public');
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setCoverFile(f);
      setCoverPreview(URL.createObjectURL(f));
    }
  };

  const wordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (wordCount(val) <= 133 || val.length < description.length) {
      setDescription(val);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !user) return;
    setUploading(true);

    try {
      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverName = `${user.id}/covers/${Date.now()}.${coverExt}`;
        const { error: coverError } = await supabase.storage.from('documents').upload(coverName, coverFile);
        if (!coverError) {
          coverUrl = getPublicUrlSafe('documents', coverName) ?? null;
        }
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('documents').upload(fileName, file);
      if (error) throw error;
      const publicUrl = getPublicUrlSafe('documents', fileName) ?? '';

      const insertPayload = {
        user_id: user.id, title, description,
        file_url: publicUrl, file_name: file.name, file_type: fileExt, visibility,
        cover_url: coverUrl,
      };

      let insertedDoc: any = null;
      let insertError: any = null;

      ({ data: insertedDoc, error: insertError } = await supabase
        .from('documents')
        .insert(insertPayload)
        .select('*')
        .single());

      if (insertError) {
        const message = String(insertError?.message || '').toLowerCase();
        const details = String(insertError?.details || '').toLowerCase();
        const missingCoverColumn = message.includes('cover_url') || details.includes('cover_url');

        // Some deployments have stale schema cache: retry without cover_url so upload still succeeds.
        if (missingCoverColumn) {
          const { cover_url: _ignoredCoverUrl, ...fallbackPayload } = insertPayload as any;
          const fallbackResult = await supabase
            .from('documents')
            .insert(fallbackPayload)
            .select('*')
            .single();
          insertedDoc = fallbackResult.data;
          insertError = fallbackResult.error;
        }
      }

      if (insertError) throw insertError;

      toast.success('Uploaded!');
      onOpenChange(false);
      onUploaded(insertedDoc);
      // Reset
      setFile(null); setTitle(''); setDescription(''); setCoverFile(null); setCoverPreview(null);
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0a0f1e] border-t border-white/5 rounded-t-[32px] h-[95vh] overflow-y-auto pb-10 no-scrollbar p-0">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 sticky top-0 bg-[#0a0f1e]/80 backdrop-blur-xl z-10 border-b border-white/5">
          <button onClick={() => onOpenChange(false)} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <SheetTitle className="text-white font-bold text-lg">New Document</SheetTitle>
        </div>

        <div className="max-w-2xl mx-auto space-y-8 px-6 pt-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Title</label>
            <Input
              placeholder="Give your document a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-0 border-b border-slate-800 text-white rounded-none px-0 h-12 focus-visible:ring-0 focus-visible:border-primary text-xl font-bold placeholder:text-slate-700"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</label>
              <span className={`text-[10px] font-bold ${wordCount(description) >= 133 ? 'text-orange-500' : 'text-slate-600'}`}>
                {wordCount(description)}/133 words
              </span>
            </div>
            <Textarea
              placeholder="What makes this document useful?"
              value={description}
              onChange={handleDescriptionChange}
              className="bg-slate-900/30 border-slate-800 text-white rounded-2xl min-h-[100px] resize-none pt-4 px-4 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Document File - Reduced Size */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Document</label>
            {!file ? (
              <label className="block cursor-pointer group">
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={handleFileSelect} />
                <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center group-hover:border-primary/50 bg-slate-900/20 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-white text-xs font-bold">Choose File</p>
                </div>
              </label>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{file.name}</p>
                  <p className="text-slate-500 text-[10px]">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <button className="p-2 text-slate-500" onClick={() => setFile(null)}><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          {/* Professional Privacy Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <span className="text-[13px] font-bold text-slate-300">Privacy</span>
              <button 
                onClick={() => setShowPrivacyOptions(!showPrivacyOptions)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 transition-all active:scale-95"
              >
                {visibility === 'public' ? (
                  <><Globe className="w-4 h-4" /><span className="text-xs font-black uppercase">Public ^</span></>
                ) : (
                  <><Lock className="w-4 h-4" /><span className="text-xs font-black uppercase">Private ^</span></>
                )}
              </button>
            </div>
            
            {showPrivacyOptions && (
              <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => { setVisibility('public'); setShowPrivacyOptions(false); }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                    visibility === 'public' ? "bg-primary/10 border-primary text-white" : "bg-slate-900/20 border-slate-800 text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest">Public</p>
                      <p className="text-[10px] font-medium opacity-60">Visible to everyone in community</p>
                    </div>
                  </div>
                  {visibility === 'public' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </button>
                <button
                  onClick={() => { setVisibility('private'); setShowPrivacyOptions(false); }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                    visibility === 'private' ? "bg-orange-500/10 border-orange-500 text-white" : "bg-slate-900/20 border-slate-800 text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest">Private</p>
                      <p className="text-[10px] font-medium opacity-60">Only you can access this</p>
                    </div>
                  </div>
                  {visibility === 'private' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                </button>
              </div>
            )}
          </div>

          {/* Cover Page - Reduced Size */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Cover Image</label>
            <div 
              onClick={() => coverInputRef.current?.click()}
              className="relative aspect-video max-w-sm rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/40 transition-colors overflow-hidden group"
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-slate-600 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Add Cover</span>
                </>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
            </div>
          </div>

          {/* Action */}
          <div className="pt-6">
            <Button
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              onClick={handleUpload}
              disabled={uploading || !file || !title.trim()}
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Confirm & Publish'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
