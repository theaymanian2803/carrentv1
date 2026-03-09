import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Users, Car, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  userSignups: Array<{ date: string; count: number }>;
  bookingsTrend: Array<{ date: string; count: number }>;
  userRoles: Array<{ role: string; count: number; color: string }>;
  engagementMetrics: {
    totalUsers: number;
    activeUsers: number;
    totalBookings: number;
    avgBookingsPerUser: number;
  };
}

const ActivityAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userSignups: [],
    bookingsTrend: [],
    userRoles: [],
    engagementMetrics: {
      totalUsers: 0,
      activeUsers: 0,
      totalBookings: 0,
      avgBookingsPerUser: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch user signups over time (last 30 days)
      const signupQuery = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch bookings trend (last 30 days)
      const bookingsQuery = await supabase
        .from('bookings')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch user roles distribution
      const rolesQuery = await supabase
        .from('user_roles')
        .select('role');

      // Fetch engagement metrics
      const totalUsersQuery = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      const totalBookingsQuery = await supabase
        .from('bookings')
        .select('id', { count: 'exact' });

      // Active users (users with bookings in last 30 days)
      const activeUsersQuery = await supabase
        .from('bookings')
        .select('renter_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Process signup data
      const signupData = signupQuery.data || [];
      const signupsByDate = signupData.reduce((acc: Record<string, number>, user) => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const userSignups = Object.entries(signupsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      // Process bookings data
      const bookingData = bookingsQuery.data || [];
      const bookingsByDate = bookingData.reduce((acc: Record<string, number>, booking) => {
        const date = new Date(booking.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const bookingsTrend = Object.entries(bookingsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      // Process roles data
      const rolesData = rolesQuery.data || [];
      const roleColors = { admin: 'hsl(var(--destructive))', owner: 'hsl(var(--primary))', renter: 'hsl(var(--secondary))' };
      const rolesCounts = rolesData.reduce((acc: Record<string, number>, role) => {
        acc[role.role] = (acc[role.role] || 0) + 1;
        return acc;
      }, {});

      const userRoles = Object.entries(rolesCounts).map(([role, count]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        count,
        color: roleColors[role as keyof typeof roleColors] || 'hsl(var(--muted))'
      }));

      // Calculate engagement metrics
      const totalUsers = totalUsersQuery.count || 0;
      const totalBookings = totalBookingsQuery.count || 0;
      const uniqueActiveUsers = new Set(activeUsersQuery.data?.map(b => b.renter_id) || []).size;
      const avgBookingsPerUser = totalUsers > 0 ? Number((totalBookings / totalUsers).toFixed(2)) : 0;

      setAnalytics({
        userSignups,
        bookingsTrend,
        userRoles,
        engagementMetrics: {
          totalUsers,
          activeUsers: uniqueActiveUsers,
          totalBookings,
          avgBookingsPerUser
        }
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--primary))",
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users (30d)</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            <Car className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Bookings/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.avgBookingsPerUser}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Signups Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              User Signups (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={analytics.userSignups}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bookings Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Booking Trends (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={analytics.bookingsTrend}>
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Roles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Roles Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <PieChart>
                <Pie
                  data={analytics.userRoles}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, count, percent }) => `${role}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.userRoles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Engagement Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Engagement Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">User Engagement Rate</span>
                <span className="font-semibold">
                  {analytics.engagementMetrics.totalUsers > 0 
                    ? `${((analytics.engagementMetrics.activeUsers / analytics.engagementMetrics.totalUsers) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recent Signups (7 days)</span>
                <span className="font-semibold">
                  {analytics.userSignups.slice(-7).reduce((sum, day) => sum + day.count, 0)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recent Bookings (7 days)</span>
                <span className="font-semibold">
                  {analytics.bookingsTrend.slice(-7).reduce((sum, day) => sum + day.count, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityAnalytics;