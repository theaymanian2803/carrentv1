import { useMutation, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { full_name?: string; avatar_url?: string }) => data.profile.update(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};
