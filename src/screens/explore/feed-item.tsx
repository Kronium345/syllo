import { Image } from "expo-image";
import { Clock, Star, User } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { formatHoursMinutes } from "@/lib/format-duration";
import { courseCover } from "@/lib/local-images";
import type { CourseCard } from "@/lib/queries/courses";
import { placeholderRating } from "@/screens/home/placeholder-stats";
import { pressScale, tw } from "@/theme";

/** One course in Explore's feed (course_search_feed #course-item). */
export function FeedItem({ course, first, onPress }: { course: CourseCard; first: boolean; onPress: () => void }) {
  const cover = courseCover(course);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={course.title}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style("mx-screen", !first && "pt-6 border-t border-track"),
        pressScale(pressed),
      ]}
    >
      <View style={tw`w-full h-[180px] rounded-2xl border border-border overflow-hidden bg-track mb-3`}>
        {cover ? (
          <Image
            source={cover}
            accessibilityIgnoresInvertColors
            contentFit="cover"
            transition={200}
            style={tw`w-full h-full`}
          />
        ) : null}
      </View>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <AppText style={tw`flex-1 mr-4 text-18 font-bold text-ink leading-snug`}>{course.title}</AppText>
        <View style={tw`flex-row items-center gap-1 bg-primary-tint px-2 py-0.5 rounded-md`}>
          <Icon as={Star} size="xs" color="star-deep" />
          <AppText style={tw`text-12 font-bold text-primary`}>{placeholderRating(course.id)}</AppText>
        </View>
      </View>
      <View style={tw`flex-row items-center gap-3`}>
        {course.tutorName ? (
          <View style={tw`flex-row items-center gap-1`}>
            <Icon as={User} size="sm" color="muted" />
            <AppText variant="caption">{course.tutorName}</AppText>
          </View>
        ) : null}
        <View style={tw`flex-row items-center gap-1`}>
          <Icon as={Clock} size="sm" color="muted" />
          <AppText variant="caption">{formatHoursMinutes(course.durationSeconds)}</AppText>
        </View>
      </View>
      <View style={tw`mt-3 flex-row items-center justify-between`}>
        <AppText style={tw`text-18 font-bold text-ink`}>Included in Premium</AppText>
        <AppText style={tw`text-13 font-bold text-primary`}>View Details</AppText>
      </View>
    </Pressable>
  );
}
