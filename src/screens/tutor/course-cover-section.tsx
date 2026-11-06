import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button, buttonInk } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { formatFileSize } from "@/lib/format-number";
import { useCourseCover } from "@/lib/queries/courses";
import {
  fileSize,
  normaliseMimeType,
  type PickedFile,
  type TutorCourseDetails,
  UPLOAD_RULES,
  useRemoveCourseCover,
  useUploadCourseCover,
} from "@/lib/queries/tutor";
import { tw } from "@/theme";

import { ConfirmSheet } from "./confirm-sheet";
import { reportTutorFailure } from "./report-tutor-failure";

/**
 * The course's cover in the course editor (prompts/24): a 16:9 preview, upload or replace it
 * (the picker crops to 16:9; JPEG or PNG up to 5 MB) with progress, or remove an uploaded one.
 * An uploaded cover replaces a seeded course's bundled picture everywhere.
 */
export function CourseCoverSection({ course }: { course: TutorCourseDetails }) {
  const cover = useCourseCover(course);
  const upload = useUploadCourseCover();
  const remove = useRemoveCourseCover();
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const busy = upload.isPending || remove.isPending;

  const pickAndUpload = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    const name = asset.fileName ?? asset.uri.split("/").pop() ?? "cover.jpg";
    const file: PickedFile = {
      uri: asset.uri,
      name,
      mimeType: normaliseMimeType(asset.mimeType ?? "image/jpeg", name),
      // The real size on disk: the picker's fileSize can describe the original, not the cropped copy,
      // and the upload link only accepts the exact size it was signed for.
      sizeBytes: fileSize(asset.uri),
    };
    if (!UPLOAD_RULES.cover.mimeTypes.includes(file.mimeType)) {
      toast.error("Choose a JPEG or PNG image.");
      return;
    }
    if (file.sizeBytes > UPLOAD_RULES.cover.maxBytes) {
      toast.error("That image is too large.", `Covers can be up to ${formatFileSize(UPLOAD_RULES.cover.maxBytes)}.`);
      return;
    }
    setProgress(0);
    upload.mutate(
      { courseId: course.id, file, onProgress: setProgress },
      {
        onSuccess: () => toast.success(course.coverKey ? "Cover replaced" : "Cover added"),
        onError: (error) => reportTutorFailure(error, "Upload failed.", "Check your connection and try again."),
        onSettled: () => setProgress(null),
      },
    );
  };

  const removeCover = () =>
    remove.mutate(course.id, {
      onSuccess: () => {
        setConfirmRemove(false);
        toast.success("Cover removed");
      },
      onError: (error) => reportTutorFailure(error),
    });

  return (
    <Card style={tw`p-4 gap-3`}>
      <View style={[tw`w-full rounded-xl overflow-hidden bg-track items-center justify-center`, { aspectRatio: 16 / 9 }]}>
        {cover ? (
          <Image
            source={cover}
            accessibilityLabel={`Cover of ${course.title}`}
            contentFit="cover"
            transition={200}
            style={tw`w-full h-full`}
          />
        ) : (
          <Icon as={ImagePlus} size="2xl" color="muted" />
        )}
      </View>

      {progress !== null ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={tw`gap-2`}
        >
          <AppText variant="callout-strong">Uploading {Math.round(progress * 100)}%…</AppText>
          <ProgressBar progress={progress} size="sm" />
        </View>
      ) : (
        <View style={tw`gap-2`}>
          <Button
            title={course.coverKey ? "Replace cover" : "Upload cover"}
            variant="outline"
            leading={<Icon as={ImagePlus} size="md" color={buttonInk("outline")} />}
            disabled={busy}
            onPress={pickAndUpload}
          />
          {course.coverKey ? (
            <Button title="Remove cover" variant="link" disabled={busy} onPress={() => setConfirmRemove(true)} />
          ) : (
            <AppText variant="footnote">A 16:9 JPEG or PNG, up to 5 MB.</AppText>
          )}
        </View>
      )}

      <ConfirmSheet
        visible={confirmRemove}
        title="Remove cover?"
        message="The course will show its default picture (or none) until you upload another one."
        confirmLabel="Remove cover"
        busy={remove.isPending}
        onConfirm={removeCover}
        onClose={() => setConfirmRemove(false)}
      />
    </Card>
  );
}
