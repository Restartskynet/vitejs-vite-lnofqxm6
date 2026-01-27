# ImportSpec — Webull Orders Records (v1)

Last Updated: 2026-01-26 
Scope: Phase 1 (MVP) — Webull Orders Records CSV only

## 1. Goal

Convert a user-uploaded Webull **Orders Records** CSV into a deterministic internal dataset of normalized **fills**.

This import is **local-only**:
- No uploads to a server
- No network calls
- All computation happens in the browser

## 2. Supported Source (v1)

### Supported export
- Webull → **Orders Records** CSV

### Not supported in v1
- Webull “Executions” export
- Any other broker exports
- Partial-fill modeling (see §7)

## 3. Required Columns

The importer MUST validate the CSV has these columns (exact names, trimmed):

- `Symbol`
- `Side`
- `Status`
- `Filled`
- `Avg Price`
- `Filled Time`

If any required column is missing:
- Import FAILS
- Emit an error warning:
  - `code = "missing_required_columns"`

## 4. Row Filtering Rules

The importer reads all data rows then applies filters:

### 4.1 Status handling
- Only rows with `Status = "Filled"` are eligible to become fills.
- All other statuses are ignored.

### 4.2 Partially Filled (explicit v1 policy)
Rows with `Status = "Partially Filled"` are:
- Ignored (not converted into fills)
- Counted and surfaced as a warning:
  - `code = "ignored_partially_filled"`

Rationale:
- Partial fills over extended periods are rare for the intended user workflow.
- Handling partial fills correctly requires a different data contract (executions) or multi-row aggregation.

### 4.3 Cancelled / Rejected / etc
Ignored with no special handling, unless counts are large enough to be helpful to report.

## 5. Normalization Rules

Each eligible CSV row is mapped into a `WebullFill`:

### 5.1 Normalized schema
A normalized fill has:

- `id: string` — stable dedupe identifier
- `symbol: string` — uppercased
- `side: "BUY" | "SELL"`
- `qty: number` — > 0
- `price: number` — > 0
- `ts: Date` — parsed timestamp

### 5.2 Field parsing
- `Symbol`
  - Trim
  - Uppercase
  - Reject empty

- `Side`
  - Trim
  - Case-insensitive mapping:
    - contains “BUY” => BUY
    - otherwise => SELL

- `Filled`
  - Remove commas
  - Parse to number
  - Must be finite and > 0

- `Avg Price`
  - Remove commas
  - Remove `$` prefix if present
  - Remove `@` prefix if present
  - Parse to number
  - Must be finite and > 0

- `Filled Time`
  - Webull format example: `01/22/2026 09:53:04 EST`
  - Parse MM/DD/YYYY HH:MM:SS + timezone suffix
  - If timezone is EST/EDT, convert correctly to a JS `Date`

If any of these fields are invalid:
- The row is skipped
- Skipped counts are reported in an info warning:
  - `code = "skipped_filled_rows"`

### 5.3 Fill ID
The fill `id` MUST be deterministic and used for deduplication.

Suggested v1 ID:
`{symbol}|{side}|{qty}|{price}|{ts.toISOString()}`

## 6. Output + Metadata

Import result MUST include:
- `fills[]`
- `warnings[]`
- `rawCount` (all rows)
- `filledCount` (Status=Filled rows)
- `usedCount` (fills produced)
- `skippedCount` (filledCount - usedCount)

Fills MUST be sorted ascending by timestamp.

## 7. Warning Catalog (v1)

Warnings are designed for user trust and debugging.

Recommended codes:

- `csv_parse_errors` — papaparse reported errors
- `missing_required_columns` — import cannot proceed
- `no_filled_orders` — filledCount = 0
- `skipped_filled_rows` — invalid/missing fields in filled rows
- `ignored_partially_filled` — partially filled rows ignored

Warnings may include:
- `meta` object with counts or sample row data (no PII beyond the CSV itself)

## 8. Non-Goals (v1)

- No broker auto-detection beyond Webull Orders Records.
- No partial fill modeling
- No corporate action handling
- No live prices, no market data APIs
