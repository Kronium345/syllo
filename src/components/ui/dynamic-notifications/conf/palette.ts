import { color } from "@/theme";

// The banner's colours, from the design-system tokens (prompts/01-design-system.md).
const PALETTE = {
  island: color("black"),
  card: color("surface"),
  accent: color("primary"),
  message: color("muted"),
  avatar: color("subtle"),
  shadow: color("shade"),
} as const;

export { PALETTE };
