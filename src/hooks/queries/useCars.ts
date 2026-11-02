import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import { queryKeys } from "@/lib/queryKeys";
import type { CarFilters, CarInput } from "@/lib/data/types";

export const useCars = (filters?: CarFilters) =>
  useQuery({
    queryKey: queryKeys.cars(filters),
    queryFn: () => data.cars.list(filters),
  });

export const useCar = (id?: string) =>
  useQuery({
    queryKey: queryKeys.car(id ?? ""),
    queryFn: () => data.cars.get(id as string),
    enabled: Boolean(id),
  });

export const useMyCars = () =>
  useQuery({ queryKey: queryKeys.myCars, queryFn: () => data.cars.mine() });

export const useCreateCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CarInput) => data.cars.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myCars });
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
};

export const useUpdateCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CarInput> }) =>
      data.cars.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myCars });
      qc.invalidateQueries({ queryKey: queryKeys.cars() });
    },
  });
};

export const useDeleteCar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.cars.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myCars });
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
};
