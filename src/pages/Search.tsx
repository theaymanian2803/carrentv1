import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCars } from '@/hooks/queries/useCars';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Search as SearchIcon, MapPin, Calendar, Car, DollarSign, Star } from 'lucide-react';
import type { CarFilters } from '@/lib/data/types';

const CATEGORIES = ['SUV', 'Sedan', 'Luxury', 'Electric'];
const CAT_LABELS: Record<string, string> = { SUV: 'SUV', Sedan: 'Berline', Luxury: 'Luxe', Electric: 'Électrique' };

const Search = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<CarFilters>({ maxPrice: 500 });
  const { data: allCars = [], isLoading: loading, refetch } = useCars(filters);
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );

  const cars = allCars.filter(
    (car) => selectedCategories.length === 0 || selectedCategories.includes(car.category)
  );

  const applyFilters = () => {
    setFilters({ maxPrice, q: location.trim() || undefined });
    void refetch();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        {/* Barre de recherche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par lieu..."
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button onClick={applyFilters} className="gap-2">
                <SearchIcon className="h-4 w-4" /> Rechercher
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filtres */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">Prix max : {maxPrice} $/jour</h3>
              <Slider
                value={[maxPrice]}
                onValueChange={(v) => setMaxPrice(v[0])}
                max={1000}
                min={10}
                step={10}
              />
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3">Catégorie</h3>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer">{CAT_LABELS[cat] || cat}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={applyFilters} variant="secondary" className="w-full">
              Appliquer les filtres
            </Button>
          </div>

          {/* Résultats */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {loading ? 'Recherche en cours...' : `${cars.length} voiture${cars.length !== 1 ? 's' : ''} trouvée${cars.length !== 1 ? 's' : ''}`}
              </h2>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <Skeleton className="h-40 rounded-t-lg" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : cars.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="font-semibold text-lg mb-2">Aucune voiture trouvée</h3>
                  <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou votre zone de recherche.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {cars.map((car) => (
                  <Link to={`/cars/${car.id}`} key={car.id}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group h-full">
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {car.images && car.images.length > 0 ? (
                          <img
                            src={car.images[0]}
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Car className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2" variant="secondary">
                          {CAT_LABELS[car.category] || car.category}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {car.year} {car.make} {car.model}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" /> {car.address || 'Lieu non défini'}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-primary text-lg">{car.daily_rate} $<span className="text-sm font-normal text-muted-foreground">/jour</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;