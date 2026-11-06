import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { type TutorCourseDetails, useSetCoursePublished } from "@/lib/queries/tutor";
import { tw } from "@/theme";

import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { reportTutorFailure } from "./report-tutor-failure";

/**
 * A course's publishing status with Publish / Unpublish (prompts/22), shared by the course
 * overview and the editor (prompts/25). Publishing needs at least one lesson (the database checks
 * it too); unpublishing asks first, since learners lose access until it's published again.
 */
export function PublishingCard({ course }: { course: TutorCourseDetails }) {
  const setPublished = useSetCoursePublished();
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const lessonCount = course.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);

  const publish = () =>
    setPublished.mutate(
      { courseId: course.id, published: true },
      {
        onSuccess: () => toast.success("Course published", "Learners can now find it in Explore."),
        onError: (error) => reportTutorFailure(error),
      },
    );

  const unpublish = () =>
    setPublished.mutate(
      { courseId: course.id, published: false },
      {
        onSuccess: () => {
          setConfirmUnpublish(false);
          toast.info("Course unpublished", "It's a draft again.");
        },
        onError: (error) => reportTutorFailure(error),
      },
    );

  return (
    <Card style={tw`p-4 gap-3`}>
      <AppText variant="body">
        {course.isPublished
          ? "Published: learners can find this course in Explore and enroll."
          : lessonCount === 0
            ? "Draft. Add a lesson to publish."
            : "Draft: only you can see this course."}
      </AppText>
      {course.isPublished ? (
        <Button
          title="Unpublish"
          variant="outline"
          disabled={setPublished.isPending}
          onPress={() => setConfirmUnpublish(true)}
        />
      ) : (
        <Button
          title="Publish course"
          loading={setPublished.isPending}
          disabled={lessonCount === 0 || setPublished.isPending}
          onPress={publish}
        />
      )}
      <ConfirmSheet
        visible={confirmUnpublish}
        title="Unpublish course?"
        message="Learners won't be able to find or open the course until you publish it again. Their progress is kept."
        confirmLabel="Unpublish"
        busy={setPublished.isPending}
        onConfirm={unpublish}
        onClose={() => setConfirmUnpublish(false)}
      />
    </Card>
  );
}
