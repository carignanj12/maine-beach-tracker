# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maine Beach Tracker is a personal two-user web app (Aadi & Joe) for logging beach visits along the Maine coast during summer 2026. It tracks 39 beaches with visited/unvisited status, star ratings, memory notes, and photo uploads.

## Build & Deployment

There is **no build process**. The entire app is a single `index.html` file (~2010 lines) with embedded CSS and JavaScript.

- **Run locally:** Open `index.html` in a browser, or serve with `npx serve .` / `python -m http.server`
- **Deploy:** Push to `main` branch — GitHub Pages auto-deploys from `carignanj12/maine-beach-tracker`
- **Live URL:** `https://carignanj12.github.io/maine-beach-tracker/`

## Architecture

**Single-file SPA** — all HTML, CSS, and JS live in `index.html`. There are no other source files, no bundler, no package.json. Firebase SDK is loaded from CDN via ES module imports (`<script type="module">`).

### Firebase Services

- **Firestore** — `visits` collection, one document per beach (keyed by beach id as string). Schema: `{ visitedAt: ISO8601, note: string, rating: number|null, photos: [urls] }`
- **Cloud Storage** — photos at `beaches/{beachId}/{timestamp}_{filename}`
- **Auth** — Google Sign-In only; email allowlist enforced in code (`ALLOWED_EMAILS` constant near top of `<script type="module">`)
- **Firebase version:** 10.12.0 (loaded from `gstatic.com`)

### Data Flow

1. `onAuthStateChanged` → verify email in `ALLOWED_EMAILS` → `startFirestoreListener()`
2. Firestore `onSnapshot` on `visits` collection updates `visitedData` object in real time
3. Any UI change (`toggleVisited`, `saveMemory`) writes to Firestore → listener fires → UI refreshes reactively

### Key Global State

| Variable | Purpose |
|---|---|
| `visitedData` | Synced from Firestore: `{ beachId: { visitedAt, note, rating, photos } }` |
| `BEACHES` | Static array of 39 beach objects (id, name, town, type, lat, lng, tags, notes) |
| `markers` | Leaflet marker instances keyed by beach id |
| `activeFilter` | Current sidebar filter: `'all'`, `'visited'`, or `'unvisited'` |
| `searchQuery` | Current sidebar search string (lowercased) |
| `activePopupId` | Beach id whose map popup is currently open, or `null` |
| `modalBeachId` | Beach id currently open in the memory modal, or `null` |
| `modalRating` | Star rating (1–5 or `null`) currently set in the memory modal |
| `pendingFiles` | Photo `File` objects queued for upload before save |
| `photoPromptBeachId` | Beach id for the quick-photo prompt shown after marking visited |
| `firestoreUnsub` | Firestore listener cleanup function |

### Layout

Fixed header (64px) → flex row of sidebar (292px, beach list + search/filter + stats link) + map wrapper (flex-1, Leaflet map). On mobile (≤768px) the sidebar becomes a slide-in drawer toggled by a hamburger button.

Modals/overlays layered on top (z-index order, lowest to highest):
- Drawer overlay (z 2999) + Sidebar drawer (z 3000)
- Coming-soon overlay (z 5000)
- Memory modal (z 6000)
- Photo prompt + Stats overlay (z 7000)
- Lightbox (z 9000)
- Login screen (z 99999)

### Design Tokens

CSS variables defined at `:root`:

```css
--forest:       #1e3a2f   /* primary dark green — header, buttons, borders */
--forest-mid:   #2d5443   /* hover state for forest elements */
--forest-light: #3d6b55   /* visited marker color, progress bar bg */
--moss:         #5a7a5e   /* search focus border, upload hover */
--sage:         #8fad8f   /* muted header text, legend labels */
--fog:          #c8d4c4   /* unfilled stars, scrollbar thumb */
--cream:        #f7f3ec   /* main background */
--cream-dark:   #ede7db   /* borders, input backgrounds */
--cream-hover:  #e6dfd4   /* hover state for cream surfaces */
--text:         #1a2e1e   /* primary body text */
--text-muted:   #6b7f6b   /* secondary/placeholder text */
--accent:       #c4a882   /* sand/tan — unvisited markers, star gold base */
--accent-light: #f0e8d8   /* memory note background, sandy tag bg */
--visited:      #3d6b55   /* visited check circles and markers */
--unvisited:    #c4a882   /* unvisited markers */
--active-bg:    #e8f0e5   /* active sidebar item background */
```

Fonts: **Cormorant Garamond** (serif, display — beach names, titles, modal headings) + **Jost** (sans-serif, UI — body, buttons, labels) — loaded from Google Fonts.

### Star Rating System

- 1–5 stars, stored as `rating: number|null` in Firestore
- `initStarRating()` wires up the interactive stars in the memory modal (hover preview + click to set/toggle off)
- `starsHtml(rating, mode)` renders read-only stars — modes: `'readonly'` (13px, shown in popups and stats), `'mini'` (11px, shown in sidebar list)
- Star gold color: `#c8922a` (active) / `var(--fog)` (empty); in popup dark header, filled stars use `#e8c870`

## Key Conventions

- Beach type values: `'sandy'`, `'rocky'`, `'mixed'`
- Beach tag values: `'state-park'`, `'national-park'`
- Marker icons: custom Leaflet `divIcon` with CSS teardrop shape (24×24px, rotated 45°)
- Visited marker color: `#3d6b55` (forest-light) — Unvisited: `#c4a882` (accent)
- Section breaks in HTML/CSS use `/* ── SECTION ── */` style comments
- Inline `onclick` handlers are used throughout for modal/overlay functions (intentional for this SPA style); event listeners are used for inputs and Firebase operations
- All functions called from inline HTML `onclick` must be explicitly exposed via `window.functionName = functionName` at the bottom of the script

## Critical: Always Write All Firestore Fields

Every `setDoc` call must include all four fields to avoid data loss. Never omit `rating` or `photos`:

```js
await setDoc(doc(db, 'visits', String(id)), {
  visitedAt: visitedData[id]?.visitedAt || new Date().toISOString(),
  note:      visitedData[id]?.note      || '',
  rating:    visitedData[id]?.rating    ?? null,
  photos:    visitedData[id]?.photos    || [],
});
```

## Allowed Emails

The `ALLOWED_EMAILS` array near the top of the `<script type="module">` block controls who can log in. Any auth change requires updating this array and redeploying.

Current authorized domains in Firebase Auth: `carignanj12.github.io`, `maine-beach-tracker.firebaseapp.com`, `pinetreeanalytics.com`.