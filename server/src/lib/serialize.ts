export type Row = Record<string, unknown>;

export const parseJson = <T>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

export const CAR_SELECT = `
  SELECT c.*,
    p.full_name AS owner_full_name,
    p.avatar_url AS owner_avatar_url,
    p.kyc_status AS owner_kyc_status,
    (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.reviewee_id = c.owner_id) AS owner_rating_avg,
    (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = c.owner_id) AS owner_review_count
  FROM cars c
  LEFT JOIN profiles p ON p.user_id = c.owner_id
`;

export const mapCar = (row: Row) => ({
  id: String(row.id),
  owner_id: String(row.owner_id),
  make: String(row.make),
  model: String(row.model),
  year: Number(row.year),
  category: String(row.category),
  daily_rate: Number(row.daily_rate),
  location_lat: row.location_lat === null ? null : Number(row.location_lat),
  location_lng: row.location_lng === null ? null : Number(row.location_lng),
  address: String(row.address ?? ""),
  description: row.description === null ? null : String(row.description),
  features: parseJson<Record<string, unknown>>(row.features, {}),
  images: parseJson<string[]>(row.images, []),
  is_active: Boolean(row.is_active),
  status: String(row.status),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
  owner: {
    id: String(row.owner_id),
    full_name: row.owner_full_name === null || row.owner_full_name === undefined ? null : String(row.owner_full_name),
    avatar_url:
      row.owner_avatar_url === null || row.owner_avatar_url === undefined
        ? null
        : String(row.owner_avatar_url),
    kyc_status:
      row.owner_kyc_status === null || row.owner_kyc_status === undefined
        ? null
        : String(row.owner_kyc_status),
    rating_avg: Number(row.owner_rating_avg ?? 0),
    review_count: Number(row.owner_review_count ?? 0),
  },
});

export const mapSection = (row: Row) => ({
  id: String(row.id),
  section_type: String(row.section_type),
  title: String(row.title ?? ""),
  content: parseJson<Record<string, unknown>>(row.content, {}),
  sort_order: Number(row.sort_order),
  is_visible: Boolean(row.is_visible),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});
