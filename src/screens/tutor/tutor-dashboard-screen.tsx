import { router } from "expo-router";
import { ChevronLeft, Plus } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

import { Button, buttonInk } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { useMyCourses } from "@/lib/queries/tutor";
import { color, tw } from "@/theme";

import { TutorCourseCard } from "./tutor-course-card";

const newCourse = () => router.push("/tutor/course/new");

/** /tutor (prompts/20): the tutor's courses, published and drafts, newest first, and "New course". */
export function TutorDashboardScreen() {
  const paddingTop = useTopPadding(48);
  const courses = useMyCourses();

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          Your courses
        </AppText>
      </View>

      <View style={tw`px-screen pb-4`}>
        <Button
          title="New course"
          leading={<Icon as={Plus} size="md" color={buttonInk("primary")} />}
          onPress={newCourse}
        />
      </View>

      {courses.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading your courses" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : courses.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => courses.refetch()}
          style={tw`flex-1 items-center justify-center gap-2 px-screen`}
        >
          <AppText variant="callout">Couldn&apos;t load your courses.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : (
        <FlatList
          data={courses.data}
          keyExtractor={(course) => course.id}
          contentContainerStyle={tw`px-screen pb-10 gap-3 grow`}
          renderItem={({ item }) => (
            <TutorCourseCard
              course={item}
              onPress={() => router.push({ pathname: "/tutor/course/[id]", params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={tw`flex-1 items-center justify-center gap-2 py-10`}>
              <AppText variant="callout">You haven&apos;t created a course yet.</AppText>
              <AppText variant="footnote" style={tw`text-center`}>
                Tap New course to start your first one.
              </AppText>
            </View>
          }
        />
      )}
    </View>
  );
}
