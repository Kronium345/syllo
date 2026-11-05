import { useEvent } from "expo";
import { Image, type ImageSource } from "expo-image";
import { router } from "expo-router";
import { useVideoPlayer, type VideoPlayer, VideoView } from "expo-video";
import { ChevronLeft, Maximize, Pause, Play, RotateCcw, RotateCw } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, type GestureResponderEvent, Pressable, View } from "react-native";

import { Glass } from "@/components/ui/glass";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { formatClock } from "@/lib/format-duration";
import { color, pressScale, tw } from "@/theme";

/** Playback speeds the speed button cycles through. */
const SPEEDS = [1, 1.25, 1.5, 2] as const;
const SKIP_SECONDS = 10;

/**
 * The player's 16:9 video (lesson_player #video-fixed-section): the course cover at 80%
 * until playback starts, the bottom gradient with time, speed, maximize and a seekable
 * progress bar, the centred glass play button with skip back/forward 10 s either side, and
 * the back button. Native controls are off; these are the design's (skip, seek and speed
 * added in prompts/19, in the same glass style).
 */
export function LessonVideo({
  videoUrl,
  loading = false,
  poster,
  fallbackDuration,
  onBack,
  onSourceError,
}: {
  videoUrl: string | null;
  /** The signed link is still on its way: show a spinner, not the error. */
  loading?: boolean;
  /** Playback failed; the parent may fetch a fresh link (an expired R2 signature). */
  onSourceError?: () => void;
  poster: ImageSource | null;
  /** The lesson's length from the outline, until the video reports its own. */
  fallbackDuration: number;
  /** Draws the glass back button over the video; omit it where a native header has Back. */
  onBack?: () => void;
}) {
  const backTop = useTopPadding(48);
  const view = useRef<VideoView>(null);
  const [started, setStarted] = useState(false);
  // The player keeps its first link: a refreshed signed link would otherwise restart it.
  // It only switches after a playback error (e.g. the old link expired); see below.
  const [source, setSource] = useState(videoUrl);
  const player = useVideoPlayer(source, (instance) => {
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

  // Take the first link once it arrives, or a fresh one after a playback error.
  if (videoUrl !== null && (source === null || (status === "error" && videoUrl !== source))) setSource(videoUrl);

  // A playback error: ask the parent for a fresh link, once per link.
  const reportedFor = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "error" || reportedFor.current === source) return;
    reportedFor.current = source;
    onSourceError?.();
  }, [status, source, onSourceError]);

  const duration = player.duration > 0 ? player.duration : fallbackDuration;
  // While the learner drags the progress bar, show where they're dragging to.
  const [scrub, setScrub] = useState<number | null>(null);
  const shownTime = scrub ?? time.currentTime;
  const progress = duration > 0 ? Math.min(1, shownTime / duration) : 0;
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [barWidth, setBarWidth] = useState(0);
  const failed = !loading && (status === "error" || !source);

  const skip = (seconds: number) => {
    if (failed) return;
    player.seekBy(seconds);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setPlaybackRate(player, next);
    setSpeed(next);
  };

  /** The time under a touch on the progress bar. */
  const timeAt = (event: GestureResponderEvent) =>
    barWidth > 0 ? Math.max(0, Math.min(1, event.nativeEvent.locationX / barWidth)) * duration : 0;
  const seekTo = (seconds: number) => {
    player.seekBy(seconds - player.currentTime);
    setScrub(null);
  };

  const toggle = () => {
    if (failed) return;
    setStarted(true);
    if (isPlaying) player.pause();
    else player.play();
  };

  return (
    <View style={tw`w-full aspect-video bg-black`}>
      {source ? (
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
            {formatClock(shownTime)} / {formatClock(duration)}
          </AppText>
          <View style={tw`flex-row items-center gap-4`}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Playback speed ${speed} times`}
              accessibilityHint="Changes the playback speed"
              hitSlop={8}
              onPress={cycleSpeed}
              style={tw`px-2 py-0.5 rounded-md bg-veil`}
            >
              <AppText style={tw`text-12 font-bold text-white`}>{speed}×</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Full screen"
              hitSlop={8}
              onPress={() => view.current?.enterFullscreen().catch(() => undefined)}
            >
              <Icon as={Maximize} size="lg" color="white" />
            </Pressable>
          </View>
        </View>
        {/* Tap or drag to seek; a screen reader adjusts it in 10 s steps. */}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Video position"
          accessibilityValue={{ text: `${formatClock(shownTime)} of ${formatClock(duration)}` }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) =>
            skip(event.nativeEvent.actionName === "increment" ? SKIP_SECONDS : -SKIP_SECONDS)
          }
          onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => !failed && duration > 0}
          onResponderGrant={(event) => setScrub(timeAt(event))}
          onResponderMove={(event) => setScrub(timeAt(event))}
          onResponderRelease={(event) => seekTo(timeAt(event))}
          onResponderTerminate={() => setScrub(null)}
          hitSlop={{ top: 12, bottom: 12 }}
          style={tw`py-1 justify-center`}
        >
          <ProgressBar progress={progress} size="sm" track="bg-veil-strong" />
          <View
            pointerEvents="none"
            style={[tw`absolute w-3 h-3 rounded-full bg-white`, { left: Math.max(0, progress * barWidth - 6) }]}
          />
        </View>
      </View>

      <View pointerEvents="box-none" style={tw`absolute inset-0 items-center justify-center`}>
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading video" color={color("white")} />
        ) : failed ? (
          <AppText style={tw`text-14 font-medium text-white`}>Couldn&apos;t play this video.</AppText>
        ) : (
          <View pointerEvents="box-none" style={tw`flex-row items-center gap-8`}>
            <SkipButton seconds={-SKIP_SECONDS} onPress={() => skip(-SKIP_SECONDS)} />
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
            <SkipButton seconds={SKIP_SECONDS} onPress={() => skip(SKIP_SECONDS)} />
          </View>
        )}
      </View>

      {onBack ? (
        <IconButton
          icon={ChevronLeft}
          variant="glass-dark"
          accessibilityLabel="Back"
          onPress={onBack}
          style={[tw`absolute left-6`, { top: backTop }]}
        />
      ) : null}
    </View>
  );
}

/** expo-video sets speed by assignment; kept outside the component (React Compiler rule). */
function setPlaybackRate(player: VideoPlayer, rate: number) {
  player.playbackRate = rate;
}

/** A small glass button that skips back (negative) or forward by `seconds`. */
function SkipButton({ seconds, onPress }: { seconds: number; onPress: () => void }) {
  const back = seconds < 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={back ? `Back ${-seconds} seconds` : `Forward ${seconds} seconds`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => pressScale(pressed, 0.9)}
    >
      <Glass style={tw`w-11 h-11 rounded-full items-center justify-center border border-veil-strong bg-veil`}>
        <Icon as={back ? RotateCcw : RotateCw} size="xl" color="white" />
        <AppText style={tw`absolute text-11 font-bold text-white`}>{Math.abs(seconds)}</AppText>
      </Glass>
    </Pressable>
  );
}

/** Back to the course page, or Home when the lesson was opened directly. */
export function leaveLesson(courseId: string | null) {
  if (router.canGoBack()) router.back();
  else if (courseId) router.replace({ pathname: "/course/[id]", params: { id: courseId } });
  else router.replace("/home");
}
