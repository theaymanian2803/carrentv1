import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Crown, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SubRow {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: string;
  current_period_end: string | null;
  paypal_subscription_id: string | null;
  profile: { full_name: string | null } | null;
}

const SubscriptionManager = () => {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, current_period_end, paypal_subscription_id, profiles:user_id(full_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast({ title: 'Error loading subscriptions', variant: 'destructive' });
    } else {
      const mapped = (data || []).map((s: any) => ({
        ...s,
        profile: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
      }));
      setSubs(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const handlePlanChange = async (subId: string, newPlan: 'free' | 'pro') => {
    setUpdating(subId);
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: newPlan,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: newPlan === 'pro'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      })
      .eq('id', subId);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Plan updated to ${newPlan}` });
      fetchSubs();
    }
    setUpdating(null);
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
