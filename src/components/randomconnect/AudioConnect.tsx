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

      {/* Simplified Car UI placeholder (temporary) */}
      <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Car UI placeholder — restoring full UI in follow-up patch.</p>
      </div>

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
