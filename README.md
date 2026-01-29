# Restart’s Trading Co-Pilot — Developer Docs

Restart’s Trading Co-Pilot is an offline-first strategy dashboard focused on **risk mode**, **position sizing**, and **active trade visibility**. It ingests broker export data (currently **Webull Orders Records CSV**) and reconstructs fills → trades → derived equity/risk so the UI can answer, at a glance:

- **What is today’s risk?**
- **What mode am I in (LOW/HIGH) and what will change it?**
- **What live trades are active and what’s their exposure?**
- **What’s my equity curve / drawdown based on imported history?**

These docs are for developers working on this repo. They define contracts and invariants so changes stay correct and testable.

---

## Quick start

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

Recommended: Node 18+ (Vite 6).

---

## Local data & persistence

This app is offline-first. Persisted data lives in **IndexedDB**:

- Implementation: `src/lib/db.ts`
- Storage is the source of truth for:
  - settings
  - fills
  - import history/runs
  - manual adjustments (if enabled)
  - derived caches (if any are introduced later)

### Resetting local data (safe)

When debugging imports, you often want a clean slate.

Preferred options:
1) Use the app’s “reset/clear” control if present (best UX).
2) From DevTools: Application → IndexedDB → delete the DB used by the app.
3) Programmatic dev helper (only if one exists in code; don’t add one unless necessary).

**Rule:** never “partially clear” tables when debugging import correctness; it creates false-positive states.

---

## Repo map (high level)

- `src/importers/*`
  - CSV parsing and normalization for broker exports.
  - Example: `src/importers/webullOrdersImporter.ts`
- `src/engine/*`
  - Core domain logic: trade reconstruction, risk engine, metrics.
  - Key files:
    - `src/engine/tradesBuilder.ts` — builds `Trade*` records from fills
    - `src/engine/riskEngine.ts` — strategy/risk calculations and sizing math
- `src/stores/*`
  - App state management; orchestrates import → persist → derive → UI.
  - Example: `src/stores/dashboardStore.tsx`
- `src/pages/*`
  - Route-level UI (Dashboard, Upload, Trades, Settings, etc.)
- `src/components/*`
  - Presentational components and UI primitives.

---

## Core pipeline

The app’s “truth” flows through this pipeline:

1) **CSV ingest**
   - Read file, detect format, parse rows
2) **Normalize**
   - Convert raw CSV rows into normalized row objects with stable fields
   - Defensive parsing for numbers/dates
3) **Fills**
   - Convert normalized rows into `Fill` records (atomic executions)
4) **Trade reconstruction**
   - Convert fills into `Trade` records using deterministic pairing rules
5) **Derived calculations**
   - Equity curve, drawdown, strategy mode timeline, sizing numbers
6) **Persist + render**
   - Persist normalized results + imports
   - Update store and re-render UI

The detailed contracts for this live in:
- `docs/Architecture.md`
- `docs/ImportSpec.md`
- `docs/ImportReconstructionSpec.md`
- `docs/SizingSpec.md`
- `docs/StrategySpec_Restart.md`
- `docs/DataModel.md`

---

## Development “non-negotiables”

These are enforced culturally first, then by tests.

- No “ignore TS error” fixes. Fix the type or the logic.
- Deterministic ordering: if timestamps tie, use a stable tie-breaker (row index).
- Never fabricate missing data (e.g., stop prices). Prefer `null` + diagnostics.
- Math correctness > UI aesthetics (but both matter).
- Add a regression test for any bug fixed in import/reconstruction.

---

## Where to start when something looks wrong

If trades show as Active when they should be Closed, or P&L is wrong:

1) Reproduce with a known CSV fixture
2) Inspect import report (normalized rows count / skipped rows / fills / trades)
3) Validate deterministic ordering
4) Validate trade reconstruction pairing (FIFO rules)
5) Validate P&L sign (LONG vs SHORT)
6) Add/extend a test that fails before the fix and passes after

See `docs/ImportReconstructionSpec.md` for the expected reconstruction contract.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
