# Homepage car-row controls — addendum

Date: 2026-11-02
Status: implemented
Supersedes: the “homepage stays hardcoded” decision for the car-row area only

## Scope

The header and chrome stay fixed. The area between the category strip and the host CTA is
now driven by `landing_sections` rows of type `car_row`.

**Fixed, not editable**
- Navbar
- Hero
- Category strip
- Host CTA
- Footer

**Editable**
- Any number of car rows, ordered, each with a title, subtitle, category, and car count.
- Visibility toggle and delete.

## Section shape

```json
{
  "section_type": "car_row",
  "title": "SUVs",
  "content": { "category": "SUV", "limit": 3, "subtitle": "Pour la route" },
  "sort_order": 1,
  "is_visible": true
}
```

`category` is one of `all | SUV | Sedan | Luxury | Electric`. `limit` is clamped to 1–12.
A row with no matching live cars renders nothing.

## Homepage behaviour

`src/pages/Index.tsx` keeps the fixed Hero and category strip, then renders every visible
`car_row` in `sort_order`. If no car-row sections exist, it falls back to the original
“Sélection du moment” grid so existing installs do not lose their homepage.

## Admin behaviour

`/admin/page-builder` is now a focused screen:
- Shows a locked notice for the fixed header and chrome.
- Lists only `car_row` sections (legacy `hero`/`categories` rows are ignored).
- Add a row (title, category, count), edit title/subtitle/category/count, reorder, hide/show,
  and delete.

## Verification

- `src/lib/__tests__/carRows.test.ts` — category mapping, `all`, limit clamp, defaults.
- `scripts/smoke.ts` — admin creates a visible car row, the public endpoint returns it, hiding
  removes it from the public list, deleting removes it.
- API CRUD remains covered by `server/tests/admin-landing.test.ts`.
