import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, Clock, User, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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

const PLATFORM_FEE_RATE = 0;

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

const BookingModal = ({ open, onOpenChange, carName, dailyRate, onBook }: BookingModalProps) => {
  const [step, setStep] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [booking, setBooking] = useState(false);

  const totalDays = dateRange?.from && dateRange?.to ? Math.max(differenceInDays(dateRange.to, dateRange.from), 1) : 0;
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
    await onBook(dateRange, totalDays, platformFee, totalPrice, ownerPayout, { pickupTime, dropoffTime, fullName, phone, email, notes });
    setBooking(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1); setDateRange(undefined); setPickupTime('10:00'); setDropoffTime('10:00');
    setFullName(''); setPhone(''); setEmail(''); setNotes(''); setAgreeTerms(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[85vh]">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle>Réserver {carName}</DialogTitle>
            <DialogDescription>
              Étape {step} sur 3 — {step === 1 ? 'Sélection des dates' : step === 2 ? 'Coordonnées' : 'Vérification & confirmation'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 pt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors', step === s ? 'bg-primary text-primary-foreground' : step > s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                  {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
                </div>
                {s < 3 && <div className={cn('w-6 h-0.5', step > s ? 'bg-primary' : 'bg-muted')} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {step === 1 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span className="font-medium">{format(dateRange.from, 'd MMM', { locale: fr })} – {format(dateRange.to, 'd MMM yyyy', { locale: fr })}</span>
                  ) : (
                    <span className="font-medium">{format(dateRange.from, 'd MMM yyyy', { locale: fr })} — choisissez la date de retour</span>
                  )
                ) : (
                  <span className="text-muted-foreground">Sélectionnez les dates de prise en charge et de retour</span>
                )}
              </Label>
              <div className="border rounded-lg flex justify-center">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={1} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} className="pointer-events-auto p-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Prise en charge</Label>
                  <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Retour</Label>
                  <select value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {totalDays > 0 && (
                <div className="rounded-lg border p-3 bg-muted/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{dailyRate} $ × {totalDays} jour{totalDays > 1 ? 's' : ''}</span>
                    <span>{subtotal.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de plateforme</span>
                    <span>{platformFee.toFixed(2)} $</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{totalPrice.toFixed(2)} $</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><User className="h-4 w-4" /> Nom complet</Label>
                <Input placeholder="Entrez votre nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Numéro de téléphone</Label>
                <Input type="tel" placeholder="Entrez votre numéro" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Adresse email</Label>
                <Input type="email" placeholder="Entrez votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Demandes spéciales (optionnel)</Label>
                <Textarea placeholder="Demandes spéciales..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold text-sm">Résumé de la réservation</h4>
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  <span className="text-muted-foreground">Prise en charge :</span>
                  <span>{dateRange?.from && format(dateRange.from, 'd MMM yyyy', { locale: fr })} à {pickupTime}</span>
                  <span className="text-muted-foreground">Retour :</span>
                  <span>{dateRange?.to && format(dateRange.to, 'd MMM yyyy', { locale: fr })} à {dropoffTime}</span>
                  <span className="text-muted-foreground">Durée :</span>
                  <span>{totalDays} jour{totalDays > 1 ? 's' : ''}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  <span className="text-muted-foreground">Nom :</span>
                  <span>{fullName}</span>
                  <span className="text-muted-foreground">Téléphone :</span>
                  <span>{phone}</span>
                  <span className="text-muted-foreground">Email :</span>
                  <span className="truncate">{email}</span>
                </div>
                {notes && (<><Separator /><div className="text-sm"><span className="text-muted-foreground">Notes :</span><p className="mt-1">{notes}</p></div></>)}
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span>{subtotal.toFixed(2)} $</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Frais de plateforme</span><span>{platformFee.toFixed(2)} $</span></div>
                  <div className="flex justify-between font-semibold text-lg"><span>Total</span><span className="text-primary">{totalPrice.toFixed(2)} $</span></div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(c) => setAgreeTerms(c === true)} />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  J'accepte les conditions générales de location. Ma réservation est soumise à l'approbation de l'hôte.
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-background shrink-0">
          {step === 1 && (
            <Button className="w-full" disabled={!canProceedStep1} onClick={() => setStep(2)}>
              Continuer vers les coordonnées
            </Button>
          )}
          {step === 2 && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Retour</Button>
              <Button className="flex-1" disabled={!canProceedStep2} onClick={() => setStep(3)}>Vérifier la réservation</Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Retour</Button>
                <Button className="flex-1" disabled={!canSubmit || booking} onClick={handleSubmit}>
                  {booking ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Traitement...</> : 'Confirmer la réservation'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Vous ne serez pas facturé tant que l'hôte n'aura pas approuvé.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;