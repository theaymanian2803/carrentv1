const BASE = "http://127.0.0.1:8787/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function req(path: string, options: RequestOptions = {}): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const suffix = Date.now();
const ownerEmail = `smoke-owner-${suffix}@example.com`;
const renterEmail = `smoke-renter-${suffix}@example.com`;
const carBody = (n: number) => ({
  make: "Smoke",
  model: `Model ${n}`,
  year: 2024,
  category: "Sedan",
  daily_rate: 100,
  address: "Montréal, QC",
  description: "Smoke test car",
});

const step = (label: string) => console.log(`• ${label}`);

step("health");
assert((await req("/health")).status === 200, "health failed");

step("register owner and renter");
const ownerReg = await req("/auth/register", {
  method: "POST",
  body: { email: ownerEmail, password: "password123", fullName: "Smoke Owner", role: "owner" },
});
assert(ownerReg.status === 201, `owner register ${ownerReg.status}`);
const owner = ownerReg.body as { token: string; user: { id: string } };

const renterReg = await req("/auth/register", {
  method: "POST",
  body: { email: renterEmail, password: "password123", fullName: "Smoke Renter", role: "renter" },
});
assert(renterReg.status === 201, `renter register ${renterReg.status}`);
const renter = renterReg.body as { token: string; user: { id: string } };

step("owner creates 3 cars, 4th is blocked");
const carIds: string[] = [];
for (let i = 0; i < 3; i++) {
  const created = await req("/me/cars", { method: "POST", body: carBody(i), token: owner.token });
  assert(created.status === 201, `create car ${i} ${created.status}`);
  carIds.push((created.body as { id: string }).id);
}
const fourth = await req("/me/cars", { method: "POST", body: carBody(3), token: owner.token });
assert(fourth.status === 403, `4th car should be 403, got ${fourth.status}`);

step("admin logs in and approves car 1");
const adminLogin = await req("/auth/login", {
  method: "POST",
  body: { email: "admin@carshare.dev", password: "admin12345" },
});
assert(adminLogin.status === 200, `admin login ${adminLogin.status}`);
const admin = adminLogin.body as { token: string };
const approved = await req(`/admin/cars/${carIds[0]}/status`, {
  method: "PATCH",
  body: { status: "live" },
  token: admin.token,
});
assert(approved.status === 200, `approve ${approved.status}`);

step("public list shows only the live car; pending detail is hidden");
const publicCars = (await req("/cars")).body as Array<{ id: string }>;
assert(publicCars.some((car) => car.id === carIds[0]), "live car missing from public list");
assert((await req(`/cars/${carIds[1]}`)).status === 404, "pending car leaked to anonymous");

step("renter books, owner approves, admin completes");
const booking = await req("/me/bookings", {
  method: "POST",
  body: { car_id: carIds[0], start_date: "2027-01-05", end_date: "2027-01-08" },
  token: renter.token,
});
assert(booking.status === 201, `booking ${booking.status}`);
const bookingId = (booking.body as { id: string }).id;

const ownerBookings = (await req("/me/bookings", { token: owner.token })).body as {
  asOwner: unknown[];
};
assert(ownerBookings.asOwner.length === 1, "owner did not see the booking");

assert(
  (await req(`/me/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: { status: "approved" },
    token: owner.token,
  })).status === 200,
  "owner approve failed"
);
assert(
  (await req(`/admin/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: { status: "completed" },
    token: admin.token,
  })).status === 200,
  "admin complete failed"
);

step("renter reviews the completed booking");
const review = await req("/me/reviews", {
  method: "POST",
  body: { booking_id: bookingId, rating: 5, comment: "Smoke test" },
  token: renter.token,
});
assert(review.status === 201, `review ${review.status}`);
const publicReviews = (await req(`/reviews?reviewee_id=${owner.user.id}`)).body as unknown[];
assert(publicReviews.length === 1, "public reviews missing");

step("admin upgrades the owner, 4th car now succeeds");
const subs = (await req("/admin/subscriptions", { token: admin.token })).body as Array<{
  id: string;
  user_id: string;
}>;
const ownerSub = subs.find((sub) => sub.user_id === owner.user.id);
assert(ownerSub, "owner subscription missing");
assert(
  (await req(`/admin/subscriptions/${ownerSub!.id}`, {
    method: "PATCH",
    body: { plan: "pro", status: "active" },
    token: admin.token,
  })).status === 200,
  "upgrade failed"
);
assert(
  (await req("/me/cars", { method: "POST", body: carBody(4), token: owner.token })).status === 201,
  "4th car should succeed on pro"
);

step("ownership is enforced");
assert(
  (await req(`/me/cars/${carIds[1]}`, {
    method: "PUT",
    body: { daily_rate: 1 },
    token: renter.token,
  })).status === 404,
  "renter modified another owner's car"
);

step("a guest can book a live car");
const guest = await req("/auth/guest", { method: "POST" });
assert(guest.status === 201, `guest session ${guest.status}`);
const guestBody = guest.body as { token: string; user: { isGuest: boolean } };
assert(guestBody.user.isGuest === true, "guest flag missing");
const guestBooking = await req("/me/bookings", {
  method: "POST",
  body: {
    car_id: carIds[0],
    start_date: "2027-05-01",
    end_date: "2027-05-03",
    renter_phone: "555-0199",
    renter_email: "guest@example.com",
  },
  token: guestBody.token,
});
assert(guestBooking.status === 201, `guest booking ${guestBooking.status}`);

console.log("SMOKE OK");
