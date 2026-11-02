import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  useAdminCars,
  useAdminRemoveCar,
  useAdminSetCarStatus,
} from '@/hooks/queries/useAdmin';

const AllListingsTable = () => {
  const { data: allCars = [], isLoading } = useAdminCars();
  const setStatus = useAdminSetCarStatus();
  const removeCar = useAdminRemoveCar();

  const cars = allCars
    .filter((car) => car.status === 'live' || car.status === 'delisted')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const toggleStatus = (carId: string, newStatus: 'live' | 'delisted') => {
    setStatus.mutate(
      { id: carId, status: newStatus },
      {
        onSuccess: () =>
          toast({ title: newStatus === 'live' ? 'Listing re-activated' : 'Listing delisted' }),
        onError: (err) =>
          toast({ title: 'Error', description: err.message, variant: 'destructive' }),
      }
    );
  };

  const handleDelete = (carId: string) => {
    removeCar.mutate(carId, {
      onSuccess: () => toast({ title: 'Listing deleted' }),
      onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
    });
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (!cars.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">No live or delisted listings yet.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cars.map((car) => (
            <TableRow key={car.id}>
              <TableCell className="font-medium">{car.year} {car.make} {car.model}</TableCell>
              <TableCell><Badge variant="secondary">{car.category}</Badge></TableCell>
              <TableCell>${car.daily_rate}/day</TableCell>
              <TableCell className="max-w-[200px] truncate">{car.address || '—'}</TableCell>
              <TableCell>
                <Badge variant={car.status === 'live' ? 'default' : 'destructive'}>
                  {car.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setStatus.isPending}
                  onClick={() => toggleStatus(car.id, car.status === 'live' ? 'delisted' : 'live')}
                >
                  {car.status === 'live' ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {car.status === 'live' ? 'Delist' : 'Re-list'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={removeCar.isPending}
                  onClick={() => handleDelete(car.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default AllListingsTable;
