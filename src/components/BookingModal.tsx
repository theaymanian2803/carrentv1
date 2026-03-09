import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { DateRange } from 'react-day-picker';

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carName: string;
  dailyRate: number;
  onBook: (dateRange: DateRange, totalDays: number, platformFee: number, totalPrice: number, ownerPayout: number) => Promise<void>;
}

const PLATFORM_FEE_RATE = 0.12;

const BookingModal = ({ open, onOpenChange, carName, dailyRate, onBook }: BookingModalProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [booking, setBooking] = useState(false);

  const totalDays = dateRange?.from && dateRange?.to
    ? Math.max(differenceInDays(dateRange.to, dateRange.from), 1)
    : 0;

  const subtotal = dailyRate * totalDays;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const totalPrice = subtotal + platformFee;
  const ownerPayout = subtotal - platformFee;

  const handleSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setBooking(true);
    await onBook(dateRange, totalDays, platformFee, totalPrice, ownerPayout);
    setBooking(false);
    setDateRange(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book {carName}</DialogTitle>
          <DialogDescription>
            Select your rental dates to complete your booking request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select dates</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange?.from && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                    ) : (
                      format(dateRange.from, 'MMM d, yyyy')
                    )
                  ) : (
                    'Pick your dates'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cost Breakdown */}
          {totalDays > 0 && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ${dailyRate} × {totalDays} day{totalDays > 1 ? 's' : ''}
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (12%)</span>
                <span>${platformFee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          {!totalDays && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select your rental dates to see the total price
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            disabled={!totalDays || booking}
            onClick={handleSubmit}
          >
            {booking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...
              </>
            ) : (
              'Confirm Booking Request'
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You won't be charged until the host approves your request.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
