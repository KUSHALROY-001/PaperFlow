import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSubscriptions() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await api.getSubscriptions();
      return res.subscriptions || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const subscriptions = data || [];

  const isSubscribed = (slug) => {
    if (!slug) return false;
    return subscriptions.some(
      (s) => s.slug?.toLowerCase() === slug.toLowerCase(),
    );
  };

  const subscribeMutation = useMutation({
    mutationFn: (slug) => api.subscribePublisher(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (slug) => api.unsubscribePublisher(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });

  const toggleSubscription = async (slug) => {
    if (!slug) return;
    if (isSubscribed(slug)) {
      await unsubscribeMutation.mutateAsync(slug);
    } else {
      await subscribeMutation.mutateAsync(slug);
    }
  };

  return {
    subscriptions,
    isLoading,
    error,
    isSubscribed,
    subscribe: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    toggleSubscription,
    isSubscribing: subscribeMutation.isPending || unsubscribeMutation.isPending,
  };
}
