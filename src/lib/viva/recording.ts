import { type RecordingOptions, RecordingPresets } from "expo-audio";
import { File } from "expo-file-system";

// Viva practice recordings (prompts/17): m4a/AAC, mono, 16 kHz, 32 kbps (Gemini downsamples to
// 16 kHz mono anyway), about 0.5 MB for 2 minutes. Recordings are uploaded once and deleted;
// they are never stored by Syllo.

export const MIN_SECONDS = 3;
export const MAX_SECONDS = 120;
/** Sent with the upload; Gemini lists audio/m4a among its accepted types. */
export const RECORDING_MIME = "audio/m4a";

export const VIVA_RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  sampleRate: 16000,
  bitRate: 32000,
  // Peak level in dBFS while recording, so a silent recording isn't uploaded.
  isMeteringEnabled: true,
};

/**
 * A recording whose loudest moment stays below this (dBFS) is treated as silence and not sent.
 * Speech near the phone peaks around -30 to -5; a quiet room stays below about -45.
 */
export const QUIET_PEAK_DB = -40;
/** expo-audio reports -160 for a zero (or failed) reading: no information either way. */
export const NO_READING_DB = -160;

/**
 * Reads a finished recording as base64. The file stays until it's graded (or thrown away), so a
 * failed upload can be sent again.
 */
export function readBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

/** Deletes a recording once it's graded or won't be sent (re-record, skip, leaving the screen). */
export function deleteRecording(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

/** "1:05" from milliseconds. */
export function formatSeconds(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
