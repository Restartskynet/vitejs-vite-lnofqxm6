# StrategySpec — Restart Throttle (v1)

Last Updated: 2026-01-25  
Scope: Phase 1 (MVP) — Deterministic LOW/HIGH risk mode output

## 1. Goal

Given a set of executed trades and a starting equity value, compute:

- The current risk mode (LOW or HIGH)
- The risk % to use for the next trade day / next trade
- The allowed risk dollars (equity × risk%)
- A “tomorrow” forecast: what happens if the next trade is a win or a loss

This engine MUST be:
- Deterministic (same input => same output)
- Auditable (we can explain why mode changed)
- Local-only (no external APIs)

## 2. Definitions

### 2.1 Trade
A “trade” is a completed position session produced by the engine:
- It has a realized P&L
- It is considered complete when the position returns to flat

### 2.2 Win / Loss / Breakeven (per trade)
- Win: `pnl > 0`
- Loss: `pnl < 0`
- Breakeven: `pnl = 0` (adds + 1 to win, breakeven considered win now)

Win threshold in v1 is exactly `0`.

### 2.3 Mode
- HIGH: user is allowed to risk `highRiskPct`
- LOW: user is allowed to risk `lowRiskPct`

### 2.4 “As-of”
The risk state is computed “as-of” the most recent completed trade:
- All trades are processed in chronological order by their exit timestamp.
- The final mode is the mode to use for the next trade entered after that point.

## 3. Strategy Configuration (v1)

These values are the v1 defaults (from the workbook Control Panel):

- `highRiskPct = 0.03` (3.00%)
- `lowRiskPct = 0.001` (0.10%)
- `lossesToDropToLow = 1`
- `winsToReturnToHigh = 2`
- `countWinsOnlyInLow = true`
- `deferSwitchUntilNextDay = false` (switch applies immediately to the next trade, however, the risk % that is displayed on hero panel in dashboard should not update until next day after the switch has been triggered (since it's not realistic to instantly switch risk status between every trade since you don't know if a trade is a win or loss until next day pre-market where you can now adjust risk % used depending on how previous day trades went. If that makes sense))

## 4. State Machine

### 4.1 State variables
- `mode ∈ {HIGH, LOW}`
- `lowWinsProgress ∈ {0..winsToReturnToHigh}`

### 4.2 Initial state
- Start in `HIGH`
- `lowWinsProgress = 0`

Rationale:
This is a throttle: you start at full risk and only get throttled down after losses.

### 4.3 Transitions (applied after each trade closes)

Process each completed trade in chronological close order:

#### If trade is Breakeven (pnl = 0)
- Add + 1 to win counter/progress (new, updated)

#### If mode is HIGH
- If trade is Loss:
  - Switch to LOW
  - Reset `lowWinsProgress = 0`
- If trade is Win:
  - Do nothing (wins do not accumulate in HIGH)

#### If mode is LOW
- If trade is Win:
  - Increment `lowWinsProgress += 1`
  - If `lowWinsProgress >= winsToReturnToHigh`:
    - Switch to HIGH
    - Reset `lowWinsProgress = 0`
- If trade is Loss:
  - Stay LOW
  - Reset `lowWinsProgress = 0` (wins must be earned again)
  - (Breakeven adds + 1 to wins progress/counter)

### 4.4 Notes
- This design makes LOW mode a “rebuild confidence” state.
- Losses in LOW do not worsen risk further; they just prevent returning to HIGH.

## 5. Equity and Allowed Risk Dollars

### 5.1 Equity used
In Phase 1, equity is based on realized closed-trade history:

- `equityAsOfClose = startingEquity + sum(trade.pnl for all processed trades)`

(Manual adjustments are Phase 2.)

### 5.2 Allowed risk dollars
- `allowedRiskDollars = equityAsOfClose * todayRiskPct`

Where:
- `todayRiskPct = (mode == HIGH ? highRiskPct : lowRiskPct)`

## 6. Forecast Outputs

The dashboard shows:
- Today (current) risk mode and percent
- Tomorrow/base risk percent
- What happens if the next trade is a win
- What happens if the next trade is a loss

In v1 these are computed as:

- `tomorrowBaseRiskPct = todayRiskPct` (no calendar dependency in v1)
- `tomorrowIfWinRiskPct = riskPctAfterHypotheticalTrade(win)`
- `tomorrowIfLossRiskPct = riskPctAfterHypotheticalTrade(loss)`

Where `riskPctAfterHypotheticalTrade(*)` applies the transition rules once to the current state.

## 7. Explainability Requirements (v1)

The engine MUST be able to explain:
- What the current mode is
- The last trade that caused a mode switch (if any)
- Current `lowWinsProgress` (in LOW mode)
- How many wins are still needed to return to HIGH

Minimum explain fields:
- `asOfCloseDate`
- `mode`
- `lowWinsProgress`
- `winsToReturnToHigh`
- `lossesToDropToLow`

## 8. Worked Example

Config:
- HIGH = 3.00%
- LOW = 0.10%
- Drop to LOW after 1 loss in HIGH
- Return to HIGH after 2 wins while in LOW

Sequence:
1) Start HIGH  
2) Trade A: Win → remain HIGH  
3) Trade B: Loss → switch to LOW, progress=0  
4) Trade C: Breakeven → adds 1 to the win counter, progress=1  
5) Trade D: Win → win counter = 2, switch to HIGH, progress=0 loss counter 
6) Trade E: Loss → switch to LOW, progress=0  

Result:
- Next trade uses LOW risk until win counter = 2.
