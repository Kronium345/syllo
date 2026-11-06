import { useState } from "react";
import { View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

import { Markdown } from "../lesson/markdown";

/** The lesson_contents.body limit the update_lesson RPC enforces (prompts/23). */
export const NOTES_MAX = 30000;

/**
 * Lesson notes in the lesson editor (prompts/23): markdown in a large text field, or a preview
 * rendered by the lesson player's own `Markdown`, so the tutor sees exactly what learners see.
 */
export function NotesEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <View style={tw`gap-3`}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Notes view" style={tw`flex-row gap-2`}>
        <Chip role="radio" label="Edit" selected={mode === "edit"} onPress={() => setMode("edit")} />
        <Chip role="radio" label="Preview" selected={mode === "preview"} onPress={() => setMode("preview")} />
      </View>
      {mode === "edit" ? (
        <View style={tw`gap-2`}>
          <TextField
            label="Notes"
            value={value}
            onChangeText={onChange}
            error={invalid ? "Notes are too long." : undefined}
            placeholder="What learners should take away from this lesson"
            maxLength={NOTES_MAX}
            multiline
            textAlignVertical="top"
            style={tw`min-h-[240px]`}
          />
          <AppText variant="footnote">
            Markdown: ## heading, - list item, **bold**, *italic*, `code`, and ``` on its own line around code blocks.
          </AppText>
        </View>
      ) : value.trim() ? (
        <View style={tw`bg-surface border border-border rounded-2xl p-4`}>
          <Markdown source={value} />
        </View>
      ) : (
        <AppText variant="body">Nothing to preview yet.</AppText>
      )}
    </View>
  );
}
