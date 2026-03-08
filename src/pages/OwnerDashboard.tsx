import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import FleetGrid from '@/components/owner/FleetGrid';
import AddCarForm from '@/components/owner/AddCarForm';

const OwnerDashboard = () => {
  const [showAddCar, setShowAddCar] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">
          {showAddCar ? 'List a New Car' : 'Owner Dashboard'}
        </h1>

        {showAddCar ? (
          <AddCarForm />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { title: 'Monthly Earnings', value: '$0', icon: DollarSign },
                { title: 'Active Listings', value: '0', icon: Car },
                { title: 'Upcoming Bookings', value: '0', icon: Calendar },
                { title: 'Conversion Rate', value: '0%', icon: BarChart3 },
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
                <TabsTrigger value="fleet">Fleet Management</TabsTrigger>
                <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
                <TabsTrigger value="calendar">Calendar & Pricing</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
              </TabsList>
              <TabsContent value="fleet" className="mt-4">
                <FleetGrid onAddCar={() => setShowAddCar(true)} />
              </TabsContent>
              <TabsContent value="bookings" className="mt-4">
                <Card><CardContent className="p-8 text-center text-muted-foreground">Booking request board — coming soon.</CardContent></Card>
              </TabsContent>
              <TabsContent value="calendar" className="mt-4">
                <Card><CardContent className="p-8 text-center text-muted-foreground">Calendar & dynamic pricing — coming soon.</CardContent></Card>
              </TabsContent>
              <TabsContent value="payouts" className="mt-4">
                <Card><CardContent className="p-8 text-center text-muted-foreground">Stripe Connect payouts — coming soon.</CardContent></Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
