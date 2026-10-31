import type { CourseFeedFilter } from "@/services/courses";

// Every TanStack Query key in one place. Keys nest, so invalidating a prefix (e.g.
// queryKeys.courses.all) refreshes every query under it.
export const queryKeys = {
  courses: {
    all: ["courses"] as const,
    feed: (filter: CourseFeedFilter) =>
      [...queryKeys.courses.all, "feed", { search: filter.search?.trim() ?? "", category: filter.category ?? null }] as const,
    categories: () => [...queryKeys.courses.all, "categories"] as const,
    details: (courseId: string) => [...queryKeys.courses.all, "details", courseId] as const,
    students: (courseId: string) => [...queryKeys.courses.all, "students", courseId] as const,
  },
  enrollments: {
    all: ["enrollments"] as const,
    latest: () => [...queryKeys.enrollments.all, "latest"] as const,
    courses: () => [...queryKeys.enrollments.all, "courses"] as const,
  },
  lessons: {
    all: ["lessons"] as const,
    detail: (lessonId: string) => [...queryKeys.lessons.all, lessonId] as const,
  },
  progress: {
    all: ["progress"] as const,
    mine: () => [...queryKeys.progress.all, "mine"] as const,
  },
  profiles: {
    all: ["profiles"] as const,
    me: (userId: string | null | undefined) => [...queryKeys.profiles.all, "me", userId ?? null] as const,
  },
  purchases: {
    all: ["purchases"] as const,
    offering: () => [...queryKeys.purchases.all, "offering"] as const,
    customerInfo: () => [...queryKeys.purchases.all, "customer-info"] as const,
  },
};
