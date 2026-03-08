import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Check, X, Car, MapPin, Calendar, DollarSign } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CarRow = Tables<'cars'>;

const ListingApprovalQueue = () => {
  const queryClient = useQueryClient();

  const { data: pendingCars, isLoading } = useQuery({
    queryKey: ['admin-pending-cars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CarRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ carId, status }: { carId: string; status: 'live' | 'delisted' }) => {
      const { error } = await supabase
        .from('cars')
        .update({ status })
        .eq('id', carId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-cars'] });
      toast({
        title: status === 'live' ? 'Listing approved' : 'Listing rejected',
        description: status === 'live'
          ? 'The car is now live and visible to renters.'
          : 'The listing has been rejected.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!pendingCars?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Check className="mx-auto h-10 w-10 mb-3 text-primary/40" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No pending listings to review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {pendingCars.length} listing{pendingCars.length !== 1 ? 's' : ''} awaiting review
      </p>
      {pendingCars.map((car) => (
        <PendingCarCard
          key={car.id}
          car={car}
          onApprove={() => updateStatus.mutate({ carId: car.id, status: 'live' })}
          onReject={() => updateStatus.mutate({ carId: car.id, status: 'delisted' })}
          isUpdating={updateStatus.isPending}
        />
      ))}
    </div>
  );
};

interface PendingCarCardProps {
  car: CarRow;
  onApprove: () => void;
  onReject: () => void;
  isUpdating: boolean;
}

const PendingCarCard = ({ car, onApprove, onReject, isUpdating }: PendingCarCardProps) => {
  const imageUrl = car.images?.[0];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-48 h-40 sm:h-auto bg-muted flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Details */}
        <CardContent className="flex-1 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">
                {car.year} {car.make} {car.model}
              </h3>
              <Badge variant="secondary">{car.category}</Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {car.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {car.address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> {car.daily_rate}/day
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Submitted{' '}
                {new Date(car.created_at).toLocaleDateString()}
              </span>
            </div>

            {car.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {car.description}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isUpdating}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button size="sm" onClick={onApprove} disabled={isUpdating}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default ListingApprovalQueue;
