import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCar } from '@/hooks/queries/useCars';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft, ChevronRight, MapPin, Star,
  Car as CarIcon, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: car, isLoading: loading } = useCar(id);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!loading && !car) {
      toast({ title: 'Voiture introuvable', variant: 'destructive' });
      navigate('/search');
    }
  }, [loading, car, navigate]);

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
        <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/search')}>
          <ChevronLeft className="h-4 w-4" /> Retour à la recherche
        </Button>

        {/* Carrousel d'images */}
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
                  <span className="text-3xl font-bold text-primary">{car.daily_rate} $</span>
                  <span className="text-muted-foreground">/jour</span>
                </div>
              </div>
            </div>

            <Separator />

            {car.description && (
              <div>
                <h2 className="font-semibold text-lg mb-2">À propos de cette voiture</h2>
                <p className="text-muted-foreground leading-relaxed">{car.description}</p>
              </div>
            )}

            {features.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3">Équipements</h2>
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

            <div>
              <h2 className="font-semibold text-lg mb-3">Votre hôte</h2>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {car.owner.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium">{car.owner.full_name || 'Hôte'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {car.owner.review_count > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {Math.round(car.owner.rating_avg * 10) / 10}
                      </span>
                    ) : (
                      <span>Nouvel hôte</span>
                    )}
                    {car.owner.kyc_status === 'verified' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="h-3 w-3" /> Vérifié
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Réserver cette voiture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary">{car.daily_rate} $</div>
                  <div className="text-muted-foreground">/jour</div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    if (!user) {
                      navigate('/auth');
                    } else {
                      navigate(`/book/${car.id}`);
                    }
                  }}
                >
                  {!user ? 'Connectez-vous pour réserver' : 'Demander à réserver'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Vous ne serez pas facturé tant que l'hôte n'aura pas approuvé.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetails;