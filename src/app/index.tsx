import { Pressable, StyleSheet, Text, View } from "react-native";

import { showBanner } from "@/lib/notifications/banner";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text>Edit src/app/index.tsx to edit this screen.</Text>
      {/* Temporary: checks the Dynamic Island banner until real screens exist. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => showBanner({ title: "Lesson unlocked", message: "Chapter 2 is ready for you." })}
        style={styles.button}
      >
        <Text>Show test banner</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
});
