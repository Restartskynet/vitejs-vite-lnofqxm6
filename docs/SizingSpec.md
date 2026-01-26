# SizingSpec — Position Sizer (v1 Minimal)

Last Updated: 2026-01-26 
Scope: Phase 1 (MVP) — Simple risk-to-shares conversion

## 1. Goal

Convert:
- Allowed risk dollars (from StrategySpec)
- Entry price
- Stop price

Into:
- Max shares

This is a calculator — not a trade recommendation.

## 2. Inputs

- `allowedRiskDollars` (number, > 0)
- `entry` (number, > 0)
- `stop` (number, > 0)

## 3. Core Math

### 3.1 Risk per share
`riskPerShare = abs(entry - stop)`

### 3.2 Max shares
`maxShares = floor(allowedRiskDollars / riskPerShare)`

## 4. Validation Rules (v1)

If any are true, show a clear error:

- Entry or Stop is missing / non-numeric
- `riskPerShare <= 0`  
  (entry == stop)
- `allowedRiskDollars <= 0`

## 5. Guardrails (v1 as warnings, not hard blocks)

These are warnings to prevent obvious fat-finger inputs:

- If `riskPerShare < 0.05`: warn “Stop is extremely tight”
- If `maxShares * entry` is very large relative to equity (example: > 200%): warn “Position value is very large”

(Exact thresholds can be tuned later. In v1, warnings are informational.)

## 6. Non-Goals (v1)

- No fractional shares
- No options sizing
- No spread/fees/slippage modeling
- No automatic stop placement guidance
