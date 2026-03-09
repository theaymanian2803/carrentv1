import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CalendarIcon, Loader2, Clock, User, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { DateRange } from 'react-day-picker';

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carName: string;
  dailyRate: number;
  onBook: (dateRange: DateRange, totalDays: number, platformFee: number, totalPrice: number, ownerPayout: number, bookingDetails: BookingDetails) => Promise<void>;
}

interface BookingDetails {
  pickupTime: string;
  dropoffTime: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}

const PLATFORM_FEE_RATE = 0.12;

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM'
];

const BookingModal = ({ open, onOpenChange, carName, dailyRate, onBook }: BookingModalProps) => {
  const [step, setStep] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickupTime, setPickupTime] = useState('10:00 AM');
  const [dropoffTime, setDropoffTime] = useState('10:00 AM');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [booking, setBooking] = useState(false);

  const totalDays = dateRange?.from && dateRange?.to
    ? Math.max(differenceInDays(dateRange.to, dateRange.from), 1)
    : 0;

  const subtotal = dailyRate * totalDays;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const totalPrice = subtotal + platformFee;
  const ownerPayout = subtotal - platformFee;

  const canProceedStep1 = dateRange?.from && dateRange?.to;
  const canProceedStep2 = fullName.trim() && phone.trim() && email.trim();
  const canSubmit = canProceedStep1 && canProceedStep2 && agreeTerms;

  const handleSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to || !canSubmit) return;
    setBooking(true);
    await onBook(dateRange, totalDays, platformFee, totalPrice, ownerPayout, {
      pickupTime,
      dropoffTime,
      fullName,
      phone,
      email,
      notes,
    });
    setBooking(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setDateRange(undefined);
    setPickupTime('10:00 AM');
    setDropoffTime('10:00 AM');
    setFullName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setAgreeTerms(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setCalendarOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {carName}</DialogTitle>
          <DialogDescription>
            Complete the booking form to request this vehicle.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : step > s
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn('w-8 h-0.5', step > s ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>

        <div className="py-4 space-y-4">
          {/* Step 1: Date & Time Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" /> Rental Period
                </Label>
                <div className="text-sm text-muted-foreground mb-1">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-foreground font-medium">
                        {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-foreground font-medium">
                        {format(dateRange.from, 'MMM d, yyyy')} – select return date
                      </span>
                    )
                  ) : (
                    'Select pickup & return dates'
                  )}
                </div>
                <div className="border rounded-lg p-2 flex justify-center">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="pointer-events-auto"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Pickup Time
                  </Label>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Return Time
                  </Label>
                  <Select value={dropoffTime} onValueChange={setDropoffTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {totalDays > 0 && (
                <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
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

              <Button
                className="w-full"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Continue to Contact Info
              </Button>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Full Name
                </Label>
                <Input
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone Number
                </Label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Special Requests (Optional)</Label>
                <Textarea
                  placeholder="Any special requests or notes for the owner..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" disabled={!canProceedStep2} onClick={() => setStep(3)}>
                  Review Booking
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold">Booking Summary</h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Pickup:</span>
                  <span>{dateRange?.from && format(dateRange.from, 'MMM d, yyyy')} at {pickupTime}</span>
                  
                  <span className="text-muted-foreground">Return:</span>
                  <span>{dateRange?.to && format(dateRange.to, 'MMM d, yyyy')} at {dropoffTime}</span>
                  
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{totalDays} day{totalDays > 1 ? 's' : ''}</span>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{fullName}</span>
                  
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{phone}</span>
                  
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate">{email}</span>
                </div>

                {notes && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="mt-1">{notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  I agree to the rental terms and conditions. I understand that my booking is subject to host approval.
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!canSubmit || booking}
                  onClick={handleSubmit}
                >
                  {booking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                You won't be charged until the host approves your request.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
