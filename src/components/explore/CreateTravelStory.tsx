import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, MapPin, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateTravelStoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    location: string;
    photos: string[];
  }) => Promise<boolean>;
}

const buildUploadPath = (userId: string, file: File) => {
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const token = Math.random().toString(36).slice(2, 10);
  return `${userId}/travel-${Date.now()}-${token}.${extension}`;
};

export function CreateTravelStory({ open, onOpenChange, onSubmit }: CreateTravelStoryProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setPhotos([]);
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user?.id) return;

    setUploading(true);
    try {
      const selectedFiles = Array.from(files).slice(0, 8);
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) continue;

        const path = buildUploadPath(user.id, file);
        const { error: uploadError } = await supabase.storage
          .from('posts-media')
          .upload(path, file, { contentType: file.type, cacheControl: '31536000' });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('posts-media').getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 8));
        toast.success('Photos uploaded');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    if (!user?.id) {
      toast.error('Please sign in to publish a story');
      return;
    }

    if (photos.length === 0) {
      toast.warning('Tip: Adding at least one photo makes your story more engaging');
    }

    setSubmitting(true);
    try {
      const success = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        photos,
      });
      setSubmitting(false);

      if (success) {
        toast.success('✓ Travel story published!');
        resetForm();
        onOpenChange(false);
      } else {
        toast.error('Failed to publish story. Please check console for details.');
      }
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : 'Failed to publish story';
      console.error('Story submission error:', error);
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border/50 bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Share Travel Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A short title for your journey"
              className="bg-background/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell everyone about your experience"
              rows={5}
              className="bg-background/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Location</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, Country"
                className="bg-background/60 pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Photos</label>
              <span className="text-xs text-muted-foreground">{photos.length}/8</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void uploadPhotos(event.target.files);
              }}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              disabled={uploading || photos.length >= 8}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Add Photos
            </Button>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((photo, index) => (
                  <div key={photo} className="relative overflow-hidden rounded-lg border border-border/50">
                    <img src={photo} alt={`Travel story ${index + 1}`} className="h-20 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                      onClick={() => setPhotos((prev) => prev.filter((item) => item !== photo))}
                      aria-label="Remove photo"
                    >
                      <Plus className="h-3 w-3 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || uploading}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
