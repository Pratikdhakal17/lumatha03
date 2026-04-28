import { useState, useRef, useCallback, useEffect } from 'react';

type IAgoraRTCClient = any;
type ILocalTrack = any;
type IRemoteAudioTrack = any;
type IRemoteVideoTrack = any;
type IRemoteUser = any;

const AGORA_SDK_URL = 'https://download.agora.io/sdk/release/AgoraRTC_N.js';

declare global {
  interface Window {
    AgoraRTC?: any;
  }
}

let agoraSdkPromise: Promise<any> | null = null;

function loadAgoraSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Agora SDK can only load in the browser'));
  }
  if (window.AgoraRTC) return Promise.resolve(window.AgoraRTC);
  if (!agoraSdkPromise) {
    agoraSdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-agora-sdk="true"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(window.AgoraRTC));
        existing.addEventListener('error', () => reject(new Error('Failed to load Agora SDK')));
        return;
      }

      const script = document.createElement('script');
      script.src = AGORA_SDK_URL;
      script.async = true;
      script.dataset.agoraSdk = 'true';
      script.onload = () => resolve(window.AgoraRTC);
      script.onerror = () => reject(new Error('Failed to load Agora SDK'));
      document.head.appendChild(script);
    });
  }
  return agoraSdkPromise;
}

interface UseAgoraCallOptions {
  channel: string | undefined;
  mode: 'audio' | 'video';
  uid?: string | number;
  onPartnerJoined?: () => void;
  onPartnerLeft?: () => void;
  onError?: (msg: string) => void;
}

export function useAgoraCall({ channel, mode, uid, onPartnerJoined, onPartnerLeft, onError }: UseAgoraCallOptions) {
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(mode === 'video');
  const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalTrack | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const join = useCallback(async () => {
    if (!channel) return;
    try {
      const AgoraRTC = await loadAgoraSdk();
      const resp = await fetch('/api/agora-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, uid }) });
      if (!resp.ok) throw new Error('Failed to fetch Agora token');
      const body = await resp.json();
      const { token, appId } = body;
      if (!appId) throw new Error('Agora appId not returned');

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // remote user published
      client.on('user-published', async (user: IRemoteUser, mediaType: any) => {
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            const remoteVideoTrack = user.videoTrack as IRemoteVideoTrack | undefined;
            if (remoteVideoTrack && remoteVideoRef.current) {
              remoteVideoTrack.play(remoteVideoRef.current);
            }
          }
          if (mediaType === 'audio') {
            const remoteAudioTrack = user.audioTrack as IRemoteAudioTrack | undefined;
            if (remoteAudioTrack) {
              if (!remoteAudioRef.current) {
                const a = document.createElement('audio');
                a.autoplay = true;
                a.setAttribute('playsinline', 'true');
                document.body.appendChild(a);
                remoteAudioRef.current = a;
              }
              remoteAudioRef.current.srcObject = null;
              remoteAudioTrack.play(remoteAudioRef.current);
            }
          }
          setHasRemoteParticipant(true);
          setIsConnected(true);
          onPartnerJoined?.();
        } catch (err: any) {
          console.error('Agora subscribe error', err);
        }
      });

      client.on('user-unpublished', (user: IRemoteUser) => {
        setHasRemoteParticipant(false);
        setIsConnected(false);
        onPartnerLeft?.();
      });

      // join
      await client.join(appId, channel, token || null, uid || null);

      // create local tracks
      if (mode === 'video') {
        const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioTrackRef.current = microphoneTrack as ILocalTrack;
        localVideoTrackRef.current = cameraTrack as ILocalTrack;
        if (localVideoRef.current) cameraTrack.play(localVideoRef.current);
        await client.publish([microphoneTrack, cameraTrack]);
      } else {
        const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = microphoneTrack as ILocalTrack;
        await client.publish([microphoneTrack]);
      }

      setIsJoined(true);
    } catch (error: any) {
      console.error('Agora join error', error);
      onError?.(error.message || 'Agora join failed');
    }
  }, [channel, mode, uid, onPartnerJoined, onPartnerLeft, onError]);

  const toggleMic = useCallback(async () => {
    const t = localAudioTrackRef.current;
    if (!t) return;
    const newState = !isMicOn;
    try {
      await (t as any).setEnabled(newState);
      setIsMicOn(newState);
    } catch (e) {
      console.error('toggleMic error', e);
    }
  }, [isMicOn]);

  const toggleCamera = useCallback(async () => {
    const t = localVideoTrackRef.current;
    if (!t) return;
    const newState = !isCameraOn;
    try {
      await (t as any).setEnabled(newState);
      setIsCameraOn(newState);
    } catch (e) {
      console.error('toggleCamera error', e);
    }
  }, [isCameraOn]);

  const leave = useCallback(async () => {
    try {
      const client = clientRef.current;
      if (client) {
        try {
          await client.unpublish();
        } catch {}
        await client.leave();
      }
      if (localAudioTrackRef.current) {
        try { await (localAudioTrackRef.current as any).close(); } catch {}
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        try { await (localVideoTrackRef.current as any).close(); } catch {}
        localVideoTrackRef.current = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
        remoteAudioRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      clientRef.current = null;
      setIsJoined(false);
      setIsConnected(false);
      setHasRemoteParticipant(false);
    } catch (e) {
      console.error('Agora leave error', e);
    }
  }, []);

  useEffect(() => {
    if (channel) join();
    return () => { leave(); };
  }, [channel]);

  return {
    isJoined,
    isConnected,
    isMicOn,
    isCameraOn,
    hasRemoteParticipant,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    toggleMic,
    toggleCamera,
    leave,
    clientRef,
  };
}
