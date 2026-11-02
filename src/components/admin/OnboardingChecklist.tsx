import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCars, useAdminDemoData } from '@/hooks/queries/useAdmin';
import { useLandingSections } from '@/hooks/useLandingSections';
import { useLicense } from '@/hooks/useLicense';
import { useChangePassword, useUpdateProfile } from '@/hooks/queries/useProfile';
import { isCarRow } from '@/lib/carRows';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  KeyRound,
  Sparkles,
  X,
} from 'lucide-react';

export default function OnboardingChecklist() {
  const { user, profile, refresh } = useAuth();
  const { data: cars = [] } = useAdminCars();
  const { data: sections = [] } = useLandingSections();
  const { data: license } = useLicense();
  const demoData = useAdminDemoData();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [previewed, setPreviewed] = useState(false);

  if (!profile || profile.onboarding_completed) return null;

  const hasLiveCar = cars.some((car) => car.status === 'live');
  const hasSection = sections.some(isCarRow);

  const steps = [
    {
      label: 'Compte administrateur prêt',
      done: true,
      action: null,
      hint: 'Vous êtes connecté en tant qu’admin.',
    },
    {
      label: 'Ajouter votre première voiture',
      done: cars.length > 0,
      action: { label: 'Ajouter', to: '/admin/add-car' },
      hint: 'Elle apparaîtra dans la file d’approbation.',
    },
    {
      label: 'Publier une annonce',
      done: hasLiveCar,
      action: { label: 'Approuver', to: '/admin' },
      hint: 'Approuvez une voiture pour la rendre visible.',
    },
    {
      label: 'Configurer la page d’accueil',
      done: hasSection,
      action: { label: 'Éditeur', to: '/admin/page-builder' },
      hint: 'Ajoutez une rangée SUVs, Luxe, etc.',
    },
    {
      label: 'Activer la licence',
      done: Boolean(license?.licensed),
      action: null,
      hint: license?.licensed
        ? 'Les modifications du back-office sont autorisées.'
        : 'Collez votre clé dans la carte Licence ci-dessus.',
    },
    {
      label: 'Prévisualiser la boutique',
      done: previewed,
      action: { label: 'Ouvrir', to: '/' },
      hint: 'Vérifiez le rendu côté visiteur.',
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  const dismiss = () => {
    updateProfile.mutate(
      { onboarding_completed: true },
      {
        onSuccess: async () => {
          await refresh();
          toast({ title: 'Guide masqué', description: 'Vous pouvez le retrouver dans le profil.' });
        },
      }
    );
  };

  const loadDemo = () => {
    demoData.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: result.seeded ? 'Données de démo ajoutées' : 'Des voitures existent déjà',
          description: result.seeded
            ? `${result.cars} voitures et ${result.sections} sections créées.`
            : 'Aucune donnée ajoutée.',
        });
        if (result.seeded) setPreviewed(false);
      },
      onError: (err) =>
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
    });
  };

  const submitPassword = (event: React.FormEvent) => {
    event.preventDefault();
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast({ title: 'Mot de passe mis à jour' });
          setCurrentPassword('');
          setNewPassword('');
          setShowPassword(false);
        },
        onError: (err) =>
          toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
      }
    );
  };

  return (
    <Card className="mb-8 border-primary/25 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-primary" /> Bienvenue — mettez la boutique en ligne
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {completed}/{steps.length} étapes terminées
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss} aria-label="Masquer le guide">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <Progress value={progress} className="h-2" />

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
              {!step.done && step.action && (
                <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                  <Link
                    to={step.action.to}
                    target={step.action.to === '/' ? '_blank' : undefined}
                    onClick={() => {
                      if (step.action?.to === '/') setPreviewed(true);
                    }}
                  >
                    {step.action.label}
                    {step.action.to === '/' && <ExternalLink className="h-3 w-3" />}
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {cars.length === 0 && license?.licensed && (
            <Button size="sm" variant="secondary" onClick={loadDemo} disabled={demoData.isPending}>
              Charger des données de démo
            </Button>
          )}
          {cars.length === 0 && !license?.licensed && (
            <span className="text-xs text-muted-foreground">
              Activez la licence pour charger les données de démo.
            </span>
          )}
          <Button asChild size="sm" variant="ghost" className="gap-2">
            <Link to="/" target="_blank">
              <Eye className="h-4 w-4" /> Voir la boutique
            </Link>
          </Button>
          {!user?.isGuest && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => setShowPassword((open) => !open)}
            >
              <KeyRound className="h-4 w-4" /> Changer le mot de passe
            </Button>
          )}
        </div>

        {showPassword && (
          <form onSubmit={submitPassword} className="grid gap-3 rounded-lg border border-border/60 p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={changePassword.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
