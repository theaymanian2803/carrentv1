import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { data } from '@/lib/data';
import { queryKeys } from '@/lib/queryKeys';
import type { LandingSection, LandingSectionInput } from '@/lib/data/types';

export type { LandingSection };

const QUERY_KEY = queryKeys.landing;

export function useLandingSections() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => data.landing.list(),
  });
}

export function usePublicLandingSections() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'public'],
    queryFn: () => data.landing.publicList(),
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LandingSectionInput) => data.landing.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.landing.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LandingSectionInput> & { id: string }) =>
      data.landing.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sections: { id: string; sort_order: number }[]) => {
      await Promise.all(
        sections.map((section) => data.landing.update(section.id, { sort_order: section.sort_order }))
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
