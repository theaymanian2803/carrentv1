import type { LandingSection } from '@/lib/data/types';

export interface HeroContent {
  eyebrow: string;
  heading_line1: string;
  heading_highlight: string;
  heading_line2: string;
  description: string;
  cta_primary: string;
  cta_primary_link: string;
  cta_secondary: string;
  cta_secondary_link: string;
  image_url: string;
}

export const HERO_DEFAULTS: HeroContent = {
  eyebrow: 'Location entre particuliers',
  heading_line1: "L'automobile,",
  heading_highlight: 'à votre porte.',
  heading_line2: '',
  description:
    'Une sélection de véhicules confiés par leurs propriétaires. Réservation directe, tarifs transparents, couverture incluse.',
  cta_primary: 'Explorer la flotte',
  cta_primary_link: '/search',
  cta_secondary: 'Devenir hôte',
  cta_secondary_link: '/auth',
  image_url: '',
};

export const isHero = (section: LandingSection): boolean => section.section_type === 'hero';

export function heroContent(section?: LandingSection | null): HeroContent {
  const content = (section?.content ?? {}) as Partial<HeroContent>;
  return {
    eyebrow: content.eyebrow?.trim() || HERO_DEFAULTS.eyebrow,
    heading_line1: content.heading_line1?.trim() || HERO_DEFAULTS.heading_line1,
    heading_highlight: content.heading_highlight?.trim() || HERO_DEFAULTS.heading_highlight,
    heading_line2: content.heading_line2?.trim() || '',
    description: content.description?.trim() || HERO_DEFAULTS.description,
    cta_primary: content.cta_primary?.trim() || HERO_DEFAULTS.cta_primary,
    cta_primary_link: content.cta_primary_link?.trim() || HERO_DEFAULTS.cta_primary_link,
    cta_secondary: content.cta_secondary?.trim() || HERO_DEFAULTS.cta_secondary,
    cta_secondary_link: content.cta_secondary_link?.trim() || HERO_DEFAULTS.cta_secondary_link,
    image_url: content.image_url?.trim() || '',
  };
}
