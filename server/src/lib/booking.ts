export const PLATFORM_FEE_RATE = 0;

export interface BookingMoney {
  totalDays: number;
  totalPrice: number;
  platformFee: number;
  ownerPayout: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;

export function computeBooking(input: {
  dailyRate: number;
  startDate: string;
  endDate: string;
}): BookingMoney {
  const start = new Date(`${input.startDate}T00:00:00Z`).getTime();
  const end = new Date(`${input.endDate}T00:00:00Z`).getTime();
  const totalDays = Math.max(1, Math.ceil((end - start) / DAY_MS));
  const totalPrice = round2(input.dailyRate * totalDays);
  const platformFee = round2(totalPrice * PLATFORM_FEE_RATE);
  return {
    totalDays,
    totalPrice,
    platformFee,
    ownerPayout: round2(totalPrice - platformFee),
  };
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
