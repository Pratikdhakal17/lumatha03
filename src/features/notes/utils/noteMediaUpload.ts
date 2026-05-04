import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPublicUrlSafe } from '@/lib/storageHelpers';

const BUCKET_NAME = 'note-media';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// Media is now images ONLY - no videos as requested
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES];

export interface UploadProgress {
  status: 'idle' | 'checking' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface UploadResult {
  url: string;
  path: string;
  type: 'image'; // Images only
  size: number;
}

/**
 * Validates file before upload - IMAGES ONLY
 */
const validateFile = (file: File): { valid: boolean; error?: string; type?: 'image' } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.` };
  }

  // Check file type - IMAGES ONLY
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  
  if (!isImage) {
    return { 
      valid: false, 
      error: `Only images are allowed. Please use: JPG, PNG, GIF, or WebP. Videos are not supported.` 
    };
  }

  return { valid: true, type: 'image' };
};

/**
 * Checks if the storage bucket exists and is accessible
 */
const checkBucket = async (): Promise<{ exists: boolean; error?: string }> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return { exists: false, error: 'Failed to check storage buckets. Please try again.' };
    }

    const bucket = buckets?.find(b => b.name === BUCKET_NAME);
    
    if (!bucket) {
      return { 
        exists: false, 
        error: `Storage bucket "${BUCKET_NAME}" not found. Please create it in Supabase Dashboard:
        1. Go to Supabase Dashboard > Storage
        2. Click "New Bucket"
        3. Name: "${BUCKET_NAME}"
        4. Enable "Public access"
        5. Set max file size to 50MB` 
      };
    }

    return { exists: true };
  } catch (err: any) {
    return { exists: false, error: `Storage check failed: ${err.message}` };
  }
};

/**
 * Uploads media file to Supabase Storage for notes
 * 
 * @param file - The file to upload
 * @param noteId - The note ID to associate with the file
 * @param onProgress - Optional callback for upload progress
 * @returns UploadResult with public URL
 */
export const uploadNoteMedia = async (
  file: File, 
  noteId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  // Get current user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Please sign in to upload media.');
  }
  const userId = authData.user.id;

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check bucket exists
  onProgress?.({ status: 'checking', progress: 0 });
  const bucketCheck = await checkBucket();
  if (!bucketCheck.exists) {
    throw new Error(bucketCheck.error);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const fileName = `${timestamp}-${random}.${fileExt}`;
  const filePath = `${userId}/notes/${noteId}/${fileName}`;

  try {
    onProgress?.({ status: 'uploading', progress: 10 });

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Handle specific errors
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('Bucket')) {
        throw new Error(
          `Storage bucket "${BUCKET_NAME}" not found. ` +
          'Please create it in Supabase Dashboard with public access enabled.'
        );
      }
      if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
        throw new Error(
          'Storage permission denied. Please configure RLS policies for the note-media bucket. ' +
          'Users need INSERT permission for their own folder.'
        );
      }
      if (uploadError.message?.includes('size') || uploadError.message?.includes('Size')) {
        throw new Error('File is too large. Maximum size is 50MB.');
      }
      
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    onProgress?.({ status: 'processing', progress: 80 });

    // Get public URL
    const url = getPublicUrlSafe(BUCKET_NAME, filePath);
    if (!url) {
      throw new Error('Upload succeeded but failed to get public URL.');
    }

    onProgress?.({ status: 'complete', progress: 100 });

    return {
      url: url,
      path: filePath,
      type: validation.type!,
      size: file.size,
    };

  } catch (err: any) {
    onProgress?.({ status: 'error', progress: 0, error: err.message });
    console.error('Upload failed:', err);
    throw err;
  }
};

/**
 * Deletes a media file from storage
 */
export const deleteNoteMedia = async (filePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete media: ${error.message}`);
  }
};

/**
 * Hook-style upload with progress tracking
 */
export const useNoteMediaUpload = () => {
  const upload = async (
    file: File, 
    noteId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    return uploadNoteMedia(file, noteId, onProgress);
  };

  const remove = async (filePath: string): Promise<void> => {
    return deleteNoteMedia(filePath);
  };

  return { upload, remove };
};

export default uploadNoteMedia;
