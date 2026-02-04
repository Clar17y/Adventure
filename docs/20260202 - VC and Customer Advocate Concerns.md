VC:
Solid, thorough doc. I’ll skip compliments — here are the real risks, the hard trade-offs you’re dodging, and what must be decided now if you want this to survive launch.

    Contradiction that breaks onboarding and trust
    You list 1/sec regen = 86,400/day, bank cap ~64,800 (18h), and “starting turns = full day's worth (~86,400).” Pick one. If new players get more than the bank cap you break the core UX promise and open immediate exploit vectors (create accounts, transfer, farm shared-turns). Fix now: starting turns must <= bank cap and your documentation/tests must enforce it.

    The “social spend” mechanic is economically fragile
    Giving 25% of purchased turns “to all players globally” + 30% to guild members is underspecified and dangerous. How is the 25% split? Equally per account, per active account, per MAU bucket? At low player counts that 25% is extremely expensive to subsidize; at high counts it’s essentially meaningless per-player. It also incentivizes throwaway accounts to collect freebies and can be gamed by sock puppets or bots. Mitigations: make the global share proportional to active user pool and capped per-recipient; require minimum account age/activity to receive; scale the global percentage down automatically as MAU increases; audit and limit newly created accounts from receiving shared-turns. Do not rely on a flat percent without dynamic scaling.

    Monetization math and unit economics are unclear
    If you publicly promise shared benefits, you’ve created a cost center that scales with volume and player counts. Before you finalize rates, run a simple model: expected MAU, ARPU, purchase frequency, average pack size, and the cost of every benefit you distribute (server effort, fraud, extra runs). Right now “25% global + 30% guild” is a headline that hides whether you’ll profit, break even, or run a loss on whales. Simulate worst-case (low MAU, high share) and show how share decays as MAU grows.

    New-player catch-up rule is exploitable
    “Caps don’t apply until you’re competitive with top players” sounds fair but is trivially abusable (multi-accounting, account boosting). Use a time-based newbie exemption (e.g., first 14–30 days full efficiency), or tie exemption to play-hours and non-transferable progression milestones, not relative percentiles of the top players. Percentile-based thresholds require robust anti-smurf measures and are painful to tune.

    Anti-abuse / botting assumptions are optimistic
    A 1/sec regen creates incentives for automation and mass account churn. Your anti-bot bullets (listing limits, trade gates) aren’t sufficient. Technical rules: calculate regen lazily (timestamp math) — don’t run per-second jobs — but also add strong heuristics for shared-turn receipt (rate limits), require captchas, device attestation on suspicious accounts, and flag accounts that suddenly receive disproportionate shared-turns.

    PvP and grief mechanics will affect retention
    Offline ghost attacks + snapshot loadouts + durability loss = frequent player frustration. The shield mechanic lets players “buy safety,” which is fine if priced defensibly; but watch for runaway “shield economy” where defending requires constant spend. Consider protecting a small portion of currency/items by default (no-pay safe stash) and require shield expenditure to protect additional layers. Keep PvP opt-in or soft until you have stable balancing.

    Loot boxes / Tavern Casino legal and platform risk
    Gold-only and published rates reduce gambling risk, but many jurisdictions and app stores still scrutinize randomized monetization. Apple/Google have specific rules around paid randomized rewards and items of value; EU/UK gambling law can interpret things differently. My recommendation: defer the casino until after launch and legal sign-off, or make it entirely cosmetic and non-advantageous.

    Durability + gear-sink balance is a retention trap
    Durability that decays on repair and gear consumed by NPCs is a powerful turn/material sink — and frustrates mid-core players. If the primary sink is “turns,” make sure repairs are affordable and predictable, and cap the rate of permanent loss. Consider a durable equipment tier for PvE and a consumable tier for raid/XP sinks.

    Technical scale and architecture notes (short)

    Don’t schedule per-second jobs; compute regen with last-timestamp arithmetic and only materialize when necessary.
    Purchased-turn distributions must be batched and rate-limited, with eligibility checks (account age/activity).
    Server-side combat is fine, but keep resolution deterministic and cheap per run; batch large raids off the main request path.
    Prepare to instrument everything for fraud signals from day one.

    MVP scope: measure the right things
    Your MVP removes guilds/monetization, which is good. But if you still let players buy turns in beta, the social-spend mechanics will be temptation to test early. Keep monetization fully out of the MVP and use small seeded accounts to simulate social rewards during balance tests.

Priority decisions you must lock now (no optional debate):

    Exact starting-turn amount and bank cap (remove contradiction).
    Precise formula for distributing purchased-turn shares (per-recipient cap, eligibility rules, how % scales with MAU).
    New-player exemption rules (time based vs percentile) and anti-abuse gating.
    Daily caps and the efficiency curve exponent n for every major activity — these are the levers that make the economy stable or explosive.
    Whether loot-box/casino is delayed until legal sign-off.

Minimum experiments to run before coding full systems:

    Small-scale economic simulation (10k/100k/1M MAU scenarios) of purchases with your proposed 25%/30% sharing to see short/medium-term ARPU and turn inflation.
    Fraud/sock-puppet model to size exploit losses from throwaway accounts collecting shared-turns.
    UX test of the exploration slider + log playback to confirm players understand diminishing returns and don’t feel cheated by RNG.

Three blunt asks for clarity (answer these now):

    How is the 25% “global” share split among players (equal per account, per-active, weighted by activity, capped per account)?
    Do starting turns equal the bank cap or the full daily regen? Pick a single policy.
    Target MAU and 12‑month revenue goal you’re aiming to support with the social-spend incentives (I need these to model unit economics).

You’ve designed a lot that’s defensible, but the social-spend mechanic and the cap/exemption rules are the two nukes that will wreck your economy or your trust metrics if left fuzzy. Fix those, simulate, then iterate. Nothing to add beyond that until you answer the three clarifying points.


Customer Advocate:
VC is right — two nukes here: the starting-turn vs bank-cap contradiction, and the social-spend mechanic. Those alone will break onboarding, create instant exploits, and ruin unit economics if not locked now.

Immediate decisions you must adopt today (concise, actionable defaults I expect you to enforce):

    Starting turns vs bank cap
    Set starting turns <= bank cap. My recommended default: starting turns = bank cap (64,800). Rationale: matches your “check in once/day” intent, prevents new accounts from instantly exceeding storage limits, and eliminates obvious transfer/farm vectors. Enforce in tests and account-creation code.

    Global + guild share formula (stop the flat-percent fantasy)
    Replace “flat 25% to all players” with a controlled distribution:

    Compute global_pool = floor(25% * purchased_turns) for bookkeeping only.
    Eligible recipients = accounts meeting minimum age (≥14 days) AND activity threshold (e.g., any activity in last 7 days). Ineligible accounts receive nothing.
    Distribute weighted by recent activity (minutes/turns used in last 7d), with a hard per-recipient cap (e.g., equivalent of $1–$5/day in turns).
    If MAU < threshold (pick for modeling), reduce global % upward for seeding; if MAU > scale_threshold, decay % toward a floor (e.g., 2–5%). Implement automatic scaling curve so cost per purchase falls with scale.
    Deliver global share to each recipient’s bank up to their per-day cap; surplus of pool is burned or credited to a sink (guild vault or event pool).
    For guild share, deliver to guild vault or guild-member queue (not directly to accounts) to prevent sock-puppet transfer. Cap per-member receipt and require account age/activity to withdraw.

    New-player exemption rule
    Use time-based + activity gating, not percentile:

    Full-efficiency exemption window = 14–30 days from account creation (tunable).
    Optionally require X play-hours or Y meaningful actions to qualify for exemption end.
    Do NOT use “% of top player” as trigger — it’s gameable and impossible to tune early.

Mandatory anti-abuse & implementation constraints (non-negotiable)

    Compute regen lazily with timestamp math; do NOT run per-second jobs.
    Batch purchased-turn distributions, rate-limit deliveries, and run eligibility checks server-side.
    Per-recipient caps and account-age checks must be enforced atomically server-side.
    Instrument fraud signals from day one: device attestation, captchas on suspicious flows, velocity spikes, abnormal shared-turn receipts, IP/device clustering.
    New accounts must be rate-limited for receiving shared-turns and trading until they pass gates.
    Require server-side logging of all shared-turn flows for retro audit and rollbacks.

Unit-econ guardrails before any real monetization

    Do not put purchases in MVP. Use seeded accounts to simulate social rewards during balance tests.
    Run at minimum three simulations: 10k/100k/1M MAU, with low/medium/high purchase frequency and average pack size, and a worst-case fraud scenario (sock-puppet farms). Track cost-per-purchase of social spend and impact on ARPU.
    Model per-purchase marginal cost (what % of pack is effectively subsidized by global/guild shares) and set an absolute per-recipient cap so a single purchase can never subsidize more than X recipients meaningfully.

Quick UX/retention fixes tied to these economics

    Make shared-turn receipts invisible publicly but auditable for support. Expose aggregated “community benefit” stats to buyers to show impact without exposing recipients.
    If shielding or protection is purchasable, guarantee a small free safe-stash for non-paying players to avoid perpetual spend-for-safety churn.
    Delay Tavern/Casino until legal sign-off and after basic economy is stable.

Minimum experiments to run before coding monetization (agree with VC, plus one)

    Economic sim at multiple MAU tiers with 25%/30% sharing.
    Fraud simulation for sock-puppet extraction.
    UX test on diminishing-returns visibility (do players understand and accept efficiency sliders).
    A pressure-test that simulates N purchases in short period and ensures per-recipient caps and rate-limits hold.

You must lock these now: starting-turn amount (<= bank cap), exact distribution rule for purchased-turn shares (eligibility + per-recipient cap + MAU-scaling), newbie exemption policy (time + play-hours), per-activity daily caps and the efficiency curve exponent, and whether casino is delayed for legal sign-off. Don’t ship monetization before these are implemented and the sims run.

I’ve flagged the real operational failures you’ll hit at launch. Implement the concrete defaults above, run the sims, and then iterate. Nothing to add.


Me:
noted on starting amount <= cap. it was to ensure that when you start the game you don't just start at 0 turns with nothing to do and immediately quit but it's aggressively high, it can be toned down. 

the 25% was for everyone... literally. in street warz the idea was 50% so you could really keep up with even the top spenders as long as you were online when they spent. the bonus of extra turns / spending became the opportunity cost you got from having the turns available to you the moment you buy them vs others not knowing when it would happen or be able to defend against it in time for you to steal their stuff

VC:
You can’t have “literally everyone” as the recipient and expect sane economics or fraud resistance. There are two different designs people confuse: (A) create a global pool equal to 25% of purchased turns and split that pool among eligible players, or (B) give every account 25% of the purchased turns. B is a non‑starter — cost explodes and it’s instantly gameable. Pick A and stop pretending otherwise.

If you want the StreetWarz timing advantage (buyers create immediate opportunity), preserve that feel by making the global pool small but concentrated on the people who are actually online/active when the buy happens. Concrete safe default I expect you to adopt today: compute global_pool = floor(25% * purchased_turns); restrict eligibility to accounts ≥14 days old and active in the last N minutes; choose either a capped set of recipients (top M active accounts) or distribute weighted by recent activity; enforce a hard per‑recipient cap (equivalent of $1–$5/day in turns). Deliver instantly to banks; burn or route any leftover pool to a guild/event sink.

Make guild share go to the guild vault/queue, not straight to member accounts, with per‑member withdrawal limits and age/activity gates so whales can’t subsidy-transfer to sock puppets.

Quick example to show scale: a 100k-turn pack -> global_pool = 25k turns. Split among 500 active recipients = 50 turns each (meaningful timing edge). Split among 100k recipients = 0.25 turns each (meaningless) — which is why you must concentrate eligibility on active users and cap per recipient.

Do the sims now with these knobs (pool %, N-minute activity window, M recipients, per‑recipient cap) before you finalize pricing. If you insist on a broad “everyone benefits” message for marketing, make it an aggregate stat (community turns distributed) not literal per‑account transfer. Lock these rules or the mechanic will bankrupt your monetization or create a fraud nightmare.


Customer Advocate:
I get why you liked “everyone literally” — it makes buying feel aggressive and rewards being online at the right moment. But from the market and product side it’s a non‑starter unless you’re fine burning cash, encouraging sock‑puppets, and wrecking trust when freebies show up on brand‑new accounts. StreetWarz worked because it shipped in a very different era and player base; you can’t copy the surface feel without copying their fraud cost and scale assumptions.

Do this instead: keep the aggressive timing advantage, but concentrate and gate the global share so it’s exploitable by players who are actually present and legitimate, not by throwaway accounts. Practical defaults I want you to lock today (tunable, but enforceable):

    Compute a global_pool = floor(pool_pct * purchased_turns). Do not broadcast per‑account grants.
    Start pool_pct conservatively in tests (10% for alpha, 25% only if sims show it’s safe).
    Eligibility: account_age >= 14 days AND active within the last N minutes (start N = 15).
    Selection: pick the top M active recipients (start M = min(500, active_count)) weighted by recent activity; enforce a hard per‑recipient cap (start = 500 turns/day or $1–$3 equivalent).
    Any leftover pool is burned or routed to a guild/event sink — do not auto‑spread it to low‑value recipients.
    Guild share goes to the guild vault/queue with withdrawal limits and the same age/activity gates; never direct‑credit every member.

If you want the same feel as StreetWarz without the systemic risk, offer a concentrated “opportunity window”: when a purchase happens, immediately select a small set of active players for a meaningful boost (the pool split across those winners) and show a transient UI event (“community opportunity occurred — you were eligible”). That preserves the rush/defensive timing effect without bankrupting the economy.

Operational & anti‑fraud constraints (non‑negotiable): compute regen lazily, batch distributions, atomic per‑recipient cap checks, device/IP clustering heuristics, captchas on suspicious flows, strict new‑account limits for receiving shared turns, and server‑side logging to allow rollbacks. Run sims across MAU scenarios before you raise pool_pct: measure cost per purchase, number of distinct recipients, sock‑puppet capture rate, and ARPU delta.

If you still prefer “everyone literally,” I’ll be blunt: run the worst‑case sim now (low MAU, high purchase frequency, high fraud) and accept the result — it will almost certainly force you to dial pool_pct to near zero or impose severe eligibility gates that break the marketing message. My strong recommendation: adopt the pooled/active‑recipient model, preserve the timing advantage via concentrated windows, and only expand “everyone benefits” to a marketing line that reports aggregate community turns distributed, not literal per‑account transfers.





