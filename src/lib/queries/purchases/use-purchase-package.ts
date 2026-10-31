import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PurchasesPackage } from "react-native-purchases";

import { purchasePackage } from "@/services/purchases";

import { queryKeys } from "../keys";

/** Buys a package; resolves false when the learner cancels. */
export function usePurchasePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (aPackage: PurchasesPackage) => purchasePackage(aPackage),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchases.customerInfo() }),
  });
}
