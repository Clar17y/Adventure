Ok like I'm really digging this concept. I think we need to nail down the full set of things that a player can spend their turns on and what we use each thing for. 
Do we keep the "adventure" as the only way to level? And if we do, how do we manage the interactive part of the fight where the discord user was choosing what to do at specific moments? Do the turns simply get used to start an engagement and then we also allow the user to choose the actions after? A simple "You went on an adventure for 10 turns and gained X and Y stats and 10 xp " would take away any "skill based" part of it

You are right to focus on this now. This decision determines whether the game feels like a numbers toy or a game with mastery.

Short answer: keep Adventure as the primary way to level, but separate “decision-making” from “time passing”. Turns should buy opportunities, not replace play.

Below is a concrete, end-to-end model you can actually ship.

1. Full turn spend taxonomy

Every turn spend must fall into one of four buckets. This keeps the system legible and prevents design sprawl.

A. Progression turns (power, capped)

These affect character strength directly.

Adventure runs

Levelling XP

Core skill unlocks

Base gear acquisition

Rules:

Daily cap on how many turns can be spent here.

Paid turns can be used here only until the dynamic ceiling is reached.

This is where fairness is enforced.

B. Optimisation turns (variance, uncapped)

These improve quality and efficiency, not ceilings.

Crafting

Reforging

Enchanting

Pet training

Loadout experimentation

Rules:

Uncapped.

Paid turns shine here.

PvP effective stats remain capped.

C. Social and systemic turns (impact, uncapped)

These affect the world and other players.

Guild upgrades

Raids

PvP challenges

Wagers

World events

Territory influence

Rules:

Uncapped.

Best use of bought turns.

Drives retention and community.

D. Information and control turns (agency)

These improve decision quality.

Scouting enemies

Recon on raids

Unlocking combat logs

AI behaviour tuning

Respecs

Rules:

Cheap but meaningful.

Supports skill expression.

2. Should Adventure be the only way to level?

Yes, but not the only way to progress.

This is important.

XP and levels come primarily from Adventure.

Power comes from a combination of level, gear, and optimisation.

Social and PvP play feed materials, prestige, and efficiency, not raw XP.

This preserves a clear mental model:

If you want to get stronger, you go adventuring.

That clarity matters a lot.

3. The real problem you identified: interactivity

You are correct that:

“You went on an adventure for 10 turns and gained X”
kills skill expression.

The solution is front-loaded decisions plus optional mid-run intervention, not Discord-style live turns.

4. The correct Adventure interaction model
Step 1. Spend turns to start a run

Starting an adventure consumes turns.

Example:

Explore Forgotten Ruins

Cost: 8 turns

Duration: instant resolution, but multi-phase internally

Those turns buy you a run instance, not an outcome.

Step 2. Pre-run decisions (this is where skill lives)

Before the run resolves, the player chooses:

Loadout

Consumables

Pet

Tactics profile

Risk posture

Examples:

Aggressive vs Defensive

Focus single target vs cleave

Preserve resources vs burn early

These choices materially affect outcomes.

This is similar to auto-battlers and roguelite planning phases.

Step 3. Branching encounter resolution

Each adventure consists of hidden nodes:

Combat

Event

Choice

Ambush

Boss

The engine resolves them sequentially.

At certain nodes, the system pauses and offers a choice.

Example:

Push deeper for higher reward

Extract now with guaranteed gains

Burn a consumable to bypass danger

These choices do not cost extra turns. They cost opportunity and risk.

This preserves skill without creating timing pressure.

Step 4. Optional mid-run intervention

This is optional but powerful.

You allow limited intervention tokens per run.

Examples:

1 tactical override

1 reroll

1 retreat save

Free players get a small number.
Paid players might get convenience here, but never more than a hard cap.

This keeps runs tense and expressive.

5. Why turns should NOT be spent per combat action

Do not spend turns on “attack”, “defend”, “cast”.

Reasons:

It punishes engagement.

It favours players with more time, not more skill.

It breaks async play.

Turns should buy attempts, not inputs.

6. Skill expression without twitch gameplay

Skill lives in:

Build composition

Risk assessment

Resource timing

Knowledge of encounter pools

Meta awareness

Not in clicking fast or being online at the right time.

This fits async PvP perfectly.

7. PvP uses the same model

PvP should mirror Adventure exactly.

Spend turns to initiate challenge.

Pre-fight decisions matter.

No mid-fight spam.

Resolution is deterministic with controlled RNG.

Logs are reviewable.

If PvE and PvP share a resolution model, balance becomes tractable.

8. Why this works psychologically

Players feel:

They made meaningful choices.

Losses were understandable.

Wins were earned.

Time spent was respected.

Critically:

Paying gives more shots.

Skill determines how good those shots are.

That is the sweet spot.

9. Minimal MVP version of this

If you want to keep scope sane:

Adventure is a single-phase run with 1 to 2 decisions.

No mid-run pauses at first.

Just pre-run choices and outcome logs.

PvP mirrors Adventure exactly.

You can layer depth later.

10. The key design principle to lock in

Turns buy opportunities.
Skill determines outcomes.

If you hold that line, the system will scale, monetise, and stay fair.

Next step, if you want to go concrete:

Define the exact Adventure run structure.

Define how many decisions per run.

Define what choices actually modify in the math.

That is where this becomes real instead of conceptual.