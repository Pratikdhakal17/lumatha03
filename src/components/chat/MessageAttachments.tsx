import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Camera,
  FileText,
  Image,
  MapPin,
  Palette,
  Send,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SmartDrawCanvas } from '@/components/chat/SmartDrawCanvas';

const db = supabase as any;

export interface AttachmentOption {
  id: 'gallery' | 'moment' | 'docs' | 'poll' | 'drawing' | 'location';
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

export const ATTACHMENT_OPTIONS: AttachmentOption[] = [
  {
    id: 'gallery',
    label: 'Gallery',
    icon: <Image className="w-6 h-6" />,
    description: 'Photos & videos',
    color: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30',
  },
  {
    id: 'moment',
    label: 'Moment',
    icon: <Camera className="w-6 h-6" />,
    description: 'Quick snap',
    color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30',
  },
  {
    id: 'drawing',
    label: 'Drawing',
    icon: <Palette className="w-6 h-6" />,
    description: 'Sketch & paint',
    color: 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/30',
  },
  {
    id: 'poll',
    label: 'Poll',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Max 5 options',
    color: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30',
  },
  {
    id: 'location',
    label: 'Location',
    icon: <MapPin className="w-6 h-6" />,
    description: 'Share location',
    color: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/30',
  },
  {
    id: 'docs',
    label: 'Docs',
    icon: <FileText className="w-6 h-6" />,
    description: 'Documents',
    color: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30',
  },
];

interface MediaPermissionDialogProps {
  isOpen: boolean;
  mediaType: 'gallery' | 'camera' | 'documents';
  onAlwaysAllow: () => void;
  onAllowOnce: () => void;
  onDeny: () => void;
}

export function MediaPermissionDialog({
  isOpen,
  mediaType,
  onAlwaysAllow,
  onAllowOnce,
  onDeny,
}: MediaPermissionDialogProps) {
  // Define constants before any conditional logic
  const typeLabels = {
    gallery: 'Gallery Access',
    camera: 'Camera Access',
    documents: 'Documents Access',
  } as const;

  const typeDescriptions = {
    gallery: 'Allow Lumatha to read photos and videos from your device.',
    camera: 'Allow Lumatha to use your camera for moments.',
    documents: 'Allow Lumatha to read local documents.',
  } as const;

  // Avoid early return to prevent hook count mismatches
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-black/55 backdrop-blur-sm flex items-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full bg-[#111827] rounded-t-3xl border-t border-white/10 p-5"
          >
            <div className="mb-4">
              <h3 className="text-white text-lg font-semibold">{typeLabels[mediaType]}</h3>
              <p className="text-sm text-slate-300 mt-1">{typeDescriptions[mediaType]}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={onAlwaysAllow}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors"
              >
                Always Allow
              </button>
              <button
                onClick={onAllowOnce}
                className="w-full py-3 px-4 rounded-xl font-medium text-white bg-white/10 hover:bg-white/15 transition-colors"
              >
                Allow Once
              </button>
              <button
                onClick={onDeny}
                className="w-full py-3 px-4 rounded-xl font-medium text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Deny
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SensitiveToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-purple-400" />
        <div>
          <p className="text-[13px] font-semibold text-white">Sensitive Content</p>
          <p className="text-[11px] text-white/60">Blur preview for receiver</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative',
          value ? 'bg-[#7C3AED]' : 'bg-white/10'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
            value ? 'left-5' : 'left-1'
          )}
        />
      </button>
    </div>
  );
}

export function MessageAttachmentsMenu({
  onSelect,
  onClose,
  isOpen,
}: {
  onSelect: (type: AttachmentOption['id']) => void;
  onClose: () => void;
  isOpen: boolean;
}) {
  // Avoid early return to prevent hook count mismatches
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-[#111827] rounded-t-3xl border-t border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white" id="attachment-menu-title">Send</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Close menu">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3" role="menu" aria-labelledby="attachment-menu-title">
              {ATTACHMENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSelect(option.id);
                    onClose();
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl',
                    'border border-transparent transition-all duration-200 active:scale-95',
                    option.color
                  )}
                  role="menuitem"
                >
                  <div className="text-white">{option.icon}</div>
                  <span className="text-xs font-medium text-white">{option.label}</span>
                  <span className="text-[10px] text-slate-300 text-center">{option.description}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GalleryAttachment({
  onSelect,
  onClose,
}: {
  onSelect: (file: File, isSensitive: boolean) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [needsPermission, setNeedsPermission] = useState(() => localStorage.getItem('gallery_permission') !== 'always');
  const [selection, setSelection] = useState<{ file: File; preview: string } | null>(null);
  const [isSensitive, setIsSensitive] = useState(false);

  useEffect(() => {
    return () => {
      if (selection) URL.revokeObjectURL(selection.preview);
    };
  }, [selection]);

  if (needsPermission) {
    return (
      <MediaPermissionDialog
        isOpen
        mediaType="gallery"
        onAlwaysAllow={() => {
          localStorage.setItem('gallery_permission', 'always');
          setNeedsPermission(false);
        }}
        onAllowOnce={() => setNeedsPermission(false)}
        onDeny={onClose}
      />
    );
  }

  if (selection) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/50">
          <h3 className="text-white font-semibold">Preview</h3>
          <button onClick={() => setSelection(null)} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          {selection.file.type.startsWith('video') ? (
            <video src={selection.preview} className="max-w-full max-h-[70vh] object-contain rounded-xl" controls />
          ) : (
            <img src={selection.preview} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
          )}
        </div>
        <div className="p-4 bg-black/40 space-y-3">
          <SensitiveToggle value={isSensitive} onChange={setIsSensitive} />
          <div className="flex gap-3">
            <button onClick={() => setSelection(null)} className="flex-1 py-3 rounded-xl bg-white/10 text-white">
              Discard
            </button>
            <button
              onClick={() => {
                onSelect(selection.file, isSensitive);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#111827]">
        <h3 className="text-white font-semibold">Gallery</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <button
          onClick={() => inputRef.current?.click()}
          className="px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9]"
        >
          Choose Media
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const preview = URL.createObjectURL(file);
          setSelection({ file, preview });
        }}
      />
    </div>
  );
}

export function MomentAttachment({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob, isSensitive: boolean) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [needsPermission, setNeedsPermission] = useState(() => localStorage.getItem('camera_permission') !== 'always');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isSensitive, setIsSensitive] = useState(false);

  useEffect(() => {
    if (needsPermission) return;

    let liveStream: MediaStream | null = null;
    const start = async () => {
      try {
        liveStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (videoRef.current) videoRef.current.srcObject = liveStream;
      } catch {
        toast.error('Camera permission denied');
        onClose();
      }
    };

    void start();
    return () => {
      if (liveStream) liveStream.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, needsPermission, onClose]);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(url);
    }, 'image/jpeg', 0.92);
  };

  if (needsPermission) {
    return (
      <MediaPermissionDialog
        isOpen
        mediaType="camera"
        onAlwaysAllow={() => {
          localStorage.setItem('camera_permission', 'always');
          setNeedsPermission(false);
        }}
        onAllowOnce={() => setNeedsPermission(false)}
        onDeny={onClose}
      />
    );
  }

  if (capturedUrl && capturedBlob) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/50">
          <h3 className="text-white font-semibold">Moment Preview</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <img src={capturedUrl} alt="Captured" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
        </div>
        <div className="p-4 bg-black/40 space-y-3">
          <SensitiveToggle value={isSensitive} onChange={setIsSensitive} />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCapturedBlob(null);
                setCapturedUrl(null);
              }}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white"
            >
              Retake
            </button>
            <button
              onClick={() => {
                onCapture(capturedBlob, isSensitive);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold"
            >
              <span className="inline-flex items-center gap-2">
                <Send className="w-4 h-4" /> Send
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h3 className="text-white font-semibold">Moment</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFacingMode((p) => (p === 'environment' ? 'user' : 'environment'))}
            className="px-3 py-2 rounded-full bg-white/10 text-white text-sm"
          >
            Flip
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex justify-center">
        <button onClick={capture} className="w-16 h-16 rounded-full bg-white shadow-lg" aria-label="Capture photo" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export function DocumentAttachment({
  onSelect,
  onClose,
}: {
  onSelect: (file: File, isSensitive: boolean) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [needsPermission, setNeedsPermission] = useState(() => localStorage.getItem('documents_permission') !== 'always');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [isSensitive, setIsSensitive] = useState(false);
  const [docs, setDocs] = useState<Array<{ id: string; title: string; file_url: string; file_name: string }>>([]);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    if (!showDocs || !user) return;
    const load = async () => {
      const { data } = await db
        .from('documents')
        .select('id, title, file_url, file_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setDocs((data || []) as Array<{ id: string; title: string; file_url: string; file_name: string }>);
    };
    void load();
  }, [showDocs, user]);

  if (needsPermission) {
    return (
      <MediaPermissionDialog
        isOpen
        mediaType="documents"
        onAlwaysAllow={() => {
          localStorage.setItem('documents_permission', 'always');
          setNeedsPermission(false);
        }}
        onAllowOnce={() => setNeedsPermission(false)}
        onDeny={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end">
      <div className="w-full bg-[#111827] rounded-t-3xl border-t border-white/10 p-5 space-y-4 max-h-[80vh]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">Send document</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDocs(false)}
            className={cn('flex-1 py-2 rounded-xl text-sm', !showDocs ? 'bg-[#7C3AED] text-white' : 'bg-white/10 text-slate-300')}
          >
            Upload
          </button>
          <button
            onClick={() => setShowDocs(true)}
            className={cn('flex-1 py-2 rounded-xl text-sm', showDocs ? 'bg-[#7C3AED] text-white' : 'bg-white/10 text-slate-300')}
          >
            My Docs
          </button>
        </div>

        {!showDocs ? (
          <div className="space-y-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-semibold"
            >
              Pick a file
            </button>
            {pickedFile && (
              <div className="rounded-xl border border-white/10 p-3 bg-white/5">
                <p className="text-white text-sm truncate">{pickedFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(pickedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            )}
            <SensitiveToggle value={isSensitive} onChange={setIsSensitive} />
            <button
              onClick={() => {
                if (!pickedFile) {
                  toast.error('Choose a file first');
                  return;
                }
                onSelect(pickedFile, isSensitive);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-white/10 text-white disabled:opacity-50"
              disabled={!pickedFile}
            >
              Send selected file
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
            {docs.length === 0 ? (
              <p className="text-slate-400 text-sm">No saved docs found.</p>
            ) : (
              docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10"
                >
                  <p className="text-white text-sm truncate">{doc.title || doc.file_name}</p>
                  <p className="text-slate-400 text-xs truncate mt-1">{doc.file_name}</p>
                </a>
              ))
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPickedFile(file);
          }}
        />
      </div>
    </div>
  );
}

type DrawPoint = { x: number; y: number };
type Stroke = { color: string; width: number; points: DrawPoint[] };

export function DrawingAttachment({
  onSubmit,
  onClose,
}: {
  onSubmit: (blob: Blob) => void;
  onClose: () => void;
}) {
  return (
    <SmartDrawCanvas
      onSubmit={(blob, exportType) => {
        onSubmit(blob);
      }}
      onClose={onClose}
      initialMood="creative"
    />
  );
}

export function PollAttachment({
  onSubmit,
  onClose,
}: {
  onSubmit: (poll: { question: string; options: string[] }) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const trimmedOptions = useMemo(() => options.map((o) => o.trim()).filter(Boolean), [options]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[#111827] rounded-t-3xl p-5 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">Create Poll</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Poll question"
          className="w-full rounded-xl px-3 py-2 bg-white/5 border border-white/10 text-white outline-none"
        />

        {options.map((option, index) => (
          <input
            key={index}
            value={option}
            onChange={(e) => {
              const next = [...options];
              next[index] = e.target.value;
              setOptions(next);
            }}
            placeholder={`Option ${index + 1}`}
            className="w-full rounded-xl px-3 py-2 bg-white/5 border border-white/10 text-white outline-none"
          />
        ))}

        {options.length < 5 && (
          <button onClick={() => setOptions((prev) => [...prev, ''])} className="text-sm text-purple-300 hover:text-purple-200">
            + Add option
          </button>
        )}

        <button
          onClick={() => {
            if (!question.trim() || trimmedOptions.length < 2) {
              toast.error('Add a question and at least 2 options');
              return;
            }
            onSubmit({ question: question.trim(), options: trimmedOptions });
            onClose();
          }}
          className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-semibold"
        >
          Send Poll
        </button>
      </div>
    </div>
  );
}

export function LocationAttachment({
  onSubmit,
  onClose,
}: {
  onSubmit: (location: { latitude: number; longitude: number; address: string }) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const shareCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onSubmit({
          latitude,
          longitude,
          address: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
        });
        setLoading(false);
        onClose();
      },
      () => {
        setLoading(false);
        toast.error('Unable to access location');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[#111827] rounded-t-3xl p-5 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">Share Location</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-sm text-slate-300">Send your current location in this chat.</p>

        <button
          onClick={shareCurrentLocation}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Getting location...' : 'Use current location'}
        </button>
      </div>
    </div>
  );
}
