import { useRouter } from "expo-router";
import { BookOpen } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

// My Courses tab (the design's tab bar has it, but no screen for it yet): an empty state
// until the enrolled-courses plan. Built from the design's tokens; values estimated.
export function MyCoursesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[tw`flex-1 bg-canvas px-screen`, { paddingTop: insets.top + 16 }]}>
      <AppText variant="title-xl" accessibilityRole="header">
        My Courses
      </AppText>
      <View style={tw`flex-1 items-center justify-center gap-4`}>
        <View style={tw`w-12 h-12 rounded-xl bg-primary-tint items-center justify-center`}>
          <Icon as={BookOpen} size="xl" color="primary" />
        </View>
        <View style={tw`items-center gap-1`}>
          <AppText variant="heading">No courses yet</AppText>
          <AppText variant="callout" style={tw`text-center`}>
            Courses you enroll in appear here.
          </AppText>
        </View>
        <Button title="Explore courses" onPress={() => router.navigate("/explore")} style={tw`self-stretch`} />
      </View>
    </View>
  );
}
