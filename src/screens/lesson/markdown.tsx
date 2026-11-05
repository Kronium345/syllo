import { ScrollView, View } from "react-native";

import { inlineMarkdown } from "@/components/ui/inline-markdown";
import { AppText } from "@/components/ui/text";
import { mono, tw } from "@/theme";

// A small markdown renderer for lesson notes (prompts/08): `#`–`###` headings, paragraphs,
// `-`/`*` and `1.` lists, **bold** / *italic*, and (prompts/19) fenced code blocks and
// `inline code`, in the player's text styles (body 15 muted relaxed, headings ink). Anything
// else shows as plain text.

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; language: string | null; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  // A fenced code block keeps its lines exactly (indentation matters), so it's collected
  // before the per-line trim below.
  let code: { language: string | null; lines: string[] } | null = null;
  for (const raw of source.split(/\r?\n/)) {
    const fence = /^\s*```\s*([\w+-]*)\s*$/.exec(raw);
    if (code) {
      if (fence && !fence[1]) {
        blocks.push({ kind: "code", language: code.language, text: code.lines.join("\n").replace(/\s+$/, "") });
        code = null;
      } else {
        code.lines.push(raw.replace(/\t/g, "  "));
      }
      continue;
    }
    if (fence) {
      flush();
      code = { language: fence[1] || null, lines: [] };
      continue;
    }
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (!line) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const ordered = !!numbered;
      const item = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({ kind: "list", ordered, items: [item] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  // An unclosed fence still shows its code rather than losing it.
  if (code) blocks.push({ kind: "code", language: code.language, text: code.lines.join("\n") });
  return blocks;
}

const inline = inlineMarkdown;

const headingStyle = { 1: "text-20", 2: "text-18", 3: "text-16" } as const;

/** Renders lesson notes. `skipTitle` drops a leading heading that repeats the lesson title. */
export function Markdown({ source, skipTitle }: { source: string; skipTitle?: string }) {
  let blocks = parse(source);
  const first = blocks[0];
  if (skipTitle && first?.kind === "heading" && first.text.trim() === skipTitle.trim()) blocks = blocks.slice(1);

  return (
    <View>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <AppText
              key={index}
              accessibilityRole="header"
              style={tw.style(headingStyle[block.level], "font-bold text-ink mb-3", index > 0 && "mt-2")}
            >
              {inline(block.text)}
            </AppText>
          );
        }
        if (block.kind === "code") {
          return (
            <View
              key={index}
              accessible
              accessibilityLabel={`Code${block.language ? ` (${block.language})` : ""}: ${block.text}`}
              style={tw`mb-4 rounded-card bg-surface border border-border overflow-hidden`}
            >
              {block.language ? (
                <AppText variant="badge" style={tw`px-4 pt-3 text-muted`}>
                  {block.language}
                </AppText>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`p-4`}>
                <AppText selectable style={[tw`text-13 leading-relaxed text-ink`, mono]}>
                  {block.text}
                </AppText>
              </ScrollView>
            </View>
          );
        }
        if (block.kind === "list") {
          return (
            <View key={index} style={tw`mb-4 gap-2`}>
              {block.items.map((item, itemIndex) => (
                <View key={itemIndex} style={tw`flex-row`}>
                  <AppText variant="body" style={tw`w-6`}>
                    {block.ordered ? `${itemIndex + 1}.` : "•"}
                  </AppText>
                  <AppText variant="body" style={tw`flex-1`}>
                    {inline(item)}
                  </AppText>
                </View>
              ))}
            </View>
          );
        }
        return (
          <AppText key={index} variant="body" style={tw`mb-4`}>
            {inline(block.text)}
          </AppText>
        );
      })}
    </View>
  );
}
