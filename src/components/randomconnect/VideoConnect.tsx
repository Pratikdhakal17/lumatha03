import React, { useState, useEffect, useCallback } from 'react';
import { SkipForward, Eye, EyeOff, Camera, CameraOff, Mic, MicOff, Clock, Subtitles, Flag, Video, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSecurityDetection } from '@/hooks/useSecurityDetection';
import { useDailyCall } from '@/hooks/useDailyCall';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { toast } from 'sonner';
import { ReportDialog } from './ReportDialog';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';

interface VideoConnectProps {
  myPseudoName: string;
  partnerPseudoName: string;
  conversationStarter: string;
  onSkip: () => void;
  onViolation?: (type: 'screenshot' | 'recording') => void;
  onReport?: (reason: string) => void;
  sessionId?: string;
  partnerId?: string;
}

const MAX_VIDEO_DURATION = 15 * 60;
const MANDATORY_STAY_SECONDS = 20;

export const VideoConnect: React.FC<VideoConnectProps> = ({
  myPseudoName,
  partnerPseudoName,
  conversationStarter,
  onSkip,
  onViolation,
  onReport,
  sessionId,
  partnerId
}) => {
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [duration, setDuration] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [timeWarningShown, setTimeWarningShown] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Security detection
  useSecurityDetection({
    enabled: true,
    onScreenshotDetected: () => onViolation?.('screenshot'),
    onRecordingDetected: () => onViolation?.('recording')
  });

  // Daily.co call
  const {
    isConnected,
    isMicOn,
    isCameraOn,
    hasRemoteParticipant,
    localVideoRef,
    remoteVideoRef,
    callObjectRef,
    toggleMic,
    toggleCamera,
    leave,
  } = useDailyCall({
    sessionId: undefined,
    mode: 'video',
    myPseudoName,
    onPartnerJoined: () => {},
    onPartnerLeft: () => {
      toast.info('Partner left. Returning to lobby...');
      onSkip();
    },
    onError: (msg) => {
      if (msg === 'daily-account-payment') {
        setUseAgora(true);
        toast.info('Daily unavailable; falling back to Agora for video');
        return;
      }
      toast.error(msg);
    },
  });

  const [useAgora, setUseAgora] = useState(false);
  const {
    isConnected: agoraConnected,
    isMicOn: agoraMicOn,
    isCameraOn: agoraCameraOn,
    hasRemoteParticipant: agoraHasRemote,
    localVideoRef: agoraLocalVideoRef,
    remoteVideoRef: agoraRemoteVideoRef,
    toggleMic: agoraToggleMic,
    toggleCamera: agoraToggleCamera,
    leave: agoraLeave,
  } = useAgoraCall({ channel: useAgora ? sessionId : undefined, mode: 'video', uid: undefined, onPartnerLeft: () => { toast.info('Partner left. Returning to lobby...'); onSkip(); }, onError: (m) => toast.error(m) });

  const activeIsConnected = useAgora ? agoraConnected : isConnected;
  const activeIsMicOn = useAgora ? agoraMicOn : isMicOn;
  const activeIsCameraOn = useAgora ? agoraCameraOn : isCameraOn;
  const activeHasRemote = useAgora ? agoraHasRemote : hasRemoteParticipant;
  const activeLocalVideoRef = useAgora ? agoraLocalVideoRef : localVideoRef;
  const activeRemoteVideoRef = useAgora ? agoraRemoteVideoRef : remoteVideoRef;
  const activeToggleMic = useAgora ? agoraToggleMic : toggleMic;
  const activeToggleCamera = useAgora ? agoraToggleCamera : toggleCamera;
  const activeLeave = useAgora ? agoraLeave : leave;

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Enable skip after mandatory stay
  useEffect(() => {
    if (duration >= MANDATORY_STAY_SECONDS && !canSkip) setCanSkip(true);
  }, [duration, canSkip]);

  // Time limit
  useEffect(() => {
    if (duration >= MAX_VIDEO_DURATION - 60 && !timeWarningShown) {
      setTimeWarningShown(true);
      toast.warning('1 minute remaining in this video session');
    }
    if (duration >= MAX_VIDEO_DURATION) {
      toast.info('Video session limit reached (15 minutes)');
      leave().then(() => onSkip());
    }
  }, [duration, timeWarningShown, onSkip, leave]);

  // Live captions
  useEffect(() => {
    if (!captionsEnabled) { setCurrentCaption(''); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Live captions not supported'); setCaptionsEnabled(false); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setCurrentCaption(t.slice(-100));
    };
    recognition.onerror = () => setCurrentCaption('');
    recognition.start();
    return () => recognition.stop();
  }, [captionsEnabled]);

  // Cleanup on skip
  const handleSkip = useCallback(() => {
    leave().then(() => onSkip());
  }, [leave, onSkip]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const getRemainingTime = () => formatDuration(Math.max(0, MAX_VIDEO_DURATION - duration));

  const handleReport = (reason: string) => {
    onReport?.(reason);
    setShowReportDialog(false);
    toast.success('Report submitted. Thank you for keeping the community safe.');
  };

  return (
    <div className="flex flex-col items-center min-h-screen sm:min-h-[85vh] p-3 sm:p-2 random-connect-protected" style={{
      paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
      paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
      paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
    }}>
      {/* Connection Status - Mobile optimized */}
      <div className="w-full max-w-lg flex items-center justify-center mb-3 sm:mb-2">
        {activeIsConnected && activeHasRemote ? (
          <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ Face-to-face active • Both can see and hear each other
            </p>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">Connecting...</p>
          </div>
        )}
      </div>

      {/* Main Split Screen Video - Responsive */}
      <div className="relative flex-1 w-full max-w-lg rounded-2xl overflow-hidden bg-muted shadow-lg">
        {/* Partner Video - Top Half (55%) */}
        <div className="absolute top-0 left-0 right-0 h-[55%] bg-gradient-to-b from-card to-muted border-b-2 border-background">
          <video
            ref={activeRemoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${blurEnabled ? 'blur-xl' : ''}`}
          />

          {!activeHasRemote && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mb-3">
                <Video className="w-8 h-8 text-secondary/60 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-secondary">{partnerPseudoName}</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting for partner's video...</p>
            </div>
          )}

          {activeHasRemote && (
            <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black/70 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm max-w-[calc(100%-1rem)]">
              <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 shrink-0" />
              <p className="font-medium text-white truncate">{partnerPseudoName}</p>
              <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500 ml-0.5 sm:ml-1 shrink-0" />
            </div>
          )}
        </div>

        {/* My Video - Bottom Half (45%) */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-card to-muted">
          <video
            ref={activeLocalVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${blurEnabled ? 'blur-lg' : ''}`}
          />

          {!activeIsCameraOn && (
            <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center">
              <CameraOff className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Camera Off</p>
            </div>
          )}

          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black/70 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm max-w-[calc(100%-1rem)]">
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <p className="font-medium text-primary truncate">You</p>
          </div>
        </div>

        {/* Timer - Mobile centered */}
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black/70 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-lg text-xs sm:text-sm">
            <ConnectionQualityIndicator callObject={callObjectRef.current} isConnected={activeIsConnected} />
            <p className="font-semibold text-white">{formatDuration(duration)}</p>
            <span className="text-muted-foreground">|</span>
            <Clock className="w-3 h-3 text-muted-foreground" />
            <p className="text-muted-foreground">{getRemainingTime()}</p>
          </div>
        </div>

        {/* Controls - Right Side - Mobile optimized */}
        <div className="absolute top-14 sm:top-16 right-2 sm:right-3 flex flex-col gap-2 z-20">
          <button onClick={() => setBlurEnabled(!blurEnabled)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md">
            {blurEnabled ? <EyeOff className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" /> : <Eye className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />}
          </button>

          <button onClick={activeToggleCamera}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md ${activeIsCameraOn ? 'bg-black/70' : 'bg-red-600/90'}`}>
            {activeIsCameraOn ? <Camera className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" /> : <CameraOff className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />}
          </button>

          <button onClick={activeToggleMic}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md ${activeIsMicOn ? 'bg-black/70' : 'bg-red-600/90'}`}>
            {activeIsMicOn ? <Mic className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" /> : <MicOff className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />}
          </button>

          <button onClick={() => setCaptionsEnabled(!captionsEnabled)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md ${captionsEnabled ? 'bg-primary/90' : 'bg-black/70'}`}>
            <Subtitles className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${captionsEnabled ? 'text-white' : 'text-white'}`} />
          </button>

          <button onClick={() => setShowReportDialog(true)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-transform shadow-md">
            <Flag className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-red-400" />
          </button>
        </div>

        {/* Live Captions */}
        {captionsEnabled && currentCaption && (
          <div className="absolute bottom-[46%] left-2 right-2 sm:left-3 sm:right-3 z-20">
            <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg mx-auto max-w-xs">
              <p className="text-white text-xs sm:text-sm text-center leading-snug">{currentCaption}</p>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Starter */}
      {activeIsConnected && (
        <div className="glass-card px-4 py-2 rounded-xl text-center max-w-sm mt-3 sm:mt-3 text-xs sm:text-sm">
          <p className="text-muted-foreground">💬 "{conversationStarter}"</p>
        </div>
      )}

      {/* Skip Button - Touch friendly */}
      <div className="mt-4 w-full max-w-sm px-1">
        {!canSkip && (
          <p className="text-center text-xs text-muted-foreground mb-2">
            ⏱️ Skip available in {Math.max(0, MANDATORY_STAY_SECONDS - duration)}s
          </p>
        )}
        <Button onClick={handleSkip} variant="outline" disabled={!canSkip}
          className="w-full gap-2 py-3 sm:py-4 md:py-6 rounded-xl transition-all hover:scale-105 active:scale-95 touch-target-44 text-sm sm:text-base font-semibold">
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          {canSkip ? 'Skip to Next Person' : `Wait ${Math.max(0, MANDATORY_STAY_SECONDS - duration)}s...`}
        </Button>
      </div>

      {/* Remote audio element */}
      <audio id="remote-audio" autoPlay style={{ display: 'none' }} />

      <ReportDialog open={showReportDialog} onClose={() => setShowReportDialog(false)} onReport={handleReport} />
    </div>
  );
};
