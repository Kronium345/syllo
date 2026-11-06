import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { CirclePlay, Upload } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button, buttonInk } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { formatClock } from "@/lib/format-duration";
import { formatFileSize } from "@/lib/format-number";
import {
  fileSize,
  normaliseMimeType,
  type PickedFile,
  type TutorLessonDetails,
  UPLOAD_RULES,
  useRemoveLessonVideo,
  useUploadLessonVideo,
} from "@/lib/queries/tutor";
import { tw } from "@/theme";

import { ConfirmSheet } from "./confirm-sheet";
import { reportTutorFailure } from "./report-tutor-failure";

/**
 * The lesson's video in the lesson editor (prompts/23): upload from the phone (MP4/MOV, up to
 * 500 MB) with a progress bar, preview it in the lesson player, replace or remove it. The
 * replaced or removed upload is deleted from R2 by the service.
 */
export function LessonVideoSection({ lesson }: { lesson: TutorLessonDetails }) {
  const upload = useUploadLessonVideo();
  const remove = useRemoveLessonVideo();
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const hasVideo = !!lesson.videoKey || !!lesson.videoUrl;
  const busy = upload.isPending || remove.isPending;

  const pickAndUpload = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    const name = asset.fileName ?? asset.uri.split("/").pop() ?? "video.mp4";
    const file: PickedFile = {
      uri: asset.uri,
      name,
      mimeType: normaliseMimeType(asset.mimeType, name),
      // The real size on disk: the picker's fileSize can describe the original, not the cropped copy,
      // and the upload link only accepts the exact size it was signed for.
      sizeBytes: fileSize(asset.uri),
    };
    const rules = UPLOAD_RULES.video;
    if (!rules.mimeTypes.includes(file.mimeType)) {
      toast.error("Choose an MP4 or MOV video.");
      return;
    }
    if (file.sizeBytes > rules.maxBytes) {
      toast.error("That video is too large.", `Videos can be up to ${formatFileSize(rules.maxBytes)}.`);
      return;
    }
    const durationSeconds = Math.round((asset.duration ?? 0) / 1000);
    if (durationSeconds < 1) {
      toast.error("Couldn't read the video's length.", "Try another video.");
      return;
    }
    setProgress(0);
    upload.mutate(
      { lessonId: lesson.id, file, durationSeconds, onProgress: setProgress },
      {
        onSuccess: () => toast.success(hasVideo ? "Video replaced" : "Video uploaded"),
        onError: (error) => reportTutorFailure(error, "Upload failed.", "Check your connection and try again."),
        onSettled: () => setProgress(null),
      },
    );
  };

  const removeVideo = () =>
    remove.mutate(lesson.id, {
      onSuccess: () => {
        setConfirmRemove(false);
        toast.success("Video removed");
      },
      onError: (error) => reportTutorFailure(error),
    });

  return (
    <Card style={tw`p-4 gap-3`}>
      {progress !== null ? (
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={tw`gap-2`}>
          <AppText variant="callout-strong">Uploading {Math.round(progress * 100)}%…</AppText>
          <ProgressBar progress={progress} size="sm" />
          <AppText variant="footnote">Keep the app open until the upload finishes.</AppText>
        </View>
      ) : hasVideo ? (
        <View style={tw`flex-row items-center gap-3`}>
          <Icon as={CirclePlay} size="xl" color="primary" />
          <View style={tw`flex-1`}>
            <AppText variant="callout-strong">Video added</AppText>
            <AppText variant="footnote">
              {lesson.durationSeconds > 0 ? formatClock(lesson.durationSeconds) : "Length unknown"}
              {lesson.videoKey?.startsWith("uploads/") ? " · Your upload" : " · Syllo clip"}
            </AppText>
          </View>
        </View>
      ) : (
        <AppText variant="body">No video yet. Upload an MP4 or MOV from your phone (up to 500 MB).</AppText>
      )}

      {progress === null ? (
        <View style={tw`gap-2`}>
          {hasVideo ? (
            <Button
              title="Preview in the lesson player"
              variant="outline"
              onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } })}
            />
          ) : null}
          <Button
            title={hasVideo ? "Replace video" : "Upload video"}
            variant={hasVideo ? "outline" : "primary"}
            leading={<Icon as={Upload} size="md" color={buttonInk(hasVideo ? "outline" : "primary")} />}
            disabled={busy}
            onPress={pickAndUpload}
          />
          {hasVideo ? (
            <Button title="Remove video" variant="link" disabled={busy} onPress={() => setConfirmRemove(true)} />
          ) : null}
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmRemove}
        title="Remove video?"
        message="Learners will see the lesson without a video until you upload another one."
        confirmLabel="Remove video"
        busy={remove.isPending}
        onConfirm={removeVideo}
        onClose={() => setConfirmRemove(false)}
      />
    </Card>
  );
}
