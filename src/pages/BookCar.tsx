import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon, Clock, ChevronLeft, ChevronRight, User, Phone, Mail,
  MessageSquare, CheckCircle2, Loader2, Car as CarIcon, Shield, MapPin, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';
import type { DateRange } from 'react-day-picker';

type CarRow = Tables<'cars'>;
type ProfileRow = Tables<'profiles'>;

const PLATFORM_FEE_RATE = 0.12;
const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
];

const STEPS = [
  { label: 'Dates', icon: CalendarIcon },
  { label: 'Details', icon: User },
  { label: 'Confirm', icon: CheckCircle2 },
];

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const BookCar = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [car, setCar] = useState<CarRow | null>(null);
  const [owner, setOwner] = useState<ProfileRow | null>(null);
  const [ownerRating, setOwnerRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pickupTime, setPickupTime] = useState('10:00 AM');
  const [dropoffTime, setDropoffTime] = useState('10:00 AM');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Calculations
  const totalDays = dateRange?.from && dateRange?.to
    ? Math.max(differenceInDays(dateRange.to, dateRange.from), 1)
    : 0;
  const subtotal = (car?.daily_rate ?? 0) * totalDays;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const totalPrice = subtotal + platformFee;
  const ownerPayout = subtotal - platformFee;

  const canStep0 = !!(dateRange?.from && dateRange?.to);
  const canStep1 = fullName.trim().length > 0 && phone.trim().length > 0 && email.trim().length > 0;
  const canSubmit = canStep0 && canStep1 && agreeTerms;

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!id) return;

    const load = async () => {
      setLoading(true);
      const { data: carData, error } = await supabase
        .from('cars').select('*').eq('id', id).single();

      if (error || !carData) {
        toast({ title: 'Car not found', variant: 'destructive' });
        navigate('/search');
        return;
      }
      setCar(carData);

      const [profileRes, ratingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', carData.owner_id).single(),
        supabase.from('reviews').select('rating').eq('reviewee_id', carData.owner_id),
      ]);

      if (profileRes.data) setOwner(profileRes.data);
      if (ratingRes.data && ratingRes.data.length > 0) {
        const avg = ratingRes.data.reduce((s, r) => s + r.rating, 0) / ratingRes.data.length;
        setOwnerRating(Math.round(avg * 10) / 10);
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, 2)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    if (!user || !car || !dateRange?.from || !dateRange?.to || !canSubmit) return;
    setSubmitting(true);

    const { error } = await supabase.from('bookings').insert({
      car_id: car.id,
      renter_id: user.id,
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
      total_days: totalDays,
      platform_fee: platformFee,
      owner_payout: ownerPayout,
      total_price: totalPrice,
    });

    if (error) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booking requested!', description: 'The host will review your request shortly.' });
      navigate('/renter');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-lg px-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!car) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl flex items-center justify-between h-16 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/cars/${id}`)} className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to listing
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Secure Booking</span>
        </div>
      </div>

      <div className="container max-w-6xl py-8 px-4">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* LEFT: Wizard */}
          <div className="lg:col-span-3 space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s.label} className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => {
                      if (i < step) { setDirection(-1); setStep(i); }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full',
                      step === i
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : step > i
                        ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                        : 'bg-muted text-muted-foreground'
                    )}
                    disabled={i > step}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                  {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mx-1" />}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 min-h-[420px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  {/* STEP 0: Dates */}
                  {step === 0 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold">When do you need the car?</h2>
                        <p className="text-muted-foreground text-sm mt-1">Pick your trip dates and preferred times.</p>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <span className="font-medium">
                              {format(dateRange.from, 'MMM d')} – {format(dateRange.to, 'MMM d, yyyy')}
                              <span className="text-muted-foreground ml-2">({totalDays} day{totalDays > 1 ? 's' : ''})</span>
                            </span>
                          ) : (
                            <span className="text-primary font-medium">Now pick your return date</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">Select pickup & return dates</span>
                        )}
                      </div>

                      <div className="border border-border rounded-xl overflow-hidden flex justify-center bg-background">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="pointer-events-auto p-3"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Pickup Time
                          </Label>
                          <select
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                          >
                            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Return Time
                          </Label>
                          <select
                            value={dropoffTime}
                            onChange={(e) => setDropoffTime(e.target.value)}
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                          >
                            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: Contact Details */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold">Your details</h2>
                        <p className="text-muted-foreground text-sm mt-1">The host needs your contact information.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                          <Input placeholder="e.g. John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /> Phone</Label>
                          <Input type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" /> Email</Label>
                          <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-muted-foreground" /> Notes <span className="text-muted-foreground">(optional)</span></Label>
                          <Textarea placeholder="Any special requests for the host..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Review & Confirm */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold">Review your booking</h2>
                        <p className="text-muted-foreground text-sm mt-1">Make sure everything looks good before confirming.</p>
                      </div>

                      <div className="space-y-4">
                        {/* Trip Summary */}
                        <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Trip Details</h3>
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-muted-foreground">Pickup</span>
                            <span className="text-right font-medium">{dateRange?.from && format(dateRange.from, 'MMM d, yyyy')} · {pickupTime}</span>
                            <span className="text-muted-foreground">Return</span>
                            <span className="text-right font-medium">{dateRange?.to && format(dateRange.to, 'MMM d, yyyy')} · {dropoffTime}</span>
                            <span className="text-muted-foreground">Duration</span>
                            <span className="text-right font-medium">{totalDays} day{totalDays > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Contact Summary */}
                        <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-muted-foreground">Name</span>
                            <span className="text-right font-medium">{fullName}</span>
                            <span className="text-muted-foreground">Phone</span>
                            <span className="text-right font-medium">{phone}</span>
                            <span className="text-muted-foreground">Email</span>
                            <span className="text-right font-medium truncate">{email}</span>
                          </div>
                          {notes && (
                            <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">{notes}</p>
                          )}
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-background">
                          <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(c === true)} className="mt-0.5" />
                          <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                            I agree to the <span className="text-foreground font-medium">rental terms and conditions</span>. My booking is subject to host approval and I won't be charged until confirmed.
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button variant="outline" size="lg" onClick={goBack} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <div className="flex-1" />
              {step === 0 && (
                <Button size="lg" disabled={!canStep0} onClick={goNext} className="gap-2 min-w-[180px]">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {step === 1 && (
                <Button size="lg" disabled={!canStep1} onClick={goNext} className="gap-2 min-w-[180px]">
                  Review Booking <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button
                  size="lg"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                  className="gap-2 min-w-[200px]"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Confirm Booking</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT: Booking summary sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
              {/* Car card */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {car.images && car.images.length > 0 ? (
                  <img src={car.images[0]} alt={`${car.make} ${car.model}`} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <CarIcon className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg">{car.year} {car.make} {car.model}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">{car.category}</Badge>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {car.address}</span>
                    </div>
                  </div>

                  {/* Host */}
                  {owner && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {owner.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{owner.full_name || 'Host'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {ownerRating !== null && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {ownerRating}
                            </span>
                          )}
                          {owner.kyc_status === 'verified' && (
                            <span className="flex items-center gap-0.5 text-primary">
                              <Shield className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Price Breakdown</h3>
                {totalDays > 0 ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">${car.daily_rate} × {totalDays} day{totalDays > 1 ? 's' : ''}</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service fee</span>
                      <span>${platformFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-primary">${car.daily_rate}</p>
                    <p className="text-muted-foreground text-sm">/day</p>
                    <p className="text-xs text-muted-foreground mt-2">Select dates to see total</p>
                  </div>
                )}
              </div>

              {/* Trust badges */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Free cancellation up to 24h before pickup</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>No charge until host confirms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCar;
