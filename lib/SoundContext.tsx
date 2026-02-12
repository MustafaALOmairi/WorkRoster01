import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const STORAGE_KEY = "@shift_calendar_sound";

type SoundType = "tap" | "navigate" | "select" | "success" | "toggle" | "open" | "close";

interface SoundContextValue {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function generateWav(frequency: number, duration: number, volume: number = 0.3, fadeOut: boolean = true): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, fileSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = Math.sin(2 * Math.PI * frequency * t) * volume;
    if (fadeOut) {
      const envelope = 1 - (i / numSamples);
      sample *= envelope * envelope;
    }
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

function generateTwoToneWav(freq1: number, freq2: number, duration: number, volume: number = 0.25): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const halfSamples = Math.floor(numSamples / 2);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, fileSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = i < halfSamples ? freq1 : freq2;
    let sample = Math.sin(2 * Math.PI * freq * t) * volume;
    const envelope = 1 - (i / numSamples);
    sample *= envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

const SOUND_CONFIGS: Record<SoundType, { uri: string }> = {
  tap: { uri: generateWav(800, 0.06, 0.2) },
  select: { uri: generateWav(600, 0.1, 0.25, true) },
  navigate: { uri: generateWav(500, 0.12, 0.2, true) },
  toggle: { uri: generateTwoToneWav(400, 600, 0.15, 0.2) },
  success: { uri: generateTwoToneWav(523, 784, 0.25, 0.25) },
  open: { uri: generateWav(440, 0.1, 0.15, true) },
  close: { uri: generateWav(350, 0.08, 0.15, true) },
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const soundCache = useRef<Map<SoundType, Audio.Sound>>(new Map());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) {
        setSoundEnabledState(val === "true");
      }
    });

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      soundCache.current.forEach((s) => s.unloadAsync().catch(() => {}));
      soundCache.current.clear();
    };
  }, []);

  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v);
    AsyncStorage.setItem(STORAGE_KEY, v.toString());
  };

  const playSound = async (type: SoundType) => {
    if (!soundEnabled) return;
    try {
      const config = SOUND_CONFIGS[type];
      if (!config) return;

      if (Platform.OS === "web") {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const response = await fetch(config.uri);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const source = audioCtx.createBufferSource();
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 0.3;
          source.buffer = audioBuffer;
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          source.start();
          source.onended = () => audioCtx.close();
        } catch {}
        return;
      }

      const cached = soundCache.current.get(type);
      if (cached) {
        try {
          await cached.setPositionAsync(0);
          await cached.playAsync();
          return;
        } catch {
          soundCache.current.delete(type);
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: config.uri },
        { shouldPlay: true, volume: 0.4 }
      );
      soundCache.current.set(type, sound);
    } catch {}
  };

  const value = useMemo<SoundContextValue>(
    () => ({
      soundEnabled,
      setSoundEnabled,
      playSound,
    }),
    [soundEnabled]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
