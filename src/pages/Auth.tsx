import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Car, Chrome, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, continueAsGuest, startGoogleSignIn, refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'owner' | 'renter'>('renter');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    if (google === 'success') {
      window.history.replaceState({}, '', '/auth');
      void refresh().then(() => {
        toast({ title: 'Connecté avec Google', description: 'Bienvenue !' });
        navigate('/');
      });
    } else if (google === 'error') {
      window.history.replaceState({}, '', '/auth');
      toast({
        title: 'Connexion Google échouée',
        description: 'Réessayez ou utilisez un autre mode de connexion.',
        variant: 'destructive',
      });
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { roles } = await signIn(email, password);
      if (roles.includes('admin')) navigate('/admin');
      else if (roles.includes('owner')) navigate('/owner');
      else navigate('/renter');
      toast({ title: 'Bon retour !', description: 'Connexion réussie.' });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Connexion impossible',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp({ email, password, fullName, role });
      navigate(role === 'owner' ? '/owner' : '/renter');
      toast({
        title: 'Compte créé !',
        description: 'Bienvenue sur DriveShare. Commencez à explorer maintenant.',
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Création du compte impossible',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await continueAsGuest();
      navigate('/');
      toast({
        title: 'Mode invité activé',
        description: 'Vous pouvez réserver dès maintenant. Connectez-vous avec Google plus tard pour retrouver votre compte.',
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de démarrer une session invitée',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container flex items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bienvenue sur DriveShare</CardTitle>
            <CardDescription>Connectez-vous ou créez un compte</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full gap-2" onClick={startGoogleSignIn}>
              <Chrome className="h-4 w-4" /> Continuer avec Google
            </Button>
            <div className="my-4 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Connexion en cours...' : 'Se connecter'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <Input id="signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  </div>
                  <div className="space-y-2">
                    <Label>Je souhaite</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as 'owner' | 'renter')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="renter">Louer des voitures</SelectItem>
                        <SelectItem value="owner">Mettre mes voitures en location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Création du compte...' : 'Créer un compte'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <Button
              variant="ghost"
              className="mt-4 w-full gap-2 text-muted-foreground"
              onClick={handleGuest}
              disabled={loading}
            >
              <UserRound className="h-4 w-4" /> Continuer en tant qu'invité
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
