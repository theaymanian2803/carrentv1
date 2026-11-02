import { describe, it, expect } from 'vitest';
import { bannerSettings } from '../banners';
import type { LandingSection } from '@/lib/data/types';

const section = (content: Record<string, unknown>): LandingSection => ({
  id: 'b1',
  section_type: 'banner',
  title: 'Fallback title',
  content,
  sort_order: 0,
  is_visible: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

describe('bannerSettings', () => {
  it('defaults to the split layout with a left-aligned dark overlay', () => {
    const result = bannerSettings(section({}));
    expect(result.layout).toBe('split');
    expect(result.text_align).toBe('left');
    expect(result.overlay).toBe('dark');
    expect(result.heading).toBe('Fallback title');
  });

  it('keeps every supported layout', () => {
    for (const layout of ['split', 'split-reverse', 'full', 'compact']) {
      expect(bannerSettings(section({ layout })).layout).toBe(layout);
    }
  });

  it('falls back to a known layout when the saved value is invalid', () => {
    expect(bannerSettings(section({ layout: 'weird' })).layout).toBe('split');
  });

  it('honours center alignment and light overlay', () => {
    const result = bannerSettings(section({ text_align: 'center', overlay: 'light' }));
    expect(result.text_align).toBe('center');
    expect(result.overlay).toBe('light');
  });

  it('keeps the CTA link default when omitted', () => {
    expect(bannerSettings(section({ cta: 'Voir' })).cta_link).toBe('/search');
  });
});
