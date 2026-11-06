import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";

/** Chapter and lesson titles: the outline RPCs (prompts/22) accept 2 to 80 characters. */
export const OUTLINE_TITLE = { min: 2, max: 80 } as const;

/**
 * Asks for one title (add a chapter or lesson, rename a chapter). Mount it with a `key` per
 * use so it starts from `initial`. `onSave` gets the trimmed title; the sheet stays open
 * while `saving`.
 */
export function TitleSheet({
  visible,
  title,
  label,
  initial = "",
  saveLabel,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  label: string;
  initial?: string;
  saveLabel: string;
  saving: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [invalid, setInvalid] = useState(false);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed.length < OUTLINE_TITLE.min) {
      setInvalid(true);
      toast.error(`Enter a ${label.toLowerCase()} of at least ${OUTLINE_TITLE.min} characters.`);
      return;
    }
    onSave(trimmed);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={<Button title={saveLabel} loading={saving} disabled={saving} onPress={save} />}
    >
      <TextField
        label={label}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          if (invalid) setInvalid(false);
        }}
        error={invalid ? `Enter a ${label.toLowerCase()}.` : undefined}
        maxLength={OUTLINE_TITLE.max}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </Sheet>
  );
}
