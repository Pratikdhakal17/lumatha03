import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ListingTypeSelector } from './ListingTypeSelector';
import { SellForm } from './forms/SellForm';
import { BuyForm } from './forms/BuyForm';
import { RentForm } from './forms/RentForm';
import { JobForm } from './forms/JobForm';
import { ApplyForm } from './forms/ApplyForm';
import { ServiceForm } from './forms/ServiceForm';

interface Props {
  editListing?: any;
  defaultDetectedLocation?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateListingSheet({ editListing, defaultDetectedLocation, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<string | null>(editListing?.type || null);
  const [formData, setFormData] = useState<any>(editListing || {
    location: defaultDetectedLocation || '',
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<string[]>(editListing?.media_urls || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editListing) {
      setType(editListing.type);
      setFormData(editListing);
      setExistingMedia(editListing.media_urls || []);
    }
  }, [editListing]);

  const handleSubmit = async () => {
    if (!user || !formData.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.location?.trim()) {
      toast.error('Location is required');
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

      // Standard columns in the DB
      const standardColumns = [
        'title', 'description', 'price', 'location', 'category', 'type', 
        'condition', 'negotiable', 'qualification', 'salary_range', 
        'media_urls', 'media_types', 'user_id', 'status'
      ];

      const payload: any = {
        user_id: user.id,
        type,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        location: formData.location.trim(),
        category: formData.category || null,
        condition: formData.condition || null,
        negotiable: !!formData.negotiable,
        payment_methods: formData.paymentMethods || ['💵 Cash'],
        media_urls: mediaUrls,
        media_types: mediaTypes,
        extra_data: {}
      };

      // Map specialized fields to extra_data or specific columns
      Object.keys(formData).forEach(key => {
        if (!standardColumns.includes(key) && key !== 'paymentMethods') {
          // If it's a known specialized column in DB, use it
          if (key === 'qualification') payload.qualification = formData[key];
          else if (key === 'salary_range') payload.salary_range = formData[key];
          // Otherwise put in extra_data
          else payload.extra_data[key] = formData[key];
        }
      });

      if (editListing) {
        const { error } = await supabase
          .from('marketplace_listings')
          .update(payload)
          .eq('id', editListing.id);
        if (error) throw error;
        toast.success('Listing updated!');
      } else {
        const { error } = await supabase
          .from('marketplace_listings')
          .insert(payload);
        if (error) throw error;
        toast.success('Listing posted successfully!');
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => {
    const props = {
      data: formData,
      onChange: setFormData,
      files: mediaFiles,
      existingUrls: existingMedia,
      onFilesChange: setMediaFiles,
      onRemoveExisting: (i: number) => setExistingMedia(prev => prev.filter((_, idx) => idx !== i)),
    };

    switch (type) {
      case 'sell': return <SellForm {...props} />;
      case 'buy': return <BuyForm data={formData} onChange={setFormData} />;
      case 'rent': return <RentForm {...props} />;
      case 'job': return <JobForm data={formData} onChange={setFormData} />;
      case 'apply': return <ApplyForm {...props} profileName={user?.user_metadata?.name} />;
      case 'service': return <ServiceForm {...props} />;
      default: return null;
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[92vh] p-0 border-0 flex flex-col bg-[#0B0D1F] rounded-t-[32px] overflow-hidden [&>button]:hidden"
      >
        <SheetHeader className="px-4 py-3 border-b border-white/5 flex-shrink-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {type && !editListing && (
              <button onClick={() => setType(null)} className="p-1 text-slate-400">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <SheetTitle className="text-[17px] font-bold text-white">
              {editListing ? 'Edit Listing' : type ? 'Details' : 'Create Listing'}
            </SheetTitle>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {!type ? (
            <ListingTypeSelector onSelect={setType} />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {renderForm()}
            </div>
          )}
        </div>

        {type && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0D1F] via-[#0B0D1F] to-transparent pt-8">
            <Button 
              onClick={handleSubmit} 
              disabled={saving} 
              className="w-full h-12 rounded-[16px] bg-primary hover:bg-primary/90 text-white font-bold text-[15px] shadow-lg shadow-primary/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                editListing ? 'Save Changes' : 'Post Listing'
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
