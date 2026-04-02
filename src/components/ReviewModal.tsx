import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carName: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

const ReviewModal = ({ open, onOpenChange, carName, onSubmit }: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await onSubmit(rating, comment.trim());
    setSubmitting(false);
    setRating(0);
    setComment('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) { setRating(0); setHoveredRating(0); setComment(''); }
    onOpenChange(isOpen);
  };

  const displayRating = hoveredRating || rating;

  const ratingLabels: Record<number, string> = {
    1: 'Mauvais',
    2: 'Moyen',
    3: 'Bien',
    4: 'Très bien',
    5: 'Excellent',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notez votre expérience</DialogTitle>
          <DialogDescription>
            Comment s'est passé votre trajet avec la {carName} ?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="p-1 transition-transform hover:scale-110">
                  <Star className={cn('h-8 w-8 transition-colors', star <= displayRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <span className="text-sm font-medium text-muted-foreground">{ratingLabels[displayRating]}</span>
            )}
          </div>
          <div className="space-y-2">
            <Label>Commentaire (optionnel)</Label>
            <Textarea placeholder="Parlez-nous de votre expérience..." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={500} />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
          </div>
          <Button className="w-full" disabled={rating === 0 || submitting} onClick={handleSubmit}>
            {submitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Envoi en cours...</>) : 'Envoyer l\'avis'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;