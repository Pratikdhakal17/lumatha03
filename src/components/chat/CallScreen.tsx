import { useState, useEffect, useRef } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  VolumeX,
  Bluetooth,
  Sparkles,
  Wifi,
  RefreshCcw,
  Camera,
  ArrowLeftRight,
  Circle,
  Monitor,
  SlidersHorizontal,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CallScreenProps {
  open: boolean;
  onClose: () => void;
  callerName: string;
  callerAvatar?: string;
  isVideo: boolean;
  isIncoming?: boolean;
}

export function CallScreen({ open, onClose, callerName, callerAvatar, isVideo, isIncoming }: CallScreenProps) {
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended' | 'no-response'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isBluetooth, setIsBluetooth] = useState(false);
  const [isHd, setIsHd] = useState(true);
  const [isLowBandwidthMode, setIsLowBandwidthMode] = useState(false);
  const [isBackgroundBlur, setIsBackgroundBlur] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isNoiseSuppression] = useState(true);
  const [isEchoCancellation] = useState(true);
  const [isAutoGain] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [selfViewPos, setSelfViewPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingSelfView, setIsDraggingSelfView] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
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
    setIsBluetooth(false);
    setIsHd(true);
    setIsLowBandwidthMode(false);
    setIsBackgroundBlur(false);
    setIsScreenSharing(false);
    setIsFrontCamera(true);

    connectTimerRef.current = window.setTimeout(() => {
      setStatus('ringing');

      if (!isIncoming) {
        // Outgoing mock flow: connect after short ring while still supporting no-response fallback.
        window.setTimeout(() => {
          setStatus('connected');
        }, 2600);

        noResponseTimerRef.current = window.setTimeout(() => {
          setStatus((prev) => (prev === 'ringing' ? 'no-response' : prev));
        }, 18000);

      }

      noResponseTimerRef.current = window.setTimeout(() => {
        setStatus((prev) => (prev === 'ringing' ? 'no-response' : prev));
      }, 18000);
    }, 900);

    return () => {
      if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
      if (noResponseTimerRef.current) window.clearTimeout(noResponseTimerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'connected') return;

    const networkTimer = window.setInterval(() => {
      const samples: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'good', 'fair', 'poor'];
      const pick = samples[Math.floor(Math.random() * samples.length)];
      setNetworkQuality(isLowBandwidthMode ? (pick === 'excellent' ? 'good' : pick) : pick);
    }, 4200);

    const speakingTimer = window.setInterval(() => {
      if (isMuted) {
        setIsRemoteSpeaking(false);
        return;
      }
      setIsRemoteSpeaking(Math.random() > 0.55);
    }, 1200);

    return () => {
      window.clearInterval(networkTimer);
      window.clearInterval(speakingTimer);
    };
  }, [status, isMuted, isLowBandwidthMode]);

  useEffect(() => {
    if (status !== 'no-response') return;
    const closeTimer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(closeTimer);
  }, [status, onClose]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const endCall = () => {
    setStatus('ended');
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current);
    if (noResponseTimerRef.current) window.clearTimeout(noResponseTimerRef.current);
    setTimeout(onClose, 1500);
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
        window.setTimeout(() => setStatus('connected'), 2600);
      }
    }, 900);
  };

  const onSelfViewPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setIsDraggingSelfView(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onSelfViewPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingSelfView) return;
    const width = 120;
    const height = 172;
    const maxX = Math.max(0, window.innerWidth - width - 14);
    const maxY = Math.max(0, window.innerHeight - height - 100);

    const nextX = Math.min(Math.max(0, event.clientX - dragOffsetRef.current.x), maxX);
    const nextY = Math.min(Math.max(0, event.clientY - dragOffsetRef.current.y), maxY);

    setSelfViewPos({ x: nextX, y: nextY });
  };

  const onSelfViewPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    setIsDraggingSelfView(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!open) return null;

  const callTypeLabel = isVideo ? 'Video Call' : 'Voice Call';
  const statusText =
    status === 'connecting'
      ? 'Connecting...'
      : status === 'ringing'
      ? isIncoming
        ? 'Incoming call...'
        : 'Ringing...'
      : status === 'connected'
      ? 'Connected'
      : status === 'no-response'
      ? 'User did not respond. Try after some moment.'
      : 'Call ended';

  const networkTone =
    networkQuality === 'excellent'
      ? 'text-emerald-300'
      : networkQuality === 'good'
      ? 'text-cyan-300'
      : networkQuality === 'fair'
      ? 'text-amber-300'
      : 'text-rose-300';

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden text-white animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b1223_0%,#0f1c37_35%,#1c2551_72%,#24245f_100%)]" />
      <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute bottom-0 right-[-8%] h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,.42) 1px, transparent 0)',
          backgroundSize: '3px 3px',
        }}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3 md:px-6" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-xl">
            <p className="text-xs font-semibold tracking-[0.24em] text-white/90">LUMATHA</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-xl">
            <Wifi className={cn('h-3.5 w-3.5', networkTone)} />
            <span className={cn('text-xs capitalize', networkTone)}>{networkQuality}</span>
          </div>
        </div>

        <div className="px-4 md:px-6">
          <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className={cn('h-12 w-12 ring-2 ring-cyan-300/35', (status === 'ringing' || isRemoteSpeaking) && 'animate-pulse')}>
                  <AvatarImage src={callerAvatar} />
                  <AvatarFallback className="bg-cyan-500/20 text-lg font-semibold text-white">{callerName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0f1c37] bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{callerName}</p>
                <p className="text-xs text-white/75">{callTypeLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70">{status === 'connected' ? formatTime(duration) : '00:00'}</p>
                <p className="text-[11px] text-white/55">{statusText}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex-1 px-4 pb-4 md:px-6">
          <div className={cn('relative h-full overflow-hidden rounded-[30px] border border-white/10 bg-black/35 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm', isBackgroundBlur && 'after:pointer-events-none after:absolute after:inset-0 after:bg-white/5 after:backdrop-blur-md')}>
            {(status === 'ringing' || status === 'connecting') && (
              <>
                <div className="absolute left-1/2 top-[42%] h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute left-1/2 top-[42%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 animate-ping" style={{ animationDuration: '2.8s' }} />
              </>
            )}

            {isVideo && !isVideoOff ? (
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(125,211,252,0.35),transparent_42%),radial-gradient(circle_at_72%_76%,rgba(196,181,253,0.32),transparent_48%),linear-gradient(140deg,#0a172f,#182244_58%,#261e57)]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <Avatar className={cn('mx-auto h-24 w-24 ring-4 ring-cyan-300/30', isRemoteSpeaking && 'animate-pulse')}>
                    <AvatarImage src={callerAvatar} />
                    <AvatarFallback className="bg-cyan-500/30 text-3xl text-white">{callerName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="mt-3 text-sm font-medium text-white/95">{callerName}</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn('relative rounded-full p-2', isRemoteSpeaking && 'animate-pulse')}>
                  <Avatar className="h-28 w-28 ring-4 ring-cyan-300/25">
                    <AvatarImage src={callerAvatar} />
                    <AvatarFallback className="bg-cyan-500/25 text-4xl text-white">{callerName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <p className="mt-4 text-lg font-semibold">{callerName}</p>
                <p className="mt-1 text-xs text-white/70">Audio only mode</p>
              </div>
            )}

            {isVideo && !isVideoOff && (
              <div
                className={cn('absolute cursor-move select-none rounded-2xl border border-white/20 bg-slate-900/75 p-1.5 shadow-xl backdrop-blur-xl transition-transform', isDraggingSelfView ? 'scale-105' : 'scale-100')}
                style={{
                  top: selfViewPos.y || 14,
                  left: selfViewPos.x || undefined,
                  right: selfViewPos.x ? undefined : 14,
                  touchAction: 'none',
                }}
                onPointerDown={onSelfViewPointerDown}
                onPointerMove={onSelfViewPointerMove}
                onPointerUp={onSelfViewPointerUp}
              >
                <div className="h-[152px] w-[108px] overflow-hidden rounded-xl bg-[linear-gradient(155deg,#0f172a,#1e293b_60%,#334155)]">
                  <div className="flex h-full items-end justify-between p-2">
                    <span className="rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90">You</span>
                    <span className="rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90">{isFrontCamera ? 'Front' : 'Back'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute left-3 top-3 rounded-xl border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-xl">
              {statusText}
            </div>

            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-xl">
              <Circle className={cn('h-2.5 w-2.5 fill-current', isRemoteSpeaking ? 'text-emerald-300 animate-pulse' : 'text-white/40')} />
              <span>{isRemoteSpeaking ? 'Speaking' : 'Listening'}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 md:px-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-2xl shadow-[0_10px_40px_rgba(8,15,35,0.5)]">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/75">
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1">Noise suppression {isNoiseSuppression ? 'on' : 'off'}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1">Echo cancel {isEchoCancellation ? 'on' : 'off'}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1">Auto gain {isAutoGain ? 'on' : 'off'}</span>
            </div>

            {status === 'ringing' && isIncoming ? (
              <div className="flex items-center justify-center gap-8 py-2">
                <button onClick={endCall} className="h-16 w-16 rounded-full bg-rose-500 shadow-lg shadow-rose-500/35 transition-transform active:scale-95">
                  <PhoneOff className="mx-auto h-7 w-7 text-white" />
                </button>
                <button onClick={acceptCall} className="h-16 w-16 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/35 transition-transform active:scale-95 animate-pulse">
                  <Phone className="mx-auto h-7 w-7 text-white" />
                </button>
              </div>
            ) : status === 'no-response' ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <p className="text-sm text-white/90">User did not respond. Try after some moment.</p>
                <button
                  onClick={retryCall}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <ControlBtn active={isMuted} onClick={() => setIsMuted((prev) => !prev)} icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />} label={isMuted ? 'Unmute' : 'Mute'} />
                  <ControlBtn active={isSpeaker} onClick={() => setIsSpeaker((prev) => !prev)} icon={isSpeaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />} label={isSpeaker ? 'Speaker' : 'Earpiece'} />
                  <ControlBtn active={isBluetooth} onClick={() => setIsBluetooth((prev) => !prev)} icon={<Bluetooth className="h-5 w-5" />} label="Bluetooth" />
                  {isVideo && (
                    <ControlBtn active={isVideoOff} onClick={() => setIsVideoOff((prev) => !prev)} icon={isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />} label={isVideoOff ? 'Cam Off' : 'Camera'} />
                  )}
                </div>

                {isVideo && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                    <ControlBtn active={!isFrontCamera} onClick={() => setIsFrontCamera((prev) => !prev)} icon={<ArrowLeftRight className="h-5 w-5" />} label="Flip" />
                    <ControlBtn active={isHd} onClick={() => setIsHd((prev) => !prev)} icon={<Camera className="h-5 w-5" />} label={isHd ? 'HD' : 'SD'} />
                    <ControlBtn active={isLowBandwidthMode} onClick={() => setIsLowBandwidthMode((prev) => !prev)} icon={<SlidersHorizontal className="h-5 w-5" />} label="Low data" />
                    <ControlBtn active={isBackgroundBlur} onClick={() => setIsBackgroundBlur((prev) => !prev)} icon={<Sparkles className="h-5 w-5" />} label="Blur BG" />
                    <ControlBtn active={isScreenSharing} onClick={() => setIsScreenSharing((prev) => !prev)} icon={<Monitor className="h-5 w-5" />} label="Share" />
                  </div>
                )}

                <div className="mt-4 flex justify-center">
                  <button onClick={endCall} className="h-[72px] w-[72px] rounded-full bg-rose-500 shadow-[0_14px_35px_rgba(244,63,94,0.48)] transition-transform active:scale-95">
                    <PhoneOff className="mx-auto h-8 w-8 text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="flex min-w-[68px] flex-col items-center gap-1.5 transition-transform active:scale-95">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border border-white/15 transition-colors",
        active ? "bg-cyan-400/25 text-white" : "bg-white/10 text-white/70"
      )}>
        {icon}
      </div>
      <span className="text-[10px] text-white/70">{label}</span>
    </button>
  );
}
