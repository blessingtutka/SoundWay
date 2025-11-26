// Simple parser + state for zone messages
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export function parseZoneMessage(raw: string) {
  return raw.trim();
}

export async function handleZoneText(text: string) {
  const parsed = parseZoneMessage(text);
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
  Speech.speak(parsed, { language: 'fr-FR' });
  return parsed;
}
