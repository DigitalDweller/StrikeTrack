import { parseBatteryBeak, type ParsedBatteryReading } from './batteryBeakParser';

/**
 * Extracts text from an image. Works in Expo Go — no native OCR.
 * Take a photo for reference, then enter values manually.
 * To add automatic OCR later: install expo-text-extractor and call it here.
 */
export async function extractTextFromImage(_uri: string): Promise<string> {
  return '';
}

export async function recognizeBatteryBeak(uri: string): Promise<{
  text: string;
  parsed: ParsedBatteryReading;
}> {
  const text = await extractTextFromImage(uri);
  const parsed = text ? parseBatteryBeak(text) : {};
  return { text, parsed };
}
