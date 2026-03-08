import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CarRow = Tables<'cars'>;

const AllListingsTable = () => {
  const queryClient = useQueryClient();

  const { data: cars, isLoading } = useQuery({
    queryKey: ['admin-all-cars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .in('status', ['live', 'delisted'])
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as CarRow[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ carId, newStatus }: { carId: string; newStatus: 'live' | 'delisted' }) => {
      const { error } = await supabase
        .from('cars')
        .update({ status: newStatus, is_active: newStatus === 'live' })
        .eq('id', carId);
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      toast({ title: newStatus === 'live' ? 'Listing re-activated' : 'Listing delisted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteCar = useMutation({
    mutationFn: async (carId: string) => {
      const { error } = await supabase.from('cars').delete().eq('id', carId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      toast({ title: 'Listing deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (!cars?.length) {
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
                  disabled={toggleStatus.isPending}
                  onClick={() =>
                    toggleStatus.mutate({
                      carId: car.id,
                      newStatus: car.status === 'live' ? 'delisted' : 'live',
                    })
                  }
                >
                  {car.status === 'live' ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {car.status === 'live' ? 'Delist' : 'Re-list'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteCar.isPending}
                  onClick={() => deleteCar.mutate(car.id)}
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
