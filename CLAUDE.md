# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm start` — run the server (`node src/server.js`), serves on `http://localhost:3000` (or `$PORT`)
- `npm run dev` — run the server with Node's `--watch` flag for auto-restart on file changes
- `npm test` — run server and client unit/integration tests (Node's built-in `node:test` runner)
- `npm run test:coverage` — same tests, plus a coverage report via `node --experimental-test-coverage`
- `npm run test:e2e` — run Playwright browser tests against a real server instance (auto-starts the server on port 3100; run `npx playwright install chromium` once first)
- `docker compose up -d` — build and run the prod image (see `docker-compose.yml`)
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` — build and run the dev image, source bind-mounted for live reload via `node --watch`

There is no build step or linter configured yet.

## Testing

- `test/server/*.test.js` — `node:test` + `supertest` against the exported Express `app` (`src/server.js` exports `app` and only calls `.listen()` when run directly, i.e. `require.main === module`). Set `DB_PATH=:memory:` before requiring the app to isolate each test file's SQLite state from `data/app.db` (`src/db/index.js` reads `DB_PATH` from the environment). `now-playing.js`'s upstream call is exercised by monkeypatching `global.fetch`.
- `test/client/*.test.js` — `node:test` against pure helpers extracted from `public/*.js` (e.g. `public/format-time.js`), which double as plain `<script>` globals in the browser and CommonJS exports under Node.
- `test/e2e/*.spec.js` — Playwright, driving the real page in a browser (play/pause, volume, mute) via `playwright.config.js`, which boots the app with `DB_PATH=:memory:` on port 3100.
- `npm test` intentionally globs `test/server/*.test.js test/client/*.test.js` rather than passing bare directories — `node --test` treats any `.js` file inside a directory named `test` (at any depth) as a test file by default, which would otherwise pull in the Playwright specs under `test/e2e/` and crash (Playwright's `test()` global conflicts with `node:test`'s).

## Architecture

This is a single Express app that serves both the JSON API and the static frontend — there is no separate frontend build/bundler.

- `src/server.js` — app entry point. Mounts `express.static` for `public/`, mounts resource routers under `/api/<resource>`, and defines `/api/health` and `/api/github-status` (reads `GITHUB_TOKEN` from the environment — see `.env`, gitignored). Exports the Express `app` and only calls `.listen()` when run directly (`require.main === module`), so `test/server/*.test.js` can import `app` and drive it with `supertest` without binding a port.
- `src/db/index.js` — the persistence layer: a single `better-sqlite3` connection to `data/app.db` (WAL mode), reading its path from `DB_PATH` (defaults to `data/app.db`; tests set `DB_PATH=:memory:` for isolation). Defines `track_ratings` (`track_key`, `client_id`, `rating`, unique per track/client) via `CREATE TABLE IF NOT EXISTS`, run on startup. The module exports the open `db` handle directly; routes call `db.prepare(...).run()/.get()/.all()` synchronously (no async/await needed — `better-sqlite3` is sync).
- `src/routes/now-playing.js` — proxies the station's live metadata JSON (`METADATA_URL`) to `GET /api/now-playing`.
- `src/routes/ratings.js` — thumbs up/down voting on `GET|POST /api/ratings`. Identifies the caller via a SHA-256 hash of IP + user-agent (`getClientId`), stored as `client_id` against `track_ratings`; re-voting updates the existing row via `ON CONFLICT ... DO UPDATE`.
- `public/` — plain HTML/CSS/JS frontend, no framework or build tooling. `index.html` is the radio station landing page; `player.js` wires the `#radio-player` `<audio>` element to the live HLS stream via `hls.js` (loaded from CDN in `index.html`), falling back to native HLS playback on Safari/iOS; `now-playing.js` polls `/api/now-playing` and drives the ratings UI. `format-time.js` holds pure helpers (e.g. `formatTime`) as a plain `<script>` global in the browser, dual-exported via CommonJS for `test/client/*.test.js`.

To add a new resource: add a table to `src/db/index.js` (via `CREATE TABLE IF NOT EXISTS`, run on startup), create a router in `src/routes/` with the SQL for that resource, and mount it in `src/server.js` under `/api/<resource>`.

The SQLite file (`data/app.db` and its `-wal`/`-shm` siblings) is the local "database" for this prototype and is gitignored — it's expected to be ephemeral, recreated by `src/db/index.js` on first run.

## Docker

`Dockerfile` is multi-stage with `dev` and `prod` targets (both `node:22-alpine`); `better-sqlite3` is compiled in a build stage with Python/make/g++ and only the compiled `node_modules` are copied into the final image, so `prod` ships without a build toolchain. The `prod` target runs as a non-root user under `tini`, with a healthcheck against `/api/health`.

- `docker-compose.yml` — prod target, `data/` persisted in a named volume (`sqlite_data`), `GITHUB_TOKEN` passed through from the host environment (or a `.env` file, which `docker compose` reads automatically for variable substitution).
- `docker-compose.dev.yml` — overlay (`-f docker-compose.yml -f docker-compose.dev.yml`) that switches to the `dev` target and bind-mounts the repo into `/app`. `node_modules` is pinned to an anonymous volume so the container's own Linux-built `better-sqlite3` binding isn't shadowed by the host's (which may be built for a different OS/arch).
