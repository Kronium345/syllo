import { File } from "expo-file-system";
import { FileText, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button, buttonInk } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { formatFileSize } from "@/lib/format-number";
import {
  normaliseMimeType,
  type PickedFile,
  type TutorLessonDetails,
  type TutorLessonResource,
  UPLOAD_RULES,
  useAddLessonResource,
  useDeleteLessonResource,
} from "@/lib/queries/tutor";
import { pressScale, tw } from "@/theme";

import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { reportTutorFailure } from "./report-tutor-failure";
import { OUTLINE_TITLE, TitleSheet } from "./title-sheet";

const KIND_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "text/csv": "CSV file",
  "text/plain": "Text file",
  "image/png": "PNG image",
  "image/jpeg": "JPEG image",
  "application/zip": "ZIP archive",
};

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "text/csv": "csv",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/zip": "zip",
};

/**
 * The picked file's real name, or null. On Android the system picker returns a content URI
 * (".../document:24914"), and expo-file-system's `name` is that last segment, not the file's
 * display name, so anything without a normal extension doesn't count.
 */
function realFileName(name: string): string | null {
  return /^[^:/\\]+\.[a-z0-9]{2,4}$/i.test(name) ? name : null;
}

/** "Week 1 slides" from "week-1_slides.pdf": the default title for a new resource. */
function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  const title = base.charAt(0).toUpperCase() + base.slice(1);
  return title.slice(0, OUTLINE_TITLE.max);
}

/** "week-1-slides.pdf" from the title, for files picked without a usable name. */
function fileNameFromTitle(title: string, mimeType: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "resource";
  return `${base}.${EXTENSIONS[mimeType] ?? "bin"}`;
}

/**
 * The lesson's downloadable files in the lesson editor (prompts/23): pick a PDF, CSV, TXT, PNG,
 * JPG or ZIP (up to 25 MB) with expo-file-system's picker, name it, upload it with progress,
 * or delete one (its R2 file goes too).
 */
export function LessonResourcesSection({ lesson }: { lesson: TutorLessonDetails }) {
  const add = useAddLessonResource();
  const remove = useDeleteLessonResource();
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<TutorLessonResource | null>(null);

  const pick = async () => {
    const result = await File.pickFileAsync({ mimeTypes: UPLOAD_RULES.resource.mimeTypes }).catch(() => null);
    if (!result || result.canceled) return;
    const file = result.result;
    const name = realFileName(file.name);
    // Without a real name, the title the tutor types becomes the file name (see upload).
    const candidate: PickedFile = {
      uri: file.uri,
      name: name ?? "",
      mimeType: normaliseMimeType(file.type, name ?? ""),
      sizeBytes: file.size,
    };
    if (!UPLOAD_RULES.resource.mimeTypes.includes(candidate.mimeType)) {
      toast.error("That file type isn't supported.", "Use a PDF, CSV, TXT, PNG, JPG or ZIP file.");
      return;
    }
    if (candidate.sizeBytes < 1 || candidate.sizeBytes > UPLOAD_RULES.resource.maxBytes) {
      toast.error("That file is too large.", `Files can be up to ${formatFileSize(UPLOAD_RULES.resource.maxBytes)}.`);
      return;
    }
    setPicked(candidate);
  };

  const upload = (title: string) => {
    if (!picked) return;
    const file = picked.name ? picked : { ...picked, name: fileNameFromTitle(title, picked.mimeType) };
    setPicked(null);
    setProgress(0);
    add.mutate(
      { lessonId: lesson.id, title, file, onProgress: setProgress },
      {
        onSuccess: () => toast.success("Resource added"),
        onError: (error) => reportTutorFailure(error, "Upload failed.", "Check your connection and try again."),
        onSettled: () => setProgress(null),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(
      { lessonId: lesson.id, resourceId: deleting.id },
      {
        onSuccess: () => {
          setDeleting(null);
          toast.success("Resource deleted");
        },
        onError: (error) => reportTutorFailure(error),
      },
    );
  };

  return (
    <Card style={tw`p-4 gap-3`}>
      {lesson.resources.length === 0 && progress === null ? (
        <AppText variant="body">No files yet. Add slides, worksheets or data learners can download.</AppText>
      ) : null}

      {lesson.resources.map((resource) => (
        <View key={resource.id} style={tw`flex-row items-center gap-3`}>
          <View style={tw`w-10 h-10 rounded-xl bg-primary-tint items-center justify-center`}>
            <Icon as={FileText} size="md" color="primary" />
          </View>
          <View style={tw`flex-1`}>
            <AppText variant="callout-strong" numberOfLines={1}>
              {resource.title}
            </AppText>
            <AppText variant="footnote">
              {formatFileSize(resource.sizeBytes)} • {KIND_LABELS[resource.mimeType] ?? "File"}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${resource.title}`}
            disabled={remove.isPending || add.isPending}
            hitSlop={4}
            onPress={() => setDeleting(resource)}
            style={({ pressed }) => [tw`w-8 h-8 rounded-lg items-center justify-center`, pressScale(pressed, 0.9)]}
          >
            <Icon as={Trash2} size="sm" color="danger" />
          </Pressable>
        </View>
      ))}

      {progress !== null ? (
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={tw`gap-2`}>
          <AppText variant="callout-strong">Uploading {Math.round(progress * 100)}%…</AppText>
          <ProgressBar progress={progress} size="sm" />
        </View>
      ) : (
        <Button
          title="Add resource"
          variant="outline"
          leading={<Icon as={Plus} size="md" color={buttonInk("outline")} />}
          disabled={add.isPending || remove.isPending}
          onPress={pick}
        />
      )}

      {picked ? (
        <TitleSheet
          key={picked.uri}
          visible
          title="Name this file"
          label="Resource title"
          initial={picked.name ? titleFromFileName(picked.name) : ""}
          saveLabel="Upload"
          saving={false}
          onSave={upload}
          onClose={() => setPicked(null)}
        />
      ) : null}
      <ConfirmSheet
        visible={!!deleting}
        title="Delete resource?"
        message={deleting ? `"${deleting.title}" will be removed from the lesson and deleted.` : ""}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}
