import * as WebBrowser from "expo-web-browser";
import { Download, FileText, Image as ImageIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { formatFileSize } from "@/lib/format-number";
import { type LessonResource, useLessonResourceUrl } from "@/lib/queries/lessons";
import { NotAllowedError } from "@/services/errors";
import { color, pressScale, tw } from "@/theme";

/** "PDF", "SVG image" … from the MIME type, else the file extension (the design's "Figma File"). */
function kindLabel(resource: LessonResource): string {
  const known: Record<string, string> = {
    "application/pdf": "PDF",
    "image/svg+xml": "SVG image",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image",
    "text/plain": "Text file",
  };
  return known[resource.mimeType] ?? `${resource.fileName.split(".").pop()?.toUpperCase() ?? "File"} file`;
}

/**
 * One downloadable file (lesson_player #resource-file: tinted icon tile, name, "1.4 MB • Kind").
 * Tapping asks the lesson-resource Edge Function for a 1-hour signed link and opens it, which
 * downloads the file (prompts/16). The credit for openly licensed files sits underneath.
 */
export function ResourceCard({ resource }: { resource: LessonResource }) {
  const link = useLessonResourceUrl();
  const isImage = resource.mimeType.startsWith("image/");

  const open = () =>
    link.mutate(resource.id, {
      onSuccess: ({ url }) => {
        WebBrowser.openBrowserAsync(url).catch(() => toast.error("Couldn't open the file."));
      },
      onError: (error) =>
        error instanceof NotAllowedError
          ? toast.info("Locked", "Enroll in the course to download its files.")
          : toast.error("Couldn't open the file.", "Check your connection and try again."),
    });

  return (
    <View style={tw`gap-1.5`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Download ${resource.title}, ${formatFileSize(resource.sizeBytes)}`}
        accessibilityState={{ busy: link.isPending }}
        disabled={link.isPending}
        onPress={open}
        style={({ pressed }) => [
          tw`flex-row items-center gap-4 p-4 rounded-2xl border border-border bg-subtle`,
          pressScale(pressed, 0.98),
        ]}
      >
        <View style={tw`w-12 h-12 rounded-xl bg-primary-tint items-center justify-center`}>
          <Icon as={isImage ? ImageIcon : FileText} size="xl" color="primary" />
        </View>
        <View style={tw`flex-1`}>
          <AppText numberOfLines={1} style={tw`text-15 font-semibold text-ink`}>
            {resource.title}
          </AppText>
          <AppText variant="caption">
            {formatFileSize(resource.sizeBytes)} • {kindLabel(resource)}
          </AppText>
        </View>
        {link.isPending ? (
          <ActivityIndicator color={color("muted")} />
        ) : (
          <Icon as={Download} size="lg" color="muted" />
        )}
      </Pressable>
      {resource.credit ? (
        <AppText variant="footnote" style={tw`text-muted italic px-1`}>
          {resource.credit}
        </AppText>
      ) : null}
    </View>
  );
}
