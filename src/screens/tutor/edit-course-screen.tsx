import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Plus } from "lucide-react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button, buttonInk } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { useDeleteCourse } from "@/lib/queries/courses";
import {
  type TutorChapter,
  type TutorCourseDetails,
  type TutorLesson,
  useAddChapter,
  useAddLesson,
  useDeleteChapter,
  useDeleteLesson,
  useMoveChapter,
  useMoveLesson,
  useRenameChapter,
  useTutorCourse,
  useUpdateCourse,
} from "@/lib/queries/tutor";
import { color, tw } from "@/theme";

import { reportInvalid } from "../auth/report-invalid";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { CourseCoverSection } from "./course-cover-section";
import { CourseDetailsFields } from "./course-details-fields";
import { OutlineChapterCard } from "./outline-chapter-card";
import { PublishingCard } from "./publishing-card";
import { reportTutorFailure } from "./report-tutor-failure";
import { TitleSheet } from "./title-sheet";
import { type CourseDraft, type CourseDraftErrors, validateCourse } from "./validate-course";


/**
 * /tutor/course/[id]/edit (prompts/22; its own page since prompts/25): the tutor edits a course's details, builds its outline
 * (chapters and lessons), publishes or unpublishes it, or deletes it. Not in the design;
 * built from its tokens. Every write is an RPC that checks the tutor owns the course.
 */
export function EditCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(48);
  const course = useTutorCourse(id);
  // Back to the course overview (prompts/25); with no history (a deep link), open it instead.
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: "/tutor/course/[id]", params: { id } });

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={goBack} />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          Edit course
        </AppText>
        {course.data ? (
          <Badge label={course.data.isPublished ? "Published" : "Draft"} style={course.data.isPublished ? undefined : tw`bg-track`} />
        ) : null}
      </View>

      {course.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading course" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : course.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => course.refetch()}
          style={tw`flex-1 items-center justify-center gap-2 px-screen`}
        >
          <AppText variant="callout">Couldn&apos;t load this course.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : course.data === null ? (
        <View style={tw`flex-1 items-center justify-center gap-4 px-screen`}>
          <AppText variant="callout">This course isn&apos;t available.</AppText>
          <Button title="Go back" variant="outline" onPress={goBack} style={tw`self-stretch`} />
        </View>
      ) : (
        <CourseEditor key={course.data.id} course={course.data} />
      )}
    </View>
  );
}

function draftOf(course: TutorCourseDetails): CourseDraft {
  return {
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    category: course.category,
    level: course.level,
    access: course.access,
  };
}

function sameDraft(a: CourseDraft, b: CourseDraft) {
  return (
    a.title.trim() === b.title.trim() &&
    a.subtitle.trim() === b.subtitle.trim() &&
    a.description.trim() === b.description.trim() &&
    a.category === b.category &&
    a.level === b.level &&
    a.access === b.access
  );
}

type TitleAction =
  | { kind: "add-chapter" }
  | { kind: "rename-chapter"; chapter: TutorChapter }
  | { kind: "add-lesson"; chapter: TutorChapter };

type ConfirmAction =
  | { kind: "delete-chapter"; chapter: TutorChapter }
  | { kind: "delete-lesson"; lesson: TutorLesson }
  | { kind: "delete-course" };

function CourseEditor({ course }: { course: TutorCourseDetails }) {
  // Clear the system navigation bar (Android draws edge to edge), plus the usual 40.
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<CourseDraft>(() => draftOf(course));
  const [errors, setErrors] = useState<CourseDraftErrors>({});
  const [titleAction, setTitleAction] = useState<TitleAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const update = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const addChapter = useAddChapter();
  const renameChapter = useRenameChapter();
  const moveChapter = useMoveChapter();
  const deleteChapter = useDeleteChapter();
  const addLesson = useAddLesson();
  const moveLesson = useMoveLesson();
  const deleteLesson = useDeleteLesson();

  const outlineBusy =
    addChapter.isPending ||
    renameChapter.isPending ||
    moveChapter.isPending ||
    deleteChapter.isPending ||
    addLesson.isPending ||
    moveLesson.isPending ||
    deleteLesson.isPending;
  const dirty = !sameDraft(draft, draftOf(course));

  const change = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const saveDetails = () => {
    const found = validateCourse(draft);
    setErrors(found);
    if (reportInvalid(found) || !draft.category || !draft.level) return;
    update.mutate(
      {
        courseId: course.id,
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        description: draft.description.trim(),
        category: draft.category,
        level: draft.level,
        access: draft.access,
      },
      { onSuccess: () => toast.success("Changes saved"), onError: (error) => reportTutorFailure(error) },
    );
  };

  const saveTitle = (value: string) => {
    if (!titleAction) return;
    const done = { onSuccess: () => setTitleAction(null), onError: (error: unknown) => reportTutorFailure(error) };
    if (titleAction.kind === "add-chapter") addChapter.mutate({ courseId: course.id, title: value }, done);
    else if (titleAction.kind === "rename-chapter") renameChapter.mutate({ chapterId: titleAction.chapter.id, title: value }, done);
    else addLesson.mutate({ chapterId: titleAction.chapter.id, title: value }, done);
  };

  const confirm = () => {
    if (!confirmAction) return;
    const close = () => setConfirmAction(null);
    switch (confirmAction.kind) {
      case "delete-chapter":
        deleteChapter.mutate(confirmAction.chapter.id, {
          onSuccess: () => {
            close();
            toast.success("Chapter deleted");
          },
          onError: (error) => reportTutorFailure(error),
        });
        break;
      case "delete-lesson":
        deleteLesson.mutate(confirmAction.lesson.id, {
          onSuccess: () => {
            close();
            toast.success("Lesson deleted");
          },
          onError: (error) => reportTutorFailure(error),
        });
        break;
      case "delete-course":
        deleteCourse.mutate(
          { id: course.id, title: course.title },
          {
            onSuccess: () => {
              close();
              toast.success("Course deleted");
              // Back to the dashboard, past this course's overview (prompts/25), which is gone too.
              router.dismissTo("/tutor");
            },
            onError: (error) => reportTutorFailure(error),
          },
        );
        break;
    }
  };

  const titleSheet = titleAction
    ? titleAction.kind === "add-chapter"
      ? { title: "Add chapter", label: "Chapter title", initial: "", saveLabel: "Add chapter" }
      : titleAction.kind === "rename-chapter"
        ? { title: "Rename chapter", label: "Chapter title", initial: titleAction.chapter.title, saveLabel: "Save" }
        : { title: "Add lesson", label: "Lesson title", initial: "", saveLabel: "Add lesson" }
    : null;

  const confirmSheet = confirmAction
    ? confirmAction.kind === "delete-chapter"
      ? {
          title: "Delete chapter?",
          message: `"${confirmAction.chapter.title}" and its ${confirmAction.chapter.lessons.length} lesson(s) and quizzes will be deleted, with learners' progress and quiz results on them. This can't be undone.`,
          confirmLabel: "Delete chapter",
          busy: deleteChapter.isPending,
        }
      : confirmAction.kind === "delete-lesson"
        ? {
            title: "Delete lesson?",
            message: `"${confirmAction.lesson.title}" will be deleted, with learners' progress on it. This can't be undone.`,
            confirmLabel: "Delete lesson",
            busy: deleteLesson.isPending,
          }
        : {
            title: "Delete course?",
            message: `"${course.title}" will be deleted with all its chapters, lessons and quizzes, and learners' enrolments, progress and results. This can't be undone.`,
            confirmLabel: "Delete course",
            busy: deleteCourse.isPending,
          }
    : null;

  return (
    <KeyboardAvoidingView style={tw`flex-1`} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[tw`px-screen gap-8`, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Cover image
          </AppText>
          <CourseCoverSection course={course} />
        </View>

        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Details
          </AppText>
          <CourseDetailsFields draft={draft} errors={errors} onChange={change} />
          <Button
            title="Save changes"
            loading={update.isPending}
            disabled={!dirty || update.isPending}
            onPress={saveDetails}
          />
        </View>

        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Outline
          </AppText>
          {course.chapters.length === 0 ? (
            <AppText variant="body">No chapters yet. Add one to start building your course.</AppText>
          ) : (
            course.chapters.map((chapter, index) => (
              <OutlineChapterCard
                key={chapter.id}
                chapter={chapter}
                isFirst={index === 0}
                isLast={index === course.chapters.length - 1}
                busy={outlineBusy}
                onRename={() => setTitleAction({ kind: "rename-chapter", chapter })}
                onMove={(direction) => moveChapter.mutate({ chapterId: chapter.id, direction }, { onError: (error) => reportTutorFailure(error) })}
                onDelete={() => setConfirmAction({ kind: "delete-chapter", chapter })}
                onAddLesson={() => setTitleAction({ kind: "add-lesson", chapter })}
                onOpenLesson={(lesson) =>
                  router.push({ pathname: "/tutor/course/[id]/lesson/[lessonId]", params: { id: course.id, lessonId: lesson.id } })
                }
                onMoveLesson={(lesson, direction) =>
                  moveLesson.mutate({ lessonId: lesson.id, direction }, { onError: (error) => reportTutorFailure(error) })
                }
                onDeleteLesson={(lesson) => setConfirmAction({ kind: "delete-lesson", lesson })}
              />
            ))
          )}
          <Button
            title="Add chapter"
            variant="outline"
            leading={<Icon as={Plus} size="md" color={buttonInk("outline")} />}
            disabled={outlineBusy}
            onPress={() => setTitleAction({ kind: "add-chapter" })}
          />
        </View>

        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Publishing
          </AppText>
          <PublishingCard course={course} />
        </View>

        <Button title="Delete course" variant="danger" onPress={() => setConfirmAction({ kind: "delete-course" })} />
      </ScrollView>

      {titleAction && titleSheet ? (
        <TitleSheet
          key={titleAction.kind + ("chapter" in titleAction ? titleAction.chapter.id : "")}
          visible
          title={titleSheet.title}
          label={titleSheet.label}
          initial={titleSheet.initial}
          saveLabel={titleSheet.saveLabel}
          saving={addChapter.isPending || renameChapter.isPending || addLesson.isPending}
          onSave={saveTitle}
          onClose={() => setTitleAction(null)}
        />
      ) : null}
      {confirmSheet ? (
        <ConfirmSheet
          visible
          title={confirmSheet.title}
          message={confirmSheet.message}
          confirmLabel={confirmSheet.confirmLabel}
          busy={confirmSheet.busy}
          onConfirm={confirm}
          onClose={() => setConfirmAction(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
