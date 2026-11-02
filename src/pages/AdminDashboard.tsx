import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Car, AlertTriangle, DollarSign, Plus, LayoutDashboard, CreditCard, BarChart3, CalendarCheck } from 'lucide-react';
import ListingApprovalQueue from '@/components/admin/ListingApprovalQueue';
import AllListingsTable from '@/components/admin/AllListingsTable';
import SubscriptionManager from '@/components/admin/SubscriptionManager';
import UserManagement from '@/components/admin/UserManagement';
import ActivityAnalytics from '@/components/admin/ActivityAnalytics';
import { useAdminStats } from '@/hooks/queries/useAdmin';
import BookingManagement from '@/components/admin/BookingManagement';
import AdminLicenseCard from '@/components/admin/AdminLicenseCard';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats } = useAdminStats();
  const metrics = [
    { title: 'Revenu total', value: '0 $', icon: DollarSign, color: 'text-primary' },
    { title: 'Utilisateurs actifs', value: String(stats?.engagementMetrics.activeUsers ?? 0), icon: Users, color: 'text-blue-500' },
    { title: 'Total réservations', value: String(stats?.engagementMetrics.totalBookings ?? 0), icon: Car, color: 'text-amber-500' },
    { title: 'Litiges ouverts', value: '0', icon: AlertTriangle, color: 'text-destructive' },
  ];
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Tableau de bord admin</h1>
          <Button onClick={() => navigate('/admin/page-builder')} variant="outline" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Éditeur de page
          </Button>
        </div>

        <AdminLicenseCard />
        <OnboardingChecklist />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((m) => (
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

        <Tabs defaultValue="analytics">
          <TabsList>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="users">Gestion des utilisateurs</TabsTrigger>
            <TabsTrigger value="listings">Approbation des annonces</TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
            <TabsTrigger value="disputes">Litiges</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-4">
            <ActivityAnalytics />
          </TabsContent>
          <TabsContent value="bookings" className="mt-4">
            <BookingManagement />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UserManagement />
          </TabsContent>
          <TabsContent value="listings" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => navigate('/admin/add-car')} className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter une annonce
              </Button>
            </div>
            <ListingApprovalQueue />
            <h2 className="text-xl font-semibold mt-8 mb-4">Toutes les annonces</h2>
            <AllListingsTable />
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-4">
            <SubscriptionManager />
          </TabsContent>
          <TabsContent value="disputes" className="mt-4">
            <Card><CardContent className="p-8 text-center text-muted-foreground">Panel de résolution des litiges — bientôt disponible.</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;