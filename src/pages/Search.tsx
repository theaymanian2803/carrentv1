import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Search as SearchIcon, MapPin, Calendar, Car, DollarSign, Star } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CarRow = Tables<'cars'>;

const CATEGORIES = ['SUV', 'Sedan', 'Luxury', 'Electric'];

const Search = () => {
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );

  const fetchCars = async () => {
    setLoading(true);
    let query = supabase
      .from('cars')
      .select('*')
      .eq('status', 'live')
      .eq('is_active', true)
      .lte('daily_rate', maxPrice)
      .order('created_at', { ascending: false });

    if (selectedCategories.length > 0) {
      query = query.in('category', selectedCategories);
    }
    if (location.trim()) {
      query = query.ilike('address', `%${location.trim()}%`);
    }

    const { data } = await query;
    setCars(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCars(); }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        {/* Search bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location..."
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button onClick={fetchCars} className="gap-2">
                <SearchIcon className="h-4 w-4" /> Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">Max Price: ${maxPrice}/day</h3>
              <Slider
                value={[maxPrice]}
                onValueChange={(v) => setMaxPrice(v[0])}
                max={1000}
                min={10}
                step={10}
              />
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3">Category</h3>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat}`}
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer">{cat}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={fetchCars} variant="secondary" className="w-full">
              Apply Filters
            </Button>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {loading ? 'Searching...' : `${cars.length} car${cars.length !== 1 ? 's' : ''} found`}
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
                  <h3 className="font-semibold text-lg mb-2">No cars found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search area.</p>
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
                          {car.category}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {car.year} {car.make} {car.model}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" /> {car.address || 'Location not set'}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-primary text-lg">${car.daily_rate}<span className="text-sm font-normal text-muted-foreground">/day</span></span>
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
