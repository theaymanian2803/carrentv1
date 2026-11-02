import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";

export const useLicense = () =>
  useQuery({
    queryKey: queryKeys.license,
    queryFn: () => data.license.status(),
    staleTime: 60_000,
  });

export const useActivateLicense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => data.license.activate(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.license });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};
