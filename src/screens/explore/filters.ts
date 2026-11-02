import { LEVEL_LABELS } from "@/lib/course-level";
import type { CourseLevel, CourseSort, DurationFilter } from "@/lib/queries/courses";

// Explore's filter model (prompts/13): what the sheet edits and the feed is queried with.
// Plain data and helpers, no React.

export type ExploreFilters = {
  /** Empty: "All Courses". */
  categories: string[];
  levels: CourseLevel[];
  duration: DurationFilter;
  sort: CourseSort;
};

export const EMPTY_FILTERS: ExploreFilters = { categories: [], levels: [], duration: "any", sort: "title" };

export const SORT_OPTIONS: { value: CourseSort; label: string }[] = [
  { value: "title", label: "A–Z" },
  { value: "newest", label: "Newest" },
  { value: "shortest", label: "Shortest first" },
  { value: "longest", label: "Longest first" },
];

export const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = (
  ["beginner", "intermediate", "advanced"] as const
).map((value) => ({ value, label: LEVEL_LABELS[value] }));

export const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "any", label: "Any length" },
  { value: "under-1h", label: "Under 1 hour" },
  { value: "1-2h", label: "1–2 hours" },
  { value: "over-2h", label: "Over 2 hours" },
];

/** How many filter groups differ from the defaults (the badge on the filter button). */
export function activeFilterCount(filters: ExploreFilters): number {
  return (
    Number(filters.categories.length > 0) +
    Number(filters.levels.length > 0) +
    Number(filters.duration !== "any") +
    Number(filters.sort !== "title")
  );
}

/** Adds the value if missing, removes it if present. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
