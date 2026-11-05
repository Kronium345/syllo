import * as WebBrowser from "expo-web-browser";
import { ExternalLink } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import type { LessonSource } from "@/lib/queries/lessons";
import { tw } from "@/theme";

/** One source row: the page title (opens it), then "Author · Licence" and any required note. */
export function SourceRow({ source }: { source: LessonSource }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${source.title}, ${source.author}, ${source.licence}${source.role === "further_reading" ? ", further reading" : ""}`}
      onPress={() => WebBrowser.openBrowserAsync(source.url).catch(() => undefined)}
      style={tw`flex-row gap-3 py-2`}
    >
      <View style={tw`mt-0.5`}>
        <Icon as={ExternalLink} size="sm" color="primary" />
      </View>
      <View style={tw`flex-1 gap-0.5`}>
        <AppText style={tw`text-14 font-semibold text-primary`}>
          {source.role === "further_reading" ? "Further reading: " : ""}
          {source.title}
        </AppText>
        <AppText variant="footnote">
          {source.author} · {source.licence}
        </AppText>
        {source.attributionNote ? <AppText variant="footnote">{source.attributionNote}</AppText> : null}
      </View>
    </Pressable>
  );
}

/**
 * "Sources" under a lesson's notes (prompts/19): what the notes were adapted from (CC BY and
 * OGL need the credit and a note that changes were made) and further reading.
 */
export function LessonSources({ sources }: { sources: LessonSource[] }) {
  if (sources.length === 0) return null;
  return (
    <View style={tw`mt-8 gap-1`}>
      <AppText variant="heading" accessibilityRole="header" style={tw`mb-2`}>
        Sources
      </AppText>
      {sources.map((source) => (
        <SourceRow key={source.id} source={source} />
      ))}
      <AppText variant="footnote" style={tw`mt-2`}>
        Adapted from the sources above with AI assistance and reviewed by the Syllo team. Changes were made.
      </AppText>
    </View>
  );
}
