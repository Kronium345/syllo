import { useEvent } from "expo";
import { Image, type ImageSource } from "expo-image";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { ChevronLeft, Maximize, Pause, Play } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { Glass } from "@/components/ui/glass";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { formatClock } from "@/lib/format-duration";
import { color, pressScale, tw } from "@/theme";

/**
 * The player's 16:9 video (lesson_player #video-fixed-section): the course cover at 80%
 * until playback starts, the bottom gradient with time, maximize and progress, the centred
 * glass play button and the back button. Native controls are off; these are the design's.
 */
export function LessonVideo({
  videoUrl,
  poster,
  fallbackDuration,
  onBack,
}: {
  videoUrl: string | null;
  poster: ImageSource | null;
  /** The lesson's length from the outline, until the video reports its own. */
  fallbackDuration: number;
  onBack: () => void;
}) {
  const backTop = useTopPadding(48);
  const view = useRef<VideoView>(null);
  const [started, setStarted] = useState(false);
  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.timeUpdateEventInterval = 0.5;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const time = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  // Leaving the lesson stops the sound.
  useEffect(() => () => player.pause(), [player]);

  const duration = player.duration > 0 ? player.duration : fallbackDuration;
  const progress = duration > 0 ? time.currentTime / duration : 0;
  const failed = status === "error" || !videoUrl;

  const toggle = () => {
    if (failed) return;
    setStarted(true);
    if (isPlaying) player.pause();
    else player.play();
  };

  return (
    <View style={tw`w-full aspect-video bg-black`}>
      {videoUrl ? (
        <VideoView
          ref={view}
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={tw`absolute inset-0`}
        />
      ) : null}
      {!started && poster ? (
        <Image
          source={poster}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          style={[tw`absolute inset-0`, { opacity: 0.8 }]}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          tw`absolute inset-0 justify-end p-4`,
          { backgroundImage: `linear-gradient(180deg, transparent 60%, ${color("video-shade")} 100%)` },
        ]}
      >
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <AppText style={tw`text-12 font-medium text-white`}>
            {formatClock(time.currentTime)} / {formatClock(duration)}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Full screen"
            hitSlop={8}
            onPress={() => view.current?.enterFullscreen().catch(() => undefined)}
          >
            <Icon as={Maximize} size="lg" color="white" />
          </Pressable>
        </View>
        <ProgressBar progress={progress} size="sm" track="bg-veil-strong" />
      </View>

      <View pointerEvents="box-none" style={tw`absolute inset-0 items-center justify-center`}>
        {failed ? (
          <AppText style={tw`text-14 font-medium text-white`}>Couldn&apos;t play this video.</AppText>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            onPress={toggle}
            style={({ pressed }) => pressScale(pressed, 0.9)}
          >
            <Glass style={tw`w-16 h-16 rounded-full items-center justify-center border border-veil-strong bg-veil`}>
              <Icon as={isPlaying ? Pause : Play} size="2xl" color="white" />
            </Glass>
          </Pressable>
        )}
      </View>

      <IconButton
        icon={ChevronLeft}
        variant="glass-dark"
        accessibilityLabel="Back"
        onPress={onBack}
        style={[tw`absolute left-6`, { top: backTop }]}
      />
    </View>
  );
}

/** Back to the course page, or Home when the lesson was opened directly. */
export function leaveLesson(courseId: string | null) {
  if (router.canGoBack()) router.back();
  else if (courseId) router.replace({ pathname: "/course/[id]", params: { id: courseId } });
  else router.replace("/home");
}
