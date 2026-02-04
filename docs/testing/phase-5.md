# Phase 5 Testing (Inventory, Equipment, Durability)

This phase adds inventory listing/destruction, equip/unequip, and durability (combat degradation + repair).

Prereqs (DB + migrations + seed + API) are the same as `docs/testing/phase-4.md`.

## What’s Covered

- Inventory:
  - `GET /api/v1/inventory`
  - `DELETE /api/v1/inventory/:id` (optional `?quantity=` for stacks)
  - `POST /api/v1/inventory/repair`
- Equipment:
  - `POST /api/v1/equipment/equip`
  - `POST /api/v1/equipment/unequip`
  - `GET /api/v1/player/equipment` returns all 11 slots (empty slots included)
- Durability:
  - Combat degrades equipped weapon/armor durability each encounter
  - Repair spends turns and reduces max durability

## Smoke Test (PowerShell)

```powershell
$base = "http://localhost:4000"

# Login and save token
$login = Invoke-RestMethod -Method Post "$base/api/v1/auth/login" -ContentType "application/json" -Body (
  @{ email = "test@example.com"; password = "password123" } | ConvertTo-Json
)
$token = $login.accessToken

$zones = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "$base/api/v1/zones"
$zoneId = ($zones.zones | Where-Object { $_.name -eq "Forest Edge" } | Select-Object -First 1).id

# Run combats until we get at least one loot drop
$combat = $null
for ($i=0; $i -lt 25; $i++) {
  $combat = Invoke-RestMethod -Method Post "$base/api/v1/combat/start" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (
    @{ zoneId = $zoneId; attackSkill = "melee" } | ConvertTo-Json
  )
  if ($combat.rewards.loot.Count -gt 0) { break }
}
$combat.rewards

# List inventory (note item id + template slot)
$inv = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "$base/api/v1/inventory"
$inv.items | Select-Object id,quantity,equippedSlot,@{n="name";e={$_.template.name}},@{n="slot";e={$_.template.slot}},currentDurability,maxDurability | Format-Table -AutoSize

# Equip the first weapon to main_hand (adjust item selection as needed)
$weapon = $inv.items | Where-Object { $_.template.itemType -eq "weapon" } | Select-Object -First 1
if ($weapon) {
  Invoke-RestMethod -Method Post "$base/api/v1/equipment/equip" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (
    @{ itemId = $weapon.id; slot = "main_hand" } | ConvertTo-Json
  )
}

# Verify equipment slots (should include empty slots)
$eq = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "$base/api/v1/player/equipment"
$eq.equipment | Select-Object slot,@{n="item";e={$_.item.template.name}},@{n="dur";e={$_.item.currentDurability}} | Format-Table -AutoSize

# Fight once more; combat response includes durabilityLost
$combat2 = Invoke-RestMethod -Method Post "$base/api/v1/combat/start" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (
  @{ zoneId = $zoneId; attackSkill = "melee" } | ConvertTo-Json
)
$combat2.rewards.durabilityLost

# Repair the equipped weapon (if any)
$inv2 = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "$base/api/v1/inventory"
$weapon2 = $inv2.items | Where-Object { $_.equippedSlot -eq "main_hand" } | Select-Object -First 1
if ($weapon2) {
  Invoke-RestMethod -Method Post "$base/api/v1/inventory/repair" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (
    @{ itemId = $weapon2.id } | ConvertTo-Json
  )
}
```

## Notes

- Repair consumes turns (`DURABILITY_CONSTANTS.REPAIR_TURN_COST`) and reduces `maxDurability` (bounded by `MIN_MAX_DURABILITY`).
- If durability reaches 0 from combat degradation, the item is destroyed and automatically unequipped.

