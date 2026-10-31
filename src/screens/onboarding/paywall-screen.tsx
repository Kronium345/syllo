import { Image } from "expo-image";
import { router } from "expo-router";
import { Check, Clock, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Fade } from "@/components/ui/fade";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import {
  type PurchasesPackage,
  purchasesSupported,
  useOffering,
  usePurchasePackage,
  useRestorePurchases,
} from "@/lib/queries/purchases";
import { color, pressScale, tw } from "@/theme";

// Pro features (the user's list, replacing the prototype's three rows).
const FEATURES = ["All standard courses", "Unlimited quizzes", "Offline downloads", "Certificates and awards"];

type PlanId = "annual" | "monthly";

/** How much cheaper a year of the annual plan is than twelve months, in whole percent. */
function annualSavings(annual: PurchasesPackage, monthly: PurchasesPackage): number {
  const yearOfMonthly = monthly.product.price * 12;
  return yearOfMonthly > 0 ? Math.round((1 - annual.product.price / yearOfMonthly) * 100) : 0;
}

/** Signing up is free; the paywall's close and a finished purchase both continue to it. */
function continueToSignUp() {
  router.push("/sign-up");
}

/** premium_paywall (step 5/6): Pro Monthly or Annual through RevenueCat, then sign-up. */
export function PaywallScreen() {
  const closeTop = useTopPadding(48);
  const offering = useOffering();
  const purchase = usePurchasePackage();
  const restore = useRestorePurchases();
  const [plan, setPlan] = useState<PlanId>("annual");

  const annual = offering.data?.annual ?? null;
  const monthly = offering.data?.monthly ?? null;
  const savings = annual && monthly ? annualSavings(annual, monthly) : null;
  const selected = plan === "annual" ? annual : monthly;

  const subscribe = () => {
    if (!purchasesSupported) {
      toast.info("Subscribe in the app", "Subscriptions are available in the iOS and Android app.");
      continueToSignUp();
      return;
    }
    if (!selected) return;
    purchase.mutate(selected, {
      onSuccess: (purchased) => {
        if (!purchased) return; // Cancelled: stay here, no message.
        toast.success("You're Premium!", "Now create your free account to start learning.");
        continueToSignUp();
      },
      onError: () => toast.error("Couldn't complete the purchase.", "You haven't been charged. Please try again."),
    });
  };

  const restorePurchases = () => {
    if (!purchasesSupported) {
      toast.info("Restore in the app", "Purchases can be restored in the iOS and Android app.");
      return;
    }
    restore.mutate(undefined, {
      onSuccess: (premium) =>
        premium
          ? toast.success("Purchases restored.", "Premium is active on this account.")
          : toast.info("Nothing to restore.", "No earlier Premium purchase was found."),
      onError: () => toast.error("Couldn't restore purchases.", "Check your connection and try again."),
    });
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <ScrollView style={tw`flex-1`} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={tw`h-[240px] w-full`}>
          <Image
            source={require("@/assets/images/onboarding/paywall-hero.png")}
            accessibilityIgnoresInvertColors
            contentFit="cover"
            style={tw`w-full h-full`}
          />
          <Fade to="surface" />
          <IconButton
            icon={X}
            variant="close"
            accessibilityLabel="Not now"
            onPress={continueToSignUp}
            style={[tw`absolute right-6`, { top: closeTop }]}
          />
        </View>

        <View style={tw`px-screen -mt-6 pb-6`}>
          <View
            style={tw`flex-row items-center gap-2 self-center bg-danger-tint border border-danger-line px-3 py-1.5 rounded-lg mb-6`}
          >
            <Icon as={Clock} size="md" color="danger" />
            <AppText style={tw`text-13 font-bold text-danger-deep`}>
              SPRING SALE: {savings ?? 40}% OFF ends in 12:45
            </AppText>
          </View>

          <AppText variant="title-xl" accessibilityRole="header" style={tw`text-center mb-8`}>
            Unlock your potential
          </AppText>

          <View style={tw`gap-4 mb-10`}>
            {FEATURES.map((feature) => (
              <View key={feature} style={tw`flex-row items-start gap-4`}>
                <View style={tw`w-6 h-6 rounded-full bg-primary-soft items-center justify-center mt-0.5`}>
                  <Icon as={Check} size="sm" color="primary" />
                </View>
                <AppText style={tw`flex-1 text-16 font-medium text-ink`}>{feature}</AppText>
              </View>
            ))}
          </View>

          {!purchasesSupported ? (
            <AppText variant="callout" style={tw`text-center`}>
              Subscriptions are available in the iOS and Android app.
            </AppText>
          ) : offering.isPending ? (
            <View accessibilityRole="progressbar" accessibilityLabel="Loading plans" style={tw`py-8 items-center`}>
              <ActivityIndicator color={color("muted")} />
            </View>
          ) : offering.isError || !annual || !monthly ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => offering.refetch()}
              style={tw`py-6 items-center gap-2`}
            >
              <AppText variant="callout">Couldn&apos;t load plans.</AppText>
              <AppText style={tw`text-14 font-semibold text-primary`}>
                {offering.isFetching ? "Trying again…" : "Try again"}
              </AppText>
            </Pressable>
          ) : (
            <View accessibilityRole="radiogroup" style={tw`gap-3`}>
              <PlanCard
                title="Annual Access"
                subtitle={`${annual.product.priceString}/year (Only ${annual.product.pricePerMonthString ?? ""}/mo)`}
                trailing={savings !== null && savings > 0 ? `${savings}% OFF` : annual.product.priceString}
                bestValue
                selected={plan === "annual"}
                onPress={() => setPlan("annual")}
              />
              <PlanCard
                title="Monthly Plan"
                subtitle="Cancel anytime"
                trailing={`${monthly.product.priceString}/mo`}
                selected={plan === "monthly"}
                onPress={() => setPlan("monthly")}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <StickyFooter>
        <Button
          title="Subscribe Now"
          loading={purchase.isPending}
          disabled={purchasesSupported && !selected}
          onPress={subscribe}
          style={tw`mb-4`}
        />
        <AppText variant="footnote" style={tw`text-center px-4`}>
          Secure payment. No hidden fees.{" "}
          <AppText
            accessibilityRole="link"
            onPress={restore.isPending ? undefined : restorePurchases}
            style={tw`text-12 font-semibold text-primary`}
          >
            {restore.isPending ? "Restoring…" : "Restore purchases."}
          </AppText>
        </AppText>
      </StickyFooter>
    </View>
  );
}

function PlanCard({
  title,
  subtitle,
  trailing,
  bestValue = false,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  trailing: string;
  bestValue?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${subtitle}, ${trailing}`}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          "rounded-2xl flex-row justify-between items-center",
          // p-4 with a 1px border; the 2px selected border takes 1px of padding so nothing moves.
          selected ? "p-[15px] border-2 border-primary bg-primary-tint" : "p-4 border border-border bg-surface",
        ),
        pressScale(pressed),
      ]}
    >
      {bestValue ? (
        <View style={tw`absolute -top-3 right-4 bg-primary px-3 py-1 rounded-full`}>
          <AppText variant="badge" style={tw`text-on-primary tracking-normal`}>
            Best Value
          </AppText>
        </View>
      ) : null}
      <View style={tw`flex-1 mr-3`}>
        <AppText style={tw`text-17 font-bold text-ink`}>{title}</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
      <AppText style={tw.style("text-18 font-bold", bestValue ? "text-primary" : "text-ink")}>{trailing}</AppText>
    </Pressable>
  );
}
