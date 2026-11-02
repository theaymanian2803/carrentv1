import { describe, it, expect } from 'vitest';
import { heroContent, HERO_DEFAULTS } from '../hero';
import type { LandingSection } from '@/lib/data/types';

const hero = (content: Record<string, unknown>): LandingSection => ({
  id: 'h1',
  section_type: 'hero',
  title: 'Hero',
  content,
  sort_order: 0,
  is_visible: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

describe('heroContent', () => {
  it('falls back to the current copy when no section exists', () => {
    expect(heroContent(null)).toEqual(HERO_DEFAULTS);
  });

  it('uses saved fields and keeps defaults for blanks', () => {
    const result = heroContent(
      hero({ eyebrow: 'Nouveau', heading_line1: 'Conduisez,', heading_highlight: '', description: '' })
    );
    expect(result.eyebrow).toBe('Nouveau');
    expect(result.heading_line1).toBe('Conduisez,');
    expect(result.heading_highlight).toBe(HERO_DEFAULTS.heading_highlight);
    expect(result.description).toBe(HERO_DEFAULTS.description);
  });

  it('keeps an optional third heading line', () => {
    expect(heroContent(hero({ heading_line2: 'Vite.' })).heading_line2).toBe('Vite.');
  });
});
