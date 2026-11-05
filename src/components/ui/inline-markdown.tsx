import { Fragment, type ReactNode } from "react";

import { AppText } from "@/components/ui/text";
import { mono, tw } from "@/theme";

// Inline markdown inside one line of text: **bold**, *italic* and `code` (prompts/19). Used by
// lesson notes and by quiz prompts, answers and explanations, which may contain code
// (React Native Basics, Python…). Put the result inside an AppText so it inherits that style.

const SPANS = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function inlineMarkdown(text: string): ReactNode[] {
  return text.split(SPANS).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <AppText key={index} style={[tw`text-ink bg-subtle`, mono]}>
          {part.slice(1, -1)}
        </AppText>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <AppText key={index} style={tw`font-bold text-ink`}>
          {part.slice(2, -2)}
        </AppText>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <AppText key={index} style={tw`italic`}>
          {part.slice(1, -1)}
        </AppText>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** The same text without markers, for accessibility labels and reading aloud. */
export function plainText(text: string): string {
  return text.replace(SPANS, (span) => span.replace(/^(\*\*|\*|`)|(\*\*|\*|`)$/g, ""));
}
