// Tutor hooks (Part 2), one per file. Import from "@/lib/queries/tutor".
export type {
  CourseDetailsInput,
  NewCourseInput,
  TutorChapter,
  TutorCourse,
  TutorCourseDetails,
  TutorLesson,
  TutorLessonDetails,
  TutorLessonResource,
} from "@/services/tutor";
export { type PickedFile, UPLOAD_RULES, fileSize, normaliseMimeType } from "@/services/lesson-uploads";
export { useAddChapter } from "./use-add-chapter";
export { useAddLesson } from "./use-add-lesson";
export { useAddLessonResource } from "./use-add-lesson-resource";
export { useCreateCourse } from "./use-create-course";
export { useDeleteChapter } from "./use-delete-chapter";
export { useDeleteLesson } from "./use-delete-lesson";
export { useDeleteLessonResource } from "./use-delete-lesson-resource";
export { useMoveChapter } from "./use-move-chapter";
export { useMoveLesson } from "./use-move-lesson";
export { useMyCourses } from "./use-my-courses";
export { useRemoveLessonVideo } from "./use-remove-lesson-video";
export { useRenameChapter } from "./use-rename-chapter";
export { useSetCoursePublished } from "./use-set-course-published";
export { useTutorCourse } from "./use-tutor-course";
export { useTutorLesson } from "./use-tutor-lesson";
export { useUpdateCourse } from "./use-update-course";
export { useUpdateLesson } from "./use-update-lesson";
export { useUploadLessonVideo } from "./use-upload-lesson-video";
