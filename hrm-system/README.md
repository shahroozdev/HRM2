# HRM System Monorepo

Production-ready Turborepo scaffold for a Human Resource Management system.

## Structure

```
hrm-system/
├── apps/
│   ├── web/         # Next.js 15 App Router
│   └── api/         # NestJS 11
├── packages/
│   ├── shared/      # Shared Zod schemas, enums, interfaces, API response types
│   └── ui/          # Reusable shadcn-style UI components
├── package.json
├── turbo.json
└── tsconfig.base.json
```

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL (database `hrm` already created)

## Setup

1. Install dependencies from monorepo root:
   ```bash
   npm install
   ```
2. Create local env files:
   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Copy `apps/web/.env.example` to `apps/web/.env.local`
3. Update env values for your machine.

## Development

Run both apps in parallel:

```bash
npm run dev
```

- Web app: `http://localhost:3000`
- API app: `http://localhost:4000/api`
- Swagger docs: `http://localhost:4000/api/docs`

## Build

```bash
npm run build
```

## Type Check

```bash
npm run typecheck
```

## Clean Artifacts

```bash
npm run clean
```
