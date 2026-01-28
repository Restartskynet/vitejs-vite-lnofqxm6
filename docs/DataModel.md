# Data model

This document defines the canonical **domain** entities and their invariants.

The actual TypeScript types live in:
- `src/types/models.ts` (domain-facing shapes used widely)
- `src/engine/types.ts` (engine-internal extended shapes)

**Rule:** do not introduce competing “same concept” types in new files. If you need a new field, extend the canonical type.

---

## Fill

A **Fill** is the atomic execution record extracted from a broker export.

Minimal required fields (conceptual):
- `id` (stable and deterministic; ideally derived from symbol + timestamp + rowIndex + action)
- `symbol`
- `side` (`BUY` or `SELL`)
- `quantity` (positive number)
- `price` (positive number)
- `filledTime` (Date)
- `commission` (number, >= 0; may be 0)

Optional:
- `orderType`, `timeInForce`, broker metadata
- `stopPrice` / `triggerPrice` (only if present in source)

Invariants:
- quantity and price must be finite numbers
- if parsing fails: the row is skipped with diagnostics (never stored as a fill)

---

## Trade

A **Trade** is the reconstructed “flat-to-flat” lifecycle for a symbol + side, built from fills.

Core fields (conceptual):
- `id` (stable; derived from symbol + entry timestamp + sequence index)
- `symbol`
- `side`: `LONG` | `SHORT`
- `status`: `ACTIVE` | `CLOSED`
- `entryDate`, `entryPrice`
- `exitDate?`, `exitPrice?` (present iff status = CLOSED)
- `quantity` (total size closed; for ACTIVE trades this may represent current open size depending on implementation)
- `entryFills[]`, `exitFills[]`
- `realizedPnL`, `unrealizedPnL`, `totalPnL`
- `pnlPercent`
- `commission` (sum of commissions for included fills)

Optional (but supported in code):
- `stopPrice` (nullable; never fabricated)
- risk snapshot fields (equity/risk dollars at entry) for Restart strategy

Invariants:
- `entryPrice` and `entryDate` must exist
- CLOSED trades must have `exitDate` and `exitPrice`
- P&L sign must follow LONG/SHORT formulas
- If a position scales in/out:
  - entryPrice/exitPrice must be weighted averages of corresponding fills
  - partial exits must be represented consistently (see reconstruction spec)

---

## Strategy & risk state (Restart Throttle)

The Restart strategy produces a **risk state** timeline:
- mode: `LOW` or `HIGH`
- progress counters for switching modes
- equity used for sizing

The risk engine should be:
- deterministic
- driven by closed trade outcomes (wins/losses)
- independent from UI and formatting

---

## ImportRun / ImportHistory

A single import produces:
- `ImportRun` metadata:
  - id, filename, importedAt
  - row counts, fill counts, trade counts
  - warnings/skips summary
- Optional diagnostics blob (stored or downloadable):
  - skipped rows: rowIndex + reasonCode + preview
  - normalized rows summary counts

Invariants:
- importing the same file twice can either:
  - create a new run but de-dupe fills/trades (preferred), or
  - store as separate runs but must not double-count in derived views
Choose one approach and enforce it consistently.

---

## Settings

Settings are persisted and versioned.
They should include:
- starting equity (if used)
- strategy config (Restart Throttle params if editable)
- display preferences (optional)

Invariants:
- settings must be backward compatible with schema migrations
- unknown fields should be ignored safely (forward compatibility)

---

## Adjustments (if enabled)

Adjustments represent deposits/withdrawals/fees/corrections.

Invariants:
- stored amounts must be signed correctly (deposit positive; withdrawal/fee negative)
- they affect **account equity** but not necessarily trade-only metrics

If adjustments exist, the equity model must clearly define:
- Trading equity: starting equity + trade P&L only
- Account equity: trading equity + adjustments

---

## Schema versioning

Any exported backup/import format must include:
- `schemaVersion` (number)
- `exportedAt` ISO string

Migration rules:
- older versions must be migrated in-memory before persistence
- newer/unknown versions must fail safe with a clear error message

