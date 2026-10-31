import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";

import { useSaveOnboarding } from "../queries/profiles";
import { onboarding, useOnboardingAnswers } from "./store";

/**
 * After sign-up, saves the answers given during onboarding to the learner's Supabase
 * profile once, then clears them. A failure keeps them for the next mount (logged only;
 * the app works without them). Mounted in (app)/_layout.tsx.
 */
export function useSaveOnboardingAnswers() {
  const { userId } = useAuth();
  const answers = useOnboardingAnswers();
  const { mutate } = useSaveOnboarding();
  const saving = useRef(false);
  const hasAnswers = answers.goal !== null || answers.interests.length > 0;

  useEffect(() => {
    if (!userId || !hasAnswers || saving.current) return;
    saving.current = true;
    mutate(
      { userId, goal: answers.goal, interests: answers.interests },
      {
        onSuccess: () => onboarding.reset(),
        onError: (error) => console.warn("Couldn't save the onboarding answers:", error.message),
        onSettled: () => {
          saving.current = false;
        },
      },
    );
  }, [userId, hasAnswers, answers, mutate]);
}
