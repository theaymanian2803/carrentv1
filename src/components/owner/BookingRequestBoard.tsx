import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  DollarSign, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle,
  Loader2 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type BookingRow = Tables<'bookings'>;
type CarRow = Tables<'cars'>;
type ProfileRow = Tables<'profiles'>;

interface BookingWithDetails extends BookingRow {
  cars: CarRow;
  profiles: ProfileRow;
}

const BookingRequestBoard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars!inner(*),
        profiles!bookings_renter_id_fkey(*)
      `)
      .eq('cars.owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading bookings', description: error.message, variant: 'destructive' });
    } else {
      setBookings(data as BookingWithDetails[] || []);
    }
    setLoading(false);
  };

  const handleBookingAction = async (bookingId: string, newStatus: 'approved' | 'cancelled') => {
    setProcessingIds(prev => new Set([...prev, bookingId]));
    
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) {
      toast({ 
        title: 'Action failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: newStatus === 'approved' ? 'Booking approved!' : 'Booking declined',
        description: newStatus === 'approved' 
          ? 'The renter has been notified of your approval.' 
          : 'The booking has been declined.'
      });
      fetchBookings(); // Refresh the list
    }
    
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(bookingId);
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "outline" | "secondary", color: string }> = {
      pending: { variant: 'outline', color: 'text-yellow-600' },
      approved: { variant: 'default', color: 'text-green-600' },
      active: { variant: 'default', color: 'text-blue-600' },
      completed: { variant: 'secondary', color: 'text-gray-600' },
      cancelled: { variant: 'destructive', color: 'text-red-600' },
      disputed: { variant: 'destructive', color: 'text-red-600' },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
            <Clock className="h-5 w-5 text-yellow-600" />
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
            {booking.cars.year} {booking.cars.make} {booking.cars.model}
          </CardTitle>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Renter Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {booking.profiles.full_name?.[0]?.toUpperCase() || 'R'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{booking.profiles.full_name || 'Renter'}</p>
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
          {booking.cars.address}
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