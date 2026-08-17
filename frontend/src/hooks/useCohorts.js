import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCohorts() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => api.listCohorts(),
  });

  async function invalidate() {
    // Both keys: cohort membership changes affect the roster (a cohort
    // filter, or a student's own cohort badges) as much as the cohort
    // list itself (member count, average score).
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cohorts"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (name) => api.createCohort(name),
    onSuccess: invalidate,
    onError: (err) => setError(err.message || "Could not create cohort"),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ cohortId, email }) => api.addCohortMember(cohortId, email),
    onSuccess: invalidate,
    onError: (err) =>
      setError(err.message || "Could not add student to cohort"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ cohortId, email }) =>
      api.removeCohortMember(cohortId, email),
    onSuccess: invalidate,
    onError: (err) =>
      setError(err.message || "Could not remove student from cohort"),
  });

  return {
    cohorts: data?.cohorts || [],
    isLoading,
    error,
    clearError: () => setError(""),
    createCohort: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    addMember: addMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
  };
}
