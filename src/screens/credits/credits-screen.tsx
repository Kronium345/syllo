import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ChevronDown, ChevronLeft, ChevronUp, ExternalLink } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { CONTENT_SOURCES, type ContentSource } from "@/lib/content-licences";
import { mono, tw } from "@/theme";

const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => undefined);

/**
 * Content credits and licences (prompts/19; Profile → Settings): every source the course lessons
 * and quizzes were adapted from, with copyright, licence and link, and the full text of MIT,
 * BSD-3 and PSF licences, which must travel with the material.
 */
export function CreditsScreen() {
  const paddingTop = useTopPadding(48);
  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          Content credits
        </AppText>
      </View>
      <FlatList
        data={CONTENT_SOURCES}
        keyExtractor={(source) => source.id}
        contentContainerStyle={tw`px-screen pb-10 gap-3`}
        ListHeaderComponent={
          <AppText variant="body" style={tw`mb-3`}>
            Lessons and quizzes in Syllo&apos;s sample courses are adapted, with AI assistance and human review, from
            these openly licensed sources. Changes were made. Pharmacy Exam Prep questions are Syllo&apos;s own.
          </AppText>
        }
        renderItem={({ item }) => <SourceCard source={item} />}
      />
    </View>
  );
}

function SourceCard({ source }: { source: ContentSource }) {
  const [showText, setShowText] = useState(false);
  return (
    <Card style={tw`p-4 gap-2`}>
      <AppText style={tw`text-15 font-semibold text-ink`}>{source.title}</AppText>
      <AppText variant="caption">{source.copyright}</AppText>
      <Pressable accessibilityRole="link" onPress={() => open(source.licenceUrl)} style={tw`flex-row items-center gap-2`}>
        <Icon as={ExternalLink} size="xs" color="primary" />
        <AppText style={tw`text-13 font-semibold text-primary`}>
          {source.licence}
          {source.role === "further_reading" ? " (linked for further reading only)" : ""}
        </AppText>
      </Pressable>
      {source.attributionNote ? <AppText variant="footnote">{source.attributionNote}</AppText> : null}
      <Pressable accessibilityRole="link" onPress={() => open(source.repo)} style={tw`flex-row items-center gap-2`}>
        <Icon as={ExternalLink} size="xs" color="muted" />
        <AppText variant="footnote" numberOfLines={1} style={tw`flex-1`}>
          {source.repo.replace(/^https:\/\//, "")}
          {source.pin ? ` @ ${source.pin.slice(0, 12)}` : ""}
        </AppText>
      </Pressable>
      {source.licenceText ? (
        <View style={tw`gap-2`}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showText }}
            onPress={() => setShowText((value) => !value)}
            style={tw`flex-row items-center justify-between py-1`}
          >
            <AppText variant="caption-strong">Full licence text</AppText>
            <Icon as={showText ? ChevronUp : ChevronDown} size="sm" color="muted" />
          </Pressable>
          {showText ? (
            <AppText selectable style={[tw`text-11 leading-relaxed text-muted`, mono]}>
              {source.licenceText}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
