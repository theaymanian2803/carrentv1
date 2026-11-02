import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";

export const useReviews = (revieweeId?: string) =>
  useQuery({
    queryKey: queryKeys.reviews(revieweeId ?? ""),
    queryFn: () => data.reviews.forUser(revieweeId as string),
    enabled: Boolean(revieweeId),
  });

export const useMyReviews = () =>
  useQuery({ queryKey: queryKeys.myReviews, queryFn: () => data.reviews.mine() });

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { booking_id: string; rating: number; comment?: string }) =>
      data.reviews.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myReviews });
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
};
