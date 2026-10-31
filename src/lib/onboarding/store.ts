import { useSyncExternalStore } from "react";

import type { GoalId, InterestId } from "./options";

// The answers a signed-out visitor gives during onboarding, kept in memory until they've
// signed up, then saved to their Supabase profile (useSaveOnboardingAnswers) and cleared.

export type OnboardingAnswers = { goal: GoalId | null; interests: InterestId[] };

const empty: OnboardingAnswers = { goal: null, interests: [] };
let answers = empty;
const listeners = new Set<() => void>();

function set(next: OnboardingAnswers) {
  answers = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const onboarding = {
  get: () => answers,
  setGoal: (goal: GoalId) => set({ ...answers, goal }),
  toggleInterest: (id: InterestId) =>
    set({
      ...answers,
      interests: answers.interests.includes(id)
        ? answers.interests.filter((interest) => interest !== id)
        : [...answers.interests, id],
    }),
  reset: () => set(empty),
};

export function useOnboardingAnswers(): OnboardingAnswers {
  return useSyncExternalStore(subscribe, onboarding.get, onboarding.get);
}
