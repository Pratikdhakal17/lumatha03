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
    leave().then(() => onSkip());
  }, [leave, onSkip]);

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
    <div className="flex flex-col items-center justify-between min-h-[85vh] p-4 random-connect-protected">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
            <div className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-md">
            <ConnectionQualityIndicator callObject={activeCallRef?.current} isConnected={activeIsConnected} />
            <p className="text-sm font-medium text-foreground">{formatDuration(duration)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCaptionsEnabled(!captionsEnabled)}
            className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center hover:scale-105 shadow-md ${captionsEnabled ? 'bg-primary/90' : 'bg-background/80'}`}>
            <Subtitles className={`w-4 h-4 ${captionsEnabled ? 'text-white' : 'text-foreground'}`} />
          </button>
          <AmbientSoundSelector currentSound={currentSound} volume={volume} isPlaying={isPlaying} onSelectSound={playSound} onVolumeChange={updateVolume} compact />
        </div>
      </div>

      {/* Connection Status */}
      {activeIsConnected && activeHasRemote ? (
        <div className="glass-card px-4 py-2 rounded-xl text-center max-w-sm mb-2">
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Voice call active • Both can speak and hear each other
          </p>
        </div>
      ) : (
        <div className="glass-card px-4 py-2 rounded-xl text-center max-w-sm mb-2">
          <p className="text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">Connecting audio...</p>
        </div>
      )}

      {/* Conversation Starter */}
      {activeIsConnected && (
        <div className="glass-card px-5 py-3 rounded-2xl text-center max-w-sm">
          <p className="text-xs text-muted-foreground mb-1">💬 Start with this:</p>
          <p className="text-sm text-foreground italic">"{conversationStarter}"</p>
        </div>
      )}

      {/* Car Interior UI */}
      <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-card">
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col gap-6 opacity-30"
            style={{ transform: `translateX(-50%) translateY(${roadPosition}px)` }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1 h-8 bg-muted-foreground/50 rounded-full" />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-card via-card/95 to-transparent rounded-t-[2rem]">
            <div className="flex justify-around items-center h-full px-6 pt-8">
              {/* You */}
              <div className="absolute -top-2 w-24 h-28 bg-muted/30 rounded-t-full rounded-b-lg -z-10" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center border-2 border-primary/20"
                style={{
                  boxShadow: activeIsMicOn ? `0 0 ${myVoiceLevel / 2}px ${myVoiceLevel / 3}px hsl(var(--primary) / ${Math.min(0.6, myVoiceLevel / 100)})` : 'none',
                  transform: activeIsMicOn ? `scale(${1 + myVoiceLevel / 300})` : 'scale(1)'
                }}>
                {activeIsMicOn ? <Mic className="w-8 h-8 text-primary" /> : <MicOff className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-primary">{myPseudoName.split('-')[0]}</p>
                <p className="text-[10px] text-muted-foreground">You</p>
              </div>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: activeIsMicOn ? `${myVoiceLevel}%` : '0%' }} />
              </div>
            </div>

            {/* Connection Line */}
            <div className="flex flex-col items-center gap-2 -mt-8">
              <div className={`w-3 h-3 rounded-full ${activeIsConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse shadow-lg`} />
              <div className="w-px h-20 bg-gradient-to-b from-primary/30 via-muted to-secondary/30" />
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse shadow-lg`} />
            </div>

            {/* Partner */}
            <div className="flex flex-col items-center gap-3 relative">
              <div className="absolute -top-2 w-24 h-28 bg-muted/30 rounded-t-full rounded-b-lg -z-10" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center border-2 border-secondary/20"
                style={{
                  boxShadow: activeHasRemote ? `0 0 ${partnerVoiceLevel / 2}px ${partnerVoiceLevel / 3}px hsl(var(--secondary) / ${Math.min(0.6, partnerVoiceLevel / 100)})` : 'none',
                  transform: activeHasRemote ? `scale(${1 + partnerVoiceLevel / 300})` : 'scale(1)'
                }}>
                <Volume2 className={`w-8 h-8 ${activeHasRemote ? 'text-secondary' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-secondary">{partnerPseudoName.split('-')[0]}</p>
                <p className="text-[10px] text-muted-foreground">Partner</p>
              </div>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full transition-all duration-75" style={{ width: activeHasRemote ? `${partnerVoiceLevel}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>

        {captionsEnabled && currentCaption && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg mx-auto max-w-xs">
              <p className="text-white text-sm text-center">{currentCaption}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-4">
        <button onClick={activeToggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 shadow-lg ${activeIsMicOn ? 'bg-primary text-primary-foreground' : 'bg-red-500 text-white'}`}>
          {activeIsMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button onClick={toggleSpeaker}
          className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 shadow-lg ${isSpeakerOn ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
        <button onClick={() => setShowReportDialog(true)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-red-500/20 hover:scale-105">
          <Flag className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Skip */}
      <div className="w-full max-w-sm mt-4">
        {!canSkip && (
          <p className="text-center text-xs text-muted-foreground mb-2">
            ⏱️ Skip available in {Math.max(0, MANDATORY_STAY_SECONDS - duration)}s
          </p>
        )}
        <Button onClick={handleSkip} variant="outline" disabled={!canSkip} className="w-full gap-2 py-5 rounded-xl">
          <SkipForward className="w-5 h-5" />
          {canSkip ? 'Skip to Next Person' : `Wait ${Math.max(0, MANDATORY_STAY_SECONDS - duration)}s...`}
        </Button>
      </div>

      <ReportDialog open={showReportDialog} onClose={() => setShowReportDialog(false)} onReport={handleReport} />
    </div>
  );
};
