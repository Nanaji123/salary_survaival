import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { useRef } from 'react';

// Speech only needs a small mono file; this keeps uploads to a few KB per second.
const SPEECH: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
};

/** 'blocked' means the user chose "don't ask again", so only system Settings can enable it. */
export type MicStatus = 'ok' | 'denied' | 'blocked';

export type Voice = { audio: string; mimeType: string; durationMs: number };

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

/** Hold-to-talk recording. `level` is 0..1 and follows the microphone volume. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(SPEECH);
  const state = useAudioRecorderState(recorder, 80);
  const starting = useRef<Promise<MicStatus> | null>(null);
  const active = useRef(false);

  // dB metering is roughly -60 (silence) to 0 (loud).
  const level = state.isRecording ? Math.min(1, Math.max(0, ((state.metering ?? -60) + 55) / 55)) : 0;

  function start() {
    starting.current = (async (): Promise<MicStatus> => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      active.current = true;
      return 'ok';
    })();
    return starting.current;
  }

  /** Stops and returns the recording, or null when nothing usable was captured. */
  async function stop(): Promise<Voice | null> {
    // The finger may lift before permission and setup finish.
    const started = await starting.current?.catch(() => 'denied' as MicStatus);
    starting.current = null;
    if (started !== 'ok' || !active.current) return null;
    active.current = false;

    const durationMs = recorder.currentTime * 1000;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri || durationMs < 600) return null;

    const audio = await blobToBase64(await (await fetch(uri)).blob());
    return { audio, mimeType: 'audio/mp4', durationMs };
  }

  return { start, stop, level, isRecording: state.isRecording, durationMs: state.durationMillis };
}
