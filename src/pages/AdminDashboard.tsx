import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Car, AlertTriangle, DollarSign, Plus } from 'lucide-react';
import ListingApprovalQueue from '@/components/admin/ListingApprovalQueue';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Total Revenue', value: '$0', icon: DollarSign, color: 'text-primary' },
            { title: 'Active Users', value: '0', icon: Users, color: 'text-blue-500' },
            { title: 'Total Bookings', value: '0', icon: Car, color: 'text-amber-500' },
            { title: 'Open Disputes', value: '0', icon: AlertTriangle, color: 'text-destructive' },
          ].map((m) => (
            <Card key={m.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="listings">Listing Approvals</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
            <Card><CardContent className="p-8 text-center text-muted-foreground">User management table — coming soon.</CardContent></Card>
          </TabsContent>
          <TabsContent value="listings" className="mt-4">
            <ListingApprovalQueue />
          </TabsContent>
          <TabsContent value="disputes" className="mt-4">
            <Card><CardContent className="p-8 text-center text-muted-foreground">Dispute resolution panel — coming soon.</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
