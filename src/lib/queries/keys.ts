import type { CourseFeedFilter } from "@/services/courses";

// Every TanStack Query key in one place. Keys nest, so invalidating a prefix (e.g.
// queryKeys.courses.all) refreshes every query under it.
export const queryKeys = {
  courses: {
    all: ["courses"] as const,
    // Normalised so the same filters (in any order) share one cache entry.
    feed: (filter: CourseFeedFilter) =>
      [
        ...queryKeys.courses.all,
        "feed",
        {
          search: filter.search?.trim() ?? "",
          categories: [...(filter.categories ?? [])].sort(),
          levels: [...(filter.levels ?? [])].sort(),
          duration: filter.duration ?? "any",
          sort: filter.sort ?? "title",
        },
      ] as const,
    categories: () => [...queryKeys.courses.all, "categories"] as const,
    details: (courseId: string) => [...queryKeys.courses.all, "details", courseId] as const,
    students: (courseId: string) => [...queryKeys.courses.all, "students", courseId] as const,
    // The tutor dashboard (prompts/20): under "courses", so course invalidation refreshes it too.
    mine: (userId: string | null) => [...queryKeys.courses.all, "mine", userId] as const,
    // The course editor (prompts/22).
    tutor: (courseId: string, userId: string | null) => [...queryKeys.courses.all, "tutor", courseId, userId] as const,
    // The lesson editor (prompts/23).
    tutorLesson: (lessonId: string, userId: string | null) =>
      [...queryKeys.courses.all, "tutor-lesson", lessonId, userId] as const,
  },
  interviews: {
    all: ["interviews"] as const,
    sessionsLeft: () => [...queryKeys.interviews.all, "sessions-left"] as const,
    session: (sessionId: string) => [...queryKeys.interviews.all, "session", sessionId] as const,
  },
  viva: {
    all: ["viva"] as const,
    sessionsLeft: () => [...queryKeys.viva.all, "sessions-left"] as const,
    session: (sessionId: string) => [...queryKeys.viva.all, "session", sessionId] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    mine: (courseId: string, userId: string | null | undefined) =>
      [...queryKeys.reviews.all, "mine", courseId, userId ?? null] as const,
  },
  enrollments: {
    all: ["enrollments"] as const,
    latest: () => [...queryKeys.enrollments.all, "latest"] as const,
    courses: () => [...queryKeys.enrollments.all, "courses"] as const,
  },
  lessons: {
    all: ["lessons"] as const,
    detail: (lessonId: string) => [...queryKeys.lessons.all, lessonId] as const,
    video: (lessonId: string) => [...queryKeys.lessons.all, lessonId, "video"] as const,
  },
  progress: {
    all: ["progress"] as const,
    mine: () => [...queryKeys.progress.all, "mine"] as const,
  },
  profiles: {
    all: ["profiles"] as const,
    me: (userId: string | null | undefined) => [...queryKeys.profiles.all, "me", userId ?? null] as const,
  },
  quizzes: {
    all: ["quizzes"] as const,
    start: (quizId: string) => [...queryKeys.quizzes.all, "start", quizId] as const,
    sessionsLeft: () => [...queryKeys.quizzes.all, "sessions-left"] as const,
    attempt: (attemptId: string) => [...queryKeys.quizzes.all, "attempt", attemptId] as const,
    flags: () => [...queryKeys.quizzes.all, "flags"] as const,
    unfinished: () => [...queryKeys.quizzes.all, "unfinished"] as const,
  },
  purchases: {
    all: ["purchases"] as const,
    offering: () => [...queryKeys.purchases.all, "offering"] as const,
    customerInfo: () => [...queryKeys.purchases.all, "customer-info"] as const,
  },
};
