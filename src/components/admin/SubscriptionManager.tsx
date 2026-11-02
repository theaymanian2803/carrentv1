import { useState } from 'react';
import { useAdminSetSubscription, useAdminSubscriptions } from '@/hooks/queries/useAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Crown, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AdminSubscription } from '@/lib/data/types';

interface SubRow extends AdminSubscription {
  profile: { full_name: string | null } | null;
}

const SubscriptionManager = () => {
  const { data: adminSubs = [], isLoading: loading } = useAdminSubscriptions();
  const setSubscription = useAdminSetSubscription();
  const [updating, setUpdating] = useState<string | null>(null);

  const subs: SubRow[] = adminSubs.map((sub) => ({
    ...sub,
    profile: sub.full_name ? { full_name: sub.full_name } : null,
  }));

  const handlePlanChange = async (subId: string, newPlan: 'free' | 'pro') => {
    setUpdating(subId);
    try {
      await setSubscription.mutateAsync({
        id: subId,
        input: { plan: newPlan, status: 'active' },
      });
      toast({ title: `Plan updated to ${newPlan}` });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'default';
    if (s === 'past_due') return 'destructive';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No subscriptions found.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Period End</TableHead>
            <TableHead>PayPal ID</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-medium">
                {sub.profile?.full_name || sub.user_id.slice(0, 8) + '…'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {sub.plan === 'pro' ? (
                    <Crown className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="capitalize">{sub.plan}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusColor(sub.status)}>{sub.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {sub.current_period_end
                  ? new Date(sub.current_period_end).toLocaleDateString()
                  : '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {sub.paypal_subscription_id?.slice(0, 12) || '—'}
              </TableCell>
              <TableCell className="text-right">
                <Select
                  value={sub.plan}
                  onValueChange={(v) => handlePlanChange(sub.id, v as 'free' | 'pro')}
                  disabled={updating === sub.id}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SubscriptionManager;
