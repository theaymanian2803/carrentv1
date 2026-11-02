import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";
import type { BookingInput, BookingStatus } from "@/lib/data/types";

export const useBookings = () =>
  useQuery({ queryKey: queryKeys.bookings, queryFn: () => data.bookings.mine() });

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookingInput) => data.bookings.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings });
    },
  });
};

export const useSetBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      data.bookings.setStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings });
    },
  });
};
