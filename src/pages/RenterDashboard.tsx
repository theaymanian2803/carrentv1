import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings, useSetBookingStatus } from '@/hooks/queries/useBookings';
import { useCreateReview, useMyReviews } from '@/hooks/queries/useReviews';
import Navbar from '@/components/Navbar';
import ReviewModal from '@/components/ReviewModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Car, Clock, CheckCircle, DollarSign, MapPin, CalendarDays, XCircle, Star } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { RenterBooking } from '@/lib/data/types';

type BookingWithCar = RenterBooking;

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  disputed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  active: 'Active',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'Litige',
};

const RenterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading: loading } = useBookings();
  const { data: myReviews = [] } = useMyReviews();
  const setStatus = useSetBookingStatus();
  const createReview = useCreateReview();

  const bookings = data?.asRenter ?? [];
  const reviewedBookingIds = new Set(myReviews.map((r) => r.booking_id));

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<BookingWithCar | null>(null);

  const upcoming = bookings.filter(b => ['pending', 'approved', 'active'].includes(b.status));
  const past = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => ['cancelled', 'disputed'].includes(b.status));
  const totalSpent = past.reduce((s, b) => s + Number(b.total_price), 0);

  const handleCancel = async (id: string) => {
    try {
      await setStatus.mutateAsync({ id, status: 'cancelled' });
      toast({ title: 'Réservation annulée' });
    } catch (err) {
      toast({
        title: 'Annulation échouée',
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenReview = (booking: BookingWithCar) => {
    setReviewBooking(booking);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!reviewBooking) return;
    try {
      await createReview.mutateAsync({
        booking_id: reviewBooking.id,
        rating,
        comment: comment || undefined,
      });
      toast({ title: 'Avis envoyé !', description: 'Merci pour votre retour.' });
      setReviewModalOpen(false);
    } catch (err) {
      toast({
        title: 'Échec de l\'avis',
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
        variant: 'destructive',
      });
    }
  };

  const BookingCard = ({ booking }: { booking: BookingWithCar }) => {
    const car = booking.car;
    const thumb = car?.images?.[0];
    const hasReview = reviewedBookingIds.has(booking.id);

    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-48 h-36 sm:h-auto bg-muted flex-shrink-0 cursor-pointer" onClick={() => navigate(`/cars/${booking.car_id}`)}>
            {thumb ? (
              <img src={thumb} alt="voiture" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Car className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <CardContent className="flex-1 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/cars/${booking.car_id}`)}>
                  {car ? `${car.year} ${car.make} ${car.model}` : 'Voiture'}
                </h3>
                {car?.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" /> {car.address}
                  </p>
                )}
              </div>
              <Badge className={statusColor[booking.status] || ''}>
                {statusLabels[booking.status] || booking.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(booking.start_date), 'd MMM', { locale: fr })} – {format(new Date(booking.end_date), 'd MMM yyyy', { locale: fr })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {booking.total_days} jour{booking.total_days > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                {Number(booking.total_price).toFixed(2)} $
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {booking.status === 'pending' && (
                <Button variant="outline" size="sm" onClick={() => handleCancel(booking.id)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Annuler
                </Button>
              )}
              {booking.status === 'completed' && !hasReview && (
                <Button variant="outline" size="sm" onClick={() => handleOpenReview(booking)}>
                  <Star className="h-3.5 w-3.5 mr-1" /> Laisser un avis
                </Button>
              )}
              {booking.status === 'completed' && hasReview && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Avis donné
                </Badge>
              )}
            </div>
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
            Aucune réservation ici.{' '}
            <a href="/search" className="text-primary hover:underline">Parcourir les voitures</a>
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

  const reviewCarName = reviewBooking?.car
    ? `${reviewBooking.car.year} ${reviewBooking.car.make} ${reviewBooking.car.model}`
    : 'cette voiture';

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Mes trajets</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Trajets à venir', value: loading ? '—' : String(upcoming.length), icon: Clock },
            { title: 'Trajets terminés', value: loading ? '—' : String(past.length), icon: CheckCircle },
            { title: 'Total dépensé', value: loading ? '—' : `${totalSpent.toFixed(2)} $`, icon: DollarSign },
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
            <TabsTrigger value="upcoming">À venir ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Passés ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Annulés ({cancelled.length})</TabsTrigger>
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

      <ReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        carName={reviewCarName}
        onSubmit={handleSubmitReview}
      />
    </div>
  );
};

export default RenterDashboard;