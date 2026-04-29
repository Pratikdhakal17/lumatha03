import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SkipForward, Volume2, VolumeX, Mic, MicOff, Flag, Subtitles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAmbientSounds } from '@/hooks/useAmbientSounds';
import { AmbientSoundSelector } from './AmbientSoundSelector';
import { useSecurityDetection } from '@/hooks/useSecurityDetection';
import { useDailyCall } from '@/hooks/useDailyCall';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { ReportDialog } from './ReportDialog';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { toast } from 'sonner';

interface AudioConnectProps {
  myPseudoName: string;
  partnerPseudoName: string;
  conversationStarter: string;
  onSkip: () => void;
  onViolation?: (type: 'screenshot' | 'recording') => void;
  onReport?: (reason: string) => void;
  sessionId?: string;
  partnerId?: string;
}

const MANDATORY_STAY_SECONDS = 20;

export const AudioConnect: React.FC<AudioConnectProps> = ({
  myPseudoName,
  partnerPseudoName,
  conversationStarter,
  onSkip,
  onViolation,
  onReport,
  sessionId,
  partnerId
}) => {
  const [myVoiceLevel, setMyVoiceLevel] = useState(0);
  const [partnerVoiceLevel, setPartnerVoiceLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [roadPosition, setRoadPosition] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);

  const animationFrameRef = useRef<number | null>(null);

  const { currentSound, volume, isPlaying, playSound, updateVolume } = useAmbientSounds();

  useSecurityDetection({
    enabled: true,
    onScreenshotDetected: () => onViolation?.('screenshot'),
    onRecordingDetected: () => onViolation?.('recording')
  });

  // Agora fallback
  const [useAgora, setUseAgora] = useState(false);

  // Daily.co call (audio-only)
  const {
    isConnected,
    isMicOn,
    hasRemoteParticipant,
    remoteAudioRef,
    callObjectRef,
    toggleMic,
    leave,
  } = useDailyCall({
    sessionId: useAgora ? undefined : sessionId,
    mode: 'audio',
    myPseudoName,
    onPartnerJoined: () => {},
    onPartnerLeft: () => {
      toast.info('Partner left. Returning to lobby...');
      onSkip();
    },
    onError: (msg) => {
      if (msg === 'daily-account-payment') {
        // signal fallback to Agora
        setUseAgora(true);
        toast.info('Daily unavailable; falling back to Agora for call');
        return;
      }
      toast.error(msg);
    },
  });

  // Agora fallback
  const {
    isConnected: agoraConnected,
    isMicOn: agoraMicOn,
    hasRemoteParticipant: agoraHasRemote,
    remoteAudioRef: agoraRemoteAudioRef,
    localVideoRef: agoraLocalVideoRef,
    callObjectRef: agoraCallRef,
    toggleMic: agoraToggleMic,
    leave: agoraLeave,
  } = useAgoraCall({ channel: useAgora ? sessionId : undefined, mode: 'audio', uid: undefined, onPartnerLeft: () => { toast.info('Partner left. Returning to lobby...'); onSkip(); }, onError: (m) => toast.error(m) });

  // Choose active values
  const activeIsConnected = useAgora ? agoraConnected : isConnected;
  const activeIsMicOn = useAgora ? agoraMicOn : isMicOn;
  const activeHasRemote = useAgora ? agoraHasRemote : hasRemoteParticipant;
  const activeRemoteAudioRef = useAgora ? agoraRemoteAudioRef : remoteAudioRef;
  const activeToggleMic = useAgora ? agoraToggleMic : toggleMic;
  const activeLeave = useAgora ? agoraLeave : leave; // Ensure voice update consistent
  const activeCallRef = useAgora ? agoraCallRef : callObjectRef;

  // Road animation
  useEffect(() => {
    const id = setInterval(() => setRoadPosition(p => (p + 1) % 100), 50);
    return () => clearInterval(id);
  }, []);

  // Skip timer
  useEffect(() => {
    if (duration >= MANDATORY_STAY_SECONDS && !canSkip) setCanSkip(true);
  }, [duration, canSkip]);

  // Duration timer
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Voice level simulation (visual feedback)
  useEffect(() => {
    const update = () => {
      if (activeIsMicOn) setMyVoiceLevel(Math.random() * 60 + 10); // Use activeLeave in skip handler
      else setMyVoiceLevel(0);
      if (activeHasRemote) setPartnerVoiceLevel(Math.random() * 60 + 10);
      else setPartnerVoiceLevel(0);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [activeIsMicOn, activeHasRemote]);

  // Live Captions
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

  const handleSkip = useCallback(() => {
    activeLeave().then(() => onSkip());
  }, [activeLeave, onSkip]);

  const toggleSpeaker = useCallback(() => {
    if (activeRemoteAudioRef.current) {
      activeRemoteAudioRef.current.muted = !activeRemoteAudioRef.current.muted;
      setIsSpeakerOn(!activeRemoteAudioRef.current.muted);
    }
  }, [activeRemoteAudioRef]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleReport = (reason: string) => {
    onReport?.(reason);
    setShowReportDialog(false);
    toast.success('Report submitted.');
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen sm:min-h-[85vh] p-3 sm:p-4 random-connect-protected" style={{
      paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
      paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
      paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
    }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2">
            <div className="bg-black/70 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-2 shadow-md text-xs sm:text-sm">
            <ConnectionQualityIndicator callObject={activeCallRef?.current} isConnected={activeIsConnected} />
            <p className="font-medium text-white">{formatDuration(duration)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setCaptionsEnabled(!captionsEnabled)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md ${captionsEnabled ? 'bg-primary/90' : 'bg-black/70'}`}>
            <Subtitles className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${captionsEnabled ? 'text-white' : 'text-white'}`} />
          </button>
          <AmbientSoundSelector currentSound={currentSound} volume={volume} isPlaying={isPlaying} onSelectSound={playSound} onVolumeChange={updateVolume} compact />
        </div>
      </div>

      {/* Connection Status - Mobile responsive */}
      {activeIsConnected && activeHasRemote ? (
        <div className="glass-card px-3 sm:px-4 py-2 rounded-xl text-center max-w-sm mb-2">
          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Voice call active • Both can speak and hear each other
          </p>
        </div>
      ) : (
        <div className="glass-card px-3 sm:px-4 py-2 rounded-xl text-center max-w-sm mb-2">
          <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 animate-pulse">Connecting audio...</p>
        </div>
      )}

      {/* Conversation Starter - Mobile responsive */}
      {activeIsConnected && (
        <div className="glass-card px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-center max-w-sm text-xs sm:text-sm">
          <p className="text-xs text-muted-foreground mb-1">💬 Start with this:</p>
          <p className="text-sm text-foreground italic">"{conversationStarter}"</p>
        </div>
      )}

      {/* Car Interior UI - Responsive aspect ratio */}
      <div className="relative w-full max-w-md aspect-video sm:aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl mt-2 sm:mt-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-card">
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col gap-6 opacity-30"
            style={{ transform: `translateX(-50%) translateY(${roadPosition}px)` }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1 h-8 bg-muted-foreground/50 rounded-full" />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-card via-card/95 to-transparent rounded-t-[1.5rem] sm:rounded-t-[2rem]">
          <div className="flex justify-around items-center h-full px-4 sm:px-6 pt-6 sm:pt-8">
            {/* You */}
            <div className="absolute -top-2 w-20 sm:w-24 h-24 sm:h-28 bg-muted/30 rounded-t-full rounded-b-lg -z-10" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center border-2 border-primary/20"
              style={{
                boxShadow: activeIsMicOn ? `0 0 ${myVoiceLevel / 2}px ${myVoiceLevel / 3}px hsl(var(--primary) / ${Math.min(0.6, myVoiceLevel / 100)})` : 'none',
                transform: activeIsMicOn ? `scale(${1 + myVoiceLevel / 300})` : 'scale(1)'
              }}>
              {activeIsMicOn ? <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> : <MicOff className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />}
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm font-bold text-primary max-w-[60px] truncate">{myPseudoName.split('-')[0]}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">You</p>
            </div>
            <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: activeIsMicOn ? `${myVoiceLevel}%` : '0%' }} />
            </div>
          </div>

          {/* Connection Line */}
          <div className="flex flex-col items-center gap-1 sm:gap-2 -mt-6 sm:-mt-8">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${activeIsConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse shadow-lg`} />
            <div className="w-px h-12 sm:h-20 bg-gradient-to-b from-primary/30 via-muted to-secondary/30" />
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${activeIsConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse shadow-lg`} />
          </div>

          {/* Partner */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 relative">
            <div className="absolute -top-2 w-20 sm:w-24 h-24 sm:h-28 bg-muted/30 rounded-t-full rounded-b-lg -z-10" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center border-2 border-secondary/20"
              style={{
                boxShadow: activeHasRemote ? `0 0 ${partnerVoiceLevel / 2}px ${partnerVoiceLevel / 3}px hsl(var(--secondary) / ${Math.min(0.6, partnerVoiceLevel / 100)})` : 'none',
                transform: activeHasRemote ? `scale(${1 + partnerVoiceLevel / 300})` : 'scale(1)'
              }}>
              <Volume2 className={`w-6 h-6 sm:w-8 sm:h-8 ${activeHasRemote ? 'text-secondary' : 'text-muted-foreground'}`} />
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm font-bold text-secondary max-w-[60px] truncate">{partnerPseudoName.split('-')[0]}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Partner</p>
            </div>
            <div className="w-16 sm:w-20 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full transition-all duration-75" style={{ width: activeHasRemote ? `${partnerVoiceLevel}%` : '0%' }} />
            </div>
          </div>
        </div>

        {captionsEnabled && currentCaption && (
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-20">
            <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg mx-auto max-w-xs">
              <p className="text-white text-xs sm:text-sm text-center leading-snug">{currentCaption}</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons - Mobile optimized */}
      <div className="flex items-center gap-3 sm:gap-4 mt-4">
        <button onClick={activeToggleMic}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg ${activeIsMicOn ? 'bg-primary text-primary-foreground' : 'bg-red-600 text-white'}`}>
          {activeIsMicOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <button onClick={toggleSpeaker}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg ${isSpeakerOn ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {isSpeakerOn ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <button onClick={() => setShowReportDialog(true)}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-muted flex items-center justify-center hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-transform">
          <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Skip - Touch friendly */}
      <div className="w-full max-w-sm mt-4 px-1">
        {!canSkip && (
          <p className="text-center text-xs text-muted-foreground mb-2">
            ⏱️ Skip available in {Math.max(0, MANDATORY_STAY_SECONDS - duration)}s
          </p>
        )}
        <Button onClick={handleSkip} variant="outline" disabled={!canSkip} className="w-full gap-2 py-3 sm:py-4 md:py-5 rounded-xl touch-target-44 text-sm sm:text-base font-semibold hover:scale-105 active:scale-95 transition-transform">
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          {canSkip ? 'Skip to Next Person' : `Wait ${Math.max(0, MANDATORY_STAY_SECONDS - duration)}s...`}
        </Button>
      </div>

      <ReportDialog open={showReportDialog} onClose={() => setShowReportDialog(false)} onReport={handleReport} />
    </div>
  );
};
