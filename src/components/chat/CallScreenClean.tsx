import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, VideoOff, Video, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CallScreenCleanProps {
  open: boolean;
  onClose: () => void;
  callerName: string;
  callerAvatar?: string;
  isVideo: boolean;
  isIncoming?: boolean;
}

/**
 * WhatsApp / Telegram-style clean call UI.
 * Minimalist design: no gradients, no heavy effects, just focused UX.
 * Focus: clarity, responsiveness, proper spacing.
 */
export function CallScreenClean({
  open,
  onClose,
  callerName,
  callerAvatar,
  isVideo,
  isIncoming,
}: CallScreenCleanProps) {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended' | 'no-response'>(
    'connecting'
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const timerRef = useRef<number | null>(null);
  const noResponseTimerRef = useRef<number | null>(null);
  const connectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('connecting');
    setDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsSpeaker(false);

    connectTimerRef.current = window.setTimeout(() => {
      setStatus('ringing');

      if (!isIncoming) {
        window.setTimeout(() => {
          setStatus('connected');
        }, 2400);

        noResponseTimerRef.current = window.setTimeout(() => {
          setStatus((prev) => (prev === 'ringing' ? 'no-response' : prev));
        }, 18000);
      } else {
        noResponseTimerRef.current = window.setTimeout(() => {
          setStatus((prev) => (prev === 'ringing' ? 'no-response' : prev));
        }, 18000);
      }
    }, 800);

    return () => {
      if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
      if (noResponseTimerRef.current) window.clearTimeout(noResponseTimerRef.current);
    };
  }, [open, isIncoming]);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'no-response') return;
    const closeTimer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(closeTimer);
  }, [status, onClose]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const endCall = () => {
    setStatus('ended');
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
    if (noResponseTimerRef.current) window.clearTimeout(noResponseTimerRef.current);
    setTimeout(onClose, 1200);
  };

  const acceptCall = () => {
    if (noResponseTimerRef.current) window.clearTimeout(noResponseTimerRef.current);
    setStatus('connected');
  };

  const retryCall = () => {
    setStatus('connecting');
    setDuration(0);
    if (noResponseTimerRef.current) window.clearTimeout(noResponseTimerRef.current);
    if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);

    connectTimerRef.current = window.setTimeout(() => {
      setStatus('ringing');
      noResponseTimerRef.current = window.setTimeout(() => {
        setStatus((prev) => (prev === 'ringing' ? 'no-response' : prev));
      }, 18000);
      if (!isIncoming) {
        window.setTimeout(() => setStatus('connected'), 2400);
      }
    }, 800);
  };

  if (!open) return null;

  const callType = isVideo ? 'Video Call' : 'Voice Call';
  const statusLabel =
    status === 'connecting'
      ? 'Connecting...'
      : status === 'ringing'
      ? isIncoming
        ? 'Incoming call'
        : 'Calling...'
      : status === 'connected'
      ? 'Connected'
      : status === 'no-response'
      ? 'User did not respond'
      : 'Call ended';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black text-white animate-in fade-in duration-300">
      {/* Top Info Section */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center py-12 md:py-16" style={{ paddingTop: 'max(3rem, calc(1rem + env(safe-area-inset-top)))' }}>
        <h2 className="text-2xl md:text-3xl font-semibold mb-2">{callerName}</h2>
        <p className="text-sm md:text-base text-white/70 mb-1">{callType}</p>
        <p className="text-xs md:text-sm text-white/50">{statusLabel}</p>
        {status === 'connected' && (
          <p className="text-base md:text-lg font-medium text-white/80 mt-3">{formatTime(duration)}</p>
        )}
      </div>

      {/* Center - Avatar / Video Area */}
      <div className="flex-1 flex items-center justify-center px-6">
        {isVideo && !isVideoOff ? (
          <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden border border-white/10">
            <Avatar className="h-32 w-32">
              <AvatarImage src={callerAvatar} />
              <AvatarFallback className="bg-slate-700 text-4xl text-white">{callerName?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <Avatar className="h-28 w-28 md:h-32 md:w-32 border-2 border-white/20">
              <AvatarImage src={callerAvatar} />
              <AvatarFallback className="bg-slate-800 text-5xl text-white/90">{callerName?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Controls - Bottom Section */}
      <div className="flex-shrink-0 pb-8 md:pb-12 px-6" style={{ paddingBottom: 'max(2rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}>
        {status === 'ringing' && isIncoming ? (
          <div className="flex items-center justify-center gap-6 md:gap-12">
            <button
              onClick={endCall}
              className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-lg active:scale-95 transition-transform"
            >
              <PhoneOff className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </button>
            <button
              onClick={acceptCall}
              className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg active:scale-95 transition-transform animate-pulse"
            >
              <Phone className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </button>
          </div>
        ) : status === 'no-response' ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-sm md:text-base text-white/80">User did not respond. Try after some moment.</p>
            <button
              onClick={retryCall}
              className="px-6 py-2.5 md:py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95">
                  {isMuted ? (
                    <MicOff className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  ) : (
                    <Mic className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  )}
                </div>
                <span className="text-xs md:text-sm text-white/70">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                onClick={() => setIsSpeaker(!isSpeaker)}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95">
                  {isSpeaker ? (
                    <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  ) : (
                    <VolumeX className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  )}
                </div>
                <span className="text-xs md:text-sm text-white/70">{isSpeaker ? 'Speaker' : 'Earpiece'}</span>
              </button>

              {isVideo && (
                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className="flex flex-col items-center gap-2.5 group"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95">
                    {isVideoOff ? (
                      <VideoOff className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    ) : (
                      <Video className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    )}
                  </div>
                  <span className="text-xs md:text-sm text-white/70">{isVideoOff ? 'Cam Off' : 'Camera'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-center">
              <button
                onClick={endCall}
                className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 hover:bg-red-600 shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
