import {
  Award,
  Briefcase,
  Camera,
  Code,
  Database,
  GraduationCap,
  type LucideIcon,
  Megaphone,
  Palette,
  PenTool,
  TrendingUp,
} from "lucide-react-native";

// The onboarding choices from the prototype (goal_selection_quiz, interest_selection_quiz).
// Ids match the check constraints on profiles.onboarding_goal / profiles.interests.

export type GoalId = "career_advancement" | "switch_career" | "personal_growth" | "certifications";
export type InterestId = "design" | "development" | "marketing" | "business" | "data" | "photography";

export const GOALS: { id: GoalId; icon: LucideIcon; title: string; description: string }[] = [
  { id: "career_advancement", icon: Briefcase, title: "Career Advancement", description: "Get promoted or learn new job skills" },
  { id: "switch_career", icon: GraduationCap, title: "Switch Career Path", description: "Start from zero in a new industry" },
  { id: "personal_growth", icon: Palette, title: "Personal Growth", description: "Explore hobbies and creative interests" },
  { id: "certifications", icon: Award, title: "Certifications", description: "Earn industry-recognized credentials" },
];

/** `category` is the courses.category an interest recommends. */
export const INTERESTS: { id: InterestId; icon: LucideIcon; label: string; category: string }[] = [
  { id: "design", icon: PenTool, label: "UI/UX Design", category: "Design" },
  { id: "development", icon: Code, label: "Development", category: "Development" },
  { id: "marketing", icon: Megaphone, label: "Marketing", category: "Marketing" },
  { id: "business", icon: TrendingUp, label: "Business", category: "Business" },
  { id: "data", icon: Database, label: "Data Science", category: "Data" },
  { id: "photography", icon: Camera, label: "Photography", category: "Photography" },
];

/** "Pick at least 3 topics". */
export const MIN_INTERESTS = 3;

/** The course categories a learner's interests point to. */
export function categoriesFor(interests: readonly string[]): string[] {
  return INTERESTS.filter((interest) => interests.includes(interest.id)).map((interest) => interest.category);
}
