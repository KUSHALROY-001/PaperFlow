import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useStudentDetail() {
  const { email } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["student", email],
    queryFn: () => api.getStudentDetail(email),
    enabled: Boolean(email),
  });

  return {
    email,
    student: data?.student || null,
    isLoading,
    error,
  };
}
