import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editListing?: any;
  onSuccess: () => void;
}

export function MarketplaceCreateDialog({ open, onOpenChange, editListing, onSuccess }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(editListing?.type || 'sell');
  const [title, setTitle] = useState(editListing?.title || '');
  const [description, setDescription] = useState(editListing?.description || '');
  const [price, setPrice] = useState(editListing?.price?.toString() || '');
  const [location, setLocation] = useState(editListing?.location || '');
  const [category, setCategory] = useState(editListing?.category || '');
  const [qualification, setQualification] = useState(editListing?.qualification || '');
  const [salaryRange, setSalaryRange] = useState(editListing?.salary_range || '');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<string[]>(editListing?.media_urls || []);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(!!editListing?.location);
  const isEditing = !!editListing;

  useEffect(() => {
    if (editListing) {
      setType(editListing.type);
      setTitle(editListing.title);
      setDescription(editListing.description || '');
      setPrice(editListing.price?.toString() || '');
      setLocation(editListing.location || '');
      setCategory(editListing.category || '');
      setQualification(editListing.qualification || '');
      setSalaryRange(editListing.salary_range || '');
      setExistingMedia(editListing.media_urls || []);
      setLocationDetected(!!editListing.location);
    } else {
      setType('sell'); setTitle(''); setDescription(''); setPrice('');
      setLocation(''); setCategory(''); setQualification(''); setSalaryRange('');
      setExistingMedia([]);
      setLocationDetected(false);
    }
    setMediaFiles([]);
  }, [editListing, open]);

  // Auto-detect location on open for new listings
  useEffect(() => {
    if (open && !isEditing && !locationDetected) {
      detectLocation();
    }
  }, [open, isEditing]);

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`, { headers: { 'User-Agent': 'Lumatha/1.0' } });
      const data = await resp.json();
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      const state = data.address?.state || '';
      const country = data.address?.country || '';
      const parts = [city, state, country].filter(Boolean);
      setLocation(parts.join(', '));
      setLocationDetected(true);
    } catch {
      toast.error('Location access required to post listings. Please enable GPS.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (i: number) => setMediaFiles(prev => prev.filter((_, idx) => idx !== i));
  const removeExisting = (i: number) => setExistingMedia(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    if (!locationDetected || !location.trim()) {
      toast.error('Location is required. Please enable GPS to detect your location.');
      return;
    }
    setSaving(true);

    try {
      let mediaUrls = [...existingMedia];
      let mediaTypes: string[] = existingMedia.map(() => 'image');

      for (const file of mediaFiles) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('marketplace-media').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('marketplace-media').getPublicUrl(path);
        mediaUrls.push(publicUrl);
        mediaTypes.push(file.type.startsWith('video') ? 'video' : 'image');
      }

      if (isEditing) {
        await supabase.from('marketplace_listings').update({
          title: title.trim(),
          description: description.trim() || null,
          price: price ? parseFloat(price) : null,
          location: location.trim() || null,
          category: category.trim() || null,
          qualification: type === 'job' ? qualification.trim() || null : null,
          salary_range: type === 'job' ? salaryRange.trim() || null : null,
          ...(mediaFiles.length > 0 ? { media_urls: mediaUrls, media_types: mediaTypes } : {}),
        }).eq('id', editListing.id);
      } else {
        await supabase.from('marketplace_listings').insert({
          user_id: user.id,
          type,
          title: title.trim(),
          description: description.trim() || null,
          price: price ? parseFloat(price) : null,
          location: location.trim(),
          category: category.trim() || null,
          qualification: type === 'job' ? qualification.trim() || null : null,
          salary_range: type === 'job' ? salaryRange.trim() || null : null,
          media_urls: mediaUrls,
          media_types: mediaTypes,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Listing' : 'Create Listing'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType} disabled={isEditing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you listing?" />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={3} />
          </div>

          {(type === 'sell' || type === 'rent') && (
            <div>
              <Label className="text-xs">Price (NPR)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
          )}

          {type === 'job' && (
            <>
              <div>
                <Label className="text-xs">Qualification</Label>
                <Input value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. Bachelor's degree" />
              </div>
              <div>
                <Label className="text-xs">Salary Range</Label>
                <Input value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="e.g. 30k-50k/month" />
              </div>
            </>
          )}

          {/* Location - Auto-detected, read-only */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />Location *
              {!locationDetected && <span className="text-destructive text-[10px]">(GPS required)</span>}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input value={location} readOnly className="flex-1 bg-muted/30" placeholder="Detecting location..." />
                {locationDetected && <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="h-9 px-3 gap-1 shrink-0"
              >
                {detectingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                <span className="text-xs">{locationDetected ? 'Refresh' : 'Detect'}</span>
              </Button>
            </div>
            {!locationDetected && !detectingLocation && (
              <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />Enable location to post listings
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Electronics, Clothing" />
          </div>

          {!isEditing && (
            <div>
              <Label className="text-xs">Photos (up to 5)</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {existingMedia.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={() => removeExisting(i)} className="absolute top-0 right-0 bg-black/60 rounded-bl p-0.5"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
                {mediaFiles.map((f, i) => (
                  <div key={`new-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                    <button onClick={() => removeFile(i)} className="absolute top-0 right-0 bg-black/60 rounded-bl p-0.5"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
                {existingMedia.length + mediaFiles.length < 5 && (
                  <button onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors">
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={saving || !title.trim() || (!locationDetected && !isEditing)} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEditing ? 'Update' : 'Post Listing'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
