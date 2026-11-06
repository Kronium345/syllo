import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/text";
import { LEVEL_LABELS } from "@/lib/course-level";
import { useCategories } from "@/lib/queries/courses";
import { color, tw } from "@/theme";

import { COURSE_LIMITS, type CourseDraft, type CourseDraftErrors } from "./validate-course";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const ACCESS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
] as const;

/**
 * A course's details form, shared by New course (prompts/21) and Edit course (prompts/22):
 * title, optional subtitle, description, then category, level and access as radio chips.
 * Invalid fields get a red border (or a red chip-group label); the message is a toast.
 */
export function CourseDetailsFields({
  draft,
  errors,
  onChange,
}: {
  draft: CourseDraft;
  errors: CourseDraftErrors;
  onChange: <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => void;
}) {
  const categories = useCategories();

  return (
    <View style={tw`gap-6`}>
      <TextField
        label="Title"
        value={draft.title}
        onChangeText={(text) => onChange("title", text)}
        error={errors.title}
        placeholder="e.g. Introduction to Pharmacology"
        maxLength={COURSE_LIMITS.title.max}
        returnKeyType="next"
      />
      <TextField
        label="Subtitle (optional)"
        value={draft.subtitle}
        onChangeText={(text) => onChange("subtitle", text)}
        error={errors.subtitle}
        placeholder="One line on what learners get"
        maxLength={COURSE_LIMITS.subtitle.max}
      />
      <TextField
        label="Description"
        value={draft.description}
        onChangeText={(text) => onChange("description", text)}
        error={errors.description}
        placeholder="What the course covers and who it's for"
        maxLength={COURSE_LIMITS.description.max}
        multiline
        textAlignVertical="top"
        style={tw`min-h-[120px]`}
      />

      <ChipGroup label="Category" invalid={!!errors.category}>
        {categories.isPending ? (
          <ActivityIndicator color={color("muted")} accessibilityLabel="Loading categories" />
        ) : categories.isError ? (
          <Pressable accessibilityRole="button" onPress={() => categories.refetch()}>
            <AppText variant="callout">
              Couldn&apos;t load categories. <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
            </AppText>
          </Pressable>
        ) : (
          categories.data.map((category) => (
            <Chip
              key={category}
              role="radio"
              label={category}
              selected={draft.category === category}
              onPress={() => onChange("category", category)}
            />
          ))
        )}
      </ChipGroup>

      <ChipGroup label="Level" invalid={!!errors.level}>
        {LEVELS.map((level) => (
          <Chip
            key={level}
            role="radio"
            label={LEVEL_LABELS[level]}
            selected={draft.level === level}
            onPress={() => onChange("level", level)}
          />
        ))}
      </ChipGroup>

      <View style={tw`gap-2`}>
        <ChipGroup label="Access">
          {ACCESS.map((option) => (
            <Chip
              key={option.value}
              role="radio"
              label={option.label}
              selected={draft.access === option.value}
              onPress={() => onChange("access", option.value)}
            />
          ))}
        </ChipGroup>
        <AppText variant="footnote">Premium courses need Syllo Pro to enroll.</AppText>
      </View>
    </View>
  );
}

/** A labelled row of radio chips; the label turns red when nothing is chosen on submit. */
function ChipGroup({ label, invalid = false, children }: { label: string; invalid?: boolean; children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={tw`gap-2`}>
      <AppText variant="caption-strong" style={invalid ? tw`text-danger` : undefined}>
        {label}
      </AppText>
      <View style={tw`flex-row flex-wrap gap-2`}>{children}</View>
    </View>
  );
}
