import { useQuery } from "@tanstack/react-query";

import { purchasesSupported } from "@/lib/purchases/configure";
import { getCurrentOffering } from "@/services/purchases";

import { queryKeys } from "../keys";

/** The current RevenueCat offering (annual + monthly Premium). Disabled on web. */
export function useOffering() {
  return useQuery({
    queryKey: queryKeys.purchases.offering(),
    queryFn: getCurrentOffering,
    enabled: purchasesSupported,
  });
}
