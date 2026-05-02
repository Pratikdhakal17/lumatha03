import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Camera, Type, Loader2, Send, Mic, FlipHorizontal,
  ChevronLeft, Globe, Users, Lock, ArrowRight, Image as ImageIcon,
  Video, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadStoryMediaWithFallback } from '@/lib/storyStorage';

interface StoryCreatorV2Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialMode?: 'text' | 'dang' | 'voice' | 'media';
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

export function StoryCreatorV2({ open, onClose, onCreated, initialMode = 'media' }: StoryCreatorV2Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Mode state
  const [mode, setMode] = useState<'choose' | 'text' | 'dang' | 'voice' | 'media'>(
    initialMode === 'text' ? 'text' : initialMode === 'dang' ? 'dang' : initialMode === 'voice' ? 'voice' : 'choose'
  );
  
  // Media state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Content state
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState(BG_COLORS[0]);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  
  // UI state
  const [publishing, setPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [recentMedia, setRecentMedia] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle file selection for media mode
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      if (mode === 'choose') handleClose();
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setMode('media');
  };

  // Initialize Dang camera
  const initDangCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
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
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Camera access denied. Please allow camera permission.');
      setMode('choose');
    }
  }, [facingMode]);

  // Start Dang mode
  useEffect(() => {
    if (mode === 'dang') {
      initDangCamera();
    }
    return () => {
      if (mode !== 'dang' && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [mode, initDangCamera]);

  // Flip camera
  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(initDangCamera, 100);
  };

  // Capture photo in Dang mode
  const captureDang = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, flip horizontally
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0);
    
    // Reset transform
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Retake photo
  const retakeDang = () => {
    setCapturedImage(null);
    initDangCamera();
  };

  // Load recent media from device
  const loadRecentMedia = useCallback(async () => {
    try {
      // Check for Media Library API support
      if ('mediaCapabilities' in navigator) {
        // This is a simplified version - full implementation would use
        // the File System Access API or Media Library API
        toast.info('Loading recent media...');
        
        // For now, we'll simulate with placeholder logic
        // In a real app, you'd use the File System Access API or
        // a native bridge for mobile apps
      }
    } catch (err) {
      console.error('Failed to load recent media:', err);
    }
  }, []);

  // Publish story
  const handlePublish = async () => {
    if (!user) return;
    setPublishing(true);

    try {
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | 'text' = 'image';

      if (mode === 'media' && file) {
        const uploaded = await uploadStoryMediaWithFallback({
          userId: user.id,
          data: file,
          fileName: file.name,
          contentType: file.type,
        });
        mediaUrl = uploaded.publicUrl;
        mediaType = file.type.startsWith('video') ? 'video' : 'image';
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
      } else if (mode === 'text') {
        // Text story - no media
        const storyData = JSON.stringify({ text: textContent, bg: textBg });
        mediaUrl = `data:text/story;base64,${btoa(unescape(encodeURIComponent(storyData)))}`;
        mediaType = 'text';
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: (mode === 'media' || mode === 'dang') ? (caption.trim() || null) : null,
        visibility,
        expires_at: expiresAt,
      });
      
      if (error) throw error;

      toast.success('Story added! ✨');
      onCreated?.();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to post story');
    } finally {
      setPublishing(false);
    }
  };

  // Close and reset
  const handleClose = () => {
    setMode('choose');
    setFile(null);
    setPreviewUrl(null);
    setCapturedImage(null);
    setCaption('');
    setTextContent('');
    setVisibility('public');
    setPublishing(false);
    setShowSettings(false);
    setIsCameraReady(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    onClose();
  };

  // Can publish check
  const canPublish = () => {
    if (mode === 'media') return !!file;
    if (mode === 'dang') return !!capturedImage;
    if (mode === 'text') return textContent.trim().length > 0;
    return false;
  };

  if (!open) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10001] flex flex-col overflow-hidden bg-black"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={handleClose}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-md text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Visibility */}
          <button 
            onClick={() => setShowSettings(true)}
            className="px-3 h-9 rounded-full bg-black/30 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            {visibility}
          </button>
          
          {/* Publish */}
          <button
            onClick={handlePublish}
            disabled={!canPublish() || publishing}
            className="px-4 h-9 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Post
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {/* CHOOSE MODE */}
        {mode === 'choose' && (
          <div className="h-full flex flex-col items-center justify-center px-6 space-y-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Create Story</h2>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {/* Text Story */}
              <button
                onClick={() => setMode('text')}
                className="aspect-square rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/30 transition-all active:scale-95"
              >
                <Type className="w-8 h-8 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase">Text</span>
                <span className="text-[10px] text-white/50">No description</span>
              </button>

              {/* Dang Story (Camera) */}
              <button
                onClick={() => setMode('dang')}
                className="aspect-square rounded-3xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/30 transition-all active:scale-95"
              >
                <Camera className="w-8 h-8 text-pink-400" />
                <span className="text-xs font-bold text-white uppercase">Dang</span>
                <span className="text-[10px] text-white/50">Real-time photo</span>
              </button>

              {/* Voice Story */}
              <button
                onClick={() => toast.info('Voice story coming soon!')}
                className="aspect-square rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/30 transition-all active:scale-95 opacity-60"
              >
                <Mic className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase">Voice</span>
                <span className="text-[10px] text-white/50">Coming soon</span>
              </button>

              {/* Media Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/30 transition-all active:scale-95"
              >
                <ImageIcon className="w-8 h-8 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase">Media</span>
                <span className="text-[10px] text-white/50">Gallery</span>
              </button>
            </div>
          </div>
        )}

        {/* TEXT MODE */}
        {mode === 'text' && (
          <div className="h-full flex flex-col items-center justify-center px-6" style={{ background: textBg }}>
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full max-w-md bg-transparent border-0 outline-none resize-none text-white text-center text-3xl font-black placeholder:text-white/30"
              rows={4}
            />
            
            {/* Background color picker */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 px-4 flex-wrap">
              {BG_COLORS.slice(0, 6).map((bg, i) => (
                <button
                  key={i}
                  onClick={() => setTextBg(bg)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    textBg === bg ? 'border-white scale-110' : 'border-white/30'
                  }`}
                  style={{ background: bg }}
                />
              ))}
            </div>
          </div>
        )}

        {/* DANG MODE (Real-time Camera) */}
        {mode === 'dang' && (
          <div className="h-full relative">
            {!capturedImage ? (
              <>
                {/* Camera Preview */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                
                {/* Camera Controls */}
                <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8">
                  {/* Flip Camera */}
                  <button
                    onClick={flipCamera}
                    className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white"
                  >
                    <FlipHorizontal className="w-5 h-5" />
                  </button>

                  {/* Capture Button */}
                  <button
                    onClick={captureDang}
                    disabled={!isCameraReady}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <div className="w-16 h-16 rounded-full bg-white" />
                  </button>

                </div>

                {/* Not Ready Message */}
                {!isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <p className="text-white/70 text-sm">Starting camera...</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Captured Image Preview */}
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                
                {/* Preview Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={retakeDang}
                      className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-bold"
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => handlePublish()}
                      disabled={publishing}
                      className="px-6 py-2 rounded-full bg-white text-black text-sm font-black"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                    </button>
                  </div>

                  {/* Optional Description for Dang */}
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a description (optional)..."
                    className="w-full bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/50 outline-none"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* MEDIA MODE */}
        {mode === 'media' && previewUrl && (
          <div className="h-full relative">
            {file?.type.startsWith('video') ? (
              <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            )}
            
            {/* Caption Input */}
            <div className="absolute bottom-8 left-4 right-4">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/50 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[10002] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-[#0a0f1f] rounded-t-[32px] border-t border-white/10 p-6 pb-12"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Visibility</h3>
              
              <div className="space-y-2 mb-6">
                {[
                  { id: 'public', label: 'Public', icon: Globe, desc: 'Everyone can see' },
                  { id: 'friends', label: 'Followers', icon: Users, desc: 'Only your followers' },
                  { id: 'private', label: 'Private', icon: Lock, desc: 'Only you can see' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setVisibility(item.id as any); setShowSettings(false); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                      visibility === item.id 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      visibility === item.id ? 'bg-primary text-white' : 'bg-white/10 text-gray-500'
                    }`}>
                      <item.icon size={18} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="text-[10px] text-gray-500">{item.desc}</p>
                    </div>
                    {visibility === item.id && (
                      <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#7C3AED]" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}

export default StoryCreatorV2;
