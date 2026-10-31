import { Image } from "expo-image";
import { Clock } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { formatTotalHours } from "@/lib/format-duration";
import { courseCover } from "@/lib/local-images";
import type { CourseCard } from "@/lib/queries/courses";
import { pressScale, tw } from "@/theme";

import { placeholderRating } from "./placeholder-stats";

/** A 240-wide carousel card (learning_dashboard #course-card). */
export function RecommendedCard({ course, onPress }: { course: CourseCard; onPress: () => void }) {
  const cover = courseCover(course);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={course.title}
      onPress={onPress}
      style={({ pressed }) => [
        tw`w-[240px] bg-surface border border-border rounded-2xl overflow-hidden`,
        pressScale(pressed),
      ]}
    >
      <View style={tw`h-[140px] bg-track`}>
        {cover ? (
          <Image
            source={cover}
            accessibilityIgnoresInvertColors
            contentFit="cover"
            transition={200}
            style={tw`w-full h-full`}
          />
        ) : null}
        <Badge label={placeholderRating(course.id)} variant="rating" style={tw`absolute top-3 right-3`} />
      </View>
      <View style={tw`p-4`}>
        <AppText variant="card-title" numberOfLines={2} style={tw`mb-2`}>
          {course.title}
        </AppText>
        <View style={tw`flex-row items-center gap-2`}>
          <Icon as={Clock} size="sm" color="muted" />
          <AppText variant="footnote">{formatTotalHours(course.durationSeconds)}</AppText>
        </View>
      </View>
    </Pressable>
  );
}
