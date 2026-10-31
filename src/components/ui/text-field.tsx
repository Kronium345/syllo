import { Eye, EyeOff } from "lucide-react-native";
import { type ComponentRef, type Ref, useState } from "react";
import { Pressable, TextInput, type TextInputProps, View } from "react-native";

import { color, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

export type TextInputRef = ComponentRef<typeof TextInput>;

type TextFieldProps = TextInputProps & {
  label: string;
  /** Validation message: draws the red border and is read as the field's hint. The
   *  message itself is shown by the screen (a toast), not inline. */
  error?: string;
  ref?: Ref<TextInputRef>;
};

/**
 * Labelled text input in the design's field style (Explore's search field: subtle fill,
 * hairline border, rounded-2xl, primary ring on focus). Password fields get an eye toggle.
 * Forms aren't in the design, so the label sizing is estimated (caption-strong).
 */
export function TextField({ label, error, ref, style, secureTextEntry, onFocus, onBlur, ...input }: TextFieldProps) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={tw`gap-2`}>
      <AppText variant="caption-strong">{label}</AppText>
      <View
        style={[
          tw.style("flex-row items-center gap-3 bg-subtle border rounded-2xl px-4", error ? "border-danger" : "border-border"),
          focused && !error && tw`shadow-focus`,
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={color("placeholder")}
          selectionColor={color("primary")}
          cursorColor={color("primary")}
          secureTextEntry={secureTextEntry && hidden}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          // outlineWidth 0: no browser focus ring on web; the field draws its own.
          style={[tw`flex-1 py-3.5 text-15 text-ink`, { outlineWidth: 0 }, style]}
          {...input}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
          >
            <Icon as={hidden ? EyeOff : Eye} size="lg" color="muted" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
