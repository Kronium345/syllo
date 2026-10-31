import { useQuery } from "@tanstack/react-query";

import { purchasesSupported } from "@/lib/purchases/configure";
import { getCustomerInfo, hasPremium } from "@/services/purchases";

import { queryKeys } from "../keys";

/** Whether the learner has an active Premium entitlement (`data` is a boolean). Disabled on web. */
export function usePremium() {
  return useQuery({
    queryKey: queryKeys.purchases.customerInfo(),
    queryFn: getCustomerInfo,
    select: hasPremium,
    enabled: purchasesSupported,
  });
}
