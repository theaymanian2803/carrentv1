import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, X, UserCircle, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Parcourir', href: '/search' },
  { label: 'SUV', href: '/search?category=SUV' },
  { label: 'Berlines', href: '/search?category=Sedan' },
  { label: 'Luxe', href: '/search?category=Luxury' },
  { label: 'Électrique', href: '/search?category=Electric' },
];

const Navbar = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const dashboardLink = hasRole('admin') ? '/admin' : hasRole('owner') ? '/owner' : '/renter';

  const initials = (name?: string | null) =>
    (name?.split(' ').map((n) => n[0]).join('') || 'U').toUpperCase().slice(0, 2);

  return (
    <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border/70">
      <div className="container flex h-16 items-center justify-between gap-8">
        <Link to="/" className="font-heading text-lg font-semibold tracking-tight uppercase">
          Drive<span className="text-accent">Share</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {NAV_LINKS.map((l) => {
            const active = pathname + (l.href.includes('?') ? '' : '') === l.href;
            return (
              <Link
                key={l.href}
                to={l.href}
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors relative',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to={dashboardLink}>
                <Button variant="ghost" size="sm" className="text-[11px] uppercase tracking-[0.2em]">
                  Tableau de bord
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-border/70 pl-1 pr-3 py-1 hover:border-accent transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="text-xs">{initials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{profile?.full_name?.split(' ')[0] || 'Compte'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium">{profile?.full_name || 'Utilisateur'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile"><UserCircle className="mr-2 h-4 w-4" />Mon profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={dashboardLink}><Car className="mr-2 h-4 w-4" />Tableau de bord</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button
                size="sm"
                variant="outline"
                className="rounded-none border-foreground text-[11px] uppercase tracking-[0.22em] gap-2 hover:bg-foreground hover:text-background"
              >
                <LogIn className="h-3.5 w-3.5" /> Connexion
              </Button>
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-6 space-y-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setMobileOpen(false)}
                className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              {user ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback>{initials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name || 'Utilisateur'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Link to={dashboardLink} onClick={() => setMobileOpen(false)} className="block py-2 text-sm">
                    Tableau de bord
                  </Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="block py-2 text-sm">
                    Mon profil
                  </Link>
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => { signOut(); setMobileOpen(false); }}>
                    Se déconnecter
                  </Button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-none">Connexion</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
