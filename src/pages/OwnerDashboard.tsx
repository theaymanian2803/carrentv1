import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import FleetGrid from '@/components/owner/FleetGrid';
import AddCarForm from '@/components/owner/AddCarForm';
import BookingRequestBoard from '@/components/owner/BookingRequestBoard';
import PlanBadge from '@/components/owner/PlanBadge';
import UpgradeModal from '@/components/owner/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';

const OwnerDashboard = () => {
  const [showAddCar, setShowAddCar] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const sub = useSubscription();

  const handleAddCar = () => {
    if (!sub.canListMore) {
      setUpgradeOpen(true);
      return;
    }
    setShowAddCar(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">
          {showAddCar ? 'Ajouter une nouvelle voiture' : 'Tableau de bord propriétaire'}
        </h1>

        {!showAddCar && !sub.loading && (
          <div className="mb-6">
            <PlanBadge
              plan={sub.plan}
              listingCount={sub.listingCount}
              listingLimit={sub.listingLimit}
              onUpgradeClick={() => setUpgradeOpen(true)}
            />
          </div>
        )}

        {showAddCar ? (
          <AddCarForm />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { title: 'Revenus mensuels', value: '0 $', icon: DollarSign },
                { title: 'Annonces actives', value: String(sub.listingCount), icon: Car },
                { title: 'Réservations à venir', value: '0', icon: Calendar },
                { title: 'Taux de conversion', value: '0%', icon: BarChart3 },
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

            <Tabs defaultValue="fleet">
              <TabsList>
                <TabsTrigger value="fleet">Gestion de flotte</TabsTrigger>
                <TabsTrigger value="bookings">Demandes de réservation</TabsTrigger>
                <TabsTrigger value="calendar">Calendrier & Tarifs</TabsTrigger>
                <TabsTrigger value="payouts">Paiements</TabsTrigger>
              </TabsList>
              <TabsContent value="fleet" className="mt-4">
                <FleetGrid onAddCar={handleAddCar} />
              </TabsContent>
              <TabsContent value="bookings" className="mt-4">
                <BookingRequestBoard />
              </TabsContent>
              <TabsContent value="calendar" className="mt-4">
                <Card><CardContent className="p-8 text-center text-muted-foreground">Calendrier & tarification dynamique — bientôt disponible.</CardContent></Card>
              </TabsContent>
              <TabsContent value="payouts" className="mt-4">
                <Card><CardContent className="p-8 text-center text-muted-foreground">Paiements PayPal — bientôt disponible.</CardContent></Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          currentPlan={sub.plan}
          listingCount={sub.listingCount}
          onUpgradeComplete={() => sub.refetch()}
        />
      </div>
    </div>
  );
};

export default OwnerDashboard;