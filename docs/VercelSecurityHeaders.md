# Vercel Security Headers Guidance

This app is a Vite SPA that loads Google Fonts via `fonts.googleapis.com` and `fonts.gstatic.com`. If you add CSP headers in Vercel, ensure fonts continue to load while keeping `/api/*` requests network-only.

## Recommended CSP baseline

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  connect-src 'self';
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  frame-ancestors 'none';
```

## Notes
- If you add any new external resources, update the CSP accordingly.
- `/api/*` requests should always be `Cache-Control: no-store` and excluded from any service worker caching rules.
