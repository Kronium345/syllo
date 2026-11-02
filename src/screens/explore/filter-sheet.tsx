import { type ReactNode, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { useCourseFeed } from "@/lib/queries/courses";
import { tw } from "@/theme";

import {
  activeFilterCount,
  DURATION_OPTIONS,
  EMPTY_FILTERS,
  type ExploreFilters,
  LEVEL_OPTIONS,
  SORT_OPTIONS,
  toggle,
} from "./filters";

/**
 * Explore's Filters sheet (prompts/13, not in the design: built in its language like Settings).
 * Choices are a draft until "Show N courses"; closing any other way throws the draft away.
 * The count runs the feed query with the draft, so applying usually hits the cache.
 */
export function FilterSheet({
  visible,
  applied,
  categories,
  search,
  onApply,
  onClose,
}: {
  visible: boolean;
  applied: ExploreFilters;
  categories: string[];
  search: string;
  onApply: (filters: ExploreFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(applied);
  // Start from the applied filters every time the sheet opens (state adjusted during render).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(applied);
  }

  const preview = useCourseFeed({ search, ...draft }, { enabled: visible });
  const count = preview.data?.length;
  const counting = preview.isPending || (preview.isFetching && preview.isPlaceholderData);

  const showTitle = preview.isError
    ? "Show results"
    : count === undefined
      ? "Show courses"
      : count === 0
        ? "No courses match"
        : `Show ${count} ${count === 1 ? "course" : "courses"}`;

  const update = (patch: Partial<ExploreFilters>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={tw`flex-row gap-3`}>
          <Button
            title="Reset"
            variant="outline"
            disabled={activeFilterCount(draft) === 0}
            onPress={() => setDraft(EMPTY_FILTERS)}
            style={tw`flex-1`}
          />
          <Button
            title={showTitle}
            loading={counting}
            disabled={!preview.isError && count === 0}
            onPress={() => onApply(draft)}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <View style={tw`gap-6 pt-2`}>
        <Section title="Sort by">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              role="radio"
              selected={draft.sort === option.value}
              onPress={() => update({ sort: option.value })}
            />
          ))}
        </Section>

        {categories.length > 0 ? (
          <Section title="Category">
            {categories.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={draft.categories.includes(name)}
                onPress={() => update({ categories: toggle(draft.categories, name) })}
              />
            ))}
          </Section>
        ) : null}

        <Section title="Level">
          {LEVEL_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={draft.levels.includes(option.value)}
              onPress={() => update({ levels: toggle(draft.levels, option.value) })}
            />
          ))}
        </Section>

        <Section title="Duration">
          {DURATION_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              role="radio"
              selected={draft.duration === option.value}
              onPress={() => update({ duration: option.value })}
            />
          ))}
        </Section>
      </View>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <AppText accessibilityRole="header" style={tw`mb-3 text-16 font-semibold text-ink`}>
        {title}
      </AppText>
      <View style={tw`flex-row flex-wrap gap-2`}>{children}</View>
    </View>
  );
}
