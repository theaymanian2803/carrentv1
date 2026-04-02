import { Link } from 'react-router-dom';
import { Car, LogIn, Menu, X, ChevronDown, Search, Shield, Star, Zap, MapPin, CreditCard, Users, Headphones, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useRef, useEffect } from 'react';

const BROWSE_ITEMS = [
  {
    title: 'SUV',
    desc: 'Véhicules spacieux pour chaque aventure',
    icon: Car,
    href: '/search?category=SUV',
  },
  {
    title: 'Berlines',
    desc: 'Confort au quotidien',
    icon: Car,
    href: '/search?category=Sedan',
  },
  {
    title: 'Luxe',
    desc: 'Véhicules premium pour les occasions spéciales',
    icon: Star,
    href: '/search?category=Luxury',
  },
  {
    title: 'Électrique',
    desc: 'Écologique & high-tech',
    icon: Zap,
    href: '/search?category=Electric',
  },
];

const PLATFORM_ITEMS = [
  { title: 'Comment ça marche', desc: 'Un processus simple en 3 étapes', icon: Search, href: '/#how-it-works' },
  { title: 'Assurance & Sécurité', desc: 'Chaque trajet est couvert', icon: Shield, href: '/#features' },
  { title: 'Listez votre voiture', desc: "Gagnez jusqu'à 1 200 $/mois", icon: CreditCard, href: '/#owner-cta' },
  { title: 'Support 24/7', desc: 'Nous sommes toujours là pour vous aider', icon: Headphones, href: '/#features' },
];

interface MegaPanelProps {
  items: typeof BROWSE_ITEMS;
  featured?: { label: string; title: string; desc: string; href: string };
  onClose: () => void;
}

const MegaPanel = ({ items, featured, onClose }: MegaPanelProps) => (
  <div className="absolute left-0 right-0 top-full border-b bg-card shadow-xl animate-in fade-in-0 slide-in-from-top-2 duration-200">
    <div className="container grid gap-6 py-6 md:grid-cols-5">
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

      {featured && (
        <div className="md:col-span-2 rounded-xl bg-accent p-5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{featured.label}</span>
          <div className="mt-2">
            <h4 className="text-lg font-bold text-accent-foreground">{featured.title}</h4>
            <p className="mt-1 text-sm text-accent-foreground/70">{featured.desc}</p>
          </div>
          <Link to={featured.href} onClick={onClose}>
            <Button size="sm" className="mt-4 w-full">En savoir plus</Button>
          </Link>
        </div>
      )}
    </div>
  </div>
);

type PanelKey = 'browse' | 'platform' | null;

const Navbar = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const navRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getDashboardLink = () => {
    if (hasRole('admin')) return '/admin';
    if (hasRole('owner')) return '/owner';
    return '/renter';
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const openPanel = (panel: PanelKey) => {
    clearTimeout(timeoutRef.current);
    setActivePanel(panel);
  };

  const scheduleClose = () => {
    timeoutRef.current = setTimeout(() => setActivePanel(null), 200);
  };

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

        {/* Bureau */}
        <div className="hidden md:flex items-center gap-6">
          <button
            className={triggerClass('browse')}
            onMouseEnter={() => openPanel('browse')}
            onMouseLeave={scheduleClose}
          >
            Parcourir <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activePanel === 'browse' ? 'rotate-180' : ''}`} />
          </button>

          <button
            className={triggerClass('platform')}
            onMouseEnter={() => openPanel('platform')}
            onMouseLeave={scheduleClose}
          >
            Plateforme <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activePanel === 'platform' ? 'rotate-180' : ''}`} />
          </button>

          {user ? (
            <>
              <Link to={getDashboardLink()}>
                <Button variant="ghost" size="sm">Tableau de bord</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Utilisateur'} />
                      <AvatarFallback className="text-xs">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{profile?.full_name || 'Utilisateur'}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.full_name || 'Utilisateur'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="cursor-pointer">
                      <Car className="mr-2 h-4 w-4" />
                      Tableau de bord
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gap-2">
                <LogIn className="h-4 w-4" /> Connexion
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
            featured={{ label: 'Populaire', title: 'Escapades du week-end', desc: 'Nos SUV et berlines les plus réservés pour les road trips — à partir de 45 $/jour.', href: '/search' }}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}
      {activePanel === 'platform' && (
        <div onMouseEnter={() => openPanel('platform')} onMouseLeave={scheduleClose}>
          <MegaPanel
            items={PLATFORM_ITEMS}
            featured={{ label: 'Propriétaires', title: 'Commencez à gagner dès aujourd\'hui', desc: 'Listez votre voiture en quelques minutes et gagnez jusqu\'à 1 200 $/mois avec une couverture complète.', href: '/auth' }}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Parcourir les voitures</p>
          {BROWSE_ITEMS.map((item) => (
            <Link key={item.title} to={item.href} className="flex items-center gap-3 py-1.5 text-sm" onClick={() => setMobileOpen(false)}>
              <item.icon className="h-4 w-4 text-primary" /> {item.title}
            </Link>
          ))}
          <div className="border-t pt-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plateforme</p>
            {PLATFORM_ITEMS.map((item) => (
              <Link key={item.title} to={item.href} className="flex items-center gap-3 py-1.5 text-sm" onClick={() => setMobileOpen(false)}>
                <item.icon className="h-4 w-4 text-primary" /> {item.title}
              </Link>
            ))}
          </div>
          <div className="border-t pt-3">
            {user ? (
              <>
                <div className="mb-3 px-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Utilisateur'} />
                      <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{profile?.full_name || 'Utilisateur'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
                <Link to="/profile" className="flex items-center gap-3 py-2 px-2 text-sm" onClick={() => setMobileOpen(false)}>
                  <UserCircle className="h-4 w-4 text-primary" /> Mon profil
                </Link>
                <Link to={getDashboardLink()} className="flex items-center gap-3 py-2 px-2 text-sm" onClick={() => setMobileOpen(false)}>
                  <Car className="h-4 w-4 text-primary" /> Tableau de bord
                </Link>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { signOut(); setMobileOpen(false); }}>Se déconnecter</Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full gap-2"><LogIn className="h-4 w-4" /> Connexion</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;