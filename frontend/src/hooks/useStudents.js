import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Search is server-side here (unlike useTeam.js's client-side filter on
// an already-small member list) - the roster can genuinely grow into the
// hundreds/thousands for a coaching institute, and the aggregation query
// it's built on (students.repository.js#listStudents) already does the
// ILIKE match in SQL, so there's no reason to also filter client-side.
export function useStudents() {
  const [search, setSearch] = useState("");
  const [cohortId, setCohortId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["students", search, cohortId],
    queryFn: () => api.listStudents(search, cohortId),
    // Keep the previous page's rows visible while a new search's request
    // is in flight, instead of the list flashing empty on every keystroke.
    // react-query v5: this replaces the old keepPreviousData: true option.
    placeholderData: keepPreviousData,
  });

  return {
    search,
    setSearch,
    cohortId,
    setCohortId,
    students: data?.students || [],
    isLoading,
    error,
  };
}
