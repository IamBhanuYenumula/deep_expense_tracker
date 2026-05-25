# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo with two independent packages — each has its own `node_modules` and `package.json`:

- `client/` — React 19 SPA built with Vite 8. Uses ESM (`"type": "module"`).
- `server/` — Express 5 REST API with SQLite3 persistence. Uses CommonJS (`"type": "commonjs"`). Entry point is `server/index.js` (not yet created).

The two packages have no shared code or root-level package.json. Run all commands from within the relevant subdirectory.

## Commands

### Client (`cd client`)
```bash
npm run dev       # start Vite dev server (HMR)
npm run build     # production build → dist/
npm run preview   # preview production build
npm run lint      # ESLint (react-hooks + react-refresh rules)
```

### Server (`cd server`)
```bash
node index.js          # start server
npx nodemon index.js   # start with auto-reload on file changes
```

## Key conventions

- **Client** uses JSX with `.jsx` extension; ESLint is configured for JS/JSX only — no TypeScript.
- **Server** uses CommonJS `require()`/`module.exports`, not ES `import`/`export`.
- Environment variables on the server are loaded via `dotenv` — expect a `server/.env` file for secrets (not committed).
- CORS is a listed server dependency, so the Express API is expected to be called cross-origin from the Vite dev server (different ports).

## Developer context

- **Name:** Bhanu
- **Background:** Data Engineer, proficient in Python, zero JavaScript experience.
- **Learning goal:** Understand every line of code — not copy-paste. Always explain *what* and *why* before writing any code.
- **Teaching style:** Compare JavaScript/Node concepts to Python equivalents whenever introducing something new.
- Build one small, working piece at a time before moving on.
- After explaining any new concept, write a markdown note to `/Users/Tinku/Desktop/deep_expense_app/web_application_notes/`.

## Features to build

1. Add / edit / delete expenses
2. Categories and tags
3. Charts and reports (Recharts)
4. Recurring expenses
5. Export to CSV
6. Real-time credit card transaction tracking via webhooks (Plaid)

## Build order

1. `server/index.js` — Express server entry point *(next immediate step)*
2. Database schema — `expenses`, `categories`, `recurring` tables (SQLite3)
3. REST API routes — CRUD for expenses
4. React frontend components
5. Connect frontend to backend
6. Webhook integration for real-time transactions (Plaid)
7. CSV export
