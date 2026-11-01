import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

import { CHANNEL_ID, notificationsSupported, permissionState } from "./local";
import { loadReminderPreference } from "./preferences";

// Study reminders (prompts/12), ported from the older pharmacy app's home screen:
// - each unfinished quiz and in-progress course gets a reminder 24 hours later;
// - a daily 6 PM check-in runs while anything is unfinished;
// - tapping one opens `data.url`.
// Instead of storing ids and rescheduling by hand (the old app's AsyncStorage + "again in 4
// hours"), every change cancels all `study-reminder` notifications and schedules the current
// set, so finished work drops out and "24 hours" counts from the learner's last visit.

export const STUDY_REMINDER_KIND = "study-reminder";

const DAY_SECONDS = 24 * 60 * 60;
const DAILY_HOUR = 18;
/** Keeps per-task reminders well under iOS's 64 scheduled-notification limit. */
const MAX_TASK_REMINDERS = 10;

export type UnfinishedQuiz = { attemptId: string; title: string };
export type UnfinishedCourse = { courseId: string; title: string };

/** Cancels every scheduled study reminder (sign-out, switch off, before a rebuild). */
export async function cancelStudyReminders() {
  if (!notificationsSupported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === STUDY_REMINDER_KIND)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

function schedule(
  identifier: string,
  title: string,
  body: string,
  url: string,
  trigger: Notifications.NotificationTriggerInput,
  kind = STUDY_REMINDER_KIND,
) {
  return Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data: { kind, url }, sound: "default" },
    trigger,
  });
}

// Rebuilds can overlap (data changes while the app comes to the foreground); run them in turn.
let queue: Promise<void> = Promise.resolve();
// The last work scheduled for, so a permission or switch change can rebuild without new data.
let lastWork: { quizzes: UnfinishedQuiz[]; courses: UnfinishedCourse[] } | null = null;

/**
 * Replaces the scheduled study reminders with ones for this unfinished work. Does nothing
 * but cancel when the learner switched reminders off or notifications aren't allowed.
 */
export function syncStudyReminders(work: { quizzes: UnfinishedQuiz[]; courses: UnfinishedCourse[] }) {
  lastWork = work;
  queue = queue
    .then(async () => {
      if (!notificationsSupported) return;
      await cancelStudyReminders();
      const enabled = await loadReminderPreference();
      if (!enabled || (await permissionState()) !== "granted") return;

      const later = { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: DAY_SECONDS, channelId: CHANNEL_ID } as const;
      const tasks = [
        ...work.quizzes.map((quiz) =>
          schedule(
            `study-quiz-${quiz.attemptId}`,
            "📚 Study Reminder",
            `Don't forget to finish your ${quiz.title} quiz! Keep up the great work 💪`,
            `/attempt/${quiz.attemptId}`,
            later,
          ),
        ),
        ...work.courses.map((course) =>
          schedule(
            `study-course-${course.courseId}`,
            "📚 Study Reminder",
            `Pick up ${course.title} where you left off 💪`,
            `/course/${course.courseId}`,
            later,
          ),
        ),
      ].slice(0, MAX_TASK_REMINDERS);
      await Promise.all(tasks);

      if (work.quizzes.length + work.courses.length > 0) {
        await schedule(
          "study-daily",
          "🎯 Daily Study Check-in",
          "Time to check your progress! Finish your remaining study tasks today.",
          "/home",
          { type: SchedulableTriggerInputTypes.DAILY, hour: DAILY_HOUR, minute: 0, channelId: CHANNEL_ID },
        );
      }
    })
    .catch((error) => console.warn("Couldn't schedule study reminders:", error));
  return queue;
}

/** Rebuilds from the last known work (after permission is granted or the switch is turned on). */
export function resyncStudyReminders() {
  return lastWork ? syncStudyReminders(lastWork) : Promise.resolve();
}

/**
 * Dev check (/design-system): one reminder about 10 seconds from now that opens Home. It has
 * its own kind so a rebuild (e.g. the app coming back to the foreground) doesn't cancel it.
 * Android schedules these alarms inexactly, so it can arrive a few minutes late.
 */
export async function scheduleTestStudyReminder() {
  if (!notificationsSupported) return;
  await schedule(
    "study-test",
    "📚 Study Reminder",
    "This is a test reminder. Tap to open Syllo.",
    "/home",
    { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: CHANNEL_ID },
    "study-reminder-test",
  );
}
