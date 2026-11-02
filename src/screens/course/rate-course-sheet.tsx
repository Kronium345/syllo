import { Star } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { type MyReview, useRateCourse } from "@/lib/queries/reviews";
import { NotAllowedError } from "@/services/errors";
import { pressScale, tw } from "@/theme";

const STARS = [1, 2, 3, 4, 5] as const;
const COMMENT_LIMIT = 1000;
const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * "Rate this course" (prompts/16, not in the design: built in its language like Settings and
 * the Filters sheet). Five stars plus an optional comment; Save upserts the learner's review,
 * Remove deletes it. Only enrolled learners reach it (RLS enforces the same).
 */
export function RateCourseSheet({
  visible,
  courseId,
  courseTitle,
  current,
  onClose,
}: {
  visible: boolean;
  courseId: string;
  courseTitle: string;
  current: MyReview | null;
  onClose: () => void;
}) {
  const rate = useRateCourse();
  const [rating, setRating] = useState(current?.rating ?? 0);
  const [comment, setComment] = useState(current?.comment ?? "");
  // Start from the saved review every time the sheet opens (state adjusted during render).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setRating(current?.rating ?? 0);
      setComment(current?.comment ?? "");
    }
  }

  const save = (review: MyReview | null) =>
    rate.mutate(
      { courseId, review },
      {
        onSuccess: () => {
          toast.success(review ? "Thanks for rating!" : "Rating removed", courseTitle);
          onClose();
        },
        onError: (error) =>
          error instanceof NotAllowedError
            ? toast.error("Enroll to rate this course.")
            : toast.error("Couldn't save your rating.", "Check your connection and try again."),
      },
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Rate this course"
      footer={
        <View style={tw`flex-row gap-3`}>
          {current ? (
            <Button
              title="Remove"
              variant="outline"
              disabled={rate.isPending}
              onPress={() => save(null)}
              style={tw`flex-1`}
            />
          ) : null}
          <Button
            title="Save"
            loading={rate.isPending}
            disabled={rating === 0}
            onPress={() => save({ rating, comment: comment.trim() || null })}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <View style={tw`gap-5 pt-2`}>
        <AppText variant="body">{courseTitle}</AppText>
        <View style={tw`items-center gap-2`}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Rating" style={tw`flex-row gap-2`}>
            {STARS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${value} ${value === 1 ? "star" : "stars"}`}
                accessibilityState={{ checked: rating === value }}
                hitSlop={6}
                onPress={() => setRating(value)}
                style={({ pressed }) => pressScale(pressed, 0.9)}
              >
                <Icon as={Star} size="2xl" color={value <= rating ? "star" : "faint"} filled={value <= rating} />
              </Pressable>
            ))}
          </View>
          <AppText variant="caption">{rating ? LABELS[rating] : "Tap a star"}</AppText>
        </View>
        <TextField
          label="Comment (optional)"
          placeholder="What did you like, or what could be better?"
          value={comment}
          onChangeText={setComment}
          maxLength={COMMENT_LIMIT}
          multiline
          style={tw`min-h-[96px]`}
          textAlignVertical="top"
        />
      </View>
    </Sheet>
  );
}
