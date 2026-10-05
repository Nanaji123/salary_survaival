import type * as SpeechRecognition from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';

import type { MicStatus } from '@/hooks/use-voice-recorder';

/**
 * Loaded lazily: builds made before this native module was added don't include it, and the
 * assistant then falls back to recording the clip and transcribing it on the server.
 */
function loadModule() {
  try {
    // A static import would throw at load time in builds without the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo-speech-recognition') as typeof SpeechRecognition).ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

const Speech = loadModule();

/** Words the recognizer should favour: the app's vocabulary of money, categories and dates. */
const CONTEXT = [
  'salary',
  'rupees',
  'dollars',
  'budget',
  'savings goal',
  'groceries',
  'rent',
  'electricity bill',
  'cab',
  'Uber',
  'Swiggy',
  'Zomato',
  'yesterday',
];

function speechLanguage() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return locale.startsWith('en') ? locale : 'en-US';
}

/**
 * Hold-to-talk with live, word-by-word transcription from the platform speech recognizer.
 * `level` is 0..1 and follows the microphone volume.
 */
export function useLiveSpeech() {
  const [supported] = useState(() => {
    try {
      return !!Speech && Speech.isRecognitionAvailable();
    } catch {
      return false;
    }
  });
  const [transcript, setTranscript] = useState('');
  const [level, setLevel] = useState(0);
  const latest = useRef('');
  const ended = useRef<(() => void) | null>(null);
  const failure = useRef<string | null>(null);

  useEffect(() => {
    if (!Speech) return;
    const subs = [
      Speech.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        latest.current = text;
        setTranscript(text);
      }),
      // Volume runs from -2 (silence) to 10 (loud).
      Speech.addListener('volumechange', (e) => setLevel(Math.min(1, Math.max(0, e.value / 8)))),
      Speech.addListener('error', (e) => {
        // "no-speech" just means nothing was said; the empty transcript covers it.
        if (e.error !== 'no-speech' && e.error !== 'aborted') failure.current = e.error;
        ended.current?.();
      }),
      Speech.addListener('end', () => {
        setLevel(0);
        ended.current?.();
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  async function start(): Promise<MicStatus> {
    if (!Speech) return 'denied';
    const permission = await Speech.requestPermissionsAsync();
    if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';
    latest.current = '';
    failure.current = null;
    setTranscript('');
    Speech.start({
      lang: speechLanguage(),
      interimResults: true,
      continuous: true,
      contextualStrings: CONTEXT,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
    });
    return 'ok';
  }

  /** Stops listening and resolves with the final transcript ('' when nothing was understood). */
  function stop(): Promise<{ text: string; error: string | null }> {
    if (!Speech) return Promise.resolve({ text: '', error: null });
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        ended.current = null;
        resolve({ text: latest.current.trim(), error: failure.current });
      };
      ended.current = finish;
      // The final result normally lands within a few hundred ms of stopping.
      setTimeout(finish, 1500);
      Speech.stop();
    });
  }

  function cancel() {
    Speech?.abort();
  }

  return { supported, transcript, level, start, stop, cancel };
}
