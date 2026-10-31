import { Search } from "lucide-react-native";
import { useState } from "react";
import { TextInput, type TextInputProps, View } from "react-native";

import { color, tw } from "@/theme";

import { Icon } from "./icon";

/** Explore's search input: subtle fill, border, rounded-2xl, search icon, primary ring on focus. */
export function SearchField({ style, onFocus, onBlur, ...input }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={tw`flex-1 justify-center`}>
      <View style={tw`absolute left-4 z-10`} pointerEvents="none">
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
          tw.style("w-full bg-subtle border border-border rounded-2xl py-3.5 pl-12 pr-4 text-15 text-ink"),
          // No browser focus outline on web; the ring is the shadow.
          tw`shadow-none`,
          focused && tw`shadow-focus`,
          { outlineWidth: 0 },
          style,
        ]}
      />
    </View>
  );
}
