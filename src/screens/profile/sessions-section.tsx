import { useAuth, useUser } from "@clerk/expo";
import { Laptop, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { colors } from "@/components/ui/placeholder-colors";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";

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
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Signed-in devices
      </Text>
      {result.status === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading devices" style={styles.skeleton} />
      ) : result.status === "error" ? (
        <Pressable accessibilityRole="button" onPress={reload} style={styles.card}>
          <Text style={styles.body}>Couldn&apos;t load your devices. Tap to try again.</Text>
        </Pressable>
      ) : (
        result.sessions.map((session) => {
          const isThis = session.id === sessionId;
          const Glyph = session.latestActivity?.isMobile ? Smartphone : Laptop;
          return (
            <View key={session.id} style={styles.card}>
              <Glyph size={24} color={colors.ink} strokeWidth={2} />
              <View style={styles.cardText}>
                <Text style={styles.device}>
                  {deviceName(session)}
                  {isThis ? " (this device)" : ""}
                </Text>
                <Text style={styles.caption}>{lastActive(session)}</Text>
              </View>
              {isThis ? null : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sign out ${deviceName(session)}`}
                  hitSlop={8}
                  onPress={() => setRevoking(session)}
                >
                  <Text style={styles.danger}>Sign out</Text>
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
          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" onPress={() => setRevoking(null)} style={styles.action} />
            <Button title="Sign out" loading={busy} onPress={revoke} style={styles.action} />
          </View>
        }
      >
        <Text style={styles.body}>{revoking ? `${deviceName(revoking)} will need to sign in again.` : ""}</Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { fontSize: 18, fontWeight: "700", color: colors.ink },
  skeleton: { height: 64, borderRadius: 16, backgroundColor: colors.canvas },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.canvas, padding: 16 },
  cardText: { flex: 1, gap: 2 },
  device: { fontSize: 15, fontWeight: "500", color: colors.ink },
  caption: { fontSize: 13, color: colors.muted },
  body: { fontSize: 15, color: colors.ink },
  danger: { fontSize: 15, fontWeight: "600", color: colors.danger },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
});
