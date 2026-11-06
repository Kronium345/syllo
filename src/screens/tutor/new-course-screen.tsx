import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { useCreateCourse } from "@/lib/queries/tutor";
import { NotAllowedError } from "@/services/errors";
import { tw } from "@/theme";

import { reportInvalid } from "../auth/report-invalid";
import { CourseDetailsFields } from "./course-details-fields";
import { type CourseDraft, type CourseDraftErrors, validateCourse } from "./validate-course";

const EMPTY: CourseDraft = { title: "", subtitle: "", description: "", category: null, level: null, access: "free" };

/**
 * /tutor/course/new (prompts/21): a tutor saves a draft course. Not in the design; built from
 * its tokens like the auth and account forms. The database function checks the tutor role
 * and the same limits again.
 */
export function NewCourseScreen() {
  const paddingTop = useTopPadding(48);
  const create = useCreateCourse();
  const [draft, setDraft] = useState<CourseDraft>(EMPTY);
  const [errors, setErrors] = useState<CourseDraftErrors>({});

  const update = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    // Clear a field's red border as soon as it's edited.
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const found = validateCourse(draft);
    setErrors(found);
    if (reportInvalid(found) || !draft.category || !draft.level) return;
    create.mutate(
      {
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        description: draft.description.trim(),
        category: draft.category,
        level: draft.level,
        access: draft.access,
      },
      {
        onSuccess: (id) => {
          toast.success("Draft created", "Add chapters and lessons next.");
          router.replace({ pathname: "/tutor/course/[id]", params: { id } });
        },
        onError: (error) =>
          error instanceof NotAllowedError
            ? toast.error("You're not allowed to create courses.")
            : toast.error("Couldn't create the course.", "Check your connection and try again."),
      },
    );
  };

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/tutor"))}
        />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          New course
        </AppText>
      </View>

      <KeyboardAvoidingView style={tw`flex-1`} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={tw`px-screen pb-8 gap-6`} keyboardShouldPersistTaps="handled">
          <AppText variant="body">
            Start with the basics. Your course is saved as a draft, so learners won&apos;t see it until you publish it.
          </AppText>

          <CourseDetailsFields draft={draft} errors={errors} onChange={update} />
        </ScrollView>
      </KeyboardAvoidingView>

      <StickyFooter tone="canvas">
        <Button title="Create draft" loading={create.isPending} disabled={create.isPending} onPress={submit} />
      </StickyFooter>
    </View>
  );
}
