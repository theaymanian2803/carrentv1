import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface LandingSection {
  id: string;
  section_type: string;
  title: string;
  content: Record<string, any>;
  sort_order: number;
  is_visible: boolean;
}

const QUERY_KEY = ['landing-sections'];

export function useLandingSections() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_sections')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as LandingSection[];
    },
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LandingSection> & { id: string }) => {
      const { error } = await supabase
        .from('landing_sections')
        .update({ ...updates, content: updates.content as unknown as Json })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sections: { id: string; sort_order: number }[]) => {
      // Update each section's sort_order
      const updates = sections.map((s) =>
        supabase.from('landing_sections').update({ sort_order: s.sort_order }).eq('id', s.id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
