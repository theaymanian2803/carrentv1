import { Link } from 'react-router-dom';
import { Car, LogIn, Menu, X, ChevronDown, Search, Shield, Star, Zap, MapPin, CreditCard, Users, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

const BROWSE_ITEMS = [
  {
    title: 'SUVs',
    desc: 'Spacious rides for every adventure',
    icon: Car,
    href: '/search?category=SUV',
  },
  {
    title: 'Sedans',
    desc: 'Comfortable daily drivers',
    icon: Car,
    href: '/search?category=Sedan',
  },
  {
    title: 'Luxury',
    desc: 'Premium cars for special occasions',
    icon: Star,
    href: '/search?category=Luxury',
  },
  {
    title: 'Electric',
    desc: 'Eco-friendly & high-tech',
    icon: Zap,
    href: '/search?category=Electric',
  },
];

const PLATFORM_ITEMS = [
  { title: 'How It Works', desc: 'Simple 3-step process', icon: Search, href: '/#how-it-works' },
  { title: 'Insurance & Safety', desc: 'Every trip is covered', icon: Shield, href: '/#features' },
  { title: 'List Your Car', desc: 'Earn up to $1,200/mo', icon: CreditCard, href: '/#owner-cta' },
  { title: '24/7 Support', desc: "We're always here to help", icon: Headphones, href: '/#features' },
];

interface MegaPanelProps {
  items: typeof BROWSE_ITEMS;
  featured?: { label: string; title: string; desc: string; href: string };
  onClose: () => void;
}

const MegaPanel = ({ items, featured, onClose }: MegaPanelProps) => (
  <div className="absolute left-0 right-0 top-full border-b bg-card shadow-xl animate-in fade-in-0 slide-in-from-top-2 duration-200">
    <div className="container grid gap-6 py-6 md:grid-cols-5">
      {/* Links grid */}
      <div className="md:col-span-3 grid grid-cols-2 gap-1">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.href}
            onClick={onClose}
            className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <item.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Featured card */}
      {featured && (
        <div className="md:col-span-2 rounded-xl bg-accent p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{featured.label}</span>
          <div className="mt-2">
            <h4 className="text-lg font-bold text-accent-foreground">{featured.title}</h4>
            <p className="mt-1 text-sm text-accent-foreground/70">{featured.desc}</p>
          </div>
          <Link to={featured.href} onClick={onClose}>
            <Button size="sm" className="mt-4 w-full">Learn More</Button>
          </Link>
        </div>
      )}
    </div>
  </div>
);

type PanelKey = 'browse' | 'platform' | null;

const Navbar = () => {
  const { user, signOut, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const navRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getDashboardLink = () => {
    if (hasRole('admin')) return '/admin';
    if (hasRole('owner')) return '/owner';
    return '/renter';
  };

  const openPanel = (panel: PanelKey) => {
    clearTimeout(timeoutRef.current);
    setActivePanel(panel);
  };

  const scheduleClose = () => {
    timeoutRef.current = setTimeout(() => setActivePanel(null), 200);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const triggerClass = (panel: PanelKey) =>
    `flex items-center gap-1 text-sm transition-colors ${activePanel === panel ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Car className="h-6 w-6 text-primary" />
          <span className="font-heading">DriveShare</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {/* Browse Cars trigger */}
          <button
            className={triggerClass('browse')}
            onMouseEnter={() => openPanel('browse')}
            onMouseLeave={scheduleClose}
          >
            Browse Cars <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activePanel === 'browse' ? 'rotate-180' : ''}`} />
          </button>

          {/* Platform trigger */}
          <button
            className={triggerClass('platform')}
            onMouseEnter={() => openPanel('platform')}
            onMouseLeave={scheduleClose}
          >
            Platform <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activePanel === 'platform' ? 'rotate-180' : ''}`} />
          </button>

          {user ? (
            <>
              <Link to={getDashboardLink()}>
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gap-2">
                <LogIn className="h-4 w-4" /> Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mega panels */}
      {activePanel === 'browse' && (
        <div onMouseEnter={() => openPanel('browse')} onMouseLeave={scheduleClose}>
          <MegaPanel
            items={BROWSE_ITEMS}
            featured={{ label: 'Popular', title: 'Weekend Getaway Picks', desc: 'Our most booked SUVs and sedans for road trips — starting at $45/day.', href: '/search' }}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}
      {activePanel === 'platform' && (
        <div onMouseEnter={() => openPanel('platform')} onMouseLeave={scheduleClose}>
          <MegaPanel
            items={PLATFORM_ITEMS}
            featured={{ label: 'Owners', title: 'Start Earning Today', desc: 'List your car in minutes and earn up to $1,200/month with full insurance coverage.', href: '/auth' }}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Browse Cars</p>
          {BROWSE_ITEMS.map((item) => (
            <Link key={item.title} to={item.href} className="flex items-center gap-3 py-1.5 text-sm" onClick={() => setMobileOpen(false)}>
              <item.icon className="h-4 w-4 text-primary" /> {item.title}
            </Link>
          ))}
          <div className="border-t pt-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Platform</p>
            {PLATFORM_ITEMS.map((item) => (
              <Link key={item.title} to={item.href} className="flex items-center gap-3 py-1.5 text-sm" onClick={() => setMobileOpen(false)}>
                <item.icon className="h-4 w-4 text-primary" /> {item.title}
              </Link>
            ))}
          </div>
          <div className="border-t pt-3">
            {user ? (
              <>
                <Link to={getDashboardLink()} className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { signOut(); setMobileOpen(false); }}>Sign Out</Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full gap-2"><LogIn className="h-4 w-4" /> Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
