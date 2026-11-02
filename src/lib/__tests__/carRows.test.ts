import { describe, it, expect } from "vitest";
import { carRowFilters, carRowSubtitle, isCarRow } from "../carRows";
import type { LandingSection } from "@/lib/data/types";

const section = (content: Record<string, unknown>): LandingSection => ({
  id: "s1",
  section_type: "car_row",
  title: "SUVs",
  content,
  sort_order: 0,
  is_visible: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
});

describe("carRowFilters", () => {
  it("maps a category row to a filtered car query", () => {
    expect(carRowFilters(section({ category: "SUV", limit: 4 }))).toEqual({
      category: "SUV",
      limit: 4,
    });
  });

  it("treats 'all' as no category filter", () => {
    expect(carRowFilters(section({ category: "all", limit: 6 })).category).toBeUndefined();
  });

  it("clamps the limit between 1 and 12", () => {
    expect(carRowFilters(section({ limit: 0 })).limit).toBe(1);
    expect(carRowFilters(section({ limit: 99 })).limit).toBe(12);
  });

  it("falls back to three cars and the default subtitle", () => {
    const empty = section({});
    expect(carRowFilters(empty).limit).toBe(3);
    expect(carRowSubtitle(empty)).toBe("Disponibles");
  });

  it("detects car rows only", () => {
    expect(isCarRow(section({}))).toBe(true);
    expect(isCarRow({ ...section({}), section_type: "hero" })).toBe(false);
  });
});
