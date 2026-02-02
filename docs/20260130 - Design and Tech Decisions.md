# Async Adventure RPG – Design & Tech Decisions

## 1. Purpose of This Document

This document records *explicit design and technical decisions* for the Async Adventure RPG project.

Goals:

* Prevent design drift
* Make trade-offs explicit
* Enable future contributors to understand *why* decisions were made
* Act as a single source of truth for product, design, and engineering

Non-goals:

* This is not a marketing document
* This is not a pitch deck
* This is not final balancing documentation

---

## 2. High-Level Product Vision

### 2.1 Core Fantasy

A persistent, asynchronous adventure RPG where:

* Players build a character over time
* Actions are constrained by a global turn bank
* Progression is fair, but activity can be monetised
* PvP is asynchronous via ghost snapshots
* Guilds and social systems are first-class citizens

### 2.2 Design Pillars

1. **Turns buy opportunity, not power**
2. **Skill is expressed through preparation and decisions, not reaction speed**
3. **Paying increases breadth and efficiency, not ceilings**
4. **No mandatory resets**
5. **All outcomes are server-authoritative**

---

## 3. Turn System

### 3.1 Turn Types

#### Personal Turns

* Generated automatically over time
* Used for core progression
* Daily cap applies to power-affecting actions

#### Paid Turns

* Purchased via in-app purchases
* Can be used for any action
* Hard-limited by dynamic power ceilings

#### Global / World Turns

* Pooled resource used for:

  * Guild actions
  * Raids
  * World events
* Can be contributed to by players

### 3.2 Turn Design Rules

* Turns are **never spent per combat action**
* Turns start engagements, not individual decisions
* No action consumes turns without producing a result

---

## 4. Progression Model

### 4.1 Power vs Activity Separation

Power progression:

* Levels
* Core stats
* Gear tiers

Activity progression:

* Crafting attempts
* Loot volume
* Guild participation
* PvP frequency

Paid activity cannot raise power above defined ceilings.

### 4.2 Dynamic Power Ceilings

* Each core stat has a dynamic ceiling
* Ceiling defined as a percentage of the server’s high-percentile distribution
* Paid turns cannot push stats beyond this ceiling
* Free progression remains slow but uncapped

Rationale:

* Enables late-player catch-up
* Preserves long-term advantage for early adopters
* Prevents infinite pay-to-win scaling

---

## 5. Adventure System

### 5.1 Role of Adventure

Adventure is the **primary source of XP and levelling**.

All characters advance through Adventure.

### 5.2 Adventure Flow

1. Player spends turns to start an adventure run
2. Player selects pre-run decisions:

   * Loadout
   * Pet
   * Tactic profile
   * Risk posture
3. Server resolves a multi-phase encounter internally
4. Player may receive limited choice prompts during the run
5. Results are returned as a readable log

### 5.3 Skill Expression

Skill exists in:

* Build composition
* Risk management
* Knowledge of encounter pools
* Decision timing

Skill does **not** exist in:

* Click speed
* Being online at a specific time

---

## 6. PvP Design

### 6.1 PvP Model

* Asynchronous, ghost-based PvP only
* No live PvP
* All PvP uses the same resolution engine as PvE

### 6.2 PvP Modes

* Sparring: low risk, positive EV
* Ranked: rating-based, seasonal
* Wagers: opt-in, high risk, high reward

### 6.3 PvP Safeguards

* Defenders do not lose XP, levels, or gear
* Losses only affect renewable or staked resources
* PvP calculations use capped effective stats

---

## 7. Crafting and RNG

### 7.1 Crafting Philosophy

* Paid players get more rolls and better variance
* All players roll on the same outcome tables
* Maximum outcomes are shared by all players

### 7.2 Acceptable Paid Advantages

* Reduced minimum rolls
* Lower failure chance
* Faster optimisation

### 7.3 Unacceptable Paid Advantages

* Higher stat caps
* Exclusive affixes
* PvP probability manipulation

---

## 8. Guilds and Social Systems

### 8.1 Guild Role

Guilds are the primary sink for excess turns.

Guild activities:

* Upgrades
* Raids
* Research
* Shared projects

### 8.2 Social Monetisation

* Players may buy turns or boosts that benefit their guild
* Social spending is framed as contribution, not dominance

---

## 9. Monetisation

### 9.1 What Is Sold

* Turn packs (consumable)
* Optional subscriptions (future)
* Cosmetics and prestige items

### 9.2 What Is Never Sold

* Raw stats
* Power ceilings
* PvP win probability

---

## 10. Platform and Tech Stack

### 10.1 Client Strategy

* Web-first
* Single UI codebase
* Native wrappers for stores

### 10.2 Client Stack

* Next.js (TypeScript)
* PWA support
* Capacitor for iOS and Android

### 10.3 Backend Stack

* Node.js (TypeScript)
* PostgreSQL
* Redis
* Background job processor

### 10.4 Push Notifications

* APNs for iOS
* FCM for Android
* Web Push for PWA (best effort)

### 10.5 In-App Purchases

* Store-compliant IAP only
* RevenueCat for cross-platform entitlement management

---

## 11. Non-Negotiable Rules

* All combat resolution is server-side
* Clients submit intent only
* Paid actions cannot bypass fairness constraints
* Systems must degrade gracefully, not catastrophically

---

## 12. Open Questions

* Exact stat list and scaling curves
* Initial turn generation rates
* PvP reward tables
* Seasonal structure (if any)
* Long-term content cadence

---

This document is expected to evolve. Changes should be additive or explicitly versioned.
