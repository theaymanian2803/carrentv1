import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Car,
  Shield,
  Star,
  Zap,
  MapPin,
  Clock,
  CreditCard,
  Users,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import heroImg from '@/assets/hero-car.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
};

const STATS = [
  { value: '10K+', label: 'Happy Renters' },
  { value: '2,500+', label: 'Cars Available' },
  { value: '50+', label: 'Cities Covered' },
  { value: '4.9★', label: 'Average Rating' },
];

const CATEGORIES = [
  { name: 'SUV', icon: '🚙', count: 120, gradient: 'from-primary/20 to-primary/5' },
  { name: 'Sedan', icon: '🚗', count: 85, gradient: 'from-secondary/30 to-secondary/10' },
  { name: 'Luxury', icon: '✨', count: 42, gradient: 'from-primary/25 to-secondary/10' },
  { name: 'Electric', icon: '⚡', count: 67, gradient: 'from-primary/15 to-primary/5' },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified & Insured',
    desc: 'Every host is KYC verified and every trip is covered by comprehensive insurance.',
  },
  {
    icon: Star,
    title: 'Trusted Reviews',
    desc: 'Transparent ratings from real renters help you pick the perfect car every time.',
  },
  {
    icon: Zap,
    title: 'Instant Booking',
    desc: 'Skip the counter. Book online, unlock with your phone, and drive away in minutes.',
  },
  {
    icon: MapPin,
    title: 'Everywhere You Go',
    desc: 'Cars available in 50+ cities. Find rides near airports, train stations, or your doorstep.',
  },
  {
    icon: CreditCard,
    title: 'Transparent Pricing',
    desc: 'No hidden fees. See the full price upfront including insurance and platform fees.',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    desc: 'Our support team is always available to help you with any issue, day or night.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Search & Discover', desc: 'Browse thousands of cars by location, category, or price.' },
  { step: '02', title: 'Book Instantly', desc: 'Reserve your ride in seconds with secure online payment.' },
  { step: '03', title: 'Pick Up & Drive', desc: 'Meet your host or use keyless entry and hit the road.' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Frequent Renter',
    text: 'DriveShare saved me hundreds compared to traditional rentals. The SUV I rented was immaculate!',
    rating: 5,
  },
  {
    name: 'James K.',
    role: 'Car Owner',
    text: "I earn $800/month sharing my car when I'm not using it. The platform handles everything.",
    rating: 5,
  },
  {
    name: 'Priya R.',
    role: 'Business Traveler',
    text: 'Seamless experience from booking to drop-off. The electric vehicle selection is excellent.',
    rating: 5,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-accent">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-20 left-[10%] w-24 h-24 border border-primary/20 rounded-2xl rotate-12 hidden lg:block" />
        <div className="absolute bottom-32 right-[15%] w-16 h-16 border border-accent-foreground/10 rounded-full hidden lg:block" />

        {/* Diagonal clip image */}
        <div className="absolute inset-0 lg:left-[45%]">
          <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent/90 to-transparent z-10" />
          <img
            src={heroImg}
            alt="Premium car available for rent"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <div className="container relative z-20 py-20">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
            >
              <Car className="h-4 w-4" /> The #1 Peer-to-Peer Car Sharing Platform
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-accent-foreground leading-[1.1]"
            >
              Drive Your
              <span className="relative inline-block ml-3">
                <span className="text-primary">Dream</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8 C50 2, 150 2, 198 8" stroke="hsl(160 84% 39%)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              Car Today
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg lg:text-xl text-accent-foreground/70 max-w-lg leading-relaxed"
            >
              Rent from trusted local hosts or earn by sharing your car.
              Thousands of vehicles, transparent pricing, fully insured trips.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-wrap gap-4">
              <Link to="/search">
                <Button size="lg" className="gap-2 text-base h-14 px-8 rounded-xl shadow-lg shadow-primary/25">
                  Browse Cars <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base h-14 px-8 rounded-xl border-accent-foreground/20 text-accent-foreground hover:bg-accent-foreground/10"
                >
                  List Your Car
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="mt-8 flex items-center gap-4 text-accent-foreground/60 text-sm">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-accent flex items-center justify-center text-xs font-medium text-secondary-foreground">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>Trusted by <strong className="text-accent-foreground">10,000+</strong> drivers</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ STATS BANNER ═══════ */}
      <section className="relative -mt-1 bg-primary">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(160_84%_30%),hsl(160_84%_39%),hsl(160_84%_30%))]" />
        <div className="container relative z-10 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="text-3xl lg:text-4xl font-bold text-primary-foreground">{s.value}</div>
                <div className="text-sm text-primary-foreground/70 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CATEGORIES ═══════ */}
      <section className="py-20 lg:py-28 container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm font-semibold tracking-widest uppercase">Categories</span>
          <h2 className="text-3xl lg:text-4xl font-bold mt-2">Find Your Perfect Match</h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            From daily commuters to weekend getaways — we have the right ride for every occasion.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link to={`/search?category=${cat.name}`}>
                <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer overflow-hidden">
                  <CardContent className={`p-8 text-center bg-gradient-to-br ${cat.gradient}`}>
                    <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                    <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{cat.count}+ cars</p>
                    <ChevronRight className="h-5 w-5 mx-auto mt-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="py-20 lg:py-28 bg-accent relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-10 right-10 w-40 h-40 border border-primary/10 rounded-3xl rotate-45 hidden lg:block" />
        <div className="absolute bottom-10 left-10 w-20 h-20 bg-primary/5 rounded-full hidden lg:block" />

        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-primary text-sm font-semibold tracking-widest uppercase">How It Works</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 text-accent-foreground">Three Simple Steps</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[17%] right-[17%] h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="text-center relative"
              >
                <div className="mx-auto mb-6 w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative z-10">
                  <span className="text-3xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-accent-foreground mb-2">{item.title}</h3>
                <p className="text-accent-foreground/60 max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES GRID ═══════ */}
      <section className="py-20 lg:py-28 container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-14"
        >
          <span className="text-primary text-sm font-semibold tracking-widest uppercase">Why DriveShare</span>
          <h2 className="text-3xl lg:text-4xl font-bold mt-2">Built for Drivers, by Drivers</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Every feature is designed to make renting and sharing cars effortless, safe, and affordable.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <Card className="h-full border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group">
                <CardContent className="p-7">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="py-20 lg:py-28 bg-muted/50 relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-[80px]" />

        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <span className="text-primary text-sm font-semibold tracking-widest uppercase">Testimonials</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2">Loved by Thousands</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                <Card className="h-full">
                  <CardContent className="p-7">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, s) => (
                        <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground/80 leading-relaxed mb-6">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ OWNER CTA BANNER ═══════ */}
      <section className="py-20 lg:py-28 container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden bg-accent p-10 lg:p-16"
        >
          {/* Shapes */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/10 blur-[80px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary/5 blur-[60px] -translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-8 right-12 w-20 h-20 border border-primary/20 rounded-xl rotate-12 hidden lg:block" />
          <div className="absolute bottom-8 left-20 w-12 h-12 bg-primary/10 rounded-full hidden lg:block" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl">
              <h2 className="text-3xl lg:text-4xl font-bold text-accent-foreground mb-4">
                Earn Money with Your Idle Car
              </h2>
              <p className="text-accent-foreground/70 text-lg leading-relaxed mb-6">
                Turn your parked car into a money-making machine. List for free, set your own price,
                and earn up to $1,200/month. We handle the insurance.
              </p>
              <ul className="space-y-2 mb-8">
                {['Free to list — no upfront costs', 'You set availability & price', 'Comprehensive trip insurance included'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-accent-foreground/80 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button size="lg" className="gap-2 text-base h-14 px-8 rounded-xl shadow-lg shadow-primary/25">
                  Start Earning <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="flex-shrink-0 hidden lg:flex items-center justify-center">
              <div className="relative w-56 h-56 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Users className="w-20 h-20 text-primary/60" />
                <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-bold shadow-lg">
                  $1,200/mo
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="py-20 lg:py-28 bg-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(160_84%_39%/0.08),transparent_70%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/10 rounded-full" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="container relative z-10 text-center"
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-accent-foreground mb-5">
            Ready to Hit the Road?
          </h2>
          <p className="text-accent-foreground/60 mb-10 max-w-md mx-auto text-lg">
            Join thousands of drivers and hosts on the most trusted car sharing platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/search">
              <Button size="lg" className="gap-2 text-base h-14 px-10 rounded-xl shadow-lg shadow-primary/25">
                Browse Cars <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                variant="outline"
                size="lg"
                className="text-base h-14 px-10 rounded-xl border-accent-foreground/20 text-accent-foreground hover:bg-accent-foreground/10"
              >
                Sign Up Free
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-border/40 bg-accent">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <Link to="/" className="flex items-center gap-2 font-bold text-xl text-accent-foreground mb-4">
                <Car className="h-6 w-6 text-primary" />
                DriveShare
              </Link>
              <p className="text-sm text-accent-foreground/50 leading-relaxed">
                The peer-to-peer car sharing marketplace. Rent or earn — your choice.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-accent-foreground mb-3 text-sm">Renters</h4>
              <ul className="space-y-2 text-sm text-accent-foreground/50">
                <li><Link to="/search" className="hover:text-primary transition-colors">Browse Cars</Link></li>
                <li><Link to="/search?category=Luxury" className="hover:text-primary transition-colors">Luxury Collection</Link></li>
                <li><Link to="/search?category=Electric" className="hover:text-primary transition-colors">Electric Vehicles</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-accent-foreground mb-3 text-sm">Owners</h4>
              <ul className="space-y-2 text-sm text-accent-foreground/50">
                <li><Link to="/auth" className="hover:text-primary transition-colors">List Your Car</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">How It Works</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Insurance Info</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-accent-foreground mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-accent-foreground/50">
                <li><Link to="/" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-accent-foreground/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-accent-foreground/40">© 2026 DriveShare. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-accent-foreground/40">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Support</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
