# InnoDeploy — Architecture Overview

## System Components

```
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Next.js     │────▶│  Express API │────▶│ MongoDB  │
│  Dashboard   │     │  (backend)   │────▶│ Redis    │
└──────────────┘     └──────────────┘     └──────────┘
   :3000                :5000               :27017/6379
```

## Authentication Flow

1. User submits credentials via Dashboard
2. Backend validates and returns JWT access + refresh tokens
3. Dashboard stores tokens in memory (Zustand)
4. All subsequent API calls attach `Authorization: Bearer <token>`
5. On 401, client attempts token refresh; if that fails, redirect to login

## Data Model (Sprint-1)

- **User** — platform users with roles
- **Organisation** — multi-tenant workspace grouping
