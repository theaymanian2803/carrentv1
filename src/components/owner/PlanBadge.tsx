import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Crown, Zap } from 'lucide-react';

interface PlanBadgeProps {
  plan: 'free' | 'pro';
  listingCount: number;
  listingLimit: number;
  onUpgradeClick: () => void;
}

const PlanBadge = ({ plan, listingCount, listingLimit, onUpgradeClick }: PlanBadgeProps) => {
  const percentage = Math.min((listingCount / listingLimit) * 100, 100);
  const isAtLimit = listingCount >= listingLimit;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        {plan === 'pro' ? (
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <Crown className="h-3 w-3" /> Pro
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" /> Free
          </Badge>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">
            {listingCount}/{listingLimit} listings used
          </span>
          {isAtLimit && plan === 'free' && (
            <span className="text-destructive text-xs font-medium">Limit reached</span>
          )}
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {plan === 'free' && (
        <Button variant="outline" size="sm" onClick={onUpgradeClick} className="gap-1.5 shrink-0">
          <Crown className="h-3.5 w-3.5" /> Upgrade
        </Button>
      )}
    </div>
  );
};

export default PlanBadge;
