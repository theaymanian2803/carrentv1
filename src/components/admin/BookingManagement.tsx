import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  CalendarIcon, CheckCircle2, XCircle, Clock, AlertTriangle, Car, User, Phone, Mail,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

type BookingRow = Tables<'bookings'>;
type BookingStatus = Database['public']['Enums']['booking_status'];

interface BookingWithDetails extends BookingRow {
  car?: { make: string; model: string; year: number; images: string[] } | null;
  renter?: { full_name: string | null; avatar_url: string | null } | null;
}

const STATUS_OPTIONS: BookingStatus[] = ['pending', 'approved', 'active', 'completed', 'cancelled', 'disputed'];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  active: { label: 'Active', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Car },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
  disputed: { label: 'Disputed', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
};

const BookingManagement = () => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<BookingWithDetails | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load bookings', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch car & renter details in parallel
    const enriched: BookingWithDetails[] = await Promise.all(
      (data || []).map(async (b) => {
        const [carRes, renterRes] = await Promise.all([
          supabase.from('cars').select('make, model, year, images').eq('id', b.car_id).single(),
          supabase.from('profiles').select('full_name, avatar_url').eq('id', b.renter_id).single(),
        ]);
        return { ...b, car: carRes.data, renter: renterRes.data };
      })
    );

    setBookings(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    setUpdating(bookingId);
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Booking ${newStatus}` });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      if (selected?.id === bookingId) {
        setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    }
    setUpdating(null);
  };

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const counts = STATUS_OPTIONS.reduce(
    (acc, s) => ({ ...acc, [s]: bookings.filter((b) => b.status === s).length }),
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_OPTIONS.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                filter === s ? 'ring-2 ring-primary' : ''
              } ${cfg.color}`}
            >
              <div className="flex items-center justify-between">
                <cfg.icon className="h-4 w-4" />
                <span className="text-xl font-bold">{counts[s] || 0}</span>
              </div>
              <p className="text-xs font-medium mt-1">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Bookings table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">
            {filter === 'all' ? 'All Bookings' : `${STATUS_CONFIG[filter as BookingStatus]?.label} Bookings`}
            <span className="text-muted-foreground font-normal ml-2">({filtered.length})</span>
          </CardTitle>
          {filter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
              Clear filter
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No bookings found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Renter</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const cfg = STATUS_CONFIG[b.status];
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(b)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {b.car?.images?.[0] ? (
                            <img src={b.car.images[0]} alt="" className="h-10 w-14 rounded-md object-cover" />
                          ) : (
                            <div className="h-10 w-14 rounded-md bg-muted flex items-center justify-center">
                              <Car className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm">
                            {b.car ? `${b.car.year} ${b.car.make} ${b.car.model}` : 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {b.renter?.full_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                          </div>
                          <span className="text-sm">{b.renter?.full_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(b.start_date), 'MMM d')} – {format(new Date(b.end_date), 'MMM d')}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">${Number(b.total_price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.color} border text-xs`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={b.status}
                          onValueChange={(val) => updateStatus(b.id, val as BookingStatus)}
                          disabled={updating === b.id}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STATUS_CONFIG[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {selected?.car ? `${selected.car.year} ${selected.car.make} ${selected.car.model}` : 'Booking'}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <Badge variant="outline" className={`${STATUS_CONFIG[selected.status].color} border`}>
                  {STATUS_CONFIG[selected.status].label}
                </Badge>
              </div>

              <Separator />

              {/* Trip */}
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Pickup</span>
                <span className="text-right font-medium">{format(new Date(selected.start_date), 'MMM d, yyyy')}</span>
                <span className="text-muted-foreground">Return</span>
                <span className="text-right font-medium">{format(new Date(selected.end_date), 'MMM d, yyyy')}</span>
                <span className="text-muted-foreground">Duration</span>
                <span className="text-right font-medium">{selected.total_days} day{selected.total_days > 1 ? 's' : ''}</span>
              </div>

              <Separator />

              {/* Financials */}
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Total Price</span>
                <span className="text-right font-bold text-primary">${Number(selected.total_price).toFixed(2)}</span>
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="text-right">${Number(selected.platform_fee).toFixed(2)}</span>
                <span className="text-muted-foreground">Owner Payout</span>
                <span className="text-right">${Number(selected.owner_payout).toFixed(2)}</span>
              </div>

              <Separator />

              {/* Renter */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {selected.renter?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selected.renter?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">Renter</p>
                  </div>
                </div>
                {(selected.renter_phone || selected.renter_email) && (
                  <div className="grid grid-cols-2 gap-y-2 text-sm pl-[52px]">
                    {selected.renter_phone && (
                      <>
                        <span className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                        <a href={`tel:${selected.renter_phone}`} className="text-right font-medium text-primary hover:underline">{selected.renter_phone}</a>
                      </>
                    )}
                    {selected.renter_email && (
                      <>
                        <span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                        <a href={`mailto:${selected.renter_email}`} className="text-right font-medium text-primary hover:underline truncate">{selected.renter_email}</a>
                      </>
                    )}
                  </div>
                )}
                {selected.renter_notes && (
                  <div className="pl-[52px]">
                    <p className="text-xs text-muted-foreground">Notes: {selected.renter_notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="flex gap-2">
                {selected.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => updateStatus(selected.id, 'approved')}
                      disabled={updating === selected.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1"
                      onClick={() => updateStatus(selected.id, 'cancelled')}
                      disabled={updating === selected.id}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </>
                )}
                {selected.status === 'approved' && (
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => updateStatus(selected.id, 'active')}
                    disabled={updating === selected.id}
                  >
                    <Car className="h-3.5 w-3.5" /> Mark Active
                  </Button>
                )}
                {selected.status === 'active' && (
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => updateStatus(selected.id, 'completed')}
                    disabled={updating === selected.id}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                  </Button>
                )}
                {selected.status === 'disputed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => updateStatus(selected.id, 'completed')}
                    disabled={updating === selected.id}
                  >
                    Resolve & Complete
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Created {format(new Date(selected.created_at), 'MMM d, yyyy · h:mm a')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;
