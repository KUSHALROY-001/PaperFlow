import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWeakTopics(cohortId) {
  const { data, isLoading } = useQuery({
    queryKey: ["weak-topics", cohortId],
    queryFn: () => api.getWeakTopics(cohortId),
  });

  return {
    weakTopics: data?.weakTopics || [],
    isLoading,
  };
}
