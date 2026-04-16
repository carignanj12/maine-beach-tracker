# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maine Beach Tracker is a personal two-user web app (Aadi & Joe) for logging beach visits along the Maine coast during summer 2026. It tracks 39 beaches with visited status, memory notes, and photo uploads.

## Build & Deployment

There is **no build process**. The entire app is a single `index.html` file with embedded CSS and JavaScript.

- **Run locally:** Open `index.html` in a browser, or serve with `npx serve .` / `python -m http.server`
- **Deploy:** Push to `main` branch — GitHub Pages auto-deploys from `carignanj12/maine-beach-tracker`

## Architecture

**Single-file SPA** — all HTML, CSS (~730 lines), and JS (~420 lines) live in `index.html`. There are no other source files, no bundler, no package.json. Firebase SDK is loaded from CDN via ES module imports.

### Firebase Services

- **Firestore** — `visits` collection, one document per beach. Schema: `{ visitedAt: ISO8601, note: string, photos: [urls] }`
- **Cloud Storage** — photos at `beaches/{beachId}/{timestamp}_{filename}`
- **Auth** — Google Sign-In only; email allowlist enforced in code (`ALLOWED_EMAILS` constant near top of `<script>`)

### Data Flow

1. `onAuthStateChanged` → verify email in `ALLOWED_EMAILS` → `startFirestoreListener()`
2. Firestore `onSnapshot` on `visits` collection updates `visitedData` object in real time
3. Any UI change (`toggleVisited`, `saveMemory`) writes to Firestore → listener fires → UI refreshes reactively

### Key Global State

| Variable | Purpose |
|---|---|
| `visitedData` | Synced from Firestore: `{ beachId: { visitedAt, note, photos } }` |
| `BEACHES` | Static array of 39 beach objects (id, name, town, type, lat, lng, tags, notes) |
| `markers` | Leaflet marker instances keyed by beach id |
| `modalBeachId` | Beach currently open in the memory modal |
| `pendingFiles` | Photo files queued for upload before save |
| `firestoreUnsub` | Firestore listener cleanup function |

### Layout

Fixed header → flex row of sidebar (292px, beach list + search/filter) + map wrapper (flex-1, Leaflet map). Modals overlay on top: login screen, memory modal, coming-soon placeholder, lightbox.

### Design Tokens

CSS variables defined at `:root`:
- `--forest: #1e3a2f` — primary dark green
- `--accent: #c4a882` — sand/tan accent
- `--cream: #f7f3ec` — off-white background

Fonts: Cormorant Garamond (serif, display) + Jost (sans, UI) — loaded from Google Fonts.

## Key Conventions

- Beach type values: `'sandy'`, `'rocky'`, `'mixed'`
- Beach tag values: `'state-park'`, `'national-park'`
- Marker icons: custom Leaflet `divIcon` with CSS teardrop shape
- Section breaks in HTML use `<!-- ── SECTION ── -->` style comments
- Inline `onclick` handlers are used throughout (intentional for this SPA style)

## Allowed Emails

The `ALLOWED_EMAILS` array near the top of the `<script type="module">` block controls who can log in. Any auth change requires updating this array and redeploying.
