import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Clock, CheckCircle, XCircle } from 'lucide-react';

const RenterDashboard = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">My Trips</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Upcoming Trips', value: '0', icon: Clock },
            { title: 'Completed Trips', value: '0', icon: CheckCircle },
            { title: 'Total Spent', value: '$0', icon: Car },
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
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming trips yet. <a href="/search" className="text-primary hover:underline">Browse cars</a></CardContent></Card>
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <Card><CardContent className="p-8 text-center text-muted-foreground">No past trips.</CardContent></Card>
          </TabsContent>
          <TabsContent value="cancelled" className="mt-4">
            <Card><CardContent className="p-8 text-center text-muted-foreground">No cancelled trips.</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RenterDashboard;
