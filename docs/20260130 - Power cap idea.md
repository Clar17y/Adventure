would probably need to allow people to spend above the cap to "catch up" if they start late, especially if we aren't resetting monthly. no harm in someone being able to buy more turns to play as long as they can't go like... stronger than 80% of the strongest person in a specific stat?
but paying players will obviously get some benefit.. like if we do crafting then they'll have a higher chance of rolling a good outcome. This is still somewhat acceptable to players?

Yes. You can allow catch-up spending without breaking fairness, but it only works if you are explicit about **what is capped** and **how the cap behaves**.

Here is a clean, workable model.

---

## Separate “activity” from “power”

You must hard-separate these two concepts.

* **Activity**: how much someone can play.
* **Power**: how strong their character can be.

Selling activity is fine.
Selling uncapped power is what breaks games.

---

## Power ceilings, not power equality

Do not try to keep everyone equal. That fails socially.

Instead, enforce **relative ceilings**.

Example rule:

> No character can exceed 80 percent of the current server 95th-percentile value in any core stat via paid turns.

Why this works:

* Early players still lead.
* Late players can catch up close enough to be competitive.
* Whales cannot pull infinitely ahead.
* The ceiling moves upward naturally as the server progresses.

Implementation detail:

* Recalculate the percentile daily or weekly.
* Paid progression hard-stops at the ceiling.
* Free daily progression ignores the paid ceiling but is slow.

This preserves long-term advantage for early adopters without making the game hostile to new players.

---

## Two progression lanes

### Lane 1: Capped power progression

* Stats.
* Core gear tiers.
* Skill unlocks.

Rules:

* Daily free turns can always be spent here.
* Paid turns can only be spent here until the dynamic ceiling is reached.
* After that, paid turns are blocked from power actions.

This makes buying turns feel useful but not abusive.

---

### Lane 2: Uncapped breadth progression

This is where paid turns shine.

Examples:

* Loot volume.
* Crafting attempts.
* Alchemy rerolls.
* Guild contributions.
* Raids.
* PvP wagers.
* Exploration chains.
* Cosmetic progression.
* Leaderboard participation.

There is no ceiling here, only diminishing returns.

---

## Catch-up mechanics that feel fair

Late players need acceleration, not exemption.

Use **boosted efficiency**, not higher caps.

Examples:

* Below 60 percent of server median power, all actions cost 20 percent fewer turns.
* Below 70 percent, XP and gold gains are multiplied.
* First 30 days get bonus personal turn generation.

These boosts turn off automatically as the player approaches the median.

This avoids manual resets and avoids punishing early players.

---

## Paid turns after hitting the power ceiling

Once a player hits the stat ceiling, paid turns are still valuable.

They convert into:

* Faster loot cycles.
* Better gear optimisation.
* Guild leverage.
* PvP volume.
* World event influence.
* Prestige currencies.
* Cosmetics and titles.

Critically:

* Gear optimisation increases **consistency**, not maximum power.
* This preserves skill expression and build identity.

---

## PvP integrity with ceilings

With capped power, PvP remains healthy.

Key rules:

* PvP matchmaking considers effective capped stats, not raw stored values.
* Ghost snapshots use capped values.
* Over-cap power only applies to PvE and social systems.

This prevents paid power leaking into competitive dominance.

---

## No monthly resets required

If you have:

* Dynamic power ceilings.
* Catch-up efficiency boosts.
* Seasonal ladders instead of wipes.

Then you do not need resets.

Resets are a crutch for broken economies. This design does not need them.

---

## Why this will not feel bad to players

* New players can become competitive quickly.
* Veterans always stay ahead.
* Paying players feel busy, not unfair.
* Guilds benefit from spenders without becoming dependent.
* PvP remains skill and build driven.

This is the same underlying logic used by successful long-running incremental and gacha-adjacent systems, but without hard paywalls or predatory spikes.

---

## One hard rule you should not break

Never allow paid turns to:

* Raise a stat ceiling.
* Unlock a stat tier early.
* Bypass percentile limits.
* Directly modify PvP combat formulas.

The moment you do, your economy collapses.

---

If you want, next we should lock:

* Exact stat list and what is ceiling-controlled.
* Turn costs per action.
* How percentile ceilings are computed.
* What happens when the server matures and growth slows.

That is the point where this goes from concept to buildable system.


but paying players will obviously get some benefit.. like if we do crafting then they'll have a higher chance of rolling a good outcome. This is still somewhat acceptable to players?

Yes. That level of advantage is generally acceptable to players **if and only if** it is framed and bounded correctly. The industry evidence is very clear on this.

The distinction that matters is **probability advantage vs outcome entitlement**.

---

## What players accept

Players broadly accept paying for:

1. **More attempts**

   * More crafting rolls.
   * More dungeon runs.
   * More rerolls.
   * More shots at variance.

2. **Better consistency**

   * Slightly narrower RNG ranges.
   * Reduced chance of catastrophic failure.
   * Higher floor, not higher ceiling.

3. **Time compression**

   * Reaching the same results sooner.
   * Skipping waiting, not skipping rules.

This is considered “pay for convenience” or “pay for efficiency”, and it is tolerated in incremental, gacha-lite, and async PvP games.

---

## What players do not accept

Players reject systems where paying:

* Unlocks exclusive best-in-slot outcomes.
* Raises hard caps.
* Guarantees success.
* Bypasses competitive limits.
* Produces PvP dominance that free players cannot realistically counter.

That is when sentiment flips to pay-to-win and retention collapses.

---

## Crafting specifically: what works

A **paid player having a higher chance of a good roll** is acceptable if these rules hold.

### Rule 1: Same outcome space

Paid and free players roll on the **same result table**.

* Paid players do not unlock “better” items.
* Paid players do not access hidden tiers.
* Paid players just reach the good outcomes faster.

This is critical.

---

### Rule 2: Paid advantage affects variance, not maxima

Good:

* Paid crafting rolls have:

  * Tighter stat ranges.
  * Fewer dead rolls.
  * Slight weighting toward higher rolls.

Bad:

* Paid crafting allows:

  * Higher stat caps.
  * Extra affixes.
  * Exclusive effects.

Example that players accept:

* Free roll: 60 to 120 stat range.
* Paid roll: 80 to 120 stat range.

Example that players reject:

* Free max: 120.
* Paid max: 150.

---

### Rule 3: Diminishing returns must be visible

Players tolerate advantage when they can see it flatten.

Example:

* First 10 paid rolls feel very impactful.
* Next 20 feel helpful.
* Beyond that, returns are marginal.

This reassures non-paying players that the gap is not infinite.

---

### Rule 4: PvP uses capped or normalised values

This matters a lot.

Even if a paying player crafts a “perfect” item:

* PvP calculations should use **effective stats**, capped by percentile ceilings.
* Excess quality translates into:

  * PvE speed.
  * Flexibility.
  * Build consistency.
  * Prestige or cosmetics.

This keeps PvP credible.

---

## Why this still feels fair psychologically

Players compare themselves to two reference points:

1. Can I compete without paying.
2. Do I understand why the other player is ahead.

If the answers are:

* Yes, eventually.
* Yes, they rolled more.

Then players accept the system.

If the answers are:

* No, never.
* No idea, it is locked.

They churn.

---

## This exact model already works elsewhere

This pattern is used successfully in:

* Idle and incremental RPGs.
* Gacha systems with pity mechanics.
* ARPG crafting economies.
* Async PvP mobile RPGs.

The common pattern is:

* Paid players optimise faster.
* Free players reach similar power later.
* Competitive modes are capped or normalised.

Sources:

* Game Developers Conference, “Designing Fair Free-to-Play Progression” talks, multiple years.
* Zubek, R. “Balancing Free-to-Play Games with Analytics”, GDC Vault.
* Fields, T and Cotton, B. “Social Game Design”, chapters on monetisation fairness.

---

## A simple, safe crafting model you can ship

* Crafting costs turns.
* Paid turns allow more crafts.
* All crafts roll on the same table.
* Paid crafts:

  * Reduce minimum roll by X percent.
  * Reduce failure chance.
* Hard stat caps enforced at PvP resolution.
* Perfect items give prestige, flexibility, and PvE speed, not raw PvP dominance.

This will be accepted by most players if communicated clearly.

---

## One final hard line

Never let players pay to **change probabilities in PvP combat itself**.

They can pay to prepare better.
They cannot pay to roll better once the fight starts.

Cross that line and trust evaporates quickly.


