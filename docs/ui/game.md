# `/game` UI Status

The `/game` route is the “main game shell” (AppShell + BottomNav + sub-tabs) and is now partially wired to the real API.

## Wired To API (Real)

- Turns header: `GET /api/v1/turns` (refreshes periodically)
- Dashboard:
  - Skill tiles: `GET /api/v1/player/skills`
  - Current zone label: derived from `GET /api/v1/zones`
- Map:
  - Zone list: `GET /api/v1/zones` (uses “discovered” + hides unknown zones)
- Exploration:
  - Start exploration: `POST /api/v1/exploration/start`
  - Pending encounters are queued to the Combat tab
- Combat:
  - Fight pending encounter: `POST /api/v1/combat/start`
  - Shows last combat log + refreshes inventory/equipment/skills after combat
- Inventory:
  - List items: `GET /api/v1/inventory`
  - Drop item: `DELETE /api/v1/inventory/:id`
  - Repair item: `POST /api/v1/inventory/repair`
- Equipment:
  - Equipped slots: `GET /api/v1/player/equipment`
- Gathering:
  - Nodes list: `GET /api/v1/gathering/nodes`
  - Mine: `POST /api/v1/gathering/mine`
- Crafting:
  - Recipes: `GET /api/v1/crafting/recipes`
  - Craft: `POST /api/v1/crafting/craft`

## Still Mocked (Not Real Yet)

- Bestiary screen (until Phase 9 API exists)

## Assets Usage

- Item/equipment cards use the pixel art under `apps/web/public/assets/**` where possible.
- Zones use `apps/web/public/assets/zones/**` for discovered zones.

## Notes / Known Issues

- If Tailwind styles look “unstyled” (top-left layout), restart `npm run dev` after the PostCSS config change.
- If `next build` errors with EPERM on `.next/*`, stop any running Next dev processes and clear `apps/web/.next` before building again.
- If `npm run dev` spawns runaway `node.exe` processes (OOM), the API watcher was likely restarting on Next’s `.next/` writes. The API dev script excludes `apps/web/**` from watch to prevent this.
