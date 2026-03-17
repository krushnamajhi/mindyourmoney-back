# AGENTS.md

This document is for AI agents (and new contributors) working in this repository. It captures how the backend is structured, how requests flow, and what constraints/gotchas matter when making safe changes.

## Project identity

- Name: `mindyourmoney-back`
- Type: Node.js + TypeScript REST API
- Domain: users + expense tracking (groups, expenses, splits, balances)
- ORM: TypeORM

## Quick orientation

1. Start with `src/main/app.ts` and `src/main/app.util.ts`.
2. Review route roots in:
   - `src/features/user/routes/index.ts`
   - `src/features/expensetracker/routes/index.ts`
3. Confirm DB wiring in `src/config/database.ts`.
4. Follow controller -> service -> entity flow for the feature you are touching.

## Top-level layout

- `src/main`
  - App bootstrap, route mounting, DB init, server start.
- `src/config`
  - Database datasource + shared constants.
- `src/features/user`
  - User module (entities, DTOs, validators, controller/service/routes).
- `src/features/expensetracker`
  - Expense tracker module (groups, expenses, categories, balances, migrations).
- `src/middlewares`
  - Auth, validation, centralized error handler.
- `src/utils`
  - Context/request helpers, SQL transaction/repo helpers, logger.
- `src/lib/custom-errors`
  - Domain/custom error classes.
- `src/subscribers`
  - TypeORM subscriber for audit metadata.

## Runtime stack

- Framework: Express 5 (`express@^5.2.1`)
- Language/tooling: TypeScript (`typescript@^5.9.3`)
- ORM: TypeORM (`typeorm@^0.3.28`)
- DB drivers installed: MySQL (`mysql2`) and Postgres (`pg`)
- Validation: primarily Zod in route middleware
- Auth: JWT + cookie token support
- Logging: Winston (`src/utils/logger.utils.ts`)

## Entry points and app boot sequence

Primary startup file: `src/main/app.ts`

Boot order:
1. Load env via `dotenv/config`.
2. Create express app.
3. Call `createConnection()` (async, currently not awaited).
4. Attach `cors`, `cookie-parser`.
5. Mount feature routes via `useFeatureRoutes(app)`.
6. Start listening with `startServer(app)`.
7. Register global error middleware.

Helper definitions are in `src/main/app.util.ts`.

## Route map

Base route mounting:
- `/user/*` from `src/features/user/routes/index.ts`
- `/expense-tracker/*` from `src/features/expensetracker/routes/index.ts`

### User routes
Defined in `src/features/user/routes/user.routes.ts`:
- `GET /user/list`
- `GET /user/:id`
- `POST /user/email`
- `POST /user/create`
- `PUT /user/:id`
- `POST /user/login`
- `GET /user/current/me` (auth required)

### Expense tracker routes
Mounted in `src/features/expensetracker/routes/index.ts`. `authMiddleware` is applied at `/expense-tracker`.

Group (`src/features/expensetracker/routes/group.routes.ts`):
- `GET /expense-tracker/group/list`
- `GET /expense-tracker/group/:id`
- `POST /expense-tracker/group/create`
- `PUT /expense-tracker/group/:id`
- `DELETE /expense-tracker/group/:id`
- `PUT /expense-tracker/group/add-member/:id`
- `PUT /expense-tracker/group/remove-member/:id`

Expense category (`src/features/expensetracker/routes/expense-catagory.routes.ts`):
- `GET /expense-tracker/expense-category/list`
- `GET /expense-tracker/expense-category/:id`
- `POST /expense-tracker/expense-category/create`
- `PUT /expense-tracker/expense-category/:id`
- `DELETE /expense-tracker/expense-category/:id`

Expense (`src/features/expensetracker/routes/expense.routes.ts`):
- `GET /expense-tracker/expense/list`
- `GET /expense-tracker/expense/:id/details`
- `GET /expense-tracker/expense/:id`
- `POST /expense-tracker/expense/create`
- `PUT /expense-tracker/expense/settle/:id`
- `PUT /expense-tracker/expense/:id`
- `GET /expense-tracker/expense/debamount/:id`
- `DELETE /expense-tracker/expense/:id`
- `POST /expense-tracker/expense/filter`
- `POST /expense-tracker/expense/settle`
- `GET /expense-tracker/expense/settle/list`
- `GET /expense-tracker/expense/settle/:id`

User balance (`src/features/expensetracker/routes/user-balance.routes.ts`):
- `GET /expense-tracker/user-balance/grouped/all/:id`
- `GET /expense-tracker/user-balance/grouped`
- `GET /expense-tracker/user-balance/all/:id`

## Authentication and request context

Auth middleware: `src/middlewares/auth.middleware.ts`

Token sources:
- `Authorization: Bearer <token>` header
- `token` cookie

On valid token:
- `req.user` is populated (`id`, `email`)
- AsyncLocalStorage context is set (`requestContext`)

Context helpers:
- `getLoggedInUserId(req)` in `src/utils/apiUtils.ts`
- `context().getUser()` for subscriber/service-level access

Audit subscriber:
- `src/subscribers/audit.subscriber.ts` auto-fills `createdByUserId`/`updatedByUserId` on entities extending `DefaultEntity`.

## Validation and error handling

Validation middleware:
- `src/middlewares/validate-middlerware.ts`
- Uses Zod schemas (`parseAsync`) and reassigns sanitized body back to `req.body`.

Global error middleware:
- `src/middlewares/errorhandler.middleware.ts`
- Handles custom errors + Zod errors + fallback 500.
- Current custom status codes include nonstandard values (e.g., `211`, `423`) from `src/config/constants.ts`.

## Data layer overview

Datasource:
- `src/config/database.ts`
- Requires env: `DB_TYPE`, `DB_URL`
- `synchronize: false` (migrations expected)
- Scans:
  - entities: `./src/features/**/entities/*.ts`
  - subscribers: `./src/subscribers/*.ts`
  - migrations: `./src/features/**/migrates/*.ts`

Key entities:
- Users: `user.ts`, `user-info.ts`, `userpassword.ts`, `user-mappings.entity.ts`
- Expenses/groups:
  - `groups.ts`
  - `group-member.ts`
  - `expense.ts`
  - `expense-item-line.ts`
  - `debt-member-split-expense-line.ts`
  - `debt-member-split-expense-item-line.ts`
  - `expense-category.ts`
  - `simplified-peer-debt.view.ts` (view-backed)

Migrations:
- Example view migration: `src/features/expensetracker/migrates/create-peer-debts.view.ts`

## Dev workflows

Install:
- `npm install`

Run local dev:
- `npm run dev` (ts-node-dev; recommended)
- `npm run start` (nodemon on TS file)

Build:
- `npm run build`

Run migrations:
- `npm run migrate`

Tests:
- No real tests configured.
- `npm test` currently fails intentionally with placeholder script.

## Environment contract

Documented sample: `.env.example`

Critical vars actually used in runtime:
- `PORT`
- `DB_TYPE`
- `DB_URL`
- `JWT_SECRET`
- `NODE_ENV`
- `APP_HOST` (used in `startServer`; not documented in `.env.example`, which currently has `APP_URL`)

Agent note:
- If you add env-dependent features, update `.env.example` to avoid drift.

## High-risk gaps / known pitfalls

1. DB init race:
- `createConnection()` is async but not awaited before `startServer()`.
- Result: server can accept traffic before DB ready.

2. Dist/runtime mismatch:
- TypeORM globs are hardcoded to `*.ts`.
- Built runtime often needs `*.js` paths when running `dist`.

3. Logging sensitive data:
- Auth middleware logs headers.
- Validation middleware logs full request body.
- Error middleware logs error + request + response objects.
- These logs can leak tokens/PII in non-dev environments.

4. Inconsistent auth assumptions:
- Some balance endpoints take user ID from URL/body instead of deriving from auth context, which can permit querying other users if not constrained by business checks.

5. Missing contributor docs:
- No `README.md` for setup, migration policy, API usage, or deployment profile.

6. Nonstandard HTTP statuses:
- Custom errors use 211/423 for API/validation categories; clients may not expect this.

## Agent operating guidelines for this repo

When implementing changes:
1. Preserve existing controller -> service layering.
2. Prefer adding/adjusting Zod schemas for request validation.
3. Keep auth-protected behavior tied to `req.user`/context where possible.
4. If touching DB paths/build flow, verify both TS dev and compiled runtime assumptions.
5. Avoid introducing breaking API shape changes without updating all route handlers and DTOs.
6. Add or update docs for env vars and commands when behavior changes.

When reviewing PRs or diffs:
1. Check route auth coverage first.
2. Check service methods for transaction boundaries and repository usage.
3. Check error handling paths for leaked internals.
4. Check migration impact and entity schema consistency.

## Suggested immediate improvements (backlog)

1. Add a real `README.md` with setup, env, run, migrate, and endpoint overview.
2. Await DB initialization before server listen.
3. Make TypeORM paths environment-aware (`src/*.ts` for dev, `dist/*.js` for prod).
4. Remove sensitive request/header/body logs or gate behind debug level.
5. Add baseline tests (at least auth, user create/login, and one expense flow).
