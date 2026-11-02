import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";

import { toast } from "@/components/ui/toast";

import { deleteRecording, NO_READING_DB, QUIET_PEAK_DB, readBase64, SPEAKING_RECORDING } from "./recording";

export type Take =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "recording"; startedAt: number }
  | { phase: "recorded"; uri: string; durationMs: number; peakDb: number };

/** A recording ready to upload: base64 audio, its length, and the file to delete once graded. */
export type Upload = { audio: string; durationMs: number; uri: string };

/**
 * One spoken answer at a time, for viva and interview practice (prompts/17, 18): microphone
 * permission, recording up to `maxSeconds` (the recorder stops itself there), the peak level for
 * the silence check, and cleanup. Leaving the screen stops the mic and deletes anything unsent.
 * State changes only from events (taps, recorder status), never from effects.
 */
export function useAnswerRecorder(maxSeconds: number) {
  const [take, setTake] = useState<Take>({ phase: "idle" });

  // The loudest level heard in the current recording (dBFS).
  const peakRef = useRef(NO_READING_DB);
  // The recorder's own stop at maxSeconds hands over the file here. A manual stop moves the take
  // out of "recording" first, so this ignores it.
  const recorder = useAudioRecorder(SPEAKING_RECORDING, (status) => {
    if (!status.isFinished || !status.url) return;
    const uri = status.url;
    const now = Date.now();
    const peakDb = peakRef.current;
    setTake((current) =>
      current.phase === "recording" ? { phase: "recorded", uri, durationMs: now - current.startedAt, peakDb } : current,
    );
  });
  const state = useAudioRecorderState(recorder, 250);

  const metering = state.metering;
  const recording = take.phase === "recording";
  useEffect(() => {
    if (recording && metering !== undefined) peakRef.current = Math.max(peakRef.current, metering);
  }, [recording, metering]);

  // The latest take, for the unmount cleanup.
  const takeRef = useRef(take);
  useEffect(() => {
    takeRef.current = take;
  }, [take]);
  useEffect(
    () => () => {
      const current = takeRef.current;
      if (current.phase === "recording") recorder.stop().catch(() => undefined);
      if (current.phase === "recorded") deleteRecording(current.uri);
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    },
    [recorder],
  );

  /** Throws away the current take (re-record, skip, next question). */
  const discard = () => {
    if (take.phase === "recorded") deleteRecording(take.uri);
    setTake({ phase: "idle" });
  };

  const start = async () => {
    Speech.stop();
    if (take.phase === "recorded") deleteRecording(take.uri);
    setTake({ phase: "starting" });
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setTake({ phase: "idle" });
        toast.info("Microphone is off for Syllo", "Allow it in your phone's settings to answer out loud.");
        if (!permission.canAskAgain) Linking.openSettings().catch(() => undefined);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      peakRef.current = NO_READING_DB;
      recorder.record({ forDuration: maxSeconds });
      setTake({ phase: "recording", startedAt: Date.now() });
    } catch {
      setTake({ phase: "idle" });
      toast.error("Couldn't start recording.", "Try again.");
    }
  };

  const stop = async () => {
    if (take.phase !== "recording") return;
    const durationMs = state.durationMillis || Date.now() - take.startedAt;
    const peakDb = peakRef.current;
    setTake({ phase: "starting" });
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error("No recording");
      setTake({ phase: "recorded", uri: recorder.uri, durationMs, peakDb });
    } catch {
      setTake({ phase: "idle" });
      toast.error("Couldn't save the recording.", "Try again.");
    }
  };

  /**
   * The recording, ready to upload, or null (with a toast) when it was silent or unreadable. A
   * take never louder than background noise isn't sent, so it doesn't spend a try; NO_READING_DB
   * means the phone gave no level, so the server's check decides.
   */
  const prepareUpload = async (): Promise<Upload | null> => {
    if (take.phase !== "recorded") return null;
    const { uri, durationMs, peakDb } = take;
    if (peakDb !== NO_READING_DB && peakDb < QUIET_PEAK_DB) {
      deleteRecording(uri);
      setTake({ phase: "idle" });
      toast.info("We couldn't hear you.", "Hold the phone closer and answer out loud.");
      return null;
    }
    try {
      return { audio: await readBase64(uri), durationMs, uri };
    } catch {
      setTake({ phase: "idle" });
      toast.error("Couldn't read the recording.", "Record your answer again.");
      return null;
    }
  };

  /** After a graded (or refused) upload: delete the file and get ready for the next answer. */
  const clear = (uri: string) => {
    deleteRecording(uri);
    setTake({ phase: "idle" });
  };

  return {
    take,
    elapsedMs: take.phase === "recording" ? state.durationMillis : 0,
    start,
    stop,
    discard,
    prepareUpload,
    clear,
  };
}
