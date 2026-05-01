import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Type, Loader2, Send, FlipHorizontal,
  ChevronLeft, Globe, Users, Lock, ArrowRight, Image as ImageIcon,
  Video, Sparkles, Check, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadStoryMediaWithFallback } from '@/lib/storyStorage';

interface StoryCreatorV3Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialMode?: 'text' | 'dang' | 'voice' | 'media';
  initialStream?: MediaStream;
  initialFile?: File | null;
}

const BG_COLORS = [
  'linear-gradient(135deg, #7C3AED, #3B82F6)',
  'linear-gradient(135deg, #EC4899, #F43F5E)',
  'linear-gradient(135deg, #10B981, #14B8A6)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
  'linear-gradient(135deg, #1D4ED8, #0891B2)',
  'linear-gradient(135deg, #8B5CF6, #EC4899)',
  '#0a0f1e',
  '#1e293b',
];

const DURATIONS = [
  { hours: 6, label: '6h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
  { hours: 48, label: '48h' }
];

export function StoryCreatorV3({ open, onClose, onCreated, initialMode = 'media', initialStream, initialFile = null }: StoryCreatorV3Props) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(initialStream || null);
  const previewUrlRef = useRef<string | null>(null);
  
  // Mode state - start directly in the mode without extra layout
  const [mode, setMode] = useState<'text' | 'dang' | 'media'>(
    initialMode === 'text' ? 'text' : initialMode === 'dang' ? 'dang' : 'media'
  );
  
  // Media state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Content state
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState(BG_COLORS[0]);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'following'>('public');
  const [duration, setDuration] = useState(24);
  
  // Settings
  const [allowComments, setAllowComments] = useState<'everyone' | 'friends' | 'none'>('everyone');
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowShare, setAllowShare] = useState(true);
  
  // UI state
  const [publishing, setPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showSuccess, setShowSuccess] = useState(false);

  const encodeTextStoryData = useCallback((data: { text: string; bg: string }) => {
    const json = JSON.stringify(data);
    try {
      return btoa(json);
    } catch {
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    }
  }, []);

  const setMediaPreview = useCallback((nextFile: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!nextFile) {
      setPreviewUrl(null);
      return;
    }

    const nextPreview = URL.createObjectURL(nextFile);
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
  }, []);

  useEffect(() => {
    if (!open) return;

    const nextMode = initialMode === 'text' ? 'text' : initialMode === 'dang' ? 'dang' : 'media';
    setMode(nextMode);
    setFile(nextMode === 'media' ? initialFile : null);
    setMediaPreview(nextMode === 'media' ? initialFile : null);
    setCapturedImage(null);
    setCaption('');
    setTextContent('');
    setTextBg(BG_COLORS[0]);
    setVisibility('public');
    setPublishing(false);
    setShowSettings(false);
    setIsCameraReady(false);
  }, [open, initialMode, initialFile, setMediaPreview]);

  // Initialize camera for Dang mode
  useEffect(() => {
    if (mode === 'dang' && open) {
      if (initialStream) {
        streamRef.current = initialStream;
        if (videoRef.current) {
          videoRef.current.srcObject = initialStream;
        }
        setIsCameraReady(true);
      } else {
        initDangCamera();
      }
    }
    
    return () => {
      if (streamRef.current && !initialStream) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, open, initialStream]);

  const initDangCamera = useCallback(async () => {
    try {
      if (streamRef.current && !initialStream) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      toast.error('Could not access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  }, [facingMode, initialStream]);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(initDangCamera, 100);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image
    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageUrl);
    
    // Stop camera
    streamRef.current?.getTracks().forEach(track => track.stop());
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    initDangCamera();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    setFile(f);
    setMediaPreview(f);
  };

  const publishStory = async () => {
    if (!user) return;
    setPublishing(true);

    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | 'text' = 'image';

      // Upload based on mode
      if (mode === 'text') {
        mediaType = 'text';
        // Encode text story
        const data = { text: textContent, bg: textBg };
        mediaUrl = `data:text/json;base64,${encodeTextStoryData(data)}`;
      } else if (mode === 'dang' && capturedImage) {
        // Upload captured image
        const blob = await fetch(capturedImage).then(r => r.blob());
        const uploaded = await uploadStoryMediaWithFallback({
          userId: user.id,
          data: blob,
          fileName: `dang_${Date.now()}.jpg`,
          contentType: 'image/jpeg',
        });
        mediaUrl = uploaded.publicUrl;
        mediaType = 'image';
      } else if (mode === 'media' && file) {
        // Upload media file with fallback buckets
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';

        const uploaded = await uploadStoryMediaWithFallback({
          userId: user.id,
          data: file,
          fileName: file.name,
          contentType: file.type,
        });
        mediaUrl = uploaded.publicUrl;
      }

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);

      // Create story record with settings
      const { error: dbErr } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption,
          visibility,
          expires_at: expiresAt.toISOString()
        });

      if (dbErr) throw dbErr;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onCreated?.();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Failed to publish:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to publish story: ${message}`);
    } finally {
      setPublishing(false);
    }
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'public': return <Globe size={16} />;
      case 'friends': return <Users size={16} />;
      case 'following': return <Users size={16} />;
      default: return <Lock size={16} />;
    }
  };

  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'public': return 'Everyone';
      case 'friends': return 'Friends';
      case 'following': return 'Following';
      default: return 'Only Me';
    }
  };

  // Determine if we can publish
  const canPublish = () => {
    if (publishing) return false;
    if (mode === 'text') return textContent.trim().length > 0;
    if (mode === 'dang') return capturedImage !== null;
    if (mode === 'media') return file !== null;
    return false;
  };

  const handleClose = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setMode(initialMode === 'text' ? 'text' : initialMode === 'dang' ? 'dang' : 'media');
    setFile(null);
    setPreviewUrl(null);
    setCapturedImage(null);
    setCaption('');
    setTextContent('');
    setVisibility('public');
    setPublishing(false);
    setShowSettings(false);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4">
                <Check size={40} className="text-white" />
              </div>
              <p className="text-white font-bold text-xl">Story Published!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - optimized for fast rendering */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4" style={{ willChange: 'transform' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white active:scale-95 transition-transform"
            style={{ willChange: 'transform' }}
          >
            <ChevronLeft size={22} />
          </button>

          {/* Mode Indicator */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-4 py-2">
            {mode === 'text' && <Type size={16} className="text-white" />}
            {mode === 'dang' && <Camera size={16} className="text-white" />}
            {mode === 'media' && <ImageIcon size={16} className="text-white" />}
            <span className="text-white text-sm font-medium capitalize">{mode} Story</span>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
          >
            <Clock size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area - GPU accelerated */}
      <div className="w-full h-full pt-20 pb-32" style={{ willChange: 'transform', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
        {/* TEXT MODE */}
        {mode === 'text' && (
          <div className="w-full h-full flex flex-col">
            {/* Text Input Area */}
            <div 
              className="flex-1 flex items-center justify-center p-6 sm:p-8 transition-all duration-300 overflow-y-auto"
              style={{ background: textBg }}
            >
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type something..."
                className="w-full max-w-[42rem] bg-transparent text-white text-center resize-none outline-none placeholder:text-white/40 leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.9rem, 7vw, 4rem)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '9rem' }}
                maxLength={200}
              />
            </div>

            {/* Background Color Picker */}
            <div className="p-4 bg-black/80">
              <p className="text-white/50 text-xs mb-3">Background</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {BG_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTextBg(color)}
                    className={cn(
                      "w-12 h-12 rounded-full shrink-0 border-2 transition-all",
                      textBg === color ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DANG MODE - Camera */}
        {mode === 'dang' && !capturedImage && (
          <div className="relative w-full h-full bg-black">
            {/* Camera Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
              {/* Camera Buttons */}
              <div className="flex items-center justify-between">
                {/* Flip */}
                <button
                  onClick={flipCamera}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white"
                >
                  <FlipHorizontal size={24} />
                </button>

                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-50"
                >
                  <div className="w-16 h-16 rounded-full bg-white" />
                </button>

                {/* Empty space for layout balance */}
                <div className="w-12 h-12" />
              </div>
            </div>

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* DANG MODE - Preview Captured */}
        {mode === 'dang' && capturedImage && (
          <div className="relative w-full h-full bg-black">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />

            {/* Retake Button */}
            <div className="absolute top-24 left-4">
              <button
                onClick={retakePhoto}
                className="px-4 py-2 rounded-full bg-black/60 backdrop-blur text-white text-sm font-medium"
              >
                Retake
              </button>
            </div>
          </div>
        )}

        {/* MEDIA MODE */}
        {mode === 'media' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            {!file ? (
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-3xl bg-white/10 flex items-center justify-center mb-4 hover:bg-white/20 transition-colors"
                >
                  <ImageIcon size={48} className="text-white/60" />
                </button>
                <p className="text-white/60">Tap to select photo/video</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {file.type.startsWith('video/') ? (
                  <video
                    src={previewUrl || ''}
                    className="w-full h-full object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={previewUrl || ''}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pb-6">
        {/* Caption Input */}
        {mode === 'media' && (
          <div className="mb-4">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-white/10 rounded-full px-4 py-3 text-white placeholder:text-white/40 outline-none"
            />
          </div>
        )}

        {/* Visibility & Publish */}
        <div className="flex items-center gap-3">
          {/* Visibility Selector */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            {getVisibilityIcon()}
            <span className="text-sm font-medium">{getVisibilityLabel()}</span>
            <ArrowRight size={16} className="text-white/50" />
          </button>

          {/* Publish Button */}
          <button
            onClick={publishStory}
            disabled={!canPublish() || publishing}
            className={cn(
              "flex-1 py-3 rounded-full font-bold text-white flex items-center justify-center gap-2 transition-all",
              canPublish() && !publishing
                ? "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                : "bg-white/20 cursor-not-allowed"
            )}
          >
            {publishing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Send size={18} />
                <span>Share Story</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/60"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0f1e] rounded-t-3xl sm:rounded-3xl p-6 border border-white/10"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              
              <h3 className="text-white font-bold text-lg mb-6">Story Settings</h3>

              {/* Visibility */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Who can see this?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'public', label: 'Everyone', icon: Globe },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'following', label: 'Following', icon: Users },
                    { id: 'private', label: 'Only Me', icon: Lock }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setVisibility(id as any)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-full border transition-all",
                        visibility === id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Who can comment?</label>
                <div className="flex gap-2">
                  {[
                    { id: 'everyone', label: 'Everyone' },
                    { id: 'friends', label: 'Friends' },
                    { id: 'none', label: 'No One' }
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setAllowComments(id as any)}
                      className={cn(
                        "flex-1 py-2 rounded-full border text-sm transition-all",
                        allowComments === id
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Story Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(({ hours, label }) => (
                    <button
                      key={hours}
                      onClick={() => setDuration(hours)}
                      className={cn(
                        "flex-1 py-2 rounded-full border text-sm transition-all",
                        duration === hours
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allow Download */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-white text-sm">Allow Download</span>
                <button
                  onClick={() => setAllowDownload(!allowDownload)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors",
                    allowDownload ? "bg-primary" : "bg-white/20"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white transition-transform",
                    allowDownload ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>

              {/* Allow Share */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-white text-sm">Allow Share to Stories</span>
                <button
                  onClick={() => setAllowShare(!allowShare)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors",
                    allowShare ? "bg-primary" : "bg-white/20"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white transition-transform",
                    allowShare ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 rounded-full bg-white/10 text-white font-bold"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}

export default StoryCreatorV3;
