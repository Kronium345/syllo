// Every TanStack Query key in one place. Keys nest, so invalidating a prefix (e.g.
// queryKeys.courses.all) refreshes every query under it.
export const queryKeys = {
  courses: {
    all: ["courses"] as const,
    list: () => [...queryKeys.courses.all, "list"] as const,
    count: () => [...queryKeys.courses.all, "count"] as const,
  },
};
