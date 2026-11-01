import { Search } from "lucide-react-native";
import { useState } from "react";
import { TextInput, type TextInputProps, View } from "react-native";

import { color, tw } from "@/theme";

import { Icon } from "./icon";

/**
 * Explore's search input: subtle fill, border, rounded-2xl, search icon, primary ring on focus.
 * The box (fill, border, radius, focus ring) is a View with the icon and a plain TextInput side
 * by side, matching the prototype's `pl-12` (16 inset + 20 icon + 12 gap). Don't move the
 * border or shadow back onto the TextInput: on Android (new architecture) a TextInput with a
 * border radius or boxShadow gets a rebuilt background that drops its padding, so the text
 * ran under an absolutely placed icon.
 */
export function SearchField({ style, onFocus, onBlur, ...input }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        tw`flex-1 flex-row items-center gap-3 px-4 bg-subtle border border-border rounded-2xl`,
        focused ? tw`shadow-focus` : tw`shadow-none`,
      ]}
    >
      <View pointerEvents="none">
        <Icon as={Search} size="lg" color="muted" />
      </View>
      <TextInput
        accessibilityRole="search"
        placeholderTextColor={color("placeholder")}
        selectionColor={color("primary")}
        cursorColor={color("primary")}
        returnKeyType="search"
        {...input}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          // py-3.5 keeps the prototype's height; px-0 clears Android's default EditText padding.
          tw.style("flex-1 py-3.5 px-0 text-15 text-ink"),
          // No browser focus outline on web; the ring is the box's shadow.
          { outlineWidth: 0 },
          style,
        ]}
      />
    </View>
  );
}
