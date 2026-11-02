import type { CarFilters, LandingSection } from '@/lib/data/types';

export const CAR_ROW_TYPE = 'car_row';

export const ROW_CATEGORIES = ['all', 'SUV', 'Sedan', 'Luxury', 'Electric'] as const;
export type RowCategory = (typeof ROW_CATEGORIES)[number];

export interface CarRowContent {
  category?: RowCategory;
  limit?: number;
  subtitle?: string;
}

export const isCarRow = (section: LandingSection): boolean =>
  section.section_type === CAR_ROW_TYPE;

export function carRowFilters(section: LandingSection): CarFilters {
  const content = (section.content ?? {}) as CarRowContent;
  const category =
    content.category && content.category !== 'all' ? content.category : undefined;
  const rawLimit = Number(content.limit ?? 3);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.round(rawLimit), 1), 12) : 3;
  return { category, limit };
}

export function carRowSubtitle(section: LandingSection): string {
  const content = (section.content ?? {}) as CarRowContent;
  return content.subtitle?.trim() || 'Disponibles';
}
