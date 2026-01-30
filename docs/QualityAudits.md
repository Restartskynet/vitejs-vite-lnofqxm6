# Quality Audits — Lighthouse + axe

This document describes how we run automated accessibility/performance audits and where the reports live.

## What these tools do

- **Lighthouse**: audits performance, accessibility, best practices, SEO, and PWA readiness.
- **axe**: focuses on accessibility (WCAG) violations and provides detailed rule output.

## CI workflow (GitHub Actions)

The workflow lives at:
- `.github/workflows/lighthouse-axe.yml`

It performs the following steps:
1. Install dependencies
2. Build the app
3. Start the preview server
4. Run Lighthouse against core routes
5. Run axe against core routes
6. Upload HTML/JSON reports as build artifacts

## Routes audited

- `/`
- `/upload`
- `/trades`
- `/settings`
- `/legal`

## Local runs (optional)

Start the production preview:

```
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Run Lighthouse:

```
npx lighthouse http://127.0.0.1:4173/ --output html --output-path ./lighthouse-dashboard.html
```

Run axe:

```
npx axe http://127.0.0.1:4173/ --save ./axe-dashboard.json
```

## Interpreting results

- **Lighthouse** reports provide scores and lab metrics. Focus on Accessibility and Best Practices for UI regressions.
- **axe** reports list violations with selectors and fixes. Treat **serious** and **critical** as blockers.
