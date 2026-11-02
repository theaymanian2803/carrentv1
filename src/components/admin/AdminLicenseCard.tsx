import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useActivateLicense, useLicense } from '@/hooks/useLicense';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';

const REASONS: Record<string, string> = {
  missing: 'Aucune licence activée sur ce domaine.',
  domain_mismatch: 'La clé enregistrée est liée à un autre domaine.',
  expired: 'La licence a expiré.',
  product_mismatch: 'Cette clé ne correspond pas à ce produit.',
  invalid: 'La clé enregistrée est invalide.',
};

export default function AdminLicenseCard() {
  const { data, isLoading } = useLicense();
  const activate = useActivateLicense();
  const [key, setKey] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-28 w-full mb-6 rounded-xl" />;
  }

  const licensed = Boolean(data?.licensed);
  const showForm = !licensed || formOpen;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    activate.mutate(key.trim(), {
      onSuccess: () => {
        toast({ title: 'Licence activée', description: 'Les modifications sont débloquées.' });
        setKey('');
        setFormOpen(false);
      },
      onError: (err) =>
        toast({ title: 'Activation impossible', description: err.message, variant: 'destructive' }),
    });
  };

  return (
    <Card className={`mb-6 ${licensed ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-amber-500/40 bg-amber-500/[0.05]'}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {licensed ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : (
            <KeyRound className="h-4 w-4 text-amber-600" />
          )}
          {licensed ? 'Licence active' : 'Activez votre licence'}
        </CardTitle>
        {licensed && !data?.disabled && (
          <Button variant="ghost" size="sm" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? 'Annuler' : 'Changer de clé'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {licensed ? (
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Domaine</p>
              <p className="font-medium">{data?.domain}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Mode</p>
              <p className="font-medium">
                {data?.disabled ? 'Développement (licence ignorée)' : data?.mode ?? 'forever'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Expiration</p>
              <p className="font-medium">
                {data?.expires_at ? new Date(data.expires_at).toLocaleDateString() : 'Jamais'}
              </p>
            </div>
            {data?.key && (
              <div className="sm:col-span-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Clé</p>
                <p className="font-mono text-xs truncate">{data.key}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {REASONS[data?.reason ?? 'missing'] ??
              'Collez la clé fournie avec votre achat pour débloquer les modifications.'}
            {' '}La vitrine reste accessible sans licence.
          </p>
        )}

        {showForm && (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="grid gap-1.5 flex-1">
              <Label htmlFor="license-key">Clé de licence</Label>
              <Input
                id="license-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="CARSHARE-…"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={!key.trim() || activate.isPending} className="gap-2">
              {activate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Activer
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
