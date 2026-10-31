import { useAuth, useUser } from "@clerk/expo";
import { Laptop, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";
import { tw } from "@/theme";

type Session = Awaited<ReturnType<NonNullable<ReturnType<typeof useUser>["user"]>["getSessions"]>>[number];

// Native apps report their HTTP client as the "browser" (OkHttp on Android, CFNetwork or
// Darwin on iOS, or the app's own name), so those sessions are shown as the app instead.
const APP_CLIENT = /^(okhttp|dalvik|cfnetwork|darwin|syllo|expo)/i;
const ANDROID_CLIENT = /^(okhttp|dalvik)/i;
const IOS_CLIENT = /^(cfnetwork|darwin)/i;

const shortDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

const deviceName = (session: Session) => {
  const a = session.latestActivity;
  const browser = a?.browserName ?? "";
  if (APP_CLIENT.test(browser)) {
    const platform = a?.deviceType || (ANDROID_CLIENT.test(browser) ? "Android" : IOS_CLIENT.test(browser) ? "iPhone" : "");
    return platform ? `Syllo app on ${platform}` : "Syllo app";
  }
  return [browser, a?.deviceType].filter(Boolean).join(" on ") || "Unknown device";
};

const lastActive = (session: Session) => {
  const a = session.latestActivity;
  const where = [a?.city, a?.country].filter(Boolean).join(", ");
  const when = session.lastActiveAt ? shortDate.format(new Date(session.lastActiveAt)) : "";
  return [where, when && `last active ${when}`].filter(Boolean).join(" · ");
};

type Result = { status: "loading" } | { status: "error" } | { status: "ready"; sessions: Session[] };

/** Devices the learner is signed in on; other devices can be signed out. */
export function SessionsSection() {
  const { user } = useUser();
  const { sessionId } = useAuth();
  const [result, setResult] = useState<Result>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [revoking, setRevoking] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let current = true;
    user
      .getSessions()
      .then((sessions) => {
        if (current) setResult({ status: "ready", sessions: sessions.filter((s) => s.status === "active") });
      })
      .catch(() => {
        if (current) setResult({ status: "error" });
      });
    return () => {
      current = false;
    };
  }, [user, attempt]);

  const reload = useCallback(() => {
    setResult({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await revoking.revoke();
      toast.success("Signed out of that device.");
      setRevoking(null);
      reload();
    } catch (error) {
      reportClerkError(error as ClerkFailure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={tw`gap-3`}>
      <AppText variant="heading" accessibilityRole="header">
        Signed-in devices
      </AppText>
      {result.status === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading devices" style={tw`h-16 rounded-2xl bg-subtle border border-border`} />
      ) : result.status === "error" ? (
        <Pressable accessibilityRole="button" onPress={reload} style={tw`flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4`}>
          <AppText style={tw`text-15 text-ink`}>Couldn&apos;t load your devices. Tap to try again.</AppText>
        </Pressable>
      ) : (
        result.sessions.map((session) => {
          const isThis = session.id === sessionId;
          const Glyph = session.latestActivity?.isMobile ? Smartphone : Laptop;
          return (
            <View key={session.id} style={tw`flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4`}>
              <Icon as={Glyph} size="xl" color="ink" />
              <View style={tw`flex-1 gap-0.5`}>
                <AppText style={tw`text-15 font-medium text-ink`}>
                  {deviceName(session)}
                  {isThis ? " (this device)" : ""}
                </AppText>
                <AppText variant="caption">{lastActive(session)}</AppText>
              </View>
              {isThis ? null : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sign out ${deviceName(session)}`}
                  hitSlop={8}
                  onPress={() => setRevoking(session)}
                >
                  <AppText style={tw`text-15 font-semibold text-danger`}>Sign out</AppText>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      <Sheet
        visible={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Sign out of this device?"
        footer={
          <View style={tw`flex-row gap-3`}>
            <Button title="Cancel" variant="outline" onPress={() => setRevoking(null)} style={tw`flex-1`} />
            <Button title="Sign out" loading={busy} onPress={revoke} style={tw`flex-1`} />
          </View>
        }
      >
        <AppText variant="body" style={tw`text-ink`}>{revoking ? `${deviceName(revoking)} will need to sign in again.` : ""}</AppText>
      </Sheet>
    </View>
  );
}
