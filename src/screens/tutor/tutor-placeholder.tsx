import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { View } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { tw } from "@/theme";

/** Temporary body for tutor screens until each one is built: a back button, the title and what it will do. */
export function TutorPlaceholder({ title, description }: { title: string; description: string }) {
  const paddingTop = useTopPadding(48);
  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          {title}
        </AppText>
      </View>
      <View style={tw`px-screen gap-2`}>
        <AppText variant="body">{description}</AppText>
        <AppText variant="caption">Coming soon.</AppText>
      </View>
    </View>
  );
}
