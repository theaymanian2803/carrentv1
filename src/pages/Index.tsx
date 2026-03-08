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

/* ── Animations ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.25, 0.1, 0, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Data ── */
const CATEGORIES = [
  { name: 'SUV', img: catSuv, count: '120+', tag: 'Adventure Ready' },
  { name: 'Sedan', img: catSedan, count: '85+', tag: 'Daily Driver' },
  { name: 'Luxury', img: catLuxury, count: '42+', tag: 'Premium Feel' },
  { name: 'Electric', img: catElectric, count: '67+', tag: 'Zero Emission' },
];

const STEPS = [
  { num: '01', title: 'Search', desc: 'Pick your city, dates & style. Filter by price, type, or features.', icon: MapPin },
  { num: '02', title: 'Book', desc: 'Reserve instantly with secure payment. No deposits, no surprises.', icon: CreditCard },
  { num: '03', title: 'Drive', desc: 'Keyless pickup or meet your host. Hit the road in minutes.', icon: Zap },
];

const FEATURES = [
  { icon: Shield, title: 'Full Insurance', desc: 'Every trip covered with comprehensive protection — zero deductible.' },
  { icon: Star, title: '5-Star Reviews', desc: 'Transparent ratings from verified renters guide every booking.' },
  { icon: Clock, title: '24/7 Support', desc: 'Real humans ready to help around the clock, wherever you are.' },
  { icon: CreditCard, title: 'No Hidden Fees', desc: 'What you see is what you pay. Insurance & fees included upfront.' },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Frequent Renter', quote: 'DriveShare saved me hundreds compared to traditional rentals. The SUV was immaculate!' },
  { name: 'James K.', role: 'Car Owner', quote: "I earn $800/month sharing my car when I'm not using it. The platform handles everything." },
  { name: 'Priya R.', role: 'Business Traveler', quote: 'Seamless from booking to drop-off. The electric vehicle selection is excellent.' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ══════════════════════════════════
          HERO — Full-bleed cinematic
      ══════════════════════════════════ */}
      <section className="relative h-[100vh] min-h-[600px] flex items-end overflow-hidden">
        {/* Background image */}
        <img
          src={heroImg}
          alt="Luxury car on a cinematic night street"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        <div className="container relative z-10 pb-20 lg:pb-28">
          <motion.div
            className="max-w-3xl"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3 mb-6">
              <span className="h-px w-12 bg-primary" />
              <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">Peer-to-Peer Car Sharing</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight leading-[0.95]"
            >
              Your Next
              <br />
              <span className="text-primary">Ride</span> Awaits
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-lg leading-relaxed"
            >
              Rent from trusted local hosts or earn by sharing your car.
              Thousands of vehicles. Transparent pricing. Fully insured.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/search">
                <Button size="lg" className="h-14 px-10 text-base rounded-full gap-2 shadow-lg shadow-primary/20">
                  Explore Cars <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="ghost" size="lg" className="h-14 px-8 text-base rounded-full gap-2 text-foreground hover:text-primary">
                  <Play className="h-4 w-4 fill-current" /> See How It Works
                </Button>
              </Link>
            </motion.div>

            {/* Floating stats */}
            <motion.div variants={fadeUp} custom={4} className="mt-14 flex flex-wrap gap-8 lg:gap-14">
              {[
                { val: '10K+', label: 'Drivers' },
                { val: '2,500+', label: 'Cars' },
                { val: '4.9', label: 'Rating' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl lg:text-3xl font-bold">{s.val}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
          CATEGORIES — Horizontal scroll cards
      ══════════════════════════════════ */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-end justify-between mb-12">
              <div>
                <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">Browse</span>
                <h2 className="text-3xl lg:text-5xl font-bold mt-2">Pick Your Style</h2>
              </div>
              <Link to="/search" className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {CATEGORIES.map((cat, i) => (
                <motion.div key={cat.name} variants={fadeUp} custom={i}>
                  <Link to={`/search?category=${cat.name}`} className="group block">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 transition-all duration-500">
                      {/* Car image */}
                      <div className="absolute inset-0 flex items-center justify-center p-6">
                        <img
                          src={cat.img}
                          alt={cat.name}
                          className="w-full h-auto object-contain group-hover:scale-110 transition-transform duration-700 ease-out"
                          loading="lazy"
                        />
                      </div>
                      {/* Bottom gradient */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card via-card/80 to-transparent" />
                      {/* Info */}
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

      {/* ══════════════════════════════════
          HOW IT WORKS — Numbered timeline
      ══════════════════════════════════ */}
      <section className="py-24 lg:py-32 border-t border-border/40">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="max-w-md mb-16">
              <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">How It Works</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-2">Three steps.<br />Zero hassle.</h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-px bg-border/40 rounded-2xl overflow-hidden">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  variants={fadeUp}
                  custom={i}
                  className="bg-card p-8 lg:p-10 group hover:bg-muted/50 transition-colors duration-300"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">{step.num}</span>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FEATURES — Bento-style grid
      ══════════════════════════════════ */}
      <section className="py-24 lg:py-32 border-t border-border/40">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center max-w-lg mx-auto mb-16">
              <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">Why DriveShare</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-2">Built Different</h2>
              <p className="text-muted-foreground mt-4">Every feature designed to make renting effortless, safe, and affordable.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  custom={i}
                  className="group relative rounded-2xl border border-border/50 bg-card p-8 lg:p-10 hover:border-primary/30 transition-all duration-300 overflow-hidden"
                >
                  {/* Glow on hover */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/15 transition-colors">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
          TESTIMONIALS — Minimal quote cards
      ══════════════════════════════════ */}
      <section className="py-24 lg:py-32 border-t border-border/40">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-14">
              <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">Reviews</span>
              <h2 className="text-3xl lg:text-5xl font-bold mt-2">Real Stories</h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={t.name}
                  variants={fadeUp}
                  custom={i}
                  className="rounded-2xl border border-border/50 bg-card p-8 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-1 mb-5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground/80 leading-relaxed text-[15px]">"{t.quote}"</p>
                  </div>
                  <div className="mt-8 flex items-center gap-3 pt-6 border-t border-border/40">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {t.name[0]}
                    </div>
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

      {/* ══════════════════════════════════
          OWNER CTA — Split layout
      ══════════════════════════════════ */}
      <section className="py-24 lg:py-32 border-t border-border/40">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="rounded-3xl bg-card border border-border/50 overflow-hidden"
          >
            <div className="grid lg:grid-cols-2">
              {/* Left — Content */}
              <div className="p-10 lg:p-16 flex flex-col justify-center">
                <span className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">For Car Owners</span>
                <h2 className="text-3xl lg:text-4xl font-bold mt-3 leading-tight">
                  Turn your parked car into <span className="text-primary">$1,200/mo</span>
                </h2>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  List for free, set your own schedule and price. We handle insurance, payments, and support.
                </p>
                <ul className="mt-8 space-y-3">
                  {['No upfront costs', 'You control availability', 'Comprehensive insurance included'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <Link to="/auth">
                    <Button size="lg" className="h-14 px-10 text-base rounded-full gap-2 shadow-lg shadow-primary/20">
                      Start Earning <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
              {/* Right — Visual */}
              <div className="relative min-h-[300px] lg:min-h-0 bg-muted/30 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                <div className="relative text-center p-10">
                  <div className="text-7xl lg:text-8xl font-bold text-primary/15">$$$</div>
                  <div className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30">
                    Up to $1,200/mo
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
          FINAL CTA — Minimal & powerful
      ══════════════════════════════════ */}
      <section className="py-32 lg:py-44 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(var(--primary)/0.06),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="container relative z-10 text-center"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
            Ready to <span className="text-primary">drive</span>?
          </h2>
          <p className="text-muted-foreground mt-6 text-lg max-w-md mx-auto">
            Join thousands of drivers and hosts on the most trusted car sharing platform.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link to="/search">
              <Button size="lg" className="h-14 px-12 text-base rounded-full gap-2 shadow-lg shadow-primary/20">
                Browse Cars <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="h-14 px-10 text-base rounded-full border-border">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer className="border-t border-border/40">
        <div className="container py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <Link to="/" className="flex items-center gap-2 font-bold text-xl mb-4">
                <Car className="h-5 w-5 text-primary" />
                DriveShare
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Peer-to-peer car sharing. Rent or earn — your choice.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Renters</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/search" className="hover:text-primary transition-colors">Browse Cars</Link></li>
                <li><Link to="/search?category=Luxury" className="hover:text-primary transition-colors">Luxury</Link></li>
                <li><Link to="/search?category=Electric" className="hover:text-primary transition-colors">Electric</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Owners</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-primary transition-colors">List Your Car</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">How It Works</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Insurance</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/" className="hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="/" className="hover:text-primary transition-colors">Terms</Link></li>
              </ul>
            </div>
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
    </div>
  );
};

export default Index;
