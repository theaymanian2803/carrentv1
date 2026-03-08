import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionInfo {
  plan: 'free' | 'pro';
  status: string;
  listingCount: number;
  listingLimit: number;
  canListMore: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [status, setStatus] = useState('active');
  const [listingCount, setListingCount] = useState(0);
  const [listingLimit, setListingLimit] = useState(3);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [subRes, limitRes, countRes] = await Promise.all([
      supabase.from('subscriptions').select('plan, status').eq('user_id', user.id).maybeSingle(),
      supabase.rpc('get_listing_limit', { _user_id: user.id }),
      supabase.rpc('get_listing_count', { _user_id: user.id }),
    ]);

    if (subRes.data) {
      setPlan(subRes.data.plan as 'free' | 'pro');
      setStatus(subRes.data.status);
    }
    if (limitRes.data !== null) setListingLimit(limitRes.data as number);
    if (countRes.data !== null) setListingCount(countRes.data as number);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  return {
    plan,
    status,
    listingCount,
    listingLimit,
    canListMore: listingCount < listingLimit,
    loading,
    refetch: fetchData,
  };
};
