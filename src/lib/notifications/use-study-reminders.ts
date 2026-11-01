import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

import { useEnrolledCourses } from "../queries/enrollments";
import { useProgress } from "../queries/progress";
import { useUnfinishedAttempts } from "../queries/quizzes";
import { canAskPermission, notificationsSupported, notificationUrl, permissionState, requestPermission } from "./local";
import { hasAskedForNotifications, markAskedForNotifications, useRemindersEnabled } from "./preferences";
import { resyncStudyReminders, syncStudyReminders, type UnfinishedCourse, type UnfinishedQuiz } from "./study-reminders";

/**
 * Keeps the study reminders (prompts/12) in step with the learner's unfinished work: rebuilds
 * them when the work or the Settings switch changes and whenever the app comes back to the
 * foreground (so "24 hours" counts from the last visit), and opens a tapped reminder's
 * `data.url`. Mounted in (app)/_layout.tsx for onboarded learners only.
 */
export function useStudyReminders() {
  const attempts = useUnfinishedAttempts();
  const enrolled = useEnrolledCourses();
  const progress = useProgress();
  const enabled = useRemindersEnabled();

  const work = useMemo(() => {
    if (!attempts.data || !enrolled.data || !progress.data) return null;
    const completed = new Set(progress.data.map((row) => row.lessonId));
    const quizzes: UnfinishedQuiz[] = attempts.data.map((attempt) => ({
      attemptId: attempt.attemptId,
      title: attempt.quizTitle,
    }));
    const courses: UnfinishedCourse[] = enrolled.data
      .filter((course) => course.lessonIds.some((id) => !completed.has(id)))
      .map((course) => ({ courseId: course.id, title: course.title }));
    return { quizzes, courses };
  }, [attempts.data, enrolled.data, progress.data]);

  // A stable key, so a refetch that changes nothing doesn't reschedule.
  const signature = work
    ? `${enabled}|${work.quizzes.map((q) => q.attemptId).join(",")}|${work.courses.map((c) => c.courseId).join(",")}`
    : null;
  const latest = useRef(work);
  useEffect(() => {
    latest.current = work;
  });

  useEffect(() => {
    if (!signature || !latest.current) return;
    syncStudyReminders(latest.current);
  }, [signature]);

  // Back in the foreground: restart the 24-hour clock.
  useEffect(() => {
    if (!notificationsSupported) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && latest.current) syncStudyReminders(latest.current);
    });
    return () => subscription.remove();
  }, []);

  // Tapping a reminder (app in the background, or launched from it) opens its route.
  useEffect(() => {
    if (!notificationsSupported) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = notificationUrl(response?.notification.request.content.data);
      if (url) router.push(url);
    };
    open(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

/**
 * Asks for notification permission the first time Home opens on this device (as the older app
 * did on its home screen), only if the OS would still show its dialog. Then rebuilds the reminders.
 */
export function useAskNotificationsOnce() {
  const asked = useRef(false);
  useEffect(() => {
    if (!notificationsSupported || asked.current) return;
    asked.current = true;
    (async () => {
      if ((await permissionState()) === "granted") return true;
      // Once per device: Android reports a never-asked permission as "denied", so the OS
      // status can't say whether we already asked.
      if ((await hasAskedForNotifications()) || !(await canAskPermission())) return false;
      await markAskedForNotifications();
      return requestPermission();
    })()
      .then((granted) => (granted ? resyncStudyReminders() : undefined))
      .catch(() => undefined);
  }, []);
}

/** Renders nothing; runs useStudyReminders where a hook can't be called conditionally. */
export function StudyReminders() {
  useStudyReminders();
  return null;
}
