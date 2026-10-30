import { Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { colors } from "@/components/ui/placeholder-colors";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useSupabase } from "@/lib/supabase";

type Course = { id: string; title: string };

// Temporary check that courses load from Supabase: a plain list of titles, each with a
// delete icon. Only a course's own tutor may delete it (RLS); the real Search screen
// (search, filters, cards) comes with its design.
export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const supabase = useSupabase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    supabase
      .from("courses")
      .select("id, title")
      .order("title")
      .then(({ data, error }) => {
        if (!current) return;
        if (error) {
          setStatus("error");
          return;
        }
        setCourses(data);
        setStatus("ready");
      });
    return () => {
      current = false;
    };
  }, [supabase, attempt]);

  const retry = () => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  };

  const deleteCourse = async () => {
    if (!deleting) return;
    setBusy(true);
    // RLS doesn't error on a refused delete, it just deletes nothing, so ask for the
    // deleted row back to tell "deleted" from "not allowed".
    const { data, error } = await supabase.from("courses").delete().eq("id", deleting.id).select("id");
    setBusy(false);
    if (error) {
      toast.error("Couldn't delete the course.", "Check your connection and try again.");
      return;
    }
    if (data.length === 0) {
      toast.error("You can't delete this course.", "Only its tutor can.");
    } else {
      setCourses((current) => current.filter((course) => course.id !== deleting.id));
      toast.success("Course deleted.", deleting.title);
    }
    setDeleting(null);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text accessibilityRole="header" style={styles.title}>
        Search
      </Text>

      {status === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading courses" style={styles.center}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : status === "error" ? (
        <Pressable accessibilityRole="button" onPress={retry} style={styles.center}>
          <Text style={styles.muted}>Couldn&apos;t load courses.</Text>
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(course) => course.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.course}>{item.title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title}`}
                hitSlop={8}
                onPress={() => setDeleting(item)}
              >
                <Trash2 size={20} color={colors.danger} strokeWidth={2} />
              </Pressable>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={[styles.muted, styles.empty]}>No courses yet.</Text>}
          contentContainerStyle={styles.list}
        />
      )}

      <Sheet
        visible={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this course?"
        footer={
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" onPress={() => setDeleting(null)} style={styles.action} />
            <Button title="Delete" variant="danger" loading={busy} onPress={deleteCourse} style={styles.action} />
          </View>
        }
      >
        <Text style={styles.body}>
          {deleting
            ? `"${deleting.title}" and its chapters, lessons, quizzes, enrollments and quiz results will be deleted for everyone. This can't be undone.`
            : ""}
        </Text>
      </Sheet>
    </View>
  );
}

// Placeholder styles until the design system exists (prompts/01-design-system.md).
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  title: { paddingHorizontal: 20, paddingBottom: 8, fontSize: 32, fontWeight: "700", color: colors.ink },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: colors.muted },
  link: { fontWeight: "600", color: colors.accent },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  course: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  empty: { paddingVertical: 24, textAlign: "center" },
});
