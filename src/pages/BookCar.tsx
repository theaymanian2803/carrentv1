import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCar } from '@/hooks/queries/useCars';
import { useCreateBooking } from '@/hooks/queries/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import type { DateRange } from 'react-day-picker';

const PLATFORM_FEE_RATE = 0;
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

const STEPS = [
  { label: 'Dates', icon: CalendarIcon },
  { label: 'Détails', icon: User },
  { label: 'Confirmation', icon: CheckCircle2 },
];

const BookCar = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: car, isLoading: loading } = useCar(id);
  const createBooking = useCreateBooking();

  const [step, setStep] = useState(0);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from && !range?.to) {
      setDateRange({ from: range.from, to: range.from });
    } else {
      setDateRange(range);
    }
  };

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
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    if (!loading && !car) {
      toast({ title: 'Voiture introuvable', variant: 'destructive' });
      navigate('/search');
    }
  }, [loading, car, navigate]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (user?.email) setEmail(user.email);
  }, [profile, user]);

  const goNext = () => { setStep((s) => Math.min(s + 1, 2)); };
  const goBack = () => { setStep((s) => Math.max(s - 1, 0)); };

  const handleSubmit = async () => {
    if (!user || !car || !dateRange?.from || !dateRange?.to || !canSubmit) return;
    setSubmitting(true);

    try {
      await createBooking.mutateAsync({
        car_id: car.id,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        renter_phone: phone,
        renter_email: email,
        renter_notes: notes,
      });
      toast({ title: 'Réservation envoyée !', description: 'L\'hôte examinera votre demande sous peu.' });
      navigate('/renter');
    } catch (err) {
      toast({
        title: 'Échec de la réservation',
        description: err instanceof Error ? err.message : 'Réessayez plus tard.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl flex items-center justify-between h-16 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/cars/${id}`)} className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Retour à l'annonce
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Réservation sécurisée</span>
        </div>
      </div>

      <div className="container max-w-6xl py-8 px-4">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s.label} className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => { if (i < step) setStep(i); }}
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

            <div className="rounded-xl border border-border bg-card p-6">
              {/* ÉTAPE 0 : Dates */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Quand avez-vous besoin de la voiture ?</h2>
                    <p className="text-muted-foreground text-sm mt-1">Choisissez vos dates et horaires préférés.</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="font-medium">
                          {format(dateRange.from, 'd MMM', { locale: fr })} – {format(dateRange.to, 'd MMM yyyy', { locale: fr })}
                          <span className="text-muted-foreground ml-2">({totalDays} jour{totalDays > 1 ? 's' : ''})</span>
                        </span>
                      ) : (
                        <span className="text-primary font-medium">Choisissez la date de retour</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Sélectionnez les dates de prise en charge et de retour</span>
                    )}
                  </div>

                  <div className="border border-border rounded-xl flex justify-center bg-background p-2">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="p-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Heure de prise en charge
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
                        <Clock className="h-3 w-3" /> Heure de retour
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

              {/* ÉTAPE 1 : Coordonnées */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Vos coordonnées</h2>
                    <p className="text-muted-foreground text-sm mt-1">L'hôte a besoin de vos informations de contact.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-primary" /> Nom complet</Label>
                      <Input placeholder="ex. Jean Dupont" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /> Téléphone</Label>
                      <Input type="tel" placeholder="+33 6 12 34 56 78" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" /> Email</Label>
                      <Input type="email" placeholder="vous@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-muted-foreground" /> Notes <span className="text-muted-foreground">(optionnel)</span></Label>
                      <Textarea placeholder="Demandes spéciales pour l'hôte..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : Vérification et confirmation */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Vérifiez votre réservation</h2>
                    <p className="text-muted-foreground text-sm mt-1">Assurez-vous que tout est correct avant de confirmer.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Détails du trajet</h3>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-muted-foreground">Prise en charge</span>
                        <span className="text-right font-medium">{dateRange?.from && format(dateRange.from, 'd MMM yyyy', { locale: fr })} · {pickupTime}</span>
                        <span className="text-muted-foreground">Retour</span>
                        <span className="text-right font-medium">{dateRange?.to && format(dateRange.to, 'd MMM yyyy', { locale: fr })} · {dropoffTime}</span>
                        <span className="text-muted-foreground">Durée</span>
                        <span className="text-right font-medium">{totalDays} jour{totalDays > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-muted-foreground">Nom</span>
                        <span className="text-right font-medium">{fullName}</span>
                        <span className="text-muted-foreground">Téléphone</span>
                        <span className="text-right font-medium">{phone}</span>
                        <span className="text-muted-foreground">Email</span>
                        <span className="text-right font-medium truncate">{email}</span>
                      </div>
                      {notes && (
                        <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">{notes}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-background">
                      <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(c === true)} className="mt-0.5" />
                      <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                        J'accepte les <span className="text-foreground font-medium">conditions générales de location</span>. Ma réservation est soumise à l'approbation de l'hôte et je ne serai pas facturé avant confirmation.
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons de navigation */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button variant="outline" size="lg" onClick={goBack} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Retour
                </Button>
              )}
              <div className="flex-1" />
              {step === 0 && (
                <Button size="lg" disabled={!canStep0} onClick={goNext} className="gap-2 min-w-[180px]">
                  Continuer <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {step === 1 && (
                <Button size="lg" disabled={!canStep1} onClick={goNext} className="gap-2 min-w-[180px]">
                  Vérifier la réservation <ChevronRight className="h-4 w-4" />
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
                    <><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Confirmer la réservation</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* DROITE : Résumé */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">
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

                  {car.owner && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {car.owner.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{car.owner.full_name || 'Hôte'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {car.owner.review_count > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{' '}
                              {Math.round(car.owner.rating_avg * 10) / 10}
                            </span>
                          )}
                          {car.owner.kyc_status === 'verified' && (
                            <span className="flex items-center gap-0.5 text-primary">
                              <Shield className="h-3 w-3" /> Vérifié
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Détail du prix</h3>
                {totalDays > 0 ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{car.daily_rate} $ × {totalDays} jour{totalDays > 1 ? 's' : ''}</span>
                      <span>{subtotal.toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frais de service</span>
                      <span>{platformFee.toFixed(2)} $</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{totalPrice.toFixed(2)} $</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-primary">{car.daily_rate} $</p>
                    <p className="text-muted-foreground text-sm">/jour</p>
                    <p className="text-xs text-muted-foreground mt-2">Sélectionnez des dates pour voir le total</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Annulation gratuite jusqu'à 24h avant la prise en charge</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Aucun frais tant que l'hôte n'a pas confirmé</span>
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