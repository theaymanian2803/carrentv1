import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Crown, Zap, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: 'free' | 'pro';
  listingCount: number;
  onUpgradeComplete?: () => void;
}

const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 0,
    limit: 3,
    features: ['Up to 3 car listings', 'Basic analytics', 'Standard support'],
    icon: Zap,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 12,
    limit: 15,
    features: ['Up to 15 car listings', 'Advanced analytics', 'Priority support', 'Featured listings', 'Custom pricing rules'],
    icon: Crown,
  },
];

const UpgradeModal = ({ open, onOpenChange, currentPlan, listingCount, onUpgradeComplete }: UpgradeModalProps) => {
  const [processing, setProcessing] = useState(false);

  // Handle return from PayPal approval
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionId = params.get('subscription_id');
    const subscriptionStatus = params.get('subscription');

    if (subscriptionId && subscriptionStatus === 'success') {
      activateSubscription(subscriptionId);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('subscription_id');
      url.searchParams.delete('subscription');
      url.searchParams.delete('ba_token');
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname);
    }
  }, []);

  const activateSubscription = async (subscriptionId: string) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ subscription_id: subscriptionId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Activation failed');

      toast({
        title: '🎉 Welcome to Pro!',
        description: 'You can now list up to 15 cars. Enjoy your upgraded plan!',
      });
      onUpgradeComplete?.();
    } catch (err: any) {
      console.error('Activation error:', err);
      toast({
        title: 'Activation issue',
        description: err.message || 'Please contact support if your payment went through.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const currentUrl = window.location.origin + '/owner';

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-paypal-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            return_url: `${currentUrl}?subscription=success`,
            cancel_url: `${currentUrl}?subscription=cancelled`,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create subscription');

      if (data.approval_url) {
        // Append subscription_id to return URL for activation
        const approvalUrl = new URL(data.approval_url);
        window.location.href = approvalUrl.toString();
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast({
        title: 'Upgrade failed',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            You're using {listingCount} of your listing slots. Upgrade to list more cars.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  isCurrent ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                }`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-2.5 left-4 text-xs">Current Plan</Badge>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <plan.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.price === 0 ? 'Free forever' : `$${plan.price}/month`}
                        </p>
                      </div>
                    </div>
                    {plan.id === 'pro' && !isCurrent && (
                      <Button onClick={handleUpgrade} disabled={processing} size="sm" className="gap-2">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                        {processing ? 'Processing...' : 'Upgrade'}
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by PayPal. Cancel anytime from your PayPal account.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
