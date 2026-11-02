import { useState } from 'react';
import { useBookings, useSetBookingStatus } from '@/hooks/queries/useBookings';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Car, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle,
  Loader2 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { OwnerBooking } from '@/lib/data/types';

type BookingWithDetails = OwnerBooking;

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: "default" | "destructive" | "outline" | "secondary", className: string }> = {
    pending: { variant: 'outline', className: 'border-yellow-200 text-yellow-800 bg-yellow-50' },
    approved: { variant: 'default', className: 'border-green-200 text-green-800 bg-green-50' },
    active: { variant: 'default', className: 'border-blue-200 text-blue-800 bg-blue-50' },
    completed: { variant: 'secondary', className: 'border-gray-200 text-gray-600 bg-gray-50' },
    cancelled: { variant: 'destructive', className: 'border-red-200 text-red-800 bg-red-50' },
    disputed: { variant: 'destructive', className: 'border-red-200 text-red-800 bg-red-50' },
  };

  const config = variants[status] || variants.pending;
  return (
    <Badge variant={config.variant} className={config.className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const BookingRequestBoard = () => {
  const { data, isLoading: loading } = useBookings();
  const setStatus = useSetBookingStatus();
  const bookings = data?.asOwner ?? [];
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleBookingAction = async (bookingId: string, newStatus: 'approved' | 'cancelled') => {
    setProcessingIds(prev => new Set([...prev, bookingId]));

    try {
      await setStatus.mutateAsync({ id: bookingId, status: newStatus });
      toast({
        title: newStatus === 'approved' ? 'Booking approved!' : 'Booking declined',
        description: newStatus === 'approved'
          ? 'The renter has been notified of your approval.'
          : 'The booking has been declined.'
      });
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No booking requests yet</h3>
          <p className="text-muted-foreground">
            Booking requests for your vehicles will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const otherBookings = bookings.filter(b => b.status !== 'pending');

  return (
    <div className="space-y-6">
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Pending Requests ({pendingBookings.length})
          </h2>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                onAction={handleBookingAction}
                isProcessing={processingIds.has(booking.id)}
                showActions={true}
              />
            ))}
          </div>
        </div>
      )}

      {otherBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">All Bookings</h2>
          <div className="space-y-4">
            {otherBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking}
                isProcessing={false}
                showActions={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface BookingCardProps {
  booking: BookingWithDetails;
  onAction?: (id: string, status: 'approved' | 'cancelled') => void;
  isProcessing: boolean;
  showActions: boolean;
}

const BookingCard = ({ booking, onAction, isProcessing, showActions }: BookingCardProps) => {
  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const daysFromNow = differenceInDays(startDate, new Date());

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Car className="h-5 w-5 text-primary" />
            {booking.car.year} {booking.car.make} {booking.car.model}
          </CardTitle>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Renter Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {booking.renter.full_name?.[0]?.toUpperCase() || 'R'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{booking.renter.full_name || 'Renter'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Requested {format(new Date(booking.created_at), 'MMM d')}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid md:grid-cols-2 gap-4">
          {/* Dates */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">RENTAL PERIOD</h4>
            <div className="space-y-1">
              <p className="text-sm flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.total_days} day{booking.total_days > 1 ? 's' : ''}
                {daysFromNow > 0 && ` • Starts in ${daysFromNow} day${daysFromNow > 1 ? 's' : ''}`}
                {daysFromNow < 0 && ` • Started ${Math.abs(daysFromNow)} day${Math.abs(daysFromNow) > 1 ? 's' : ''} ago`}
                {daysFromNow === 0 && ' • Starts today'}
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">PAYMENT BREAKDOWN</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Your payout:</span>
                <span className="font-medium">${booking.owner_payout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform fee:</span>
                <span>${booking.platform_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total (renter pays):</span>
                <span>${booking.total_price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {booking.car.address}
        </div>

        {/* Actions for pending bookings */}
        {showActions && onAction && (
          <>
            <Separator />
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => onAction(booking.id, 'approved')}
                disabled={isProcessing}
                className="flex-1 gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                onClick={() => onAction(booking.id, 'cancelled')}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Decline
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingRequestBoard;