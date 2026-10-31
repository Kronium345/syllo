import { ChevronDown, ChevronUp, CircleCheck, ListChecks, Lock, Play } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { featureComingSoon } from "@/lib/coming-soon";
import { isLocked } from "@/lib/course-outline";
import { formatClock } from "@/lib/format-duration";
import type { ChapterOutline, LessonOutline } from "@/lib/queries/courses";
import { tw } from "@/theme";

/** One curriculum chapter (course_details #chapter-n): a header that opens and closes, then its lessons. */
export function ChapterSection({
  chapter,
  index,
  open,
  onToggle,
  isEnrolled,
  completed,
  onOpenLesson,
  onLocked,
}: {
  chapter: ChapterOutline;
  index: number;
  open: boolean;
  onToggle: () => void;
  isEnrolled: boolean;
  completed: ReadonlySet<string>;
  onOpenLesson: (lesson: LessonOutline) => void;
  onLocked: () => void;
}) {
  return (
    <View style={tw`mb-4 border border-border rounded-2xl overflow-hidden`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={tw.style("p-4 flex-row items-center justify-between", open ? "bg-subtle" : "bg-surface")}
      >
        <AppText style={tw`flex-1 mr-3 text-15 font-bold text-ink`}>
          {index + 1}. {chapter.title}
        </AppText>
        <Icon as={open ? ChevronUp : ChevronDown} size="md" color="ink" />
      </Pressable>

      {open ? (
        <View style={tw`p-4 gap-4`}>
          {chapter.lessons.map((lesson) => {
            const locked = isLocked(lesson, isEnrolled);
            const done = completed.has(lesson.id);
            return (
              <Pressable
                key={lesson.id}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title}, ${formatClock(lesson.durationSeconds)}${locked ? ", locked" : done ? ", completed" : ""}`}
                onPress={() => (locked ? onLocked() : onOpenLesson(lesson))}
                style={({ pressed }) => [tw`flex-row items-center gap-4`, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={tw`w-8 h-8 rounded-lg bg-primary-soft items-center justify-center`}>
                  <Icon as={Play} size="sm" color="primary" />
                </View>
                <View style={tw`flex-1`}>
                  <AppText style={tw`text-14 font-medium text-ink`}>{lesson.title}</AppText>
                  <AppText variant="footnote">{formatClock(lesson.durationSeconds)}</AppText>
                </View>
                {locked ? (
                  <Icon as={Lock} size="md" color="faint" />
                ) : done ? (
                  <Icon as={CircleCheck} size="md" color="success" />
                ) : null}
              </Pressable>
            );
          })}
          {chapter.quizzes.map((quiz) => (
            <Pressable
              key={quiz.id}
              accessibilityRole="button"
              accessibilityLabel={`${quiz.title || "Chapter quiz"}, quiz`}
              onPress={() => featureComingSoon("Quizzes")}
              style={({ pressed }) => [tw`flex-row items-center gap-4`, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={tw`w-8 h-8 rounded-lg bg-primary-soft items-center justify-center`}>
                <Icon as={ListChecks} size="sm" color="primary" />
              </View>
              <View style={tw`flex-1`}>
                <AppText style={tw`text-14 font-medium text-ink`}>{quiz.title || "Chapter quiz"}</AppText>
                <AppText variant="footnote">Quiz</AppText>
              </View>
            </Pressable>
          ))}
          {chapter.lessons.length === 0 && chapter.quizzes.length === 0 ? (
            <AppText variant="footnote">Nothing in this chapter yet.</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
