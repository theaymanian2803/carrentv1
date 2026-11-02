import { Link } from 'react-router-dom';
import { useCars } from '@/hooks/queries/useCars';
import { usePublicLandingSections } from '@/hooks/useLandingSections';
import { isCarRow, carRowFilters, carRowSubtitle } from '@/lib/carRows';
import { heroContent, isHero, type HeroContent } from '@/lib/hero';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowUpRight, MapPin, Car as CarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import type { Car as CarRow, LandingSection } from '@/lib/data/types';

const CATEGORIES = [
  { key: 'SUV', label: 'SUV', tag: 'Tout-terrain' },
  { key: 'Sedan', label: 'Berline', tag: 'Confort' },
  { key: 'Luxury', label: 'Luxe', tag: 'Prestige' },
  { key: 'Electric', label: 'Électrique', tag: 'Innovation' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ─────────── HERO ─────────── */
function Hero({ featured, content }: { featured: CarRow | null; content: HeroContent }) {
  const imageUrl = content.image_url || featured?.images?.[0] || '';
  return (
    <section className="border-b border-border/70">
      <div className="container grid lg:grid-cols-12 gap-12 lg:gap-16 pt-16 lg:pt-24 pb-20 lg:pb-28 items-center">
        <motion.div
          className="lg:col-span-6 space-y-8"
          initial="hidden" animate="visible" variants={fadeUp}
        >
          <span className="eyebrow">{content.eyebrow}</span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
            {content.heading_line1}<br />
            <span className="italic font-light text-muted-foreground">{content.heading_highlight}</span>
            {content.heading_line2 && <><br />{content.heading_line2}</>}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
            {content.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to={content.cta_primary_link}>
              <Button className="h-12 px-8 rounded-none text-[11px] uppercase tracking-[0.22em] gap-3">
                {content.cta_primary} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={content.cta_secondary_link} className="text-[11px] uppercase tracking-[0.22em] font-semibold border-b border-foreground pb-1 hover:text-accent hover:border-accent transition-colors">
              {content.cta_secondary}
            </Link>
          </div>
          <dl className="grid grid-cols-3 gap-8 pt-10 border-t border-border/70 max-w-md">
            {[
              { v: '2 500+', l: 'Voitures' },
              { v: '10K+', l: 'Conducteurs' },
              { v: '4.9', l: 'Note moyenne' },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-heading text-2xl font-medium">{s.v}</dt>
                <dd className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{s.l}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          className="lg:col-span-6"
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {imageUrl ? (
            <Link to={featured ? `/cars/${featured.id}` : content.cta_primary_link} className="group block">
              <div className="aspect-[5/6] lg:aspect-[4/5] bg-muted overflow-hidden">
                <img
                  src={imageUrl}
                  alt={featured ? `${featured.make} ${featured.model}` : content.heading_highlight}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1200ms] ease-out"
                />
              </div>
              <div className="flex items-end justify-between mt-5 pb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">À la une</p>
                  <h3 className="font-heading text-xl mt-1">
                    {featured ? `${featured.make} ${featured.model}` : content.heading_highlight}
                  </h3>
                  {featured && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {featured.address}
                    </p>
                  )}
                </div>
                {featured && (
                  <p className="font-heading text-2xl">
                    {featured.daily_rate}$
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body ml-1">/jour</span>
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div className="aspect-[4/5] bg-muted flex items-center justify-center">
              <CarIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────── CATEGORIES ─────────── */
function Categories() {
  return (
    <section className="border-b border-border/70 py-20 lg:py-28">
      <div className="container">
        <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
          <div>
            <span className="eyebrow">Catégories</span>
            <h2 className="font-heading text-3xl md:text-4xl mt-4">Chaque trajet, sa voiture.</h2>
          </div>
          <Link to="/search" className="text-[11px] uppercase tracking-[0.22em] font-semibold border-b border-foreground pb-1 hover:text-accent hover:border-accent transition-colors">
            Voir la collection
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-border/70">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              to={`/search?category=${cat.key}`}
              className="group border-b lg:border-b-0 lg:border-r last:border-r-0 border-border/70 py-10 lg:py-14 px-4 lg:px-8 hover:bg-muted/40 transition-colors relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">{cat.tag}</p>
                  <h3 className="font-heading text-3xl lg:text-4xl">{cat.label}</h3>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-10 h-px w-8 bg-accent group-hover:w-16 transition-all duration-500" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── CAR ROW ─────────── */
function CarRowSection({ title, subtitle, cars }: { title: string; subtitle: string; cars: CarRow[] }) {
  return (
    <section className="border-b border-border/70 py-20 lg:py-28">
      <div className="container">
        <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
          <div>
            <span className="eyebrow">{subtitle}</span>
            <h2 className="font-heading text-3xl md:text-4xl mt-4">{title}</h2>
          </div>
          <Link to="/search" className="text-[11px] uppercase tracking-[0.22em] font-semibold border-b border-foreground pb-1 hover:text-accent hover:border-accent transition-colors">
            Tout parcourir
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
          {cars.map((car, i) => (
            <motion.div
              key={car.id}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              custom={i} variants={fadeUp}
            >
              <Link to={`/cars/${car.id}`} className="group block">
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {car.images?.[0] ? (
                    <img
                      src={car.images[0]}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1200ms] ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CarIcon className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between mt-5 pb-4 border-b border-border/70">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{car.make}</p>
                    <h3 className="font-heading text-lg mt-1 group-hover:text-accent transition-colors">
                      {car.model}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {car.address}
                    </p>
                  </div>
                  <p className="font-heading text-lg text-right">
                    {car.daily_rate}$
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-body mt-0.5">
                      / jour
                    </span>
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── DYNAMIC CAR ROW ─────────── */
function DynamicCarRow({ section }: { section: LandingSection }) {
  const { data: cars = [] } = useCars(carRowFilters(section));
  if (!cars.length) return null;
  return (
    <CarRowSection
      title={section.title}
      subtitle={carRowSubtitle(section)}
      cars={cars}
    />
  );
}

/* ─────────── BANNER ─────────── */
function BannerSection({ section }: { section: LandingSection }) {
  const content = section.content as Record<string, string | undefined>;
  const heading = content.heading || section.title;

  return (
    <section className="border-b border-border/70 py-20 lg:py-28">
      <div className="container grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        {content.image_url && (
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <img src={content.image_url} alt={heading} className="w-full h-full object-cover" />
          </div>
        )}
        <div className={content.image_url ? '' : 'md:col-span-2 max-w-2xl'}>
          {content.subtitle && <span className="eyebrow">{content.subtitle}</span>}
          <h2 className="font-heading text-3xl md:text-4xl mt-4">{heading}</h2>
          {content.description && (
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl">{content.description}</p>
          )}
          {content.cta && (
            <Link to={content.cta_link || '/search'}>
              <Button className="mt-6 h-11 px-7 rounded-none text-[11px] uppercase tracking-[0.22em] gap-2">
                {content.cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────── HOST CTA ─────────── */
function HostCta() {
  return (
    <section className="border-b border-border/70 bg-foreground text-background">
      <div className="container grid lg:grid-cols-12 gap-12 py-24 lg:py-32 items-center">
        <div className="lg:col-span-7 space-y-8">
          <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            <span className="inline-block h-px w-8 bg-accent" /> Hôtes
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-[1.02] tracking-tight">
            Votre voiture,<br />
            <span className="italic font-light text-background/60">une seconde vie.</span>
          </h2>
          <p className="text-background/70 max-w-md text-base leading-relaxed">
            Rejoignez la communauté des hôtes DriveShare et rentabilisez votre véhicule
            jusqu'à 1 200 $/mois. Couverture complète, calendrier flexible.
          </p>
          <Link to="/auth">
            <Button
              variant="outline"
              className="h-12 px-8 rounded-none bg-transparent border-background text-background hover:bg-accent hover:text-foreground hover:border-accent text-[11px] uppercase tracking-[0.22em] gap-3"
            >
              Lister mon véhicule <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <dl className="lg:col-span-5 grid grid-cols-2 gap-y-10 gap-x-8">
          {[
            { v: '1 200$', l: 'Revenu mensuel moyen' },
            { v: '0%', l: 'Frais de plateforme' },
            { v: '24/7', l: 'Support dédié' },
            { v: '100%', l: 'Assurance incluse' },
          ].map((s) => (
            <div key={s.l} className="border-t border-background/20 pt-4">
              <dt className="font-heading text-3xl text-accent">{s.v}</dt>
              <dd className="text-[10px] uppercase tracking-[0.22em] text-background/60 mt-2">{s.l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ─────────── FOOTER ─────────── */
function Footer() {
  return (
    <footer>
      <div className="container py-20 grid grid-cols-2 md:grid-cols-5 gap-12">
        <div className="col-span-2 space-y-6">
          <Link to="/" className="font-heading text-xl font-semibold uppercase tracking-tight">
            Drive<span className="text-accent">Share</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            La marketplace entre particuliers pour une location automobile simple, sûre et
            transparente.
          </p>
        </div>
        {[
          { t: 'Explorer', l: [['Rechercher', '/search'], ['SUV', '/search?category=SUV'], ['Luxe', '/search?category=Luxury'], ['Électrique', '/search?category=Electric']] },
          { t: 'Communauté', l: [['Devenir hôte', '/auth'], ['Aide', '#'], ['Sécurité', '#']] },
          { t: 'Société', l: [['À propos', '#'], ['Contact', '#'], ['Presse', '#']] },
        ].map((col) => (
          <div key={col.t} className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.24em] font-semibold">{col.t}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {col.l.map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="hover:text-foreground transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4 py-6 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <p>© 2026 DriveShare. Tous droits réservés.</p>
          <div className="flex gap-8">
            <span className="hover:text-foreground cursor-pointer">Confidentialité</span>
            <span className="hover:text-foreground cursor-pointer">Conditions</span>
            <span className="hover:text-foreground cursor-pointer">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────── PAGE ─────────── */
const Index = () => {
  const { data: cars = [] } = useCars({ limit: 7 });
  const { data: sections = [] } = usePublicLandingSections();
  const sorted = [...cars].sort((a, b) => b.daily_rate - a.daily_rate);
  const [featured, ...rest] = sorted;
  const hero = sections.find((section) => isHero(section) && section.is_visible);
  const dynamic = sections
    .filter(
      (section) =>
        section.is_visible && !isHero(section) &&
        (isCarRow(section) || section.section_type === 'banner')
    )
    .sort((a, b) => a.sort_order - b.sort_order);
  const hasCarRow = dynamic.some(isCarRow);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero featured={featured || null} content={heroContent(hero)} />
      <Categories />
      {dynamic.map((section) =>
        section.section_type === 'banner' ? (
          <BannerSection key={section.id} section={section} />
        ) : (
          <DynamicCarRow key={section.id} section={section} />
        )
      )}
      {!hasCarRow && rest.length > 0 && (
        <CarRowSection
          title="Sélection du moment."
          subtitle="Disponibles"
          cars={rest.slice(0, 6)}
        />
      )}
      <HostCta />
      <Footer />
    </div>
  );
};

export default Index;
