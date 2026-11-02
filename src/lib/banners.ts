import type { LandingSection } from '@/lib/data/types';

export const BANNER_LAYOUTS = ['split', 'split-reverse', 'full', 'compact'] as const;
export type BannerLayout = (typeof BANNER_LAYOUTS)[number];

export const BANNER_LAYOUT_LABELS: Record<BannerLayout, string> = {
  split: 'Image à gauche · texte à droite',
  'split-reverse': 'Texte à gauche · image à droite',
  full: 'Pleine largeur avec image de fond',
  compact: 'Bandeau compact',
};

export const BANNER_ALIGNS = ['left', 'center'] as const;
export type BannerAlign = (typeof BANNER_ALIGNS)[number];

export const BANNER_OVERLAYS = ['dark', 'light'] as const;
export type BannerOverlay = (typeof BANNER_OVERLAYS)[number];

export interface BannerSettings {
  layout: BannerLayout;
  subtitle: string;
  heading: string;
  description: string;
  image_url: string;
  cta: string;
  cta_link: string;
  text_align: BannerAlign;
  overlay: BannerOverlay;
}

export function bannerSettings(section: LandingSection): BannerSettings {
  const content = (section.content ?? {}) as Record<string, unknown>;
  const layout = BANNER_LAYOUTS.includes(content.layout as BannerLayout)
    ? (content.layout as BannerLayout)
    : 'split';
  const align = BANNER_ALIGNS.includes(content.text_align as BannerAlign)
    ? (content.text_align as BannerAlign)
    : 'left';
  const overlay = BANNER_OVERLAYS.includes(content.overlay as BannerOverlay)
    ? (content.overlay as BannerOverlay)
    : 'dark';

  return {
    layout,
    subtitle: String(content.subtitle ?? ''),
    heading: String(content.heading ?? '') || section.title,
    description: String(content.description ?? ''),
    image_url: String(content.image_url ?? ''),
    cta: String(content.cta ?? ''),
    cta_link: String(content.cta_link ?? '') || '/search',
    text_align: align,
    overlay,
  };
}
