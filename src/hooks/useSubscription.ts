import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";

export interface SubscriptionInfo {
  plan: "free" | "pro";
  status: string;
  listingCount: number;
  listingLimit: number;
  canListMore: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => data.subscriptions.info(),
    enabled: Boolean(user),
  });

  const info = query.data ?? {
    plan: "free" as const,
    status: "active",
    listingCount: 0,
    listingLimit: 3,
  };

  return {
    ...info,
    canListMore: info.listingCount < info.listingLimit,
    loading: query.isLoading,
    refetch: async () => {
      await query.refetch();
    },
  };
};
