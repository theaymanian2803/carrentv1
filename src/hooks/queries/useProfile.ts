import { useMutation, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      full_name?: string;
      avatar_url?: string;
      onboarding_completed?: boolean;
    }) => data.profile.update(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => data.auth.changePassword(currentPassword, newPassword),
  });
