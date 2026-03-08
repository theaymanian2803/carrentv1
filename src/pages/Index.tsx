import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Car,
  Shield,
  Star,
  Zap,
  MapPin,
  Clock,
  CreditCard,
  ChevronRight,
  Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import heroImg from '@/assets/hero-night.jpg';
import catSuv from '@/assets/cat-suv.png';
import catSedan from '@/assets/cat-sedan.png';
import catLuxury from '@/assets/cat-luxury.png';
import catElectric from '@/assets/cat-electric.png';
import { useLandingSections, type LandingSection } from '@/hooks/useLandingSections';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Animations ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.25, 0.1, 0, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Icon map ── */
const ICON_MAP: Record<string, any> = { Shield, Star, Zap, MapPin, Clock, CreditCard, Car };

/* ── Category image map ── */
const CAT_IMG_MAP: Record<string, string> = {
  SUV: catSuv,
  Sedan: catSedan,
  Luxury: catLuxury,
  Electric: catElectric,
};

/* ── Section Renderers ── */

function HeroSection({ content }: { content: Record<string, any> }) {
  const stats = (content.stats ?? []) as { value: string; label: string }[];
  const bgImage = content.image_url || heroImg;
  return (
    <section className="relative h-[100vh] min-h-[600px] flex items-end overflow-hidden">
      <img src={bgImage} alt="Hero background" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      <div className="container relative z-10 pb-20 lg:pb-28">
        <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-6">
            <span className="h-px w-12 bg-primary" />
            <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">{content.subtitle}</span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight leading-[0.95]">
            {content.heading_line1}<br />
            <span className="text-primary">{content.heading_highlight}</span> {content.heading_line2}
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-lg leading-relaxed">
            {content.description}
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/search">
              <Button size="lg" className="h-14 px-10 text-base rounded-full gap-2 shadow-lg shadow-primary/20">
                {content.cta_primary} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="lg" className="h-14 px-8 text-base rounded-full gap-2 text-foreground hover:text-primary">
                <Play className="h-4 w-4 fill-current" /> {content.cta_secondary}
              </Button>
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="mt-14 flex flex-wrap gap-8 lg:gap-14">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl lg:text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function CategoriesSection({ content }: { content: Record<string, any> }) {
  const items = (content.items ?? []) as { name: string; count: string; tag: string }[];
  return (
    <section className="py-24 lg:py-32">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">{content.subtitle}</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-2">{content.heading}</h2>
            </div>
            <Link to="/search" className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {items.map((cat, i) => (
              <motion.div key={cat.name} variants={fadeUp} custom={i}>
                <Link to={`/search?category=${cat.name}`} className="group block">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 transition-all duration-500">
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <img src={CAT_IMG_MAP[cat.name] ?? catSuv} alt={cat.name} className="w-full h-auto object-contain group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card via-card/80 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{cat.tag}</span>
                      <div className="flex items-end justify-between mt-1">
                        <h3 className="text-xl font-bold">{cat.name}</h3>
                        <span className="text-sm text-muted-foreground">{cat.count}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StepsSection({ content }: { content: Record<string, any> }) {
  const items = (content.items ?? []) as { num: string; title: string; desc: string; icon: string }[];
  return (
    <section className="py-24 lg:py-32 border-t border-border/40">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.div variants={fadeUp} className="max-w-md mb-16">
            <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">{content.subtitle}</span>
            <h2 className="text-3xl lg:text-5xl font-bold mt-2 whitespace-pre-line">{content.heading}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-px bg-border/40 rounded-2xl overflow-hidden">
            {items.map((step, i) => {
              const Icon = ICON_MAP[step.icon] ?? MapPin;
              return (
                <motion.div key={step.num} variants={fadeUp} custom={i} className="bg-card p-8 lg:p-10 group hover:bg-muted/50 transition-colors duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">{step.num}</span>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection({ content }: { content: Record<string, any> }) {
  const items = (content.items ?? []) as { icon: string; title: string; desc: string }[];
  return (
    <section className="py-24 lg:py-32 border-t border-border/40">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center max-w-lg mx-auto mb-16">
            <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">{content.subtitle}</span>
            <h2 className="text-3xl lg:text-5xl font-bold mt-2">{content.heading}</h2>
            <p className="text-muted-foreground mt-4">{content.description}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
            {items.map((f, i) => {
              const Icon = ICON_MAP[f.icon] ?? Shield;
              return (
                <motion.div key={f.title} variants={fadeUp} custom={i} className="group relative rounded-2xl border border-border/50 bg-card p-8 lg:p-10 hover:border-primary/30 transition-all duration-300 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/15 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialsSection({ content }: { content: Record<string, any> }) {
  const items = (content.items ?? []) as { name: string; role: string; quote: string }[];
  return (
    <section className="py-24 lg:py-32 border-t border-border/40">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.div variants={fadeUp} className="mb-14">
            <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">{content.subtitle}</span>
            <h2 className="text-3xl lg:text-5xl font-bold mt-2">{content.heading}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {items.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i} className="rounded-2xl border border-border/50 bg-card p-8 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-primary text-primary" />)}
                  </div>
                  <p className="text-foreground/80 leading-relaxed text-[15px]">"{t.quote}"</p>
                </div>
                <div className="mt-8 flex items-center gap-3 pt-6 border-t border-border/40">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{t.name[0]}</div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function OwnerCtaSection({ content }: { content: Record<string, any> }) {
  const bullets = (content.bullets ?? []) as string[];
  return (
    <section className="relative py-24 lg:py-32 border-t border-border/40 overflow-hidden">
      <div className="container relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative rounded-3xl overflow-hidden min-h-[500px]">
          {/* Background image (absolute) */}
          {content.image_url && (
            <>
              <img src={content.image_url} alt="Banner background" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
            </>
          )}
          {!content.image_url && (
            <div className="absolute inset-0 bg-card border border-border/50" />
          )}

          {/* Content on top */}
          <div className="relative z-10 grid lg:grid-cols-2 min-h-[500px]">
            <div className="p-10 lg:p-16 flex flex-col justify-center">
              <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">{content.subtitle}</span>
              <h2 className="text-3xl lg:text-4xl font-bold mt-3 leading-tight">
                {content.heading} <span className="text-primary">{content.highlight}</span>
              </h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">{content.description}</p>
              <ul className="mt-8 space-y-3">
                {bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link to="/auth">
                  <Button size="lg" className="h-14 px-10 text-base rounded-full gap-2 shadow-lg shadow-primary/20">
                    {content.cta} <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            {!content.image_url && (
              <div className="relative min-h-[300px] lg:min-h-0 bg-muted/30 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                <div className="relative text-center p-10">
                  <div className="text-7xl lg:text-8xl font-bold text-primary/15">$$$</div>
                  <div className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30">
                    Up to {content.highlight}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCtaSection({ content }: { content: Record<string, any> }) {
  return (
    <section className="relative py-32 lg:py-44 border-t border-border/40 overflow-hidden">
      {/* Background image (absolute) if provided */}
      {content.image_url ? (
        <>
          <img src={content.image_url} alt="CTA background" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(var(--primary)/0.06),transparent_60%)]" />
      )}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="container relative z-10 text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
          {content.heading_before} <span className="text-primary">{content.heading_highlight}</span>{content.heading_after}
        </h2>
        <p className="text-muted-foreground mt-6 text-lg max-w-md mx-auto">{content.description}</p>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link to="/search">
            <Button size="lg" className="h-14 px-12 text-base rounded-full gap-2 shadow-lg shadow-primary/20">
              {content.cta_primary} <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="lg" className="h-14 px-10 text-base rounded-full border-border">
              {content.cta_secondary}
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function FooterSection({ content }: { content: Record<string, any> }) {
  const columns = (content.columns ?? []) as { title: string; links: { label: string; href: string }[] }[];
  return (
    <footer className="border-t border-border/40">
      <div className="container py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <Car className="h-5 w-5 text-primary" /> DriveShare
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.tagline}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((link) => (
                  <li key={link.label}><Link to={link.href} className="hover:text-primary transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 DriveShare. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Section renderer map ── */
const SECTION_RENDERERS: Record<string, React.FC<{ content: Record<string, any> }>> = {
  hero: HeroSection,
  categories: CategoriesSection,
  steps: StepsSection,
  features: FeaturesSection,
  testimonials: TestimonialsSection,
  owner_cta: OwnerCtaSection,
  final_cta: FinalCtaSection,
  footer: FooterSection,
};

/* ── Main Page ── */
const Index = () => {
  const { data: sections, isLoading } = useLandingSections();

  const visibleSections = (sections ?? [])
    .filter((s) => s.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {isLoading ? (
        <div className="container py-32 space-y-8">
          <Skeleton className="h-[60vh] rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        visibleSections.map((section) => {
          const Renderer = SECTION_RENDERERS[section.section_type];
          if (!Renderer) return null;
          return <Renderer key={section.id} content={section.content as Record<string, any>} />;
        })
      )}
    </div>
  );
};

export default Index;
