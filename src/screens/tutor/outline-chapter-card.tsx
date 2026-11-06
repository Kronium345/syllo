import { ArrowDown, ArrowUp, ChevronRight, type LucideIcon, Pencil, Plus, Trash2 } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { twoDigits } from "@/lib/course-outline";
import type { TutorChapter, TutorLesson } from "@/lib/queries/tutor";
import { pressScale, tw } from "@/theme";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * One chapter in the course editor's outline (prompts/22, not in the design): its title and
 * actions, its lessons with their own actions, "Add lesson" and the read-only quiz count.
 * `busy` disables the actions while any outline change is saving, so taps don't race.
 */
export function OutlineChapterCard({
  chapter,
  isFirst,
  isLast,
  busy,
  onRename,
  onMove,
  onDelete,
  onAddLesson,
  onOpenLesson,
  onMoveLesson,
  onDeleteLesson,
}: {
  chapter: TutorChapter;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onRename: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onOpenLesson: (lesson: TutorLesson) => void;
  onMoveLesson: (lesson: TutorLesson, direction: -1 | 1) => void;
  onDeleteLesson: (lesson: TutorLesson) => void;
}) {
  return (
    <Card style={tw`p-4 gap-3`}>
      <View style={tw`gap-2`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Badge label={`Chapter ${twoDigits(chapter.position)}`} style={tw`px-2`} />
          <View style={tw`flex-row gap-1`}>
            <RowAction icon={Pencil} label={`Rename ${chapter.title}`} disabled={busy} onPress={onRename} />
            <RowAction icon={ArrowUp} label={`Move ${chapter.title} up`} disabled={busy || isFirst} onPress={() => onMove(-1)} />
            <RowAction icon={ArrowDown} label={`Move ${chapter.title} down`} disabled={busy || isLast} onPress={() => onMove(1)} />
            <RowAction icon={Trash2} label={`Delete ${chapter.title}`} tone="danger" disabled={busy} onPress={onDelete} />
          </View>
        </View>
        <AppText variant="card-title">{chapter.title}</AppText>
      </View>

      {chapter.lessons.length === 0 ? (
        <AppText variant="footnote">No lessons yet.</AppText>
      ) : (
        <View style={tw`border-t border-border`}>
          {chapter.lessons.map((lesson, index) => (
            <View key={lesson.id} style={tw`flex-row items-center gap-2 py-2 border-b border-border`}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Lesson ${lesson.position}, ${lesson.title}${lesson.isPreview ? ", preview" : ""}`}
                accessibilityHint="Opens the lesson editor"
                onPress={() => onOpenLesson(lesson)}
                style={({ pressed }) => [tw`flex-1 flex-row items-center gap-2 py-1`, pressScale(pressed, 0.98)]}
              >
                <AppText variant="caption" style={tw`w-6`}>
                  {twoDigits(lesson.position)}
                </AppText>
                <View style={tw`flex-1`}>
                  <AppText variant="callout-strong" numberOfLines={2}>
                    {lesson.title}
                  </AppText>
                  {lesson.isPreview ? <AppText variant="footnote">Preview</AppText> : null}
                </View>
                <Icon as={ChevronRight} size="sm" color="muted" />
              </Pressable>
              <RowAction
                icon={ArrowUp}
                label={`Move ${lesson.title} up`}
                disabled={busy || index === 0}
                onPress={() => onMoveLesson(lesson, -1)}
              />
              <RowAction
                icon={ArrowDown}
                label={`Move ${lesson.title} down`}
                disabled={busy || index === chapter.lessons.length - 1}
                onPress={() => onMoveLesson(lesson, 1)}
              />
              <RowAction
                icon={Trash2}
                label={`Delete ${lesson.title}`}
                tone="danger"
                disabled={busy}
                onPress={() => onDeleteLesson(lesson)}
              />
            </View>
          ))}
        </View>
      )}

      <View style={tw`flex-row items-center justify-between`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add a lesson to ${chapter.title}`}
          disabled={busy}
          onPress={onAddLesson}
          style={({ pressed }) => [tw`flex-row items-center gap-1.5 py-1`, { opacity: busy ? 0.4 : pressed ? 0.7 : 1 }]}
        >
          <Icon as={Plus} size="sm" color="primary" />
          <AppText style={tw`text-14 font-semibold text-primary`}>Add lesson</AppText>
        </Pressable>
        {chapter.quizCount > 0 ? (
          <AppText variant="footnote">{plural(chapter.quizCount, "quiz", "quizzes")}</AppText>
        ) : null}
      </View>
    </Card>
  );
}

/** A small (32px) icon action in the outline; dimmed when it can't be used. */
function RowAction({
  icon,
  label,
  tone = "muted",
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "muted" | "danger";
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        tw`w-8 h-8 rounded-lg items-center justify-center`,
        { opacity: disabled ? 0.3 : 1 },
        pressScale(pressed, 0.9),
      ]}
    >
      <Icon as={icon} size="sm" color={tone} />
    </Pressable>
  );
}
