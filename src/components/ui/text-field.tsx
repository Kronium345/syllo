import { Eye, EyeOff } from "lucide-react-native";
import { type ComponentRef, type Ref, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { colors } from "./placeholder-colors";

export type TextInputRef = ComponentRef<typeof TextInput>;

type TextFieldProps = TextInputProps & {
  label: string;
  /** Validation message: draws the red border and is read as the field's hint. The
   *  message itself is shown by the screen (a toast), not inline. */
  error?: string;
  ref?: Ref<TextInputRef>;
};

/** Labelled text input. Password fields get havenly's eye toggle. Placeholder styles. */
export function TextField({ label, error, ref, style, secureTextEntry, ...input }: TextFieldProps) {
  // Password fields start hidden; the eye button reveals them.
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, style]}
          {...input}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
          >
            {hidden ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontWeight: "500", color: colors.ink },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  // outlineWidth 0: no browser focus ring on web; the row draws the border.
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.ink, outlineWidth: 0 },
  inputError: { borderColor: colors.danger },
});
