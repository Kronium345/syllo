import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tw } from "@/theme";

import { IconButton } from "./icon-button";
import { AppText } from "./text";

/**
 * Bottom sheet over a darkened screen. Closes on the backdrop, the close button and
 * Android's back button. `footer` stays pinned under the scrolling content.
 * Not in the design: built from its tokens (surface, border, 24 gutter, rounded-3xl top).
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={tw`flex-1 justify-end`}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={tw`absolute inset-0 bg-scrim`} />
        <View accessibilityViewIsModal style={[tw`max-h-[85%] rounded-t-3xl bg-surface`, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={tw`items-center pt-2.5`}>
            <View style={tw`h-1 w-10 rounded-full bg-border`} />
          </View>
          <View style={tw`flex-row items-center justify-between px-screen pt-3 pb-2`}>
            <AppText variant="title" accessibilityRole="header">
              {title}
            </AppText>
            <IconButton icon={X} accessibilityLabel="Close" variant="close" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={tw`px-screen pb-4`} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={tw`border-t border-border px-screen pt-3`}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
