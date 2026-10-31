import { router } from "expo-router";
import { SlidersHorizontal } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { Glass } from "@/components/ui/glass";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { featureComingSoon } from "@/lib/coming-soon";
import { useCategories, useCourseFeed } from "@/lib/queries/courses";
import { color, tw } from "@/theme";

import { FeedItem } from "./feed-item";

// Wait this long after the last keystroke before searching.
const SEARCH_DEBOUNCE_MS = 300;

/** course_search_feed: search, category chips and the course feed. */
export function ExploreScreen() {
  const paddingTop = useTopPadding(56);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useCategories();
  const feed = useCourseFeed({ search, category });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const count = feed.data?.length ?? 0;
  const term = search || category;
  const results = `Found ${count} ${count === 1 ? "result" : "results"}${term ? ` for "${term}"` : ""}`;

  return (
    <View style={tw`flex-1 bg-surface`}>
      <Glass tone="strong" style={[tw`px-screen pb-4 border-b border-border flex-row items-center gap-3`, { paddingTop }]}>
        <SearchField
          value={text}
          onChangeText={setText}
          placeholder="Search for any course..."
          accessibilityLabel="Search courses"
          autoCorrect={false}
        />
        <IconButton
          icon={SlidersHorizontal}
          variant="filter"
          accessibilityLabel="Filters"
          onPress={() => featureComingSoon("Filters")}
        />
      </Glass>

      <FlatList
        data={feed.isError ? [] : (feed.data ?? [])}
        keyExtractor={(course) => course.id}
        refreshing={feed.isRefetching && !feed.isPlaceholderData}
        onRefresh={() => {
          feed.refetch();
          categories.refetch();
        }}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={tw`gap-2 px-screen py-4`}
            >
              <Chip label="All Courses" selected={category === null} onPress={() => setCategory(null)} />
              {(categories.data ?? []).map((name) => (
                <Chip key={name} label={name} selected={category === name} onPress={() => setCategory(name)} />
              ))}
            </ScrollView>
            {feed.isSuccess ? (
              <AppText variant="callout" style={tw`px-screen mb-4 font-medium`}>
                {results}
              </AppText>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => <FeedItem course={item} first={index === 0} onPress={() => router.push({ pathname: "/course/[id]", params: { id: item.id } })} />}
        ItemSeparatorComponent={() => <View style={tw`h-6`} />}
        ListEmptyComponent={
          feed.isPending ? (
            <View accessibilityRole="progressbar" accessibilityLabel="Loading courses" style={tw`py-16 items-center`}>
              <ActivityIndicator color={color("muted")} />
            </View>
          ) : feed.isError ? (
            <Pressable accessibilityRole="button" onPress={() => feed.refetch()} style={tw`py-16 items-center gap-2`}>
              <AppText variant="callout">Couldn&apos;t load courses.</AppText>
              <AppText style={tw`text-14 font-semibold text-primary`}>
                {feed.isFetching ? "Trying again…" : "Try again"}
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="callout" style={tw`py-16 text-center`}>
              No courses match your search.
            </AppText>
          )
        }
        contentContainerStyle={tw`pb-6`}
      />
    </View>
  );
}
