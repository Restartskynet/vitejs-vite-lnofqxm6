# ImportReconstructionSpec — Fills → Trades (FIFO contract)

This spec defines how fills are paired into trades and how trade-level values are computed.

The aim is correctness, determinism, and explainability.

---

## Definitions

- **Fill**: atomic execution (BUY/SELL, qty, price, time)
- **Position**: current open quantity and average entry price for a symbol + side
- **Trade**: “flat-to-flat” lifecycle for a symbol and direction (LONG/SHORT)

The reconstruction engine consumes:
- `Fill[]` (ordered deterministically)
and produces:
- `Trade[]`
- optional timeline entries (risk mode transitions, equity points)

---

## Ordering (critical)

Input fills must be ordered by:
1) `filledTime` ascending
2) `rowIndex` ascending (stable tie-breaker)
3) final deterministic tie-breaker (if needed): original CSV line text hash

**Do not** rely on unstable string sorts of timestamps.

---

## Position model

Maintain at most one active position per symbol at a time (per implementation choice).

For each symbol:
- `side`: LONG or SHORT
- `quantity`: open quantity (positive number)
- `avgEntryPrice`: weighted average of entry fills
- `entryFills[]`: fills that opened/increased
- `exitFills[]`: fills that reduced/closed
- `totalCommission`

---

## Side detection

Interpret fills based on current position:

If **no position** exists for the symbol:
- BUY starts a LONG position
- SELL starts a SHORT position

If a position exists:
- For LONG:
  - BUY increases (scale-in)
  - SELL decreases (partial close) or closes (flat) or flips (oversell)
- For SHORT:
  - SELL increases (scale-in)
  - BUY decreases (cover) or closes (flat) or flips (overbuy)

A “flip” occurs when the closing fill quantity exceeds the open position quantity.

---

## Pairing rule: FIFO lots (recommended)

Even if the engine stores a running `avgEntryPrice`, the conceptual pairing is FIFO:

- entry lots are created by entry fills
- exit fills consume lots in order
- realized P&L is computed per consumed lot

This matters for correctness when scale-in/out occurs.

**If the implementation uses weighted avg entry instead of explicit lots:**
- it must still produce identical results to FIFO for realized P&L in common cases, or
- it must document the alternative method explicitly and keep it consistent everywhere.

---

## Trade boundaries

A trade is created when a position becomes **flat** (quantity == 0) for a symbol.

Trade fields:
- entryDate = first entry fill time
- exitDate = time the position returns to flat
- quantity = total closed size
- entryPrice = weighted average of all entry fills used
- exitPrice = weighted average of all exit fills used
- realizedPnL = sum across all closed lots
- commission = sum of commissions across included fills

A position that is not flat becomes an **ACTIVE trade** representation (implementation choice):
- Either store an ACTIVE trade snapshot, or
- Store only the position and materialize ACTIVE trades in derived selectors.

Pick one approach and apply consistently.

---

## P&L formulas (must be exact)

Per share:
- LONG profit/share = exitPrice - entryPrice
- SHORT profit/share = entryPrice - exitPrice

Trade realizedPnL:
- sum(profit/share * qty_closed) - fees

If commission is tracked per fill, subtract it once at the trade level (or include it in per-fill calculations), but never double-subtract.

---

## Partial closes (scale-out)

If a position scales out in multiple steps:
- you may represent it as:
  1) a single Trade that closes at final flat, with weighted exit price (simple), OR
  2) multiple Trade segments (each partial close produces a closed trade segment)

Both are valid, but they create different UX and metrics.

**Current preference (keep metrics stable):**
- use a single trade per flat-to-flat lifecycle.
- store `exitFills[]` so partial closes are visible for debugging.

---

## Flips (reversal in one fill)

If a closing fill exceeds remaining quantity:
- close the current trade at flat using the portion that closes
- immediately open a new position in the opposite direction with the remaining quantity
- the entry time for the new position is the same fill time as the flip fill

This must be deterministic.

---

## Stops / triggers

If the broker export provides stop/trigger price:
- persist it at the fill/order level (source meta)
- optionally infer a trade-level `stopPrice`:
  - only if the stop is clearly associated with the active position
  - never fabricate or guess stop prices from P&L

If stop price is absent:
- `stopPrice = null`

---

## Status naming

Use:
- `ACTIVE`
- `CLOSED`

Avoid ambiguous labels like “Open” in the domain model.

UI may map:
- ACTIVE → “Active”
- CLOSED → “Closed”

---

## Required diagnostics hooks

When reconstruction cannot close a trade that the user expects to be closed, the system must be able to show:
- fills for that symbol in order
- where pairing failed (e.g., missing exit fills, invalid qty, timestamp ordering)
- whether the CSV actually contains a closing execution

Reconstruction should emit warnings (not crashes) for:
- fills that would drive quantity negative unexpectedly (beyond flip handling)
- missing timestamps (date-only)
- non-finite numbers

---

## Regression tests (minimum)

A reconstruction fix is not “done” until tests exist for:
- FIFO scale-in/out closes correctly
- flip creates two trades (close + new open)
- LONG vs SHORT P&L sign correctness
- deterministic behavior when timestamps tie (rowIndex ordering)

