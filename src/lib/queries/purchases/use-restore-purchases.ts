import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hasPremium, restorePurchases } from "@/services/purchases";

import { queryKeys } from "../keys";

/** Restores earlier purchases on this store account; resolves whether Premium is now active. */
export function useRestorePurchases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => hasPremium(await restorePurchases()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchases.customerInfo() }),
  });
}
