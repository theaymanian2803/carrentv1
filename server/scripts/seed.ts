import { loadDevVars } from "./dev-vars";
import { db } from "../src/db";
import { hashPassword } from "../src/password";
import type { Env } from "../src/env";

loadDevVars();

const env = {
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
} as Env;

if (!env.TURSO_DATABASE_URL) {
  console.error("TURSO_DATABASE_URL is required (server/.dev.vars or the environment).");
  process.exit(1);
}

const now = (): string => new Date().toISOString();
const d = db(env);

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const RENTER_ID = "00000000-0000-4000-8000-000000000002";

const demoUser = async (id: string, email: string, name: string, role: "owner" | "renter") => {
  const exists = await d.execute({ sql: "SELECT 1 FROM users WHERE id = ?", args: [id] });
  if (exists.rows.length) return;
  const hash = await hashPassword("demo1234");
  await d.batch([
    {
      sql: "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, email, hash, name, now()],
    },
    {
      sql: "INSERT INTO profiles (id, user_id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: [crypto.randomUUID(), id, name, now(), now()],
    },
    {
      sql: "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)",
      args: [crypto.randomUUID(), id, role],
    },
    {
      sql: "INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at) VALUES (?, ?, 'free', 'active', ?, ?)",
      args: [crypto.randomUUID(), id, now(), now()],
    },
  ]);
};

await demoUser(OWNER_ID, "owner@carshare.dev", "Demo Owner", "owner");
await demoUser(RENTER_ID, "renter@carshare.dev", "Demo Renter", "renter");

const cars = [
  ["Tesla", "Model 3", 2023, "Electric", 89, "Montréal, QC", "Berline électrique élégante avec autopilot et grande autonomie.", { Autopilot: true, Bluetooth: true, GPS: true, Climatisation: true }, "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80"],
  ["BMW", "Série 3", 2022, "Sedan", 75, "Laval, QC", "Berline sportive allemande, confort et performance.", { Cuir: true, GPS: true, Bluetooth: true, "Toit ouvrant": true }, "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80"],
  ["Mercedes-Benz", "GLC", 2023, "SUV", 120, "Westmount, QC", "SUV luxueux avec intérieur premium et technologies avancées.", { Cuir: true, GPS: true, "4x4": true, "Caméra recul": true }, "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80"],
  ["Toyota", "RAV4", 2022, "SUV", 65, "Longueuil, QC", "SUV fiable et économique, parfait pour la famille.", { Bluetooth: true, Climatisation: true, "Caméra recul": true }, "https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80"],
  ["Audi", "A5", 2023, "Luxury", 135, "Vieux-Montréal, QC", "Coupé élégant avec finitions haut de gamme.", { Cuir: true, GPS: true, "Toit ouvrant": true, "Sièges chauffants": true }, "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80"],
  ["Land Rover", "Range Rover Sport", 2022, "Luxury", 210, "Mont-Royal, QC", "SUV luxueux tout-terrain avec un intérieur exceptionnel.", { Cuir: true, GPS: true, "4x4": true, "Toit panoramique": true }, "https://images.unsplash.com/photo-1519245659620-e859806a8d3b?w=1200&q=80"],
  ["Porsche", "911 Carrera", 2021, "Luxury", 295, "Ville-Marie, QC", "Voiture de sport iconique, sensations garanties.", { Cuir: true, GPS: true, "Sport mode": true }, "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?w=1200&q=80"],
  ["Honda", "Civic", 2022, "Sedan", 55, "Brossard, QC", "Berline compacte fiable et économique en carburant.", { Bluetooth: true, Climatisation: true, "Caméra recul": true }, "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=1200&q=80"],
] as const;

for (const [make, model, year, category, rate, address, description, features, image] of cars) {
  const id = crypto.randomUUID();
  await d.execute({
    sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address, description, features, images, is_active, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'live', ?, ?)`,
    args: [id, OWNER_ID, make, model, year, category, rate, address, description, JSON.stringify(features), JSON.stringify([image]), now(), now()],
  });
}

const sections = [
  ["car_row", "Sélection du moment", { category: "all", limit: 6, subtitle: "Disponibles" }, 0],
  ["car_row", "SUVs", { category: "SUV", limit: 3, subtitle: "Pour la route" }, 1],
  ["car_row", "Luxe", { category: "Luxury", limit: 3, subtitle: "Prestige" }, 2],
] as const;

for (const [type, title, content, order] of sections) {
  await d.execute({
    sql: `INSERT INTO landing_sections (id, section_type, title, content, sort_order, is_visible, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [crypto.randomUUID(), type, title, JSON.stringify(content), order, now(), now()],
  });
}

console.log("Seeded demo owner/renter, 8 cars, and 3 landing sections.");
console.log("Demo login: owner@carshare.dev / demo1234, renter@carshare.dev / demo1234");
