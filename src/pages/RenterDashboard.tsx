import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Car, Clock, CheckCircle, DollarSign, MapPin, CalendarDays, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type BookingRow = Tables<'bookings'>;
type CarRow = Tables<'cars'>;

interface BookingWithCar extends BookingRow {
  car: Pick<CarRow, 'make' | 'model' | 'year' | 'images' | 'address' | 'daily_rate'> | null;
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  disputed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const RenterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, car:cars(make, model, year, images, address, daily_rate)')
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error loading bookings', description: error.message, variant: 'destructive' });
      } else {
        setBookings((data as unknown as BookingWithCar[]) || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const upcoming = bookings.filter(b => ['pending', 'approved', 'active'].includes(b.status));
  const past = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => ['cancelled', 'disputed'].includes(b.status));

  const totalSpent = past.reduce((s, b) => s + Number(b.total_price), 0);

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) {
      toast({ title: 'Cancel failed', description: error.message, variant: 'destructive' });
    } else {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
      toast({ title: 'Booking cancelled' });
    }
  };

  const BookingCard = ({ booking }: { booking: BookingWithCar }) => {
    const car = booking.car;
    const thumb = car?.images?.[0];

    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail */}
          <div
            className="sm:w-48 h-36 sm:h-auto bg-muted flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/cars/${booking.car_id}`)}
          >
            {thumb ? (
              <img src={thumb} alt="car" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Car className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <CardContent className="flex-1 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/cars/${booking.car_id}`)}
                >
                  {car ? `${car.year} ${car.make} ${car.model}` : 'Car'}
                </h3>
                {car?.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" /> {car.address}
                  </p>
                )}
              </div>
              <Badge className={statusColor[booking.status] || ''}>
                {booking.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(booking.start_date), 'MMM d')} – {format(new Date(booking.end_date), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {booking.total_days} day{booking.total_days > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                ${Number(booking.total_price).toFixed(2)}
              </span>
            </div>

            {booking.status === 'pending' && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleCancel(booking.id)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            )}
          </CardContent>
        </div>
      </Card>
    );
  };

  const BookingList = ({ items }: { items: BookingWithCar[] }) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No bookings here yet.{' '}
            <a href="/search" className="text-primary hover:underline">Browse cars</a>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        {items.map(b => <BookingCard key={b.id} booking={b} />)}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">My Trips</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Upcoming Trips', value: loading ? '—' : String(upcoming.length), icon: Clock },
            { title: 'Completed Trips', value: loading ? '—' : String(past.length), icon: CheckCircle },
            { title: 'Total Spent', value: loading ? '—' : `$${totalSpent.toFixed(2)}`, icon: DollarSign },
          ].map((m) => (
            <Card key={m.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
                <m.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <BookingList items={upcoming} />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <BookingList items={past} />
          </TabsContent>
          <TabsContent value="cancelled" className="mt-4">
            <BookingList items={cancelled} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RenterDashboard;
