# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm start` — run the server (`node src/server.js`), serves on `http://localhost:3000` (or `$PORT`)
- `npm run dev` — run the server with Node's `--watch` flag for auto-restart on file changes

There is no test suite, build step, or linter configured yet.

## Architecture

This is a single Express app that serves both the JSON API and the static frontend — there is no separate frontend build/bundler.

- `src/server.js` — app entry point. Mounts `express.static` for `public/`, mounts resource routers under `/api/<resource>`, and defines `/api/health`.
- `src/db/index.js` — the persistence layer: a single `better-sqlite3` connection to `data/app.db` (WAL mode), with no tables defined yet. The module exports the open `db` handle directly; routes are expected to call `db.prepare(...).run()/.get()/.all()` synchronously (no async/await needed — `better-sqlite3` is sync).
- `src/routes/*.js` — one Express router per resource, imported and mounted in `src/server.js`. Each router owns its own SQL for that resource. This directory doesn't exist yet — create it for the first resource.
- `public/` — plain HTML/CSS/JS frontend, no framework or build tooling. `index.html` is the radio station landing page; `player.js` wires the `#radio-player` `<audio>` element to the live HLS stream via `hls.js` (loaded from CDN in `index.html`), falling back to native HLS playback on Safari/iOS.

To add a new resource: add a table to `src/db/index.js` (via `CREATE TABLE IF NOT EXISTS`, run on startup), create a router in `src/routes/` with the SQL for that resource, and mount it in `src/server.js` under `/api/<resource>`.

The SQLite file (`data/app.db` and its `-wal`/`-shm` siblings) is the local "database" for this prototype and is gitignored — it's expected to be ephemeral, recreated by `src/db/index.js` on first run.
