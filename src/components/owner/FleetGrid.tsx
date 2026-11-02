import { useMyCars, useUpdateCar, useDeleteCar } from '@/hooks/queries/useCars';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Car, MapPin, DollarSign, Trash2 } from 'lucide-react';
import type { Car as CarRow } from '@/lib/data/types';

const statusColors: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-800 border-amber-200',
  live: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  delisted: 'bg-red-100 text-red-800 border-red-200',
};

interface FleetGridProps { onAddCar: () => void; }

const FleetGrid = ({ onAddCar }: FleetGridProps) => {
  const { data: cars = [], isLoading: loading } = useMyCars();
  const updateCar = useUpdateCar();
  const deleteCarMutation = useDeleteCar();

  const toggleActive = async (car: CarRow) => {
    try {
      await updateCar.mutateAsync({ id: car.id, input: { is_active: !car.is_active } });
      toast({ title: car.is_active ? 'Voiture désactivée' : 'Voiture activée' });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
        variant: 'destructive',
      });
    }
  };

  const removeCar = async (carId: string) => {
    try {
      await deleteCarMutation.mutateAsync(carId);
      toast({ title: 'Voiture supprimée' });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => (<Card key={i}><Skeleton className="h-40 rounded-t-lg" /><CardContent className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>))}</div>);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{cars.length} véhicule{cars.length !== 1 ? 's' : ''}</p>
        <Button onClick={onAddCar} className="gap-2"><Car className="h-4 w-4" /> Ajouter une voiture</Button>
      </div>
      {cars.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" /><h3 className="font-semibold text-lg mb-2">Aucune voiture listée</h3><p className="text-muted-foreground mb-4">Commencez à gagner en listant votre premier véhicule.</p><Button onClick={onAddCar} className="gap-2"><Car className="h-4 w-4" /> Lister votre première voiture</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cars.map((car) => (
            <Card key={car.id} className="overflow-hidden group">
              <div className="aspect-video bg-muted relative overflow-hidden">
                {car.images && car.images.length > 0 ? (<img src={car.images[0]} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />) : (<div className="flex items-center justify-center h-full"><Car className="h-10 w-10 text-muted-foreground/30" /></div>)}
                <Badge className={`absolute top-2 right-2 text-xs ${statusColors[car.status] || ''}`}>{car.status.replace('_', ' ')}</Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div><h3 className="font-semibold">{car.year} {car.make} {car.model}</h3><div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><MapPin className="h-3 w-3" /> {car.address || 'Pas d\'adresse'}</div></div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-1 text-primary font-semibold"><DollarSign className="h-4 w-4" />{car.daily_rate}/jour</div><Badge variant="outline">{car.category}</Badge></div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2"><Switch checked={car.is_active} onCheckedChange={() => toggleActive(car)} /><span className="text-xs text-muted-foreground">{car.is_active ? 'Active' : 'Inactive'}</span></div>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeCar(car.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FleetGrid;