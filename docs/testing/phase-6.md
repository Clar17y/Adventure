# Phase 6 Testing (Mining & Crafting)

Phase 6 adds mining (resource gathering) and weaponsmithing (crafting).

Prereqs (DB + migrations + seed + API) are the same as `docs/testing/phase-4.md`.

## What’s Covered

- Mining:
  - `POST /api/v1/gathering/mine`
- Crafting:
  - `GET /api/v1/crafting/recipes`
  - `POST /api/v1/crafting/craft`

Seed data includes:
- A starter `ResourceNode` in Forest Edge (`copper_ore`)
- A starter recipe to craft a Wooden Sword from Copper Ore

## Smoke Test (PowerShell)

```powershell
$base = "http://localhost:4000"

# Login and save token
$login = Invoke-RestMethod -Method Post "$base/api/v1/auth/login" -ContentType "application/json" -Body (
  @{ email = "test@example.com"; password = "password123" } | ConvertTo-Json
)
$token = $login.accessToken

# Mine at the seeded copper node (look it up by querying the DB via Prisma Studio, or reuse exploration discovery output).
# For quick local testing you can fetch the node id from Prisma Studio: npm run db:studio

# Example mine call (replace RESOURCE_NODE_ID):
$mine = Invoke-RestMethod -Method Post "$base/api/v1/gathering/mine" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (
  @{ resourceNodeId = "<RESOURCE_NODE_ID>"; turns = 300 } | ConvertTo-Json
)
$mine.results

# Inventory should now include Copper Ore
$inv = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "$base/api/v1/inventory"
$inv.items | Where-Object { $_.template.itemType -eq "resource" } | Select-Object id,quantity,@{n="name";e={$_.template.name}} | Format-Table -AutoSize

# List available recipes (weaponsmithing)
$recipes = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "$base/api/v1/crafting/recipes"
$recipes.recipes | Select-Object id,@{n="result";e={$_.resultTemplate.name}},turnCost,xpReward | Format-Table -AutoSize

# Craft the first recipe (Wooden Sword)
$recipeId = ($recipes.recipes | Select-Object -First 1).id
$craft = Invoke-RestMethod -Method Post "$base/api/v1/crafting/craft" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (
  @{ recipeId = $recipeId; quantity = 1 } | ConvertTo-Json
)
$craft.crafted
```

## Notes / Current MVP Limitations

- Mining currently expects a `resourceNodeId` directly (node “discovery enforcement” isn’t strict yet).
- Resource items are resolved by convention: `resourceType` matches `item_templates.name` snake_case (e.g. `copper_ore` ↔ `Copper Ore`).

