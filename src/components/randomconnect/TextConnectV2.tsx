import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Shield, Check, CheckCheck, Bookmark, Plus, Image as ImageIcon, Pencil, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSecurityDetection } from '@/hooks/useSecurityDetection';
import { useSignaling } from '@/hooks/useSignaling';
import { useAuth } from '@/contexts/AuthContext';
import { ReportDialog } from './ReportDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender_pseudo_name: string;
  content: string;
  created_at: string;
  isRead?: boolean;
  type: 'text' | 'media' | 'drawing';
  mediaUrl?: string;
  isViewOnce?: boolean;
  isViewed?: boolean;
}

interface TextConnectV2Props {
  myPseudoName: string;
  partnerPseudoName: string;
  conversationStarter: string;
  messages: Message[];
  sessionId: string | null;
  textMemory: { content: string; isOwn: boolean }[];
  onSendMessage: (content: string, type?: 'text' | 'media' | 'drawing', mediaUrl?: string, isViewOnce?: boolean) => void;
  onSkip: () => void;
  onViolation?: (type: 'screenshot' | 'recording') => void;
  onClearMemory?: () => void;
  onReport?: (reason: string) => void;
  partnerId?: string;
  matchedInterests?: string[];
}

const MANDATORY_STAY_SECONDS = 20;

function sessionGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash % 360);
  return `linear-gradient(135deg, hsl(${h}, 65%, 45%), hsl(${(h + 40) % 360}, 70%, 55%))`;
}

export const TextConnectV2: React.FC<TextConnectV2Props> = ({
  myPseudoName,
  partnerPseudoName,
  conversationStarter,
  messages,
  sessionId,
  textMemory,
  onSendMessage,
  onSkip,
  onViolation,
  onClearMemory,
  onReport,
  partnerId,
  matchedInterests = []
}) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [duration, setDuration] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());
  const [partnerPresence, setPartnerPresence] = useState<'online' | 'away'>('online');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [showIcebreaker, setShowIcebreaker] = useState(true);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartReplyCount, setSmartReplyCount] = useState(0);
  const [memorySaved, setMemorySaved] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingCanvas, setDrawingCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [viewOnceEnabled, setViewOnceEnabled] = useState(true);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const MAX_SMART_REPLY_ROUNDS = 2;

  useSecurityDetection({
    enabled: true,
    onScreenshotDetected: () => onViolation?.('screenshot'),
    onRecordingDetected: () => onViolation?.('recording')
  });

  const { isConnected, sendTyping, sendRead, sendPresence } = useSignaling({
    sessionId,
    userId: user?.id || '',
    pseudoName: myPseudoName,
    onTyping: (data) => {
      if (data.fromPseudoName !== myPseudoName) {
        setIsPartnerTyping(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
        }
      }
    },
    onRead: (data) => {
      if (data.fromUserId !== user?.id) {
        setReadMessageIds(prev => new Set([...prev, ...data.messageIds]));
      }
    },
    onPresence: (data) => {
      if (data.fromPseudoName !== myPseudoName) {
        setPartnerPresence(data.status as 'online' | 'away');
      }
    }
  });

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (duration >= MANDATORY_STAY_SECONDS) setCanSkip(true);
  }, [duration]);

  // Generate smart replies
  useEffect(() => {
    if (messages.length === 0 || smartReplyCount >= MAX_SMART_REPLY_ROUNDS) return;
    
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender_pseudo_name === myPseudoName) return;

    const replies = [
      "That's interesting!",
      "Tell me more",
      "Same here!",
      "Really?",
      "Haha nice!",
      "I agree"
    ];
    setSmartReplies(replies.slice(0, 3));
  }, [messages, myPseudoName, smartReplyCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const now = Date.now();
    if (isConnected && e.target.value.length > 0 && now - lastTypingSentRef.current > 1000) {
      sendTyping(true);
      lastTypingSentRef.current = now;
    }
  }, [isConnected, sendTyping]);

  const handleSend = (text?: string) => {
    const val = text || inputValue.trim();
    if (!val) return;
    if (isConnected) sendTyping(false);
    onSendMessage(val, 'text');
    setInputValue('');
    setSmartReplies([]);
    setSmartReplyCount(c => c + 1);
    setTimeout(scrollToBottom, 50);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Media upload handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 10MB for view-once media)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB for view-once media.');
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewMedia(objectUrl);
  };

  const sendMedia = async () => {
    if (!previewMedia || !user) return;

    try {
      // Convert to file if needed
      const response = await fetch(previewMedia);
      const blob = await response.blob();
      const fileExt = blob.type.includes('video') ? 'mp4' : 'jpg';
      const path = `random-connect/${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from('random-connect-media')
        .upload(path, blob, { contentType: blob.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('random-connect-media').getPublicUrl(path);

      // Send message with media
      onSendMessage('', 'media', publicUrl, viewOnceEnabled);
      
      toast.success(viewOnceEnabled ? 'View-once media sent! 🔥' : 'Media sent!');
      setPreviewMedia(null);
      setShowPlusMenu(false);
    } catch (err) {
      toast.error('Failed to send media');
    }
  };

  // Drawing functionality
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.scale(dpr, dpr);

    // Set drawing style
    ctx.strokeStyle = '#7B61FF';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Haptic feedback on start drawing
    if (navigator.vibrate && 'touches' in e) navigator.vibrate(10);
    
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const currentPoint = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
    setIsDrawingActive(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const sendDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !user || !isDrawingActive) return;

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const path = `random-connect/${user.id}/drawing_${Date.now()}.png`;
      
      const { error: uploadErr } = await supabase.storage
        .from('random-connect-media')
        .upload(path, blob, { contentType: 'image/png' });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('random-connect-media').getPublicUrl(path);

      onSendMessage('', 'drawing', publicUrl, viewOnceEnabled);
      
      toast.success(viewOnceEnabled ? 'View-once drawing sent! 🎨' : 'Drawing sent!');
      setIsDrawing(false);
      setIsDrawingActive(false);
    } catch (err) {
      toast.error('Failed to send drawing');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsDrawingActive(false);
  };

  // View once media handler
  const handleViewOnceMedia = (msg: Message) => {
    if (msg.isViewOnce && !msg.isViewed && msg.sender_pseudo_name !== myPseudoName) {
      setViewingMedia(msg);
      // Mark as viewed
      sendRead([msg.id]);
    }
  };

  const closeViewOnceMedia = () => {
    setViewingMedia(null);
  };

  const handleSaveMemory = () => {
    setMemorySaved(true);
    toast.success('Memory saved! 💜');
  };

  const handleSkipConfirm = () => {
    setShowSkipConfirm(false);
    onSkip();
  };

  const handleReport = (reason: string) => {
    onReport?.(reason);
    setShowReportDialog(false);
    toast.success('Report submitted.');
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getReadStatus = (msg: Message) => {
    if (msg.sender_pseudo_name !== myPseudoName) return null;
    return readMessageIds.has(msg.id) ? 'read' : 'sent';
  };

  const partnerGradient = sessionGradient(sessionId || 'default');
  const partnerShortName = partnerPseudoName.split('-').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Initialize canvas when drawing mode opens
  useEffect(() => {
    if (isDrawing) {
      setTimeout(initCanvas, 100);
    }
  }, [isDrawing]);

  return (
    <div className="flex flex-col h-screen random-connect-protected" style={{ background: 'hsl(220, 60%, 8%)' }}>
      {/* View Once Media Viewer */}
      <AnimatePresence>
        {viewingMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          >
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70">
                <EyeOff className="w-5 h-5" />
                <span className="text-sm font-medium">View Once</span>
              </div>
              <button
                onClick={closeViewOnceMedia}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-w-full max-h-full p-4">
              {viewingMedia.type === 'drawing' ? (
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-black/50 text-xs mb-2 text-center">Drawing from {viewingMedia.sender_pseudo_name}</p>
                  <img 
                    src={viewingMedia.mediaUrl} 
                    alt="Drawing" 
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="relative">
                  {viewingMedia.mediaUrl?.includes('video') || viewingMedia.mediaUrl?.endsWith('.mp4') ? (
                    <video 
                      src={viewingMedia.mediaUrl} 
                      controls 
                      autoPlay
                      className="max-w-full max-h-[70vh] rounded-2xl"
                    />
                  ) : (
                    <img 
                      src={viewingMedia.mediaUrl} 
                      alt="Media" 
                      className="max-w-full max-h-[70vh] object-contain rounded-2xl"
                    />
                  )}
                </div>
              )}
              
              <div className="mt-4 text-center">
                <p className="text-white/50 text-xs">
                  This {viewingMedia.type === 'drawing' ? 'drawing' : 'media'} will disappear after you close it
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawing Modal */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col bg-black/95"
          >
            {/* Drawing Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-white font-bold">Draw Something</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCanvas}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsDrawing(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full bg-white rounded-2xl cursor-crosshair touch-none select-none"
                style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              />
            </div>

            {/* Drawing Footer */}
            <div className="px-4 py-4 border-t border-white/10 space-y-3">
              {/* View Once Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">View Once</span>
                </div>
                <button
                  onClick={() => setViewOnceEnabled(!viewOnceEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    viewOnceEnabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    viewOnceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <button
                onClick={sendDrawing}
                disabled={!isDrawingActive}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
              >
                {viewOnceEnabled ? 'Send View-Once Drawing' : 'Send Drawing'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col bg-black/95"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-bold">Preview</span>
              <button
                onClick={() => setPreviewMedia(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              {previewMedia.includes('video') ? (
                <video src={previewMedia} controls className="max-w-full max-h-full rounded-2xl" />
              ) : (
                <img src={previewMedia} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl" />
              )}
            </div>

            <div className="px-4 py-4 border-t border-white/10 space-y-3">
              {/* View Once Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70">
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">View Once</span>
                </div>
                <button
                  onClick={() => setViewOnceEnabled(!viewOnceEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    viewOnceEnabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    viewOnceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={sendMedia}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                >
                  {viewOnceEnabled ? 'Send View-Once' : 'Send'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus Menu */}
      <AnimatePresence>
        {showPlusMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 z-[80] bg-[hsl(220,45%,14%)] border border-white/10 rounded-2xl p-4 shadow-2xl"
          >
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ImageIcon className="w-6 h-6 text-primary" />
                <span className="text-xs text-white/70">Photo/Video</span>
              </button>
              <button
                onClick={() => { setIsDrawing(true); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Pencil className="w-6 h-6 text-pink-400" />
                <span className="text-xs text-white/70">Drawing</span>
              </button>
              <button
                onClick={() => toast.info('More options coming soon!')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors opacity-50"
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
                <span className="text-xs text-white/70">More</span>
              </button>
            </div>
            <button
              onClick={() => setShowPlusMenu(false)}
              className="w-full mt-3 py-2 text-white/50 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Privacy banner */}
      <AnimatePresence>
        {showPrivacyBanner && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="px-4 py-2 text-center border-b"
            style={{ background: 'hsl(220, 45%, 14%)', borderColor: 'hsl(220, 30%, 20%)' }}
          >
            <p className="text-[12px] text-[hsl(215,20%,65%)]">🛡️ Anonymous session — No screenshots • Media auto-destructs after viewing</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b sticky top-0 z-30" style={{ background: 'hsl(220, 45%, 14%)', borderColor: 'hsl(220, 30%, 20%)' }}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white" style={{ background: partnerGradient }}>
              {partnerShortName[0]}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${partnerPresence === 'online' ? 'bg-[hsl(160,84%,39%)]' : 'bg-[hsl(38,92%,50%)]'}`} style={{ borderColor: 'hsl(220, 45%, 14%)' }} />
          </div>
          <div>
            <p className="font-semibold text-[14px] text-foreground leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {partnerShortName}
            </p>
            <div className="flex items-center gap-1.5">
              {isPartnerTyping ? (
                <p className="text-[10px] text-[hsl(270,70%,50%)] animate-pulse">typing...</p>
              ) : (
                <>
                  <div className={`w-1.5 h-1.5 rounded-full ${partnerPresence === 'online' ? 'bg-[hsl(160,84%,39%)]' : 'bg-[hsl(38,92%,50%)]'}`} />
                  <span className="text-[10px] text-[hsl(160,84%,39%)]">Connected</span>
                  <span className="text-[10px] text-[hsl(220,15%,35%)]">{formatDuration(duration)}</span>
                </>
              )}
            </div>
            {matchedInterests.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {matchedInterests.map(interest => (
                  <span key={interest} className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'hsla(270,70%,50%,0.15)', color: 'hsl(260,80%,75%)' }}>
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSaveMemory}
            className={`px-3 h-8 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all ${
              memorySaved ? 'bg-primary/20 text-primary' : 'bg-white/[0.06] text-[hsl(215,20%,65%)] hover:bg-white/[0.1]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            {memorySaved ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={() => canSkip ? setShowSkipConfirm(true) : toast.info(`Stay ${MANDATORY_STAY_SECONDS - duration}s to skip`)}
            className="px-3 h-8 rounded-full bg-white/[0.06] text-[hsl(215,20%,65%)] hover:bg-white/[0.1] text-[11px] font-bold transition-all"
          >
            Skip
          </button>
          <button
            onClick={() => setShowReportDialog(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] text-[hsl(215,20%,65%)] hover:bg-white/[0.1] transition-colors"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scroll-smooth">
        {/* Icebreaker */}
        {showIcebreaker && conversationStarter && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-center"
              style={{ background: 'hsla(270, 70%, 50%, 0.15)', border: '1px solid hsla(270, 70%, 50%, 0.25)' }}>
              <p className="text-[11px] text-[hsl(260,80%,80%)] leading-snug">
                <span className="font-bold">Icebreaker:</span> {conversationStarter}
              </p>
              <button onClick={() => setShowIcebreaker(false)} className="mt-1.5 text-[10px] text-[hsl(260,80%,65%)] hover:text-[hsl(260,80%,80%)]">Dismiss</button>
            </div>
          </motion.div>
        )}

        {/* Chat messages */}
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_pseudo_name === myPseudoName;
          const showAvatar = idx === 0 || messages[idx - 1].sender_pseudo_name !== msg.sender_pseudo_name;
          const readStatus = getReadStatus(msg);

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isOwn && showAvatar && (
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-1"
                  style={{ background: partnerGradient }}>
                  {partnerShortName[0]}
                </div>
              )}
              {!isOwn && !showAvatar && <div className="w-7" />}

              <div className={`max-w-[75%] ${!isOwn && showAvatar ? 'mt-1' : ''}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.isViewOnce && msg.isViewed && msg.sender_pseudo_name !== myPseudoName
                      ? 'opacity-50 bg-gray-800'
                      : isOwn 
                        ? 'rounded-br-md' 
                        : 'rounded-bl-md'
                  }`}
                  style={{
                    background: isOwn
                      ? 'linear-gradient(135deg, hsl(270,70%,50%), hsl(210,100%,55%))'
                      : 'hsl(220, 35%, 18%)',
                    color: isOwn ? 'white' : 'hsl(220, 20%, 98%)'
                  }}
                >
                  {/* View Once Badge */}
                  {msg.isViewOnce && (
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                      <EyeOff className="w-3 h-3" />
                      <span className="text-[9px] uppercase tracking-wider font-bold">View Once</span>
                    </div>
                  )}

                  {/* Media Content */}
                  {msg.type === 'media' && msg.mediaUrl && (
                    <div 
                      onClick={() => handleViewOnceMedia(msg)}
                      className="cursor-pointer"
                    >
                      {msg.isViewOnce && msg.isViewed && msg.sender_pseudo_name !== myPseudoName ? (
                        <div className="flex items-center gap-2 text-white/50">
                          <EyeOff className="w-4 h-4" />
                          <span className="text-xs">Opened</span>
                        </div>
                      ) : msg.mediaUrl.includes('video') || msg.mediaUrl.endsWith('.mp4') ? (
                        <div className="relative rounded-lg overflow-hidden bg-black/50">
                          <video src={msg.mediaUrl} className="w-full h-32 object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden">
                          <img src={msg.mediaUrl} alt="Media" className="w-full h-32 object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Drawing Content */}
                  {msg.type === 'drawing' && msg.mediaUrl && (
                    <div 
                      onClick={() => handleViewOnceMedia(msg)}
                      className="cursor-pointer"
                    >
                      {msg.isViewOnce && msg.isViewed && msg.sender_pseudo_name !== myPseudoName ? (
                        <div className="flex items-center gap-2 text-white/50">
                          <EyeOff className="w-4 h-4" />
                          <span className="text-xs">Opened</span>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden bg-white p-2">
                          <img src={msg.mediaUrl} alt="Drawing" className="w-full h-32 object-contain" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && <span>{msg.content}</span>}
                </div>

                {/* Read status */}
                {isOwn && (
                  <div className="flex justify-end items-center gap-1 mt-0.5 pr-1">
                    <span className="text-[9px] text-[hsl(220,15%,40%)]">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {readStatus === 'read' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[hsl(160,84%,39%)]" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-[hsl(220,15%,40%)]" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isPartnerTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md" style={{ background: 'hsl(220, 35%, 18%)' }}>
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-[hsl(215,20%,50%)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Smart reply chips */}
      {smartReplies.length > 0 && smartReplyCount <= MAX_SMART_REPLY_ROUNDS && (
        <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {smartReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSend(reply)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: 'hsla(270, 70%, 50%, 0.1)',
                border: '1px solid hsla(270, 70%, 50%, 0.2)',
                color: 'hsl(260,80%,75%)',
              }}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input bar with Plus button */}
      <div className="px-3 pb-4 pt-1.5 border-t" style={{ borderColor: 'hsl(220, 30%, 20%)', background: 'hsl(220, 45%, 14%)' }}>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPlusMenu(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Share a thought..."
            className="flex-1 rounded-full h-10 text-sm border-0"
            style={{ background: 'hsl(220, 35%, 18%)', color: 'hsl(220, 20%, 98%)' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ background: 'linear-gradient(135deg, hsl(270,70%,50%), hsl(210,100%,55%))' }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Skip confirmation */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center pb-8 bg-black/60"
            onClick={() => setShowSkipConfirm(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}
              className="w-[90%] max-w-sm rounded-[20px] p-5"
              style={{ background: 'hsl(220, 45%, 14%)', border: '1px solid hsl(220, 30%, 25%)' }}
            >
              <p className="text-base font-semibold text-foreground text-center mb-4">Skip this connection?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-foreground"
                  style={{ background: 'hsla(270, 70%, 50%, 0.15)', border: '1px solid hsla(270, 70%, 50%, 0.3)' }}
                >
                  Keep Chatting
                </button>
                <button
                  onClick={handleSkipConfirm}
                  className="flex-1 py-3 rounded-xl text-sm font-medium"
                  style={{ background: 'hsla(0, 84%, 60%, 0.15)', border: '1px solid hsla(0, 84%, 60%, 0.3)', color: 'hsl(0, 84%, 60%)' }}
                >
                  Yes, Skip
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Dialog */}
      <ReportDialog open={showReportDialog} onClose={() => setShowReportDialog(false)} onReport={handleReport} />

      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default TextConnectV2;
