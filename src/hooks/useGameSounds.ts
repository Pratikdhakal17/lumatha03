import { useCallback, useRef, useEffect } from 'react';

// Web Audio API based sound system for AB Dev games
export type SoundType = 
  | 'start' | 'correct' | 'wrong' | 'complete' | 'tick' | 'levelUp'
  | 'glass' | 'ceramic' | 'wood' | 'metal' | 'cardboard'
  | 'pencil' | 'brush' | 'click' | 'whoosh' | 'pop'
  | 'alert' | 'notification' | 'decision' | 'ambient';

interface SoundConfig {
  frequency?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  decay?: number;
  noise?: boolean;
}

const soundConfigs: Record<SoundType, SoundConfig> = {
  start: { frequency: 440, duration: 0.3, type: 'sine', gain: 0.3, attack: 0.01, decay: 0.2 },
  correct: { frequency: 880, duration: 0.2, type: 'sine', gain: 0.25, attack: 0.01, decay: 0.15 },
  wrong: { frequency: 200, duration: 0.4, type: 'sawtooth', gain: 0.2, attack: 0.01, decay: 0.3 },
  complete: { frequency: 523, duration: 0.5, type: 'sine', gain: 0.3, attack: 0.02, decay: 0.4 },
  tick: { frequency: 1000, duration: 0.05, type: 'square', gain: 0.1, attack: 0.001, decay: 0.04 },
  levelUp: { frequency: 660, duration: 0.6, type: 'sine', gain: 0.35, attack: 0.02, decay: 0.5 },
  glass: { frequency: 2000, duration: 0.3, type: 'sine', gain: 0.2, attack: 0.001, decay: 0.25, noise: true },
  ceramic: { frequency: 1500, duration: 0.25, type: 'triangle', gain: 0.25, attack: 0.001, decay: 0.2, noise: true },
  wood: { frequency: 300, duration: 0.15, type: 'triangle', gain: 0.3, attack: 0.001, decay: 0.12, noise: true },
  metal: { frequency: 800, duration: 0.5, type: 'sawtooth', gain: 0.15, attack: 0.001, decay: 0.4 },
  cardboard: { frequency: 200, duration: 0.1, type: 'triangle', gain: 0.2, attack: 0.001, decay: 0.08, noise: true },
  pencil: { frequency: 3000, duration: 0.02, type: 'sawtooth', gain: 0.05, attack: 0.001, decay: 0.015, noise: true },
  brush: { frequency: 500, duration: 0.08, type: 'sine', gain: 0.08, attack: 0.01, decay: 0.06, noise: true },
  click: { frequency: 1200, duration: 0.03, type: 'square', gain: 0.15, attack: 0.001, decay: 0.025 },
  whoosh: { frequency: 400, duration: 0.2, type: 'sine', gain: 0.1, attack: 0.02, decay: 0.18, noise: true },
  pop: { frequency: 600, duration: 0.08, type: 'sine', gain: 0.2, attack: 0.001, decay: 0.07 },
  alert: { frequency: 520, duration: 0.4, type: 'square', gain: 0.2, attack: 0.01, decay: 0.3 },
  notification: { frequency: 700, duration: 0.15, type: 'sine', gain: 0.2, attack: 0.01, decay: 0.12 },
  decision: { frequency: 350, duration: 0.25, type: 'sine', gain: 0.15, attack: 0.02, decay: 0.2 },
  ambient: { frequency: 200, duration: 2, type: 'sine', gain: 0.05, attack: 0.5, decay: 1.5 },
};

export function useGameSounds(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType, volumeMultiplier: number = 1) => {
    if (!enabled) return;

    try {
      const ctx = getAudioContext();
      const config = soundConfigs[type];
      const now = ctx.currentTime;

      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      
      const finalGain = (config.gain || 0.2) * volumeMultiplier;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(finalGain, now + (config.attack || 0.01));
      gainNode.gain.linearRampToValueAtTime(0, now + (config.duration || 0.2));

      if (config.noise) {
        // Create noise for realistic material sounds
        const bufferSize = ctx.sampleRate * (config.duration || 0.2);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(finalGain * 0.5, now);
        noiseGain.gain.linearRampToValueAtTime(0, now + (config.duration || 0.2));
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSource.start(now);
      }

      const oscillator = ctx.createOscillator();
      oscillator.type = config.type || 'sine';
      oscillator.frequency.setValueAtTime(config.frequency || 440, now);
      
      // Add slight pitch variation for more natural sound
      if (type === 'glass' || type === 'ceramic') {
        oscillator.frequency.exponentialRampToValueAtTime(
          (config.frequency || 440) * 0.5, 
          now + (config.duration || 0.2)
        );
      }

      oscillator.connect(gainNode);
      oscillator.start(now);
      oscillator.stop(now + (config.duration || 0.2));
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }, [enabled, getAudioContext]);

  const playMelody = useCallback((notes: number[], duration: number = 0.15, gap: number = 0.05) => {
    if (!enabled) return;

    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const startTime = now + i * (duration + gap);
        
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);
        oscillator.connect(gainNode);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (e) {
      console.warn('Melody playback failed:', e);
    }
  }, [enabled, getAudioContext]);

  const playSuccessMelody = useCallback(() => {
    playMelody([523, 659, 784, 1047], 0.12, 0.03);
  }, [playMelody]);

  const playFailureMelody = useCallback(() => {
    playMelody([400, 350, 300], 0.15, 0.05);
  }, [playMelody]);

  const playLevelUpMelody = useCallback(() => {
    playMelody([523, 659, 784, 880, 1047], 0.1, 0.02);
  }, [playMelody]);

  return {
    playSound,
    playMelody,
    playSuccessMelody,
    playFailureMelody,
    playLevelUpMelody,
  };
}
