import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Switch, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { twoDigits } from "@/lib/course-outline";
import { type TutorLessonDetails, useDeleteLesson, useTutorLesson, useUpdateLesson } from "@/lib/queries/tutor";
import { color, tw } from "@/theme";

import { reportInvalid } from "../auth/report-invalid";
import { ConfirmSheet } from "./confirm-sheet";
import { LessonResourcesSection } from "./lesson-resources-section";
import { LessonVideoSection } from "./lesson-video-section";
import { NOTES_MAX, NotesEditor } from "./notes-editor";
import { reportTutorFailure } from "./report-tutor-failure";
import { OUTLINE_TITLE } from "./title-sheet";

/**
 * /tutor/course/[id]/lesson/[lessonId] (prompts/23): the tutor edits a lesson's title, free
 * preview, notes, video and resources, or deletes it. Not in the design; built from its tokens.
 */
export function EditLessonScreen() {
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const paddingTop = useTopPadding(48);
  const lesson = useTutorLesson(lessonId);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: "/tutor/course/[id]", params: { id } });

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={back} />
        <View style={tw`flex-1`}>
          <AppText variant="title" accessibilityRole="header">
            Edit lesson
          </AppText>
          {lesson.data ? (
            <AppText variant="footnote">
              Chapter {twoDigits(lesson.data.chapterPosition)} · Lesson {twoDigits(lesson.data.position)}
            </AppText>
          ) : null}
        </View>
      </View>

      {lesson.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading lesson" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : lesson.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => lesson.refetch()}
          style={tw`flex-1 items-center justify-center gap-2 px-screen`}
        >
          <AppText variant="callout">Couldn&apos;t load this lesson.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : lesson.data === null ? (
        <View style={tw`flex-1 items-center justify-center gap-4 px-screen`}>
          <AppText variant="callout">This lesson isn&apos;t available.</AppText>
          <Button title="Go back" variant="outline" onPress={back} style={tw`self-stretch`} />
        </View>
      ) : (
        <LessonEditor key={lesson.data.id} lesson={lesson.data} />
      )}
    </View>
  );
}

type LessonDraft = { title: string; body: string; isPreview: boolean };

const draftOf = (lesson: TutorLessonDetails): LessonDraft => ({
  title: lesson.title,
  body: lesson.body,
  isPreview: lesson.isPreview,
});

function LessonEditor({ lesson }: { lesson: TutorLessonDetails }) {
  const [draft, setDraft] = useState<LessonDraft>(() => draftOf(lesson));
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  const saved = draftOf(lesson);
  const dirty =
    draft.title.trim() !== saved.title.trim() || draft.body !== saved.body || draft.isPreview !== saved.isPreview;

  const save = () => {
    const title = draft.title.trim();
    const found = {
      title:
        title.length < OUTLINE_TITLE.min
          ? `Enter a title of at least ${OUTLINE_TITLE.min} characters.`
          : undefined,
      body: draft.body.length > NOTES_MAX ? "Notes must be 30,000 characters or fewer." : undefined,
    };
    setErrors(found);
    if (reportInvalid(found)) return;
    update.mutate(
      { lessonId: lesson.id, title, body: draft.body, isPreview: draft.isPreview },
      { onSuccess: () => toast.success("Lesson saved"), onError: (error) => reportTutorFailure(error) },
    );
  };

  const remove = () =>
    deleteLesson.mutate(lesson.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        toast.success("Lesson deleted");
        router.replace({ pathname: "/tutor/course/[id]", params: { id: lesson.courseId } });
      },
      onError: (error) => reportTutorFailure(error),
    });

  const saveButton = (
    <Button title="Save lesson" loading={update.isPending} disabled={!dirty || update.isPending} onPress={save} />
  );

  return (
    <KeyboardAvoidingView style={tw`flex-1`} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={tw`px-screen pb-10 gap-8`} keyboardShouldPersistTaps="handled">
        <View style={tw`gap-4`}>
          <TextField
            label="Title"
            value={draft.title}
            onChangeText={(title) => {
              setDraft((current) => ({ ...current, title }));
              if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
            }}
            error={errors.title}
            maxLength={OUTLINE_TITLE.max}
          />
          <Card style={tw`p-4 flex-row items-center gap-3`}>
            <View style={tw`flex-1`}>
              <AppText variant="callout-strong">Free preview</AppText>
              <AppText variant="footnote">Anyone can open this lesson without enrolling.</AppText>
            </View>
            <Switch
              accessibilityLabel="Free preview"
              value={draft.isPreview}
              onValueChange={(isPreview) => setDraft((current) => ({ ...current, isPreview }))}
              trackColor={{ false: color("track"), true: color("primary") }}
              thumbColor={color("white")}
              ios_backgroundColor={color("track")}
            />
          </Card>
          {saveButton}
        </View>

        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Video
          </AppText>
          <LessonVideoSection lesson={lesson} />
        </View>

        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Notes
          </AppText>
          <NotesEditor
            value={draft.body}
            invalid={!!errors.body}
            onChange={(body) => {
              setDraft((current) => ({ ...current, body }));
              if (errors.body) setErrors((current) => ({ ...current, body: undefined }));
            }}
          />
          {saveButton}
        </View>

        <View style={tw`gap-4`}>
          <AppText variant="heading" accessibilityRole="header">
            Resources
          </AppText>
          <LessonResourcesSection lesson={lesson} />
        </View>

        <Button title="Delete lesson" variant="danger" onPress={() => setConfirmDelete(true)} />
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete lesson?"
        message={`"${lesson.title}" will be deleted, with learners' progress on it. This can't be undone.`}
        confirmLabel="Delete lesson"
        busy={deleteLesson.isPending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </KeyboardAvoidingView>
  );
}
