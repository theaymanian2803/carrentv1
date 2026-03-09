import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import BookingModal from '@/components/BookingModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  ChevronLeft, ChevronRight, MapPin, Star,
  Car as CarIcon, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import type { DateRange } from 'react-day-picker';

type CarRow = Tables<'cars'>;
type ProfileRow = Tables<'profiles'>;

const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [car, setCar] = useState<CarRow | null>(null);
  const [owner, setOwner] = useState<ProfileRow | null>(null);
  const [ownerRating, setOwnerRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    const fetchCar = async () => {
      if (!id) return;
      setLoading(true);

      const { data: carData, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !carData) {
        toast({ title: 'Car not found', variant: 'destructive' });
        navigate('/search');
        return;
      }

      setCar(carData);

      // Fetch owner profile + average rating in parallel
      const [profileRes, ratingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', carData.owner_id).single(),
        supabase.from('reviews').select('rating').eq('reviewee_id', carData.owner_id),
      ]);

      if (profileRes.data) setOwner(profileRes.data);
      if (ratingRes.data && ratingRes.data.length > 0) {
        const avg = ratingRes.data.reduce((s, r) => s + r.rating, 0) / ratingRes.data.length;
        setOwnerRating(Math.round(avg * 10) / 10);
      }

      setLoading(false);
    };

    fetchCar();
  }, [id]);

  const handleBook = async (
    dateRange: DateRange,
    totalDays: number,
    platformFee: number,
    totalPrice: number,
    ownerPayout: number
  ) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!car || !dateRange?.from || !dateRange?.to) return;

    const { error } = await supabase.from('bookings').insert({
      car_id: car.id,
      renter_id: user.id,
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
      total_days: totalDays,
      platform_fee: platformFee,
      owner_payout: ownerPayout,
      total_price: totalPrice,
    });

    if (error) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booking requested!', description: 'The host will review your request.' });
      setBookingModalOpen(false);
      navigate('/renter');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-8 max-w-5xl">
          <Skeleton className="h-[400px] rounded-xl mb-6" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!car) return null;

  const features = car.features && typeof car.features === 'object'
    ? Object.keys(car.features as Record<string, boolean>).filter(
        (k) => (car.features as Record<string, boolean>)[k]
      )
    : [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/search')}>
          <ChevronLeft className="h-4 w-4" /> Back to search
        </Button>

        {/* Image Carousel */}
        <div className="relative rounded-xl overflow-hidden bg-muted mb-6 aspect-[16/9] max-h-[450px]">
          {car.images && car.images.length > 0 ? (
            <>
              <img
                src={car.images[imageIndex]}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
              {car.images.length > 1 && (
                <>
                  <button
                    onClick={() => setImageIndex((i) => (i - 1 + car.images.length) % car.images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setImageIndex((i) => (i + 1) % car.images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {car.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImageIndex(i)}
                        className={cn(
                          'h-2 rounded-full transition-all',
                          i === imageIndex ? 'w-6 bg-primary' : 'w-2 bg-background/60'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <CarIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {car.year} {car.make} {car.model}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                    <Badge variant="secondary">{car.category}</Badge>
                    <span className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3.5 w-3.5" /> {car.address}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl font-bold text-primary">${car.daily_rate}</span>
                  <span className="text-muted-foreground">/day</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            {car.description && (
              <div>
                <h2 className="font-semibold text-lg mb-2">About this car</h2>
                <p className="text-muted-foreground leading-relaxed">{car.description}</p>
              </div>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3">Features</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Host profile */}
            <div>
              <h2 className="font-semibold text-lg mb-3">Your Host</h2>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {owner?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium">{owner?.full_name || 'Host'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {ownerRating !== null ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {ownerRating}
                      </span>
                    ) : (
                      <span>New host</span>
                    )}
                    {owner?.kyc_status === 'verified' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Booking card */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Book this car</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary">${car.daily_rate}</div>
                  <div className="text-muted-foreground">/day</div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    if (!user) {
                      navigate('/auth');
                    } else {
                      setBookingModalOpen(true);
                    }
                  }}
                >
                  {!user ? 'Sign in to book' : 'Request to Book'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  You won't be charged until the host approves.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        carName={`${car.year} ${car.make} ${car.model}`}
        dailyRate={car.daily_rate}
        onBook={handleBook}
      />
    </div>
  );
};

export default CarDetails;
