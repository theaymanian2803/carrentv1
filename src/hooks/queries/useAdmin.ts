import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";
import type { AppRole, BookingStatus, CarInput, CarStatus, KycStatus } from "@/lib/data/types";

export const useAdminStats = () =>
  useQuery({ queryKey: queryKeys.admin.stats, queryFn: () => data.admin.stats() });

export const useAdminUsers = () =>
  useQuery({ queryKey: queryKeys.admin.users, queryFn: () => data.admin.users() });

export const useAdminCars = () =>
  useQuery({ queryKey: queryKeys.admin.cars, queryFn: () => data.admin.cars() });

export const useAdminBookings = () =>
  useQuery({ queryKey: queryKeys.admin.bookings, queryFn: () => data.admin.bookings() });

export const useAdminSubscriptions = () =>
  useQuery({
    queryKey: queryKeys.admin.subscriptions,
    queryFn: () => data.admin.subscriptions(),
  });

export const useAdminSetRoles = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: AppRole[] }) => data.admin.setRoles(id, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.users }),
  });
};

export const useAdminSetKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: KycStatus }) =>
      data.admin.setKyc(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.users }),
  });
};

export const useAdminCreateCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CarInput & { owner_id?: string; status?: CarStatus }) =>
      data.admin.createCar(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.cars }),
  });
};

export const useAdminSetCarStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CarStatus }) =>
      data.admin.setCarStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.cars });
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });
};

export const useAdminRemoveCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.admin.removeCar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.cars }),
  });
};

export const useAdminSetBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      data.admin.setBookingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.bookings }),
  });
};

export const useAdminRemoveBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.admin.removeBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.bookings }),
  });
};

export const useAdminSetSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { plan: "free" | "pro"; status: string };
    }) => data.admin.setSubscription(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.subscriptions }),
  });
};

export const useAdminDemoData = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => data.admin.demoData(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.cars });
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats });
      qc.invalidateQueries({ queryKey: queryKeys.landing });
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
};
