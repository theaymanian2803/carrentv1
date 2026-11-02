import { parseJson, type Row } from "./serialize";

export type { Row };

export const BOOKING_SELECT = `
  SELECT b.*,
    c.make AS car_make, c.model AS car_model, c.year AS car_year,
    c.images AS car_images, c.address AS car_address, c.daily_rate AS car_daily_rate,
    p.full_name AS renter_full_name, p.avatar_url AS renter_avatar_url
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  LEFT JOIN profiles p ON p.user_id = b.renter_id
`;

export interface BookingMapOptions {
  /** Admin rows and the renter's own rows include contact details; owners never do. */
  includeContact?: boolean;
}

export const mapBooking = (row: Row, options: BookingMapOptions = {}) => {
  const result: Record<string, unknown> = {
    id: String(row.id),
    car_id: String(row.car_id),
    renter_id: String(row.renter_id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    total_days: Number(row.total_days),
    platform_fee: Number(row.platform_fee),
    owner_payout: Number(row.owner_payout),
    total_price: Number(row.total_price),
    status: String(row.status),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    car: {
      id: String(row.car_id),
      make: String(row.car_make),
      model: String(row.car_model),
      year: Number(row.car_year),
      images: parseJson<string[]>(row.car_images, []),
      address: String(row.car_address ?? ""),
      daily_rate: Number(row.car_daily_rate),
    },
    renter: {
      id: String(row.renter_id),
      full_name:
        row.renter_full_name === null || row.renter_full_name === undefined
          ? null
          : String(row.renter_full_name),
      avatar_url:
        row.renter_avatar_url === null || row.renter_avatar_url === undefined
          ? null
          : String(row.renter_avatar_url),
    },
  };

  if (options.includeContact) {
    const email =
      row.renter_email === null || row.renter_email === undefined ? null : String(row.renter_email);
    const phone =
      row.renter_phone === null || row.renter_phone === undefined ? null : String(row.renter_phone);
    result.renter_email = email;
    result.renter_phone = phone;
    result.renter_notes =
      row.renter_notes === null || row.renter_notes === undefined ? null : String(row.renter_notes);
    (result.renter as Record<string, unknown>).email = email;
    (result.renter as Record<string, unknown>).phone = phone;
  }

  return result;
};
