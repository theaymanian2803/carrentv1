import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, MapPin, Calendar } from 'lucide-react';

const Search = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        {/* Search bar */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Location" className="pl-10" />
              </div>
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" placeholder="Start date" className="pl-10" />
              </div>
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" placeholder="End date" className="pl-10" />
              </div>
              <Button className="gap-2">
                <SearchIcon className="h-4 w-4" /> Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Car listing grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Cars</h2>
            <div className="text-center py-16 text-muted-foreground">
              No cars available yet. Check back soon!
            </div>
          </div>

          {/* Map placeholder */}
          <div className="hidden lg:block">
            <Card className="h-[600px] flex items-center justify-center bg-muted/50">
              <CardContent className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Map view — coming soon</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
