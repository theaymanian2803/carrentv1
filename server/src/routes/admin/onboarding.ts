import type { Hono } from "hono";
import type { AppEnv } from "../../env";
import { db } from "../../db";

const now = (): string => new Date().toISOString();

const DEMO_CARS = [
  ["Tesla", "Model 3", 2023, "Electric", 89, "Montréal, QC", "Berline électrique élégante avec autopilot et grande autonomie.", { Autopilot: true, Bluetooth: true, GPS: true }, "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80"],
  ["BMW", "Série 3", 2022, "Sedan", 75, "Laval, QC", "Berline sportive allemande, confort et performance.", { Cuir: true, GPS: true, Bluetooth: true }, "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80"],
  ["Mercedes-Benz", "GLC", 2023, "SUV", 120, "Westmount, QC", "SUV luxueux avec intérieur premium et technologies avancées.", { Cuir: true, GPS: true, "4x4": true }, "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80"],
  ["Audi", "A5", 2023, "Luxury", 135, "Vieux-Montréal, QC", "Coupé élégant avec finitions haut de gamme.", { Cuir: true, GPS: true, "Toit ouvrant": true }, "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80"],
] as const;

export const adminOnboardingRoutes = (app: Hono<AppEnv>): void => {
  app.post("/demo-data", async (c) => {
    const d = db(c.env);
    const existing = await d.execute("SELECT COUNT(*) AS n FROM cars");
    if (Number(existing.rows[0].n) > 0) {
      return c.json({ seeded: false, reason: "cars already exist" });
    }

    const userId = c.get("userId");
    for (const [make, model, year, category, rate, address, description, features, image] of DEMO_CARS) {
      await d.execute({
        sql: `INSERT INTO cars (id, owner_id, make, model, year, category, daily_rate, address,
                description, features, images, is_active, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'live', ?, ?)`,
        args: [
          crypto.randomUUID(),
          userId,
          make,
          model,
          year,
          category,
          rate,
          address,
          description,
          JSON.stringify(features),
          JSON.stringify([image]),
          now(),
          now(),
        ],
      });
    }

    const sectionCount = await d.execute("SELECT COUNT(*) AS n FROM landing_sections");
    let sections = 0;
    if (Number(sectionCount.rows[0].n) === 0) {
      const rows = [
        {
          type: "hero",
          title: "L'automobile, à votre porte.",
          content: {
            eyebrow: "Location entre particuliers",
            heading_line1: "L'automobile,",
            heading_highlight: "à votre porte.",
            description:
              "Une sélection de véhicules confiés par leurs propriétaires. Réservation directe, tarifs transparents, couverture incluse.",
            cta_primary: "Explorer la flotte",
            cta_primary_link: "/search",
            cta_secondary: "Devenir hôte",
            cta_secondary_link: "/auth",
            image_url: "",
          },
          order: 0,
        },
        {
          type: "car_row",
          title: "Sélection du moment",
          content: { category: "all", limit: 6, subtitle: "Disponibles" },
          order: 1,
        },
        {
          type: "car_row",
          title: "SUVs",
          content: { category: "SUV", limit: 3, subtitle: "Pour la route" },
          order: 2,
        },
        {
          type: "car_row",
          title: "Luxe",
          content: { category: "Luxury", limit: 3, subtitle: "Prestige" },
          order: 3,
        },
      ];
      for (const section of rows) {
        await d.execute({
          sql: `INSERT INTO landing_sections (id, section_type, title, content, sort_order, is_visible, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          args: [
            crypto.randomUUID(),
            section.type,
            section.title,
            JSON.stringify(section.content),
            section.order,
            now(),
            now(),
          ],
        });
        sections++;
      }
    }

    return c.json({ seeded: true, cars: DEMO_CARS.length, sections });
  });
};
