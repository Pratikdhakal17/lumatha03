import { useState, useRef, useCallback, useEffect } from 'react';
import type { DailyCall, DailyParticipant, DailyEventObjectParticipant } from '@daily-co/daily-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDailyCallOptions {
  sessionId: string | undefined;
  mode: 'audio' | 'video';
  myPseudoName: string;
  onPartnerJoined?: () => void;
  onPartnerLeft?: () => void;
  onError?: (msg: string) => void;
}

export function useDailyCall({
  sessionId,
  mode,
  myPseudoName,
  onPartnerJoined,
  onPartnerLeft,
  onError,
}: UseDailyCallOptions) {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(mode === 'video');
  const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

  const callObjectRef = useRef<DailyCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const joinedRef = useRef(false);

  // Create room via edge function
  const createRoom = useCallback(async (): Promise<string | null> => {
    if (!sessionId) return null;
    try {
      const { data, error } = await supabase.functions.invoke('create-daily-room', {
        body: { sessionId, mode },
      });
      if (error) throw error;
      return data?.url || null;
    } catch (err: any) {
      console.error('[useDailyCall] Failed to create room:', err);
      // Detect Daily-specific billing error and signal caller to fallback
      const msg = err?.message || String(err);
      if (msg.includes('account-missing-payment-method') || msg.includes('payment') || msg.includes('billing')) {
        onError?.('daily-account-payment');
      } else {
        onError?.('Failed to create call room');
      }
      return null;
    }
  }, [sessionId, mode, onError]);

  // Attach tracks to video/audio elements
  const attachTrack = useCallback((participant: DailyParticipant, isLocal: boolean) => {
    if (isLocal) {
      // Local video
      if (participant.tracks.video?.persistentTrack && localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([participant.tracks.video.persistentTrack]);
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => {});
      }
    } else {
      // Remote video
      if (participant.tracks.video?.state === 'playable' && participant.tracks.video.persistentTrack && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = new MediaStream([participant.tracks.video.persistentTrack]);
        remoteVideoRef.current.play().catch(() => {});
      }
      // Remote audio
      if (participant.tracks.audio?.state === 'playable' && participant.tracks.audio.persistentTrack) {
        if (!remoteAudioRef.current) {
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          document.body.appendChild(audioEl);
          remoteAudioRef.current = audioEl;
        }
        remoteAudioRef.current.srcObject = new MediaStream([participant.tracks.audio.persistentTrack]);
        remoteAudioRef.current.play().catch(() => {});
      }

      if (
        participant.tracks.audio?.state === 'playable' ||
        participant.tracks.video?.state === 'playable'
      ) {
        setHasRemoteParticipant(true);
        setIsConnected(true);
      }
    }
  }, []);

  // Join the Daily call
  const join = useCallback(async () => {
    if (joinedRef.current || !sessionId) return;

    // 1. Check permissions first (user gesture context)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mode === 'video',
        audio: true,
      });
      // Stop the permission-check stream immediately
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      onError?.('Please allow camera and microphone access');
      return;
    }

    // 2. Create room
    const url = await createRoom();
    if (!url) return;
    setRoomUrl(url);

    // 3. Create call object
    const { default: DailyIframe } = await import('@daily-co/daily-js');
    const callObject = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: mode === 'video',
      dailyConfig: {
        useDevicePreferenceCookies: true,
      },
    });
    callObjectRef.current = callObject;

    // 4. Event handlers
    callObject.on('joined-meeting', (event) => {
      if (!event) return;
      setIsJoined(true);
      joinedRef.current = true;
      const local = event.participants?.local;
      if (local) attachTrack(local, true);
    });

    callObject.on('participant-joined', (event: DailyEventObjectParticipant | undefined) => {
      if (!event) return;
      if (!event.participant.local) {
        setHasRemoteParticipant(true);
        setIsConnected(true);
        attachTrack(event.participant, false);
        onPartnerJoined?.();
        toast.success(mode === 'video'
          ? 'Connected! You can now see and hear each other.'
          : 'Connected! You can now hear each other.');
      }
    });

    callObject.on('participant-updated', (event: DailyEventObjectParticipant | undefined) => {
      if (!event) return;
      attachTrack(event.participant, event.participant.local);
    });

    callObject.on('participant-left', (event: any) => {
      if (!event) return;
      if (!event.participant?.local) {
        setHasRemoteParticipant(false);
        setIsConnected(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        onPartnerLeft?.();
      }
    });

    callObject.on('error', (event) => {
      console.error('[Daily] Error:', event);
      onError?.('Call connection error');
    });

    // 5. Join the room
    try {
      await callObject.join({
        url,
        userName: myPseudoName,
      });
    } catch (err: any) {
      console.error('[useDailyCall] Join failed:', err);
      onError?.('Failed to join call');
    }
  }, [sessionId, mode, myPseudoName, createRoom, attachTrack, onPartnerJoined, onPartnerLeft, onError]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const newState = !isMicOn;
    co.setLocalAudio(newState);
    setIsMicOn(newState);
  }, [isMicOn]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const newState = !isCameraOn;
    co.setLocalVideo(newState);
    setIsCameraOn(newState);
  }, [isCameraOn]);

  // Cleanup
  const leave = useCallback(async () => {
    const co = callObjectRef.current;
    if (co) {
      try {
        await co.leave();
        co.destroy();
      } catch {}
      callObjectRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    joinedRef.current = false;
    setIsJoined(false);
    setIsConnected(false);
    setHasRemoteParticipant(false);
  }, []);

  // Auto-join when sessionId is available
  useEffect(() => {
    if (sessionId) {
      join();
    }
    return () => {
      leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    isJoined,
    isConnected,
    isMicOn,
    isCameraOn,
    hasRemoteParticipant,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    callObjectRef,
    toggleMic,
    toggleCamera,
    leave,
  };
}
