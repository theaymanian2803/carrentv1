import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Car, Shield, Star, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';

const CATEGORIES = [
  { name: 'SUV', icon: '🚙', count: 120 },
  { name: 'Sedan', icon: '🚗', count: 85 },
  { name: 'Luxury', icon: '✨', count: 42 },
  { name: 'Electric', icon: '⚡', count: 67 },
];

const FEATURES = [
  { icon: Shield, title: 'Verified Hosts', desc: 'Every host is KYC verified for your safety.' },
  { icon: Star, title: 'Trusted Reviews', desc: 'Real ratings from real renters.' },
  { icon: Zap, title: 'Instant Booking', desc: 'Book and drive in minutes, not hours.' },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-accent py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(160_84%_39%/0.15),transparent_60%)]" />
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-accent-foreground leading-tight">
              Find your perfect
              <span className="text-primary"> ride</span>,
              <br />anywhere.
            </h1>
            <p className="mt-6 text-lg text-accent-foreground/70 max-w-lg">
              Rent cars from trusted local hosts or earn by sharing yours. The peer-to-peer car sharing marketplace.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/search">
                <Button size="lg" className="gap-2 text-base">
                  Browse Cars <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="text-base border-accent-foreground/20 text-accent-foreground hover:bg-accent-foreground/10">
                  List Your Car
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 container">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link to={`/search?category=${cat.name}`} key={cat.name}>
              <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <span className="text-4xl">{cat.icon}</span>
                  <h3 className="mt-3 font-semibold text-lg group-hover:text-primary transition-colors">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground">{cat.count}+ cars</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Why DriveShare */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Why DriveShare?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-none shadow-none bg-transparent">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <f.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 container text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to hit the road?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Join thousands of drivers and hosts on the most trusted car sharing platform.
        </p>
        <Link to="/auth">
          <Button size="lg" className="gap-2 text-base">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-accent text-accent-foreground/60">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <Car className="h-5 w-5 text-primary" />
            <span className="font-bold">DriveShare</span>
          </div>
          <p className="text-sm">© 2026 DriveShare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
