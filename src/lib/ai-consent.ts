import Storage from 'expo-sqlite/kv-store';
import { Alert } from 'react-native';

const KEY = 'salary-survival/ai-consent';

/** Thrown when the user declines to share data with the AI. */
export class AiConsentDeclined extends Error {
  constructor() {
    super('AI consent declined');
  }
}

/**
 * App Store guideline 5.1.2(i): before personal data goes to a third-party AI, say so and get
 * permission. Asks once per install; later calls resolve immediately. Rejects with
 * AiConsentDeclined when the user says no, so nothing is sent.
 */
export function requireAiConsent(): Promise<void> {
  if (Storage.getItemSync(KEY) === 'yes') return Promise.resolve();
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Use AI features?',
      'To understand what you say or type, and to write summaries and plans, Salary Survival sends that text and your spending totals to OpenAI. OpenAI does not use it to train its models.\n\nYou can keep using the app without AI.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => reject(new AiConsentDeclined()) },
        {
          text: 'Allow',
          onPress: () => {
            Storage.setItemSync(KEY, 'yes');
            resolve();
          },
        },
      ],
      { cancelable: false },
    );
  });
}
